import saved from '../../../../data/example-monte-carlo-result.json' with { type: 'json' };
import example from '../../../../contracts/example-request.json' with { type: 'json' };
import { APPROVED_POLICIES, MonteCarloRequestSchema } from '../schemas.ts';
import { loadDemoCompany } from '../api/company.ts';
import { loadMonteCarloConfig } from './config.ts';
import { validateMonteCarloResult } from './result.ts';
/** Explicit recorded benchmark, never presented as newly simulated current edits. */
export function loadRecordedMonteCarlo() {
  const request = MonteCarloRequestSchema.parse({ ...example, monte_carlo: { enabled: true, runs: 2000, seed: 42 } });
  const result = validateMonteCarloResult(saved, loadDemoCompany(), request, APPROVED_POLICIES, loadMonteCarloConfig());
  return { request, result };
}
