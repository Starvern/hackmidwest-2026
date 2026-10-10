/** Person 1 reference response generated exclusively by the real deterministic engine. */
import { readFileSync, writeFileSync } from 'node:fs';
import { CompanyInputSchema, DeterministicRequestSchema } from '../src/lib/server/schemas.ts';
import { simulate_deterministic } from '../src/lib/server/engine/scenarios.ts';

const company = CompanyInputSchema.parse(JSON.parse(readFileSync(new URL('../data/synthetic_hvac_company.json', import.meta.url), 'utf8')));
const request = DeterministicRequestSchema.parse(JSON.parse(readFileSync(new URL('../contracts/example-request.json', import.meta.url), 'utf8')));
const result = simulate_deterministic(company, request, 'deterministic-reference-mvp-1.0');
const target = new URL('../contracts/example-result.json', import.meta.url);
const contents = JSON.stringify(result, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8').replaceAll('\r\n', '\n') !== contents) throw new Error('Computed reference response drift; regenerate with this script');
} else writeFileSync(target, contents);
console.log('Validated 61-state baseline/truck-only/combined reference response from real engine.');
for (const [id, path] of Object.entries(result.scenarios)) console.log(`${id}: exit equity ${path.metrics.exit_equity_value}, minimum cash ${path.metrics.minimum_cash}, payback ${path.metrics.payback.status}`);
