/** Checks a real saved benchmark without rerunning the expensive ensemble. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APPROVED_POLICIES } from '../src/lib/server/schemas.ts';
import { loadMonteCarloConfig } from '../src/lib/server/monte-carlo/config.ts';
import { validateMonteCarloResult } from '../src/lib/server/monte-carlo/result.ts';
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const company = read('data/synthetic_hvac_company.json');
const request = { ...read('contracts/example-request.json'), monte_carlo: { enabled: true, runs: 2000, seed: 42 } };
const result = validateMonteCarloResult(read('data/example-monte-carlo-result.json'), company, request, APPROVED_POLICIES, loadMonteCarloConfig());
let probabilities = 0, quantiles = 0;
function inspect(value: unknown) {
  if (!value || typeof value !== 'object') return;
  const row = value as Record<string, unknown>;
  if ('valid_path_count' in row) assert.equal(Number(row.valid_path_count) + Number(row.unavailable_path_count), 2000);
  if ('value' in row && 'unavailable_reason' in row) {
    probabilities++;
    if (row.value !== null) assert.ok(Number(row.value) >= 0 && Number(row.value) <= 1);
  }
  if ('p10' in row) {
    quantiles++;
    if (row.p10 !== null) assert.ok(Number(row.p10) <= Number(row.p50) && Number(row.p50) <= Number(row.p90));
  }
  Object.values(row).forEach(inspect);
}
inspect(result.scenarios); inspect(result.comparisons);
console.log(JSON.stringify({ runs: result.runs, scenarios: Object.keys(result.scenarios).length, probabilities, quantiles, context_validated: true }));
