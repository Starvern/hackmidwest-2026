/** Pure aggregation primitives. No probabilities are inferred from percentile trajectories. */
import type { Quantiles, Probability, Payback, MetricKey, ScenarioPath, ForecastRecord, MonteCarloScenario } from '../../../../contracts/contracts.ts';
import { QuantilesSchema, ProbabilitySchema, PaybackSchema, MonteCarloScenarioSchema } from '../schemas.ts';

function quantile(sorted: readonly number[], p: number): number {
  const position = (sorted.length - 1) * p;
  const left = Math.floor(position);
  const right = Math.ceil(position);
  const low = sorted[left], high = sorted[right];
  if (low === high) return low;
  const fraction = position - left;
  const span = high - low;
  const value = Number.isFinite(span) ? low + span * fraction : low * (1 - fraction) + high * fraction;
  return Math.max(low, Math.min(high, value));
}

export function summarize_quantiles(samples: readonly (number | null)[]): Quantiles {
  const valid = samples.filter((v): v is number => v !== null);
  if (!valid.every(Number.isFinite)) throw new Error('Nonfinite aggregation sample; do not silently drop invalid paths');
  valid.sort((a, b) => a - b);
  const count = valid.length;
  // Divide before summing to avoid overflow when finite samples are large.
  const mean = count ? valid.reduce((sum, value) => sum + value / count, 0) : null;
  return QuantilesSchema.parse({ p10: count ? quantile(valid, 0.1) : null,
    p50: count ? quantile(valid, 0.5) : null, p90: count ? quantile(valid, 0.9) : null,
    mean, valid_path_count: count, unavailable_path_count: samples.length - count });
}

export function summarize_probability(samples: readonly (boolean | null)[], applicable = true): Probability {
  if (!samples.every(v => v === null || typeof v === 'boolean')) throw new Error('Invalid probability sample');
  if (!applicable) return ProbabilitySchema.parse({ value: null, valid_path_count: 0,
    unavailable_path_count: samples.length, unavailable_reason: 'not_applicable' });
  const valid = samples.filter((v): v is boolean => v !== null);
  return ProbabilitySchema.parse({ value: valid.length ? valid.filter(Boolean).length / valid.length : null,
    valid_path_count: valid.length, unavailable_path_count: samples.length - valid.length,
    unavailable_reason: valid.length ? null : 'unavailable_valuation' });
}

/** Inapplicable paths are excluded from eligibility, never counted as failed investments. */
export function summarize_payback(samples: readonly Payback[]) {
  samples = samples.map(p => PaybackSchema.parse(p));
  const reached = samples.filter(p => p.status === 'reached');
  const eligible = samples.filter(p => p.status !== 'not_applicable');
  const probability = eligible.length ? ProbabilitySchema.parse({
    value: reached.length / eligible.length, valid_path_count: eligible.length,
    unavailable_path_count: samples.length - eligible.length, unavailable_reason: null,
  }) : summarize_probability(samples.map(() => null), false);
  return {
    probability_within_horizon: probability,
    median_month_conditional_on_payback_or_null: summarize_quantiles(reached.map(p => p.month)).p50,
    reached_count: reached.length,
    not_reached_count: samples.filter(p => p.status === 'not_reached').length,
    not_applicable_count: samples.length - eligible.length,
    subsequent_reversal_count: reached.filter(p => p.subsequent_reversal_month !== null).length,
  };
}

const METRICS: MetricKey[] = ['cash_end', 'ebitda', 'revenue', 'debt_end', 'utilization',
  'ttm_ebitda', 'enterprise_value', 'equity_value', 'unlevered_fcf'];

function path_metric(path: ScenarioPath, month: number, key: MetricKey): number | null {
  const row = path.months[month];
  if (key === 'cash_end' || key === 'debt_end') return row.financials[key];
  if (row.is_opening_state) return null;
  if (key === 'utilization') return row.operations.utilization;
  if (key === 'ttm_ebitda' || key === 'enterprise_value' || key === 'equity_value') return row.valuation[key];
  return row.financials[key];
}

/** Compact paired observations only; input iterator can release expanded engine paths each run.
 * Outer MC metadata/config serialization belongs to the pending P3 contract extension.
 */
