/** Real scheduler/operations handoff; intentionally contains no calculated financial forecast. */
import { readFileSync, writeFileSync } from 'node:fs';
import { create_initial_state, parse_company } from '../src/lib/server/engine/fixtures.ts';
import { schedule_month } from '../src/lib/server/engine/event_scheduler.ts';
import { calculate_operations } from '../src/lib/server/engine/operations.ts';
import { NEUTRAL_MARKET_FACTORS, INTERFACE_REVISION } from '../src/lib/server/schemas.ts';

const company = parse_company(JSON.parse(readFileSync(new URL('../data/synthetic_hvac_company.json', import.meta.url), 'utf8')));
const prior = create_initial_state(company);
const scenario = { id: 'baseline', name: 'Baseline', decisions: [] };
const risks = { by_stable_investment_key: {} };
const events = schedule_month(company, scenario, 1, risks, prior, NEUTRAL_MARKET_FACTORS);
const operations = calculate_operations(company, prior, events, NEUTRAL_MARKET_FACTORS);
const result = {
  purpose: 'Computed scheduler/operations handoff; financials and valuation not yet calculated',
  accepted_dependency: '5725edf1e8e979c9c9bcb3b0673acb308a96385f',
  interface_revision: INTERFACE_REVISION, company_id: company.id, scenario,
  prior_state: prior, market_factors: NEUTRAL_MARKET_FACTORS, path_risks: risks,
  month_events: events, operations,
};
writeFileSync(new URL('../data/example-month-1.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
console.log(`Saved data/example-month-1.json: ${operations.completed_jobs} jobs, ${operations.service_capacity_jobs} capacity, ${operations.utilization} utilization.`);
