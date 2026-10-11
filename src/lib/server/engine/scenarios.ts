import type { ForecastRecord, MetricKey, MonthlyDelta, OpeningRecord, PathComparison, PathMetrics, Payback, ScenarioPath } from '../../../../contracts/contracts.ts';
import { APPROVED_POLICIES, PathComparisonSchema, PathMetricsSchema, ScenarioPathSchema } from '../schemas.ts';
import { requireModel } from './invariants.ts';
import { randomUUID } from 'node:crypto';
import type { CompanyInput, Decision, DeterministicRequest, MarketFactors, PathRisks, SimulationResult } from '../../../../contracts/contracts.ts';
import { CompanyInputSchema, DeterministicRequestSchema, EngineStateSchema, MarketFactorsSchema,
  ScenarioInputSchema, SimulationResultSchema, NEUTRAL_MARKET_FACTORS, validatePathRisks } from '../schemas.ts';
import { fingerprintRequest, fingerprintScenario } from '../fingerprint.ts';
import { create_initial_state } from './fixtures.ts';
import { schedule_month } from './event_scheduler.ts';
import { calculate_operations } from './operations.ts';
import { calculate_financials } from './financials.ts';
import { calculate_valuation } from './valuation.ts';
import { MCValuationMultiplesSchema } from '../monte-carlo/contracts.ts';

/** Undiscounted recovery after actual investment; later reversal is reported separately. */
export function calculate_payback(incrementalUfcf: readonly number[], investmentOutlays: readonly number[]): Payback {
  requireModel(incrementalUfcf.length === investmentOutlays.length && incrementalUfcf.length <= 60,
    'Payback needs aligned monthly flows/outlays for at most 60 months');
  requireModel(incrementalUfcf.every(Number.isFinite)
    && investmentOutlays.every(value => Number.isFinite(value) && value >= 0), 'Invalid payback flow/outlay');
  const tolerance = APPROVED_POLICIES.payback_absolute_tolerance_usd;
  const firstIndex = investmentOutlays.findIndex(amount => amount > tolerance);
  if (firstIndex < 0) return { status: 'not_applicable', month: null, first_investment_month: null, subsequent_reversal_month: null };
  let cumulative = 0;
  let recovered: number | null = null;
  let reversed: number | null = null;
  incrementalUfcf.forEach((amount, i) => {
    cumulative += amount;
    requireModel(Number.isFinite(cumulative), 'Cumulative investment cash flow overflow');
    if (i < firstIndex) return;
    if (recovered === null && cumulative >= -tolerance) recovered = i + 1;
    else if (recovered !== null && reversed === null && cumulative < -tolerance) reversed = i + 1;
  });
  return recovered === null
    ? { status: 'not_reached', month: null, first_investment_month: firstIndex + 1, subsequent_reversal_month: null }
    : { status: 'reached', month: recovered, first_investment_month: firstIndex + 1, subsequent_reversal_month: reversed };
}

/** Opening balances participate in stock minima/maxima; reserve breaches are forward months only. */
export function calculate_path_metrics(
  months: [OpeningRecord, ...ForecastRecord[]], reserveFloor: number, payback: Payback,
): PathMetrics {
  requireModel(months.length === 61 && months.every((row, i) => row.month === i), 'Metrics need ordered months 0..60');
  requireModel(Number.isFinite(reserveFloor) && reserveFloor >= 0, 'Invalid reserve floor');
  let cashTrough: OpeningRecord | ForecastRecord = months[0];
  let debtPeak: OpeningRecord | ForecastRecord = months[0];
  for (const row of months) {
    requireModel(Number.isFinite(row.financials.cash_end) && Number.isFinite(row.financials.debt_end), 'Nonfinite stock metric');
    if (row.financials.cash_end < cashTrough.financials.cash_end) cashTrough = row;
    if (row.financials.debt_end > debtPeak.financials.debt_end) debtPeak = row;
  }
  const exit = months[60] as ForecastRecord;
  return PathMetricsSchema.parse({ minimum_cash: cashTrough.financials.cash_end, cash_trough_month: cashTrough.month,
    reserve_breach_months: months.slice(1).filter(row => row.financials.cash_end < reserveFloor).map(row => row.month),
    debt_peak: debtPeak.financials.debt_end, debt_peak_month: debtPeak.month,
    exit_equity_value: exit.valuation.equity_value, exit_valuation_status: exit.valuation.status, payback });
}

