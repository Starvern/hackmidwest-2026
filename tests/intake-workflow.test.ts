import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eligibleFixture } from './intake-fixture.ts';
import { compileProfile, previewProfile } from '../src/lib/server/intake/compiler.ts';
import { ProfileStore, type ReviewSelection } from '../src/lib/server/intake/store.ts';
import { ProvenanceSchema, DeterministicRequestSchema } from '../src/lib/server/schemas.ts';

function selections(profile: unknown, pointer = ''): ReviewSelection[] {
  if (!profile || typeof profile !== 'object') return [];
  if ('state' in profile && 'value' in profile) return profile.value === null ? [] : [{ pointer, state: 'confirmed', rationale: 'Owner reviewed synthetic test input' }];
  return Object.entries(profile).flatMap(([key, child]) => selections(child, `${pointer}/${key}`));
}
function reviewed(store: ProfileStore, owner = 'owner') {
  const created = store.create(owner, eligibleFixture());
  const reviews = selections(created.revisions[0].profile);
  reviews.push({ pointer: '/sources/0', state: 'confirmed', rationale: 'Owner reviewed source' });
  const revision = store.review(owner, created.profile_id, 1, reviews);
  return { id: created.profile_id, revision: revision.revision };
}
test('compiler preserves own inputs and full real-source sidecar; real engine produces bottleneck and seasonal cases', () => {
  const profile = eligibleFixture(), before = structuredClone(profile);
  const compiled = compileProfile(profile, { profile_id: randomUUID(), revision: 7 });
  assert.deepEqual(profile, before);
  assert.deepEqual(compiled.company.global_assumptions.distribution_parameters, {});
  assert.equal(compiled.company.operations.base_monthly_job_demand, 600);
  const provenance = compiled.company.provenance['/operations/base_monthly_job_demand'];
  assert.equal(provenance.kind, 'profile_source');
  assert.deepEqual(provenance.profile_ref?.source_ids, ['source']);
  assert.equal(compiled.source_sidecar.sources[0].kind, 'manual_statement');
  const preview = previewProfile(compiled);
  assert.equal(preview.baseline.months[1].operations?.completed_jobs, 480);
  assert.equal(preview.baseline.months[1].operations?.unserved_jobs, 120);
  profile.operations.base_monthly_demand.value = 100;
  profile.assumptions.seasonality.forEach((f, i) => { f.value = i < 6 ? 0.5 : 1.5; });
  const seasonal = previewProfile(compileProfile(profile, { profile_id: randomUUID(), revision: 1 }));
  assert.equal(seasonal.baseline.months[1].operations?.service_demand_jobs, 50);
  assert.equal(seasonal.baseline.months[7].operations?.service_demand_jobs, 150);
});
test('compiler blocks unsupported inputs, unresolved dependencies and provenance masquerading', () => {
  const p = eligibleFixture(), identity = { profile_id: randomUUID(), revision: 1 };
  p.business.trade.value = 'plumbing';
  assert.throws(() => compileProfile(p, identity), /blocking/);
  p.business.trade.value = 'HVAC';
  p.operations.forecast_ticket.derivation = { mapping_version: 'company-mapping-2-draft', rule: 'Weighted history', inputs: ['/missing'] };
  assert.throws(() => compileProfile(p, identity), /dependency/);
  p.operations.forecast_ticket.derivation.inputs = ['/operations/base_monthly_demand'];
  p.operations.base_monthly_demand.derivation = { mapping_version: 'company-mapping-2-draft', rule: 'Cycle', inputs: ['/operations/forecast_ticket'] };
  assert.throws(() => compileProfile(p, identity), /Cyclic/);
  assert.equal(ProvenanceSchema.safeParse({ kind: 'profile_source', unit: 'USD', source: 'Some statement' }).success, false);
});
test('estimate labels survive draft import/save and authorized confirmation cannot relabel them measured', () => {
  const store = new ProfileStore(':memory:');
  try {
    const p = eligibleFixture(); p.operations.forecast_ticket.state = 'reviewed_estimate';
    const created = store.create('owner', p), id = created.profile_id;
    assert.throws(() => store.review('owner', id, 1, [{ pointer: '/operations/forecast_ticket', state: 'confirmed', rationale: 'Approve estimate' }]), /retain estimate/);
    assert.equal(store.read('owner', id, 1).profile.operations.forecast_ticket.state, 'entered');
    const reviewed = store.review('owner', id, 1, [{ pointer: '/operations/forecast_ticket', state: 'reviewed_estimate', rationale: 'Owner estimate; limited sample' }]);
    const saved = store.save('owner', id, reviewed.revision, eligibleFixture());
    assert.throws(() => store.review('owner', id, saved.revision, [{ pointer: '/operations/forecast_ticket', state: 'confirmed', rationale: 'Relabel' }]), /retain estimate/);
  } finally { store.close(); }
});
test('create/import strips claimed reviewer authority; explicit authorized review creates a new revision', () => {
  const store = new ProfileStore(':memory:');
  try {
    const created = store.create('owner', eligibleFixture()), id = created.profile_id;
    assert.equal(created.revisions[0].profile.opening.cash.state, 'entered');
    assert.equal(created.revisions[0].profile.opening.cash.review, null);
    assert.throws(() => store.preview('owner', id, 1), /Source review/);
    assert.throws(() => store.read('other-owner', id, 1), /not found/);
    assert.throws(() => store.review('other-owner', id, 1, [{ pointer: '/opening/cash', state: 'confirmed', rationale: 'Attempt' }]), /not found/);
  } finally { store.close(); }
});
test('exact unchanged preview -> acknowledgment -> confirmation has no circular hash or extra revision', () => {
  const store = new ProfileStore(':memory:');
  try {
    const { id, revision } = reviewed(store);
    const preview = store.preview('owner', id, revision);
    assert.throws(() => store.confirm('owner', id, revision), /acknowledgment/);
    const acknowledgment = store.acknowledge('owner', id, revision, preview.preview_id);
    assert.equal(acknowledgment.profile_fingerprint, preview.profile_fingerprint);
    const confirmed = store.confirm('owner', id, revision);
    assert.equal(confirmed.revision, revision);
    assert.equal(confirmed.status, 'confirmed');
    assert.equal(confirmed.compiled?.binding.profile_fingerprint, preview.profile_fingerprint);
    assert.throws(() => store.review('owner', id, revision, [{ pointer: '/opening/cash', state: 'confirmed', rationale: 'Again' }]), /immutable/);
    const snapshot = store.resolve('owner', confirmed.compiled!.binding);
    snapshot.company.operations.technicians = 999;
    assert.equal(store.resolve('owner', confirmed.compiled!.binding).company.operations.technicians, 10);
    assert.throws(() => store.resolve('owner', { ...confirmed.compiled!.binding, compiled_company_fingerprint: '0'.repeat(64) }), /binding/);
  } finally { store.close(); }
});
test('edits and new previews invalidate acknowledgment; exact old confirmed revisions remain isolated', () => {
  const store = new ProfileStore(':memory:');
  try {
    const { id, revision } = reviewed(store);
    const preview = store.preview('owner', id, revision);
    store.acknowledge('owner', id, revision, preview.preview_id);
    const nextPreview = store.preview('owner', id, revision);
    assert.throws(() => store.confirm('owner', id, revision), /acknowledgment/);
    assert.throws(() => store.acknowledge('owner', id, revision, preview.preview_id), /mismatch/);
    store.acknowledge('owner', id, revision, nextPreview.preview_id);
    const confirmed = store.confirm('owner', id, revision);
    const edited = eligibleFixture(); edited.business.name.value = 'Renamed only';
    const draft = store.save('owner', id, revision, edited);
    assert.equal(draft.revision, revision + 1);
    assert.equal(draft.acknowledgment, null);
    assert.throws(() => store.confirm('owner', id, revision), /conflict/);
    assert.throws(() => store.confirm('owner', id, draft.revision), /acknowledgment/);
    assert.equal(store.resolve('owner', confirmed.compiled!.binding).company.name, 'Test business');
    assert.throws(() => store.save('owner', id, revision, edited), /conflict/);
    const other = reviewed(store, 'other');
    assert.throws(() => store.acknowledge('other', other.id, other.revision, preview.preview_id), /mismatch/);
  } finally { store.close(); }
});
test('private SQLite storage persists confirmed snapshots across reopen and deletion revokes resolution', () => {
  if (!['darwin', 'linux'].includes(process.platform)) {
    assert.throws(() => new ProfileStore(join(tmpdir(), 'unsupported-profile.sqlite')), /macOS and Linux only/);
    return; // Explicit rejection tested; durable persistence is not supported or claimed here.
  }
  const dir = mkdtempSync(join(tmpdir(), 'intake-store-')), filename = join(dir, 'profiles.sqlite');
  let store = new ProfileStore(filename);
  try {
    const { id, revision } = reviewed(store), preview = store.preview('owner', id, revision);
    store.acknowledge('owner', id, revision, preview.preview_id);
    const confirmed = store.confirm('owner', id, revision), binding = confirmed.compiled!.binding;
    store.close(); store = new ProfileStore(filename);
    assert.equal(statSync(filename).mode & 0o777, 0o600);
    assert.equal(store.resolve('owner', binding).company.opening_financial_state.cash, -100);
    store.delete('owner', id);
    assert.throws(() => store.resolve('owner', binding), /not found/);
  } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
});
test('bound confirmed execution uses existing runner and rejects another company or an unconfirmed revision', () => {
  const store = new ProfileStore(':memory:');
  try {
  const { id, revision } = reviewed(store), preview = store.preview('owner', id, revision);
  store.acknowledge('owner', id, revision, preview.preview_id);
  const compiled = store.confirm('owner', id, revision).compiled!, before = structuredClone(compiled.company);
  const request = DeterministicRequestSchema.parse({ schema_version: '1.0', company_id: compiled.company.id, horizon_months: 60, reserve_floor_usd: 500, exit_multiple: 5,
    scenarios: [{ id: 'baseline', name: 'Baseline', decisions: [] }, { id: 'plan-a', name: 'A', decisions: [] }, { id: 'plan-b', name: 'B', decisions: [] }] });
  const envelope = { simulation_version: 'profile-simulation-2-draft', company: compiled.binding, request };
  const response = store.simulate('owner', envelope);
  assert.equal(response.result.scenarios.baseline.months.length, 61);
  assert.deepEqual(response.company, compiled.binding);
  assert.deepEqual(store.resolve('owner', compiled.binding).company, before);
  assert.throws(() => store.simulate('other-owner', envelope), /not found/);
  assert.throws(() => store.simulate('owner', { ...envelope, request: { ...request, company_id: 'demo' } }), /does not match/);
  assert.throws(() => store.simulate('owner', { ...envelope, company: { ...compiled.binding, revision: 1 } }), /binding/);
  } finally { store.close(); }
});
