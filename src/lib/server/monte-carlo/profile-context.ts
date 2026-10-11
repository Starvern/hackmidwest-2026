/** Exact owner/profile/plan validation shared by jobs and durable recordings. */
import type { ProfileStore } from '../intake/store.ts';
import { ProfileSimulationInputSchema } from '../intake/schemas.ts';
import { APPROVED_POLICIES, MonteCarloRequestSchema } from '../schemas.ts';
import { MCConfigSchema } from './contracts.ts';
import { profileMCContext, assertProfileMCContext } from './binding.ts';
import { validateMonteCarloResult } from './result.ts';
export function resolveProfileMCContext(profiles: ProfileStore, owner: string, value: unknown) {
  const input = ProfileSimulationInputSchema.parse(value);
  const request = MonteCarloRequestSchema.parse(input.request);
  const snapshot = profiles.resolve(owner, input.company);
  const risk = snapshot.source_sidecar.assumptions.risk_configuration;
  if (!risk.value || !['confirmed', 'reviewed_estimate'].includes(risk.state) || !risk.review || !risk.source_ids.length) throw new Error('Reviewed company risk configuration required');
  const config = MCConfigSchema.parse(risk.value);
  const context = profileMCContext(snapshot.binding, snapshot.company, request, config);
  return { input, request, snapshot, config, context };
}
/** Validate a retained result against this owner's exact confirmed revision and current plan.
 * A demo recording, another revision, changed decisions/configuration or a missing binding rejects.
 */
export function validateRecordedProfileMonteCarlo(profiles: ProfileStore, owner: string, input: unknown, value: unknown) {
  const expected = resolveProfileMCContext(profiles, owner, input);
  if (!value || typeof value !== 'object' || !('context' in value) || !('result' in value) || Object.keys(value).sort().join(',') !== 'context,result') throw new Error('Bound profile MC recording required');
  assertProfileMCContext(value.context, expected.context);
  const result = validateMonteCarloResult(value.result, expected.snapshot.company, expected.request, APPROVED_POLICIES, expected.config);
  return { context: expected.context, result };
}
