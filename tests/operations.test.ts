import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { CompanyInput } from '../contracts/contracts.ts';
import { parse_company, create_initial_state } from '../src/lib/server/engine/fixtures.ts';
import { schedule_month } from '../src/lib/server/engine/event_scheduler.ts';
import { calculate_operations } from '../src/lib/server/engine/operations.ts';
import { NEUTRAL_MARKET_FACTORS } from '../src/lib/server/schemas.ts';

const fixture = parse_company(JSON.parse(readFileSync(new URL('../data/synthetic_hvac_company.json', import.meta.url), 'utf8')));
function setup() {
  const company = structuredClone(fixture);
  const prior = create_initial_state(company);
  const events = schedule_month(company, { id: 'baseline', name: 'Baseline', decisions: [] }, 1,
    { by_stable_investment_key: {} }, prior, NEUTRAL_MARKET_FACTORS);
  return { company, prior, events };
}
test('OP-06: reference jobs/utilization and ticket, without a second utilization haircut', () => {
  const { company, prior, events } = setup();
  const result = calculate_operations(company, prior, events, NEUTRAL_MARKET_FACTORS);
  assert.equal(result.service_demand_jobs, 540);
  assert.equal(result.service_capacity_jobs, 720);
  assert.equal(result.completed_jobs, 540);
  assert.equal(result.unserved_jobs, 0);
  assert.equal(result.utilization, 0.75);
  assert.equal(result.average_ticket, 650);
});
test('OP-01/02/04: spare trucks or technicians and capacity without demand cannot create jobs', () => {
  for (const counts of [{ tech: 12, fleet: 14 }, { tech: 14, fleet: 12 }, { tech: 14, fleet: 14 }]) {
    const { company, prior, events } = setup();
    events.productive_technician_fte = counts.tech;
    events.employed_technicians = counts.tech;
    events.in_service_vehicles = counts.fleet;
    const result = calculate_operations(company, prior, events, NEUTRAL_MARKET_FACTORS);
    assert.equal(result.service_capacity_jobs, Math.min(counts.tech, counts.fleet) * 60);
    assert.equal(result.completed_jobs, 540);
  }
});
test('OP-03/05: marketing respects capacity, combined resources unlock extra jobs', () => {
  const { company, prior, events } = setup();
  events.campaign_demand = [{ id: 'demand', decision_id: 'campaign', stable_investment_key: 'campaign-key',
    spend_month: 1, demand_month: 1, potential_jobs: 400 }];
  let result = calculate_operations(company, prior, events, NEUTRAL_MARKET_FACTORS);
  assert.equal(result.service_demand_jobs, 940);
  assert.equal(result.completed_jobs, 720);
  assert.equal(result.unserved_jobs, 220);
  events.employed_technicians = events.productive_technician_fte = events.in_service_vehicles = 14;
  result = calculate_operations(company, prior, events, NEUTRAL_MARKET_FACTORS);
  assert.equal(result.completed_jobs, 840);
  assert.equal(result.unserved_jobs, 100);
});
test('OP-07: zero tech, fleet, working days or productivity defines zero utilization', () => {
  for (const which of ['tech', 'fleet', 'days', 'productivity']) {
    const { company, prior, events } = setup();
    if (which === 'tech') events.productive_technician_fte = 0;
    if (which === 'fleet') events.in_service_vehicles = 0;
    if (which === 'days') company.operations.working_days_per_month = 0;
    if (which === 'productivity') company.operations.max_jobs_per_tech_per_day = 0;
    const result = calculate_operations(company, prior, events, NEUTRAL_MARKET_FACTORS);
    assert.equal(result.completed_jobs, 0);
    assert.equal(result.utilization, 0);
    assert.equal(result.unserved_jobs, 540);
  }
});
test('calendar seasonality and annual compounding apply to baseline demand only; costs are unchanged', () => {
  const { company, prior, events } = setup();
  const c: CompanyInput = structuredClone(company);
  c.global_assumptions.seasonality[0] = 2;
  prior.month = 12;
  events.month = 13;
  events.campaign_demand = [{ id: 'demand', decision_id: 'campaign', stable_investment_key: 'campaign-key',
    spend_month: 13, demand_month: 13, potential_jobs: 40 }];
  const original = structuredClone({ c, prior, events });
  const result = calculate_operations(c, prior, events, { ...NEUTRAL_MARKET_FACTORS, demand_multiplier: 0.5, ticket_multiplier: 2 });
  assert.equal(result.service_demand_jobs, 540 * 1.02 * 2 * 0.5 + 40);
  assert.equal(result.average_ticket, 650 * 1.02 * 2);
  assert.deepEqual({ c, prior, events }, original);
});
test('fractional productive FTE constrains jobs and invalid step/demand/factors fail', () => {
  const { company, prior, events } = setup();
  events.productive_technician_fte = 0.5;
  assert.equal(calculate_operations(company, prior, events, NEUTRAL_MARKET_FACTORS).completed_jobs, 30);
  assert.throws(() => calculate_operations(company, { ...prior, month: 2 }, events, NEUTRAL_MARKET_FACTORS));
  assert.throws(() => calculate_operations(company, prior, events, { ...NEUTRAL_MARKET_FACTORS, demand_multiplier: -1 }));
  events.campaign_demand = [{ id: 'future', decision_id: 'campaign', stable_investment_key: 'campaign-key',
    spend_month: 1, demand_month: 2, potential_jobs: 40 }];
  assert.throws(() => calculate_operations(company, prior, events, NEUTRAL_MARKET_FACTORS));
});
