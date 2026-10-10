/** Source-runtime worker entry. Packaging into a deployed host is a separate gate. */
import { parentPort, workerData } from 'node:worker_threads';
import { simulate_monte_carlo } from '../engine/monte_carlo.ts';
if (!parentPort) throw new Error('MC entry requires a worker thread');
const port = parentPort;
try {
  const { company, request, config, runId } = workerData;
  const result = simulate_monte_carlo(company, request, config, runId,
    completed => port.postMessage({ type: 'progress', completed }));
  port.postMessage({ type: 'result', result });
} catch (error) {
  console.error('Monte Carlo worker failed', error);
  port.postMessage({ type: 'failure' });
} finally {
  port.close();
}
