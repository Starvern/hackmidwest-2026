/** Authoritative OperatorOS runtime contracts. No coercion, defaults or forecast calculations. */
import { z } from 'zod';
import { validateProvenance, validateRequest, uniqueIds } from './validation.ts';
const finite = z.number();
const nonnegative = finite.nonnegative();
const positive = finite.positive();
const fraction = finite.min(0).max(1);
const monthIndex = z.number().int().min(0).max(60);
const forwardMonth = z.number().int().min(1).max(60);

export const ProvenanceKindSchema = z.union([z.literal('synthetic_historical'), z.literal('user_input'), z.literal('derived'), z.literal('assumed'), z.literal('simulated')]);

export const ProvenanceSchema = z.strictObject({
  kind: ProvenanceKindSchema,
  source: z.string().min(1),
  unit: z.string().min(1),
});

export const ProvenanceManifestSchema = z.record(z.string(), ProvenanceSchema);

export const FundingSchema = z.strictObject({
  debt_fraction: fraction,
  annual_interest_rate: nonnegative,
  term_months: z.number().int().positive(),
});

export const DecisionBaseSchema = z.strictObject({
  id: z.string().min(1),
  stable_investment_key: z.string().min(1),
  start_month: forwardMonth,
  provenance: ProvenanceManifestSchema,
});

export const PurchaseTrucksSchema = z.strictObject({
  ...DecisionBaseSchema.shape,
  type: z.literal('purchase_trucks'),
  quantity: z.number().int().nonnegative(),
  cost_per_unit: nonnegative,
  in_service_delay_months: z.number().int().nonnegative(),
  funding: FundingSchema,
}).superRefine(validateProvenance);

export const HireTechniciansSchema = z.strictObject({
  ...DecisionBaseSchema.shape,
  type: z.literal('hire_technicians'),
  quantity: z.number().int().nonnegative(),
  fully_loaded_annual_cost_per_person: nonnegative,
  hiring_delay_months: z.number().int().nonnegative(),
  ramp_months: z.number().int().nonnegative(),
  one_time_hiring_cost_per_person: nonnegative,
}).superRefine(validateProvenance);

export const IncreaseMarketingSchema = z.strictObject({
  ...DecisionBaseSchema.shape,
  type: z.literal('increase_marketing'),
  duration_months: z.number().int().positive(),
  extra_spend_per_month: nonnegative,
  lead_to_job_lag_months: z.number().int().nonnegative(),
  incremental_cost_per_booked_job: positive,
}).superRefine(validateProvenance);

/** Additive candidate; original decisions/reference hashes remain unchanged. */
export const FLEXIBLE_DECISION_VERSION = 'flexible-investment-1-candidate' as const;
export const OperatingExpenseSchema = z.strictObject({
  ...DecisionBaseSchema.shape, type: z.literal('operating_expense'),
  decision_version: z.literal(FLEXIBLE_DECISION_VERSION), name: z.string().trim().min(1).max(100),
  amount_per_month: nonnegative, duration_months: z.number().int().min(1).max(60),
}).superRefine(validateProvenance);
export const PurchaseAssetSchema = z.strictObject({
  ...DecisionBaseSchema.shape, type: z.literal('purchase_asset'),
  decision_version: z.literal(FLEXIBLE_DECISION_VERSION), name: z.string().trim().min(1).max(100),
  purchase_cost: nonnegative, in_service_delay_months: z.number().int().nonnegative(),
  useful_life_months: z.number().int().min(1).max(600), monthly_operating_cost: nonnegative,
  funding: FundingSchema,
}).superRefine(validateProvenance);
export const DecisionSchema = z.discriminatedUnion('type', [PurchaseTrucksSchema, HireTechniciansSchema, IncreaseMarketingSchema, OperatingExpenseSchema, PurchaseAssetSchema]);

export const ScenarioInputSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  decisions: z.array(DecisionSchema),
}).superRefine((v, ctx) => uniqueIds(v.decisions, ['decisions'], ctx));

export const DebtTrancheSchema = z.strictObject({
  id: z.string().min(1),
  principal: nonnegative,
  annual_interest_rate: nonnegative,
  remaining_term_months: z.number().int().nonnegative(),
  monthly_principal: nonnegative,
  first_repayment_month: z.number().int().nonnegative(),
  amortization_policy: z.literal('level_principal'),
});

