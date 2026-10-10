import type { CalculateOperations } from '../../../../contracts/engine.ts';
import {
  CompanyInputSchema, EngineStateSchema, MonthEventsSchema, MarketFactorsSchema, OperationsResultSchema,
} from '../schemas.ts';

/** Demand and productive resources determine throughput; no accounting or random sampling. */
export const calculate_operations: CalculateOperations = (companyInput, stateInput, eventInput, factorInput) => {
  const company = CompanyInputSchema.parse(companyInput);
  const prior = EngineStateSchema.parse(stateInput);
  const events = MonthEventsSchema.parse(eventInput);
  const factors = MarketFactorsSchema.parse(factorInput);
  if (events.month !== prior.month + 1) throw new Error('Operations requires the next scheduled month');
  const o = company.operations;
  const a = company.global_assumptions;
  const month = events.month;
  const growth = (rate: number) => (1 + rate) ** ((month - 1) / 12);
  const calendarMonth = (company.forecast_start_month_of_year + month - 2) % 12;
  const campaignDemand = events.campaign_demand.reduce((sum, d) => {
    if (d.demand_month !== month) throw new Error('Campaign demand must be due this month');
    return sum + d.potential_jobs;
  }, 0);
  const demand = Math.max(0, o.base_monthly_job_demand * growth(a.organic_demand_growth)
    * a.seasonality[calendarMonth] * factors.demand_multiplier + campaignDemand);
  const techCapacity = events.productive_technician_fte * o.working_days_per_month * o.max_jobs_per_tech_per_day;
  const vehicleCapacity = events.in_service_vehicles * o.working_days_per_month * o.max_jobs_per_vehicle_per_day;
  const capacity = Math.min(techCapacity, vehicleCapacity);
  const completed = Math.min(demand, capacity);
  return OperationsResultSchema.parse({
    service_demand_jobs: demand, technician_capacity_jobs: techCapacity,
    vehicle_capacity_jobs: vehicleCapacity, service_capacity_jobs: capacity,
    completed_jobs: completed, unserved_jobs: demand - completed,
    utilization: capacity === 0 ? 0 : completed / capacity,
    employed_technicians: events.employed_technicians,
    productive_technician_fte: events.productive_technician_fte,
    in_service_vehicles: events.in_service_vehicles,
    average_ticket: o.average_ticket * growth(a.ticket_growth) * factors.ticket_multiplier,
  });
};
