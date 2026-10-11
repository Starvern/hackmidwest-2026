import { riskGroups } from '../src/lib/intake/risk-fields.ts';
import { loadMonteCarloConfig } from '../src/lib/server/monte-carlo/config.ts';
export function riskDraft() {
  const config = loadMonteCarloConfig(); // Explicit synthetic test settings, never an editor default.
  return { editor_version: 'risk-editor-1' as const, start: '2026-01-01', end: '2026-12-31', omitted_uncertainty_acknowledged: true as const,
    values: Object.fromEntries(riskGroups.flatMap(g => g[3].map(path => {
      const v = path.split('.').reduce<any>((o,k) => o[k],config); return [path,Array.isArray(v) ? v.join(', ') : String(v)];
    }))),
    evidence: Object.fromEntries(riskGroups.map(g => [g[0],{ source_id: 'source', method: 'Illustrative synthetic test parameters; no fitted sample. Shared dependence follows the candidate engine.', limitations: 'Test only; no empirical calibration or holdout validation. Fixed factors omit uncertainty.' }])) };
}
