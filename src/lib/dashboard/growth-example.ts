import { createPlanningRequest, addAction, editPlanAction } from './plans.ts';

/** Explicit example presets remain editable; ordinary workspaces still start blank. */
export function createGrowthPlans() {
  let request = createPlanningRequest('synthetic-growth-hvac-002', 150000, 4);
  request.scenarios[1].name = 'Add trucks and technicians';
  request.scenarios[2].name = 'Marketing before adding capacity';
  request = addAction(request, 'plan_a', 'purchase_trucks', 'growth-trucks');
  request = editPlanAction(request, 'plan_a', 'growth-trucks', 'quantity', 4, 'growth-trucks');
  request = addAction(request, 'plan_a', 'hire_technicians', 'growth-hires');
  request = addAction(request, 'plan_b', 'increase_marketing', 'growth-marketing');
  return request;
}
