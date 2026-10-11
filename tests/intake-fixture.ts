import { ProfilePayloadSchema, type ProfilePayload } from '../src/lib/server/intake/schemas.ts';

const asOf = { as_of: '2026-12-31' };
const review = { actor_id: 'owner', reviewed_at: '2027-01-01T00:00:00Z', rationale: 'Synthetic test of reviewed inputs' };
export function f(value: unknown, unit: string, period: unknown = asOf) {
  return { value, unit, state: value === null ? 'unknown' : 'confirmed', period, source_ids: value === null ? [] : ['source'], raw: null, derivation: null, review: value === null ? null : review };
}
export function eligibleFixture(): ProfilePayload {
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