export const DepreciableAssetSchema = z.strictObject({
  id: z.string().min(1),
  cost_basis: nonnegative,
  accumulated_depreciation: nonnegative,
  monthly_depreciation: nonnegative,
  remaining_life_months: z.number().int().nonnegative(),
  in_service_month: z.number().int().nonnegative(),
}).refine(v => v.accumulated_depreciation <= v.cost_basis, 'Accumulated depreciation exceeds cost basis');

export const FinancialStateSchema = z.strictObject({
  cash: finite,
  accounts_receivable: nonnegative,
  inventory: nonnegative,
  accounts_payable: nonnegative,
  debt_tranches: z.array(DebtTrancheSchema),
  depreciable_assets: z.array(DepreciableAssetSchema),
}).superRefine((v, ctx) => { uniqueIds(v.debt_tranches, ['debt_tranches'], ctx); uniqueIds(v.depreciable_assets, ['depreciable_assets'], ctx); });

export const HistoricalMonthSchema = z.strictObject({
  month_of_year: z.number().int().min(1).max(12),
  service_jobs: nonnegative,
  service_revenue: nonnegative,
  other_revenue: nonnegative,
  revenue: nonnegative,
  tech_direct_labor: nonnegative,
  vehicle_direct_opex: nonnegative,
  service_variable_cost: nonnegative,
  other_direct_cost: nonnegative,
  cogs: nonnegative,
  operating_overhead: nonnegative,
  ebitda: finite,
});

export const OperationsInputSchema = z.strictObject({
  technicians: z.number().int().nonnegative(),
  vehicles: z.number().int().nonnegative(),
  working_days_per_month: nonnegative,
  max_jobs_per_tech_per_day: nonnegative,
  max_jobs_per_vehicle_per_day: nonnegative,
  base_monthly_job_demand: nonnegative,
  average_ticket: nonnegative,
  non_service_revenue_per_month: nonnegative,
  technician_loaded_cost_per_year: nonnegative,
  vehicle_opex_per_year: nonnegative,
  service_variable_cost_rate: nonnegative,
  non_service_direct_cost_per_month: nonnegative,
  fixed_overhead_per_month: nonnegative,
  baseline_marketing_in_overhead: nonnegative,
});

export const DistributionParameterSchema = z.strictObject({
  family: z.union([z.literal('fixed'), z.literal('bounded_normal'), z.literal('triangular'), z.literal('discrete'), z.literal('latent_ar1')]),
  parameters: z.record(z.string().min(1), z.union([finite, z.array(finite).min(1)])).refine(v => Object.keys(v).length > 0, 'Distribution parameters cannot be empty'),
});

export const DistributionParametersSchema = z.record(z.string(), DistributionParameterSchema);

export const GlobalAssumptionsSchema = z.strictObject({
  organic_demand_growth: z.number().gt(-1),
  wage_inflation: z.number().gt(-1),
  overhead_inflation: z.number().gt(-1),
  ticket_growth: z.number().gt(-1),
  other_revenue_growth: z.number().gt(-1),
  other_direct_cost_growth: z.number().gt(-1),
  collection_delay_months: nonnegative,
  payment_delay_months: nonnegative,
  ap_eligible_cost_categories: z.array(z.union([z.literal('service_variable_cost'), z.literal('other_direct_cost'), z.literal('tech_direct_labor'), z.literal('vehicle_direct_opex')])),
  constant_inventory: nonnegative,
  existing_depreciation_per_year: nonnegative,
  maintenance_capex_per_year: nonnegative,
  truck_useful_life_months: z.literal(60),
  tax_rate: fraction,
  liquidity_floor: nonnegative,
  valuation_multiple: positive,
  seasonality: z.array(nonnegative).length(12),
  distribution_parameters: DistributionParametersSchema,
});

export const CompanyInputSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  industry: z.literal('HVAC'),
  currency: z.literal('USD'),
  model_version: z.literal('mvp-1.0'),
  valuation_month: z.literal(60),
  horizon_months: z.literal(60),
  forecast_start_month_of_year: z.literal(1),
  historical_months: z.array(HistoricalMonthSchema).length(12),
  opening_financial_state: FinancialStateSchema,
  operations: OperationsInputSchema,
  global_assumptions: GlobalAssumptionsSchema,
  provenance: ProvenanceManifestSchema,
}).superRefine((v, ctx) => {
  validateProvenance(v, ctx);
  v.historical_months.forEach((row, i) => { if (row.month_of_year !== i + 1) ctx.addIssue({ code: 'custom', path: ['historical_months', i, 'month_of_year'], message: 'Expected ordered calendar months 1–12' }); });
});

