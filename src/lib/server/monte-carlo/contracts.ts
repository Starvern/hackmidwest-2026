/** Separate MC candidate contracts; deterministic schemas and hashes remain frozen. */
import { z } from 'zod';
import { MonteCarloScenarioSchema, MonteCarloSummarySchema, ProvenanceManifestSchema } from '../schemas.ts';
import { sha256Canonical } from '../fingerprint.ts';
import { scalarLeaves } from '../validation.ts';

export const MC_CONFIG_VERSION = 'mc-config-1-proposed' as const;
export const MC_SAMPLER_VERSION = 'sha256-mulberry32-boxmuller-1' as const;
export const MC_EXECUTION_VERSION = 'mc-execution-1-proposed' as const;
export const MC_RESULT_VERSION = 'mc-result-1-proposed' as const;
/** Absolute tolerance for reported probability/count reconciliation. */
export const MC_PROBABILITY_TOLERANCE = 1e-12;
const finite = z.number();
const count = z.number().int().nonnegative();
const positive = finite.positive();
export const MCTriangularSchema = z.strictObject({
  family: z.literal('triangular'), min: positive, mode: positive, max: positive,
}).refine(v => v.min <= v.mode && v.mode <= v.max, 'Expected min <= mode <= max');
export const MCDiscreteOffsetSchema = z.strictObject({
  family: z.literal('discrete'), values: z.array(z.number().int()).min(1),
  probabilities: z.array(finite.min(0).max(1)).min(1),
}).superRefine((v, ctx) => {
  if (v.values.length !== v.probabilities.length) ctx.addIssue({ code: 'custom', path: ['probabilities'], message: 'Values and probabilities must have equal length' });
  if (new Set(v.values).size !== v.values.length) ctx.addIssue({ code: 'custom', path: ['values'], message: 'Offsets must be unique' });
  if (Math.abs(v.probabilities.reduce((sum, p) => sum + p, 0) - 1) > 1e-12) ctx.addIssue({ code: 'custom', path: ['probabilities'], message: 'Probabilities must sum to 1 within 1e-12' });
});
const factorMapping = z.strictObject({
  transform: z.literal('exp_loading'), loading: finite.nonnegative(), lower: positive, upper: positive,
}).refine(v => v.lower <= 1 && v.upper >= 1, 'Factor bounds must include neutral multiplier 1');

/** Units apply only to this MC manifest, never company/decision unit vocabulary. */
export function mcConfigUnit(pointer: string, value: unknown): string {
  if (typeof value === 'string' || typeof value === 'boolean') return 'label';
  if (pointer.startsWith('/macro/update_months/')) return 'forecast_month_index';
  if (pointer.startsWith('/macro/')) return 'dimensionless';
  if (/\/probabilities\/\d+$/.test(pointer)) return 'probability';
  if (/\/values\/\d+$/.test(pointer)) return 'months';
  if (pointer.startsWith('/mappings/') || pointer.startsWith('/shared/') || pointer.startsWith('/decision/marketing_effectiveness/') || pointer.startsWith('/fixed_market_factors/')) return 'multiple';
  throw new Error(`Unknown MC scalar unit: ${pointer}`);
}
export const MCConfigSchema = z.strictObject({
  config_version: z.literal(MC_CONFIG_VERSION), sampler_version: z.literal(MC_SAMPLER_VERSION),
  execution_version: z.literal(MC_EXECUTION_VERSION),
  macro: z.strictObject({
    family: z.literal('latent_ar1'), initial_state: finite, rho: finite.gt(-1).lt(1),
    innovation_spread: finite.nonnegative(), lower: finite, upper: finite,
    update_months: z.tuple([z.literal(1), z.literal(13), z.literal(25), z.literal(37), z.literal(49)]),
  }).refine(v => v.lower <= v.initial_state && v.initial_state <= v.upper, 'Initial macro state must lie within ordered bounds'),
  mappings: z.strictObject({ demand: factorMapping, ticket: factorMapping,
    valuation_multiple: z.strictObject({ transform: z.literal('request_multiple_plus_loading'),
      loading: finite.nonnegative(), lower: positive, upper: positive, expand_bounds_to_request: z.literal(true),
    }).refine(v => v.lower <= v.upper, 'Expected ordered valuation bounds'),
  }),
  shared: z.strictObject({ wage: MCTriangularSchema, vehicle_opex: MCTriangularSchema }),
  decision: z.strictObject({ marketing_effectiveness: MCTriangularSchema,
    truck_service_delay_offset: MCDiscreteOffsetSchema, hiring_delay_offset: MCDiscreteOffsetSchema,
    ramp_offset: MCDiscreteOffsetSchema,
  }),
  fixed_market_factors: z.strictObject({ overhead_multiplier: z.literal(1),
    service_variable_cost_multiplier: z.literal(1), other_revenue_multiplier: z.literal(1), other_direct_cost_multiplier: z.literal(1),
  }),
  provenance: ProvenanceManifestSchema,
}).superRefine((v, ctx) => {
  const leaves = scalarLeaves(v);
  const expected = new Set(leaves.map(([pointer]) => pointer));
  for (const [pointer, value] of leaves) {
    const entry = v.provenance[pointer];
    if (!entry) ctx.addIssue({ code: 'custom', path: ['provenance', pointer], message: 'Missing MC scalar-leaf provenance' });
    else if (entry.unit !== mcConfigUnit(pointer, value)) ctx.addIssue({ code: 'custom', path: ['provenance', pointer, 'unit'], message: `Expected ${mcConfigUnit(pointer, value)}` });
  }
  for (const pointer of Object.keys(v.provenance)) if (!expected.has(pointer)) ctx.addIssue({ code: 'custom', path: ['provenance', pointer], message: 'Dangling MC provenance pointer' });
});

