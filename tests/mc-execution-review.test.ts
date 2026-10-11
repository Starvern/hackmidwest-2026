import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { simulate_monte_carlo } from '../src/lib/server/engine/monte_carlo.ts';
import { loadMonteCarloConfig } from '../src/lib/server/monte-carlo/config.ts';

test('real MC orchestration reports an aggregated run, preserves inputs and propagates callback failure without partial result', () => {
  const load = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
  const company = load('../data/synthetic_hvac_company.json');
  const request = { ...load('../contracts/example-request.json'), monte_carlo: { enabled: true, runs: 2000, seed: 42 } };
  const config = loadMonteCarloConfig();
  const original = structuredClone({ company, request, config });
  const stop = new Error('Independent review stops after first completed aggregate');
  const progress: number[] = [];
  let returned = false;
  assert.throws(() => {
    simulate_monte_carlo(company, request, config, 'p1-execution-review', completed => {
      progress.push(completed);
      throw stop;
    });
    returned = true;
  }, error => error === stop);
  assert.deepEqual(progress, [1]);
  assert.equal(returned, false);
  assert.deepEqual({ company, request, config }, original);
});