export const DeterministicRequestSchema = z.strictObject({
  schema_version: z.literal('1.0'),
  company_id: z.string().min(1),
  horizon_months: z.literal(60),
  reserve_floor_usd: nonnegative,
  exit_multiple: positive,
  scenarios: z.array(ScenarioInputSchema),
}).superRefine(validateRequest);

export const MonteCarloRequestSchema = z.strictObject({
  ...DeterministicRequestSchema.shape,
  monte_carlo: z.strictObject({
  enabled: z.literal(true),
  runs: z.number().int().min(2000).max(5000),
  seed: z.number().int().nonnegative(),
}),
}).superRefine(validateRequest);

export const ModelEventSchema = z.strictObject({
  id: z.string().min(1),
  month: monthIndex,
  decision_id: z.union([z.string().min(1), z.null()]),
  type: z.union([z.literal('scheduled'), z.literal('simulated_operational'), z.literal('calculated_milestone')]),
  kind: z.union([z.literal('asset_purchase'), z.literal('asset_in_service'), z.literal('operating_expense'), z.literal('truck_purchase'), z.literal('truck_in_service'), z.literal('recruitment'), z.literal('employment_start'), z.literal('ramp_complete'), z.literal('campaign_spend'), z.literal('campaign_demand'), z.literal('campaign_end'), z.literal('cash_trough'), z.literal('reserve_breach'), z.literal('payback'), z.literal('payback_reversal'), z.literal('debt_peak'), z.literal('exit')]),
  label: z.string().min(1),
  provenance: ProvenanceKindSchema,
});

export const OperationsResultSchema = z.strictObject({
  service_demand_jobs: nonnegative,
  technician_capacity_jobs: nonnegative,
  vehicle_capacity_jobs: nonnegative,
  service_capacity_jobs: nonnegative,
  completed_jobs: nonnegative,
  unserved_jobs: nonnegative,
  utilization: fraction,
  employed_technicians: z.number().int().nonnegative(),
  productive_technician_fte: nonnegative,
  in_service_vehicles: z.number().int().nonnegative(),
  average_ticket: nonnegative,
});

export const DebtMovementSchema = z.strictObject({
  tranche_id: z.string().min(1),
  principal_begin: nonnegative,
  borrowing: nonnegative,
  cash_interest: nonnegative,
  principal_repayment: nonnegative,
  principal_end: nonnegative,
});

export const FinancialResultSchema = z.strictObject({
  service_revenue: nonnegative,
  other_revenue: nonnegative,
  revenue: nonnegative,
  service_variable_cost: nonnegative,
  tech_direct_labor: nonnegative,
  vehicle_direct_opex: nonnegative,
  other_direct_cost: nonnegative,
  cogs: nonnegative,
  gross_profit: finite,
  fixed_overhead: nonnegative,
  incremental_marketing: nonnegative,
  recruitment: nonnegative,
  custom_operating_expenses: nonnegative.optional(),
  operating_overhead: nonnegative,
  ebitda: finite,
  depreciation: nonnegative,
  amortization: nonnegative,
  ebit: finite,
  cash_interest: nonnegative,
  pretax_income: finite,
  cash_taxes: nonnegative,
  accounts_receivable_end: nonnegative,
  inventory_end: nonnegative,
  accounts_payable_end: nonnegative,
  nwc_begin: finite,
  nwc_end: finite,
  delta_nwc: finite,
  operating_cash_flow: finite,
  maintenance_capex: nonnegative,
  growth_capex: nonnegative,
  capex: nonnegative,
  new_borrowings: nonnegative,
  debt_principal: nonnegative,
  owner_distributions: nonnegative,
  cash_begin: finite,
  cash_change: finite,
  cash_end: finite,
  debt_begin: nonnegative,
  debt_end: nonnegative,
  unlevered_tax: nonnegative,
  unlevered_fcf: finite,
  debt_movements: z.array(DebtMovementSchema),
});

export const ValuationResultSchema = z.discriminatedUnion('status', [z.strictObject({
  status: z.literal('meaningful'),
  ttm_ebitda: positive,
  enterprise_multiple: positive,
  enterprise_value: positive,
  equity_value: finite,
}), z.strictObject({
  status: z.literal('nonpositive_ttm_ebitda'),
  ttm_ebitda: finite.max(0),
  enterprise_multiple: positive,
  enterprise_value: z.null(),
  equity_value: z.null(),
})]);