function metric(row: OpeningRecord | ForecastRecord, key: MetricKey): number | null {
  if (key === 'cash_end' || key === 'debt_end') return row.financials[key];
  if (row.is_opening_state) return null;
  if (key === 'utilization') return row.operations.utilization;
  if (key === 'ttm_ebitda' || key === 'enterprise_value' || key === 'equity_value') return row.valuation[key];
  return row.financials[key];
}

const metrics: MetricKey[] = ['cash_end', 'ebitda', 'revenue', 'debt_end', 'utilization', 'ttm_ebitda',
  'enterprise_value', 'equity_value', 'unlevered_fcf'];

/** Backend comparisons only; no financing flows enter incremental project recovery. */
export function compare_paths(baselineValue: ScenarioPath, scenarioValue: ScenarioPath): PathComparison {
  const baseline = ScenarioPathSchema.parse(baselineValue);
  const scenario = ScenarioPathSchema.parse(scenarioValue);
  requireModel(baseline.metadata.scenario_id === 'baseline', 'Comparison requires baseline path');
  requireModel(baseline.metadata.model_version === scenario.metadata.model_version
    && baseline.metadata.seed === scenario.metadata.seed, 'Comparison paths must use matching model/seed');
  requireModel(JSON.stringify(baseline.months[0].financials) === JSON.stringify(scenario.months[0].financials),
    'Comparison paths must share opening balances');
  let cumulative = 0;
  const monthly: MonthlyDelta[] = scenario.months.map((row, i) => {
    const base = baseline.months[i];
    const values = Object.fromEntries(metrics.map(key => {
      const a = metric(row, key), b = metric(base, key);
      return [key, a === null || b === null ? null : a - b];
    })) as Record<MetricKey, number | null>;
    if (!row.is_opening_state && !base.is_opening_state) {
      const delta = row.financials.unlevered_fcf - base.financials.unlevered_fcf;
      cumulative += delta;
    }
    return { month: i, values, cumulative_incremental_unlevered_fcf: cumulative };
  });
  const exit = monthly[60].values.equity_value;
  return PathComparisonSchema.parse({ baseline_id: 'baseline', scenario_id: scenario.metadata.scenario_id,
    // Runner derives payback from paired UFCF and actual scheduler outlays, not statement differences.
    monthly_deltas: monthly, incremental_exit_equity_value: exit, payback: scenario.metrics.payback });
}

/** Execution context, not a new HTTP contract or risk distribution configuration. */
export interface ResolvedPathInputs {
  scenario: { id: string; name: string };
  monthly_market_factors: readonly MarketFactors[];
  /** MC execution extension; omission preserves the accepted deterministic context. */
  monthly_valuation_multiples?: readonly number[];
  path_risks: PathRisks;
  input_fingerprint: string;
  seed: number | null;
}

