import { profileMCContext, assertProfileMCContext, type ProfileMCContext } from './binding.ts';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { z } from 'zod';
import { APPROVED_POLICIES, CompanyInputSchema, MonteCarloRequestSchema } from '../schemas.ts';
import { MCConfigSchema } from './contracts.ts';
import { MC_JOB_VERSION, MCJobReceiptSchema, MCJobStatusSchema } from './jobs-contracts.ts';
import { validateMonteCarloResult } from './result.ts';
import { runMonteCarloWorker, type WorkerOptions } from './worker.ts';

type Status = z.infer<typeof MCJobStatusSchema>;
type Result = ReturnType<typeof validateMonteCarloResult>;
type Snapshot = { company: unknown; request: unknown; config: unknown; profileContext?: ProfileMCContext };
type Job = { status: Status; tokenHash: Buffer; snapshot: Snapshot; controller: AbortController; result?: Result };
export class JobError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) { super(message); this.status = status; this.code = code; }
}
export const LOCAL_MC_LIMITS = Object.freeze({ concurrency: 1, waiting: 2, records: 8,
  timeoutMs: 45 * 60_000, retentionMs: 60 * 60_000, bodyBytes: 64 * 1024 });
const hash = (token: string) => createHash('sha256').update(token).digest();
const terminal = (state: Status['state']) => !['queued', 'running'].includes(state);

/** Single-process local-review store. Tokens authorize each job; no durable/multi-host claims. */
export class MonteCarloJobs {
  private jobs = new Map<string, Job>();
  private queue: string[] = [];
  private busy = false;
  private execute: typeof runMonteCarloWorker;
  private now: () => number;
  private workerUrl?: URL;
  constructor(options: { execute?: typeof runMonteCarloWorker; now?: () => number; workerUrl?: URL } = {}) {
    this.execute = options.execute ?? runMonteCarloWorker;
    this.now = options.now ?? Date.now;
    this.workerUrl = options.workerUrl;
  }
  prune() {
    for (const [id, job] of this.jobs) if (job.status.expires_at && Date.parse(job.status.expires_at) <= this.now()) this.jobs.delete(id);
  }
  /** Server-side retention bookkeeping; conveys no result or job access. */
  retains(id: string) { this.prune(); return this.jobs.has(id); }
  submit(companyValue: unknown, requestValue: unknown, configValue: unknown, contextValue?: ProfileMCContext) {
    this.prune();
    const company = CompanyInputSchema.parse(companyValue), request = MonteCarloRequestSchema.parse(requestValue), config = MCConfigSchema.parse(configValue);
    const profileContext = contextValue ? structuredClone(contextValue) : undefined;
    if (company.id.startsWith('profile:') && !profileContext) throw new Error('Profile MC transport binding required');
    if (profileContext) assertProfileMCContext(profileContext, profileMCContext(profileContext.company, company, request, config));
    if (company.id !== request.company_id) throw new JobError(422, 'VALIDATION_ERROR', 'Unknown company ID.');
    if (request.monte_carlo.runs !== 2000) throw new JobError(422, 'UNSUPPORTED_RUN_COUNT', 'This review supports exactly 2,000 runs.');
    if (this.jobs.size >= LOCAL_MC_LIMITS.records || (this.busy && this.queue.length >= LOCAL_MC_LIMITS.waiting)) {
      throw new JobError(429, 'QUEUE_FULL', 'Simulation capacity is full; retry later.');
    }
    const id = randomUUID(), token = randomBytes(32).toString('hex');
    const status = MCJobStatusSchema.parse({ transport_version: MC_JOB_VERSION, job_id: id, state: 'queued',
      completed_runs: 0, total_runs: 2000, created_at: new Date(this.now()).toISOString(), finished_at: null, expires_at: null, error: null });
    this.jobs.set(id, { status, tokenHash: hash(token), snapshot: { company, request, config, profileContext }, controller: new AbortController() });
    this.queue.push(id);
    const base = `/api/v1/simulate/monte-carlo/jobs/${id}`;
    const receipt = MCJobReceiptSchema.parse({ ...status, access_token: token, status_url: base, result_url: `${base}/result` });
    this.pump();
    return receipt;
  }
  private get(id: string, token: string) {
    this.prune();
    const job = this.jobs.get(id);
    if (!job || !timingSafeEqual(job.tokenHash, hash(token))) throw new JobError(404, 'JOB_NOT_FOUND', 'Job not found or expired.');
    return job;
  }
  status(id: string, token: string) { return MCJobStatusSchema.parse(this.get(id, token).status); }
  result(id: string, token: string) {
    const job = this.get(id, token);
    if (job.status.state !== 'succeeded') throw new JobError(409, 'RESULT_UNAVAILABLE', 'A complete successful result is not available.');
    return structuredClone(job.result!);
  }
  cancel(id: string, token: string) {
    const job = this.get(id, token);
    if (!terminal(job.status.state)) {
      this.finish(job, 'cancelled');
      this.queue = this.queue.filter(value => value !== id);
      job.controller.abort();
    }
    return this.status(id, token);
  }
  private finish(job: Job, state: Status['state'], error: Status['error'] = null) {
    job.status.state = state;
    job.status.error = error;
    job.status.finished_at = new Date(this.now()).toISOString();
    job.status.expires_at = new Date(this.now() + LOCAL_MC_LIMITS.retentionMs).toISOString();
    if (state !== 'succeeded') delete job.result;
  }
  private pump() {
    if (this.busy) return;
    const id = this.queue.shift();
    if (!id) return;
    const job = this.jobs.get(id)!;
    this.busy = true;
    job.status.state = 'running';
    const { company, request, config, profileContext } = job.snapshot;
    const options: WorkerOptions = { timeoutMs: LOCAL_MC_LIMITS.timeoutMs, signal: job.controller.signal,
      profileContext, runId: id, workerUrl: this.workerUrl, onProgress: completed => {
        if (job.status.state !== 'running') return;
        if (completed !== job.status.completed_runs + 1 || completed > 2000) throw new Error('Invalid job progress');
        job.status.completed_runs = completed;
      } };
    // Promise boundary also captures a synchronous executor failure.
    void Promise.resolve().then(() => this.execute(company, request, config, options)).then(value => {
      if (job.status.state !== 'running') return;
      const result = validateMonteCarloResult(value, company, request, APPROVED_POLICIES, config);
      if (result.run_id !== id || job.status.completed_runs !== 2000) throw new Error('Job result identity/progress mismatch');
      job.result = result;
      this.finish(job, 'succeeded');
    }).catch(error => {
      if (job.status.state === 'cancelled') return;
      console.error('MC job failed', error);
      this.finish(job, 'failed', error instanceof Error && error.message === 'Monte Carlo job timed out' ? 'EXECUTION_TIMEOUT' : 'EXECUTION_FAILED');
    }).finally(() => { this.busy = false; this.pump(); });
  }
}
