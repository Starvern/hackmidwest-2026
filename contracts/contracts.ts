/** OperatorOS shared vocabulary. Runtime constraints: README.md; authority: spec v1.0. */
export type ProvenanceKind = 'synthetic_historical' | 'user_input' | 'derived' | 'assumed' | 'simulated';
export interface Provenance { kind: ProvenanceKind; source: string; unit: string }
export type ProvenanceManifest = Record<string, Provenance>;
export interface Funding { debt_fraction: number; annual_interest_rate: number; term_months: number }
interface DecisionBase { id: string; stable_investment_key: string; start_month: number; provenance: ProvenanceManifest }
export interface PurchaseTrucks extends DecisionBase {
  type: 'purchase_trucks'; quantity: number; cost_per_unit: number;
  in_service_delay_months: number; funding: Funding;
}
export interface HireTechnicians extends DecisionBase {
  type: 'hire_technicians'; quantity: number; fully_loaded_annual_cost_per_person: number;
  hiring_delay_months: number; ramp_months: number; one_time_hiring_cost_per_person: number;
}
export interface IncreaseMarketing extends DecisionBase {
  type: 'increase_marketing'; duration_months: number; extra_spend_per_month: number;
  lead_to_job_lag_months: number; incremental_cost_per_booked_job: number;
}
export type Decision = PurchaseTrucks | HireTechnicians | IncreaseMarketing;
export interface ScenarioInput { id: string; name: string; decisions: Decision[] }
export interface DebtTranche {
  id: string; principal: number; annual_interest_rate: number; remaining_term_months: number;
  monthly_principal: number; first_repayment_month: number; amortization_policy: 'level_principal';
}
export interface DepreciableAsset {
  id: string; cost_basis: number; accumulated_depreciation: number;
  monthly_depreciation: number; remaining_life_months: number; in_service_month: number;
}
export interface FinancialState {
  cash: number; accounts_receivable: number; inventory: number; accounts_payable: number;
  debt_tranches: DebtTranche[]; depreciable_assets: DepreciableAsset[];
}
export interface HistoricalMonth {
  month_of_year: number; service_jobs: number; service_revenue: number; other_revenue: number;
  revenue: number; tech_direct_labor: number; vehicle_direct_opex: number;
  service_variable_cost: number; other_direct_cost: number; cogs: number;
  operating_overhead: number; ebitda: number;
}
export interface OperationsInput {
  technicians: number; vehicles: number; working_days_per_month: number;
  max_jobs_per_tech_per_day: number; max_jobs_per_vehicle_per_day: number;
  base_monthly_job_demand: number; average_ticket: number; non_service_revenue_per_month: number;
  technician_loaded_cost_per_year: number; vehicle_opex_per_year: number;
  service_variable_cost_rate: number; non_service_direct_cost_per_month: number;
  fixed_overhead_per_month: number; baseline_marketing_in_overhead: number;
}
export interface DistributionParameter {
  family: 'fixed' | 'bounded_normal' | 'triangular' | 'discrete' | 'latent_ar1';
  parameters: Record<string, number | number[]>;
}
export type DistributionParameters = Record<string, DistributionParameter>;
export interface GlobalAssumptions {
  organic_demand_growth: number; wage_inflation: number; overhead_inflation: number;
  ticket_growth: number; other_revenue_growth: number; other_direct_cost_growth: number;
  collection_delay_months: number; payment_delay_months: number;
  ap_eligible_cost_categories: ('service_variable_cost' | 'other_direct_cost' | 'tech_direct_labor' | 'vehicle_direct_opex')[];
  constant_inventory: number; existing_depreciation_per_year: number;
  maintenance_capex_per_year: number; truck_useful_life_months: 60;
  tax_rate: number; liquidity_floor: number; valuation_multiple: number; seasonality: number[];
  distribution_parameters: DistributionParameters;
}
export interface CompanyInput {
  id: string; name: string; industry: 'HVAC'; currency: 'USD'; model_version: 'mvp-1.0';
  valuation_month: 60; horizon_months: 60; forecast_start_month_of_year: 1;
  historical_months: HistoricalMonth[]; opening_financial_state: FinancialState;
  operations: OperationsInput; global_assumptions: GlobalAssumptions; provenance: ProvenanceManifest;
}
export interface DeterministicRequest {
  schema_version: '1.0'; company_id: string; horizon_months: 60;
  reserve_floor_usd: number; exit_multiple: number; scenarios: ScenarioInput[];
}
export interface MonteCarloRequest extends DeterministicRequest {
  monte_carlo: { enabled: true; runs: number; seed: number };
}
export interface ModelEvent {
  id: string; month: number; decision_id: string | null;
  type: 'scheduled' | 'simulated_operational' | 'calculated_milestone';
  kind: 'truck_purchase' | 'truck_in_service' | 'recruitment' | 'employment_start' |
    'ramp_complete' | 'campaign_spend' | 'campaign_demand' | 'campaign_end' |
    'cash_trough' | 'reserve_breach' | 'payback' | 'payback_reversal' | 'debt_peak' | 'exit';
  label: string; provenance: ProvenanceKind;
}
export interface OperationsResult {
  service_demand_jobs: number; technician_capacity_jobs: number; vehicle_capacity_jobs: number;
  service_capacity_jobs: number; completed_jobs: number; unserved_jobs: number; utilization: number;
  employed_technicians: number; productive_technician_fte: number; in_service_vehicles: number;
  average_ticket: number;
}
export interface DebtMovement {
  tranche_id: string; principal_begin: number; borrowing: number; cash_interest: number;
  principal_repayment: number; principal_end: number;
}
export interface FinancialResult {
  service_revenue: number; other_revenue: number; revenue: number;
  service_variable_cost: number; tech_direct_labor: number; vehicle_direct_opex: number;
  other_direct_cost: number; cogs: number; gross_profit: number;
  fixed_overhead: number; incremental_marketing: number; recruitment: number;
  operating_overhead: number; ebitda: number; depreciation: number; amortization: number;
  ebit: number; cash_interest: number; pretax_income: number; cash_taxes: number;
  accounts_receivable_end: number; inventory_end: number; accounts_payable_end: number;
  nwc_begin: number; nwc_end: number; delta_nwc: number; operating_cash_flow: number;
  maintenance_capex: number; growth_capex: number; capex: number;
  new_borrowings: number; debt_principal: number; owner_distributions: number;
  cash_begin: number; cash_change: number; cash_end: number; debt_begin: number; debt_end: number;
  unlevered_tax: number; unlevered_fcf: number; debt_movements: DebtMovement[];
}
export type ValuationResult = {
  status: 'meaningful'; ttm_ebitda: number; enterprise_multiple: number;
  enterprise_value: number; equity_value: number;
} | {
  status: 'nonpositive_ttm_ebitda'; ttm_ebitda: number; enterprise_multiple: number;
  enterprise_value: null; equity_value: null;
};
export interface OpeningRecord {
  month: 0; is_opening_state: true; operations: null; valuation: null; events: [];
  financials: { cash_end: number; debt_end: number; accounts_receivable_end: number; inventory_end: number; accounts_payable_end: number };
}
export interface ForecastRecord {
  month: number; is_opening_state: false; operations: OperationsResult;
  financials: FinancialResult; valuation: ValuationResult; events: ModelEvent[];
}
export type Payback = {
  status: 'reached'; month: number; first_investment_month: number; subsequent_reversal_month: number | null;
} | {
  status: 'not_reached'; month: null; first_investment_month: number; subsequent_reversal_month: null;
} | {
  status: 'not_applicable'; month: null; first_investment_month: null; subsequent_reversal_month: null;
};
export interface PathMetrics {
  minimum_cash: number; cash_trough_month: number; reserve_breach_months: number[];
  debt_peak: number; debt_peak_month: number; exit_equity_value: number | null;
  exit_valuation_status: ValuationResult['status']; payback: Payback;
}
export interface ScenarioPath {
  readonly metadata: Readonly<{ scenario_id: string; name: string; model_version: string; input_fingerprint: string; seed: number | null }>;
  months: [OpeningRecord, ...ForecastRecord[]]; metrics: PathMetrics;
}
export type MetricKey = 'cash_end' | 'ebitda' | 'revenue' | 'debt_end' | 'utilization' |
  'ttm_ebitda' | 'enterprise_value' | 'equity_value' | 'unlevered_fcf';
