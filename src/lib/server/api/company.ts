import fixture from '../../../../data/synthetic_hvac_company.json' with { type: 'json' };
import { CompanyInputSchema } from '../schemas.ts';

/** Bundle the synthetic fixture with the server; never rely on deployment cwd or mutate it. */
export function loadDemoCompany() {
  return CompanyInputSchema.parse(fixture);
}

/** Synthetic capacity-constrained business; no real customer or financial records. */
export function loadGrowthCompany() {
  const company = loadDemoCompany();
  company.id = 'synthetic-growth-hvac-002';
  company.name = 'Prairie Growth HVAC (synthetic)';
  Object.assign(company.operations, {
    technicians: 6, vehicles: 4, base_monthly_job_demand: 600,
    non_service_revenue_per_month: 10000, non_service_direct_cost_per_month: 4000,
    fixed_overhead_per_month: 55000, baseline_marketing_in_overhead: 3000,
  });
  const revenue = 240 * company.operations.average_ticket;
  const variableCost = revenue * company.operations.service_variable_cost_rate;
  for (const row of company.historical_months) {
    Object.assign(row, { service_jobs: 240, service_revenue: revenue, other_revenue: 10000, revenue: revenue + 10000,
      tech_direct_labor: 47500, vehicle_direct_opex: 5000, service_variable_cost: variableCost,
      other_direct_cost: 4000, cogs: 56500 + variableCost, operating_overhead: 55000,
      ebitda: revenue + 10000 - 56500 - variableCost - 55000 });
  }
  Object.assign(company.opening_financial_state, {
    cash: 400000, accounts_receivable: (revenue + 10000) * 1.5,
    inventory: 35000, accounts_payable: (variableCost + 4000) * 0.75,
    debt_tranches: [{ id: 'growth-existing-equipment-loan', principal: 120000,
      annual_interest_rate: 0.09, remaining_term_months: 24, monthly_principal: 5000,
      first_repayment_month: 1, amortization_policy: 'level_principal' }],
    depreciable_assets: [{ id: 'growth-existing-fleet', cost_basis: 240000,
      accumulated_depreciation: 48000, monthly_depreciation: 4000, remaining_life_months: 48, in_service_month: 0 }],
  });
  company.global_assumptions.existing_depreciation_per_year = 48000;
  company.global_assumptions.maintenance_capex_per_year = 24000;
  company.global_assumptions.valuation_multiple = 4;
  Object.assign(company.global_assumptions, {
    // Average factor is 1.0. Even the quietest month exceeds the existing 240-job capacity.
    seasonality: [1.15, 1.05, 0.8, 0.6, 0.75, 1.3, 1.55, 1.4, 1, 0.55, 0.75, 1.1],
    collection_delay_months: 1.5, payment_delay_months: 0.75, constant_inventory: 35000,
    organic_demand_growth: 0.03, ticket_growth: 0.025, other_revenue_growth: 0.02,
    other_direct_cost_growth: 0.025,
  });
  for (const item of Object.values(company.provenance)) {
    item.source = 'Synthetic Prairie Growth HVAC example; illustrative seasonal demand, contract revenue, working-capital and equipment-loan assumptions; not observed business data';
  }
  return CompanyInputSchema.parse(company);
}

export function loadExampleCompany(id: string) {
  return id === 'synthetic-growth-hvac-002' ? loadGrowthCompany() : loadDemoCompany();
}
