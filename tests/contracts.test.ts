import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as S from '../src/lib/server/schemas.ts';
import { inputUnit, scalarLeaves } from '../src/lib/server/validation.ts';
import { fingerprintRequest, fingerprintScenario, sha256Canonical } from '../src/lib/server/fingerprint.ts';

const publishedFixture = JSON.parse(readFileSync(new URL('../data/synthetic_hvac_company.json', import.meta.url), 'utf8'));
function company() {
  return S.CompanyInputSchema.parse(structuredClone(publishedFixture));
}
function provenance<T extends object>(input: T) {
  return { ...input, provenance: Object.fromEntries(scalarLeaves(input).map(([pointer, value]) => [pointer, {
    kind: 'user_input' as const, source: 'Contract boundary test input', unit: inputUnit(pointer, value),
  }])) };
}
function truck(id = 'truck-a') {
  return provenance({ id, stable_investment_key: 'shared-trucks', type: 'purchase_trucks' as const,
    start_month: 1, quantity: 2, cost_per_unit: 60000, in_service_delay_months: 1,
    funding: { debt_fraction: 0.5, annual_interest_rate: 0.08, term_months: 48 } });
}
function request() {
  return { schema_version: '1.0' as const, company_id: publishedFixture.id, horizon_months: 60 as const,
    reserve_floor_usd: 150000, exit_multiple: 6,
    scenarios: [{ id: 'baseline', name: 'Baseline', decisions: [] },
      { id: 'trucks', name: 'Trucks', decisions: [truck()] },
      { id: 'combined', name: 'Combined', decisions: [truck('truck-b'), provenance({ id: 'truck-c', stable_investment_key: 'extra-trucks', type: 'purchase_trucks' as const, start_month: 2, quantity: 0, cost_per_unit: 0, in_service_delay_months: 0, funding: { debt_fraction: 0, annual_interest_rate: 0, term_months: 1 } })] }] };
}

test('published P2 fixture passes authoritative structure/provenance validation', () => {
  assert.equal(company().historical_months.length, 12);
  assert.equal(publishedFixture.provenance['/operations/working_days_per_month'].unit, 'days/month');
});

test('company rejects unknown fields, nonfinite numbers, history gaps, missing or wrong units', () => {
  for (const mutate of [
    (v: ReturnType<typeof company>) => Object.assign(v, { invented: true }),
    (v: ReturnType<typeof company>) => { v.operations.average_ticket = Infinity; },
    (v: ReturnType<typeof company>) => { v.historical_months.pop(); },
    (v: ReturnType<typeof company>) => { v.historical_months[1].month_of_year = 1; },
    (v: ReturnType<typeof company>) => { delete v.provenance['/id']; },
    (v: ReturnType<typeof company>) => { v.provenance['/operations/average_ticket'].unit = 'USD'; },
    (v: ReturnType<typeof company>) => { v.opening_financial_state.debt_tranches.push(v.opening_financial_state.debt_tranches[0]); },
    (v: ReturnType<typeof company>) => { v.global_assumptions.tax_rate = 2; },
  ]) { const value = company(); mutate(value); assert.equal(S.CompanyInputSchema.safeParse(value).success, false); }
});

test('decision bounds and discriminated fields reject malformed values without coercion', () => {
  for (const value of [
    { ...truck(), quantity: -1 }, { ...truck(), quantity: 1.5 }, { ...truck(), quantity: '2' },
    { ...truck(), start_month: 0 }, { ...truck(), start_month: 61 }, { ...truck(), cost_per_unit: NaN },
    { ...truck(), in_service_delay_months: -1 }, { ...truck(), extra_spend_per_month: 100 },
    { ...truck(), funding: { debt_fraction: 1.1, annual_interest_rate: 0.08, term_months: 48 } },
    { ...truck(), funding: { debt_fraction: 0, annual_interest_rate: 0, term_months: 0 } },
  ]) assert.equal(S.DecisionSchema.safeParse(value).success, false);
  const marketing = provenance({ id: 'm', stable_investment_key: 'm', type: 'increase_marketing', start_month: 60,
    duration_months: 1, extra_spend_per_month: 0, lead_to_job_lag_months: 100, incremental_cost_per_booked_job: 1 });
  assert.equal(S.DecisionSchema.safeParse(marketing).success, true);
  assert.equal(S.DecisionSchema.safeParse({ ...marketing, incremental_cost_per_booked_job: 0 }).success, false);
});

