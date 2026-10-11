import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { addFlexibleDecision, editDecision, removeDecision } from '../src/lib/dashboard/model.ts';
import { CompanyInputSchema, DeterministicRequestSchema, DecisionSchema, APPROVED_POLICIES } from '../src/lib/server/schemas.ts';
import { fingerprintRequest } from '../src/lib/server/fingerprint.ts';
import { simulate_deterministic } from '../src/lib/server/engine/scenarios.ts';
import type { ForecastRecord } from '../contracts/contracts.ts';
const load = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const company = CompanyInputSchema.parse(load('../data/synthetic_hvac_company.json'));
const original = DeterministicRequestSchema.parse(load('../contracts/example-request.json'));
const empty = { ...original, scenarios: original.scenarios.map(s => ({ ...s, decisions: [] })) };
const baseline = simulate_deterministic(company, empty);
const row = (result: ReturnType<typeof simulate_deterministic>, month: number) => result.scenarios.combined_expansion.months[month] as ForecastRecord;
function edit(request: typeof original, id: string, values: Record<string, number | string>) {
  for (const [field, value] of Object.entries(values)) request = editDecision(request, id, field, value);
  return DeterministicRequestSchema.parse(request);
}

test('custom recurring overhead affects only scheduled EBITDA/tax/cash, not revenue or working capital', () => {
  const request = edit(addFlexibleDecision(empty, 'combined_expansion', 'operating_expense', 'expense'), 'expense',
    { name: 'Software subscription', start_month: 2, amount_per_month: 1000, duration_months: 3 });
  const snapshot = structuredClone(request);
  const result = simulate_deterministic(company, request);
  for (let month = 1; month <= 60; month++) {
    const a = row(result, month), b = row(baseline, month), charged = month >= 2 && month <= 4;
    assert.deepEqual(a.operations, b.operations);
    assert.equal(a.financials.revenue, b.financials.revenue);
    assert.equal(a.financials.ebitda - b.financials.ebitda, charged ? -1000 : 0);
    assert.equal(a.financials.custom_operating_expenses, charged ? 1000 : undefined);
    assert.equal(a.financials.nwc_end, b.financials.nwc_end);
    assert.ok(Math.abs(a.financials.cash_end - b.financials.cash_end + 750 * Math.max(0, Math.min(3, month - 1))) < 1e-6);
  }
  assert.equal(result.scenarios.combined_expansion.metrics.payback.first_investment_month, 2);
  assert.equal(result.scenarios.combined_expansion.metrics.payback.status, 'not_reached');
  assert.deepEqual(request, snapshot);
});

test('one-time expenses and negative income preserve tax floor; zero-cost decisions stay no-outlay', () => {
  let request = addFlexibleDecision(empty, 'combined_expansion', 'operating_expense', 'one-time');
  request = edit(request, 'one-time', { amount_per_month: 1000000 });
  const result = simulate_deterministic(company, request);
  assert.equal(row(result, 1).financials.cash_taxes, 0);
  assert.equal(row(result, 2).financials.custom_operating_expenses, undefined);
  const zero = simulate_deterministic(company, edit(request, 'one-time', { amount_per_month: 0 }));
  assert.deepEqual(zero.scenarios.combined_expansion.months, baseline.scenarios.combined_expansion.months);
  assert.equal(zero.scenarios.combined_expansion.metrics.payback.status, 'not_applicable');
});

test('generic asset borrows once, repays next month, depreciates over explicit service life and never creates jobs', () => {
  const request = edit(addFlexibleDecision(empty, 'combined_expansion', 'purchase_asset', 'asset'), 'asset', {
    name: 'Diagnostic equipment', purchase_cost: 6000, in_service_delay_months: 2,
    useful_life_months: 2, monthly_operating_cost: 100,
    'funding.debt_fraction': .5, 'funding.annual_interest_rate': .12, 'funding.term_months': 3,
  });
  const result = simulate_deterministic(company, request);
  for (let month = 1; month <= 60; month++) {
    const a = row(result, month), b = row(baseline, month);
    assert.deepEqual(a.operations, b.operations);
    assert.equal(a.financials.growth_capex, month === 1 ? 6000 : 0);
    assert.equal(a.financials.new_borrowings, month === 1 ? 3000 : 0);
    assert.ok(Math.abs(a.financials.depreciation - b.financials.depreciation - (month === 3 || month === 4 ? 3000 : 0)) < 1e-7);
    assert.equal(a.financials.ebitda - b.financials.ebitda, month >= 3 ? -100 : 0);
    assert.equal(a.financials.debt_principal - b.financials.debt_principal, month >= 2 && month <= 4 ? 1000 : 0);
    assert.ok(Math.abs(a.financials.cash_interest - b.financials.cash_interest - (month >= 2 && month <= 4 ? (5 - month) * 10 : 0)) < 1e-7);
  }
  assert.equal(row(result, 1).financials.cash_end - row(baseline, 1).financials.cash_end, -3000);
  const delayed = simulate_deterministic(company, edit(request, 'asset', { in_service_delay_months: 100 }));
  for (let month = 1; month <= 60; month++) {
    assert.equal(row(delayed, month).financials.depreciation, row(baseline, month).financials.depreciation);
    assert.equal(row(delayed, month).financials.custom_operating_expenses, undefined);
  }
});

test('candidate schemas, provenance, presentation hashes, editor removal and old reference compatibility', () => {
  const request = addFlexibleDecision(empty, 'combined_expansion', 'purchase_asset', 'asset');
  const decision = request.scenarios[2].decisions[0];
  DecisionSchema.parse(decision);
  assert.equal(DecisionSchema.safeParse({ ...decision, useful_life_months: 0 }).success, false);
  assert.equal(DecisionSchema.safeParse({ ...decision, decision_version: 'unknown' }).success, false);
  assert.equal(DecisionSchema.safeParse({ ...decision, provenance: {} }).success, false);
  assert.equal(fingerprintRequest(company, request, APPROVED_POLICIES), fingerprintRequest(company, edit(request, 'asset', { name: 'Renamed' }), APPROVED_POLICIES));
  assert.notEqual(fingerprintRequest(company, request, APPROVED_POLICIES), fingerprintRequest(company, edit(request, 'asset', { purchase_cost: 11000 }), APPROVED_POLICIES));
  assert.deepEqual(removeDecision(request, 'combined_expansion', 'asset'), empty);
  assert.throws(() => addFlexibleDecision(request, 'baseline', 'operating_expense', 'bad'));
  assert.throws(() => addFlexibleDecision(request, 'combined_expansion', 'purchase_asset', 'asset'));
  const reference = load('../contracts/example-result.json');
  const actual = simulate_deterministic(company, original);
  assert.equal(actual.input_fingerprint, reference.input_fingerprint);
  assert.deepEqual(actual.scenarios, reference.scenarios);
});
