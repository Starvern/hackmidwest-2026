/** Revision-2 intake facts. Parsing never grants review, access or confirmation. */
import { z } from 'zod';

export const PROFILE_VERSION = 'company-profile-2-draft' as const;
export const MAPPING_VERSION = 'company-mapping-2-draft' as const;
const text = z.string().min(1);
const nonnegative = z.number().nonnegative();
const fraction = z.number().min(0).max(1);
export const DateSchema = z.iso.date();
export const PeriodSchema = z.union([
  z.strictObject({ as_of: DateSchema }),
  z.strictObject({ start: DateSchema, end: DateSchema }).refine(v => v.start <= v.end, 'Reversed period'),
]);
export const ProfileUnitSchema = z.enum([
  'text', 'boolean', 'ISO_date', 'calendar_month', 'integer', 'people', 'vehicles',
  'days/month', 'jobs/person/day', 'jobs/vehicle/day', 'jobs', 'jobs/month', 'USD',
  'USD/month', 'USD/year', 'USD/job', 'USD/person/year', 'USD/vehicle/year',
  'fraction', 'annual_fraction', 'dimensionless', 'months', 'record', 'record_list', 'category_list',
]);
export const ReviewSchema = z.strictObject({ actor_id: text, reviewed_at: z.iso.datetime(), rationale: text });
export function profileField<T extends z.ZodType>(value: T, unit: z.infer<typeof ProfileUnitSchema>) {
  return z.strictObject({
    value: value.nullable(), state: z.enum(['unknown', 'entered', 'reviewed_estimate', 'confirmed', 'not_applicable']),
    unit: z.literal(unit), period: PeriodSchema, source_ids: z.array(text),
    raw: z.strictObject({ text: text, unit: text, precision: text }).nullable(),
    derivation: z.strictObject({ mapping_version: z.literal(MAPPING_VERSION), rule: text, inputs: z.array(text) }).nullable(),
    review: ReviewSchema.nullable(),
  }).superRefine((field, ctx) => {
    const absent = field.state === 'unknown' || field.state === 'not_applicable';
    const fieldValue = (field as Record<string, unknown>).value;
    if (absent !== (fieldValue === null)) ctx.addIssue({ code: 'custom', path: ['value'], message: 'Unknown/not-applicable fields require null; other states require a value' });
    if (['confirmed', 'reviewed_estimate', 'not_applicable'].includes(field.state) && !field.review)
      ctx.addIssue({ code: 'custom', path: ['review'], message: 'Reviewed state requires explicit review' });
    if (['confirmed', 'reviewed_estimate'].includes(field.state) && !field.source_ids.length)
      ctx.addIssue({ code: 'custom', path: ['source_ids'], message: 'Reviewed value requires source coverage' });
    if (new Set(field.source_ids).size !== field.source_ids.length)
      ctx.addIssue({ code: 'custom', path: ['source_ids'], message: 'Duplicate source ID' });
  });
}
const ids = z.array(text);
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export const ServiceMixRowSchema = z.strictObject({
  row_id: text, trade: z.enum(['HVAC', 'plumbing', 'other']),
  service_kind: z.enum(['repair', 'installation', 'maintenance', 'other']),
  description: text, comparable_job_definition: text, pool_id: text, historical_row_ids: ids,
  completed_jobs: nonnegative.nullable(), service_revenue_usd: nonnegative.nullable(), source_ids: ids,
});
export const WorkforceAvailabilitySchema = z.strictObject({
  declaration: z.enum(['none', 'itemized', 'unknown']),
  constraints: z.array(z.strictObject({
    row_id: text, people: nonnegative.int(), kind: z.enum(['part_time', 'absence', 'ramping', 'skill_pool', 'crew', 'other']),
    available_fraction: fraction.nullable(), productivity_fraction: fraction.nullable(),
    pool_id: text.nullable(), description: text, source_ids: ids,
  })),
}).refine(v => v.declaration === 'itemized' ? v.constraints.length > 0 : v.constraints.length === 0, 'Declaration and constraints disagree');
export const DemandEvidenceSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('measured'), observations: z.array(z.strictObject({
    row_id: text, period: month, requested_jobs: nonnegative, unserved_jobs: nonnegative.nullable(), service_mix_row_ids: ids, source_ids: ids,
  })).min(1) }),
  z.strictObject({ kind: z.literal('reviewed_estimate'), period_start: DateSchema, period_end: DateSchema,
    estimated_jobs_per_month: nonnegative, method: text, limitations: text, service_mix_row_ids: ids, source_ids: ids,
  }).refine(v => v.period_start <= v.period_end, 'Reversed estimate period'),
  z.strictObject({ kind: z.literal('confirmed_no_unserved'), historical_row_ids: ids.min(1), rationale: text, source_ids: ids }),
]);
const monetaryHistory = ['service_revenue', 'other_revenue', 'revenue', 'tech_direct_labor', 'vehicle_direct_opex',
  'service_variable_cost', 'other_direct_cost', 'cogs', 'operating_overhead', 'ebitda', 'reported_profit'] as const;
