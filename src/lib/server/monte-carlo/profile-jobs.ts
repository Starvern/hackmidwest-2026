/** Internal candidate only: no public route or demo configuration fallback. */
import type { z } from 'zod';
import { ProfileStore } from '../intake/store.ts';
import { ProfileSimulationInputSchema } from '../intake/schemas.ts';
import { APPROVED_POLICIES, MonteCarloRequestSchema } from '../schemas.ts';
import { MCConfigSchema } from './contracts.ts';
import { profileMCContext, assertProfileMCContext, type ProfileMCContext } from './binding.ts';
import { MonteCarloJobs, JobError } from './jobs.ts';
import { validateMonteCarloResult } from './result.ts';

type Input = z.infer<typeof ProfileSimulationInputSchema>;
type Record = { owner: string; input: Input; context: ProfileMCContext };
function resolveContext(profiles: ProfileStore, owner: string, value: unknown) {
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
  const expected = resolveContext(profiles, owner, input);
  if (!value || typeof value !== 'object' || !('context' in value) || !('result' in value) || Object.keys(value).sort().join(',') !== 'context,result') throw new Error('Bound profile MC recording required');
  assertProfileMCContext(value.context, expected.context);
  const result = validateMonteCarloResult(value.result, expected.snapshot.company, expected.request, APPROVED_POLICIES, expected.config);
  return { context: expected.context, result };
}
/** Owner checks supplement job tokens. Single-process bounded retention follows MonteCarloJobs. */
export class ProfileMonteCarloJobs {
  private jobs: MonteCarloJobs;
  private records = new Map<string, Record>();
  private profiles: ProfileStore;
  constructor(profiles: ProfileStore, options: ConstructorParameters<typeof MonteCarloJobs>[0] = {}) {
    this.profiles = profiles; this.jobs = new MonteCarloJobs(options);
  }
  prune() {
    this.jobs.prune();
    for (const id of this.records.keys()) if (!this.jobs.retains(id)) this.records.delete(id);
  }
  submit(owner: string, value: unknown) {
    this.prune();
    const { input, request, snapshot, config, context } = resolveContext(this.profiles, owner, value);
    const receipt = this.jobs.submit(snapshot.company, request, config, context);
    this.records.set(receipt.job_id, { owner, input, context });
    // Candidate has no HTTP endpoint; demo URLs must never escape as company URLs.
    const { status_url, result_url, ...job } = receipt; void status_url; void result_url;
    return { context: structuredClone(context), job };
  }
  private authorized(owner: string, id: string, token: string) {
    this.prune();
    const record = this.records.get(id);
    if (!record || record.owner !== owner) throw new JobError(404, 'JOB_NOT_FOUND', 'Job not found or expired.');
    this.jobs.status(id, token);
    // Recheck access after deletion, and immutable stored snapshot integrity, on every operation.
    const expected = resolveContext(this.profiles, owner, record.input);
    assertProfileMCContext(record.context, expected.context);
    return record;
  }
  status(owner: string, id: string, token: string) {
    const record = this.authorized(owner, id, token);
    return { context: structuredClone(record.context), job: this.jobs.status(id, token) };
  }
  result(owner: string, id: string, token: string) {
    const record = this.authorized(owner, id, token);
    return validateRecordedProfileMonteCarlo(this.profiles, owner, record.input, { context: record.context, result: this.jobs.result(id, token) });
  }
  cancel(owner: string, id: string, token: string) {
    const record = this.authorized(owner, id, token);
    return { context: structuredClone(record.context), job: this.jobs.cancel(id, token) };
  }
}
