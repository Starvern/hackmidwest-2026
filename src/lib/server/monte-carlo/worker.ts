import { randomUUID } from 'node:crypto';
import { Worker } from 'node:worker_threads';
import { APPROVED_POLICIES, CompanyInputSchema, MonteCarloRequestSchema } from '../schemas.ts';
import { MCConfigSchema } from './contracts.ts';
import { validateMonteCarloResult } from './result.ts';

export type WorkerOptions = {
  timeoutMs: number;
  signal?: AbortSignal;
  onProgress?: (completed: number) => void;
  runId?: string;
  workerUrl?: URL;
};

/** Internal source-runtime adapter; no endpoint/readiness change or production packaging claim. */
export async function runMonteCarloWorker(companyValue: unknown, requestValue: unknown,
  configValue: unknown, options: WorkerOptions) {
  if (!Number.isSafeInteger(options.timeoutMs) || options.timeoutMs <= 0) throw new Error('A positive execution timeout is required');
  const company = CompanyInputSchema.parse(companyValue);
  const request = MonteCarloRequestSchema.parse(requestValue);
  const config = MCConfigSchema.parse(configValue);
  if (company.id !== request.company_id) throw new Error('Unknown company ID');
  if (options.signal?.aborted) throw new Error('Monte Carlo job cancelled');
  const runId = options.runId ?? randomUUID();
  const worker = new Worker(options.workerUrl ?? new URL('./worker-entry.ts', import.meta.url), {
    workerData: { company, request, config, runId },
  });
  return new Promise<ReturnType<typeof validateMonteCarloResult>>((resolve, reject) => {
    let settled = false, completed = 0;
    const finish = (error?: unknown, result?: ReturnType<typeof validateMonteCarloResult>) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', abort);
      // Await termination before releasing the caller's execution slot.
      void worker.terminate().then(() => {
        if (error) reject(error);
        else resolve(result!);
      }, reject);
    };
    const abort = () => finish(new Error('Monte Carlo job cancelled'));
    const timer = setTimeout(() => finish(new Error('Monte Carlo job timed out')), options.timeoutMs);
    options.signal?.addEventListener('abort', abort, { once: true });
    if (options.signal?.aborted) abort();
    worker.on('error', error => finish(error));
    worker.on('exit', code => {
      if (!settled) finish(new Error(`Monte Carlo worker exited without a result (${code})`));
    });
    worker.on('message', (message: unknown) => {
      if (settled) return;
      try {
        if (!message || typeof message !== 'object' || !('type' in message)) throw new Error('Invalid worker message');
        if (message.type === 'progress' && 'completed' in message) {
          const count = message.completed;
          if (!Number.isSafeInteger(count) || typeof count !== 'number' || count !== completed + 1 || count > request.monte_carlo.runs) {
            throw new Error('Invalid worker progress');
          }
          completed = count;
          options.onProgress?.(completed);
        } else if (message.type === 'result' && 'result' in message) {
          const result = validateMonteCarloResult(message.result, company, request, APPROVED_POLICIES, config);
          if (result.run_id !== runId || completed !== request.monte_carlo.runs) throw new Error('Worker result/run progress mismatch');
          finish(undefined, result);
        } else throw new Error('Monte Carlo worker failed');
      } catch (error) { finish(error); }
    });
  });
}
