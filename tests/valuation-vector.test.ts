import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { ForecastRecord } from '../contracts/contracts.ts';
import { CompanyInputSchema, DeterministicRequestSchema, NEUTRAL_MARKET_FACTORS } from '../src/lib/server/schemas.ts';
import { simulate_deterministic, simulate_months, type ResolvedPathInputs } from '../src/lib/server/engine/scenarios.ts';

const company = CompanyInputSchema.parse(JSON.parse(readFileSync(new URL('../data/synthetic_hvac_company.json', import.meta.url), 'utf8')));
const request = DeterministicRequestSchema.parse(JSON.parse(readFileSync(new URL('../contracts/example-request.json', import.meta.url), 'utf8')));
const context = (id = 'baseline'): ResolvedPathInputs => ({ scenario: { id, name: id },
  monthly_market_factors: Array.from({ length: 60 }, () => ({ ...NEUTRAL_MARKET_FACTORS })),
  path_risks: { by_stable_investment_key: {} }, input_fingerprint: 'a'.repeat(64), seed: 42 });

test('monthly multiples affect only current valuation; accounting, TTM and paired payback remain identical', () => {
  const scenario = request.scenarios.find(s => s.id === 'combined_expansion')!;
  const inputs = context(scenario.id);
  const neutral = simulate_months(company, scenario.decisions, inputs);
  const multiples: number[] = Array.from({ length: 60 }, (_, i) => i === 0 ? 3 : i === 12 ? 9 : 6);
  const original = structuredClone({ company, inputs, multiples, decisions: scenario.decisions });
  const changed = simulate_months(company, scenario.decisions, { ...inputs, monthly_valuation_multiples: multiples });
  for (let month = 1; month <= 60; month++) {
    const a = changed.months[month] as ForecastRecord, b = neutral.months[month] as ForecastRecord;
    assert.deepEqual(a.financials, b.financials);
    assert.deepEqual(a.operations, b.operations);
    assert.deepEqual(a.events, b.events);
    assert.equal(a.valuation.ttm_ebitda, b.valuation.ttm_ebitda);
    assert.equal(a.valuation.enterprise_multiple, multiples[month - 1]);
    if (a.valuation.status === 'meaningful') {
      assert.equal(a.valuation.enterprise_value, a.valuation.ttm_ebitda * multiples[month - 1]);
      assert.equal(a.valuation.equity_value, a.valuation.enterprise_value! - a.financials.debt_end + a.financials.cash_end);
    }
  }
  assert.deepEqual(changed.metrics.payback, neutral.metrics.payback);
  assert.deepEqual({ company, inputs, multiples, decisions: scenario.decisions }, original);
  const future = [...multiples]; future[59] = 20;
  const futurePath = simulate_months(company, scenario.decisions, { ...inputs, monthly_valuation_multiples: future });
  assert.deepEqual(futurePath.months.slice(0, 60), changed.months.slice(0, 60));
});

test('explicit constant non-default multiples reproduce deterministic paths and preserve legacy execution', () => {
  const resolved = structuredClone(company);
  resolved.global_assumptions.valuation_multiple = 3.25;
  const deterministic = simulate_deterministic(company, { ...request, exit_multiple: 3.25 });
  for (const scenario of request.scenarios) {
    const inputs = context(scenario.id);
    const legacy = simulate_months(resolved, scenario.decisions, inputs);
    const explicit = simulate_months(resolved, scenario.decisions, { ...inputs, monthly_valuation_multiples: Array(60).fill(3.25) });
    assert.deepEqual(explicit, legacy);
    assert.deepEqual(explicit.months, deterministic.scenarios[scenario.id].months);
    assert.deepEqual(explicit.metrics, deterministic.scenarios[scenario.id].metrics);
  }
});

test('valuation vectors reject missing entries, nonpositive and nonfinite values before execution', () => {
  for (const vector of [[], Array(59).fill(6), Array(61).fill(6),
    [0, ...Array(59).fill(6)], [-1, ...Array(59).fill(6)], [NaN, ...Array(59).fill(6)], [Infinity, ...Array(59).fill(6)]]) {
    assert.throws(() => simulate_months(company, [], { ...context(), monthly_valuation_multiples: vector }));
  }
});
