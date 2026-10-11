import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { Decision, EngineState, MarketFactors, PathRisks, ScenarioInput } from '../contracts/contracts.ts';
import { create_initial_state, parse_company } from '../src/lib/server/engine/fixtures.ts';
import { schedule_month } from '../src/lib/server/engine/event_scheduler.ts';
import { NEUTRAL_MARKET_FACTORS, MonthEventsSchema } from '../src/lib/server/schemas.ts';
import { scalarLeaves, inputUnit } from '../src/lib/server/validation.ts';

const company = parse_company(JSON.parse(readFileSync(new URL('../data/synthetic_hvac_company.json', import.meta.url), 'utf8')));
function decision(input: object): Decision {
  return { ...input, provenance: Object.fromEntries(scalarLeaves(input).map(([p, v]) => [p,
    { kind: 'assumed', source: 'Independent scheduler test input', unit: inputUnit(p, v) }])) } as Decision;
}
function truck(overrides = {}) {
  return decision({ id: 'truck', stable_investment_key: 'truck-key', type: 'purchase_trucks', start_month: 1,
    quantity: 2, cost_per_unit: 60000, in_service_delay_months: 1,
    funding: { debt_fraction: 0.5, annual_interest_rate: 0.08, term_months: 48 }, ...overrides });
}
function hire(overrides = {}) {
  return decision({ id: 'hire', stable_investment_key: 'hire-key', type: 'hire_technicians', start_month: 1,
    quantity: 2, fully_loaded_annual_cost_per_person: 96000, hiring_delay_months: 1,
    ramp_months: 4, one_time_hiring_cost_per_person: 3000, ...overrides });
}
function marketing(overrides = {}) {
  return decision({ id: 'marketing', stable_investment_key: 'marketing-key', type: 'increase_marketing',
    start_month: 1, duration_months: 2, extra_spend_per_month: 4000,
    lead_to_job_lag_months: 2, incremental_cost_per_booked_job: 100, ...overrides });
}
function run(decisions: Decision[], count: number, factors: MarketFactors = NEUTRAL_MARKET_FACTORS,
  risks: PathRisks = { by_stable_investment_key: {} }) {
  const scenario: ScenarioInput = { id: 'test', name: 'Test', decisions };
  let state = create_initial_state(company);
  const output = [];
  for (let month = 1; month <= count; month++) {
    const next = schedule_month(company, scenario, month, risks, state, factors);
    output.push(next);
    // Scheduler-only harness: financial balances intentionally unchanged, not a financial forecast.
    state = { month, financial: state.financial, operational: next.ending_operational_state };
  }
  return output;
}
const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);

test('initial state copies validated opening balances and baseline month has no decision effects', () => {
  const state = create_initial_state(company);
  assert.equal(state.month, 0);
  state.financial.cash = 0;
  assert.equal(company.opening_financial_state.cash, 400000);
  const [m] = run([], 1);
  assert.equal(m.employed_technicians, 12);
  assert.equal(m.productive_technician_fte, 12);
  assert.equal(m.in_service_vehicles, 12);
  assert.deepEqual(m.events, []);
  close(m.financial_inputs.tech_direct_labor, 95000);
  close(m.financial_inputs.vehicle_direct_opex, 15000);
  close(m.financial_inputs.fixed_overhead, 125000);
  close(m.financial_inputs.maintenance_capex, 100000 / 12);
  assert.equal(m.financial_inputs.incremental_investment_outlay, 0);
  assert.deepEqual(m.financial_inputs.asset_additions, []);
});