export const MCValuationMultiplesSchema = z.array(positive).length(60).readonly();

export const MCPaybackCountsSchema = z.strictObject({
  reached_count: count, subsequent_reversal_count: count,
}).refine(v => v.subsequent_reversal_count <= v.reached_count, 'Reversal count cannot exceed reached count');

/** Separate returned candidate envelope; not silently substituted for SimulationResult.monte_carlo. */
export const MCResultExtensionSchema = z.strictObject({
  extension_version: z.literal(MC_RESULT_VERSION), schema_version: z.literal('1.0'),
  model_version: z.literal('mvp-1.0'), contract_revision: z.literal(1),
  run_id: z.string().min(1), company_id: z.string().min(1), runs: z.number().int().min(2000).max(5000), seed: count,
  config_version: z.literal(MC_CONFIG_VERSION), sampler_version: z.literal(MC_SAMPLER_VERSION), execution_version: z.literal(MC_EXECUTION_VERSION),
  config_fingerprint: z.string().regex(/^[a-f0-9]{64}$/), input_fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  configuration: MCConfigSchema,
  scenarios: z.record(z.string().min(1), MonteCarloScenarioSchema),
  comparisons: MonteCarloSummarySchema.shape.comparisons,
  payback_counts: z.record(z.string().min(1), MCPaybackCountsSchema),
}).superRefine((v, ctx) => {
  if (v.config_fingerprint !== sha256Canonical(v.configuration)) ctx.addIssue({ code: 'custom', path: ['config_fingerprint'], message: 'Configuration fingerprint mismatch' });
  const keys = Object.keys(v.scenarios).sort();
  const sameKeys = (record: object, expected: string[]) => JSON.stringify(Object.keys(record).sort()) === JSON.stringify(expected);
  if (keys.length < 3 || !keys.includes('baseline') || !sameKeys(v.payback_counts, keys) || !sameKeys(v.comparisons, keys.filter(key => key !== 'baseline'))) {
    ctx.addIssue({ code: 'custom', message: 'Require baseline/two alternatives and matching comparison/payback keys' });
  }
  for (const [id, scenario] of Object.entries(v.scenarios)) {
    const counts = v.payback_counts[id];
    if (!counts) continue;
    if (counts.reached_count + scenario.payback.not_reached_count + scenario.payback.not_applicable_count !== v.runs ||
      (counts.reached_count === 0) !== (scenario.payback.median_month_conditional_on_payback_or_null === null)) {
      ctx.addIssue({ code: 'custom', path: ['payback_counts', id], message: 'Payback counts/median must reconcile to runs and scenario summary' });
    }
    if (id === 'baseline' && scenario.payback.not_applicable_count !== v.runs) ctx.addIssue({ code: 'custom', path: ['payback_counts', id], message: 'Baseline payback must be not applicable' });
    const eligible = counts.reached_count + scenario.payback.not_reached_count;
    const probability = scenario.payback.probability_within_horizon;
    if (probability.valid_path_count !== eligible || probability.unavailable_path_count !== scenario.payback.not_applicable_count ||
      (eligible === 0 ? probability.value !== null || probability.unavailable_reason !== 'not_applicable'
        : probability.value === null || probability.unavailable_reason !== null ||
          Math.abs(probability.value - counts.reached_count / eligible) > MC_PROBABILITY_TOLERANCE)) {
      ctx.addIssue({ code: 'custom', path: ['scenarios', id, 'payback', 'probability_within_horizon'], message: 'Payback probability must match reached/eligible counts (absolute tolerance 1e-12)' });
    }
    const duplicate = scenario.path_risks.probability_payback_by_month_60;
    if (duplicate.value !== probability.value || duplicate.valid_path_count !== probability.valid_path_count ||
      duplicate.unavailable_path_count !== probability.unavailable_path_count || duplicate.unavailable_reason !== probability.unavailable_reason) {
      ctx.addIssue({ code: 'custom', path: ['scenarios', id, 'path_risks', 'probability_payback_by_month_60'], message: 'Duplicate payback probability objects must agree exactly' });
    }
    if (id === 'baseline') {
      const risk = scenario.path_risks.probability_negative_exit_equity_delta;
      if (risk.value !== null || risk.valid_path_count !== 0 || risk.unavailable_path_count !== v.runs || risk.unavailable_reason !== 'not_applicable') {
        ctx.addIssue({ code: 'custom', path: ['scenarios', id, 'path_risks', 'probability_negative_exit_equity_delta'], message: 'Baseline incremental exit risk must be unavailable/not applicable' });
      }
      const terminal = scenario.terminal_distributions.incremental_exit_equity_value;
      if (terminal.valid_path_count !== 0 || terminal.unavailable_path_count !== v.runs ||
        [terminal.p10, terminal.p50, terminal.p90, terminal.mean].some(value => value !== null)) {
        ctx.addIssue({ code: 'custom', path: ['scenarios', id, 'terminal_distributions', 'incremental_exit_equity_value'], message: 'Baseline incremental terminal distribution must be entirely unavailable' });
      }
    }
  }
  const inspect = (value: unknown, path: (string | number)[]) => {
    if (!value || typeof value !== 'object') return;
    const record = value as Record<string, unknown>;
    if (typeof record.valid_path_count === 'number' && typeof record.unavailable_path_count === 'number' && record.valid_path_count + record.unavailable_path_count !== v.runs) {
      ctx.addIssue({ code: 'custom', path, message: 'Valid + unavailable path counts must equal runs' });
    }
    Object.entries(record).forEach(([key, item]) => inspect(item, [...path, key]));
  };
  inspect(v.scenarios, ['scenarios']); inspect(v.comparisons, ['comparisons']);
});
