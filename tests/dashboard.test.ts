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

import { createPlanningRequest, addPlan, addAction, editPlanAction, riskComparison, timelineValue, revenueWindows } from '../src/lib/dashboard/plans.ts';
test('workspace starts with blank customizable Plan A and Plan B, preserving company settings', () => {
  const initial = createPlanningRequest(request.company_id, request.reserve_floor_usd, request.exit_multiple);
  DeterministicRequestSchema.parse(initial);
  assert.equal(initial.company_id, request.company_id);
  assert.equal(initial.reserve_floor_usd, request.reserve_floor_usd);
  assert.equal(initial.exit_multiple, request.exit_multiple);
  assert.deepEqual(initial.scenarios.map(s => s.name), ['Do nothing new', 'Plan A', 'Plan B']);
  assert.ok(initial.scenarios.every(s => s.decisions.length === 0));
  const edited = addAction(initial, 'plan_a', 'operating_expense', 'software');
  edited.scenarios[1].name = 'Dispatch software';
  DeterministicRequestSchema.parse(edited);
  assert.equal(edited.scenarios[1].decisions.length, 1);
  assert.deepEqual(edited.scenarios[2], initial.scenarios[2]);
  assert.deepEqual(initial, createPlanningRequest(request.company_id, request.reserve_floor_usd, request.exit_multiple));
});
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
  assert.equal(next.scenarios[4].decisions[0].stable_investment_key, 'subscription');
  assert.equal(next.scenarios[4].decisions[0].provenance['/name'].kind, 'user_input');
  assert.equal(next.scenarios[4].decisions[1].stable_investment_key, 'copy-equipment');
  assert.equal(next.scenarios[4].decisions[1].provenance['/funding/debt_fraction'].unit, 'decimal_rate');
  const risk = riskComparison(next, 'custom-copy', 'custom-plan');
  DeterministicRequestSchema.parse(risk);
  assert.equal(risk.scenarios.length, 3);
});

import { sample_action_risks } from '../src/lib/server/engine/monte_carlo.ts';
import { loadMonteCarloConfig } from '../src/lib/server/monte-carlo/config.ts';
import { CompanyInputSchema, APPROVED_POLICIES } from '../src/lib/server/schemas.ts';
import { fingerprintRequest } from '../src/lib/server/fingerprint.ts';
test('copied operational action labels retain economic fingerprints and paired risk draws', () => {
  const copied = addPlan(request, 'operational-copy', 'combined_expansion');
  const company = CompanyInputSchema.parse(load('../data/synthetic_hvac_company.json'));
  let edited = copied;
  for (const action of copied.scenarios[3].decisions) {
    edited = editPlanAction(edited, 'operational-copy', action.id, 'name', `My ${action.type}`, 'must-not-detach');
  }
  DeterministicRequestSchema.parse(edited);
  assert.deepEqual(edited.scenarios.slice(0, 3), request.scenarios);
  assert.equal(fingerprintRequest(company, edited, APPROVED_POLICIES), fingerprintRequest(company, copied, APPROVED_POLICIES));
  const config = loadMonteCarloConfig();
  for (let run = 0; run < 20; run++) assert.deepEqual(
    sample_action_risks(config, 42, run, edited.scenarios[3].decisions),
    sample_action_risks(config, 42, run, copied.scenarios[3].decisions));
  for (let i = 0; i < 3; i++) {
    assert.equal(edited.scenarios[3].decisions[i].stable_investment_key, copied.scenarios[3].decisions[i].stable_investment_key);
    assert.equal(edited.scenarios[3].decisions[i].provenance['/name'].kind, 'user_input');
    assert.equal(copied.scenarios[3].decisions[i].name, undefined);
  }
  const economic = editPlanAction(edited, 'operational-copy', 'truck-01b', 'quantity', 4, 'different-trucks');
  DeterministicRequestSchema.parse(economic);
  assert.equal(economic.scenarios[3].decisions[0].stable_investment_key, 'different-trucks');
  assert.notEqual(fingerprintRequest(company, economic, APPROVED_POLICIES), fingerprintRequest(company, edited, APPROVED_POLICIES));
  const conflict = structuredClone(edited);
  const truck = conflict.scenarios[3].decisions[0];
  if (truck.type === 'purchase_trucks') truck.quantity = 4;
  assert.equal(DeterministicRequestSchema.safeParse(conflict).success, false);
});
