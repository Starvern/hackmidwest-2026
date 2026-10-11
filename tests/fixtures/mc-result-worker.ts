/** Protocol/transfer fixture: replays saved real output; does not execute sampled paths. */
import { parentPort, workerData } from 'node:worker_threads';
import { readFileSync } from 'node:fs';
const result = JSON.parse(readFileSync(new URL('../../data/example-monte-carlo-result.json', import.meta.url), 'utf8'));
result.run_id = workerData.runId === 'invalid-result' ? 'wrong-id' : workerData.runId;
for (let completed = 1; completed <= 2000; completed++) parentPort!.postMessage({ type: 'progress', completed });
parentPort!.postMessage({ type: 'result', result });
parentPort!.close();