export interface MonthlyDelta {
  month: number; values: Record<MetricKey, number | null>;
  cumulative_incremental_unlevered_fcf: number;
}
export interface PathComparison {
  baseline_id: 'baseline'; scenario_id: string; monthly_deltas: MonthlyDelta[];
  incremental_exit_equity_value: number | null; payback: Payback;
}
export interface Quantiles {
  p10: number | null; p50: number | null; p90: number | null; mean: number | null;
  valid_path_count: number; unavailable_path_count: number;
}
export interface Probability {
  value: number | null; valid_path_count: number; unavailable_path_count: number;
  unavailable_reason: 'not_applicable' | 'unavailable_valuation' | null;
}
export interface MonteCarloScenario {
  monthly_percentiles: Record<MetricKey, Quantiles[]>;
  monthly_probability_cash_below_reserve: Probability[];
  path_risks: {
    probability_cash_below_reserve_any_month: Probability;
    probability_negative_exit_equity_delta: Probability;
    probability_payback_by_month_60: Probability;
  };
  terminal_distributions: { exit_equity_value: Quantiles; incremental_exit_equity_value: Quantiles };
  payback: { probability_within_horizon: Probability; median_month_conditional_on_payback_or_null: number | null; not_reached_count: number; not_applicable_count: number };
}
export interface MonteCarloSummary {
  runs: number; seed: number; distribution_parameters: DistributionParameters; model_version: string;
  scenarios: Record<string, MonteCarloScenario>;
  comparisons: Record<string, { paired_monthly_delta_percentiles: Record<MetricKey, Quantiles[]>; paired_terminal_delta_percentiles: Quantiles }>;
}
export interface ModelWarning { code: string; message: string; scenario_id: string | null; month: number | null }
export interface SimulationResult {
  schema_version: '1.0'; contract_revision: 1; model_version: 'mvp-1.0'; run_id: string;
  input_fingerprint: string; company_id: string; horizon_months: 60; currency: 'USD'; seed: number | null;
  assumptions: { exit_multiple: number; cash_reserve_floor: number; resolved: GlobalAssumptions; provenance: ProvenanceManifest };
  scenarios: Record<string, ScenarioPath>; comparisons: Record<string, PathComparison>;
  monte_carlo: MonteCarloSummary | null; warnings: ModelWarning[];
}
export interface ApiError {
  error: { code: string; message: string; details: { path: string; message: string }[] };
}
