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

import { addPlan, addAction, editPlanAction, riskComparison, timelineValue, revenueWindows } from '../src/lib/dashboard/plans.ts';
test('independent plan edits preserve the original economics, pairing identity and provenance', () => {
  const copied = addPlan(request, 'my-plan', 'combined_expansion');
  const edited = editPlanAction(copied, 'my-plan', 'truck-01b', 'quantity', 4, 'my-trucks');
  DeterministicRequestSchema.parse(edited);
  assert.deepEqual(edited.scenarios.slice(0, 3), request.scenarios);
  const action = edited.scenarios[3].decisions[0];
  assert.equal(action.stable_investment_key, 'my-trucks');
  assert.equal(action.provenance['/quantity'].kind, 'user_input');
  assert.equal(action.provenance['/quantity'].unit, 'count');
  assert.equal(copied.scenarios[3].decisions[0].stable_investment_key, 'demo-trucks');
  assert.equal(request.scenarios.length, 3);
});
test('empty plans can compose all supported actions with valid unique identities', () => {
  let next = addPlan(request, 'custom');
  for (const type of ['increase_marketing', 'purchase_trucks', 'hire_technicians'] as const) next = addAction(next, 'custom', type, `custom-${type}`);
  DeterministicRequestSchema.parse(next);
  assert.equal(next.scenarios[3].decisions.length, 3);
  assert.equal(next.scenarios[3].decisions[0].provenance['/extra_spend_per_month'].kind, 'assumed');
  const subset = riskComparison(next, 'custom', 'combined_expansion');
  DeterministicRequestSchema.parse(subset);
  assert.deepEqual(subset.scenarios.map(s => s.id), ['baseline', 'combined_expansion', 'custom']);
  assert.equal(riskComparison(next, 'custom', 'deleted-plan').scenarios.length, 3);
  assert.deepEqual(riskComparison(request, 'combined_expansion', 'trucks_only'), request);
});
test('chart changes reconcile revenue uplift and return to baseline without replacing backend deltas', () => {
  const path = result.scenarios.combined_expansion;
  assert.equal(revenueWindows(result, 'combined_expansion'), '5–16');
  assert.equal(revenueWindows(result, 'trucks_only'), '');
  for (const month of [5, 12, 13, 16]) {
    assert.equal(timelineValue(path, 'revenue', month, result, true), result.comparisons.combined_expansion.monthly_deltas[month].values.revenue);
    assert.ok(timelineValue(path, 'revenue', month, result, true)! > 26000);
    const row = path.months[month];
    assert.equal(row.is_opening_state, false);
    if (row.is_opening_state) throw new Error('Expected forecast month');
    assert.equal(timelineValue(path, 'revenue', month, result, false), row.financials.revenue);
  }
  assert.equal(timelineValue(path, 'revenue', 17, result, true), 0);
  assert.equal(timelineValue(path, 'revenue', 0, result, true), null);
  assert.equal(timelineValue(result.scenarios.trucks_only, 'revenue', 5, result, true), 0);
});

test('custom expenses and assets compose into new plans and copied edits remain isolated', () => {
  let next = addPlan(request, 'custom-plan');
  next = addAction(next, 'custom-plan', 'operating_expense', 'subscription');
  next = addAction(next, 'custom-plan', 'purchase_asset', 'equipment');
  next = editPlanAction(next, 'custom-plan', 'subscription', 'duration_months', 12, 'unused');
  next = editPlanAction(next, 'custom-plan', 'subscription', 'name', 'Dispatch software', 'unused');
  const before = structuredClone(next);
  next = addPlan(next, 'custom-copy', 'custom-plan');
  next = editPlanAction(next, 'custom-copy', 'equipment', 'funding.debt_fraction', .5, 'copy-equipment');
  next = editPlanAction(next, 'custom-copy', 'subscription', 'name', 'Different subscription', 'copy-subscription');
  DeterministicRequestSchema.parse(next);
  assert.deepEqual(next.scenarios.slice(0, 4), before.scenarios);
  assert.equal(next.scenarios[4].decisions[0].stable_investment_key, 'copy-subscription');
  assert.equal(next.scenarios[4].decisions[0].provenance['/name'].kind, 'user_input');
  assert.equal(next.scenarios[4].decisions[1].stable_investment_key, 'copy-equipment');
  assert.equal(next.scenarios[4].decisions[1].provenance['/funding/debt_fraction'].unit, 'decimal_rate');
  const risk = riskComparison(next, 'custom-copy', 'custom-plan');
  DeterministicRequestSchema.parse(risk);
  assert.equal(risk.scenarios.length, 3);
});