function fields<K extends string, T extends z.ZodType>(keys: readonly K[], value: T, unit: ProfileUnit) {
  return Object.fromEntries(keys.map(key => [key, profileField(value, unit)])) as Record<K, ReturnType<typeof profileField<T>>>;
}
export const HistoryRowSchema = z.strictObject({
  row_id: text, period: month, service_jobs: profileField(nonnegative, 'jobs/month'),
  ...fields(monetaryHistory, z.number(), 'USD/month'),
  reported_profit_basis: profileField(text, 'text'),
});
// Exact workbook member names, all preserving the common source/review envelope.
export const LoanRowSchema = z.strictObject({
  row_id: text, lender: profileField(text, 'text'), name: profileField(text, 'text'),
  amortization_policy: profileField(text, 'text'), terms_source: profileField(text, 'text'),
  outstanding_principal: profileField(nonnegative, 'USD'), monthly_principal: profileField(nonnegative, 'USD'),
  annual_rate: profileField(nonnegative, 'annual_fraction'), remaining_term: profileField(nonnegative.int(), 'months'),
  next_payment_date: profileField(DateSchema, 'ISO_date'),
});
export const AssetRowSchema = z.strictObject({
  row_id: text, name: profileField(text, 'text'), cost_basis: profileField(nonnegative, 'USD'),
  accumulated_depreciation: profileField(nonnegative, 'USD'), monthly_depreciation: profileField(nonnegative, 'USD/month'),
  remaining_life: profileField(nonnegative.int(), 'months'), service_date: profileField(DateSchema, 'ISO_date'),
});
export const ExpenseRowSchema = z.strictObject({
  row_id: text, ...fields(['name', 'category', 'source_period', 'currency', 'frequency', 'target_bucket', 'allocation_rule'] as const, text, 'text'),
  mapping_mode: profileField(z.enum(['replace_total', 'included_detail']), 'text'),
  raw_amount: profileField(nonnegative, 'USD'), normalized_recognition_amount: profileField(nonnegative, 'USD/month'),
  coverage_start: profileField(DateSchema, 'ISO_date'), coverage_end: profileField(DateSchema, 'ISO_date'),
  irregular_payment: profileField(z.boolean(), 'boolean'),
});

export type ProfileUnit = z.infer<typeof ProfileUnitSchema>;
export type HistoryRow = z.infer<typeof HistoryRowSchema>;

