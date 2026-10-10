import assert from 'node:assert/strict';
import test from 'node:test';
import { calculate_financials as calculate } from '../src/lib/server/engine/financials.ts';
import { assertFinancials, ModelInvariantError } from '../src/lib/server/engine/invariants.ts';
import { financialFixture, addTruck } from './financial-fixture.ts';

const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);

test('FIN-01/07: reference month includes spend-month maintenance depreciation and reconciles', () => {
  const x = financialFixture();
  const before = structuredClone(x);
  const { financials: f, ending_financial_state: ending } = calculate(x.company, x.prior, x.operations, x.events);
  close(f.service_revenue, 351000); close(f.revenue, 1250000 / 3); close(f.cogs, 687500 / 3);
  close(f.ebitda, 62500); close(f.delta_nwc, 0);
  close(f.depreciation, 12500 + 1250 / 9);
  close(f.ebit, 448750 / 9); close(f.pretax_income, 376750 / 9);
  close(f.cash_interest, 8000); close(f.cash_taxes, 188375 / 18);
  close(f.operating_cash_flow, 792625 / 18); close(f.cash_end, 7482625 / 18);
  close(f.debt_end, 1180000); close(f.unlevered_tax, 224375 / 18);
  close(f.unlevered_fcf, 750625 / 18);
  assert.equal(ending.depreciable_assets.length, 2);
  const maintenance = ending.depreciable_assets.find(a => a.id === 'maintenance:month:1')!;
  close(maintenance.accumulated_depreciation, 1250 / 9); assert.equal(maintenance.remaining_life_months, 59);
  assert.deepEqual(x, before);
});

test('FIN-02: cash truck purchase reduces cash/UFCF, not EBITDA; pending life is preserved', () => {
  const x = financialFixture();
  const base = calculate(x.company, x.prior, x.operations, x.events).financials;
  addTruck(x.events, 0, 3);
  const result = calculate(x.company, x.prior, x.operations, x.events);
  close(result.financials.ebitda, base.ebitda);
  close(result.financials.cash_end - base.cash_end, -60000);
  close(result.financials.unlevered_fcf - base.unlevered_fcf, -60000);
  assert.equal(result.ending_financial_state.depreciable_assets.find(a => a.id === 'truck')!.remaining_life_months, 60);
});

test('FIN-03/10: fully financed purchase has no purchase-month debt cost or false cash-flow payback', () => {
  const x = financialFixture();
  const base = calculate(x.company, x.prior, x.operations, x.events).financials;
  addTruck(x.events, 1);
  const result = calculate(x.company, x.prior, x.operations, x.events);
  const f = result.financials;
  close(f.cash_end, base.cash_end); close(f.debt_end - base.debt_end, 60000);
  close(f.unlevered_fcf - base.unlevered_fcf, -60000); close(f.revenue, base.revenue);
  assert.deepEqual(f.debt_movements.find(m => m.tranche_id === 'truck-debt'), {
    tranche_id: 'truck-debt', principal_begin: 0, borrowing: 60000, cash_interest: 0,
    principal_repayment: 0, principal_end: 60000,
  });
  x.prior = { ...x.prior, month: 1, financial: result.ending_financial_state };
  x.events.month = 2; x.events.financial_inputs.new_debt_tranches = [];
  x.events.financial_inputs.asset_additions = []; x.events.financial_inputs.growth_capex = 0;
  const second = calculate(x.company, x.prior, x.operations, x.events);
  const movement = second.financials.debt_movements.find(m => m.tranche_id === 'truck-debt')!;
  close(movement.cash_interest, 600); close(movement.principal_repayment, 5000); close(movement.principal_end, 55000);
  close(second.ending_financial_state.depreciable_assets.find(a => a.id === 'truck')!.accumulated_depreciation, 1000);
});

