import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { ForecastRecord } from '../contracts/contracts.ts';
import { CompanyInputSchema, DeterministicRequestSchema, EngineStateSchema, MonthEventsSchema, OperationsResultSchema, NEUTRAL_MARKET_FACTORS } from '../src/lib/server/schemas.ts';
import { calculate_financials } from '../src/lib/server/engine/financials.ts';
import { calculate_valuation } from '../src/lib/server/engine/valuation.ts';
import { simulate_deterministic, simulate_months } from '../src/lib/server/engine/scenarios.ts';

const load = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const company = CompanyInputSchema.parse(load('../data/synthetic_hvac_company.json'));
const request = DeterministicRequestSchema.parse(load('../contracts/example-request.json'));
const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
const reference = simulate_deterministic(company, request, 'integration-test');

test('shared milestone: actual P2 month-1 handoff reconciles accounting, state and valuation', () => {
  const input = load('../data/example-month-1.json');
  const prior = EngineStateSchema.parse(input.prior_state);
  const events = MonthEventsSchema.parse(input.month_events);
  const operations = OperationsResultSchema.parse(input.operations);
  const step = calculate_financials(company, prior, operations, events);
  close(step.financials.ebitda, 62500); close(step.financials.depreciation, 113750 / 9);
  close(step.financials.cash_end, 7482625 / 18); close(step.financials.debt_end, 1180000);
  const ending = { month: 1, financial: step.ending_financial_state, operational: events.ending_operational_state };
  const valuation = calculate_valuation(company, [step.financials], ending);
  close(valuation.ttm_ebitda, 750000); close(valuation.enterprise_value!, 4500000);
  close(valuation.equity_value!, 67242625 / 18);
  const actual = reference.scenarios.baseline.months[1] as ForecastRecord;
  assert.deepEqual(actual.financials, step.financials); assert.deepEqual(actual.valuation, valuation);
});

test('real runner produces complete 61-state paths, invariant accounting and decision events', () => {
  for (const path of Object.values(reference.scenarios)) {
    assert.equal(path.months.length, 61);
    assert.deepEqual(path.months[0].events, []); assert.equal(path.months[0].valuation, null);
    for (const row of path.months.slice(1) as ForecastRecord[]) {
      assert.equal(row.financials.owner_distributions, 0);
      assert.ok(row.operations.completed_jobs <= row.operations.service_capacity_jobs);
      close(row.financials.cash_end, path.months[row.month - 1].financials.cash_end + row.financials.cash_change);
      close(row.financials.debt_end, path.months[row.month - 1].financials.debt_end + row.financials.new_borrowings - row.financials.debt_principal);
      assert.ok(row.events.every(e => e.month === row.month));
    }
  }
  const truck = reference.scenarios.trucks_only.months[1] as ForecastRecord;
  assert.equal(truck.financials.growth_capex, 120000); assert.equal(truck.financials.new_borrowings, 60000);
  close(truck.financials.cash_end - reference.scenarios.baseline.months[1].financials.cash_end, -60000);
  assert.ok(truck.events.some(e => e.kind === 'truck_purchase'));
  const activated = reference.scenarios.trucks_only.months[2] as ForecastRecord;
  assert.equal(activated.operations.in_service_vehicles, 14);
  assert.ok(activated.events.some(e => e.kind === 'truck_in_service'));
});

test('SCN-02: trucks do not create jobs by themselves; combined actions recompute constrained operations', () => {
  for (let month = 1; month <= 60; month++) {
    const base = reference.scenarios.baseline.months[month] as ForecastRecord;
    const trucks = reference.scenarios.trucks_only.months[month] as ForecastRecord;
    close(trucks.operations.completed_jobs, base.operations.completed_jobs);
    close(trucks.operations.technician_capacity_jobs, base.operations.technician_capacity_jobs);
  }
  const combined = reference.scenarios.combined_expansion.months[5] as ForecastRecord;
  assert.ok(combined.operations.completed_jobs > (reference.scenarios.baseline.months[5] as ForecastRecord).operations.completed_jobs);
  assert.equal(reference.comparisons.trucks_only.payback.status, 'not_reached');
  assert.equal(reference.comparisons.trucks_only.payback.first_investment_month, 1);
});

