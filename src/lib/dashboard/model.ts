import type { Decision, DeterministicRequest, MetricKey, OpeningRecord, ForecastRecord, Payback } from '../../../contracts/contracts.ts';

type MonthRecord = OpeningRecord | ForecastRecord;
export const metrics: { key: MetricKey; label: string; unit: string }[] = [
  { key: 'cash_end', label: 'Cash balance', unit: 'USD' },
  { key: 'ebitda', label: 'Monthly EBITDA', unit: 'USD/month' },
  { key: 'revenue', label: 'Monthly revenue', unit: 'USD/month' },
  { key: 'debt_end', label: 'Debt balance', unit: 'USD' },
  { key: 'utilization', label: 'Utilization', unit: 'ratio' },
  { key: 'equity_value', label: 'Modeled equity', unit: 'USD' },
];
/** Field projection only: every value comes from the engine, including unavailable openings. */
export function metricValue(row: MonthRecord, key: MetricKey): number | null {
  if (key === 'cash_end' || key === 'debt_end') return row.financials[key];
  if (row.is_opening_state) return null;
  if (key === 'utilization') return row.operations.utilization;
  if (key === 'ttm_ebitda' || key === 'enterprise_value' || key === 'equity_value') return row.valuation[key];
  return row.financials[key];
}
export function formatValue(value: number | null | undefined, ratio = false): string {
  if (value === null || value === undefined) return 'Unavailable';
  return ratio ? new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 }).format(value)
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}
export function paybackLabel(value: Payback): string {
  if (value.status === 'not_applicable') return 'Not applicable';
  if (value.status === 'not_reached') return 'Not reached in 60 months';
  return `Month ${value.month}${value.subsequent_reversal_month === null ? '' : ` · reverses month ${value.subsequent_reversal_month}`}`;
}
export type EditorField = { path: string; label: string; min: number; max?: number; step?: number };
export function decisionFields(decision: Decision): EditorField[] {
  const start = { path: 'start_month', label: 'Start month', min: 1, max: 60 };
  if (decision.type === 'purchase_trucks') return [start,
    { path: 'quantity', label: 'Trucks', min: 0 }, { path: 'cost_per_unit', label: 'Cost per truck · USD', min: 0.01, step: 0.01 },
    { path: 'in_service_delay_months', label: 'Service delay · months', min: 0 },
    { path: 'funding.debt_fraction', label: 'Debt funding · fraction (0–1)', min: 0, max: 1, step: 0.05 },
    { path: 'funding.annual_interest_rate', label: 'Annual interest · fraction', min: 0, step: 0.01 },
    { path: 'funding.term_months', label: 'Loan term · months', min: 1 }];
  if (decision.type === 'hire_technicians') return [start,
    { path: 'quantity', label: 'Technicians', min: 0 },
    { path: 'fully_loaded_annual_cost_per_person', label: 'Annual cost per person · USD', min: 0, step: 1000 },
    { path: 'hiring_delay_months', label: 'Hiring delay · months', min: 0 },
    { path: 'ramp_months', label: 'Productivity ramp · months', min: 0 },
    { path: 'one_time_hiring_cost_per_person', label: 'Recruitment per person · USD', min: 0, step: 100 }];
  return [start, { path: 'duration_months', label: 'Duration · months', min: 1 },
    { path: 'extra_spend_per_month', label: 'Extra monthly spend · USD', min: 0, step: 100 },
    { path: 'lead_to_job_lag_months', label: 'Demand lag · months', min: 0 },
    { path: 'incremental_cost_per_booked_job', label: 'Cost per booked job · USD', min: 0.01, step: 0.01 }];
}
export function fieldValue(decision: Decision, path: string): number {
  let value: unknown = decision;
  for (const key of path.split('.')) value = (value as Record<string, unknown>)[key];
  return value as number;
}
/** Preserve paired actions across scenarios and mark edited leaves as user inputs. */
export function editDecision(request: DeterministicRequest, key: string, path: string, value: number): DeterministicRequest {
  const next = structuredClone(request);
  for (const scenario of next.scenarios) for (const decision of scenario.decisions) {
    if (decision.stable_investment_key !== key) continue;
    const parts = path.split('.');
    let target = decision as unknown as Record<string, unknown>;
    for (const part of parts.slice(0, -1)) target = target[part] as Record<string, unknown>;
    target[parts.at(-1)!] = value;
    const pointer = '/' + parts.join('/');
    decision.provenance[pointer] = { ...decision.provenance[pointer], kind: 'user_input', source: 'OperatorOS decision editor' };
  }
  return next;
}