export const OpeningRecordSchema = z.strictObject({
  month: z.literal(0),
  is_opening_state: z.literal(true),
  operations: z.null(),
  valuation: z.null(),
  events: z.tuple([]),
  financials: z.strictObject({
  cash_end: finite,
  debt_end: nonnegative,
  accounts_receivable_end: nonnegative,
  inventory_end: nonnegative,
  accounts_payable_end: nonnegative,
}),
});

export const ForecastRecordSchema = z.strictObject({
  month: forwardMonth,
  is_opening_state: z.literal(false),
  operations: OperationsResultSchema,
  financials: FinancialResultSchema,
  valuation: ValuationResultSchema,
  events: z.array(ModelEventSchema),
}).superRefine((v, ctx) => {
  uniqueIds(v.events, ['events'], ctx);
  v.events.forEach((event, i) => { if (event.month !== v.month) ctx.addIssue({ code: 'custom', path: ['events', i, 'month'], message: 'Event month differs from record' }); });
});

export const PaybackSchema = z.discriminatedUnion('status', [z.strictObject({
  status: z.literal('reached'),
  month: forwardMonth,
  first_investment_month: forwardMonth,
  subsequent_reversal_month: z.union([forwardMonth, z.null()]),
}), z.strictObject({
  status: z.literal('not_reached'),
  month: z.null(),
  first_investment_month: forwardMonth,
  subsequent_reversal_month: z.null(),
}), z.strictObject({
  status: z.literal('not_applicable'),
  month: z.null(),
  first_investment_month: z.null(),
  subsequent_reversal_month: z.null(),
})]).superRefine((v, ctx) => {
  if (v.status === 'reached' && (v.month < v.first_investment_month || (v.subsequent_reversal_month !== null && v.subsequent_reversal_month <= v.month))) {
    ctx.addIssue({ code: 'custom', message: 'Payback/reversal months must follow investment/recovery' });
  }
});

export const PathMetricsSchema = z.strictObject({
  minimum_cash: finite,
  cash_trough_month: monthIndex,
  reserve_breach_months: z.array(forwardMonth),
  debt_peak: nonnegative,
  debt_peak_month: monthIndex,
  exit_equity_value: z.union([finite, z.null()]),
  exit_valuation_status: ValuationResultSchema.options[0].shape.status.or(ValuationResultSchema.options[1].shape.status),
  payback: PaybackSchema,
}).refine(v => (v.exit_valuation_status === 'meaningful') === (v.exit_equity_value !== null), 'Exit value nullability must match valuation status');

export const ScenarioPathSchema = z.strictObject({
  metadata: z.strictObject({
  scenario_id: z.string().min(1),
  name: z.string().min(1),
  model_version: z.literal('mvp-1.0'),
  input_fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  seed: z.union([z.number().int().nonnegative(), z.null()]),
}).readonly(),
  months: z.tuple([OpeningRecordSchema], ForecastRecordSchema).check(z.minLength(61), z.maxLength(61)),
  metrics: PathMetricsSchema,
}).superRefine((v, ctx) => { if (v.months.length !== 61) ctx.addIssue({ code: 'custom', path: ['months'], message: 'Expected exactly 61 states' }); v.months.forEach((row, i) => { if (row.month !== i) ctx.addIssue({ code: 'custom', path: ['months', i, 'month'], message: 'Expected ordered months 0–60' }); }); });

export const MetricKeySchema = z.union([z.literal('cash_end'), z.literal('ebitda'), z.literal('revenue'), z.literal('debt_end'), z.literal('utilization'), z.literal('ttm_ebitda'), z.literal('enterprise_value'), z.literal('equity_value'), z.literal('unlevered_fcf')]);

export const MonthlyDeltaSchema = z.strictObject({
  month: monthIndex,
  values: z.record(MetricKeySchema, z.union([finite, z.null()])),
  cumulative_incremental_unlevered_fcf: finite,
});

