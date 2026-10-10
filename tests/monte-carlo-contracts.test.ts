import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { MCConfigSchema, MCDiscreteOffsetSchema, MCPaybackCountsSchema, MCResultExtensionSchema, MC_RESULT_VERSION, MCValuationMultiplesSchema } from '../src/lib/server/monte-carlo/contracts.ts';
import { loadMonteCarloConfig } from '../src/lib/server/monte-carlo/config.ts';
import { fingerprintMonteCarloConfig, fingerprintMonteCarloRequest, fingerprintMonteCarloScenario } from '../src/lib/server/monte-carlo/fingerprint.ts';
import { APPROVED_POLICIES, CompanyInputSchema, DeterministicRequestSchema, SimulationResultSchema } from '../src/lib/server/schemas.ts';
import { fingerprintRequest } from '../src/lib/server/fingerprint.ts';
import { aggregate_paired_paths } from '../src/lib/server/engine/aggregation.ts';
const load = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const company = CompanyInputSchema.parse(load('../data/synthetic_hvac_company.json'));
const request = DeterministicRequestSchema.parse(load('../contracts/example-request.json'));
const reference = SimulationResultSchema.parse(load('../contracts/example-result.json'));
const config = loadMonteCarloConfig();
const mcRequest = { ...request, monte_carlo: { enabled: true, runs: 2000, seed: 42 } };

test('exact separate proposed manifest validates with independent loader copies and unchanged company distributions', () => {
  assert.deepEqual(config, load('../data/monte-carlo-config.proposed.json'));
  const copy = loadMonteCarloConfig(); copy.macro.rho = 0.2;
  assert.equal(loadMonteCarloConfig().macro.rho, 0.6);
  assert.deepEqual(company.global_assumptions.distribution_parameters, {});
});

test('MC manifest rejects malformed probabilities, offsets, bounds, dates, versions and provenance', () => {
  const mutations: ((value: typeof config) => void)[] = [
    value => { value.macro.rho = 1; }, value => { value.macro.innovation_spread = -1; },
    value => { value.macro.lower = 1; }, value => { value.macro.update_months[1] = 12 as 13; },
    value => { value.mappings.demand.upper = 0.5; },
    value => { value.mappings.valuation_multiple.lower = 9; },
    value => { value.shared.wage.mode = 2; },
    value => { value.decision.hiring_delay_offset.probabilities[0] = 0.9; },
    value => { value.decision.ramp_offset.values[0] = 0.5; },
    value => { value.decision.ramp_offset.values[0] = 0; },
    value => { value.decision.truck_service_delay_offset.probabilities.pop(); },
    value => { delete value.provenance['/macro/rho']; },
    value => { value.provenance['/macro/rho'].unit = 'USD'; },
    value => { value.provenance['/missing'] = value.provenance['/macro/rho']; },
  ];
  for (const mutate of mutations) { const value = structuredClone(config); mutate(value); assert.equal(MCConfigSchema.safeParse(value).success, false); }
  assert.equal(MCConfigSchema.safeParse({ ...config, sampler_version: 'unknown' }).success, false);
  assert.equal(MCConfigSchema.safeParse({ ...config, undocumented: 1 }).success, false);
  assert.equal(MCDiscreteOffsetSchema.safeParse({family:'discrete',values:[0], probabilities:[1 - 5e-13]}).success,true);
  assert.equal(MCDiscreteOffsetSchema.safeParse({family:'discrete',values:[0], probabilities:[1 - 5e-11]}).success,false);
});

test('zero-width sensitivity configuration is representable without changing approved illustrative data', () => {
  const zero = structuredClone(config);
  zero.macro.innovation_spread = 0;
  for (const mapping of Object.values(zero.mappings)) mapping.loading = 0;
  for (const factor of [zero.shared.wage, zero.shared.vehicle_opex, zero.decision.marketing_effectiveness]) factor.min = factor.mode = factor.max = 1;
  for (const offset of [zero.decision.truck_service_delay_offset, zero.decision.hiring_delay_offset, zero.decision.ramp_offset]) offset.probabilities = offset.values.map(value => value === 0 ? 1 : 0);
  MCConfigSchema.parse(zero);
  assert.notEqual(fingerprintMonteCarloConfig(zero), fingerprintMonteCarloConfig(config));
});

