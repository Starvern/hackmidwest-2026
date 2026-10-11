import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { eligibleFixture } from './intake-fixture.ts';
import { ProfileStore, type ReviewSelection } from '../src/lib/server/intake/store.ts';
import { loadMonteCarloConfig } from '../src/lib/server/monte-carlo/config.ts';
import { ProfileMonteCarloJobs, validateRecordedProfileMonteCarlo } from '../src/lib/server/monte-carlo/profile-jobs.ts';
import { runMonteCarloWorker } from '../src/lib/server/monte-carlo/worker.ts';
import { profileMCContext } from '../src/lib/server/monte-carlo/binding.ts';
import { LOCAL_MC_LIMITS } from '../src/lib/server/monte-carlo/jobs.ts';
import { MonteCarloRequestSchema, DeterministicRequestSchema } from '../src/lib/server/schemas.ts';
import example from '../contracts/example-request.json' with { type: 'json' };
const turn = () => new Promise(resolve => setImmediate(resolve));
function selections(value: unknown, pointer = ''): ReviewSelection[] {
  if (!value || typeof value !== 'object') return [];
  if ('state' in value && 'value' in value) return value.value === null ? [] : [{ pointer, state: 'confirmed', rationale: 'Synthetic transport test review' }];
  return Object.entries(value).flatMap(([key, child]) => selections(child, `${pointer}/${key}`));
}
function setup(withRisk = true) {
  const store = new ProfileStore(':memory:'), p = eligibleFixture();
  // Explicit fixture-only config, never a production fallback or company calibration claim.
  if (withRisk) p.assumptions.risk_configuration = { ...p.opening.cash, value: JSON.parse(JSON.stringify(loadMonteCarloConfig())), unit: 'record' };
  const created = store.create('owner', p), id = created.profile_id;
  const reviews = selections(created.revisions[0].profile);
  reviews.push({ pointer: '/sources/0', state: 'confirmed', rationale: 'Synthetic source review' });
  const reviewed = store.review('owner', id, 1, reviews);
  const preview = store.preview('owner', id, reviewed.revision);
  store.acknowledge('owner', id, reviewed.revision, preview.preview_id);
  const confirmed = store.confirm('owner', id, reviewed.revision);
  const company = confirmed.compiled!.binding;
  const input = { simulation_version: 'profile-simulation-2-draft' as const, company,
    request: MonteCarloRequestSchema.parse({ ...structuredClone(example), company_id: `profile:${id}`, monte_carlo: { enabled: true, runs: 2000, seed: 42 } }) };
  return { store, input, id };
}
/** Synthetic full-envelope adapter: validates transport, never represents new sampled output. */
function syntheticResult(company: any, request: any, config: any, options: any) {
  const result = JSON.parse(readFileSync('data/example-monte-carlo-result.json', 'utf8'));
  const context = profileMCContext(options.profileContext.company, company, request, config);
  for (let completed = 1; completed <= 2000; completed++) options.onProgress(completed);
  return { ...result, company_id: company.id, run_id: options.runId, configuration: config,
    input_fingerprint: context.input_fingerprint, config_fingerprint: context.config_fingerprint };
}
test('profile jobs require confirmed owner snapshot and explicit reviewed risk config, never demo defaults', () => {
  const { store, input } = setup(false);
  try {
    const jobs = new ProfileMonteCarloJobs(store);
    assert.throws(() => jobs.submit('owner', input), /risk configuration/);
    assert.throws(() => jobs.submit('foreign', input), /not found/);
    const forged = structuredClone(input); forged.company.revision++;
    assert.throws(() => jobs.submit('owner', forged), /not found/);
    assert.throws(() => store.simulate('owner', input), /unavailable/);
  } finally { store.close(); }
});
test('bound jobs preserve revision and plan, isolate owners/tokens/copies, and reject stale recordings', async () => {
  const { store, input, id } = setup();
  let now = Date.now();
  try {
    const jobs = new ProfileMonteCarloJobs(store, { now: () => now, execute: async (c,r,f,o) => syntheticResult(c,r,f,o) });
    const receipt = jobs.submit('owner', input), { job_id, access_token } = receipt.job;
    assert.equal('status_url' in receipt.job, false);
    const expected = structuredClone(input);
    input.company.revision++; input.request.exit_multiple++;
    receipt.context.company.revision++;
    await turn();
    assert.equal(jobs.status('owner', job_id, access_token).job.state, 'succeeded');
    assert.throws(() => jobs.result('foreign', job_id, access_token), /not found/);
    assert.throws(() => jobs.result('owner', job_id, 'wrong'), /not found/);
    const recorded = jobs.result('owner', job_id, access_token);
    assert.deepEqual(recorded.context.company, expected.company);
    assert.deepEqual(validateRecordedProfileMonteCarlo(store, 'owner', expected, recorded), recorded);
    const edited = structuredClone(expected); edited.request.exit_multiple++;
    assert.throws(() => validateRecordedProfileMonteCarlo(store, 'owner', edited, recorded), /binding mismatch/);
    assert.throws(() => validateRecordedProfileMonteCarlo(store, 'owner', expected, recorded.result), /recording required/);
    const forged = structuredClone(recorded); forged.context.company.revision++;
    assert.throws(() => validateRecordedProfileMonteCarlo(store, 'owner', expected, forged), /binding mismatch/);
    recorded.result.seed = 99;
    assert.equal(jobs.result('owner', job_id, access_token).result.seed, 42);
    // A newer draft does not silently retarget an already confirmed old revision.
    store.create('owner', eligibleFixture());
    assert.deepEqual(jobs.result('owner', job_id, access_token).context.company, expected.company);
    now += LOCAL_MC_LIMITS.retentionMs;
    assert.throws(() => jobs.status('owner', job_id, access_token), /expired/);
    const second = jobs.submit('owner', expected); await turn();
    store.delete('owner', id);
    assert.throws(() => jobs.result('owner', second.job.job_id, second.job.access_token), /not found/);
  } finally { store.close(); }
});
test('actual worker transfer requires matching profile context and rejects missing/other revision echoes', async () => {
  const { store, input } = setup();
  try {
    const snapshot = store.resolve('owner', input.company), config = loadMonteCarloConfig();
    const context = profileMCContext(input.company, snapshot.company, input.request, config);
    const options = { timeoutMs: 30000, workerUrl: new URL('./fixtures/profile-mc-result-worker.ts', import.meta.url), profileContext: context };
    const result = await runMonteCarloWorker(snapshot.company, input.request, config, { ...options, runId: 'bound-transfer' });
    assert.equal(result.company_id, input.request.company_id);
    for (const runId of ['missing-binding', 'wrong-binding']) await assert.rejects(runMonteCarloWorker(snapshot.company, input.request, config, { ...options, runId }));
    const altered = structuredClone(context); altered.company.compiled_company_fingerprint = '0'.repeat(64);
    await assert.rejects(runMonteCarloWorker(snapshot.company, input.request, config, { ...options, profileContext: altered }), /snapshot mismatch/);
  } finally { store.close(); }
});