export const PathComparisonSchema = z.strictObject({
  baseline_id: z.literal('baseline'),
  scenario_id: z.string().min(1),
  monthly_deltas: z.array(MonthlyDeltaSchema).length(61),
  incremental_exit_equity_value: z.union([finite, z.null()]),
  payback: PaybackSchema,
}).superRefine((v, ctx) => {
  v.monthly_deltas.forEach((row, i) => { if (row.month !== i) ctx.addIssue({ code: 'custom', path: ['monthly_deltas', i, 'month'], message: 'Expected ordered months 0–60' }); });
});

export const QuantilesSchema = z.strictObject({
  p10: z.union([finite, z.null()]),
  p50: z.union([finite, z.null()]),
  p90: z.union([finite, z.null()]),
  mean: z.union([finite, z.null()]),
  valid_path_count: z.number().int().nonnegative(),
  unavailable_path_count: z.number().int().nonnegative(),
}).superRefine((v, ctx) => {
  const values = [v.p10, v.p50, v.p90, v.mean];
  if (v.valid_path_count === 0 ? values.some(n => n !== null) : values.some(n => n === null)) ctx.addIssue({ code: 'custom', message: 'Quantile nullability must match valid path count' });
  if (v.p10 !== null && v.p50 !== null && v.p90 !== null && !(v.p10 <= v.p50 && v.p50 <= v.p90)) ctx.addIssue({ code: 'custom', message: 'Expected p10 <= p50 <= p90' });
});

export const ProbabilitySchema = z.strictObject({
  value: z.union([fraction, z.null()]),
  valid_path_count: z.number().int().nonnegative(),
  unavailable_path_count: z.number().int().nonnegative(),
  unavailable_reason: z.union([z.literal('not_applicable'), z.literal('unavailable_valuation'), z.null()]),
}).superRefine((v, ctx) => {
  if (v.value === null ? v.unavailable_reason === null || v.valid_path_count !== 0 : v.unavailable_reason !== null || v.valid_path_count === 0) ctx.addIssue({ code: 'custom', message: 'Probability nullability, reason and denominator disagree' });
});

export const MonteCarloScenarioSchema = z.strictObject({
  monthly_percentiles: z.record(MetricKeySchema, z.array(QuantilesSchema).length(61)),
  monthly_probability_cash_below_reserve: z.array(ProbabilitySchema).length(61),
  path_risks: z.strictObject({
  probability_cash_below_reserve_any_month: ProbabilitySchema,
  probability_negative_exit_equity_delta: ProbabilitySchema,
  probability_payback_by_month_60: ProbabilitySchema,
}),
  terminal_distributions: z.strictObject({
  exit_equity_value: QuantilesSchema,
  incremental_exit_equity_value: QuantilesSchema,
}),
  payback: z.strictObject({
  probability_within_horizon: ProbabilitySchema,
  median_month_conditional_on_payback_or_null: finite.min(1).max(60).nullable(),
  not_reached_count: z.number().int().nonnegative(),
  not_applicable_count: z.number().int().nonnegative(),
}),
});

export const MonteCarloSummarySchema = z.strictObject({
  runs: z.number().int().min(2000).max(5000),
  seed: z.number().int().nonnegative(),
  distribution_parameters: DistributionParametersSchema,
  model_version: z.literal('mvp-1.0'),
  scenarios: z.record(z.string(), MonteCarloScenarioSchema),
  comparisons: z.record(z.string(), z.strictObject({
  paired_monthly_delta_percentiles: z.record(MetricKeySchema, z.array(QuantilesSchema).length(61)),
  paired_terminal_delta_percentiles: QuantilesSchema,
})),
});

export const ModelWarningSchema = z.strictObject({
  code: z.string().min(1),
  message: z.string().min(1),
  scenario_id: z.union([z.string().min(1), z.null()]),
  month: z.union([monthIndex, z.null()]),
});