test('MC fingerprint covers settings/config/provenance, isolates paths and preserves frozen deterministic hash', () => {
  assert.equal(fingerprintRequest(company, request, APPROVED_POLICIES), reference.input_fingerprint);
  const hash = fingerprintMonteCarloRequest(company, mcRequest, APPROVED_POLICIES, config);
  assert.notEqual(hash, reference.input_fingerprint);
  const reordered = structuredClone(mcRequest); reordered.scenarios.reverse();
  assert.equal(fingerprintMonteCarloRequest(company, reordered, APPROVED_POLICIES, config), hash);
  for (const seed of [41, 43]) assert.notEqual(fingerprintMonteCarloRequest(company, { ...mcRequest, monte_carlo: {...mcRequest.monte_carlo, seed} }, APPROVED_POLICIES, config), hash);
  const changed = structuredClone(config); changed.provenance['/macro/rho'].source += ' reviewed';
  assert.notEqual(fingerprintMonteCarloRequest(company, mcRequest, APPROVED_POLICIES, changed), hash);
  const parameters = structuredClone(config); parameters.macro.rho = 0.5;
  assert.notEqual(fingerprintMonteCarloRequest(company, mcRequest, APPROVED_POLICIES, parameters), hash);
  const before = fingerprintMonteCarloScenario(company, mcRequest, APPROVED_POLICIES, config, 'trucks_only');
  const added = structuredClone(mcRequest); added.scenarios.push({...structuredClone(added.scenarios[1]), id:'extra', name:'Extra'});
  assert.equal(fingerprintMonteCarloScenario(company, added, APPROVED_POLICIES, config, 'trucks_only'), before);
  const other = structuredClone(mcRequest); other.scenarios[2].decisions[2].start_month += 1;
  assert.equal(fingerprintMonteCarloScenario(company, other, APPROVED_POLICIES, config, 'trucks_only'), before);
  assert.notEqual(fingerprintMonteCarloRequest(company, other, APPROVED_POLICIES, config), hash);
  assert.throws(() => fingerprintMonteCarloRequest(company, {...mcRequest, company_id:'wrong'}, APPROVED_POLICIES, config));
});

// Transport validation fixture only: repeated deterministic observations, not stochastic forecasts.
const aggregate = aggregate_paired_paths(Array.from({length:2000}, () => reference.scenarios), request.reserve_floor_usd);
const extension = { extension_version: MC_RESULT_VERSION, schema_version:'1.0', model_version:'mvp-1.0', contract_revision:1,
  run_id:'contract-test-only', company_id:company.id, runs:2000, seed:42,
  config_version:config.config_version, sampler_version:config.sampler_version, execution_version:config.execution_version,
  config_fingerprint:fingerprintMonteCarloConfig(config), input_fingerprint:fingerprintMonteCarloRequest(company,mcRequest,APPROVED_POLICIES,config),
  configuration:config, scenarios:aggregate.scenarios, comparisons:aggregate.comparisons, payback_counts:aggregate.payback_counts };

test('separate MC result candidate consumes actual P2 aggregate shapes and rejects inconsistent counts/keys', () => {
  MCResultExtensionSchema.parse(extension);
  const counts = structuredClone(extension); counts.payback_counts.trucks_only.reached_count += 1;
  assert.equal(MCResultExtensionSchema.safeParse(counts).success,false);
  const missing = structuredClone(extension); delete missing.comparisons.trucks_only;
  assert.equal(MCResultExtensionSchema.safeParse(missing).success,false);
  const invalid = structuredClone(extension); invalid.scenarios.baseline.monthly_percentiles.cash_end[0].valid_path_count = 1999;
  assert.equal(MCResultExtensionSchema.safeParse(invalid).success,false);
  assert.equal(MCPaybackCountsSchema.safeParse({reached_count:1,subsequent_reversal_count:2}).success,false);
});