test('requests enforce empty unique baseline, alternatives, IDs, investment reuse and MC separation', () => {
  assert.ok(S.DeterministicRequestSchema.safeParse(request()).success);
  const conflict = request(); conflict.scenarios[2].decisions[0].quantity = 3;
  const duplicate = request(); duplicate.scenarios[1].decisions.push(truck());
  const baseline = request(); baseline.scenarios[0].decisions.push(truck());
  const scenarioId = request(); scenarioId.scenarios[2].id = 'trucks';
  for (const value of [conflict, duplicate, baseline, scenarioId,
    { ...request(), scenarios: request().scenarios.slice(1) }, { ...request(), reserve_floor_usd: -1 },
    { ...request(), exit_multiple: 0 }, { ...request(), monte_carlo: { enabled: true, runs: 2000, seed: 0 } },
  ]) assert.equal(S.DeterministicRequestSchema.safeParse(value).success, false);
  assert.equal(S.MonteCarloRequestSchema.safeParse({ ...request(), monte_carlo: { enabled: true, runs: 2000, seed: 0 } }).success, true);
  for (const mc of [{ enabled: false, runs: 2000, seed: 0 }, { enabled: true, runs: 1999, seed: 0 },
    { enabled: true, runs: 5001, seed: 0 }, { enabled: true, runs: 2000, seed: -1 },
    { enabled: true, runs: 2000.5, seed: 0 }]) {
    assert.equal(S.MonteCarloRequestSchema.safeParse({ ...request(), monte_carlo: mc }).success, false);
  }
  assert.throws(() => fingerprintRequest(company(), { ...request(), monte_carlo: { enabled: true, runs: 2000, seed: 0 } }, S.APPROVED_POLICIES), /distribution manifest/);
});

test('internal contracts preserve out-of-horizon dates and growth-only asset ownership', () => {
  assert.ok(S.VehicleCohortSchema.safeParse({ id: 'v', decision_id: 'd', stable_investment_key: 'k', quantity: 1,
    in_service_month: 160, annual_opex_per_vehicle: 0 }).success);
  assert.ok(S.CampaignDemandSchema.safeParse({ id: 'c', decision_id: 'd', stable_investment_key: 'k',
    spend_month: 60, demand_month: 160, potential_jobs: 1 }).success);
  assert.equal(S.MonthEventsSchema.safeParse({ month: 0 }).success, false);
  const asset = company().opening_financial_state.depreciable_assets[0];
  assert.equal(S.GrowthAssetAdditionSchema.safeParse({ asset, category: 'maintenance' }).success, false);
  assert.equal(S.GrowthAssetAdditionSchema.safeParse({ asset, category: 'growth' }).success, true);
  assert.ok(S.validatePathRisks({ by_stable_investment_key: {} }, request().scenarios[1].decisions));
  const risk = { in_service_delay_months: 0, hiring_delay_months: null, ramp_months: null,
    lead_to_job_lag_months: null, marketing_effectiveness_multiplier: 1 };
  assert.throws(() => S.validatePathRisks({ by_stable_investment_key: { unknown: risk } }, []), /Unknown/);
  assert.throws(() => S.validatePathRisks({ by_stable_investment_key: { 'shared-trucks': { ...risk, hiring_delay_months: 1 } } }, [truck()]), /Irrelevant/);
  assert.equal(S.DecisionRiskSchema.safeParse({ ...risk, in_service_delay_months: 0.5 }).success, false);
  assert.equal(S.MarketFactorsSchema.safeParse({ ...S.NEUTRAL_MARKET_FACTORS, demand_multiplier: -1 }).success, false);
});

// Structural validator test data only: these zero-valued records are not forecasts or product fixtures.
function structuralPath() {
  const financials = Object.fromEntries(Object.keys(S.FinancialResultSchema.shape).map(key => [key, key === 'debt_movements' ? [] : 0]));
  const operations = Object.fromEntries(Object.keys(S.OperationsResultSchema.shape).map(key => [key, 0]));
  const months = [{ month: 0, is_opening_state: true, operations: null, valuation: null, events: [],
    financials: { cash_end: 0, debt_end: 0, accounts_receivable_end: 0, inventory_end: 0, accounts_payable_end: 0 } },
    ...Array.from({ length: 60 }, (_, i) => ({ month: i + 1, is_opening_state: false, operations, financials,
      valuation: { status: 'nonpositive_ttm_ebitda', ttm_ebitda: 0, enterprise_multiple: 6, enterprise_value: null, equity_value: null }, events: [] }))];
  return { metadata: { scenario_id: 'baseline', name: 'Schema test', model_version: 'mvp-1.0', input_fingerprint: 'a'.repeat(64), seed: null },
    months, metrics: { minimum_cash: 0, cash_trough_month: 0, reserve_breach_months: [], debt_peak: 0, debt_peak_month: 0,
      exit_equity_value: null, exit_valuation_status: 'nonpositive_ttm_ebitda',
      payback: { status: 'not_applicable', month: null, first_investment_month: null, subsequent_reversal_month: null } } };
}
test('paths require opening-only month 0 followed by exactly 60 complete ordered states', () => {
  assert.ok(S.ScenarioPathSchema.safeParse(structuralPath()).success);
  const short = structuralPath(); short.months.pop();
  const unordered = structuralPath(); unordered.months[2].month = 1;
  const openingFlows = structuralPath(); Object.assign(openingFlows.months[0].financials, { revenue: 0 });
  const unavailable = structuralPath(); Object.assign(unavailable.months[1].valuation!, { equity_value: 0 });
  for (const v of [short, unordered, openingFlows, unavailable]) assert.equal(S.ScenarioPathSchema.safeParse(v).success, false);
  assert.equal(S.PaybackSchema.safeParse({ status: 'reached', month: 1, first_investment_month: 2, subsequent_reversal_month: null }).success, false);
  assert.equal(S.PaybackSchema.safeParse({ status: 'reached', month: 2, first_investment_month: 2, subsequent_reversal_month: 3 }).success, true);
});