test('SCN-01/03/04: empty decisions equal baseline; order changes and control edits isolate inputs/paths', () => {
  const before = structuredClone({ company, request });
  const reordered = structuredClone(request);
  reordered.scenarios.reverse(); reordered.scenarios.forEach(s => s.decisions.reverse());
  assert.deepEqual(simulate_deterministic(company, reordered, 'integration-test'), reference);
  assert.deepEqual({ company, request }, before);
  const empty = structuredClone(request); empty.scenarios[2].decisions = [];
  const emptyResult = simulate_deterministic(company, empty, 'empty-test');
  assert.deepEqual(emptyResult.scenarios.combined_expansion.months, emptyResult.scenarios.baseline.months);
  assert.equal(emptyResult.comparisons.combined_expansion.payback.status, 'not_applicable');
  const edited = structuredClone(request);
  const hire = edited.scenarios[2].decisions.find(d => d.type === 'hire_technicians')!;
  if (hire.type === 'hire_technicians') hire.quantity = 3;
  const changed = simulate_deterministic(company, edited, 'edited-test');
  assert.deepEqual(changed.scenarios.baseline, reference.scenarios.baseline);
  assert.deepEqual(changed.scenarios.trucks_only, reference.scenarios.trucks_only);
});

test('request reserve and exit multiple drive actual metrics, valuation and resolved provenance', () => {
  const changed = structuredClone(request); changed.reserve_floor_usd = 500000; changed.exit_multiple = 8;
  const result = simulate_deterministic(company, changed, 'settings-test');
  const exit = result.scenarios.baseline.months[60] as ForecastRecord;
  close(exit.valuation.enterprise_value!, exit.valuation.ttm_ebitda * 8);
  assert.equal(result.assumptions.resolved.valuation_multiple, 8);
  assert.equal(result.assumptions.provenance['/global_assumptions/valuation_multiple'].kind, 'user_input');
  assert.ok(result.warnings.some(w => w.code === 'reserve_breach' && w.month === 0));
  assert.equal(result.scenarios.baseline.metrics.reserve_breach_months.includes(0), false);
  assert.deepEqual(result.scenarios.baseline.months[0].events, []);
});

test('loss scenarios preserve unavailable valuation, negative cash and zero taxes without funding plugs', () => {
  const lossCompany = structuredClone(company); lossCompany.operations.fixed_overhead_per_month = 1000000;
  const result = simulate_deterministic(lossCompany, request, 'loss-test');
  assert.equal(result.scenarios.baseline.metrics.exit_equity_value, null);
  assert.equal(result.comparisons.trucks_only.incremental_exit_equity_value, null);
  assert.ok(result.warnings.some(w => w.code === 'negative_cash'));
  const exit = result.scenarios.baseline.months[60] as ForecastRecord;
  assert.equal(exit.financials.new_borrowings, 0); assert.equal(exit.financials.cash_taxes, 0);
});

test('single-path runner uses actual scheduler and enforces explicit 60-month resolved inputs', () => {
  const scenario = request.scenarios[1];
  const inputs = { scenario: { id: scenario.id, name: scenario.name },
    monthly_market_factors: Array.from({ length: 60 }, () => NEUTRAL_MARKET_FACTORS),
    path_risks: { by_stable_investment_key: {} }, input_fingerprint: reference.scenarios.trucks_only.metadata.input_fingerprint, seed: null };
  const path = simulate_months(company, scenario.decisions, inputs);
  assert.deepEqual(path, reference.scenarios.trucks_only);
  assert.throws(() => simulate_months(company, scenario.decisions, inputs, 12));
  assert.throws(() => simulate_months(company, scenario.decisions, { ...inputs, monthly_market_factors: [] }));
});

test('month-60 investment costs remain when truck/hire/marketing benefits fall beyond horizon', () => {
  const late = structuredClone(request);
  for (const scenario of late.scenarios) for (const d of scenario.decisions) d.start_month = 60;
  const result = simulate_deterministic(company, late, 'late-test');
  const base = result.scenarios.baseline.months[60] as ForecastRecord;
  const trucks = result.scenarios.trucks_only.months[60] as ForecastRecord;
  close(trucks.financials.cash_end - base.financials.cash_end, -60000);
  close(trucks.financials.cash_interest, base.financials.cash_interest);
  close(trucks.financials.depreciation, base.financials.depreciation);
  close(trucks.operations.completed_jobs, base.operations.completed_jobs);
  assert.equal(result.comparisons.trucks_only.payback.first_investment_month, 60);
  const combined = result.scenarios.combined_expansion.months[60] as ForecastRecord;
  assert.equal(combined.financials.recruitment, 6000);
  assert.equal(combined.financials.incremental_marketing, 4000);
  close(combined.financials.tech_direct_labor, base.financials.tech_direct_labor);
  close(combined.operations.completed_jobs, base.operations.completed_jobs);
});