test('TIME-01/02: purchase/borrowing once, activation and vehicle costs only after delay', () => {
  const [first, second, third] = run([truck()], 3);
  assert.equal(first.purchases.length, 1);
  assert.equal(first.financial_inputs.growth_capex, 120000);
  assert.equal(first.financial_inputs.new_debt_tranches[0].principal, 60000);
  assert.equal(first.financial_inputs.new_debt_tranches[0].monthly_principal, 1250);
  assert.equal(first.financial_inputs.new_debt_tranches[0].first_repayment_month, 2);
  assert.equal(first.in_service_vehicles, 12);
  assert.equal(first.financial_inputs.vehicle_direct_opex, 15000);
  const addition = first.financial_inputs.asset_additions[0];
  assert.equal(addition.category, 'growth');
  assert.equal(addition.asset.in_service_month, 2);
  assert.equal(addition.asset.remaining_life_months, 60);
  assert.equal(addition.asset.accumulated_depreciation, 0);
  assert.equal(first.financial_inputs.incremental_investment_outlay, 120000);
  assert.equal(second.purchases.length, 0);
  assert.equal(second.financial_inputs.new_debt_tranches.length, 0);
  assert.equal(second.financial_inputs.growth_capex, 0);
  assert.equal(second.in_service_vehicles, 14);
  assert.equal(second.financial_inputs.vehicle_direct_opex, 17500);
  assert.equal(second.vehicle_activations.length, 1);
  assert.equal(third.vehicle_activations.length, 0);
});

test('TIME-03: recruitment once, full employed payroll throughout exact four-month ramp', () => {
  const months = run([hire()], 6);
  assert.equal(months[0].financial_inputs.recruitment, 6000);
  assert.equal(months[0].employed_technicians, 12);
  for (let i = 1; i <= 4; i++) {
    const m = months[i];
    assert.equal(m.employed_technicians, 14);
    assert.equal(m.productive_technician_fte, 12 + 2 * i / 4);
    close(m.financial_inputs.tech_direct_labor, 111000 * 1.03 ** (i / 12));
    close(m.financial_inputs.incremental_investment_outlay, 16000 * 1.03 ** (i / 12));
    assert.equal(m.financial_inputs.recruitment, 0);
  }
  assert.equal(months[1].employment_starts.length, 1);
  assert.equal(months[2].employment_starts.length, 0);
  assert.equal(months[4].events.filter(e => e.kind === 'ramp_complete').length, 1);
  assert.equal(months[5].events.filter(e => e.kind === 'ramp_complete').length, 0);
});

test('TIME-04: campaign exact lag and tail, demand consumed once after spend stops', () => {
  const months = run([marketing()], 5);
  assert.deepEqual(months.map(m => m.financial_inputs.incremental_marketing), [4000,4000,0,0,0]);
  assert.deepEqual(months.map(m => m.campaign_demand.reduce((sum, d) => sum + d.potential_jobs, 0)), [0,0,40,40,0]);
  assert.equal(months[2].events.filter(e => e.kind === 'campaign_end').length, 1);
  assert.deepEqual(months[4].ending_operational_state.pending_campaign_demand, []);
});

test('zero delays activate immediately, zero ramp is fully productive and same-month demand is consumed', () => {
  const [m] = run([truck({ in_service_delay_months: 0 }), hire({ hiring_delay_months: 0, ramp_months: 0 }),
    marketing({ lead_to_job_lag_months: 0 })], 1);
  assert.equal(m.in_service_vehicles, 14);
  assert.equal(m.employed_technicians, 14);
  assert.equal(m.productive_technician_fte, 14);
  assert.equal(m.campaign_demand[0].potential_jobs, 40);
  assert.equal(m.ending_operational_state.pending_campaign_demand.length, 0);
  close(m.financial_inputs.incremental_investment_outlay, 146000);
});

test('month-60 expenses remain when benefits are beyond horizon', () => {
  const months = run([truck({ start_month: 60, in_service_delay_months: 2 }),
    hire({ start_month: 60, hiring_delay_months: 2 }), marketing({ start_month: 60 })], 60);
  const m = months[59];
  assert.equal(m.purchases[0].in_service_month, 62);
  assert.equal(m.financial_inputs.new_debt_tranches[0].first_repayment_month, 61);
  assert.equal(m.in_service_vehicles, 12);
  assert.equal(m.employed_technicians, 12);
  assert.equal(m.campaign_demand.length, 0);
  assert.equal(m.ending_operational_state.pending_campaign_demand[0].demand_month, 62);
  assert.equal(m.financial_inputs.incremental_investment_outlay, 130000);
});

