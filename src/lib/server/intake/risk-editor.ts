/** Blank-first editor adapter into the existing complete MCConfig; no demo loader. */
import { z } from 'zod';
import { riskGroups } from '../../intake/risk-fields.ts';
import { MCConfigSchema, MC_CONFIG_VERSION, MC_SAMPLER_VERSION, MC_EXECUTION_VERSION, mcConfigUnit } from '../monte-carlo/contracts.ts';
import { scalarLeaves } from '../validation.ts';
import type { ProfilePayload } from './schemas.ts';
export class RiskEditorFailure extends Error {}
export const RiskEditorInputSchema = z.strictObject({
  editor_version: z.literal('risk-editor-1'), start: z.iso.date(), end: z.iso.date(),
  values: z.record(z.string().max(120), z.string().max(2000)),
  evidence: z.record(z.string().max(30), z.strictObject({ source_id: z.string().min(1).max(200), method: z.string().trim().min(1).max(4000), limitations: z.string().trim().min(1).max(4000) })),
  omitted_uncertainty_acknowledged: z.literal(true),
}).refine(v => v.start <= v.end, 'Coverage dates are reversed');
export function prepareRiskConfiguration(value: unknown, sources: ProfilePayload['sources']) {
  const draft = RiskEditorInputSchema.parse(value);
  const expected = riskGroups.flatMap(g => [...g[3]]);
  if (Object.keys(draft.values).length !== expected.length || expected.some(p => !Object.hasOwn(draft.values,p)) || Object.keys(draft.evidence).length !== riskGroups.length) throw new RiskEditorFailure('Complete every risk group and parameter; extra fields are unsupported');
  const config: Record<string, any> = { config_version: MC_CONFIG_VERSION, sampler_version: MC_SAMPLER_VERSION, execution_version: MC_EXECUTION_VERSION,
    macro: { family: 'latent_ar1', update_months: [1,13,25,37,49] },
    mappings: { demand: { transform: 'exp_loading' }, ticket: { transform: 'exp_loading' }, valuation_multiple: { transform: 'request_multiple_plus_loading', expand_bounds_to_request: true } },
    shared: { wage: { family: 'triangular' }, vehicle_opex: { family: 'triangular' } },
    decision: { marketing_effectiveness: { family: 'triangular' }, truck_service_delay_offset: { family: 'discrete' }, hiring_delay_offset: { family: 'discrete' }, ramp_offset: { family: 'discrete' } },
    fixed_market_factors: { overhead_multiplier: 1, service_variable_cost_multiplier: 1, other_revenue_multiplier: 1, other_direct_cost_multiplier: 1 },
  };
  const provenance: Record<string, any> = {}, ids = new Set<string>();
  for (const [group,,,paths] of riskGroups) {
    const evidence = draft.evidence[group], source = sources.find(s => s.source_id === evidence?.source_id);
    if (!evidence || !source || !source.period) throw new RiskEditorFailure(`Choose a dated source for ${group}`);
    ids.add(source.source_id);
    for (const path of paths) {
      const raw = draft.values[path].trim();
      const array = /\.(values|probabilities)$/.test(path);
      const pieces = array ? raw.split(',').map(v => v.trim()) : [raw];
      if (pieces.some(v => !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(v) || !Number.isFinite(Number(v)))) throw new RiskEditorFailure(`Enter a number${array ? ' list' : ''} for ${path}; blank is unknown`);
      const keys = path.split('.'), key = keys.pop()!;
      const parent = keys.reduce((o,k) => o[k], config); parent[key] = array ? pieces.map(Number) : Number(raw);
    }
    // Scalar-leaf provenance records the group-specific source, method and limitations.
    const prefixes = group === 'macro' ? ['/macro/','/mappings/demand/','/mappings/ticket/'] : group === 'valuation' ? ['/mappings/valuation_multiple/'] : group === 'fixed' ? ['/fixed_market_factors/','/config_version','/sampler_version','/execution_version'] : group === 'wage' ? ['/shared/wage/'] : group === 'fleet' ? ['/shared/vehicle_opex/'] : group === 'marketing' ? ['/decision/marketing_effectiveness/'] : [`/decision/${group === 'delivery' ? 'truck_service_delay_offset' : group === 'hiring' ? 'hiring_delay_offset' : 'ramp_offset'}/`];
    for (const [pointer,leaf] of scalarLeaves(config)) if (prefixes.some(p => pointer.startsWith(p))) provenance[pointer] = { kind: 'assumed', unit: mcConfigUnit(pointer,leaf), source: `Profile source ${source.source_id} (${source.title}); method: ${evidence.method}; limitations: ${evidence.limitations}` };
  }
  return { configuration: MCConfigSchema.parse({ ...config, provenance }), source_ids: [...ids], draft };
}
