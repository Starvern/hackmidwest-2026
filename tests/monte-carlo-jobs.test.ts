import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import requestFixture from '../contracts/example-request.json' with { type: 'json' };
import { loadDemoCompany } from '../src/lib/server/api/company.ts';
import { loadMonteCarloConfig } from '../src/lib/server/monte-carlo/config.ts';
import { JobError, LOCAL_MC_LIMITS, MonteCarloJobs } from '../src/lib/server/monte-carlo/jobs.ts';
import { runMonteCarloWorker, type WorkerOptions } from '../src/lib/server/monte-carlo/worker.ts';
const input = () => ({ ...structuredClone(requestFixture), monte_carlo: { enabled: true, runs: 2000, seed: 42 } });
const fixture = () => JSON.parse(readFileSync('data/example-monte-carlo-result.json', 'utf8'));
const turn = () => new Promise(resolve => setImmediate(resolve));
const submit = (store: MonteCarloJobs) => store.submit(loadDemoCompany(), input(), loadMonteCarloConfig());

test('bounded queue enforces tokens, snapshot isolation and cancellation holds slot until execution settles', async () => {
  const pending: { options: WorkerOptions; reject: (error: Error) => void }[] = [];
  const store = new MonteCarloJobs({ execute: async (_c, _r, _f, options) => new Promise((_resolve, reject) => pending.push({ options, reject })) });
  const a = submit(store), b = submit(store), c = submit(store);
  assert.equal(store.status(a.job_id, a.access_token).state, 'running');
  assert.equal(store.status(b.job_id, b.access_token).state, 'queued');
  assert.throws(() => submit(store), (error: unknown) => error instanceof JobError && error.status === 429);
  assert.throws(() => store.status(a.job_id, b.access_token), (error: unknown) => error instanceof JobError && error.status === 404);
  assert.throws(() => store.result(a.job_id, a.access_token), /not available/);
  const copied = store.status(a.job_id, a.access_token); copied.completed_runs = 2000;
  assert.equal(store.status(a.job_id, a.access_token).completed_runs, 0);
  await turn();
  assert.equal(pending.length, 1);
  store.cancel(b.job_id, b.access_token);
  store.cancel(a.job_id, a.access_token);
  assert.equal(pending[0].options.signal!.aborted, true);
  assert.equal(store.status(c.job_id, c.access_token).state, 'queued');
  pending[0].reject(new Error('cancelled'));
  await turn();
  assert.equal(store.status(c.job_id, c.access_token).state, 'running');
  store.cancel(c.job_id, c.access_token); pending[1].reject(new Error('cancelled')); await turn();
});

test('saved real result fixture exercises full context/identity, retained results and expiry without rerunning benchmark', async () => {
  let now = Date.now();
  const store = new MonteCarloJobs({ now: () => now, execute: async (_c, _r, _f, options) => {
    for (let run = 1; run <= 2000; run++) options.onProgress!(run);
    return { ...fixture(), run_id: options.runId };
  } });
  const job = submit(store); await turn();
  assert.equal(store.status(job.job_id, job.access_token).state, 'succeeded');
  const result = store.result(job.job_id, job.access_token);
  assert.equal(result.runs, 2000);
  result.seed = 99;
  assert.equal(store.result(job.job_id, job.access_token).seed, 42);
  assert.equal(store.cancel(job.job_id, job.access_token).state, 'succeeded');
  now += LOCAL_MC_LIMITS.retentionMs;
  assert.throws(() => store.status(job.job_id, job.access_token), /expired/);
  assert.throws(() => new MonteCarloJobs().status(job.job_id, job.access_token), /not found/);
});

test('invalid context/result and timeout fail the entire job with generic status and no partial result', async () => {
  const original = console.error; console.error = () => {};
  try {
    for (const mode of ['context', 'timeout', 'progress'] as const) {
      const store = new MonteCarloJobs({ execute: async (_c, _r, _f, options) => {
        if (mode === 'timeout') throw new Error('Monte Carlo job timed out');
        if (mode === 'progress') options.onProgress!(2);
        for (let run = 1; run <= 2000; run++) options.onProgress!(run);
        return { ...fixture(), run_id: options.runId, seed: 99 };
      } });
      const job = submit(store); await turn();
      const status = store.status(job.job_id, job.access_token);
      assert.equal(status.state, 'failed');
      assert.equal(status.error, mode === 'timeout' ? 'EXECUTION_TIMEOUT' : 'EXECUTION_FAILED');
      assert.throws(() => store.result(job.job_id, job.access_token), /not available/);
    }
  } finally { console.error = original; }
});

test('job store rejects unmeasured 5000 runs and bounds retained records', async () => {
  const store = new MonteCarloJobs({ execute: async () => { throw new Error('unexpected execution'); } });
  assert.throws(() => store.submit(loadDemoCompany(), { ...input(), monte_carlo: { enabled: true, runs: 5000, seed: 42 } }, loadMonteCarloConfig()), /2,000/);
  // Cancel immediately; executor sees an aborted signal and never computes a forecast.
  const original = console.error; console.error = () => {};
  try {
    for (let index = 0; index < LOCAL_MC_LIMITS.records; index++) { const job = submit(store); store.cancel(job.job_id, job.access_token); await turn(); }
    assert.throws(() => submit(store), (error: unknown) => error instanceof JobError && error.status === 429);
  } finally { console.error = original; }
});

test('worker protocol transfers saved actual full envelope and rejects wrong run identity (fixture, not new computation)', async () => {
  const workerUrl = new URL('./fixtures/mc-result-worker.ts', import.meta.url);
  const result = await runMonteCarloWorker(loadDemoCompany(), input(), loadMonteCarloConfig(), { timeoutMs: 30000, workerUrl, runId: 'transfer-review' });
  assert.equal(result.run_id, 'transfer-review');
  assert.equal(result.runs, 2000);
  await assert.rejects(runMonteCarloWorker(loadDemoCompany(), input(), loadMonteCarloConfig(), { timeoutMs: 30000, workerUrl, runId: 'invalid-result' }), /mismatch/);
});