test('real neutral sampled profile path reproduces deterministic baseline and clears only overridden provenance', async () => {
  const { resolveMonteCarloCompany, sample_shared_path, sample_action_risks } = await import('../src/lib/server/engine/monte_carlo.ts');
  const { simulate_deterministic, simulate_months } = await import('../src/lib/server/engine/scenarios.ts');
  const { store, input } = setup();
  try {
    const snapshot = store.resolve('owner', input.company), before = structuredClone(snapshot.company);
    const resolved = resolveMonteCarloCompany(snapshot.company, input.request);
    for (const field of ['valuation_multiple', 'liquidity_floor']) {
      assert.equal(resolved.provenance[`/global_assumptions/${field}`].kind, 'user_input');
      assert.equal(resolved.provenance[`/global_assumptions/${field}`].profile_ref, undefined);
    }
    assert.equal(resolved.provenance['/operations/base_monthly_job_demand'].kind, 'profile_source');
    const zero = loadMonteCarloConfig();
    zero.macro.innovation_spread = 0;
    for (const mapping of Object.values(zero.mappings)) mapping.loading = 0;
    for (const spec of [zero.shared.wage, zero.shared.vehicle_opex, zero.decision.marketing_effectiveness]) spec.min = spec.mode = spec.max = 1;
    for (const spec of [zero.decision.ramp_offset, zero.decision.hiring_delay_offset, zero.decision.truck_service_delay_offset]) spec.probabilities = spec.values.map(v => v === 0 ? 1 : 0);
    const { monte_carlo, ...deterministic } = input.request; void monte_carlo;
    const expected = simulate_deterministic(snapshot.company, DeterministicRequestSchema.parse(deterministic));
    for (const scenario of input.request.scenarios) {
      const actual = simulate_months(resolved, scenario.decisions, { scenario, ...sample_shared_path(zero, 42, 0, input.request.exit_multiple),
        path_risks: sample_action_risks(zero, 42, 0, scenario.decisions), seed: 42, input_fingerprint: 'a'.repeat(64) });
      assert.deepEqual(actual.months, expected.scenarios[scenario.id].months);
      assert.deepEqual(actual.metrics, expected.scenarios[scenario.id].metrics);
    }
    assert.deepEqual(snapshot.company, before);
  } finally { store.close(); }
});
