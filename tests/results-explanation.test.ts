import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { SimulationResultSchema } from '../src/lib/server/schemas.ts';
import { explainResults } from '../src/lib/dashboard/explanation.ts';
const result = SimulationResultSchema.parse(JSON.parse(readFileSync(new URL('../contracts/example-result.json', import.meta.url), 'utf8')));
test('owner explanation reflects actual temporary sales, continuing costs and honest alternatives', () => {
  const text = explainResults(result, 'combined_expansion')!;
  assert.match(text.cash, /\$816,471.*less cash/);
  assert.ok(text.reasons.some(r => r.includes('12 of the 60 months') && r.includes('month 16')));
  assert.ok(text.reasons.some(r => r.includes('continue after')));
  assert.match(text.value, /\$2,297,099.*lower/);
  assert.ok(text.choices.some(r => r.includes('marketing on its own')));
  assert.ok(explainResults(result, 'trucks_only')!.reasons.some(r => r.startsWith('Sales do not increase')));
});
test('explanation handles unavailable value, improved cash and reversed recovery without claiming success', () => {
  const changed = structuredClone(result);
  changed.comparisons.trucks_only.incremental_exit_equity_value = null;
  changed.comparisons.trucks_only.monthly_deltas[60].values.cash_end = 10000;
  changed.scenarios.trucks_only.metrics.payback = { status: 'reached', month: 10, first_investment_month: 1, subsequent_reversal_month: 20 };
  const text = explainResults(changed, 'trucks_only')!;
  assert.match(text.cash, /\$10,000 more cash/);
  assert.match(text.value, /does not mean.*zero/);
  assert.ok(text.reasons.some(r => r.includes('later lost in month 20')));
  assert.equal(explainResults(result, 'baseline'), null);
});