export const OperationsSchema = z.strictObject({
  job_definition: profileField(text, 'text'), pooling_suitable: profileField(z.boolean(), 'boolean'),
  service_technicians_employed: profileField(nonnegative.int(), 'people'), service_vehicles_available: profileField(nonnegative.int(), 'vehicles'),
  working_days_per_month: profileField(nonnegative, 'days/month'), jobs_per_technician_day: profileField(nonnegative, 'jobs/person/day'),
  jobs_per_vehicle_day: profileField(nonnegative, 'jobs/vehicle/day'), forecast_ticket: profileField(nonnegative, 'USD/job'),
  base_monthly_demand: profileField(nonnegative, 'jobs/month'), loaded_technician_cost: profileField(nonnegative, 'USD/person/year'),
  fleet_operating_cost: profileField(nonnegative, 'USD/vehicle/year'),
  ...fields(['non_service_revenue_per_month', 'non_service_direct_cost_per_month', 'fixed_overhead_per_month', 'baseline_marketing_in_overhead'] as const, nonnegative, 'USD/month'),
  service_variable_cost_rate: profileField(fraction, 'fraction'), service_mix: profileField(z.array(ServiceMixRowSchema), 'record_list'),
  workforce_availability: profileField(WorkforceAvailabilitySchema, 'record'), demand_evidence: profileField(DemandEvidenceSchema, 'record'),
}).superRefine((operations, ctx) => {
  const evidence = operations.demand_evidence;
  if (evidence.value?.kind === 'reviewed_estimate' && !['entered', 'reviewed_estimate'].includes(evidence.state))
    ctx.addIssue({ code: 'custom', path: ['demand_evidence', 'state'], message: 'Demand estimate must remain an estimate after review' });
  if (evidence.value?.kind === 'confirmed_no_unserved' && !['entered', 'confirmed'].includes(evidence.state))
    ctx.addIssue({ code: 'custom', path: ['demand_evidence', 'state'], message: 'No-unserved declaration requires confirmation, not estimation' });
});
export const AssumptionsSchema = z.strictObject({
  ...fields(['organic_demand_growth', 'wage_inflation', 'overhead_inflation', 'ticket_growth', 'other_revenue_growth', 'other_direct_cost_growth'] as const, z.number().gt(-1), 'annual_fraction'),
  ...fields(['collection_delay_months', 'payment_delay_months', 'truck_useful_life_months'] as const, nonnegative, 'months'),
  ap_eligible_cost_categories: profileField(ids, 'category_list'),
  ...fields(['constant_inventory', 'liquidity_floor'] as const, nonnegative, 'USD'),
  ...fields(['existing_depreciation_per_year', 'maintenance_capex_per_year'] as const, nonnegative, 'USD/year'),
  tax_rate: profileField(fraction, 'fraction'), valuation_multiple: profileField(nonnegative, 'dimensionless'),
  seasonality: z.array(profileField(nonnegative, 'dimensionless')).length(12),
  // Structure of company-specific risk settings remains owned by the MC contract.
  risk_configuration: profileField(z.record(text, z.json()), 'record'),
});
/** Editable payload only. Identity, status, acknowledgments and confirmation are server-owned. */
export const ProfilePayloadSchema = z.strictObject({
  profile_version: z.literal(PROFILE_VERSION),
  business: z.strictObject({
    ...fields(['name', 'trade', 'currency', 'accounting_basis'] as const, text, 'text'),
    books_through: profileField(DateSchema, 'ISO_date'), forecast_start: profileField(DateSchema, 'ISO_date'),
  }),
  history: z.array(HistoryRowSchema),
  opening: z.strictObject({
    cash: profileField(z.number(), 'USD'), ...fields(['accounts_receivable', 'inventory', 'accounts_payable'] as const, nonnegative, 'USD'),
    ...fields(['debt_declaration', 'asset_declaration'] as const, z.enum(['none', 'itemized', 'unknown']), 'text'),
    loans: z.array(LoanRowSchema), assets: z.array(AssetRowSchema),
  }),
  operations: OperationsSchema, expense_ledger: z.array(ExpenseRowSchema), assumptions: AssumptionsSchema,
  sources: z.array(z.strictObject({ source_id: text, kind: z.enum(['manual_statement', 'owner_estimate', 'spreadsheet_cell', 'document_page', 'derived', 'synthetic_demo']), title: text, period: PeriodSchema, locator: text.nullable() })),
  reconciliations: z.array(z.strictObject({ row_id: text, pointers: ids.min(1), source_ids: ids.min(1), rationale: text, review: ReviewSchema.nullable() })),
  reviews: z.array(z.strictObject({ pointer: text, review: ReviewSchema })),
});
export type ProfilePayload = z.infer<typeof ProfilePayloadSchema>;