test('FIN-04: principal is a financing flow and does not change EBIT/EBITDA/UFCF', () => {
  const x = financialFixture(); const base = calculate(x.company, x.prior, x.operations, x.events).financials;
  x.prior.financial.debt_tranches[0].monthly_principal += 10000;
  const f = calculate(x.company, x.prior, x.operations, x.events).financials;
  close(f.cash_end - base.cash_end, -10000); close(f.debt_end - base.debt_end, -10000);
  close(f.ebit, base.ebit); close(f.ebitda, base.ebitda); close(f.unlevered_fcf, base.unlevered_fcf);
});

test('FIN-05: extra interest reduces positive-income tax and cash once, leaves UFCF unchanged', () => {
  const x = financialFixture(); const base = calculate(x.company, x.prior, x.operations, x.events).financials;
  x.prior.financial.debt_tranches[0].annual_interest_rate = 0.09;
  const f = calculate(x.company, x.prior, x.operations, x.events).financials;
  close(f.cash_interest - base.cash_interest, 1000); close(f.cash_taxes - base.cash_taxes, -250);
  close(f.cash_end - base.cash_end, -750); close(f.ebit, base.ebit); close(f.unlevered_fcf, base.unlevered_fcf);
});

test('FIN-06: extra AR reduces cash and UFCF, not EBITDA; payroll/fleet excluded from AP', () => {
  const x = financialFixture(); const base = calculate(x.company, x.prior, x.operations, x.events).financials;
  x.company.global_assumptions.collection_delay_months += 10000 / base.revenue;
  const f = calculate(x.company, x.prior, x.operations, x.events).financials;
  close(f.delta_nwc, 10000); close(f.cash_end - base.cash_end, -10000);
  close(f.unlevered_fcf - base.unlevered_fcf, -10000); close(f.ebitda, base.ebitda);
  close(f.accounts_payable_end, 178750 / 3);
});

test('full hire payroll is charged during low productivity; marketing/recruitment are overhead once', () => {
  const x = financialFixture(); const base = calculate(x.company, x.prior, x.operations, x.events).financials;
  x.events.employed_technicians = x.operations.employed_technicians = 13;
  x.events.productive_technician_fte = x.operations.productive_technician_fte = 12.25;
  x.events.financial_inputs.tech_direct_labor += 95000 / 12;
  x.events.financial_inputs.incremental_marketing = 4000; x.events.financial_inputs.recruitment = 3000;
  const f = calculate(x.company, x.prior, x.operations, x.events).financials;
  close(f.ebitda - base.ebitda, -95000 / 12 - 7000);
  close(f.operating_overhead, 132000); close(f.service_revenue, 351000);
});

test('negative taxable income produces no tax credit and negative cash is not clipped or financed', () => {
  const x = financialFixture(); x.prior.financial.cash = 0;
  x.events.financial_inputs.fixed_overhead = 1000000;
  const f = calculate(x.company, x.prior, x.operations, x.events).financials;
  assert.ok(f.pretax_income < 0); assert.ok(f.cash_end < 0);
  assert.equal(f.cash_taxes, 0); assert.equal(f.unlevered_tax, 0); assert.equal(f.new_borrowings, 0);
});

test('asset depreciation is capped and pending assets retain life until service', () => {
  const x = financialFixture(); x.events.financial_inputs.maintenance_capex = 0;
  x.prior.financial.depreciable_assets = [
    { id: 'nearly-done', cost_basis: 100, accumulated_depreciation: 95, monthly_depreciation: 10, remaining_life_months: 1, in_service_month: 0 },
    { id: 'pending', cost_basis: 60000, accumulated_depreciation: 0, monthly_depreciation: 1000, remaining_life_months: 60, in_service_month: 61 },
  ];
  const r = calculate(x.company, x.prior, x.operations, x.events);
  assert.equal(r.financials.depreciation, 5);
  assert.equal(r.ending_financial_state.depreciable_assets[0].accumulated_depreciation, 100);
  assert.equal(r.ending_financial_state.depreciable_assets[1].remaining_life_months, 60);
});

