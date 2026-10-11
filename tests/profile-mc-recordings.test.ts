import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { ProfileStore, PROFILE_RECORDING_LIMITS } from '../src/lib/server/intake/store.ts';
import { ProfileMonteCarloJobs } from '../src/lib/server/monte-carlo/profile-jobs.ts';
import { setup, syntheticResult } from './profile-mc-fixture.ts';
const turn = () => new Promise(resolve => setImmediate(resolve));
async function completed(store: ProfileStore, input: unknown) {
  const jobs = new ProfileMonteCarloJobs(store, { execute: async (c,r,f,o) => syntheticResult(c,r,f,o) });
  const receipt = jobs.submit('owner', input);
  assert.throws(() => jobs.record('owner', receipt.job.job_id, receipt.job.access_token), /not available/);
  await turn();
  const saved = jobs.record('owner', receipt.job.job_id, receipt.job.access_token);
  assert.deepEqual(jobs.record('owner', receipt.job.job_id, receipt.job.access_token), saved);
  assert.throws(() => jobs.record('foreign', receipt.job.job_id, receipt.job.access_token), /not found/);
  return saved;
}
test('successful recordings survive reopen with private storage and exact owner/revision/plan validation', async () => {
  if (!['darwin', 'linux'].includes(process.platform)) {
    assert.throws(() => new ProfileStore(join(tmpdir(), `unsupported-recording-${randomUUID()}.sqlite`)), /macOS and Linux only/); return;
  }
  const dir = mkdtempSync(join(tmpdir(), 'profile-recording-')), path = join(dir, 'profiles.sqlite');
  let store = new ProfileStore(path);
  try {
    const { input, id } = setup(true, store);
    const saved = await completed(store, input);
    store.close(); store = new ProfileStore(path);
    assert.deepEqual(store.readMonteCarloRecording('owner', saved.recording_id, input), saved);
    assert.equal(store.listMonteCarloRecordings('owner', input.company).length, 1);
    assert.throws(() => store.readMonteCarloRecording('foreign', saved.recording_id, input), /not found/);
    const edited = structuredClone(input); edited.request.reserve_floor_usd++;
    assert.throws(() => store.readMonteCarloRecording('owner', saved.recording_id, edited), /binding mismatch/);
    const newer = store.save('owner', id, input.company.revision, store.read('owner', id, input.company.revision).profile);
    const wrong = structuredClone(input); wrong.company.revision = newer.revision;
    assert.throws(() => store.readMonteCarloRecording('owner', saved.recording_id, wrong), /Confirmed binding/);
    assert.deepEqual(store.readMonteCarloRecording('owner', saved.recording_id, input), saved);
    const copy = store.readMonteCarloRecording('owner', saved.recording_id, input); copy.recording.result.seed++;
    assert.equal(store.readMonteCarloRecording('owner', saved.recording_id, input).recording.result.seed, 42);
    store.delete('owner', id);
    assert.throws(() => store.readMonteCarloRecording('owner', saved.recording_id, input), /not found/);
    const inspect = new DatabaseSync(path);
    try { assert.equal(inspect.prepare('SELECT COUNT(*) AS count FROM mc_recordings').get()!.count, 0); }
    finally { inspect.close(); }
  } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
});
test('recording bounds, immutability and deletion reject without partial writes', async () => {
  const { store, input } = setup();
  try {
    const saved = await completed(store, input);
    const relabeled = structuredClone(input); relabeled.request.scenarios[0].name = 'A different saved label';
    assert.throws(() => store.saveMonteCarloRecording('owner', relabeled, saved.recording), /identity conflict/);
    const malformed = structuredClone(saved.recording); malformed.result.seed++;
    assert.throws(() => store.saveMonteCarloRecording('owner', input, malformed), /does not match/);
    const other = structuredClone(saved.recording); other.result.run_id = randomUUID();
    const oversized = structuredClone(input); oversized.request.scenarios[0].name = 'x'.repeat(PROFILE_RECORDING_LIMITS.bodyBytes);
    assert.throws(() => store.saveMonteCarloRecording('owner', oversized, other), /storage limit/);
    assert.equal(store.listMonteCarloRecordings('owner', input.company).length, 1);
    for (let i = 1; i < PROFILE_RECORDING_LIMITS.recordsPerOwner; i++) {
      other.result.run_id = randomUUID(); store.saveMonteCarloRecording('owner', input, other);
    }
    other.result.run_id = randomUUID();
    assert.throws(() => store.saveMonteCarloRecording('owner', input, other), /limit reached/);
    assert.equal(store.listMonteCarloRecordings('owner', input.company).length, PROFILE_RECORDING_LIMITS.recordsPerOwner);
    assert.throws(() => store.deleteMonteCarloRecording('foreign', saved.recording_id), /not found/);
    store.deleteMonteCarloRecording('owner', saved.recording_id);
    assert.throws(() => store.readMonteCarloRecording('owner', saved.recording_id, input), /not found/);
  } finally { store.close(); }
});

test('durable recordings detect changed stored bodies and enforce expiry cleanup', async () => {
  if (!['darwin', 'linux'].includes(process.platform)) return; // Durable storage policy is tested above.
  const dir = mkdtempSync(join(tmpdir(), 'profile-recording-integrity-')), path = join(dir, 'profiles.sqlite');
  const store = new ProfileStore(path), inspect = new DatabaseSync(path);
  try {
    const { input } = setup(true, store), saved = await completed(store, input);
    inspect.prepare('UPDATE mc_recordings SET body = ? WHERE id = ?').run(JSON.stringify({ ...saved, recorded_at: '2000-01-01T00:00:00.000Z' }), saved.recording_id);
    assert.throws(() => store.readMonteCarloRecording('owner', saved.recording_id, input), /Stored recording mismatch/);
    assert.throws(() => store.listMonteCarloRecordings('owner', input.company), /Stored recording mismatch/);
    inspect.prepare('UPDATE mc_recordings SET body = ?, expires = 0 WHERE id = ?').run(JSON.stringify(saved), saved.recording_id);
    assert.throws(() => store.readMonteCarloRecording('owner', saved.recording_id, input), /expired/);
    assert.deepEqual(store.listMonteCarloRecordings('owner', input.company), []);
    store.pruneMonteCarloRecordings();
    assert.equal(inspect.prepare('SELECT COUNT(*) AS count FROM mc_recordings').get()!.count, 0);
  } finally { inspect.close(); store.close(); rmSync(dir, { recursive: true, force: true }); }
});
