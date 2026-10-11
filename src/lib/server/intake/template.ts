import { z } from 'zod';
import { ProfilePayloadSchema, PROFILE_VERSION, HistoryRowSchema, LoanRowSchema, AssetRowSchema, ExpenseRowSchema, DateSchema } from './schemas.ts';

function envelopes(schema: z.ZodObject, period: unknown) {
  return Object.fromEntries(Object.entries(schema.shape).filter(([key]) => !['row_id', 'period'].includes(key)).map(([key, child]) => {
    if (child instanceof z.ZodObject && 'unit' in child.shape) return [key, { value: null, state: 'unknown', unit: child.shape.unit.value, period, source_ids: [], raw: null, derivation: null, review: null }];
    if (key === 'seasonality') return [key, Array.from({ length: 12 }, () => ({ value: null, state: 'unknown', unit: 'dimensionless', period, source_ids: [], raw: null, derivation: null, review: null }))];
    if (child instanceof z.ZodArray) return [key, []];
    throw new Error('Unknown intake template field');
  }));
}
export function intakeTemplate(date: string) {
  DateSchema.parse(date);
  const period = { as_of: date }, year = Number(date.slice(0, 4));
  const profile = ProfilePayloadSchema.parse({
    profile_version: PROFILE_VERSION,
    business: envelopes(ProfilePayloadSchema.shape.business, period),
    history: Array.from({ length: 12 }, (_, i) => {
      const month = `${year}-${String(i + 1).padStart(2, '0')}`;
      return { ...envelopes(HistoryRowSchema, { start: `${month}-01`, end: `${month}-${new Date(Date.UTC(year, i + 1, 0)).getUTCDate()}` }), row_id: `history-${i + 1}`, period: month };
    }),
    opening: envelopes(ProfilePayloadSchema.shape.opening, period),
    operations: envelopes(ProfilePayloadSchema.shape.operations, period),
    assumptions: envelopes(ProfilePayloadSchema.shape.assumptions, period),
    expense_ledger: [], sources: [], reconciliations: [], reviews: [],
  });
  profile.business.books_through.value = date; profile.business.books_through.state = 'entered';
  return { profile, rows: {
    loan: { ...envelopes(LoanRowSchema, period), row_id: '' },
    asset: { ...envelopes(AssetRowSchema, period), row_id: '' },
    expense: { ...envelopes(ExpenseRowSchema, period), row_id: '' },
  } };
}
