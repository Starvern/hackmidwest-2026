/** Internal candidate only: no public route or demo configuration fallback. */
import type { z } from 'zod';
import type { ProfileStore } from '../intake/store.ts';
import { ProfileSimulationInputSchema } from '../intake/schemas.ts';
import { assertProfileMCContext, type ProfileMCContext } from './binding.ts';
import { MonteCarloJobs, JobError } from './jobs.ts';
import { resolveProfileMCContext, validateRecordedProfileMonteCarlo } from './profile-context.ts';
export { validateRecordedProfileMonteCarlo } from './profile-context.ts';

type Input = z.infer<typeof ProfileSimulationInputSchema>;
type Record = { owner: string; input: Input; context: ProfileMCContext };
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
    this.profiles.pruneMonteCarloRecordings();
    for (const id of this.records.keys()) if (!this.jobs.retains(id)) this.records.delete(id);
  }
  submit(owner: string, value: unknown) {
    this.prune();
    const { input, request, snapshot, config, context } = resolveProfileMCContext(this.profiles, owner, value);
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
    const expected = resolveProfileMCContext(this.profiles, owner, record.input);
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
  record(owner: string, id: string, token: string) {
    const record = this.authorized(owner, id, token);
    return this.profiles.saveMonteCarloRecording(owner, record.input, this.result(owner, id, token));
  }
  cancel(owner: string, id: string, token: string) {
    const record = this.authorized(owner, id, token);
    return { context: structuredClone(record.context), job: this.jobs.cancel(id, token) };
  }
}
