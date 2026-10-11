/** Unchanged-input diagnostic, not a new fixture or a retuned economic scenario. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { CompanyInputSchema, DeterministicRequestSchema, SimulationResultSchema } from '../src/lib/server/schemas.ts';
import { simulate_deterministic } from '../src/lib/server/engine/scenarios.ts';
import { metricValue } from '../src/lib/dashboard/model.ts';
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const company = CompanyInputSchema.parse(read('data/synthetic_hvac_company.json'));
const request = DeterministicRequestSchema.parse(read('contracts/example-request.json'));
const before = JSON.stringify({ company, request });
const result = simulate_deterministic(company, request, 'unchanged-example-operational-trace');
const reference = SimulationResultSchema.parse(read('contracts/example-result.json'));
assert.equal(result.input_fingerprint, reference.input_fingerprint);
assert.deepEqual(result.scenarios, reference.scenarios);
assert.deepEqual(result.comparisons, reference.comparisons);
assert.equal(JSON.stringify({ company, request }), before);
const selected = [0, 1, 2, 3, 5, 12, 13, 24, 60];
const trace = Object.fromEntries(Object.entries(result.scenarios).map(([id, path]) => [id, path.months.map(row => {
  const base = result.scenarios.baseline.months[row.month];
  if (row.is_opening_state || base.is_opening_state) return { month: 0, is_opening_state: true,
    operations: null, cash_end: row.financials.cash_end, debt_end: row.financials.debt_end };
  const o = row.operations, b = base.operations, f = row.financials;
  const additionalJobs = o.completed_jobs - b.completed_jobs;
  assert.ok(Math.abs(f.service_revenue - o.completed_jobs * o.average_ticket) < 1e-7);
  assert.equal(metricValue(row, 'revenue'), f.revenue);
  assert.equal(result.comparisons[id]?.monthly_deltas[row.month].values.revenue ?? 0, f.revenue - base.financials.revenue);
  return { month: row.month, is_opening_state: false,
    demand_jobs: o.service_demand_jobs, base_demand_jobs: b.service_demand_jobs,
    incremental_campaign_demand_jobs: o.service_demand_jobs - b.service_demand_jobs,
    technician_capacity_jobs: o.technician_capacity_jobs, vehicle_capacity_jobs: o.vehicle_capacity_jobs,
    service_capacity_jobs: o.service_capacity_jobs, completed_jobs: o.completed_jobs,
    unserved_jobs: o.unserved_jobs, average_ticket_usd: o.average_ticket,
    service_revenue_usd: f.service_revenue, other_revenue_usd: f.other_revenue, total_revenue_usd: f.revenue,
    active_trucks: o.in_service_vehicles, employed_technicians: o.employed_technicians,
    productive_technician_fte: o.productive_technician_fte,
    binding_constraint: o.service_demand_jobs < o.service_capacity_jobs ? 'demand'
      : o.technician_capacity_jobs === o.vehicle_capacity_jobs ? 'technicians_and_trucks'
      : o.technician_capacity_jobs < o.vehicle_capacity_jobs ? 'technicians' : 'trucks',
    resource_capacity_constraint: o.technician_capacity_jobs === o.vehicle_capacity_jobs ? 'technicians_and_trucks'
      : o.technician_capacity_jobs < o.vehicle_capacity_jobs ? 'technicians' : 'trucks',
    additional_jobs_vs_baseline: additionalJobs, revenue_delta_usd: f.revenue - base.financials.revenue,
    tech_labor_delta_usd: f.tech_direct_labor - base.financials.tech_direct_labor,
    fleet_opex_delta_usd: f.vehicle_direct_opex - base.financials.vehicle_direct_opex,
    incremental_marketing_usd: f.incremental_marketing, recruitment_usd: f.recruitment,
    ebitda_delta_usd: f.ebitda - base.financials.ebitda,
    cash_end_usd: f.cash_end, cash_delta_usd: f.cash_end - base.financials.cash_end,
    debt_end_usd: f.debt_end, growth_capex_usd: f.growth_capex, new_borrowings_usd: f.new_borrowings,
    events: row.events.filter(e => e.type === 'scheduled').map(e => ({ kind: e.kind, decision_id: e.decision_id })),
  };
})]));
const sha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const output = { engine_review_commit: '7dfff3c', input_fingerprint: result.input_fingerprint,
  fixture_file_sha256: sha('data/synthetic_hvac_company.json'), request_file_sha256: sha('contracts/example-request.json'),
  selected_months: selected, opening_resources: { trucks: company.operations.vehicles, technicians: company.operations.technicians },
  reference_scenarios_and_comparisons_exactly_reproduced: true, trace };
writeFileSync('data/example-operational-trace.json', JSON.stringify(output, null, 2) + '\n');
const n = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
let markdown = '# Unchanged example: operational trace\n\nGenerated with `node scripts/trace_example_operations.ts`. All 61 states and comparisons exactly reproduce the accepted deterministic reference. No inputs were modified. Raw numbers and all monthly fields are in `data/example-operational-trace.json`. Month 0 contains opening cash/debt only; initial resources are 12 trucks / 12 technicians, not forecast month-0 operations.\n\n';
for (const [id, rows] of Object.entries(trace)) {
  markdown += `## ${id}\n\n| Month | Demand | Tech capacity | Truck capacity | Effective capacity | Jobs | Ticket USD | Service revenue USD | Total revenue USD | Active trucks | Productive tech FTE | Binding constraint |\n|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
  for (const row of rows.filter(r => selected.includes(r.month))) markdown += row.is_opening_state
    ? '| 0 | — | — | — | — | — | — | — | — | — | — | Opening only |\n'
    : `| ${row.month} | ${n(row.demand_jobs!)} | ${n(row.technician_capacity_jobs!)} | ${n(row.vehicle_capacity_jobs!)} | ${n(row.service_capacity_jobs!)} | ${n(row.completed_jobs!)} | ${n(row.average_ticket_usd!)} | ${n(row.service_revenue_usd!)} | ${n(row.total_revenue_usd!)} | ${row.active_trucks} | ${n(row.productive_technician_fte!)} | ${row.binding_constraint} |\n`;
  markdown += '\n';
}
writeFileSync('docs/EXAMPLE_OPERATIONAL_TRACE.md', markdown);
for (const [id, rows] of Object.entries(trace)) console.log(JSON.stringify({ id,
  additional_jobs_60_months: rows.reduce((s, r) => s + (r.additional_jobs_vs_baseline ?? 0), 0),
  additional_revenue_60_months: rows.reduce((s, r) => s + (r.revenue_delta_usd ?? 0), 0),
  revenue_benefit_months: rows.filter(r => (r.revenue_delta_usd ?? 0) > 1e-7).map(r => r.month),
  capacity_binding_months: rows.filter(r => r.binding_constraint && r.binding_constraint !== 'demand').map(r => r.month) }));
