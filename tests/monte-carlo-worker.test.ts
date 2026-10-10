import test from 'node:test';
import assert from 'node:assert/strict';
import requestFixture from '../contracts/example-request.json' with { type: 'json' };
import { loadDemoCompany } from '../src/lib/server/api/company.ts';
import { loadMonteCarloConfig } from '../src/lib/server/monte-carlo/config.ts';
import { runMonteCarloWorker } from '../src/lib/server/monte-carlo/worker.ts';

const request = () => ({ ...structuredClone(requestFixture), monte_carlo: { enabled: true, runs: 2000, seed: 42 } });

test('worker rejects invalid context and pre-cancelled jobs before execution', async () => {
  const company = loadDemoCompany(), config = loadMonteCarloConfig();
  await assert.rejects(runMonteCarloWorker(company, request(), config, { timeoutMs: 0 }), /timeout/);
  await assert.rejects(runMonteCarloWorker(company, { ...request(), company_id: 'other' }, config, { timeoutMs: 1000 }), /company ID/);
  await assert.rejects(runMonteCarloWorker(company, request(), config,
    { timeoutMs: 1000, signal: AbortSignal.abort() }), /cancelled/);
});

test('real source worker reports aggregated progress, then terminates on cancellation without partial output', async () => {
  const controller = new AbortController();
  const company = loadDemoCompany(), input = request(), config = loadMonteCarloConfig();
  const snapshot = structuredClone({ company, input, config });
  const progress: number[] = [];
  await assert.rejects(runMonteCarloWorker(company, input, config, {
    timeoutMs: 30000, signal: controller.signal,
    onProgress(completed) { progress.push(completed); controller.abort(); },
  }), /cancelled/);
  assert.deepEqual(progress, [1]);
  assert.deepEqual({ company, input, config }, snapshot);
});

test('worker timeout terminates execution without returning partial results', async () => {
  await assert.rejects(runMonteCarloWorker(loadDemoCompany(), request(), loadMonteCarloConfig(), { timeoutMs: 1 }), /timed out/);
});

test('progress consumer failure terminates worker and preserves the error', async () => {
  const error = new Error('consumer failed');
  await assert.rejects(runMonteCarloWorker(loadDemoCompany(), request(), loadMonteCarloConfig(), {
    timeoutMs: 30000, onProgress() { throw error; },
  }), value => value === error);
});