export const SimulationResultSchema = z.strictObject({
  schema_version: z.literal('1.0'),
  contract_revision: z.literal(1),
  model_version: z.literal('mvp-1.0'),
  run_id: z.string().min(1),
  input_fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  company_id: z.string().min(1),
  horizon_months: z.literal(60),
  currency: z.literal('USD'),
  seed: z.union([z.number().int().nonnegative(), z.null()]),
  assumptions: z.strictObject({
  exit_multiple: positive,
  cash_reserve_floor: nonnegative,
  resolved: GlobalAssumptionsSchema,
  provenance: ProvenanceManifestSchema,
}),
  scenarios: z.record(z.string(), ScenarioPathSchema),
  comparisons: z.record(z.string(), PathComparisonSchema),
  monte_carlo: z.union([MonteCarloSummarySchema, z.null()]),
  warnings: z.array(ModelWarningSchema),
}).superRefine((v, ctx) => {
  const keys = Object.keys(v.scenarios);
  if (!keys.includes('baseline') || keys.length < 3) ctx.addIssue({ code: 'custom', path: ['scenarios'], message: 'Require baseline and two alternative paths' });
  const alternatives = keys.filter(id => id !== 'baseline').sort();
  if (JSON.stringify(Object.keys(v.comparisons).sort()) !== JSON.stringify(alternatives)) ctx.addIssue({ code: 'custom', path: ['comparisons'], message: 'Require one comparison per alternative' });
  if (v.monte_carlo === null ? v.seed !== null : v.seed !== v.monte_carlo.seed) ctx.addIssue({ code: 'custom', path: ['seed'], message: 'Seed must match run mode/MC summary' });
  for (const [id, path] of Object.entries(v.scenarios)) {
    if (path.metadata.scenario_id !== id || path.metadata.seed !== v.seed) ctx.addIssue({ code: 'custom', path: ['scenarios', id, 'metadata'], message: 'Scenario key/seed differs from metadata' });
    if (id === 'baseline' && path.metrics.payback.status !== 'not_applicable') ctx.addIssue({ code: 'custom', path: ['scenarios', id, 'metrics', 'payback'], message: 'Baseline payback must be not_applicable' });
  }
  for (const [id, comparison] of Object.entries(v.comparisons)) {
    if (comparison.scenario_id !== id) ctx.addIssue({ code: 'custom', path: ['comparisons', id, 'scenario_id'], message: 'Comparison key differs from scenario_id' });
  }
});

export const ApiErrorSchema = z.strictObject({
  error: z.strictObject({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.array(z.strictObject({
  path: z.string(),
  message: z.string().min(1),
})),
}),
});

// Checkpoint 1 internal interfaces. Derived activation/demand dates can exceed 60.
const futureMonth = z.number().int().nonnegative();
export const TechnicianCohortSchema = z.strictObject({
  id: z.string().min(1), decision_id: z.string().min(1).nullable(),
  stable_investment_key: z.string().min(1).nullable(), quantity: z.number().int().nonnegative(),
  employment_start_month: futureMonth, ramp_months: futureMonth,
  annual_loaded_cost_per_person: nonnegative,
}).refine(v => (v.decision_id === null) === (v.stable_investment_key === null), 'Cohort identities must be both null or both supplied');
export const VehicleCohortSchema = z.strictObject({
  id: z.string().min(1), decision_id: z.string().min(1).nullable(),
  stable_investment_key: z.string().min(1).nullable(), quantity: z.number().int().nonnegative(),
  in_service_month: futureMonth, annual_opex_per_vehicle: nonnegative,
}).refine(v => (v.decision_id === null) === (v.stable_investment_key === null), 'Cohort identities must be both null or both supplied');
export const CampaignDemandSchema = z.strictObject({
  id: z.string().min(1), decision_id: z.string().min(1), stable_investment_key: z.string().min(1),
  spend_month: forwardMonth, demand_month: z.number().int().positive(), potential_jobs: nonnegative,
}).refine(v => v.demand_month >= v.spend_month, 'Demand cannot precede spending');
export const OperationalStateSchema = z.strictObject({
  technician_cohorts: z.array(TechnicianCohortSchema), vehicle_cohorts: z.array(VehicleCohortSchema),
  pending_campaign_demand: z.array(CampaignDemandSchema),
}).superRefine((v, ctx) => {
  uniqueIds(v.technician_cohorts, ['technician_cohorts'], ctx);
  uniqueIds(v.vehicle_cohorts, ['vehicle_cohorts'], ctx);
  uniqueIds(v.pending_campaign_demand, ['pending_campaign_demand'], ctx);
});
export const MarketFactorsSchema = z.strictObject({
  demand_multiplier: nonnegative, ticket_multiplier: nonnegative, wage_multiplier: nonnegative,
  vehicle_opex_multiplier: nonnegative, overhead_multiplier: nonnegative,
  service_variable_cost_multiplier: nonnegative, other_revenue_multiplier: nonnegative,
  other_direct_cost_multiplier: nonnegative,
});
export const DecisionRiskSchema = z.strictObject({
  in_service_delay_months: futureMonth.nullable(), hiring_delay_months: futureMonth.nullable(),
  ramp_months: futureMonth.nullable(), lead_to_job_lag_months: futureMonth.nullable(),
  marketing_effectiveness_multiplier: nonnegative,
});
export const PathRisksSchema = z.strictObject({ by_stable_investment_key: z.record(z.string().min(1), DecisionRiskSchema) });
export const PurchaseTransitionSchema = z.strictObject({
  decision_id: z.string().min(1), stable_investment_key: z.string().min(1),
  quantity: z.number().int().nonnegative(), cost_per_unit: nonnegative,
  in_service_month: futureMonth, funding: FundingSchema,
});
export const EmploymentTransitionSchema = z.strictObject({
  decision_id: z.string().min(1), cohort_id: z.string().min(1), quantity: z.number().int().nonnegative(),
});
export const ServiceTransitionSchema = EmploymentTransitionSchema;
export const CampaignSpendSchema = z.strictObject({
  decision_id: z.string().min(1), stable_investment_key: z.string().min(1),
  spend_month: forwardMonth, amount: nonnegative, demand: CampaignDemandSchema,
});
export const EngineStateSchema = z.strictObject({ month: monthIndex, financial: FinancialStateSchema, operational: OperationalStateSchema });
export const GrowthAssetAdditionSchema = z.strictObject({ asset: DepreciableAssetSchema, category: z.literal('growth'),
  depreciation_life_months: z.number().int().min(1).max(600).optional() });
