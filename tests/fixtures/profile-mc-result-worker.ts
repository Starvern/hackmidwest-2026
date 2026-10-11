/** Synthetic protocol fixture: saved summary re-contextualized for transport tests only.
 * Does not compute or claim company-specific forecast/financial acceptance.
 */
import { parentPort, workerData } from 'node:worker_threads';
import { readFileSync } from 'node:fs';
import { profileMCContext } from '../../src/lib/server/monte-carlo/binding.ts';
const context = profileMCContext(workerData.profileContext.company, workerData.company, workerData.request, workerData.config);
const result = JSON.parse(readFileSync(new URL('../../data/example-monte-carlo-result.json', import.meta.url), 'utf8'));
Object.assign(result, { company_id: workerData.company.id, run_id: workerData.runId, configuration: workerData.config,
  input_fingerprint: context.input_fingerprint, config_fingerprint: context.config_fingerprint });
for (let completed = 1; completed <= 2000; completed++) parentPort!.postMessage({ type: 'progress', completed });
const mode = workerData.runId;
parentPort!.postMessage({ type: 'result', result, ...(mode === 'missing-binding' ? {} : {
  profileContext: mode === 'wrong-binding' ? { ...context, company: { ...context.company, revision: context.company.revision + 1 } } : context,
}) });
parentPort!.close();
