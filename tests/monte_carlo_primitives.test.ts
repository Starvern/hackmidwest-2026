import assert from 'node:assert/strict';
import test from 'node:test';
import { risk_stream, sample_normal, sample_triangular, sample_discrete, resolve_month_offset } from '../src/lib/server/engine/sampling.ts';
import { summarize_quantiles, summarize_probability, summarize_payback, aggregate_paired_paths } from '../src/lib/server/engine/aggregation.ts';
import { readFileSync } from 'node:fs';
import type { ScenarioPath, ForecastRecord } from '../contracts/contracts.ts';

test('digest risk streams repeat and separate runs/risks/action keys with open uniform bounds', () => {
  const take = (draw: () => number) => Array.from({ length: 1000 }, draw);
  const expected = take(risk_stream(42, 0, 'macro'));
  assert.deepEqual(take(risk_stream(42, 0, 'macro')), expected);
  assert.ok(expected.every(n => n > 0 && n < 1));
  for (const draw of [risk_stream(42, 1, 'macro'), risk_stream(42, 0, 'wage'),
    risk_stream(42, 0, 'macro', 'action-a'), risk_stream(42, 0, 'macro', 'action-b')]) assert.notDeepEqual(take(draw), expected);
  // Unrelated draws cannot advance another risk's stream.
  take(risk_stream(42, 0, 'hiring', 'unrelated'));
  assert.deepEqual(take(risk_stream(42, 0, 'macro')), expected);
  assert.throws(() => risk_stream(-1, 0, 'macro'));
});
test('triangular inverse CDF has independently calculated values, fixed-width identity and bounds', () => {
  assert.equal(sample_triangular(() => 0.125, 0, 1, 2), 0.5);
  assert.equal(sample_triangular(() => 0.875, 0, 1, 2), 1.5);
  assert.equal(sample_triangular(() => { throw new Error('must not draw'); }, 1, 1, 1), 1);
  const draw = risk_stream(1, 0, 'vehicle');
  for (let i = 0; i < 1000; i++) { const n = sample_triangular(draw, 0.9, 1, 1.2); assert.ok(n >= 0.9 && n <= 1.2); }
  assert.throws(() => sample_triangular(draw, 2, 1, 0));
});
test('discrete CDF supports deterministic zero offsets, rejects bad weights and never upper-clips dates', () => {
  assert.equal(sample_discrete(() => 0.1, [-1,0,1], [0.2,0.6,0.2]), -1);
  assert.equal(sample_discrete(() => 0.5, [-1,0,1], [0.2,0.6,0.2]), 0);
  assert.equal(sample_discrete(() => 0.9, [-1,0,1], [0.2,0.6,0.2]), 1);
  assert.equal(sample_discrete(() => 0.9, [-1,0,1], [0,1,0]), 0);
  assert.throws(() => sample_discrete(() => 0.5, [0,1], [0.2,0.2]));
  assert.equal(resolve_month_offset(0, -1), 0);
  assert.equal(resolve_month_offset(60, 2), 62);
  assert.throws(() => resolve_month_offset(Number.MAX_SAFE_INTEGER, 1));
});
test('Box–Muller standard-normal arithmetic and invalid uniform guards', () => {
  const values = [Math.exp(-0.5), 0.5];
  assert.ok(Math.abs(sample_normal(() => values.shift()!) + 1) < 1e-12);
  for (const n of [0,1,NaN,Infinity]) assert.throws(() => sample_normal(() => n));
});
test('quantiles interpolate independently, distinguish mean/median and preserve unavailable counts', () => {
  const samples = [null, 0, 10, 20, 100];
  const result = summarize_quantiles(samples);
  assert.ok(Math.abs(result.p10! - 3) < 1e-12);
  assert.ok(Math.abs(result.p90! - 76) < 1e-12);
  assert.equal(result.p50, 15);
  assert.equal(result.mean, 32.5);
  assert.equal(result.valid_path_count, 4);
  assert.equal(result.unavailable_path_count, 1);
  assert.deepEqual(samples, [null,0,10,20,100]);
  assert.equal(summarize_quantiles([null,null]).p50, null);
  assert.equal(summarize_quantiles([4]).p10, 4);
  assert.equal(summarize_quantiles([0.75,0.75]).p10, 0.75);
  assert.throws(() => summarize_quantiles([Infinity]));
});
test('probabilities preserve unavailable denominators and baseline inapplicability', () => {
  assert.deepEqual(summarize_probability([true,false,null]), { value: 0.5, valid_path_count: 2,
    unavailable_path_count: 1, unavailable_reason: null });
  assert.equal(summarize_probability([null,null]).value, null);
  assert.equal(summarize_probability([false], false).unavailable_reason, 'not_applicable');
  const cash = [[100,90],[100,110],[100,130]];
  const p = (reserve: number) => summarize_probability(cash.map(path => path.some(n => n < reserve))).value!;
  assert.ok(p(95) <= p(115));
  assert.equal(p(90), 0);
});
test('payback median is conditional on recovery and reversal/counts remain explicit', () => {
  const result = summarize_payback([
    { status: 'reached', month: 10, first_investment_month: 1, subsequent_reversal_month: 12 },
    { status: 'not_reached', month: null, first_investment_month: 1, subsequent_reversal_month: null },
    { status: 'not_applicable', month: null, first_investment_month: null, subsequent_reversal_month: null },
  ]);
  assert.equal(result.probability_within_horizon.value, 0.5);
  assert.equal(result.median_month_conditional_on_payback_or_null, 10);
  assert.equal(result.subsequent_reversal_count, 1);
  assert.equal(summarize_payback([]).median_month_conditional_on_payback_or_null, null);
});