export const FinancialMonthInputsSchema = z.strictObject({
  tech_direct_labor: nonnegative, vehicle_direct_opex: nonnegative, other_revenue: nonnegative,
  other_direct_cost: nonnegative, fixed_overhead: nonnegative, service_variable_cost_rate: nonnegative,
  incremental_marketing: nonnegative, recruitment: nonnegative, maintenance_capex: nonnegative,
  custom_operating_expenses: nonnegative.optional(),
  growth_capex: nonnegative, new_debt_tranches: z.array(DebtTrancheSchema),
  asset_additions: z.array(GrowthAssetAdditionSchema), incremental_investment_outlay: nonnegative,
}).superRefine((v, ctx) => {
  uniqueIds(v.new_debt_tranches, ['new_debt_tranches'], ctx);
  uniqueIds(v.asset_additions.map(v => v.asset), ['asset_additions'], ctx);
});
export const FinancialStepResultSchema = z.strictObject({ financials: FinancialResultSchema, ending_financial_state: FinancialStateSchema });
export const MonthEventsSchema = z.strictObject({
  month: forwardMonth, purchases: z.array(PurchaseTransitionSchema),
  employment_starts: z.array(EmploymentTransitionSchema), vehicle_activations: z.array(ServiceTransitionSchema),
  campaign_spending: z.array(CampaignSpendSchema), campaign_demand: z.array(CampaignDemandSchema),
  employed_technicians: z.number().int().nonnegative(), productive_technician_fte: nonnegative,
  in_service_vehicles: z.number().int().nonnegative(), financial_inputs: FinancialMonthInputsSchema,
  ending_operational_state: OperationalStateSchema, events: z.array(ModelEventSchema),
}).superRefine((v, ctx) => {
  uniqueIds(v.events, ['events'], ctx);
  v.events.forEach((event, i) => {
    if (event.month !== v.month) ctx.addIssue({ code: 'custom', path: ['events', i, 'month'], message: 'Event month must match step month' });
  });
});