function runPath(company: CompanyInput, decisions: Decision[], inputs: ResolvedPathInputs) {
  const scenario = ScenarioInputSchema.parse({ ...inputs.scenario, decisions });
  requireModel(scenario.id !== 'baseline' || decisions.length === 0, 'Baseline cannot contain decisions');
  requireModel(inputs.monthly_market_factors.length === 60, 'Runner needs 60 explicit monthly market factors');
  const factors = inputs.monthly_market_factors.map(value => MarketFactorsSchema.parse(value));
  const multiples = MCValuationMultiplesSchema.parse(inputs.monthly_valuation_multiples
    ?? Array.from({ length: 60 }, () => company.global_assumptions.valuation_multiple));
  const risks = validatePathRisks(inputs.path_risks, decisions);
  let state = create_initial_state(company);
  const initial = state.financial;
  const months: [OpeningRecord, ...ForecastRecord[]] = [{ month: 0, is_opening_state: true,
    operations: null, valuation: null, events: [], financials: { cash_end: initial.cash,
      debt_end: initial.debt_tranches.reduce((sum, t) => sum + t.principal, 0),
      accounts_receivable_end: initial.accounts_receivable, inventory_end: initial.inventory,
      accounts_payable_end: initial.accounts_payable } }];
  const history: { ebitda: number }[] = [];
  const outlays: number[] = [];
  for (let month = 1; month <= 60; month++) {
    const events = schedule_month(company, scenario, month, risks, state, factors[month - 1]);
    const operations = calculate_operations(company, state, events, factors[month - 1]);
    const step = calculate_financials(company, state, operations, events);
    state = EngineStateSchema.parse({ month, financial: step.ending_financial_state,
      operational: events.ending_operational_state });
    history.push(step.financials);
    outlays.push(events.financial_inputs.incremental_investment_outlay);
    months.push({ month, is_opening_state: false, operations, financials: step.financials,
      valuation: calculate_valuation({ ...company, global_assumptions: {
        ...company.global_assumptions, valuation_multiple: multiples[month - 1],
      } }, history, state), events: events.events });
  }
  const path = ScenarioPathSchema.parse({ metadata: { scenario_id: scenario.id, name: scenario.name,
    model_version: company.model_version, input_fingerprint: inputs.input_fingerprint, seed: inputs.seed },
    months, metrics: calculate_path_metrics(months, company.global_assumptions.liquidity_floor, calculate_payback([], [])) });
  return { path, outlays };
}

function finalizePath(path: ScenarioPath, baseline: ScenarioPath, outlays: number[], reserveFloor: number): ScenarioPath {
  const flows = path.months.slice(1).map((row, i) => (row as ForecastRecord).financials.unlevered_fcf
    - (baseline.months[i + 1] as ForecastRecord).financials.unlevered_fcf);
  const payback = path.metadata.scenario_id === 'baseline' ? calculate_payback([], []) : calculate_payback(flows, outlays);
  path.metrics = calculate_path_metrics(path.months, reserveFloor, payback);
  const addEvent = (month: number, kind: 'cash_trough' | 'debt_peak' | 'reserve_breach' | 'payback' | 'payback_reversal' | 'exit', label: string) => {
    if (month === 0) return; // opening state has no events, including calculated milestones
    const row = path.months[month] as ForecastRecord;
    row.events.push({ id: `milestone:${kind}:${month}`, month, decision_id: null,
      type: 'calculated_milestone', kind, label, provenance: 'derived' });
  };
  addEvent(path.metrics.cash_trough_month, 'cash_trough', 'Lowest ending cash');
  addEvent(path.metrics.debt_peak_month, 'debt_peak', 'Highest ending debt');
  for (const month of path.metrics.reserve_breach_months) addEvent(month, 'reserve_breach', 'Ending cash below reserve');
  if (payback.status === 'reached') {
    addEvent(payback.month, 'payback', 'First incremental unlevered cash-flow recovery');
    if (payback.subsequent_reversal_month !== null) addEvent(payback.subsequent_reversal_month, 'payback_reversal', 'Incremental recovery later reversed');
  }
  addEvent(60, 'exit', 'Month-60 modeled exit valuation');
  return ScenarioPathSchema.parse(path);
}

/** Single engine path. Resolved inputs are fixed per path; this function never samples randomness. */
export function simulate_months(initial_company: CompanyInput, decisions: Decision[], stochastic_inputs: ResolvedPathInputs, horizon = 60): ScenarioPath {
  requireModel(horizon === 60, 'MVP horizon must be 60');
  const company = CompanyInputSchema.parse(initial_company);
  const result = runPath(company, decisions, stochastic_inputs);
  const baseline = stochastic_inputs.scenario.id === 'baseline' ? result.path : runPath(company, [], {
    ...stochastic_inputs, scenario: { id: 'baseline', name: 'Baseline' }, path_risks: { by_stable_investment_key: {} },
  }).path;
  return finalizePath(result.path, baseline, result.outlays, company.global_assumptions.liquidity_floor);
}

