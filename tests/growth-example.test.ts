import assert from 'node:assert/strict';
import test from 'node:test';
import { loadDemoCompany, loadGrowthCompany } from '../src/lib/server/api/company.ts';
import { createGrowthPlans } from '../src/lib/dashboard/growth-example.ts';
import { POST } from '../src/routes/api/v1/simulate/deterministic/+server.ts';
import { SimulationResultSchema } from '../src/lib/server/schemas.ts';

test('growth example serves unmet demand profitably; marketing alone adds cost without jobs', async () => {
  const request = createGrowthPlans();
  const response = await POST({ request: new Request('http://localhost/api/v1/simulate/deterministic', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request),
  }) });
  assert.equal(response.status, 200);
  const result = SimulationResultSchema.parse(await response.json());
  const { baseline, plan_a: expansion, plan_b: marketing } = result.scenarios;
  assert.equal(baseline.months[1].operations!.completed_jobs, 240);
  assert.equal(baseline.months[1].operations!.unserved_jobs, 360);
  assert.equal(expansion.months[12].operations!.completed_jobs, 480);
  assert.ok(expansion.metrics.exit_equity_value! > baseline.metrics.exit_equity_value!);
  assert.ok(expansion.months[60].financials.cash_end > baseline.months[60].financials.cash_end);
  assert.equal(expansion.metrics.payback.status, 'reached');
  assert.deepEqual(expansion.metrics.reserve_breach_months, []);
  for (let month = 1; month <= 60; month++) {
    assert.equal(marketing.months[month].operations!.completed_jobs, baseline.months[month].operations!.completed_jobs);
  }
  assert.ok(marketing.months[60].financials.cash_end < baseline.months[60].financials.cash_end);
  assert.equal(marketing.metrics.payback.status, 'not_reached');
});

test('growth example does not alter the original company or share mutable presets', () => {
  const company = loadGrowthCompany();
  company.operations.vehicles = 99;
  assert.equal(loadGrowthCompany().operations.vehicles, 4);
  assert.equal(loadDemoCompany().operations.vehicles, 12);
  const request = createGrowthPlans();
  request.scenarios[1].decisions.length = 0;
  assert.equal(createGrowthPlans().scenarios[1].decisions.length, 2);
});
