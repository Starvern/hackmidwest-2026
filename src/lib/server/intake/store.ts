/** Local single-process candidate. Principals come from the server, never request actor IDs. */
import { ProfileMCStoredRecordingSchema, type ProfileMCStoredRecording } from '../monte-carlo/recording-contracts.ts';
import { validateRecordedProfileMonteCarlo } from '../monte-carlo/profile-context.ts';
import { prepareRiskConfiguration } from './risk-editor.ts';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { constants, openSync, closeSync, fchmodSync, lstatSync } from 'node:fs';
import { dirname } from 'node:path';
import { z } from 'zod';
import { ProfilePayloadSchema, CompanyBindingSchema, ProfileSimulationInputSchema, type ProfilePayload } from './schemas.ts';
import { compileProfile, previewProfile, baselineInputFingerprint } from './compiler.ts';
import { sha256Canonical } from '../fingerprint.ts';
import { simulate_deterministic } from '../engine/scenarios.ts';

type Compiled = ReturnType<typeof compileProfile>;
type Preview = ReturnType<typeof previewProfile> & { preview_id: string };
type Acknowledgment = Omit<Preview, 'baseline'> & { actor_id: string; acknowledged_at: string };
type Revision = { revision: number; profile: ProfilePayload; status: 'draft' | 'confirmed';
  estimate_pointers: string[];
  preview: Preview | null; acknowledgment: Acknowledgment | null;
  compiled: Compiled | null; confirmation: { actor_id: string; confirmed_at: string } | null };
type Document = { profile_id: string; head: number; revisions: Revision[] };
export type ReviewSelection = { pointer: string; state: 'confirmed' | 'reviewed_estimate' | 'not_applicable'; rationale: string };
function at(root: unknown, pointer: string): unknown {
  if (!pointer.startsWith('/')) throw new Error('Invalid review pointer');
  return pointer.slice(1).split('/').reduce<unknown>((value, part) => {
    const key = part.replaceAll('~1', '/').replaceAll('~0', '~');
    return value && typeof value === 'object' && Object.hasOwn(value, key) ? (value as Record<string, unknown>)[key] : undefined;
  }, root);
}
/** Import/save discards claimed authority. Explicit server review is a separate operation. */
function unreviewed(input: unknown) {
  const p = ProfilePayloadSchema.parse(input);
  function walk(value: unknown) {
    if (!value || typeof value !== 'object') return;
    if ('state' in value && 'value' in value && 'review' in value) {
      Object.assign(value, { state: value.value === null ? 'unknown' : 'entered', review: null });
      return;
    }
    Object.values(value).forEach(walk);
  }
  walk(p); p.reviews = []; p.reconciliations.forEach(row => { row.review = null; });
  return ProfilePayloadSchema.parse(p);
}
function estimatePointers(input: unknown, pointer = ''): string[] {
  if (!input || typeof input !== 'object') return [];
  if ('state' in input && 'value' in input) return input.state === 'reviewed_estimate' ? [pointer] : [];
  return Object.entries(input).flatMap(([key, value]) => estimatePointers(value, `${pointer}/${key}`));
}

export const PROFILE_RECORDING_LIMITS = Object.freeze({ recordsPerOwner: 8, bodyBytes: 2 * 1024 * 1024, retentionMs: 30 * 86400000 });
type Recording = ProfileMCStoredRecording;

