/** Shared synthetic profile/transport fixtures; no company calibration claim. */
import { readFileSync } from 'node:fs';
import { eligibleFixture } from './intake-fixture.ts';
import { ProfileStore, type ReviewSelection } from '../src/lib/server/intake/store.ts';
import { loadMonteCarloConfig } from '../src/lib/server/monte-carlo/config.ts';
import { profileMCContext } from '../src/lib/server/monte-carlo/binding.ts';
import { MonteCarloRequestSchema } from '../src/lib/server/schemas.ts';
import example from '../contracts/example-request.json' with { type: 'json' };
function selections(value: unknown, pointer = ''): ReviewSelection[] {
  if (!value || typeof value !== 'object') return [];
  if ('state' in value && 'value' in value) return value.value === null ? [] : [{ pointer, state: 'confirmed', rationale: 'Synthetic transport test review' }];
  return Object.entries(value).flatMap(([key, child]) => selections(child, `${pointer}/${key}`));
}
export function setup(withRisk = true, store = new ProfileStore(':memory:')) {
  const p = eligibleFixture();
  // Explicit fixture-only config, never a production fallback or company calibration claim.
  if (withRisk) p.assumptions.risk_configuration = { ...p.opening.cash, value: JSON.parse(JSON.stringify(loadMonteCarloConfig())), unit: 'record' };
  const created = store.create('owner', p), id = created.profile_id;
  const reviews = selections(created.revisions[0].profile);
  reviews.push({ pointer: '/sources/0', state: 'confirmed', rationale: 'Synthetic source review' });
  const reviewed = store.review('owner', id, 1, reviews);
  const preview = store.preview('owner', id, reviewed.revision);
  store.acknowledge('owner', id, reviewed.revision, preview.preview_id);
  const confirmed = store.confirm('owner', id, reviewed.revision);
  const company = confirmed.compiled!.binding;
  const input = { simulation_version: 'profile-simulation-2-draft' as const, company,
    request: MonteCarloRequestSchema.parse({ ...structuredClone(example), company_id: `profile:${id}`, monte_carlo: { enabled: true, runs: 2000, seed: 42 } }) };
  return { store, input, id };
}
/** Synthetic full-envelope adapter: validates transport, never represents new sampled output. */
export function syntheticResult(company: any, request: any, config: any, options: any) {
  const result = JSON.parse(readFileSync('data/example-monte-carlo-result.json', 'utf8'));
  const context = profileMCContext(options.profileContext.company, company, request, config);
  for (let completed = 1; completed <= 2000; completed++) options.onProgress(completed);
  return { ...result, company_id: company.id, run_id: options.runId, configuration: config,
    input_fingerprint: context.input_fingerprint, config_fingerprint: context.config_fingerprint };
}
