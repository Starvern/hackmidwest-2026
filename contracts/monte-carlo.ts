/** Generated separate MC candidate types. */
import type { z } from 'zod';
import type * as Runtime from '../src/lib/server/monte-carlo/contracts.ts';

export type MCConfig = z.infer<typeof Runtime.MCConfigSchema>;
export type MCDiscreteOffset = z.infer<typeof Runtime.MCDiscreteOffsetSchema>;
export type MCPaybackCounts = z.infer<typeof Runtime.MCPaybackCountsSchema>;
export type MCResultExtension = z.infer<typeof Runtime.MCResultExtensionSchema>;
export type MCTriangular = z.infer<typeof Runtime.MCTriangularSchema>;
export type MCValuationMultiples = z.infer<typeof Runtime.MCValuationMultiplesSchema>;
