/** Proposed sampler version: sha256-mulberry32-boxmuller-1; not yet an executable MC contract. */
import { createHash } from 'node:crypto';

export const SAMPLER_VERSION = 'sha256-mulberry32-boxmuller-1' as const;

/** Each risk owns its stream. Scenario names/order and unrelated decisions never enter the seed. */
export function risk_stream(seed: number, run: number, risk: string, investmentKey?: string): () => number {
  if (!Number.isSafeInteger(seed) || seed < 0 || !Number.isSafeInteger(run) || run < 0 || !risk
    || investmentKey === '') throw new Error('Invalid random stream identity');
  const tuple = investmentKey === undefined
    ? [SAMPLER_VERSION, seed, run, risk]
    : [SAMPLER_VERSION, seed, run, investmentKey, risk];
  let state = createHash('sha256').update(JSON.stringify(tuple), 'utf8').digest().readUInt32BE(0);
  return () => {
    // Mulberry32 integer mixing, explicit unsigned wrapping; midpoint conversion excludes 0 and 1.
    state = (state + 0x6D2B79F5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return (((value ^ (value >>> 14)) >>> 0) + 0.5) / 4294967296;
  };
}

function uniform(draw: () => number) {
  const value = draw();
  if (!Number.isFinite(value) || value <= 0 || value >= 1) throw new Error('Uniform draw must lie strictly between 0 and 1');
  return value;
}

export function sample_normal(draw: () => number): number {
  return Math.sqrt(-2 * Math.log(uniform(draw))) * Math.cos(2 * Math.PI * uniform(draw));
}

export function sample_triangular(draw: () => number, min: number, mode: number, max: number): number {
  if (![min, mode, max].every(Number.isFinite) || min > mode || mode > max) throw new Error('Invalid triangular bounds');
  if (min === max) return min;
  const value = uniform(draw);
  const width = max - min;
  if (!Number.isFinite(width)) throw new Error('Triangular range overflow');
  return value < (mode - min) / width
    ? min + Math.sqrt(value * width * (mode - min))
    : max - Math.sqrt((1 - value) * width * (max - mode));
}

export function sample_discrete(draw: () => number, values: readonly number[], probabilities: readonly number[]): number {
  if (values.length === 0 || values.length !== probabilities.length || !values.every(Number.isFinite)
    || !probabilities.every(p => Number.isFinite(p) && p >= 0)
    || Math.abs(probabilities.reduce((sum, p) => sum + p, 0) - 1) > 1e-12) throw new Error('Invalid discrete distribution');
  const value = uniform(draw);
  let cumulative = 0;
  let lastPositive = 0;
  for (let i = 0; i < values.length; i++) {
    cumulative += probabilities[i];
    if (probabilities[i] > 0) lastPositive = i;
    if (value < cumulative) return values[i];
  }
  return values[lastPositive]; // absorb probability-sum floating-point residue only
}

export function resolve_month_offset(configured: number, offset: number): number {
  if (!Number.isSafeInteger(configured) || configured < 0 || !Number.isSafeInteger(offset)) throw new Error('Invalid delay/ramp');
  const resolved = Math.max(0, configured + offset);
  if (!Number.isSafeInteger(resolved)) throw new Error('Resolved delay/ramp exceeds safe integer range');
  return resolved; // no upper clipping; out-of-horizon effects stay out of horizon
}
