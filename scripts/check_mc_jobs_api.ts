/** Opt-in local preview HTTP review. Runs one real aggregated path then cancels. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const base = process.env.MC_REVIEW_BASE_URL ?? 'http://127.0.0.1:4174';
const call = async (path: string, init?: RequestInit) => {
  const response = await fetch(new URL(path, base), init);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  return response;
};
const input = { ...JSON.parse(readFileSync('contracts/example-request.json', 'utf8')), monte_carlo: { enabled: true, runs: 2000, seed: 42 } };
const submitted = await call('/api/v1/simulate/monte-carlo', {
  method: 'POST', headers: { 'content-type': 'application/json', origin: base }, body: JSON.stringify(input),
});
assert.equal(submitted.status, 202);
const receipt = await submitted.json();
const headers = { 'x-mc-job-token': receipt.access_token };
try {
  assert.equal((await call(receipt.status_url)).status, 404);
  assert.equal((await call(receipt.result_url, { headers })).status, 409);
  const deadline = Date.now() + 30000;
  let completed = 0;
  while (Date.now() < deadline && completed === 0) {
    const status = await (await call(receipt.status_url, { headers })).json();
    assert.equal(status.state, 'running');
    completed = status.completed_runs;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(completed >= 1, 'actual aggregated run reported through built HTTP route');
  const metadata = await (await fetch(new URL('/api/v1/model/metadata', base))).json();
  assert.equal(metadata.readiness.monte_carlo, true);
  assert.equal((await fetch(new URL('/api/v1/health', base))).status, 200);
} finally {
  const cancelled = await call(receipt.status_url, { method: 'DELETE', headers: { ...headers, origin: base } });
  assert.equal(cancelled.status, 200);
  assert.equal((await cancelled.json()).state, 'cancelled');
}
assert.equal((await call(receipt.result_url, { headers })).status, 409);
console.log('PASS: built HTTP submission, token isolation, pending result, real aggregated progress, responsive health, cancellation and no-store; accepted local MC readiness is true.');
