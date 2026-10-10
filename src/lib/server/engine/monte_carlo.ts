import { randomUUID } from 'node:crypto';
import type { Decision, MarketFactors, PathRisks, ScenarioPath } from '../../../../contracts/contracts.ts';
import type { MCConfig } from '../../../../contracts/monte-carlo.ts';
import { APPROVED_POLICIES, CompanyInputSchema, MonteCarloRequestSchema, validatePathRisks } from '../schemas.ts';
import { MCConfigSchema, MC_RESULT_VERSION, MCValuationMultiplesSchema } from '../monte-carlo/contracts.ts';
import { loadMonteCarloConfig } from '../monte-carlo/config.ts';
import { fingerprintMonteCarloConfig, fingerprintMonteCarloRequest, fingerprintMonteCarloScenario } from '../monte-carlo/fingerprint.ts';
import { validateMonteCarloResult } from '../monte-carlo/result.ts';
import { risk_stream, sample_normal, sample_triangular, sample_discrete, resolve_month_offset } from './sampling.ts';
import { simulate_months } from './scenarios.ts';
import { aggregate_paired_paths } from './aggregation.ts';

const clamp = (value: number, lower: number, upper: number) => Math.max(lower, Math.min(upper, value));

/** Fixed-once shared risks and five forecast-year shocks; run is a zero-based index. */
export function sample_shared_path(config: MCConfig, seed: number, run: number, requestedMultiple: number) {
  if (!Number.isFinite(requestedMultiple) || requestedMultiple <= 0) throw new Error('Invalid requested multiple');
  const triangular = (risk: string, spec: MCConfig['shared']['wage']) =>
    sample_triangular(risk_stream(seed, run, risk), spec.min, spec.mode, spec.max);
  const wage = triangular('wage', config.shared.wage);
  const fleet = triangular('vehicle_opex', config.shared.vehicle_opex);
  const normal = risk_stream(seed, run, 'macro');
  let state = config.macro.initial_state;
  const macro: number[] = [], monthly_market_factors: MarketFactors[] = [], monthly_valuation_multiples: number[] = [];
  for (let month = 1; month <= 60; month++) {
    if (config.macro.update_months.some(update => update === month)) state = clamp(config.macro.rho * state
      + Math.sqrt(1 - config.macro.rho ** 2) * config.macro.innovation_spread * sample_normal(normal), config.macro.lower, config.macro.upper);
    macro.push(state);
    const map = (spec: MCConfig['mappings']['demand']) => clamp(Math.exp(spec.loading * state), spec.lower, spec.upper);
    monthly_market_factors.push({ ...config.fixed_market_factors, demand_multiplier: map(config.mappings.demand),
      ticket_multiplier: map(config.mappings.ticket), wage_multiplier: wage, vehicle_opex_multiplier: fleet });
    const valuation = config.mappings.valuation_multiple;
    monthly_valuation_multiples.push(clamp(requestedMultiple + valuation.loading * state,
      Math.min(valuation.lower, requestedMultiple), Math.max(valuation.upper, requestedMultiple)));
  }
  return { macro, monthly_market_factors, monthly_valuation_multiples: MCValuationMultiplesSchema.parse(monthly_valuation_multiples) };
}