test('paired aggregation forms deltas before quantiles, handles unavailable pairs and forward risk separately', () => {
  const reference = JSON.parse(readFileSync(new URL('../contracts/example-result.json', import.meta.url), 'utf8'));
  const runs = [0,1].map(() => structuredClone(reference.scenarios) as Record<string, ScenarioPath>);
  for (const run of runs) for (const path of Object.values(run)) {
    path.months[0].financials.cash_end = 0; // synthetic aggregation observations, not accounting forecasts
    for (const row of path.months.slice(1)) row.financials.cash_end = 100;
  }
  (runs[0].baseline.months[60] as ForecastRecord).valuation.equity_value = 100;
  (runs[1].baseline.months[60] as ForecastRecord).valuation.equity_value = 1000;
  (runs[0].trucks_only.months[60] as ForecastRecord).valuation.equity_value = 110;
  (runs[1].trucks_only.months[60] as ForecastRecord).valuation.equity_value = 900;
  (runs[1].combined_expansion.months[60] as ForecastRecord).valuation.equity_value = null;
  runs[0].trucks_only.months[1].financials.cash_end = 40;
  const result = aggregate_paired_paths(runs, 50);
  assert.equal(result.runs, 2);
  assert.equal(result.scenarios.baseline.monthly_probability_cash_below_reserve[0].value, 1);
  assert.equal(result.scenarios.baseline.path_risks.probability_cash_below_reserve_any_month.value, 0);
  assert.equal(result.scenarios.trucks_only.path_risks.probability_cash_below_reserve_any_month.value, 0.5);
  assert.equal(result.comparisons.trucks_only.paired_terminal_delta_percentiles.p50, -45);
  assert.ok(Math.abs(result.comparisons.trucks_only.paired_terminal_delta_percentiles.p10! + 89) < 1e-10);
  assert.equal(result.scenarios.trucks_only.path_risks.probability_negative_exit_equity_delta.value, 0.5);
  assert.equal(result.scenarios.combined_expansion.path_risks.probability_negative_exit_equity_delta.unavailable_path_count, 1);
  assert.equal(result.scenarios.baseline.path_risks.probability_negative_exit_equity_delta.value, null);
  assert.equal(result.scenarios.baseline.monthly_percentiles.ebitda[0].valid_path_count, 0);
  assert.equal(result.scenarios.baseline.monthly_percentiles.cash_end[0].valid_path_count, 2);
  assert.throws(() => aggregate_paired_paths([], 50));
  assert.throws(() => aggregate_paired_paths([runs[0], { baseline: runs[1].baseline }], 50));
});
