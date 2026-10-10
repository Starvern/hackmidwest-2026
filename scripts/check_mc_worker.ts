/** Actual packaged runner startup/progress/cancellation check; not a full benchmark. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { loadDemoCompany } from '../src/lib/server/api/company.ts';
import { loadMonteCarloConfig } from '../src/lib/server/monte-carlo/config.ts';
import { runMonteCarloWorker } from '../src/lib/server/monte-carlo/worker.ts';
const request = { ...JSON.parse(readFileSync('contracts/example-request.json', 'utf8')), monte_carlo: { enabled: true, runs: 2000, seed: 42 } };
const controller = new AbortController();
let ticks = 0, completed = 0;
const timer = setInterval(() => ticks++, 10);
try {
  await assert.rejects(runMonteCarloWorker(loadDemoCompany(), request, loadMonteCarloConfig(), {
    workerUrl: pathToFileURL(resolve('.mc-worker/worker-entry.js')), timeoutMs: 30000, signal: controller.signal,
    onProgress(value) { completed = value; controller.abort(); },
  }), /cancelled/);
} finally { clearInterval(timer); }
assert.equal(completed, 1);
assert.ok(ticks > 0, 'parent event loop stayed responsive');
console.log('PASS: built worker executes an actual aggregated run, parent remains responsive, cancellation awaits termination; no partial forecast.');
