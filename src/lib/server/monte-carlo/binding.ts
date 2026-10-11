/** Internal profile transport context. Public company MC readiness is a separate gate. */
import { z } from 'zod';
import { CompanyBindingSchema } from '../intake/schemas.ts';
import { CompanyInputSchema, MonteCarloRequestSchema, APPROVED_POLICIES } from '../schemas.ts';
import { sha256Canonical } from '../fingerprint.ts';
import { MCConfigSchema } from './contracts.ts';
import { fingerprintMonteCarloConfig, fingerprintMonteCarloRequest } from './fingerprint.ts';
const fingerprint = z.string().regex(/^[a-f0-9]{64}$/);
export const ProfileMCContextSchema = z.strictObject({
  binding_version: z.literal('profile-mc-binding-1-candidate'),
  company: CompanyBindingSchema,
  input_fingerprint: fingerprint,
  config_fingerprint: fingerprint,
});
export type ProfileMCContext = z.infer<typeof ProfileMCContextSchema>;
export function profileMCContext(bindingValue: unknown, companyValue: unknown, requestValue: unknown, configValue: unknown): ProfileMCContext {
  const binding = CompanyBindingSchema.parse(bindingValue), company = CompanyInputSchema.parse(companyValue);
  const request = MonteCarloRequestSchema.parse(requestValue), config = MCConfigSchema.parse(configValue);
  if (company.id !== `profile:${binding.profile_id}` || request.company_id !== company.id || sha256Canonical({ company, mapping_version: binding.mapping_version }) !== binding.compiled_company_fingerprint) throw new Error('Profile MC snapshot mismatch');
  return ProfileMCContextSchema.parse({ binding_version: 'profile-mc-binding-1-candidate', company: binding,
    input_fingerprint: fingerprintMonteCarloRequest(company, request, APPROVED_POLICIES, config),
    config_fingerprint: fingerprintMonteCarloConfig(config) });
}
export function assertProfileMCContext(value: unknown, expected: ProfileMCContext) {
  if (sha256Canonical(ProfileMCContextSchema.parse(value)) !== sha256Canonical(expected)) throw new Error('Profile MC transport binding mismatch');
}