test('cost factors and calendar growth applied once; baseline marketing not added twice', () => {
  const factors = { ...NEUTRAL_MARKET_FACTORS, wage_multiplier: 2, vehicle_opex_multiplier: 3,
    overhead_multiplier: 2, other_revenue_multiplier: 0.5, service_variable_cost_multiplier: 1.1 };
  const months = run([hire({ start_month: 13, hiring_delay_months: 0 })], 13, factors);
  const m = months[12];
  close(m.financial_inputs.tech_direct_labor, 111000 * 1.03 * 2);
  close(m.financial_inputs.fixed_overhead, 125000 * 1.02 * 2);
  close(m.financial_inputs.vehicle_direct_opex, 45000);
  close(m.financial_inputs.other_revenue, 788000 / 24);
  close(m.financial_inputs.service_variable_cost_rate, 1100000 / 4212000 * 1.1);
});

test('explicit path overrides reuse configured timing when null and apply sampled delay/effectiveness', () => {
  const risks: PathRisks = { by_stable_investment_key: {
    'truck-key': { in_service_delay_months: 2, hiring_delay_months: null, ramp_months: null,
      lead_to_job_lag_months: null, marketing_effectiveness_multiplier: 1 },
    'marketing-key': { in_service_delay_months: null, hiring_delay_months: null, ramp_months: null,
      lead_to_job_lag_months: 0, marketing_effectiveness_multiplier: 0.5 },
  } };
  const months = run([truck(), marketing()], 3, NEUTRAL_MARKET_FACTORS, risks);
  assert.equal(months[0].campaign_demand[0].potential_jobs, 20);
  assert.equal(months[1].in_service_vehicles, 12);
  assert.equal(months[2].in_service_vehicles, 14);
});

test('zero-effect actions have no investment outlay or financial additions', () => {
  const [m] = run([truck({ quantity: 0 }), hire({ quantity: 0 }), marketing({ extra_spend_per_month: 0 })], 1);
  assert.equal(m.financial_inputs.incremental_investment_outlay, 0);
  assert.deepEqual(m.events, []);
  assert.deepEqual(m.financial_inputs.asset_additions, []);
});

test('sequential bounds, invalid risks/factors and ID collisions fail; inputs stay unchanged', () => {
  const state = create_initial_state(company);
  const scenario = { id: 'test', name: 'Test', decisions: [truck()] };
  const original = structuredClone({ company, state, scenario });
  const risks = { by_stable_investment_key: {} };
  for (const month of [0, 2, 61, 1.5]) assert.throws(() => schedule_month(company, scenario, month, risks, state, NEUTRAL_MARKET_FACTORS));
  assert.throws(() => schedule_month(company, scenario, 1, { by_stable_investment_key: { unknown: {
    in_service_delay_months: null, hiring_delay_months: null, ramp_months: null,
    lead_to_job_lag_months: null, marketing_effectiveness_multiplier: 1 } } }, state, NEUTRAL_MARKET_FACTORS));
  assert.throws(() => schedule_month(company, scenario, 1, risks, state, { ...NEUTRAL_MARKET_FACTORS, wage_multiplier: Infinity }));
  const result = schedule_month(company, scenario, 1, risks, state, NEUTRAL_MARKET_FACTORS);
  MonthEventsSchema.parse(result);
  assert.deepEqual({ company, state, scenario }, original);
  const collision: EngineState = structuredClone(state);
  collision.financial.depreciable_assets.push(result.financial_inputs.asset_additions[0].asset);
  assert.throws(() => schedule_month(company, scenario, 1, risks, collision, NEUTRAL_MARKET_FACTORS));
  assert.deepEqual(run([truck(), hire(), marketing()], 3), run([marketing(), hire(), truck()], 3));
});
