import test from 'node:test';
import assert from 'node:assert/strict';
import requestFixture from '../contracts/example-request.json' with { type: 'json' };
import { submitJob, jobAction } from '../src/lib/server/monte-carlo/jobs-api.ts';
const url = new URL('http://127.0.0.1:4173/api/v1/simulate/monte-carlo');
const post = (body: string, target = url) => submitJob({ url: target, request: new Request(target, { method: 'POST', body }) });

test('job HTTP review gate, bounded input, validation, token isolation and cancellation use structured no-store responses', async () => {
  const before = process.env.OPERATOROS_MC_REVIEW;
  try {
    delete process.env.OPERATOROS_MC_REVIEW;
    assert.equal((await post('{}')).status, 503);
    process.env.OPERATOROS_MC_REVIEW = '1';
    assert.equal((await post('{}', new URL('https://example.com/api/v1/simulate/monte-carlo'))).status, 503);
    for (const [body, status] of [['{', 400], ['{}', 422], [' '.repeat(65537), 413]] as const) {
      const response = await post(body);
      assert.equal(response.status, status);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.ok((await response.json()).error.code);
    }
    const input = { ...requestFixture, monte_carlo: { enabled: true, runs: 2000, seed: 42 } };
    assert.equal((await post(JSON.stringify({ ...input, monte_carlo: { enabled: true, runs: 5000, seed: 42 } }))).status, 422);
    const response = await post(JSON.stringify(input));
    assert.equal(response.status, 202);
    const receipt = await response.json();
    const event = (token: string) => ({ url, params: { id: receipt.job_id }, request: new Request(url, { headers: { 'x-mc-job-token': token } }) });
    assert.equal((await jobAction('status', event('bad-token'))).status, 404);
    assert.equal((await jobAction('result', event(receipt.access_token))).status, 409);
    const cancelled = await jobAction('cancel', event(receipt.access_token));
    assert.equal(cancelled.status, 200);
    assert.equal((await cancelled.json()).state, 'cancelled');
    const status = await jobAction('status', event(receipt.access_token));
    assert.equal(status.headers.get('cache-control'), 'no-store');
    assert.equal((await status.json()).access_token, undefined);
    assert.equal((await jobAction('result', event(receipt.access_token))).status, 409);
  } finally {
    if (before === undefined) delete process.env.OPERATOROS_MC_REVIEW;
    else process.env.OPERATOROS_MC_REVIEW = before;
  }
});

test('framework normalization preserves intentional unavailable MC responses while hiding unexpected server errors', async () => {
  const { apiError, normalizeApiError } = await import('../src/lib/server/api/http.ts');
  for (const code of ['MC_NOT_READY', 'WORKER_UNAVAILABLE']) {
    const response = await normalizeApiError(apiError(503, code, 'Local review unavailable.'));
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error.code, code);
  }
  const unexpected = await normalizeApiError(apiError(503, 'UNEXPECTED', 'internal details'));
  assert.equal((await unexpected.json()).error.code, 'INTERNAL_ERROR');
});
