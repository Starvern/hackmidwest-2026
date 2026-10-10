import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { json } from '@sveltejs/kit';
import { loadDemoCompany } from '../api/company.ts';
import { apiError, apiResponse, readApiInput } from '../api/http.ts';
import { MonteCarloRequestSchema } from '../schemas.ts';
import { localMonteCarloAvailable } from './availability.ts';
import { loadMonteCarloConfig } from './config.ts';
import { JobError, LOCAL_MC_LIMITS, MonteCarloJobs } from './jobs.ts';

const workerPath = resolve(process.cwd(), '.mc-worker/worker-entry.js');
const local = globalThis as typeof globalThis & { __operatorosMCReviewJobs?: MonteCarloJobs };
const jobs = local.__operatorosMCReviewJobs ??= new MonteCarloJobs({ workerUrl: pathToFileURL(workerPath) });
// One sweep per process, including Vite module reloads. Restart to adopt changed limits.
if (!(globalThis as typeof globalThis & { __operatorosMCSweep?: boolean }).__operatorosMCSweep) {
  const sweep = setInterval(() => jobs.prune(), 60_000);
  sweep.unref();
  (globalThis as typeof globalThis & { __operatorosMCSweep?: boolean }).__operatorosMCSweep = true;
}
const headers = { 'cache-control': 'no-store' };

/** Explicit local review only. Product readiness remains false until shared Gate C. */
function guard(url: URL) {
  if (!localMonteCarloAvailable(url)) {
    throw new JobError(503, 'MC_NOT_READY', 'Monte Carlo is awaiting shared acceptance.');
  }
  if (!existsSync(workerPath)) throw new JobError(503, 'WORKER_UNAVAILABLE', 'Build the background worker before local review.');
}
async function response(operation: () => unknown | Promise<unknown>, status = 200) {
  try { return json(await operation(), { status, headers }); }
  catch (error) {
    if (error instanceof JobError) return apiError(error.status, error.code, error.message);
    return apiResponse(() => { throw error; });
  }
}
export function submitJob({ request, url }: { request: Request; url: URL }) {
  return response(async () => {
    guard(url);
    // Read a bounded stream rather than buffering an untrusted unlimited body.
    const reader = request.body?.getReader();
    let size = 0;
    const chunks: Uint8Array[] = [];
    if (reader) try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > LOCAL_MC_LIMITS.bodyBytes) {
          await reader.cancel();
          throw new JobError(413, 'BODY_TOO_LARGE', 'Simulation request exceeds 64 KiB.');
        }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const input = await readApiInput(new Request(request.url, { method: 'POST', body: Buffer.concat(chunks) }), MonteCarloRequestSchema);
    return jobs.submit(loadDemoCompany(), input, loadMonteCarloConfig());
  }, 202);
}
export function jobAction(kind: 'status' | 'result' | 'cancel', { request, url, params }: { request: Request; url: URL; params: { id: string } }) {
  return response(() => {
    guard(url);
    const token = request.headers.get('x-mc-job-token') ?? '';
    return jobs[kind](params.id, token);
  });
}
