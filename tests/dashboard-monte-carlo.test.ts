import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import example from '../contracts/example-request.json' with { type: 'json' };
import type { DeterministicRequest } from '../contracts/contracts.ts';
import { createRiskController, emptyRiskState, riskRequest, probabilityLabel, eligibilityLabel, pairedExit } from '../src/lib/dashboard/monte-carlo.ts';
const request = () => riskRequest(example as unknown as DeterministicRequest, 42);
const result = () => JSON.parse(readFileSync('data/example-monte-carlo-result.json', 'utf8'));
const id = '11111111-1111-4111-8111-111111111111';
const base = `/api/v1/simulate/monte-carlo/jobs/${id}`;
const status = (state = 'running') => ({ transport_version: 'mc-job-1-candidate', job_id: id, state, completed_runs: state === 'succeeded' ? 2000 : 1, total_runs: 2000, created_at: new Date().toISOString(), finished_at: null, expires_at: null, error: null });
const receipt = () => ({ ...status('queued'), access_token: 'a'.repeat(64), status_url: base, result_url: `${base}/result` });
const json = (value: unknown) => new Response(JSON.stringify(value));

test('expired or restarted-server job releases controls and preserves prior results for a fresh submission', async () => {
  let state = emptyRiskState(), posts = 0;
  const controller = createRiskController(value => state = value, (async (url, init) => {
    if (String(url).endsWith('/recorded')) return json({ request: request(), result: result() });
    if (init?.method === 'POST') { posts++; return json(receipt()); }
    return new Response(JSON.stringify({ error: { message: 'Job not found.' } }), { status: 404 });
  }) as typeof fetch);
  await controller.recorded(); const prior = state.result;
  await controller.start(request());
  assert.equal(state.job, null); assert.equal(state.busy, false);
  assert.equal(state.result, prior); assert.match(state.error, /no longer available/);
  await controller.resume(); assert.equal(posts, 1);
  await controller.start(request()); assert.equal(posts, 2);
  controller.dispose();
});

test('missing job during cancellation also releases the active job', async () => {
  let state = emptyRiskState();
  const controller = createRiskController(value => state = value, (async (_url, init) => {
    if (init?.method === 'POST') return json(receipt());
    if (init?.method === 'DELETE') return new Response('Not found', { status: 404 });
    throw new Error('offline');
  }) as typeof fetch);
  await controller.start(request()); assert.equal(state.job?.state, 'queued');
  await controller.cancel();
  assert.equal(state.job, null); assert.equal(state.busy, false);
  assert.match(state.error, /no longer available/); controller.dispose();
});

test('risk projection preserves actual unavailable denominators, zero probabilities, conditional null payback and paired results', () => {
  const s = result().scenarios.combined_expansion;
  assert.equal(probabilityLabel(s.path_risks.probability_cash_below_reserve_any_month), '18.10%');
  assert.equal(eligibilityLabel(s.path_risks.probability_negative_exit_equity_delta), '1,981 eligible · 19 unavailable');
  assert.equal(probabilityLabel(s.payback.probability_within_horizon), '0.00%');
  assert.equal(s.payback.median_month_conditional_on_payback_or_null, null);
  assert.match(probabilityLabel(result().scenarios.baseline.path_risks.probability_negative_exit_equity_delta), /not applicable/);
  assert.equal(s.monthly_percentiles.equity_value[0].p50, null);
  assert.equal(pairedExit(result(), 'baseline').p50, null);
  assert.equal(pairedExit(result(), 'combined_expansion').valid_path_count, 1981);
  assert.throws(() => riskRequest(example as unknown as DeterministicRequest, -1), /Seed/);
});

test('explicit polling retry resumes same job without duplicate POST and verifies complete job identity', async () => {
  let state = emptyRiskState(), polls = 0, posts = 0;
  const fetcher = (async (url, init) => {
    if (init?.method === 'POST') { posts++; return json(receipt()); }
    if (String(url).endsWith('/result')) return json({ ...result(), run_id: id });
    if (++polls === 1) throw new Error('network');
    return json(status('succeeded'));
  }) as typeof fetch;
  const controller = createRiskController(value => state = value, fetcher);
  await controller.start(request());
  assert.match(state.error, /Resume checking/);
  assert.equal(state.result, null);
  await controller.start(request()); assert.equal(posts, 1);
  await controller.resume();
  assert.equal(posts, 1); assert.equal(state.result!.run_id, id); assert.equal(state.resultInput, JSON.stringify(request()));
  controller.dispose();
});

test('recorded success remains visible after submission failure and is labeled separately', async () => {
  let state = emptyRiskState(), posts = 0;
  const controller = createRiskController(value => state = value, (async (_url, init) => {
    if (init?.method === 'POST') { posts++; throw new Error('offline'); }
    return json({ request: request(), result: result() });
  }) as typeof fetch);
  await controller.recorded(); const prior = state.result;
  assert.equal(state.source, 'recorded');
  await controller.start(request());
  assert.equal(state.result, prior); assert.equal(posts, 1); assert.match(state.error, /may create another job/);
  controller.dispose();
});

test('cancellation fences delayed poll response and keeps prior successful result', async () => {
  let state = emptyRiskState();
  let resolvePoll: (response: Response) => void = () => {};
  const controller = createRiskController(value => state = value, (async (url, init) => {
    if (String(url).endsWith('/recorded')) return json({ request: request(), result: result() });
    if (init?.method === 'POST') return json(receipt());
    if (init?.method === 'DELETE') return json(status('cancelled'));
    return new Promise<Response>(resolve => { resolvePoll = resolve; });
  }) as typeof fetch);
  await controller.recorded(); const prior = state.result;
  const started = controller.start(request()); await new Promise(resolve => setImmediate(resolve));
  await controller.cancel();
  resolvePoll(json(status('succeeded'))); await started;
  assert.equal(state.job!.state, 'cancelled'); assert.equal(state.result, prior); assert.equal(state.busy, false);
  controller.dispose();
});

test('wrong result identity is rejected and previous forecast is not overwritten', async () => {
  let state = emptyRiskState();
  const controller = createRiskController(value => state = value, (async (_url, init) => {
    if (init?.method === 'POST') return json(receipt());
    if (String(_url).endsWith('/result')) return json(result());
    return json(status('succeeded'));
  }) as typeof fetch);
  await controller.start(request()); assert.equal(state.result, null); assert.match(state.error, /does not match/);
  controller.dispose();
});