test('risk nulls, denominators and ordered quantiles remain explicit', () => {
  assert.ok(S.ProbabilitySchema.safeParse({ value: null, valid_path_count: 0, unavailable_path_count: 2000, unavailable_reason: 'not_applicable' }).success);
  assert.equal(S.ProbabilitySchema.safeParse({ value: 0, valid_path_count: 0, unavailable_path_count: 2000, unavailable_reason: null }).success, false);
  assert.equal(S.QuantilesSchema.safeParse({ p10: 3, p50: 2, p90: 4, mean: 3, valid_path_count: 2, unavailable_path_count: 0 }).success, false);
  assert.equal(S.QuantilesSchema.safeParse({ p10: null, p50: null, p90: null, mean: null, valid_path_count: 1, unavailable_path_count: 0 }).success, false);
});

test('canonical hash is precise, deterministic, locale independent and rejects non-JSON inputs', () => {
  assert.equal(sha256Canonical({ b: -0, a: 1 }), sha256Canonical({ a: 1, b: 0 }));
  assert.equal(sha256Canonical(null), '74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b');
  assert.notEqual(sha256Canonical(1.001), sha256Canonical(1.002));
  assert.notEqual(sha256Canonical([1, 2]), sha256Canonical([2, 1]));
  for (const invalid of [NaN, Infinity, undefined, new Date(), { value: undefined }, new Array(2), { [Symbol()]: 1 }]) assert.throws(() => sha256Canonical(invalid));
});

test('request/path hashes ignore scoped presentation/order while retaining economic changes and provenance', () => {
  const c = company(), r = request();
  const before = structuredClone({ c, r });
  const hash = fingerprintRequest(c, r, S.APPROVED_POLICIES);
  const path = fingerprintScenario(c, r, S.APPROVED_POLICIES, 'trucks');
  r.scenarios.reverse(); c.name = 'Renamed'; c.provenance['/name'].source = 'New presentation label';
  r.scenarios.forEach(v => { v.name = 'Renamed'; v.decisions.reverse(); });
  assert.equal(fingerprintRequest(c, r, S.APPROVED_POLICIES), hash);
  assert.equal(fingerprintScenario(c, r, S.APPROVED_POLICIES, 'trucks'), path);
  r.scenarios.find(v => v.id === 'combined')!.decisions = [];
  assert.notEqual(fingerprintRequest(c, r, S.APPROVED_POLICIES), hash);
  assert.equal(fingerprintScenario(c, r, S.APPROVED_POLICIES, 'trucks'), path);
  c.provenance['/operations/average_ticket'].source = 'Changed economic assumption provenance';
  assert.notEqual(fingerprintScenario(c, r, S.APPROVED_POLICIES, 'trucks'), path);
  assert.deepEqual(before.c, company());
  const original = structuredClone({ c, r }); fingerprintRequest(c, r, S.APPROVED_POLICIES);
  assert.deepEqual({ c, r }, original);
  assert.throws(() => fingerprintRequest(c, { ...r, company_id: 'wrong' }, S.APPROVED_POLICIES), /company_id/);
});

test('complete response requires matching keys, comparisons, run seed and baseline null semantics', () => {
  const path = S.ScenarioPathSchema.parse(structuralPath());
  const paths = Object.fromEntries(['baseline', 'trucks', 'combined'].map(id => [id, {
    ...path, metadata: { ...path.metadata, scenario_id: id },
  }]));
  const values = Object.fromEntries(S.MetricKeySchema.options.map(option => [option.value, null]));
  const comparisons = Object.fromEntries(['trucks', 'combined'].map(id => [id, {
    baseline_id: 'baseline', scenario_id: id, monthly_deltas: Array.from({ length: 61 }, (_, month) => ({
      month, values, cumulative_incremental_unlevered_fcf: 0,
    })), incremental_exit_equity_value: null, payback: path.metrics.payback,
  }]));
  const response = { schema_version: '1.0', contract_revision: 1, model_version: 'mvp-1.0', run_id: 'schema-test',
    input_fingerprint: 'b'.repeat(64), company_id: publishedFixture.id, horizon_months: 60, currency: 'USD', seed: null,
    assumptions: { exit_multiple: 6, cash_reserve_floor: 150000, resolved: company().global_assumptions, provenance: company().provenance },
    scenarios: paths, comparisons, monte_carlo: null, warnings: [] };
  assert.ok(S.SimulationResultSchema.safeParse(response).success);
  assert.equal(S.SimulationResultSchema.safeParse({ ...response, seed: 1 }).success, false);
  assert.equal(S.SimulationResultSchema.safeParse({ ...response, comparisons: {} }).success, false);
  const wrongKey = structuredClone(response); Object.assign(wrongKey.scenarios.trucks.metadata, { scenario_id: 'wrong' });
  assert.equal(S.SimulationResultSchema.safeParse(wrongKey).success, false);
});