/** Validated deterministic orchestration; API adapters only validate/serialize this result. */
export function simulate_deterministic(companyValue: CompanyInput, requestValue: DeterministicRequest, runId: string = randomUUID()): SimulationResult {
  const original = CompanyInputSchema.parse(companyValue);
  const request = DeterministicRequestSchema.parse(requestValue);
  const requestHash = fingerprintRequest(original, request, APPROVED_POLICIES);
  const company = structuredClone(original);
  company.global_assumptions.valuation_multiple = request.exit_multiple;
  company.global_assumptions.liquidity_floor = request.reserve_floor_usd;
  for (const [field, source] of [['valuation_multiple', 'exit_multiple'], ['liquidity_floor', 'reserve_floor_usd']] as const) {
    const pointer = `/global_assumptions/${field}`;
    company.provenance[pointer] = { kind: 'user_input', unit: company.provenance[pointer].unit, source: `Resolved request.${source}` };
  }
  const raw = new Map<string, ReturnType<typeof runPath>>();
  const sorted = [...request.scenarios].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  for (const scenario of sorted) raw.set(scenario.id, runPath(company, scenario.decisions, {
    scenario: { id: scenario.id, name: scenario.name }, monthly_market_factors: Array.from({ length: 60 }, () => NEUTRAL_MARKET_FACTORS),
    monthly_valuation_multiples: Array.from({ length: 60 }, () => request.exit_multiple),
    path_risks: { by_stable_investment_key: {} }, seed: null,
    input_fingerprint: fingerprintScenario(original, request, APPROVED_POLICIES, scenario.id),
  }));
  const baseline = raw.get('baseline')!.path;
  const scenarios: Record<string, ScenarioPath> = {};
  for (const [id, result] of raw) scenarios[id] = finalizePath(result.path, baseline, result.outlays, request.reserve_floor_usd);
  const comparisons: Record<string, PathComparison> = {};
  for (const [id, path] of Object.entries(scenarios)) if (id !== 'baseline') comparisons[id] = compare_paths(scenarios.baseline, path);
  const warnings: SimulationResult['warnings'] = [];
  for (const [id, path] of Object.entries(scenarios)) {
    for (const row of path.months) {
      if (row.financials.cash_end < 0) warnings.push({ code: 'negative_cash', message: 'Negative modeled cash; no automatic funding applied', scenario_id: id, month: row.month });
      if (row.financials.cash_end < request.reserve_floor_usd) warnings.push({ code: 'reserve_breach', message: 'Ending cash below requested reserve', scenario_id: id, month: row.month });
      if (!row.is_opening_state && row.valuation.status === 'nonpositive_ttm_ebitda') warnings.push({ code: 'nonpositive_ttm_ebitda', message: 'Positive EBITDA multiple valuation unavailable', scenario_id: id, month: row.month });
    }
    if (path.metrics.payback.status === 'reached' && path.metrics.payback.subsequent_reversal_month !== null) warnings.push({
      code: 'payback_reversal', message: 'Cumulative incremental UFCF fell below zero after first recovery', scenario_id: id,
      month: path.metrics.payback.subsequent_reversal_month });
  }
  return SimulationResultSchema.parse({ schema_version: '1.0', contract_revision: 1, model_version: company.model_version,
    run_id: runId, input_fingerprint: requestHash, company_id: company.id, horizon_months: 60, currency: 'USD', seed: null,
    assumptions: { exit_multiple: request.exit_multiple, cash_reserve_floor: request.reserve_floor_usd,
      resolved: company.global_assumptions, provenance: company.provenance }, scenarios, comparisons, monte_carlo: null, warnings });
}
