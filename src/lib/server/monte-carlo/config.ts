import proposed from '../../../../data/monte-carlo-config.proposed.json' with { type: 'json' };
import { MCConfigSchema } from './contracts.ts';

/** P2 owns manifest data; P3 owns its candidate validation/loading. Not product readiness. */
export function loadMonteCarloConfig() {
  return MCConfigSchema.parse(proposed);
}
