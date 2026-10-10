import { DeterministicRequestSchema } from '../src/lib/server/schemas.ts';
import { inputUnit, scalarLeaves } from '../src/lib/server/validation.ts';
import { readFileSync, writeFileSync } from 'node:fs';

function withProvenance<T extends object>(input: T) {
  return { ...input, provenance: Object.fromEntries(scalarLeaves(input).map(([pointer, value]) => [pointer, {
    kind: 'assumed', source: 'Illustrative scenario input from specification §4; not calibrated', unit: inputUnit(pointer, value),
  }])) };
}
const truck = { type: 'purchase_trucks', stable_investment_key: 'demo-trucks', start_month: 1, quantity: 2,
  cost_per_unit: 60000, in_service_delay_months: 1, funding: { debt_fraction: 0.5, annual_interest_rate: 0.08, term_months: 48 } };
const request = DeterministicRequestSchema.parse({ schema_version: '1.0', company_id: 'synthetic-hvac-001', horizon_months: 60,
  reserve_floor_usd: 150000, exit_multiple: 6, scenarios: [
    { id: 'baseline', name: 'Baseline', decisions: [] },
    { id: 'trucks_only', name: 'Buy two trucks', decisions: [withProvenance({ id: 'truck-01', ...truck })] },
    { id: 'combined_expansion', name: 'Trucks + technicians + marketing', decisions: [
      withProvenance({ id: 'truck-01b', ...truck }),
      withProvenance({ id: 'hire-01', stable_investment_key: 'demo-hires', type: 'hire_technicians', start_month: 2, quantity: 2,
        fully_loaded_annual_cost_per_person: 95000, hiring_delay_months: 1, ramp_months: 4, one_time_hiring_cost_per_person: 3000 }),
      withProvenance({ id: 'marketing-01', stable_investment_key: 'demo-marketing', type: 'increase_marketing', start_month: 3,
        duration_months: 12, extra_spend_per_month: 4000, lead_to_job_lag_months: 2, incremental_cost_per_booked_job: 100 }),
    ] },
  ] });
const path = 'contracts/example-request.json';
const contents = JSON.stringify(request, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (readFileSync(path, 'utf8').replaceAll('\r\n', '\n') !== contents) throw new Error('Example request drift; run npm run contracts:generate');
} else writeFileSync(path, contents);
