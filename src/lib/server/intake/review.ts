import { ProfilePayloadSchema, MAPPING_VERSION, type ProfilePayload, type HistoryRow } from './schemas.ts';

export type DraftIssue = { code: string; pointer: string; message: string };
const reviewed = (field: { state: string; value: unknown }) =>
  (field.state === 'confirmed' || field.state === 'reviewed_estimate') && field.value !== null;

/** Structural/reference review only; never financial compilation or execution eligibility. */
export function reviewDraft(input: unknown) {
  const profile = ProfilePayloadSchema.parse(input);
  const issues: DraftIssue[] = [];
  const add = (code: string, pointer: string, message: string) => issues.push({ code, pointer, message });
  const checkIds = (rows: { [key: string]: unknown }[], key: string, pointer: string) => {
    const found = new Set<string>();
    rows.forEach((row, index) => {
      const id = row[key] as string;
      if (found.has(id)) add('DUPLICATE_ID', `${pointer}/${index}/${key}`, 'Stable IDs must be unique within their collection');
      found.add(id);
    });
    return found;
  };
  const sources = checkIds(profile.sources, 'source_id', '/sources');
  const history = checkIds(profile.history, 'row_id', '/history');
  const mix = checkIds(profile.operations.service_mix.value ?? [], 'row_id', '/operations/service_mix/value');
  checkIds(profile.opening.loans, 'row_id', '/opening/loans');
  checkIds(profile.opening.assets, 'row_id', '/opening/assets');
  checkIds(profile.expense_ledger, 'row_id', '/expense_ledger');
  checkIds(profile.reconciliations, 'row_id', '/reconciliations');
  checkIds(profile.operations.workforce_availability.value?.constraints ?? [], 'row_id', '/operations/workforce_availability/value/constraints');
  const demand = profile.operations.demand_evidence.value;
  if (demand?.kind === 'measured') checkIds(demand.observations, 'row_id', '/operations/demand_evidence/value/observations');
  function walk(value: unknown, pointer: string) {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) { value.forEach((child, index) => walk(child, `${pointer}/${index}`)); return; }
    const record = value as Record<string, unknown>;
    for (const [key, child] of Object.entries(record)) {
      const target = key === 'source_ids' ? sources : key === 'historical_row_ids' ? history : key === 'service_mix_row_ids' ? mix : null;
      if (target && Array.isArray(child)) child.forEach((id, index) => {
        if (!target.has(id)) add('REFERENCE_MISSING', `${pointer}/${key}/${index}`, `Unknown ${key} reference`);
      });
      walk(child, `${pointer}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`);
    }
  }
  walk(profile, '');
  for (const [index, row] of profile.history.entries()) {
    if (reviewed(row.service_jobs) && reviewed(row.service_revenue) && row.service_jobs.value === 0 && row.service_revenue.value !== 0)
      add('SOURCE_CONFLICT', `/history/${index}/service_revenue`, 'Revenue with zero completed jobs needs explicit classification/timing reconciliation');
  }
  return { profile, issues };
}

export function historicalTickets(profile: ProfilePayload, sourceConflicts: ReadonlySet<string> = new Set()) {
  const referenceIssues = reviewDraft(profile).issues.filter(issue => issue.code !== 'SOURCE_CONFLICT');
  return profile.history.map((row: HistoryRow, index: number) => {
    const base = {
      history_row_id: row.row_id, period: row.period, unit: 'USD/job' as const, mapping_version: MAPPING_VERSION,
      source_ids: [...new Set([...row.service_jobs.source_ids, ...row.service_revenue.source_ids])],
      dependencies: [`/history/${index}/service_jobs`, `/history/${index}/service_revenue`],
    };
    const unavailable = (reason: 'zero_jobs' | 'inputs_unreviewed' | 'source_conflict') =>
      ({ ...base, status: 'unavailable' as const, value: null, reason });
    if (sourceConflicts.has(row.row_id)) return unavailable('source_conflict');
    if (!reviewed(row.service_jobs) || !reviewed(row.service_revenue)) return unavailable('inputs_unreviewed');
    const jobs = row.service_jobs.value!;
    const revenue = row.service_revenue.value!;
    if (jobs === 0) return unavailable(revenue === 0 ? 'zero_jobs' : 'source_conflict');
    if (referenceIssues.length) return unavailable('source_conflict');
    // Pool/source reconciliation must be established before exposing an available ticket.
    if (!reviewed(profile.operations.pooling_suitable) || profile.operations.pooling_suitable.value !== true ||
        !reviewed(profile.operations.service_mix) || !profile.operations.service_mix.value?.length ||
        !reviewed(profile.operations.job_definition))
      return unavailable('inputs_unreviewed');
    const mix = profile.operations.service_mix.value;
    if (mix.some(item => item.trade !== 'HVAC' || item.pool_id !== mix[0].pool_id ||
      item.comparable_job_definition !== profile.operations.job_definition.value) ||
      !mix.some(item => item.historical_row_ids.includes(row.row_id))) return unavailable('source_conflict');
    const value = revenue / jobs;
    if (!Number.isFinite(value)) return unavailable('source_conflict');
    return { ...base, status: 'available' as const, value, reason: null };
  });
}
