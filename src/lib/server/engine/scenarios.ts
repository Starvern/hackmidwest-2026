import type { ForecastRecord, MetricKey, MonthlyDelta, OpeningRecord, PathComparison, PathMetrics, Payback, ScenarioPath } from '../../../../contracts/contracts.ts';
import { APPROVED_POLICIES, PathComparisonSchema, PathMetricsSchema, ScenarioPathSchema } from '../schemas.ts';
import { requireModel } from './invariants.ts';

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
