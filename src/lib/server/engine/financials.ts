import type { CalculateFinancials } from '../../../../contracts/engine.ts';
import type { DebtMovement, FinancialResult } from '../../../../contracts/contracts.ts';
import { APPROVED_POLICIES, EngineStateSchema, MonthEventsSchema, OperationsResultSchema, FinancialStepResultSchema } from '../schemas.ts';
import { assertClose, assertFinancials, assertOperations, requireModel } from './invariants.ts';

/** Pure monthly accounting. All path-adjusted operating costs arrive from scheduler inputs. */
export const calculate_financials: CalculateFinancials = (company, prior, operationsValue, eventsValue) => {
  const state = EngineStateSchema.parse(prior);
  const events = MonthEventsSchema.parse(eventsValue);
  const operations = OperationsResultSchema.parse(operationsValue);
  requireModel(events.month === state.month + 1, 'Financial step must follow prior-state month');
  assertOperations(operations);
  assertClose(operations.employed_technicians, events.employed_technicians, 'Scheduled headcount');
  assertClose(operations.productive_technician_fte, events.productive_technician_fte, 'Scheduled productive FTE');
  assertClose(operations.in_service_vehicles, events.in_service_vehicles, 'Scheduled active vehicles');
  const month = events.month;
  const input = events.financial_inputs;
  const assumptions = company.global_assumptions;
  requireModel(Number.isFinite(assumptions.tax_rate) && assumptions.tax_rate >= 0 && assumptions.tax_rate <= 1,
    'Tax rate must be a finite fraction');
  requireModel(Number.isFinite(assumptions.collection_delay_months) && assumptions.collection_delay_months >= 0
    && Number.isFinite(assumptions.payment_delay_months) && assumptions.payment_delay_months >= 0
    && Number.isFinite(assumptions.constant_inventory) && assumptions.constant_inventory >= 0, 'Invalid working-capital policy');
  requireModel(new Set(assumptions.ap_eligible_cost_categories).size === assumptions.ap_eligible_cost_categories.length,
    'Duplicate AP-eligible cost category');

  const ending = structuredClone(state.financial);
  assertClose(events.purchases.reduce((sum, purchase) => sum + purchase.quantity * purchase.cost_per_unit, 0),
    input.growth_capex, 'Purchase events versus growth CapEx');
  assertClose(events.purchases.reduce((sum, purchase) => sum + purchase.quantity * purchase.cost_per_unit * purchase.funding.debt_fraction, 0),
    input.new_debt_tranches.reduce((sum, tranche) => sum + tranche.principal, 0), 'Purchase funding versus borrowing');
  const debtBegin = ending.debt_tranches.reduce((sum, t) => sum + t.principal, 0);
  const debtIds = new Set(ending.debt_tranches.map(t => t.id));
  const newIds = new Set<string>();
  for (const tranche of input.new_debt_tranches) {
    requireModel(!debtIds.has(tranche.id), `Duplicate new debt ID: ${tranche.id}`);
    requireModel(tranche.first_repayment_month === month + 1 && tranche.remaining_term_months > 0,
      'New borrowing must start repayment next month with a positive term');
    assertClose(tranche.monthly_principal * tranche.remaining_term_months, tranche.principal, 'New level-principal schedule');
    newIds.add(tranche.id);
    debtIds.add(tranche.id);
    ending.debt_tranches.push(structuredClone(tranche));
  }
  const movements: DebtMovement[] = ending.debt_tranches.map(tranche => {
    const isNew = newIds.has(tranche.id);
    const opening = isNew ? 0 : tranche.principal;
    requireModel(tranche.principal === 0 || (tranche.remaining_term_months > 0 && tranche.monthly_principal > 0),
      `Outstanding debt has no repayment schedule: ${tranche.id}`);
    const interest = opening * tranche.annual_interest_rate / 12;
    const due = !isNew && month >= tranche.first_repayment_month && tranche.principal > 0;
    let repayment = due ? Math.min(tranche.principal, tranche.monthly_principal) : 0;
    // Absorb rounding residue only; never silently balloon an invalid schedule.
    if (due && tranche.remaining_term_months === 1
      && tranche.principal - repayment <= APPROVED_POLICIES.engine_absolute_tolerance_usd
        + APPROVED_POLICIES.engine_relative_tolerance * tranche.principal) repayment = tranche.principal;
    const borrowing = isNew ? tranche.principal : 0;
    tranche.principal -= repayment;
    if (due) tranche.remaining_term_months -= 1;
    requireModel(tranche.principal === 0 || tranche.remaining_term_months > 0,
      `Debt term ended before principal was repaid: ${tranche.id}`);
    return { tranche_id: tranche.id, principal_begin: opening, borrowing,
      cash_interest: interest, principal_repayment: repayment, principal_end: tranche.principal };
  });

  assertClose(input.asset_additions.reduce((sum, addition) => sum + addition.asset.cost_basis, 0),
    input.growth_capex, 'Growth assets versus growth CapEx');
  const assetIds = new Set(ending.depreciable_assets.map(a => a.id));
  for (const { asset } of input.asset_additions) {
    requireModel(!assetIds.has(asset.id), `Duplicate growth asset ID: ${asset.id}`);
    requireModel(asset.accumulated_depreciation === 0 && asset.in_service_month >= month
      && asset.remaining_life_months === 60, 'New truck asset must be un-depreciated with 60-month service life');
    assertClose(asset.monthly_depreciation, asset.cost_basis / 60, 'Truck straight-line depreciation');
    assetIds.add(asset.id);
    ending.depreciable_assets.push(structuredClone(asset));
  }
  if (input.maintenance_capex > 0) {
    const id = `maintenance:month:${month}`;
    requireModel(!assetIds.has(id), `Duplicate maintenance asset ID: ${id}`);
    ending.depreciable_assets.push({ id, cost_basis: input.maintenance_capex, accumulated_depreciation: 0,
      monthly_depreciation: input.maintenance_capex / 60, remaining_life_months: 60, in_service_month: month });
  }
  let depreciation = 0;
  for (const asset of ending.depreciable_assets) {
    if (asset.in_service_month > month || asset.remaining_life_months === 0) continue;
    const charge = Math.min(asset.monthly_depreciation, asset.cost_basis - asset.accumulated_depreciation);
    asset.accumulated_depreciation += charge;
    asset.remaining_life_months -= 1;
    depreciation += charge;
  }

  const serviceRevenue = operations.completed_jobs * operations.average_ticket;
  const revenue = serviceRevenue + input.other_revenue;
  const variableCost = serviceRevenue * input.service_variable_cost_rate;
  const eligibleCosts = { service_variable_cost: variableCost, other_direct_cost: input.other_direct_cost,
    tech_direct_labor: input.tech_direct_labor, vehicle_direct_opex: input.vehicle_direct_opex };
  const cogs = Object.values(eligibleCosts).reduce((sum, value) => sum + value, 0);
  const grossProfit = revenue - cogs;
  const overhead = input.fixed_overhead + input.incremental_marketing + input.recruitment;
  const ebitda = grossProfit - overhead;
  const ebit = ebitda - depreciation;
  const interest = movements.reduce((sum, m) => sum + m.cash_interest, 0);
  const taxes = Math.max(0, ebit - interest) * assumptions.tax_rate;
  ending.accounts_receivable = assumptions.collection_delay_months * revenue;
  ending.inventory = assumptions.constant_inventory;
  ending.accounts_payable = assumptions.payment_delay_months * assumptions.ap_eligible_cost_categories.reduce((sum, key) => {
    requireModel(Object.hasOwn(eligibleCosts, key), `Unknown AP-eligible cost: ${key}`);
    return sum + eligibleCosts[key];
  }, 0);
  const nwcBegin = state.financial.accounts_receivable + state.financial.inventory - state.financial.accounts_payable;
  const nwcEnd = ending.accounts_receivable + ending.inventory - ending.accounts_payable;
  const deltaNwc = nwcEnd - nwcBegin;
  const ocf = ebitda - interest - taxes - deltaNwc;
  const capex = input.maintenance_capex + input.growth_capex;
  const borrowing = movements.reduce((sum, m) => sum + m.borrowing, 0);
  const principal = movements.reduce((sum, m) => sum + m.principal_repayment, 0);
  const cashChange = ocf - capex + borrowing - principal;
  ending.cash = state.financial.cash + cashChange;
  const unleveredTax = Math.max(0, ebit) * assumptions.tax_rate;
  const financials: FinancialResult = {
    service_revenue: serviceRevenue, other_revenue: input.other_revenue, revenue,
    service_variable_cost: variableCost, tech_direct_labor: input.tech_direct_labor,
    vehicle_direct_opex: input.vehicle_direct_opex, other_direct_cost: input.other_direct_cost,
    cogs, gross_profit: grossProfit, fixed_overhead: input.fixed_overhead,
    incremental_marketing: input.incremental_marketing, recruitment: input.recruitment,
    operating_overhead: overhead, ebitda, depreciation, amortization: 0, ebit,
    cash_interest: interest, pretax_income: ebit - interest, cash_taxes: taxes,
    accounts_receivable_end: ending.accounts_receivable, inventory_end: ending.inventory,
    accounts_payable_end: ending.accounts_payable, nwc_begin: nwcBegin, nwc_end: nwcEnd, delta_nwc: deltaNwc,
    operating_cash_flow: ocf, maintenance_capex: input.maintenance_capex, growth_capex: input.growth_capex,
    capex, new_borrowings: borrowing, debt_principal: principal, owner_distributions: 0,
    cash_begin: state.financial.cash, cash_change: cashChange, cash_end: ending.cash,
    debt_begin: debtBegin, debt_end: ending.debt_tranches.reduce((sum, t) => sum + t.principal, 0),
    unlevered_tax: unleveredTax, unlevered_fcf: ebit - unleveredTax + depreciation - deltaNwc - capex,
    debt_movements: movements,
  };
  const result = FinancialStepResultSchema.parse({ financials, ending_financial_state: ending });
  assertFinancials(result.financials, result.ending_financial_state);
  return result;
};