export function aggregate_paired_paths(pairedPaths: Iterable<Record<string, ScenarioPath>>, reserve: number) {
  if (!Number.isFinite(reserve) || reserve < 0) throw new Error('Invalid cash reserve');
  const series = () => Object.fromEntries(METRICS.map(key => [key,
    Array.from({ length: 61 }, () => [] as (number | null)[])])) as Record<MetricKey, (number | null)[][]>;
  const accumulators = new Map<string, {
    levels: ReturnType<typeof series>; deltas: ReturnType<typeof series>;
    breaches: boolean[][]; anyBreach: boolean[]; negativeExit: (boolean | null)[];
    paybacks: Payback[]; exit: (number | null)[]; exitDelta: (number | null)[];
  }>();
  let ids: string[] | undefined;
  let runs = 0;
  for (const paired of pairedPaths) {
    const keys = Object.keys(paired).sort();
    if (!keys.includes('baseline')) throw new Error('Paired paths require baseline');
    if (ids === undefined) {
      ids = keys;
      for (const id of keys) accumulators.set(id, { levels: series(), deltas: series(),
        breaches: Array.from({ length: 61 }, () => []), anyBreach: [], negativeExit: [], paybacks: [], exit: [], exitDelta: [] });
    } else if (JSON.stringify(ids) !== JSON.stringify(keys)) throw new Error('Every run requires the same scenario identities');
    const baseline = paired.baseline;
    for (const id of keys) {
      const path = paired[id];
      if (path.metadata.scenario_id !== id || path.months.length !== 61 || !path.months[0].is_opening_state
        || path.months.some((m, index) => m.month !== index || (index > 0 && m.is_opening_state))
        || path.metadata.seed !== baseline.metadata.seed || path.metadata.model_version !== baseline.metadata.model_version
        || JSON.stringify(path.months[0].financials) !== JSON.stringify(baseline.months[0].financials)) {
        throw new Error('Invalid paired path identity, timeline or common context');
      }
      const a = accumulators.get(id)!;
      for (let month = 0; month <= 60; month++) {
        for (const key of METRICS) {
          const value = path_metric(path, month, key);
          const base = path_metric(baseline, month, key);
          if ((value !== null && !Number.isFinite(value)) || (base !== null && !Number.isFinite(base))) throw new Error('Nonfinite paired observation');
          a.levels[key][month].push(value);
          a.deltas[key][month].push(value === null || base === null ? null : value - base);
        }
        a.breaches[month].push(path.months[month].financials.cash_end < reserve);
      }
      a.anyBreach.push(path.months.slice(1).some(m => m.financials.cash_end < reserve));
      const exit = (path.months[60] as ForecastRecord).valuation.equity_value;
      const baseExit = (baseline.months[60] as ForecastRecord).valuation.equity_value;
      const delta = id === 'baseline' || exit === null || baseExit === null ? null : exit - baseExit;
      a.exit.push(exit); a.exitDelta.push(delta);
      a.negativeExit.push(delta === null ? null : delta < 0);
      if (id === 'baseline' && path.metrics.payback.status !== 'not_applicable') throw new Error('Baseline payback must be inapplicable');
      a.paybacks.push(path.metrics.payback);
    }
    runs++;
  }
  if (runs === 0) throw new Error('Cannot aggregate empty paired paths');
  const scenarios: Record<string, MonteCarloScenario> = {};
  const comparisons: Record<string, { paired_monthly_delta_percentiles: Record<MetricKey, Quantiles[]>;
    paired_terminal_delta_percentiles: Quantiles }> = {};
  const payback_counts: Record<string, { reached_count: number; subsequent_reversal_count: number }> = {};
  const summarizeSeries = (input: ReturnType<typeof series>) => Object.fromEntries(METRICS.map(key => [key,
    input[key].map(samples => summarize_quantiles(samples))])) as Record<MetricKey, Quantiles[]>;
  for (const [id, a] of accumulators) {
    const { reached_count, subsequent_reversal_count, ...payback } = summarize_payback(a.paybacks);
    scenarios[id] = MonteCarloScenarioSchema.parse({
      monthly_percentiles: summarizeSeries(a.levels),
      monthly_probability_cash_below_reserve: a.breaches.map(b => summarize_probability(b)),
      path_risks: {
        probability_cash_below_reserve_any_month: summarize_probability(a.anyBreach),
        probability_negative_exit_equity_delta: summarize_probability(a.negativeExit, id !== 'baseline'),
        probability_payback_by_month_60: payback.probability_within_horizon,
      },
      terminal_distributions: { exit_equity_value: summarize_quantiles(a.exit), incremental_exit_equity_value: summarize_quantiles(a.exitDelta) },
      payback,
    });
    payback_counts[id] = { reached_count, subsequent_reversal_count };
    if (id !== 'baseline') comparisons[id] = { paired_monthly_delta_percentiles: summarizeSeries(a.deltas),
      paired_terminal_delta_percentiles: summarize_quantiles(a.exitDelta) };
  }
  return { runs, scenarios, comparisons, payback_counts };
}
