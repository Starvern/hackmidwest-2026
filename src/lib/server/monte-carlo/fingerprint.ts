import { DeterministicRequestSchema, MonteCarloRequestSchema } from '../schemas.ts';
import { fingerprintRequest, fingerprintScenario, sha256Canonical } from '../fingerprint.ts';
import { MCConfigSchema, MC_RESULT_VERSION } from './contracts.ts';

export function fingerprintMonteCarloConfig(value: unknown) {
  return sha256Canonical(MCConfigSchema.parse(value));
}
function projection(company: unknown, requestValue: unknown, policies: unknown, configValue: unknown, scenarioId?: string) {
  const request = MonteCarloRequestSchema.parse(requestValue);
  const { monte_carlo, ...base } = request;
  const deterministic = DeterministicRequestSchema.parse(base);
  const configuration = MCConfigSchema.parse(configValue);
  return {
    domain: 'operatoros-monte-carlo', extension_version: MC_RESULT_VERSION,
    deterministic_fingerprint: scenarioId === undefined ? fingerprintRequest(company, deterministic, policies)
      : fingerprintScenario(company, deterministic, policies, scenarioId),
    monte_carlo, configuration,
  };
}
/** MC hashes include exact config/provenance and all versions; never random-stream identities. */
export function fingerprintMonteCarloRequest(company: unknown, request: unknown, policies: unknown, config: unknown) {
  return sha256Canonical(projection(company, request, policies, config));
}
export function fingerprintMonteCarloScenario(company: unknown, request: unknown, policies: unknown, config: unknown, scenarioId: string) {
  return sha256Canonical(projection(company, request, policies, config, scenarioId));
}
