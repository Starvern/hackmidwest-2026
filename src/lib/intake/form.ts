export type Envelope = {
  value: unknown; state: string; unit: string; period: { as_of: string } | { start: string; end: string } | null;
  source_ids: string[]; raw: { text: string; unit: string; precision: string } | null; derivation: unknown; review: unknown;
};
export function fieldEntries(value: unknown, pointer = ''): { pointer: string; field: Envelope; key: string }[] {
  if (!value || typeof value !== 'object') return [];
  if ('state' in value && 'value' in value) return [{ pointer, field: value as Envelope, key: pointer.split('/').at(-1)! }];
  return Object.entries(value).flatMap(([key, child]) => fieldEntries(child, `${pointer}/${key}`));
}
const names: Record<string, string> = {
  name: 'Name', trade: 'Business type', currency: 'Currency', accounting_basis: 'Accounting basis', books_through: 'Books through', forecast_start: 'Forecast begins',
  service_jobs: 'Completed service jobs', tech_direct_labor: 'Service payroll', vehicle_direct_opex: 'Fleet running costs', cogs: 'Total direct costs', ebitda: 'Operating earnings before interest, tax and depreciation', reported_profit_basis: 'Reported profit basis',
  service_technicians_employed: 'Employed service technicians', service_vehicles_available: 'Available service vehicles', pooling_suitable: 'Can the team and vehicles serve these comparable jobs?', job_definition: 'What counts as one completed job?',
  jobs_per_technician_day: 'Jobs per productive technician per day', jobs_per_vehicle_day: 'Jobs per service vehicle per day', base_monthly_demand: 'Jobs requested per month, including work turned away', forecast_ticket: 'Expected service sale per job', loaded_technician_cost: 'Annual loaded cost per service technician', fleet_operating_cost: 'Annual running cost per vehicle', baseline_marketing_in_overhead: 'Marketing already included in overhead',
  fixed_overhead_per_month: 'Monthly fixed running costs', non_service_revenue_per_month: 'Monthly non-service sales', non_service_direct_cost_per_month: 'Monthly non-service direct costs',
  debt_declaration: 'Existing loans', asset_declaration: 'Existing depreciable equipment', terms_source: 'Where are the loan terms documented?', amortization_policy: 'Repayment structure', normalized_recognition_amount: 'Monthly recognized expense (not the payment)', mapping_mode: 'How this detail relates to the total', target_bucket: 'Existing cost category', raw_amount: 'Original amount', irregular_payment: 'Does cash payment timing differ materially from monthly recognition?',
  loaded_cost: 'Loaded cost', organic_demand_growth: 'Annual change in customer demand', wage_inflation: 'Annual payroll inflation', overhead_inflation: 'Annual overhead inflation', ticket_growth: 'Annual change in service sale per job', collection_delay_months: 'Customer collection delay', payment_delay_months: 'Supplier payment delay', existing_depreciation_per_year: 'Annual depreciation reconciled to existing equipment', maintenance_capex_per_year: 'Annual maintenance capital spending', liquidity_floor: 'Cash safety cushion', valuation_multiple: 'Business value / annual operating earnings',
};
export const label = (key: string) => names[key] ?? key.replaceAll('_', ' ').replace(/^./, c => c.toUpperCase());
export function issueLabel(pointer: string, history: { period: string }[]): string {
  const parts = pointer.split('/');
  if (parts[1] === 'history') return `${history[Number(parts[2])]?.period ?? 'History'} · ${label(parts.at(-1)!)}`;
  if (parts.includes('seasonality')) return `${new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, Number(parts.at(-1)), 1)))} demand factor`;
  return label(parts.at(-1)!);
}
export const unitLabel = (unit: string) => ({ text: '', boolean: '', ISO_date: '', annual_fraction: 'Annual fraction · 5% = 0.05', fraction: 'Fraction · 25% = 0.25', dimensionless: 'Factor', 'USD/person/year': '$ per person / year', 'USD/vehicle/year': '$ per vehicle / year', USD: '$', 'USD/month': '$ per month', 'USD/year': '$ per year', 'USD/job': '$ per job', 'jobs/person/day': 'Jobs / person / day', 'jobs/vehicle/day': 'Jobs / vehicle / day' }[unit] ?? unit);
export const choices: Record<string, [string, string][]> = {
  trade: [['HVAC','HVAC'],['plumbing','Plumbing (draft only)'],['other','Mixed / other (draft only)']], currency: [['USD','USD']], accounting_basis: [['accrual','Accrual'],['cash','Cash basis (needs reconciliation)'],['reconciled_accrual_equivalent','Reconciled accrual equivalent']],
  debt_declaration: [['none','No existing loans'],['itemized','Loans listed below'],['unknown','Not yet known']], asset_declaration: [['none','No depreciable equipment'],['itemized','Equipment listed below'],['unknown','Not yet known']],
  mapping_mode: [['included_detail','Already included in the total'],['replace_total','Use these reconciled details instead of the total']],
  target_bucket: [['fixed_overhead_per_month','Fixed overhead'],['non_service_direct_cost_per_month','Non-service direct costs'],['tech_direct_labor','Service payroll'],['vehicle_direct_opex','Fleet running costs']],
  amortization_policy: [['level_principal','Fixed-rate monthly level principal'],['equal_payment','Equal total payments (draft only)'],['other','Other (draft only)']],
};
