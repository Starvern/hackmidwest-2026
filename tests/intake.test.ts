import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { PROFILE_VERSION, ProfilePayloadSchema, HistoryRowSchema, OperationsSchema, AssumptionsSchema,
  LoanRowSchema, ExpenseRowSchema, profileField, WorkforceAvailabilitySchema, DemandEvidenceSchema } from '../src/lib/server/intake/schemas.ts';
import { reviewDraft, historicalTickets } from '../src/lib/server/intake/review.ts';

const period = { as_of: '2025-12-31' };
const review = { actor_id: 'owner-1', reviewed_at: '2026-01-01T00:00:00Z', rationale: 'Reviewed statement facts' };
const field = (unit: string, value: unknown = null, state = 'unknown') => ({
  value, state, unit, period, source_ids: value === null ? [] : ['source-1'], raw: null, derivation: null,
  review: state === 'confirmed' || state === 'reviewed_estimate' ? review : null,
});
function unknownFields(schema: z.ZodObject) {
  return Object.fromEntries(Object.entries(schema.shape).map(([key, child]) => {
    if (child instanceof z.ZodObject && 'unit' in child.shape) return [key, field(child.shape.unit.value)];
    if (key === 'seasonality') return [key, Array.from({ length: 12 }, () => field('dimensionless'))];
    throw new Error(`Not an envelope: ${key}`);
  }));
}
function draft() {
  return ProfilePayloadSchema.parse({
    profile_version: PROFILE_VERSION,
    business: unknownFields(ProfilePayloadSchema.shape.business), history: [],
    opening: { ...unknownFields(z.object(Object.fromEntries(Object.entries(ProfilePayloadSchema.shape.opening.shape).filter(([key]) => !['loans', 'assets'].includes(key))))), loans: [], assets: [] },
    operations: unknownFields(OperationsSchema), assumptions: unknownFields(AssumptionsSchema), expense_ledger: [], sources: [], reconciliations: [], reviews: [],
  });
}
function history(jobs: number | null, revenue: number | null, id = 'history-1') {
  const scalar = z.object(Object.fromEntries(Object.entries(HistoryRowSchema.shape).filter(([key]) => !['row_id', 'period'].includes(key))));
  return HistoryRowSchema.parse({ ...unknownFields(scalar), row_id: id, period: '2025-01',
    service_jobs: field('jobs/month', jobs, jobs === null ? 'unknown' : 'confirmed'),
    service_revenue: field('USD/month', revenue, revenue === null ? 'unknown' : 'confirmed'),
  });
}
test('draft envelopes preserve unknown versus confirmed zero and never coerce values or units', () => {
  const schema = profileField(z.number(), 'USD');
  assert.equal(schema.parse(field('USD', 0, 'confirmed')).value, 0);
  assert.equal(schema.parse(field('USD')).value, null);
  for (const bad of [field('USD', '0', 'confirmed'), field('USD/month', 0, 'confirmed'), field('USD', 0),
    { ...field('USD', 0, 'confirmed'), review: null }, { ...field('USD', 0, 'confirmed'), source_ids: [] }, field('USD', Infinity, 'entered')])
    assert.equal(schema.safeParse(bad).success, false);
  assert.equal(schema.safeParse({ ...field('USD'), period: { as_of: '2025-02-30' } }).success, false);
  assert.equal(ProfilePayloadSchema.safeParse({ ...draft(), confirmation: {} }).success, false);
});
test('structured evidence preserves unsupported workforce facts and rejects ambiguous demand', () => {
  const constraint = { row_id: 'person-1', people: 1, kind: 'part_time', available_fraction: null, productivity_fraction: null, pool_id: null, description: 'Availability not yet measured', source_ids: [] };
  assert.equal(WorkforceAvailabilitySchema.parse({ declaration: 'itemized', constraints: [constraint] }).constraints[0].available_fraction, null);
  assert.equal(WorkforceAvailabilitySchema.safeParse({ declaration: 'none', constraints: [constraint] }).success, false);
  assert.equal(DemandEvidenceSchema.safeParse({ kind: 'measured', observations: [] }).success, false);
  assert.equal(DemandEvidenceSchema.safeParse({ kind: 'confirmed_no_unserved', historical_row_ids: [], rationale: 'None', source_ids: [] }).success, false);
  const operations = draft().operations;
  const estimate = { kind: 'reviewed_estimate', period_start: '2025-01-01', period_end: '2025-12-31', estimated_jobs_per_month: 600, method: 'Owner estimate', limitations: 'No request log', service_mix_row_ids: [], source_ids: ['source-1'] };
  assert.equal(OperationsSchema.safeParse({ ...operations, demand_evidence: field('record', estimate, 'confirmed') }).success, false);
  assert.equal(OperationsSchema.safeParse({ ...operations, demand_evidence: field('record', estimate, 'reviewed_estimate') }).success, true);
});
test('blank draft has no demo facts; source references and stable IDs are checked', () => {
  const profile = draft();
  assert.deepEqual(reviewDraft(profile).issues, []);
  assert.equal(profile.operations.forecast_ticket.value, null);
  profile.history = [history(0, 100), history(0, 0)];
  const issues = reviewDraft(profile).issues;
  assert.ok(issues.some(i => i.code === 'DUPLICATE_ID'));
  assert.ok(issues.some(i => i.code === 'REFERENCE_MISSING'));
  assert.ok(issues.some(i => i.code === 'SOURCE_CONFLICT'));
});
test('historical tickets distinguish zero, unknown and conflicting sources', () => {
  const profile = draft();
  profile.sources = [{ source_id: 'source-1', kind: 'manual_statement', title: 'Owner records', period, locator: null }];
  profile.history = [history(0, 0, 'zero'), history(0, 100, 'conflict'), history(null, null, 'unknown'), history(4, 700, 'positive')];
  assert.deepEqual(historicalTickets(profile).map(t => t.reason), ['zero_jobs', 'source_conflict', 'inputs_unreviewed', 'inputs_unreviewed']);
  profile.operations.pooling_suitable = profileField(z.boolean(), 'boolean').parse(field('boolean', true, 'confirmed'));
  profile.operations.job_definition = profileField(z.string(), 'text').parse(field('text', 'One repair', 'confirmed'));
  profile.sources = [{ source_id: 'source-1', kind: 'manual_statement', title: 'Owner records', period, locator: null }];
  profile.operations.service_mix = OperationsSchema.shape.service_mix.parse(field('record_list', [{ row_id: 'mix-1', trade: 'HVAC', service_kind: 'repair', description: 'Service jobs', comparable_job_definition: 'One repair', pool_id: 'pool-1', historical_row_ids: ['positive'], completed_jobs: null, service_revenue_usd: null, source_ids: ['source-1'] }], 'confirmed'));
  assert.equal(historicalTickets(profile)[3].value, 175);
  assert.equal(historicalTickets(profile, new Set(['positive']))[3].reason, 'source_conflict');
  profile.sources = [];
  assert.equal(historicalTickets(profile)[3].reason, 'source_conflict');
});
test('financial rows use the exact workbook member spellings and strict mapping choices', () => {
  assert.deepEqual(Object.keys(LoanRowSchema.shape), ['row_id', 'lender', 'name', 'amortization_policy', 'terms_source', 'outstanding_principal', 'monthly_principal', 'annual_rate', 'remaining_term', 'next_payment_date']);
  assert.equal(ExpenseRowSchema.shape.mapping_mode.safeParse(field('text', 'included_detail', 'confirmed')).success, true);
  assert.equal(ExpenseRowSchema.shape.mapping_mode.safeParse(field('text', 'add_to_total', 'confirmed')).success, false);
});