export class ProfileStore {
  private db: DatabaseSync;
  constructor(filename: string) {
    if (filename !== ':memory:') {
      if (!['darwin', 'linux'].includes(process.platform)) throw new Error('Durable profile storage supports macOS and Linux only; Windows ACL privacy is not implemented');
      const dir = lstatSync(dirname(filename));
      if (!dir.isDirectory() || (dir.mode & 0o077) !== 0) throw new Error('Profile database requires a private application directory');
      const fd = openSync(filename, constants.O_CREAT | constants.O_RDWR | constants.O_NOFOLLOW, 0o600);
      try { fchmodSync(fd, 0o600); } finally { closeSync(fd); }
    }
    this.db = new DatabaseSync(filename);
    this.db.exec('PRAGMA journal_mode=DELETE; PRAGMA secure_delete=ON; CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY, owner TEXT NOT NULL, body TEXT NOT NULL)');
    this.db.exec('PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS mc_recordings (id TEXT PRIMARY KEY, owner TEXT NOT NULL, profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, expires INTEGER NOT NULL, digest TEXT NOT NULL, body TEXT NOT NULL); CREATE INDEX IF NOT EXISTS mc_recordings_owner_expiry ON mc_recordings(owner, expires)');
    this.db.exec('CREATE TABLE IF NOT EXISTS sessions (digest TEXT PRIMARY KEY, owner TEXT NOT NULL, expires INTEGER NOT NULL)');
  }
  close() { this.db.close(); }
  createSession() {
    const token = randomBytes(32).toString('hex'), owner = randomUUID(), expires = Date.now() + 30 * 86400000;
    this.db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(createHash('sha256').update(token).digest('hex'), owner, expires);
    return { token, owner, expires };
  }
  authenticate(token: string | undefined) {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    const row = this.db.prepare('SELECT owner FROM sessions WHERE digest = ? AND expires > ?').get(createHash('sha256').update(token).digest('hex'), Date.now());
    return row ? String(row.owner) : null;
  }
  list(owner: string) {
    this.principal(owner);
    return this.db.prepare('SELECT body FROM profiles WHERE owner = ?').all(owner).map(row => {
      const document = JSON.parse(String(row.body)) as Document, current = document.revisions.at(-1)!;
      return { profile_id: document.profile_id, revision: document.head, status: current.status, name: current.profile.business.name.value };
    });
  }
  private principal(owner: string) { if (!owner.trim()) throw new Error('Authenticated owner required'); }
  private load(owner: string, id: string): Document {
    this.principal(owner);
    const row = this.db.prepare('SELECT body FROM profiles WHERE id = ? AND owner = ?').get(id, owner);
    if (!row) throw new Error('Profile not found');
    return JSON.parse(String(row.body));
  }
  private mutate<T>(owner: string, id: string, operation: (document: Document) => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const document = this.load(owner, id), result = operation(document);
      this.db.prepare('UPDATE profiles SET body = ? WHERE id = ? AND owner = ?').run(JSON.stringify(document), id, owner);
      this.db.exec('COMMIT');
      return structuredClone(result);
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  private current(document: Document, expected: number, draft = true) {
    if (document.head !== expected) throw new Error('Revision conflict');
    const current = document.revisions.at(-1)!;
    if (draft && current.status !== 'draft') throw new Error('Confirmed revision is immutable');
    return current;
  }
  private append(document: Document, profile: ProfilePayload, estimates: string[] = []) {
    if (document.head >= 200) throw new Error('Revision limit reached');
    const revision: Revision = { revision: ++document.head, profile, estimate_pointers: [...new Set(estimates)], status: 'draft', preview: null, acknowledgment: null, compiled: null, confirmation: null };
    document.revisions.push(revision);
    return revision;
  }
  create(owner: string, input: unknown, importedEstimates: string[] = []) {
    this.principal(owner);
    if (this.list(owner).length >= 20) throw new Error('Profile limit reached');
    const profile = unreviewed(input), profile_id = randomUUID();
    const document: Document = { profile_id, head: 0, revisions: [] };
    this.append(document, profile, [...estimatePointers(input), ...importedEstimates]);
    this.db.prepare('INSERT INTO profiles VALUES (?, ?, ?)').run(profile_id, owner, JSON.stringify(document));
    return structuredClone(document);
  }
  read(owner: string, id: string, revision: number) {
    const record = this.load(owner, id).revisions.find(r => r.revision === revision);
    if (!record) throw new Error('Revision not found');
    return structuredClone(record);
  }
  save(owner: string, id: string, expected: number, input: unknown) {
    return this.mutate(owner, id, document => {
      const previous = this.current(document, expected, false), profile = unreviewed(input);
      // Retained estimated facts cannot lose their label merely through a save/import.
      const retained = previous.estimate_pointers.filter(pointer => {
        const before = at(previous.profile, pointer), after = at(profile, pointer);
        return before && after && typeof before === 'object' && typeof after === 'object' &&
          'value' in before && 'value' in after && sha256Canonical(before.value) === sha256Canonical(after.value);
      });
      return this.append(document, profile, [...estimatePointers(input), ...retained]);
    });
  }
  saveRiskConfiguration(owner: string, id: string, expected: number, draft: unknown) {
    const current = this.read(owner, id, expected);
    const { configuration, source_ids, draft: raw } = prepareRiskConfiguration(draft, current.profile.sources);
    const profile = current.profile, source_id = randomUUID();
    profile.sources.push({ source_id, kind: 'owner_estimate', title: 'Company sensitivity parameter estimates',
      period: { start: raw.start, end: raw.end }, locator: JSON.stringify(raw.evidence) });
    profile.assumptions.risk_configuration = { value: configuration, state: 'entered', unit: 'record',
      period: { start: raw.start, end: raw.end }, source_ids: [...source_ids,source_id],
      raw: { text: JSON.stringify(raw), unit: 'record', precision: 'as entered' }, review: null, derivation: null };
    return this.save(owner, id, expected, profile);
  }
  review(owner: string, id: string, expected: number, selections: ReviewSelection[]) {
    return this.mutate(owner, id, document => {
      const previous = this.current(document, expected), profile = structuredClone(previous.profile);
      const selected = z.array(z.strictObject({ pointer: z.string().startsWith('/'), state: z.enum(['confirmed', 'reviewed_estimate', 'not_applicable']), rationale: z.string().trim().min(1) })).min(1).parse(selections);
      if (new Set(selected.map(s => s.pointer)).size !== selected.length) throw new Error('Duplicate review selection');
      for (const selection of selected) {
        const target = at(profile, selection.pointer);
        if (!target || typeof target !== 'object') throw new Error('Review target not found');
        const review = { actor_id: owner, reviewed_at: new Date().toISOString(), rationale: selection.rationale };
        if ('state' in target && 'value' in target) {
          const sourceIds = 'source_ids' in target ? target.source_ids as string[] : [];
          const estimate = previous.estimate_pointers.includes(selection.pointer) ||
            profile.sources.some(source => sourceIds.includes(source.source_id) && source.kind === 'owner_estimate');
          if (estimate && selection.state === 'confirmed') throw new Error('Reviewed estimate must retain estimate state');
          Object.assign(target, { state: selection.state, review });
        }
        else if (/^\/sources\/\d+$/.test(selection.pointer)) {
          profile.reviews = profile.reviews.filter(r => r.pointer !== selection.pointer);
          profile.reviews.push({ pointer: selection.pointer, review });
        } else if (/^\/reconciliations\/\d+$/.test(selection.pointer)) Object.assign(target, { review });
        else throw new Error('Unsupported review target');
      }
      return this.append(document, ProfilePayloadSchema.parse(profile), [...previous.estimate_pointers, ...estimatePointers(profile)]);
    });
  }
  preview(owner: string, id: string, expected: number) {
    return this.mutate(owner, id, document => {
      const current = this.current(document, expected);
      for (let i = 0; i < current.profile.sources.length; i++)
        if (!current.profile.reviews.some(r => r.pointer === `/sources/${i}` && r.review.actor_id === owner)) throw new Error('Source review required');
      const compiled = compileProfile(current.profile, { profile_id: id, revision: expected });
      const preview = { ...previewProfile(compiled), preview_id: randomUUID() };
      current.compiled = compiled; current.preview = preview; current.acknowledgment = null;
      return preview;
    });
  }
  acknowledge(owner: string, id: string, expected: number, previewId: string) {
    return this.mutate(owner, id, document => {
      const current = this.current(document, expected), preview = current.preview;
      if (!preview || preview.preview_id !== previewId) throw new Error('Preview mismatch');
      const { baseline, ...binding } = preview; void baseline;
      current.acknowledgment = { ...binding, actor_id: owner, acknowledged_at: new Date().toISOString() };
      return current.acknowledgment;
    });
  }
  confirm(owner: string, id: string, expected: number) {
    return this.mutate(owner, id, document => {
      const current = this.current(document, expected), ack = current.acknowledgment;
      if (!ack || !current.preview || !current.compiled || ack.actor_id !== owner || ack.preview_id !== current.preview.preview_id) throw new Error('Exact preview acknowledgment required');
      const compiled = compileProfile(current.profile, { profile_id: id, revision: expected });
      const { actor_id, acknowledged_at, preview_id, baseline_input_fingerprint, ...binding } = ack;
      void actor_id; void acknowledged_at; void preview_id;
      if (sha256Canonical(binding) !== sha256Canonical(compiled.binding) ||
        baseline_input_fingerprint !== baselineInputFingerprint(compiled) ||
        sha256Canonical(current.compiled) !== sha256Canonical(compiled)) throw new Error('Confirmation binding mismatch');
      current.status = 'confirmed'; current.confirmation = { actor_id: owner, confirmed_at: new Date().toISOString() };
      return current;
    });
  }
  resolve(owner: string, binding: Compiled['binding']) {
    CompanyBindingSchema.parse(binding);
    const current = this.read(owner, binding.profile_id, binding.revision);
    if (current.status !== 'confirmed' || !current.compiled || sha256Canonical(current.compiled.binding) !== sha256Canonical(binding)) throw new Error('Confirmed binding required');
    const compiled = compileProfile(current.profile, { profile_id: binding.profile_id, revision: binding.revision });
    if (sha256Canonical(current.compiled) !== sha256Canonical(compiled)) throw new Error('Stored snapshot mismatch');
    return compiled;
  }
  simulate(owner: string, input: unknown) {
    const envelope = ProfileSimulationInputSchema.parse(input);
    if ('monte_carlo' in envelope.request) throw new Error('Company-specific Monte Carlo is unavailable');
    const snapshot = this.resolve(owner, envelope.company);
    const result = simulate_deterministic(snapshot.company, envelope.request);
    return { simulation_version: envelope.simulation_version, company: snapshot.binding, result };
  }
  /** Internal trusted adapter only. HTTP callers cannot assert a successful job. */
  saveMonteCarloRecording(owner: string, inputValue: unknown, value: unknown): Recording {
    this.principal(owner);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const input = ProfileSimulationInputSchema.parse(inputValue);
      const recording = validateRecordedProfileMonteCarlo(this, owner, input, value);
      const id = z.uuid().parse(recording.result.run_id), now = Date.now();
      this.db.prepare('DELETE FROM mc_recordings WHERE expires <= ?').run(now);
      const existing = this.db.prepare('SELECT owner, digest, body FROM mc_recordings WHERE id = ?').get(id);
      if (existing) {
        const saved = this.decodeRecording(existing);
        if (existing.owner !== owner || sha256Canonical(saved.input) !== sha256Canonical(input) || sha256Canonical(saved.recording) !== sha256Canonical(recording)) throw new Error('Recording identity conflict');
        this.db.exec('COMMIT'); return saved;
      }
      const count = this.db.prepare('SELECT COUNT(*) AS count FROM mc_recordings WHERE owner = ?').get(owner)!;
      if (Number(count.count) >= PROFILE_RECORDING_LIMITS.recordsPerOwner) throw new Error('Recording limit reached');
      const saved: Recording = { recording_version: 'profile-mc-recording-1-candidate', recording_id: id,
        recorded_at: new Date(now).toISOString(), expires_at: new Date(now + PROFILE_RECORDING_LIMITS.retentionMs).toISOString(), input, recording };
      const body = JSON.stringify(saved);
      if (Buffer.byteLength(body) > PROFILE_RECORDING_LIMITS.bodyBytes) throw new Error('Recording exceeds storage limit');
      this.db.prepare('INSERT INTO mc_recordings VALUES (?, ?, ?, ?, ?, ?)').run(id, owner, input.company.profile_id,
        now + PROFILE_RECORDING_LIMITS.retentionMs, sha256Canonical(saved), body);
      this.db.exec('COMMIT'); return structuredClone(saved);
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  private decodeRecording(row: Record<string, unknown>): Recording {
    const saved: unknown = JSON.parse(String(row.body));
    if (sha256Canonical(saved) !== row.digest) throw new Error('Stored recording mismatch');
    return ProfileMCStoredRecordingSchema.parse(saved);
  }
  /** Requires the caller's current plan; stale output cannot become the current forecast. */
  readMonteCarloRecording(owner: string, id: string, expectedInput: unknown): Recording {
    this.principal(owner); z.uuid().parse(id);
    const row = this.db.prepare('SELECT digest, body FROM mc_recordings WHERE id = ? AND owner = ? AND expires > ?').get(id, owner, Date.now());
    if (!row) throw new Error('Recording not found or expired');
    const saved = this.decodeRecording(row);
    if (saved.recording_id !== id) throw new Error('Stored recording mismatch');
    validateRecordedProfileMonteCarlo(this, owner, saved.input, saved.recording);
    validateRecordedProfileMonteCarlo(this, owner, expectedInput, saved.recording);
    return saved;
  }
  listMonteCarloRecordings(owner: string, bindingValue: unknown) {
    this.principal(owner);
    const binding = CompanyBindingSchema.parse(bindingValue); this.resolve(owner, binding);
    return this.db.prepare('SELECT digest, body FROM mc_recordings WHERE owner = ? AND profile_id = ? AND expires > ? ORDER BY expires DESC, id').all(owner, binding.profile_id, Date.now()).flatMap(row => {
      const saved = this.decodeRecording(row);
      if (sha256Canonical(saved.recording.context.company) !== sha256Canonical(binding)) return [];
      validateRecordedProfileMonteCarlo(this, owner, saved.input, saved.recording);
      return [{ recording_id: saved.recording_id, recorded_at: saved.recorded_at, expires_at: saved.expires_at, context: saved.recording.context }];
    });
  }
  deleteMonteCarloRecording(owner: string, id: string) {
    this.principal(owner); z.uuid().parse(id);
    const deleted = this.db.prepare('DELETE FROM mc_recordings WHERE id = ? AND owner = ?').run(id, owner);
    if (!deleted.changes) throw new Error('Recording not found or expired');
  }
  pruneMonteCarloRecordings() { this.db.prepare('DELETE FROM mc_recordings WHERE expires <= ?').run(Date.now()); }
  delete(owner: string, id: string) {
    this.load(owner, id);
    this.db.prepare('DELETE FROM profiles WHERE id = ? AND owner = ?').run(id, owner);
  }
}
