import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { loadMonteCarloConfig } from '../src/lib/server/monte-carlo/config.ts';
import { MCConfigSchema } from '../src/lib/server/monte-carlo/contracts.ts';
import { CompanyInputSchema, DeterministicRequestSchema } from '../src/lib/server/schemas.ts';
import { sample_shared_path, sample_action_risks } from '../src/lib/server/engine/monte_carlo.ts';
import { simulate_deterministic, simulate_months } from '../src/lib/server/engine/scenarios.ts';
import { risk_stream, sample_normal } from '../src/lib/server/engine/sampling.ts';
import { aggregate_paired_paths } from '../src/lib/server/engine/aggregation.ts';
const load = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const company = CompanyInputSchema.parse(load('../data/synthetic_hvac_company.json'));
const request = DeterministicRequestSchema.parse(load('../contracts/example-request.json'));
const config = loadMonteCarloConfig();

test('forecast blocks follow independent AR arithmetic and bounded correlated mappings', () => {
  const draw = risk_stream(42, 0, 'macro');
  const shared = sample_shared_path(config, 42, 0, 6);
  let state = 0;
  for (let month = 0; month < 60; month++) {
    if (month % 12 === 0) state = Math.max(-3, Math.min(3, .6 * state + .8 * sample_normal(draw)));
    assert.equal(shared.macro[month], state);
    assert.equal(shared.monthly_market_factors[month].demand_multiplier, Math.max(.7, Math.min(1.3, Math.exp(.08 * state))));
    assert.equal(shared.monthly_valuation_multiples[month], Math.max(4, Math.min(8, 6 + .5 * state)));
    assert.equal(shared.monthly_market_factors[month].wage_multiplier, shared.monthly_market_factors[0].wage_multiplier);
  }
  assert.deepEqual(shared, sample_shared_path(config, 42, 0, 6));
  assert.notDeepEqual(shared, sample_shared_path(config, 42, 1, 6));
  assert.notDeepEqual(shared, sample_shared_path(config, 43, 0, 6));
});

test('matched action draws ignore scenario/decision identities, order and unrelated additions', () => {
  const truck = request.scenarios.find(s => s.id === 'trucks_only')!.decisions;
  const combined = request.scenarios.find(s => s.id === 'combined_expansion')!.decisions;
  const risks = sample_action_risks(config, 42, 3, combined);
  assert.deepEqual(risks.by_stable_investment_key['demo-trucks'], sample_action_risks(config, 42, 3, truck).by_stable_investment_key['demo-trucks']);
  assert.deepEqual(risks, sample_action_risks(config, 42, 3, [...combined].reverse()));
  for (let run = 0; run < 100; run++) {
    const shared = sample_shared_path(config, 42, run, 6);
    for (const factors of shared.monthly_market_factors) {
      assert.ok(factors.demand_multiplier >= .7 && factors.demand_multiplier <= 1.3);
      assert.ok(factors.ticket_multiplier >= .9 && factors.ticket_multiplier <= 1.1);
      assert.ok(factors.wage_multiplier >= .95 && factors.wage_multiplier <= 1.05);
      assert.ok(factors.vehicle_opex_multiplier >= .9 && factors.vehicle_opex_multiplier <= 1.2);
    }
  }
});

test('zero-width sampled real paths exactly reproduce all deterministic months/metrics at non-default multiples', () => {
  const zero = structuredClone(config);
  zero.macro.innovation_spread = 0;
  for (const mapping of Object.values(zero.mappings)) mapping.loading = 0;
  for (const spec of [zero.shared.wage, zero.shared.vehicle_opex, zero.decision.marketing_effectiveness]) spec.min = spec.mode = spec.max = 1;
  for (const spec of [zero.decision.ramp_offset, zero.decision.hiring_delay_offset, zero.decision.truck_service_delay_offset]) spec.probabilities = spec.values.map(v => v === 0 ? 1 : 0);
  MCConfigSchema.parse(zero);
  for (const multiple of [3.25, 6, 9]) {
    const expected = simulate_deterministic(company, { ...request, exit_multiple: multiple });
    const resolved = structuredClone(company);
    resolved.global_assumptions.valuation_multiple = multiple;
    resolved.global_assumptions.liquidity_floor = request.reserve_floor_usd;
    for (const scenario of request.scenarios) {
      const actual = simulate_months(resolved, scenario.decisions, { scenario,
        ...sample_shared_path(zero, 42, 0, multiple), path_risks: sample_action_risks(zero, 42, 0, scenario.decisions),
        seed: 42, input_fingerprint: 'a'.repeat(64) });
      assert.deepEqual(actual.months, expected.scenarios[scenario.id].months);
      assert.deepEqual(actual.metrics, expected.scenarios[scenario.id].metrics);
    }
  }
});

