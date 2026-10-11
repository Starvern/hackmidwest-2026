/** Generated intake types. Validation/review rules live in the authoritative runtime. */
import type { z } from 'zod';
import type * as Runtime from '../src/lib/server/intake/schemas.ts';

export type AssetRow = z.infer<typeof Runtime.AssetRowSchema>;
export type Assumptions = z.infer<typeof Runtime.AssumptionsSchema>;
export type Date = z.infer<typeof Runtime.DateSchema>;
export type DemandEvidence = z.infer<typeof Runtime.DemandEvidenceSchema>;
export type ExpenseRow = z.infer<typeof Runtime.ExpenseRowSchema>;
export type HistoryRow = z.infer<typeof Runtime.HistoryRowSchema>;
export type LoanRow = z.infer<typeof Runtime.LoanRowSchema>;
export type Operations = z.infer<typeof Runtime.OperationsSchema>;
export type Period = z.infer<typeof Runtime.PeriodSchema>;
export type ProfilePayload = z.infer<typeof Runtime.ProfilePayloadSchema>;
export type ProfileUnit = z.infer<typeof Runtime.ProfileUnitSchema>;
export type Review = z.infer<typeof Runtime.ReviewSchema>;
export type ServiceMixRow = z.infer<typeof Runtime.ServiceMixRowSchema>;
export type WorkforceAvailability = z.infer<typeof Runtime.WorkforceAvailabilitySchema>;
