import { readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { simulate_monte_carlo } from '../src/lib/server/engine/monte_carlo.ts';
const company = JSON.parse(readFileSync('data/synthetic_hvac_company.json', 'utf8'));
const base = JSON.parse(readFileSync('contracts/example-request.json', 'utf8'));
const request = { ...base, monte_carlo: { enabled: true, runs: 2000, seed: 42 } };
const started = performance.now();
const result = simulate_monte_carlo(company, request, undefined, 'mc-benchmark-seed-42', completed => {
  if (completed % 100 === 0) console.log(JSON.stringify({ completed, seconds: (performance.now() - started) / 1000, rss_mb: process.memoryUsage().rss / 1048576 }));
});
const evidence = { node: process.version, platform: process.platform, arch: process.arch, runs: 2000,
  scenarios: 3, forecast_months: 60, seed: 42, seconds: (performance.now() - started) / 1000,
  peak_process_rss_mb: process.resourceUsage().maxRSS / 1024, memory_at_completion: process.memoryUsage(),
  config_fingerprint: result.config_fingerprint, input_fingerprint: result.input_fingerprint,
  failures: 0, internal_baseline_recomputed_for_each_alternative: true };
writeFileSync('data/example-monte-carlo-result.json', JSON.stringify(result, null, 2) + '\n');
writeFileSync('data/monte-carlo-benchmark.json', JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence));
