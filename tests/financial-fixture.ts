import { readFileSync } from 'node:fs';
import type { CompanyInput, EngineState, MonthEvents, OperationsResult } from '../contracts/contracts.ts';
import { CompanyInputSchema } from '../src/lib/server/schemas.ts';

/** Hand-constructed module inputs; not scheduler output or product forecasts. */
export function financialFixture() {
  const company: CompanyInput = CompanyInputSchema.parse(JSON.parse(readFileSync(
    new URL('../data/synthetic_hvac_company.json', import.meta.url), 'utf8')));
  const prior: EngineState = { month: 0, financial: structuredClone(company.opening_financial_state),
    operational: { technician_cohorts: [], vehicle_cohorts: [], pending_campaign_demand: [] } };
  const operations: OperationsResult = { service_demand_jobs: 540, technician_capacity_jobs: 720,
    vehicle_capacity_jobs: 720, service_capacity_jobs: 720, completed_jobs: 540, unserved_jobs: 0,
    utilization: 0.75, employed_technicians: 12, productive_technician_fte: 12,
    in_service_vehicles: 12, average_ticket: 650 };
  const events: MonthEvents = { month: 1, purchases: [], employment_starts: [], vehicle_activations: [],
    campaign_spending: [], campaign_demand: [], employed_technicians: 12, productive_technician_fte: 12,
    in_service_vehicles: 12, ending_operational_state: structuredClone(prior.operational), events: [],
    financial_inputs: { tech_direct_labor: 95000, vehicle_direct_opex: 15000,
      other_revenue: 788000 / 12, other_direct_cost: 27500, fixed_overhead: 125000,
      service_variable_cost_rate: 1100000 / 4212000, incremental_marketing: 0, recruitment: 0,
      maintenance_capex: 100000 / 12, growth_capex: 0, new_debt_tranches: [], asset_additions: [],
      incremental_investment_outlay: 0 } };
  return { company, prior, operations, events };
}

export function addTruck(events: MonthEvents, debtFraction = 0, inServiceMonth = 2) {
  events.purchases.push({ decision_id: 'truck', stable_investment_key: 'truck', quantity: 1,
    cost_per_unit: 60000, in_service_month: inServiceMonth,
    funding: { debt_fraction: debtFraction, annual_interest_rate: 0.12, term_months: 12 } });
  events.financial_inputs.growth_capex = 60000;
  events.financial_inputs.incremental_investment_outlay = 60000;
  events.financial_inputs.asset_additions.push({ category: 'growth', asset: { id: 'truck', cost_basis: 60000,
    accumulated_depreciation: 0, monthly_depreciation: 1000, remaining_life_months: 60,
    in_service_month: inServiceMonth } });
  if (debtFraction > 0) events.financial_inputs.new_debt_tranches.push({ id: 'truck-debt',
    principal: 60000 * debtFraction, annual_interest_rate: 0.12, remaining_term_months: 12,
    monthly_principal: 5000 * debtFraction, first_repayment_month: events.month + 1,
    amortization_policy: 'level_principal' });
}
