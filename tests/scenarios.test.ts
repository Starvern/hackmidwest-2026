import assert from 'node:assert/strict';
import test from 'node:test';
import type { ScenarioPath, OpeningRecord, ForecastRecord } from '../contracts/contracts.ts';
import { calculate_payback, calculate_path_metrics, compare_paths } from '../src/lib/server/engine/scenarios.ts';
import { calculate_financials } from '../src/lib/server/engine/financials.ts';
import { calculate_valuation } from '../src/lib/server/engine/valuation.ts';
import { financialFixture } from './financial-fixture.ts';

test('investment gating, first recovery, subsequent reversal and no-outlay semantics', () => {
  assert.deepEqual(calculate_payback([0, 0, -100, 60, 50, -20], [0, 0, 100, 0, 0, 0]), {
    status: 'reached', month: 5, first_investment_month: 3, subsequent_reversal_month: 6,
  });
  assert.equal(calculate_payback([-100, 40, 40], [100, 0, 0]).status, 'not_reached');
  assert.equal(calculate_payback([0, 0, 0], [0, 0, 0]).status, 'not_applicable');
  assert.equal(calculate_payback([10], [100]).status, 'reached'); // real costs already included in net UFCF
  assert.equal(calculate_payback([-100, 100 - 5e-7], [100, 0]).status, 'reached');
  assert.equal(calculate_payback([-100, 100 - 2e-6], [100, 0]).status, 'not_reached');
  assert.throws(() => calculate_payback([NaN], [1]));
  assert.throws(() => calculate_payback([1], [-1]));
  assert.throws(() => calculate_payback([1], []));
});

/** Flat, hand-constructed operational inputs for module integration only; no scheduler claim. */
function path(id = 'baseline'): ScenarioPath {
  const x = financialFixture();
  const opening: OpeningRecord = { month: 0, is_opening_state: true, operations: null, valuation: null, events: [],
    financials: { cash_end: 400000, debt_end: 1200000, accounts_receivable_end: x.prior.financial.accounts_receivable,
      inventory_end: 50000, accounts_payable_end: x.prior.financial.accounts_payable } };
  const months: [OpeningRecord, ...ForecastRecord[]] = [opening];
  const history: { ebitda: number }[] = [];
  let state = x.prior;
  for (let month = 1; month <= 60; month++) {
    x.events.month = month;
    const step = calculate_financials(x.company, state, x.operations, x.events);
    history.push(step.financials);
    state = { ...state, month, financial: step.ending_financial_state };
    months.push({ month, is_opening_state: false, financials: step.financials, operations: structuredClone(x.operations),
      valuation: calculate_valuation(x.company, history, state), events: [] });
  }
  const payback = calculate_payback([], []);
  return { metadata: { scenario_id: id, name: id, model_version: 'mvp-1.0', input_fingerprint: 'a'.repeat(64), seed: null },
    months, metrics: calculate_path_metrics(months, 150000, payback) };
}

test('SCN-01: identical paths have all-month zero deltas and no investment payback', () => {
  const baseline = path(); const scenario = structuredClone(baseline);
  scenario.metadata = { ...scenario.metadata, scenario_id: 'empty' };
  const original = structuredClone({ baseline, scenario });
  const result = compare_paths(baseline, scenario);
  assert.equal(result.monthly_deltas.length, 61); assert.equal(result.payback.status, 'not_applicable');
  assert.equal(result.incremental_exit_equity_value, 0);
  for (const row of result.monthly_deltas) {
    assert.ok(Object.values(row.values).every(value => value === 0 || (row.month === 0 && value === null)));
    assert.equal(row.cumulative_incremental_unlevered_fcf, 0);
  }
  assert.deepEqual({ baseline, scenario }, original);
});

test('financing cannot manufacture project payback; unavailable exit deltas stay null', () => {
  const baseline = path(); const scenario = structuredClone(baseline);
  scenario.metadata = { ...scenario.metadata, scenario_id: 'investment' };
  const first = scenario.months[1] as ForecastRecord;
  first.financials.growth_capex = 60000; first.financials.new_borrowings = 60000;
  first.financials.unlevered_fcf -= 60000;
  scenario.metrics.payback = calculate_payback([-60000, ...Array(59).fill(0)], [60000, ...Array(59).fill(0)]);
  const exit = scenario.months[60] as ForecastRecord;
  exit.valuation = { status: 'nonpositive_ttm_ebitda', ttm_ebitda: 0, enterprise_multiple: 6, enterprise_value: null, equity_value: null };
  const result = compare_paths(baseline, scenario);
  assert.equal(result.payback.status, 'not_reached');
  assert.equal(result.monthly_deltas[60].cumulative_incremental_unlevered_fcf, -60000);
  assert.equal(result.incremental_exit_equity_value, null);
});

test('stock milestones use earliest tie including opening; reserve equality is not a breach', () => {
  const p = path();
  p.months.forEach(row => { row.financials.cash_end = 150000; row.financials.debt_end = 1200000; });
  let metrics = calculate_path_metrics(p.months, 150000, calculate_payback([], []));
  assert.equal(metrics.cash_trough_month, 0); assert.equal(metrics.debt_peak_month, 0);
  assert.deepEqual(metrics.reserve_breach_months, []);
  p.months[3].financials.cash_end = 149999; p.months[4].financials.cash_end = 149999;
  metrics = calculate_path_metrics(p.months, 150000, calculate_payback([], []));
  assert.equal(metrics.cash_trough_month, 3); assert.deepEqual(metrics.reserve_breach_months, [3, 4]);
});