/** Matched stable actions share draws, even when scenario/decision IDs or ordering differ. */
export function sample_action_risks(config: MCConfig, seed: number, run: number, decisions: Decision[]): PathRisks {
  const by_stable_investment_key: PathRisks['by_stable_investment_key'] = {};
  for (const decision of decisions) {
    const key = decision.stable_investment_key;
    const offset = (risk: keyof MCConfig['decision']) => {
      const spec = config.decision[risk];
      if (spec.family !== 'discrete') throw new Error('Expected offset distribution');
      return sample_discrete(risk_stream(seed, run, risk, key), spec.values, spec.probabilities);
    };
    const risk = { in_service_delay_months: null, hiring_delay_months: null, ramp_months: null,
      lead_to_job_lag_months: null, marketing_effectiveness_multiplier: 1 } as PathRisks['by_stable_investment_key'][string];
    if (decision.type === 'purchase_trucks') risk.in_service_delay_months = resolve_month_offset(decision.in_service_delay_months, offset('truck_service_delay_offset'));
    if (decision.type === 'hire_technicians') {
      risk.hiring_delay_months = resolve_month_offset(decision.hiring_delay_months, offset('hiring_delay_offset'));
      risk.ramp_months = resolve_month_offset(decision.ramp_months, offset('ramp_offset'));
    }
    if (decision.type === 'increase_marketing') {
      const spec = config.decision.marketing_effectiveness;
      risk.marketing_effectiveness_multiplier = sample_triangular(risk_stream(seed, run, 'marketing_effectiveness', key), spec.min, spec.mode, spec.max);
    }
    // Neutral overrides carry no sampled change; preserve deterministic event provenance.
    const neutral = decision.type === 'purchase_trucks' ? risk.in_service_delay_months === decision.in_service_delay_months
      : decision.type === 'hire_technicians' ? risk.hiring_delay_months === decision.hiring_delay_months && risk.ramp_months === decision.ramp_months
      : risk.marketing_effectiveness_multiplier === 1;
    if (!neutral) by_stable_investment_key[key] = risk;
  }
  return validatePathRisks({ by_stable_investment_key }, decisions);
}

/** Compact streaming aggregation; expanded paths are released after each run. No HTTP readiness change. */
export function simulate_monte_carlo(companyValue: unknown, requestValue: unknown, configValue: unknown = loadMonteCarloConfig(), runId: string = randomUUID(), onProgress?: (completed: number) => void) {
  const original = CompanyInputSchema.parse(companyValue);
  const request = MonteCarloRequestSchema.parse(requestValue);
  const config = MCConfigSchema.parse(configValue);
  const input_fingerprint = fingerprintMonteCarloRequest(original, request, APPROVED_POLICIES, config);
  const company = structuredClone(original);
  company.global_assumptions.valuation_multiple = request.exit_multiple;
  company.global_assumptions.liquidity_floor = request.reserve_floor_usd;
  for (const [field, source] of [['valuation_multiple', 'exit_multiple'], ['liquidity_floor', 'reserve_floor_usd']] as const) {
    const pointer = `/global_assumptions/${field}`;
    company.provenance[pointer] = { ...company.provenance[pointer], kind: 'user_input', source: `Resolved request.${source}` };
  }
  const sorted = [...request.scenarios].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const fingerprints = Object.fromEntries(sorted.map(s => [s.id, fingerprintMonteCarloScenario(original, request, APPROVED_POLICIES, config, s.id)]));
  function* paths() {
    for (let run = 0; run < request.monte_carlo.runs; run++) {
      const shared = sample_shared_path(config, request.monte_carlo.seed, run, request.exit_multiple);
      const paired: Record<string, ScenarioPath> = {};
      for (const scenario of sorted) paired[scenario.id] = simulate_months(company, scenario.decisions, {
        scenario, ...shared, path_risks: sample_action_risks(config, request.monte_carlo.seed, run, scenario.decisions),
        input_fingerprint: fingerprints[scenario.id], seed: request.monte_carlo.seed,
      });
      yield paired;
      onProgress?.(run + 1);
    }
  }
  const aggregate = aggregate_paired_paths(paths(), request.reserve_floor_usd);
  return validateMonteCarloResult({ ...aggregate, extension_version: MC_RESULT_VERSION, schema_version: '1.0', model_version: 'mvp-1.0',
    contract_revision: 1, run_id: runId, company_id: company.id, seed: request.monte_carlo.seed,
    config_version: config.config_version, sampler_version: config.sampler_version, execution_version: config.execution_version,
    configuration: config, config_fingerprint: fingerprintMonteCarloConfig(config), input_fingerprint,
  }, original, request, APPROVED_POLICIES, config);
}
