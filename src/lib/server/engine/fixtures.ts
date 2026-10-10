import type { CompanyInput, EngineState } from '../../../../contracts/contracts.ts';
import { CompanyInputSchema, EngineStateSchema } from '../schemas.ts';

/** Validate loaded JSON without binding the engine to a filesystem or HTTP adapter. */
export function parse_company(input: unknown): CompanyInput {
  return CompanyInputSchema.parse(input);
}

export function create_initial_state(input: CompanyInput): EngineState {
  const company = parse_company(input);
  const o = company.operations;
  return EngineStateSchema.parse({
    month: 0,
    financial: structuredClone(company.opening_financial_state),
    operational: {
      technician_cohorts: [{ id: 'initial-technicians', decision_id: null,
        stable_investment_key: null, quantity: o.technicians, employment_start_month: 0,
        ramp_months: 0, annual_loaded_cost_per_person: o.technician_loaded_cost_per_year }],
      vehicle_cohorts: [{ id: 'initial-vehicles', decision_id: null,
        stable_investment_key: null, quantity: o.vehicles, in_service_month: 0,
        annual_opex_per_vehicle: o.vehicle_opex_per_year }],
      pending_campaign_demand: [],
    },
  });
}