/** Explicit policy identifiers approved in issue #2; never schema defaults. */
export const ApprovedPoliciesSchema = z.strictObject({
  accounting_scope: z.literal('reconciled_pnl_cash_debt'),
  growth_reference: z.literal('month_minus_one_compounding'),
  existing_depreciation: z.literal('asset_schedule_only'),
  maintenance_depreciation: z.literal('spend_month_straight_line_60'),
  truck_depreciation: z.literal('in_service_straight_line_60'),
  new_debt_payments: z.literal('purchase_month_plus_one_beginning_balance_interest'),
  recruitment: z.literal('decision_start'), payroll: z.literal('full_from_employment'),
  marketing: z.literal('spend_month_plus_lag_no_compounding'),
  taxes: z.literal('positive_pretax_no_carryforward'), distributions: z.literal('zero'),
  valuation: z.literal('positive_ttm_only'),
  payback_outlay: z.literal('growth_recruitment_marketing_incremental_payroll'),
  payback_absolute_tolerance_usd: z.literal(0.000001),
  engine_absolute_tolerance_usd: z.literal(0.000001), engine_relative_tolerance: z.literal(0.000000000001),
  fixture_absolute_tolerance_usd: z.literal(0.0000001),
});
export const APPROVED_POLICIES = Object.freeze(ApprovedPoliciesSchema.parse({
  accounting_scope: 'reconciled_pnl_cash_debt', growth_reference: 'month_minus_one_compounding',
  existing_depreciation: 'asset_schedule_only', maintenance_depreciation: 'spend_month_straight_line_60',
  truck_depreciation: 'in_service_straight_line_60', new_debt_payments: 'purchase_month_plus_one_beginning_balance_interest',
  recruitment: 'decision_start', payroll: 'full_from_employment', marketing: 'spend_month_plus_lag_no_compounding',
  taxes: 'positive_pretax_no_carryforward', distributions: 'zero', valuation: 'positive_ttm_only',
  payback_outlay: 'growth_recruitment_marketing_incremental_payroll', payback_absolute_tolerance_usd: 1e-6,
  engine_absolute_tolerance_usd: 1e-6, engine_relative_tolerance: 1e-12, fixture_absolute_tolerance_usd: 1e-7,
}));
export const INTERFACE_REVISION = 'checkpoint-1-candidate-1' as const;

export function validatePathRisks(value: unknown, decisions: z.infer<typeof DecisionSchema>[]) {
  const risks = PathRisksSchema.parse(value);
  for (const [key, risk] of Object.entries(risks.by_stable_investment_key)) {
    const decision = decisions.find(v => v.stable_investment_key === key);
    if (!decision) throw new Error(`Unknown investment risk key: ${key}`);
    if (decision.type !== 'purchase_trucks' && risk.in_service_delay_months !== null) throw new Error(`Irrelevant service delay: ${key}`);
    if (decision.type !== 'hire_technicians' && (risk.hiring_delay_months !== null || risk.ramp_months !== null)) throw new Error(`Irrelevant hire override: ${key}`);
    if (decision.type !== 'increase_marketing' && (risk.lead_to_job_lag_months !== null || risk.marketing_effectiveness_multiplier !== 1)) throw new Error(`Irrelevant marketing override: ${key}`);
  }
  return risks;
}

export const NEUTRAL_MARKET_FACTORS = Object.freeze(MarketFactorsSchema.parse({
  demand_multiplier: 1, ticket_multiplier: 1, wage_multiplier: 1, vehicle_opex_multiplier: 1,
  overhead_multiplier: 1, service_variable_cost_multiplier: 1, other_revenue_multiplier: 1, other_direct_cost_multiplier: 1,
}));

/** Additive API discovery contract; engine interfaces remain at accepted revision. */
export const MetricDefinitionSchema = z.strictObject({
  key: MetricKeySchema, label: z.string().min(1),
  unit: z.enum(['USD', 'USD/month', 'decimal_ratio']),
  kind: z.enum(['ending_balance', 'monthly_flow', 'trailing_12_month_flow', 'ratio', 'valuation']),
  description: z.string().min(1), available_at_opening: z.boolean(),
});
export const ModelMetadataSchema = z.strictObject({
  schema_version: z.literal('1.0'), model_version: z.literal('mvp-1.0'), contract_revision: z.literal(1),
  interface_revision: z.literal(INTERFACE_REVISION), horizon_months: z.literal(60), currency: z.literal('USD'),
  decision_types: z.tuple([z.literal('purchase_trucks'), z.literal('hire_technicians'), z.literal('increase_marketing')]),
  decision_extensions: z.strictObject({ version: z.literal(FLEXIBLE_DECISION_VERSION),
    types: z.tuple([z.literal('operating_expense'), z.literal('purchase_asset')]), status: z.literal('candidate') }).optional(),
  metrics: z.array(MetricDefinitionSchema).length(9),
  readiness: z.strictObject({ deterministic: z.boolean(), monte_carlo: z.boolean() }),
  data_notice: z.string().min(1), limitations: z.array(z.string().min(1)).min(1),
}).superRefine((v, ctx) => {
  const keys = new Set(v.metrics.map(metric => metric.key));
  if (keys.size !== 9) ctx.addIssue({ code: 'custom', path: ['metrics'], message: 'Require each metric exactly once' });
});
