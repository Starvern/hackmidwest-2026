import test from 'node:test';
import assert from 'node:assert/strict';
import { ProfilePayloadSchema, type ProfilePayload } from '../src/lib/server/intake/schemas.ts';
import { assessIntake, decimalCents } from '../src/lib/server/intake/eligibility.ts';

import { eligibleFixture, f } from './intake-fixture.ts';

function codes(p: ProfilePayload) { return assessIntake(p).issues.filter(i => i.severity === 'blocking').map(i => i.code); }
test('fully reviewed supported inputs pass preflight without granting execution or demo risk', () => {
  const report = assessIntake(eligibleFixture());
  assert.deepEqual(report.issues, []);
  assert.equal(report.input_eligible, true);
  assert.equal(report.execution_available, false);
  assert.equal(report.monte_carlo_eligible, false);
  assert.equal(report.historical_tickets[0].value, 175);
});
test('preflight never mutates input; bottleneck demand stays distinct from completed history', () => {
  const p = eligibleFixture(), before = structuredClone(p);
  assessIntake(p);
  assert.deepEqual(p, before);
  assert.equal(p.operations.base_monthly_demand.value, 600);
  assert.equal(p.history[0].service_jobs.value, 400);
  const demand = p.operations.demand_evidence.value;
  if (demand?.kind !== 'measured') throw new Error('Expected measured evidence');
  demand.observations[0].unserved_jobs = 601;
  assert.ok(codes(p).includes('SOURCE_CONFLICT'));
});
test('actual years, monthly coverage and opening dates must agree', () => {
  const p = eligibleFixture();
  p.history[1].period = '2026-01';
  p.opening.cash.period = { as_of: '2026-06-30' };
  p.business.forecast_start.value = '2027-02-01';
  assert.ok(codes(p).includes('HISTORY_GAP'));
  assert.ok(codes(p).includes('AS_OF_MISMATCH'));
  assert.ok(codes(p).includes('UNSUPPORTED_DATE'));
});
test('unknown cannot substitute for zero; incompatible workforce/trade and unnormalized seasonality block', () => {
  const p = eligibleFixture();
  p.operations.fleet_operating_cost = ProfilePayloadSchema.shape.operations.shape.fleet_operating_cost.parse(f(null, 'USD/vehicle/year'));
  p.business.trade.value = 'plumbing';
  p.operations.workforce_availability.value = { declaration: 'unknown', constraints: [] };
  p.assumptions.seasonality.forEach(field => { field.value = 0; });
  assert.ok(codes(p).includes('REQUIRED_UNKNOWN'));
  assert.ok(codes(p).includes('UNSUPPORTED_INDUSTRY'));
  assert.ok(codes(p).includes('UNSUPPORTED_WORKFORCE'));
  assert.ok(codes(p).includes('INVALID_SEASONALITY'));
  const valid = eligibleFixture();
  valid.assumptions.seasonality.forEach((field, i) => { field.value = i < 6 ? 0.5 : 1.5; });
  assert.equal(assessIntake(valid).input_eligible, true);
});
test('source cents compare exactly, not using engine tolerance; arithmetic conflicts invalidate tickets', () => {
  assert.equal(decimalCents('1.20'), 120n);
  assert.equal(decimalCents('-0.01'), -1n);
  assert.equal(decimalCents('1.001'), null);
  const p = eligibleFixture();
  p.history[0].revenue.value! += 0.01;
  assert.ok(codes(p).includes('SOURCE_CONFLICT'));
  assert.equal(assessIntake(p).historical_tickets[0].reason, 'source_conflict');
  const cents = eligibleFixture();
  cents.history[0].revenue.raw = { text: '70000.01', unit: 'USD', precision: '0.01' };
  assert.ok(codes(cents).includes('SOURCE_CONFLICT'));
});
test('debt must retire in its stated term and assets reconcile without duplicate depreciation', () => {
  const p = eligibleFixture();
  p.opening.debt_declaration.value = 'itemized';
  p.opening.loans = [{ row_id: 'loan', lender: f('Bank', 'text'), name: f('Loan', 'text'), amortization_policy: f('level_principal', 'text'), terms_source: f('source', 'text'), outstanding_principal: f(250, 'USD'), monthly_principal: f(100, 'USD'), annual_rate: f(0.08, 'annual_fraction'), remaining_term: f(3, 'months'), next_payment_date: f('2027-01-15', 'ISO_date') }].map(row => ProfilePayloadSchema.shape.opening.shape.loans.element.parse(row));
  assert.equal(assessIntake(p).input_eligible, true);
  p.opening.loans[0].remaining_term.value = 4;
  assert.ok(codes(p).includes('UNSUPPORTED_DEBT'));
  p.opening.loans[0].remaining_term.value = 3;
  p.opening.asset_declaration.value = 'itemized';
  p.opening.assets = [ProfilePayloadSchema.shape.opening.shape.assets.element.parse({ row_id: 'asset', name: f('Equipment', 'text'), cost_basis: f(1000, 'USD'), accumulated_depreciation: f(400, 'USD'), monthly_depreciation: f(100, 'USD/month'), remaining_life: f(6, 'months'), service_date: f('2025-01-01', 'ISO_date') })];
  p.assumptions.existing_depreciation_per_year.value = 1200;
  assert.equal(assessIntake(p).input_eligible, true);
  p.opening.assets[0].remaining_life.value = 7;
  assert.ok(codes(p).includes('ASSET_SCHEDULE_CONFLICT'));
});
test('included details do not add to overhead; mismatched replacement and irregular cash block', () => {
  const p = eligibleFixture();
  p.expense_ledger = [ProfilePayloadSchema.shape.expense_ledger.element.parse({ row_id: 'expense', name: f('Subscription', 'text'), category: f('overhead', 'text'), source_period: f('2026', 'text'), currency: f('USD', 'text'), frequency: f('monthly', 'text'), target_bucket: f('fixed_overhead_per_month', 'text'), mapping_mode: f('included_detail', 'text'), allocation_rule: f('Included in overhead', 'text'), raw_amount: f(1000, 'USD'), normalized_recognition_amount: f(1000, 'USD/month'), coverage_start: f('2026-01-01', 'ISO_date'), coverage_end: f('2026-12-31', 'ISO_date'), irregular_payment: f(false, 'boolean') })];
  assert.equal(assessIntake(p).input_eligible, true);
  assert.equal(p.operations.fixed_overhead_per_month.value, 10000);
  p.expense_ledger[0].mapping_mode.value = 'replace_total';
  assert.ok(codes(p).includes('DUPLICATE_COST_MAPPING'));
  p.expense_ledger[0].normalized_recognition_amount.value = 10000;
  assert.equal(assessIntake(p).input_eligible, true);
  p.expense_ledger[0].irregular_payment.value = true;
  assert.ok(codes(p).includes('IRREGULAR_BASELINE_CASH'));
});
