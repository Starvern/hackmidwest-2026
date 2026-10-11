// Reconciliation checks; authoritative Zod schemas remain Person 3's responsibility.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { CompanyInput, HistoricalMonth } from '../contracts/contracts.ts';

const company = JSON.parse(readFileSync(new URL('../data/synthetic_hvac_company.json', import.meta.url), 'utf8')) as CompanyInput;
const history = company.historical_months;
const [header, ...rows] = readFileSync(new URL('../data/historical_12_months.csv', import.meta.url), 'utf8').trim().split(/\r?\n/);
const keys = header.split(',') as (keyof HistoricalMonth)[];
const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) <= 1e-7, `${actual} != ${expected}`);
assert.equal(history.length, 12);
assert.equal(rows.length, 12);
history.forEach((month, index) => {
  assert.equal(month.month_of_year, index + 1);
  assert.deepEqual([...Object.keys(month)].sort(), [...keys].sort());
  assert.deepEqual(rows[index].split(',').map(Number), keys.map(key => month[key]));
  close(month.revenue, month.service_revenue + month.other_revenue);
  close(month.cogs, month.tech_direct_labor + month.vehicle_direct_opex + month.service_variable_cost + month.other_direct_cost);
  close(month.ebitda, month.revenue - month.cogs - month.operating_overhead);
});
const expected: Partial<Record<keyof HistoricalMonth, number>> = {
  service_jobs: 6480, service_revenue: 4212000, other_revenue: 788000, revenue: 5000000,
  tech_direct_labor: 1140000, vehicle_direct_opex: 180000, service_variable_cost: 1100000,
  other_direct_cost: 330000, cogs: 2750000, operating_overhead: 1500000, ebitda: 750000
};
for (const [key, value] of Object.entries(expected)) close(history.reduce((sum, month) => sum + month[key as keyof HistoricalMonth], 0), value);
const o = company.operations;
assert.equal(Math.min(o.technicians * o.working_days_per_month * o.max_jobs_per_tech_per_day,
  o.vehicles * o.working_days_per_month * o.max_jobs_per_vehicle_per_day), 720);
assert.equal(o.base_monthly_job_demand, 540);
const s = company.opening_financial_state;
const a = company.global_assumptions;
assert.equal(s.cash, 400000);
close(s.debt_tranches.reduce((sum, tranche) => sum + tranche.principal, 0), 1200000);
close(s.accounts_receivable, history[11].revenue * a.collection_delay_months);
close(s.accounts_payable, a.ap_eligible_cost_categories.reduce((sum, key) => sum + history[11][key], 0) * a.payment_delay_months);
assert.equal(s.inventory, a.constant_inventory);
close(s.depreciable_assets.reduce((sum, asset) => sum + asset.monthly_depreciation, 0) * 12, 150000);
assert.equal(a.seasonality.length, 12);
close(a.seasonality.reduce((sum, value) => sum + value, 0), 12);
const pointers = new Set<string>();
function visit(value: unknown, pointer = '') {
  if (Array.isArray(value)) value.forEach((child, index) => visit(child, `${pointer}/${index}`));
  else if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (pointer === '' && key === 'provenance') continue;
      visit(child, `${pointer}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`);
    }
  } else {
    if (typeof value === 'number') assert.ok(Number.isFinite(value), pointer);
    pointers.add(pointer);
  }
}
visit(company);
assert.deepEqual([...pointers].sort(), Object.keys(company.provenance).sort());
for (const entry of Object.values(company.provenance)) {
  assert.ok(['assumed', 'derived', 'synthetic_historical'].includes(entry.kind) && entry.source && entry.unit);
}
console.log('PASS: 12 matching CSV/JSON months, annual P&L, capacity, opening balances, finite inputs and provenance.');
console.log('Reconciliation only: run npm run fixture:contract for authoritative Zod validation. Joint acceptance/Gates A/B are separate.');