test('valuation execution vector requires exactly 60 positive finite values', () => {
  MCValuationMultiplesSchema.parse(Array(60).fill(6));
  for (const input of [Array(59).fill(6), Array(61).fill(6), [...Array(59).fill(6), 0], [...Array(59).fill(6), Infinity]]) assert.equal(MCValuationMultiplesSchema.safeParse(input).success, false);
});

test('MC result context rejects wrong seeds/configuration/fingerprints rather than accepting a shaped payload', async () => {
  const { validateMonteCarloResult } = await import('../src/lib/server/monte-carlo/result.ts');
  validateMonteCarloResult(extension, company, mcRequest, APPROVED_POLICIES, config);
  for (const changed of [ {...extension, seed:43}, {...extension, company_id:'wrong'}, {...extension, input_fingerprint:'0'.repeat(64)}, {...extension, config_fingerprint:'0'.repeat(64)} ]) {
    assert.throws(() => validateMonteCarloResult(changed,company,mcRequest,APPROVED_POLICIES,config));
  }
});

test('MC boundary rejects contradictory payback probabilities even when all denominator totals equal runs', () => {
  // Synthetic transport case: 500 reached, 1000 not reached, 500 inapplicable.
  const valid = structuredClone(extension);
  valid.payback_counts.trucks_only.reached_count = 500;
  const scenario = valid.scenarios.trucks_only;
  scenario.payback.not_reached_count = 1000;
  scenario.payback.not_applicable_count = 500;
  scenario.payback.median_month_conditional_on_payback_or_null = 20;
  const probability = {value:1 / 3,valid_path_count:1500,unavailable_path_count:500,unavailable_reason:null};
  scenario.payback.probability_within_horizon = {...probability};
  scenario.path_risks.probability_payback_by_month_60 = {...probability};
  MCResultExtensionSchema.parse(valid);
  const mutations: ((value: typeof valid) => void)[] = [
    value => { value.scenarios.trucks_only.payback.probability_within_horizon.value = 0.5; value.scenarios.trucks_only.path_risks.probability_payback_by_month_60.value = 0.5; },
    value => { for (const p of [value.scenarios.trucks_only.payback.probability_within_horizon, value.scenarios.trucks_only.path_risks.probability_payback_by_month_60]) { p.valid_path_count = 2000; p.unavailable_path_count = 0; } },
    value => { value.scenarios.trucks_only.path_risks.probability_payback_by_month_60.value = 0.25; },
  ];
  for (const mutate of mutations) { const broken = structuredClone(valid); mutate(broken); assert.equal(MCResultExtensionSchema.safeParse(broken).success,false); }
  const within = structuredClone(valid);
  within.scenarios.trucks_only.payback.probability_within_horizon.value! += 5e-13;
  within.scenarios.trucks_only.path_risks.probability_payback_by_month_60.value! += 5e-13;
  MCResultExtensionSchema.parse(within);
  const outside = structuredClone(valid);
  outside.scenarios.trucks_only.payback.probability_within_horizon.value! += 5e-11;
  outside.scenarios.trucks_only.path_risks.probability_payback_by_month_60.value! += 5e-11;
  assert.equal(MCResultExtensionSchema.safeParse(outside).success,false);
});

test('MC baseline incremental results and zero-eligibility payback must be explicitly unavailable', () => {
  const mutations: ((value: typeof extension) => void)[] = [
    value => { const p = value.scenarios.baseline.payback.probability_within_horizon; p.unavailable_reason = 'unavailable_valuation'; value.scenarios.baseline.path_risks.probability_payback_by_month_60 = {...p}; },
    value => { value.scenarios.baseline.path_risks.probability_negative_exit_equity_delta = {value:0, valid_path_count:2000, unavailable_path_count:0, unavailable_reason:null}; },
    value => { value.scenarios.baseline.terminal_distributions.incremental_exit_equity_value = {p10:0,p50:0,p90:0,mean:0,valid_path_count:2000,unavailable_path_count:0}; },
  ];
  for (const mutate of mutations) { const broken = structuredClone(extension); mutate(broken); assert.equal(MCResultExtensionSchema.safeParse(broken).success,false); }
  MCResultExtensionSchema.parse(extension);
});
