import { MonteCarloRequestSchema } from '../schemas.ts';
import { canonicalJson } from '../validation.ts';
import { MCConfigSchema, MCResultExtensionSchema } from './contracts.ts';
import { fingerprintMonteCarloConfig, fingerprintMonteCarloRequest } from './fingerprint.ts';

/** Contextual boundary check for a future real runner/adapter; does not manufacture output. */
export function validateMonteCarloResult(value: unknown, company: unknown, requestValue: unknown, policies: unknown, configValue: unknown) {
  const request = MonteCarloRequestSchema.parse(requestValue);
  const config = MCConfigSchema.parse(configValue);
  const result = MCResultExtensionSchema.parse(value);
  if (result.company_id !== request.company_id || result.runs !== request.monte_carlo.runs || result.seed !== request.monte_carlo.seed ||
    result.config_fingerprint !== fingerprintMonteCarloConfig(config) ||
    result.input_fingerprint !== fingerprintMonteCarloRequest(company, request, policies, config) ||
    canonicalJson(result.configuration) !== canonicalJson(config) ||
    JSON.stringify(Object.keys(result.scenarios).sort()) !== JSON.stringify(request.scenarios.map(s => s.id).sort())) {
    throw new Error('MC result does not match validated request/configuration context');
  }
  return result;
}