test('sampled real paths preserve accounting identities and pairing under scenario reordering', () => {
  const shared = sample_shared_path(config, 42, 7, 6);
  const execute = (scenarios: typeof request.scenarios) => Object.fromEntries(scenarios.map(scenario => [scenario.id,
    simulate_months(company, scenario.decisions, { scenario, ...shared,
      path_risks: sample_action_risks(config, 42, 7, scenario.decisions), seed:42, input_fingerprint:'b'.repeat(64) })]));
  const actual = execute(request.scenarios);
  assert.deepEqual(actual, execute([...request.scenarios].reverse()));
  for (const path of Object.values(actual)) for (const row of path.months) if (!row.is_opening_state) {
    const f = row.financials;
    assert.ok(Math.abs(f.cash_end - f.cash_begin - f.cash_change) < 1e-6);
    assert.ok(Math.abs(f.debt_end - f.debt_begin - f.new_borrowings + f.debt_principal) < 1e-6);
    assert.ok(row.operations.completed_jobs <= row.operations.service_capacity_jobs);
  }
});

test('MC-01/03/04/05/06/07/08: saved real pairs reproduce aggregates and full-path reserve risks', () => {
  const scenarios = request.scenarios.map(s => ({ ...s, decisions: [] }));
  const execute = () => Array.from({ length: 4 }, (_, run) => {
    const shared = sample_shared_path(config, 42, run, 6);
    return Object.fromEntries(scenarios.map(scenario => [scenario.id, simulate_months(company, [], {
      scenario, ...shared, path_risks: { by_stable_investment_key: {} }, seed: 42, input_fingerprint: 'c'.repeat(64),
    })]));
  });
  const saved = execute();
  const reserve = 450000;
  const result = aggregate_paired_paths(saved, reserve);
  assert.deepEqual(result, aggregate_paired_paths(execute(), reserve));
  const higher = aggregate_paired_paths(saved, reserve + 100000);
  for (const [id, scenario] of Object.entries(result.scenarios)) {
    const direct = saved.filter(pair => pair[id].months.slice(1).some(row => row.financials.cash_end < reserve)).length / saved.length;
    assert.equal(scenario.path_risks.probability_cash_below_reserve_any_month.value, direct);
    assert.ok(higher.scenarios[id].path_risks.probability_cash_below_reserve_any_month.value! >= direct);
  }
  for (const comparison of Object.values(result.comparisons)) {
    for (const series of Object.values(comparison.paired_monthly_delta_percentiles)) for (const q of series) {
      if (q.valid_path_count > 0) assert.equal(q.p50, 0);
    }
  }
  const inspect = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    const row = value as Record<string, unknown>;
    if ('value' in row && row.value !== null) assert.ok(Number(row.value) >= 0 && Number(row.value) <= 1);
    if ('p10' in row && row.p10 !== null) assert.ok(Number(row.p10) <= Number(row.p50) && Number(row.p50) <= Number(row.p90));
    Object.values(row).forEach(inspect);
  };
  inspect(result);
});

test('real negative-TTM paths remain unavailable and do not dilute eligible exit probabilities', () => {
  const shared = sample_shared_path(config, 42, 0, 6);
  const execute = (depressed: boolean) => Object.fromEntries(request.scenarios.map(scenario => [scenario.id,
    simulate_months(company, scenario.decisions, { scenario, ...shared,
      monthly_market_factors: shared.monthly_market_factors.map(f => depressed ? { ...f, demand_multiplier: .1, ticket_multiplier: .5 } : f),
      path_risks: sample_action_risks(config, 42, 0, scenario.decisions), seed: 42, input_fingerprint: 'd'.repeat(64),
    })]));
  const normal = execute(false), depressed = execute(true);
  const result = aggregate_paired_paths([normal, depressed], request.reserve_floor_usd);
  for (const scenario of Object.values(result.scenarios)) {
    assert.equal(scenario.terminal_distributions.exit_equity_value.valid_path_count, 1);
    assert.equal(scenario.terminal_distributions.exit_equity_value.unavailable_path_count, 1);
  }
  assert.equal(result.scenarios.trucks_only.path_risks.probability_negative_exit_equity_delta.valid_path_count, 1);
  assert.equal(result.scenarios.trucks_only.path_risks.probability_negative_exit_equity_delta.unavailable_path_count, 1);
});

