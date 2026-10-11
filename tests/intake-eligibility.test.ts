import test from 'node:test';
import assert from 'node:assert/strict';
import { ProfilePayloadSchema, type ProfilePayload } from '../src/lib/server/intake/schemas.ts';
import { assessIntake, decimalCents } from '../src/lib/server/intake/eligibility.ts';

const asOf = { as_of: '2026-12-31' };
const review = { actor_id: 'owner', reviewed_at: '2027-01-01T00:00:00Z', rationale: 'Synthetic test of reviewed inputs' };
function f(value: unknown, unit: string, period: unknown = asOf) {
  return { value, unit, state: value === null ? 'unknown' : 'confirmed', period, source_ids: value === null ? [] : ['source'], raw: null, derivation: null, review: value === null ? null : review };
}
function eligibleFixture(): ProfilePayload {
  return ProfilePayloadSchema.parse({
    profile_version: 'company-profile-2-draft',
    business: { name: f('Test business', 'text'), trade: f('HVAC', 'text'), currency: f('USD', 'text'), accounting_basis: f('accrual', 'text'), books_through: f('2026-12-31', 'ISO_date'), forecast_start: f('2027-01-01', 'ISO_date') },
    history: Array.from({ length: 12 }, (_, i) => {
      const period = `${2026}-${String(i + 1).padStart(2, '0')}`;
      const coverage = { start: `${period}-01`, end: `${period}-${new Date(Date.UTC(2026, i + 1, 0)).getUTCDate()}` };
      return { row_id: `h${i}`, period, service_jobs: f(400, 'jobs/month', coverage),
        ...Object.fromEntries(Object.entries({ service_revenue: 70000, other_revenue: 0, revenue: 70000, tech_direct_labor: 20000, vehicle_direct_opex: 2000, service_variable_cost: 7000, other_direct_cost: 0, cogs: 29000, operating_overhead: 10000, ebitda: 31000 }).map(([key, value]) => [key, f(value, 'USD/month', coverage)])),
        reported_profit: f(null, 'USD/month', coverage), reported_profit_basis: f(null, 'text', coverage) };
    }),
    opening: { cash: f(-100, 'USD'), accounts_receivable: f(70000, 'USD'), inventory: f(0, 'USD'), accounts_payable: f(3500, 'USD'), debt_declaration: f('none', 'text'), asset_declaration: f('none', 'text'), loans: [], assets: [] },
    operations: {
      job_definition: f('One repair', 'text'), pooling_suitable: f(true, 'boolean'), service_technicians_employed: f(10, 'people'), service_vehicles_available: f(8, 'vehicles'),
      working_days_per_month: f(20, 'days/month'), jobs_per_technician_day: f(3, 'jobs/person/day'), jobs_per_vehicle_day: f(3, 'jobs/vehicle/day'),
      forecast_ticket: f(175, 'USD/job'), base_monthly_demand: f(600, 'jobs/month'), loaded_technician_cost: f(24000, 'USD/person/year'), fleet_operating_cost: f(3000, 'USD/vehicle/year'),
      ...Object.fromEntries(Object.entries({ non_service_revenue_per_month: 0, non_service_direct_cost_per_month: 0, fixed_overhead_per_month: 10000, baseline_marketing_in_overhead: 2000 }).map(([key, value]) => [key, f(value, 'USD/month')])),
      service_variable_cost_rate: f(0.1, 'fraction'),
      service_mix: f([{ row_id: 'mix', trade: 'HVAC', service_kind: 'repair', description: 'Repairs', comparable_job_definition: 'One repair', pool_id: 'pool', historical_row_ids: Array.from({ length: 12 }, (_, i) => `h${i}`), completed_jobs: 4800, service_revenue_usd: 840000, source_ids: ['source'] }], 'record_list'),
      workforce_availability: f({ declaration: 'none', constraints: [] }, 'record'),
      demand_evidence: f({ kind: 'measured', observations: [{ row_id: 'demand', period: '2026-12', requested_jobs: 600, unserved_jobs: 120, service_mix_row_ids: ['mix'], source_ids: ['source'] }] }, 'record'),
    },
    assumptions: {
      ...Object.fromEntries(['organic_demand_growth', 'wage_inflation', 'overhead_inflation', 'ticket_growth', 'other_revenue_growth', 'other_direct_cost_growth'].map(key => [key, f(0, 'annual_fraction')])),
      collection_delay_months: f(1, 'months'), payment_delay_months: f(0.5, 'months'), truck_useful_life_months: f(60, 'months'),
      ap_eligible_cost_categories: f(['service_variable_cost', 'other_direct_cost'], 'category_list'), constant_inventory: f(0, 'USD'), liquidity_floor: f(1000, 'USD'), existing_depreciation_per_year: f(0, 'USD/year'), maintenance_capex_per_year: f(0, 'USD/year'), tax_rate: f(0.25, 'fraction'), valuation_multiple: f(4, 'dimensionless'), seasonality: Array.from({ length: 12 }, () => f(1, 'dimensionless')), risk_configuration: f(null, 'record'),
    },
    sources: [{ source_id: 'source', kind: 'manual_statement', title: 'Synthetic acceptance records', period: asOf, locator: null }], reconciliations: [], reviews: [], expense_ledger: [],
  });
}
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
