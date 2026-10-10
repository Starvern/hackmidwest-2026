import test from 'node:test';
import assert from 'node:assert/strict';
import { GET as metadata } from '../src/routes/api/v1/model/metadata/+server.ts';
import { GET as recorded } from '../src/routes/api/v1/simulate/monte-carlo/recorded/+server.ts';

test('accepted readiness and recorded output are scoped to explicitly enabled local host', async () => {
  const original = process.env.OPERATOROS_MC_REVIEW;
  const local = { url: new URL('http://127.0.0.1:4174/api/v1/model/metadata') };
  try {
    delete process.env.OPERATOROS_MC_REVIEW;
    assert.equal((await (await metadata(local)).json()).readiness.monte_carlo, false);
    assert.equal((await recorded(local)).status, 503);
    process.env.OPERATOROS_MC_REVIEW = '1';
    assert.equal((await (await metadata(local)).json()).readiness.monte_carlo, true);
    assert.equal((await (await metadata({ url: new URL('https://example.com') })).json()).readiness.monte_carlo, false);
    assert.equal((await recorded({ url: new URL('https://example.com') })).status, 503);
    const response = await recorded(local);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const saved = await response.json();
    assert.equal(saved.request.monte_carlo.seed, 42);
    assert.equal(saved.result.runs, 2000);
    assert.equal(saved.result.scenarios.combined_expansion.terminal_distributions.exit_equity_value.unavailable_path_count, 19);
    saved.result.seed = 99;
    assert.equal((await (await recorded(local)).json()).result.seed, 42);
  } finally {
    if (original === undefined) delete process.env.OPERATOROS_MC_REVIEW;
    else process.env.OPERATOROS_MC_REVIEW = original;
  }
});
