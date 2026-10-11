import type { DeterministicRequest, MonteCarloRequest } from '../../../contracts/contracts.ts';
import type { MCResultExtension } from '../../../contracts/monte-carlo.ts';
import type { z } from 'zod';
import type { MCJobReceiptSchema, MCJobStatusSchema } from '../server/monte-carlo/jobs-contracts.ts';
import { requestJson } from './api.ts';
export type JobStatus = z.infer<typeof MCJobStatusSchema>;
type Receipt = z.infer<typeof MCJobReceiptSchema>;
export type RiskState = { source: 'job' | 'recorded'; busy: boolean; job: JobStatus | null; error: string; result: MCResultExtension | null; resultInput: string; activeInput: string };
export const emptyRiskState = (): RiskState => ({ source: 'job', busy: false, job: null, error: '', result: null, resultInput: '', activeInput: '' });
export function riskRequest(request: DeterministicRequest, seed: number, runs: 100 | 2000 = 2000): MonteCarloRequest {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 4294967295) throw new Error('Seed must be an integer from 0 to 4,294,967,295.');
  if (![100, 2000].includes(runs)) throw new Error('Choose 100 preview paths or 2,000 full paths.');
  return { ...structuredClone(request), monte_carlo: { enabled: true, runs, seed } };
}
/** Explicit user submission; polling failures resume the same job rather than duplicate work. */
export function createRiskController(update: (state: RiskState) => void, fetcher: typeof fetch = fetch,
  wait: () => Promise<void> = () => new Promise(resolve => setTimeout(resolve, 2000))) {
  let state = emptyRiskState(), receipt: Receipt | null = null, generation = 0, disposed = false;
  let network = new AbortController();
  const publish = (patch: Partial<RiskState>) => { state = { ...state, ...patch }; if (!disposed) update(state); };
  const headers = () => ({ 'x-mc-job-token': receipt!.access_token });
  const get = <T>(url: string, init?: RequestInit) => requestJson<T>(url, { ...init, signal: network.signal }, fetcher);
  const alive = (version: number) => !disposed && version === generation;
  async function poll(version: number) {
    try {
      while (alive(version) && receipt) {
        const status = await get<JobStatus>(receipt.status_url, { headers: headers() });
        if (!alive(version)) return;
        if (status.job_id !== receipt.job_id || status.total_runs !== JSON.parse(state.activeInput).monte_carlo.runs || status.completed_runs > status.total_runs) throw new Error('Server returned a different job or run count.');
        publish({ job: status });
        if (status.state === 'succeeded') {
          const result = await get<MCResultExtension>(receipt.result_url, { headers: headers() });
          if (!alive(version)) return;
          const input = JSON.parse(state.activeInput) as MonteCarloRequest;
          if (result.run_id !== receipt.job_id || result.company_id !== input.company_id || result.seed !== input.monte_carlo.seed || result.runs !== input.monte_carlo.runs ||
            JSON.stringify(Object.keys(result.scenarios).sort()) !== JSON.stringify(input.scenarios.map(s => s.id).sort())) throw new Error('Result does not match the submitted job.');
          publish({ source: 'job', result, resultInput: state.activeInput, busy: false, error: '' });
          return;
        }
        if (status.state === 'failed' || status.state === 'cancelled') {
          publish({ busy: false, error: status.state === 'failed' ? (status.error === 'EXECUTION_TIMEOUT' ? 'Simulation timed out. Your previous result is preserved.' : 'Simulation failed. Your previous result is preserved.') : '' });
          return;
        }
        await wait();
      }
    } catch (error) { if (alive(version)) publish({ busy: false, error: `${error instanceof Error ? error.message : 'Could not check job.'} Resume checking to retry this job.` }); }
  }
  return {
    async start(input: MonteCarloRequest) {
      if (state.busy || disposed || (state.job && ['queued', 'running'].includes(state.job.state))) return;
      const version = ++generation;
      network.abort(); network = new AbortController(); receipt = null;
      const activeInput = JSON.stringify(input);
      publish({ busy: true, error: '', job: null, activeInput });
      try {
        const value = await get<Receipt>('/api/v1/simulate/monte-carlo', {
          method: 'POST', headers: { 'content-type': 'application/json' }, body: activeInput,
        });
        if (!alive(version)) return;
        const base = `/api/v1/simulate/monte-carlo/jobs/${value.job_id}`;
        if (value.status_url !== base || value.result_url !== `${base}/result` || !/^[a-f0-9]{64}$/.test(value.access_token)) throw new Error('Invalid job receipt.');
        receipt = value;
        const { access_token: _token, status_url: _status, result_url: _result, ...job } = value;
        publish({ job });
        await poll(version);
      } catch (error) { if (alive(version)) publish({ busy: false, error: `${error instanceof Error ? error.message : 'Submission failed.'} Submission was not confirmed; retrying may create another job.` }); }
    },
    async recorded() {
      if (state.busy || disposed || (state.job && ['queued', 'running'].includes(state.job.state))) return;
      const version = ++generation;
      network.abort(); network = new AbortController(); publish({ busy: true, error: '' });
      try {
        const value = await get<{ request: MonteCarloRequest; result: MCResultExtension }>('/api/v1/simulate/monte-carlo/recorded');
        if (!alive(version)) return;
        receipt = null;
        publish({ source: 'recorded', job: null, result: value.result, resultInput: JSON.stringify(value.request), busy: false });
      } catch (error) { if (alive(version)) publish({ busy: false, error: error instanceof Error ? error.message : 'Could not load recorded benchmark.' }); }
    },
    async resume() {
      if (!receipt || state.busy || disposed) return;
      network.abort(); network = new AbortController();
      publish({ busy: true, error: '' }); await poll(++generation);
    },
    async cancel() {
      if (!receipt || disposed) return;
      const version = ++generation;
      network.abort(); network = new AbortController(); publish({ busy: true, error: '' });
      try {
        const job = await get<JobStatus>(receipt.status_url, { method: 'DELETE', headers: headers() });
        if (!alive(version)) return;
        publish({ job, busy: false });
        if (job.state === 'succeeded') { publish({ busy: true }); await poll(version); }
      } catch (error) { if (alive(version)) publish({ busy: false, error: `${error instanceof Error ? error.message : 'Cancellation failed.'} Cancellation was not confirmed. Resume checking or try cancel again.` }); }
    },
    dispose() {
      disposed = true; generation++; network.abort();
      if (receipt && state.job && ['queued', 'running'].includes(state.job.state)) {
        void fetcher(receipt.status_url, { method: 'DELETE', headers: headers(), keepalive: true }).catch(() => {});
      }
    },
  };
}

type Probability = { value: number | null; valid_path_count: number; unavailable_path_count: number; unavailable_reason: string | null };
export const probabilityLabel = (value: Probability) => value.value === null ? `Unavailable (${value.unavailable_reason?.replaceAll('_', ' ') ?? 'no eligible paths'})` : `${(value.value * 100).toFixed(2)}%`;
export const eligibilityLabel = (value: { valid_path_count: number; unavailable_path_count: number }) => `${value.valid_path_count.toLocaleString('en-US')} eligible · ${value.unavailable_path_count.toLocaleString('en-US')} unavailable`;

/** Baseline has no comparison entry; consume its explicit unavailable distribution. */
export function pairedExit(result: MCResultExtension, scenarioId: string) {
  return result.comparisons[scenarioId]?.paired_terminal_delta_percentiles
    ?? result.scenarios[scenarioId].terminal_distributions.incremental_exit_equity_value;
}