test('partial final principal is capped; exhausted debt has no interest or repayment', () => {
  const x = financialFixture(); Object.assign(x.prior.financial.debt_tranches[0], { principal: 100, monthly_principal: 200, remaining_term_months: 1 });
  const first = calculate(x.company, x.prior, x.operations, x.events);
  close(first.financials.debt_principal, 100); close(first.financials.cash_interest, 2 / 3);
  x.prior = { ...x.prior, month: 1, financial: first.ending_financial_state }; x.events.month = 2;
  const second = calculate(x.company, x.prior, x.operations, x.events);
  assert.equal(second.financials.debt_end, 0); assert.equal(second.financials.cash_interest, 0);
});

test('60 sequential accounting steps preserve roll-forwards and retire existing debt', () => {
  const x = financialFixture(); const original = structuredClone(x.company);
  let prior = x.prior;
  for (let month = 1; month <= 60; month++) {
    x.events.month = month;
    const step = calculate(x.company, prior, x.operations, x.events);
    assertFinancials(step.financials, step.ending_financial_state);
    close(step.financials.debt_end, 1200000 - month * 20000);
    prior = { ...prior, month, financial: step.ending_financial_state };
  }
  assert.equal(prior.financial.depreciable_assets.filter(a => a.id.startsWith('maintenance:')).length, 60);
  close(prior.financial.depreciable_assets[0].accumulated_depreciation, 900000);
  assert.deepEqual(x.company, original);
});

test('fractional principal retires without rounding residue or an invented balloon', () => {
  const x = financialFixture();
  Object.assign(x.prior.financial.debt_tranches[0], { principal: 100, monthly_principal: 100 / 3, remaining_term_months: 3 });
  for (let month = 1; month <= 3; month++) {
    x.events.month = month;
    const step = calculate(x.company, x.prior, x.operations, x.events);
    x.prior = { ...x.prior, month, financial: step.ending_financial_state };
  }
  assert.equal(x.prior.financial.debt_tranches[0].principal, 0);
  const invalid = financialFixture();
  Object.assign(invalid.prior.financial.debt_tranches[0], { principal: 100, monthly_principal: 20, remaining_term_months: 1 });
  assert.throws(() => calculate(invalid.company, invalid.prior, invalid.operations, invalid.events), /term ended/);
});

test('inconsistent financial/state identities reject instead of producing warnings', () => {
  const x = financialFixture(); const result = calculate(x.company, x.prior, x.operations, x.events);
  result.financials.cash_end += 1;
  assert.throws(() => assertFinancials(result.financials, result.ending_financial_state), ModelInvariantError);
});

test('invalid timing, growth reconciliation, duplicate assets/debt and nonfinite inputs reject', () => {
  for (const mutate of [
    (x: ReturnType<typeof financialFixture>) => { x.events.month = 2; },
    (x: ReturnType<typeof financialFixture>) => { x.events.month = 0; },
    (x: ReturnType<typeof financialFixture>) => { x.operations.completed_jobs = 800; },
    (x: ReturnType<typeof financialFixture>) => { x.events.financial_inputs.growth_capex = 100; },
    (x: ReturnType<typeof financialFixture>) => { x.events.financial_inputs.tech_direct_labor = Infinity; },
    (x: ReturnType<typeof financialFixture>) => { addTruck(x.events); x.events.financial_inputs.asset_additions[0].asset.id = x.prior.financial.depreciable_assets[0].id; },
    (x: ReturnType<typeof financialFixture>) => { addTruck(x.events, 1); x.events.financial_inputs.new_debt_tranches[0].id = x.prior.financial.debt_tranches[0].id; },
    (x: ReturnType<typeof financialFixture>) => { addTruck(x.events, 1); x.events.financial_inputs.new_debt_tranches[0].first_repayment_month = 1; },
  ]) { const x = financialFixture(); mutate(x); assert.throws(() => calculate(x.company, x.prior, x.operations, x.events)); }
});
