import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { DeterministicRequestSchema, SimulationResultSchema } from '../src/lib/server/schemas.ts';
import { editDecision, fieldValue, metricValue, formatValue, paybackLabel } from '../src/lib/dashboard/model.ts';
const load = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const request = DeterministicRequestSchema.parse(load('../contracts/example-request.json'));
const result = SimulationResultSchema.parse(load('../contracts/example-result.json'));

test('dashboard projects opening/null values and backend monthly fields without financial formulas', () => {
  const path = result.scenarios.baseline;
  assert.equal(metricValue(path.months[0], 'cash_end'), 400000);
  for (const metric of ['ebitda', 'revenue', 'utilization', 'equity_value'] as const) assert.equal(metricValue(path.months[0], metric), null);
  const row = path.months[1];
  assert.equal(row.is_opening_state, false);
  if (row.is_opening_state) throw new Error('Expected forecast');
  assert.equal(metricValue(row, 'ebitda'), row.financials.ebitda);
  assert.equal(metricValue(row, 'utilization'), 0.75);
  assert.equal(formatValue(null), 'Unavailable');
  assert.equal(formatValue(0), '$0');
  assert.equal(paybackLabel(path.metrics.payback), 'Not applicable');
  assert.equal(paybackLabel(result.scenarios.trucks_only.metrics.payback), 'Not reached in 60 months');
});

test('decision edits preserve paired economic actions, provenance units and input immutability', () => {
  const before = JSON.stringify(request);
  const edited = editDecision(request, 'demo-trucks', 'funding.debt_fraction', 0.75);
  DeterministicRequestSchema.parse(edited);
  for (const scenario of edited.scenarios.filter(s => s.id !== 'baseline')) {
    const truck = scenario.decisions.find(d => d.type === 'purchase_trucks')!;
    assert.equal(fieldValue(truck, 'funding.debt_fraction'), 0.75);
    assert.equal(truck.provenance['/funding/debt_fraction'].kind, 'user_input');
    assert.equal(truck.provenance['/funding/debt_fraction'].unit, 'decimal_rate');
  }
  assert.deepEqual(edited.scenarios[2].decisions.slice(1), request.scenarios[2].decisions.slice(1));
  assert.equal(JSON.stringify(request), before);
});
