import { createHash } from 'node:crypto';
import {
  ApprovedPoliciesSchema, CompanyInputSchema, DeterministicRequestSchema,
  MonteCarloRequestSchema, INTERFACE_REVISION,
} from './schemas.ts';
import { canonicalJson } from './validation.ts';

/** Hashes only plain JSON. No rounding; JSON numeric serialization normalizes -0. */
export function sha256Canonical(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');
}

function withoutPresentation<T extends { name?: string; provenance?: Record<string, unknown> }>(value: T) {
  const copy = structuredClone(value);
  delete copy.name;
  if (copy.provenance) delete copy.provenance['/name'];
  return copy;
}

function resolvedInputs(companyValue: unknown, requestValue: unknown, policyValue: unknown) {
  const company = CompanyInputSchema.parse(companyValue);
  const request = typeof requestValue === 'object' && requestValue !== null && 'monte_carlo' in requestValue
    ? MonteCarloRequestSchema.parse(requestValue) : DeterministicRequestSchema.parse(requestValue);
  const policies = ApprovedPoliciesSchema.parse(policyValue);
  if (request.company_id !== company.id) throw new Error('Request company_id does not match company');
  if ('monte_carlo' in request && Object.keys(company.global_assumptions.distribution_parameters).length === 0) {
    throw new Error('Monte Carlo requires an approved nonempty distribution manifest');
  }
  const scenarios = request.scenarios.map(scenario => ({
    ...withoutPresentation(scenario),
    decisions: scenario.decisions.map(decision => withoutPresentation(decision)).sort((a, b) => compareIds(a.id, b.id)),
  })).sort((a, b) => compareIds(a.id, b.id));
  const { scenarios: ignored, ...settings } = request;
  void ignored;
  return {
    schema_version: request.schema_version, model_version: company.model_version,
    contract_revision: 1, interface_revision: INTERFACE_REVISION,
    company: withoutPresentation(company), settings, policies, scenarios,
  };
}

// Code-unit ordering is locale independent.
const compareIds = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

/** Caller must supply the explicitly resolved policy object; no defaults. */
export function fingerprintRequest(company: unknown, request: unknown, policies: unknown): string {
  return sha256Canonical(resolvedInputs(company, request, policies));
}

/** Other valid scenarios never enter this projection. */
export function fingerprintScenario(company: unknown, request: unknown, policies: unknown, scenarioId: string): string {
  const input = resolvedInputs(company, request, policies);
  const scenario = input.scenarios.find(value => value.id === scenarioId);
  if (!scenario) throw new Error(`Unknown scenario: ${scenarioId}`);
  const { scenarios, ...common } = input;
  void scenarios;
  return sha256Canonical({ ...common, scenario });
}
