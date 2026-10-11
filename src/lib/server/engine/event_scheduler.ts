import type { ScheduleMonth } from '../../../../contracts/engine.ts';
import type { ModelEvent, MonthEvents } from '../../../../contracts/contracts.ts';
import {
  CompanyInputSchema, EngineStateSchema, ScenarioInputSchema, MarketFactorsSchema,
  MonthEventsSchema, validatePathRisks,
} from '../schemas.ts';

/** Pure, sequential monthly transition. Financials owns all accounting and maintenance assets. */
export const schedule_month: ScheduleMonth = (companyInput, scenarioInput, month, riskInput, stateInput, factorInput) => {
  const company = CompanyInputSchema.parse(companyInput);
  const scenario = ScenarioInputSchema.parse(scenarioInput);
  const prior = EngineStateSchema.parse(stateInput);
  const factors = MarketFactorsSchema.parse(factorInput);
  const risks = validatePathRisks(riskInput, scenario.decisions);
  if (!Number.isInteger(month) || month < 1 || month > 60 || prior.month !== month - 1) {
    throw new Error('Scheduler requires sequential forecast months 1–60; month 0 is opening state only');
  }
  const state = structuredClone(prior.operational);
  const a = company.global_assumptions;
  const o = company.operations;
  const growth = (rate: number) => (1 + rate) ** ((month - 1) / 12);
  const out: MonthEvents = {
    month, purchases: [], employment_starts: [], vehicle_activations: [],
    campaign_spending: [], campaign_demand: [], employed_technicians: 0,
    productive_technician_fte: 0, in_service_vehicles: 0,
    financial_inputs: {
      tech_direct_labor: 0, vehicle_direct_opex: 0,
      other_revenue: o.non_service_revenue_per_month * growth(a.other_revenue_growth) * factors.other_revenue_multiplier,
      other_direct_cost: o.non_service_direct_cost_per_month * growth(a.other_direct_cost_growth) * factors.other_direct_cost_multiplier,
      fixed_overhead: o.fixed_overhead_per_month * growth(a.overhead_inflation) * factors.overhead_multiplier,
      service_variable_cost_rate: o.service_variable_cost_rate * factors.service_variable_cost_multiplier,
      incremental_marketing: 0, recruitment: 0, maintenance_capex: a.maintenance_capex_per_year / 12,
      growth_capex: 0, new_debt_tranches: [], asset_additions: [], incremental_investment_outlay: 0,
    },
    ending_operational_state: state, events: [],
  };
  const fi = out.financial_inputs;
  const event = (id: string, decision_id: string, kind: ModelEvent['kind'], label: string) => {
    const decision = scenario.decisions.find(d => d.id === decision_id);
    const simulated = decision && risks.by_stable_investment_key[decision.stable_investment_key] !== undefined;
    out.events.push({ id: JSON.stringify([decision_id, kind, id, month]), month, decision_id,
      type: 'scheduled', kind, label, provenance: simulated ? 'simulated' : 'assumed' });
  };
  for (const d of [...scenario.decisions].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) {
    const risk = risks.by_stable_investment_key[d.stable_investment_key];
    const identity = JSON.stringify([scenario.id, d.id]);
    if (d.type === 'operating_expense' && month >= d.start_month && month < d.start_month + d.duration_months && d.amount_per_month > 0) {
      fi.custom_operating_expenses = (fi.custom_operating_expenses ?? 0) + d.amount_per_month;
      fi.incremental_investment_outlay += d.amount_per_month;
      event(identity, d.id, 'operating_expense', `${d.name}: operating expense`);
    }
    if (d.type === 'purchase_asset') {
      const serviceMonth = d.start_month + d.in_service_delay_months;
      if (!Number.isSafeInteger(serviceMonth)) throw new Error('Asset service month exceeds safe integer range');
      if (month === d.start_month && d.purchase_cost > 0) {
        out.purchases.push({ decision_id: d.id, stable_investment_key: d.stable_investment_key,
          quantity: 1, cost_per_unit: d.purchase_cost, in_service_month: serviceMonth, funding: structuredClone(d.funding) });
        fi.growth_capex += d.purchase_cost;
        const borrowing = d.purchase_cost * d.funding.debt_fraction;
        if (borrowing > 0) fi.new_debt_tranches.push({ id: `asset-debt:${identity}`, principal: borrowing,
          annual_interest_rate: d.funding.annual_interest_rate, remaining_term_months: d.funding.term_months,
          monthly_principal: borrowing / d.funding.term_months, first_repayment_month: month + 1, amortization_policy: 'level_principal' });
        fi.asset_additions.push({ category: 'growth', depreciation_life_months: d.useful_life_months, asset: {
          id: `asset-purchase:${identity}`, cost_basis: d.purchase_cost, accumulated_depreciation: 0,
          monthly_depreciation: d.purchase_cost / d.useful_life_months,
          remaining_life_months: d.useful_life_months, in_service_month: serviceMonth,
        } });
        event(identity, d.id, 'asset_purchase', `Purchase ${d.name}`);
      }
      if (month >= serviceMonth && d.monthly_operating_cost > 0) {
        fi.custom_operating_expenses = (fi.custom_operating_expenses ?? 0) + d.monthly_operating_cost;
        fi.incremental_investment_outlay += d.monthly_operating_cost;
        event(identity, d.id, 'operating_expense', `${d.name}: operating cost`);
      }
      if (month === serviceMonth && (d.purchase_cost > 0 || d.monthly_operating_cost > 0)) event(identity, d.id, 'asset_in_service', `${d.name} enters service`);
    }
    if (d.type === 'purchase_trucks' && d.start_month === month && d.quantity > 0) {
      const in_service_month = month + (risk?.in_service_delay_months ?? d.in_service_delay_months);
      const cost = d.quantity * d.cost_per_unit;
      out.purchases.push({ decision_id: d.id, stable_investment_key: d.stable_investment_key,
        quantity: d.quantity, cost_per_unit: d.cost_per_unit, in_service_month, funding: structuredClone(d.funding) });
      state.vehicle_cohorts.push({ id: `truck-cohort:${identity}`, decision_id: d.id,
        stable_investment_key: d.stable_investment_key, quantity: d.quantity, in_service_month,
        annual_opex_per_vehicle: o.vehicle_opex_per_year });
      fi.growth_capex += cost;
      const borrowing = cost * d.funding.debt_fraction;
      if (borrowing > 0) fi.new_debt_tranches.push({ id: `truck-debt:${identity}`, principal: borrowing,
        annual_interest_rate: d.funding.annual_interest_rate, remaining_term_months: d.funding.term_months,
        monthly_principal: borrowing / d.funding.term_months, first_repayment_month: month + 1,
        amortization_policy: 'level_principal' });
      if (cost > 0) fi.asset_additions.push({ category: 'growth', asset: {
        id: `truck-asset:${identity}`, cost_basis: cost, accumulated_depreciation: 0,
        monthly_depreciation: cost / a.truck_useful_life_months,
        remaining_life_months: a.truck_useful_life_months, in_service_month,
      } });
      event(identity, d.id, 'truck_purchase', `Purchase ${d.quantity} truck(s)`);
    }
    if (d.type === 'hire_technicians' && d.start_month === month && d.quantity > 0) {
      state.technician_cohorts.push({ id: `hire-cohort:${identity}`, decision_id: d.id,
        stable_investment_key: d.stable_investment_key, quantity: d.quantity,
        employment_start_month: month + (risk?.hiring_delay_months ?? d.hiring_delay_months),
        ramp_months: risk?.ramp_months ?? d.ramp_months,
        annual_loaded_cost_per_person: d.fully_loaded_annual_cost_per_person });
      fi.recruitment += d.quantity * d.one_time_hiring_cost_per_person;
      event(identity, d.id, 'recruitment', `Recruit ${d.quantity} technician(s)`);
    }
    if (d.type === 'increase_marketing' && d.extra_spend_per_month > 0) {
      if (month >= d.start_month && month < d.start_month + d.duration_months) {
        const demand = { id: `campaign:${identity}:${month}`, decision_id: d.id,
          stable_investment_key: d.stable_investment_key, spend_month: month,
          demand_month: month + (risk?.lead_to_job_lag_months ?? d.lead_to_job_lag_months),
          potential_jobs: d.extra_spend_per_month / d.incremental_cost_per_booked_job * (risk?.marketing_effectiveness_multiplier ?? 1) };
        state.pending_campaign_demand.push(demand);
        out.campaign_spending.push({ decision_id: d.id, stable_investment_key: d.stable_investment_key,
          spend_month: month, amount: d.extra_spend_per_month, demand: structuredClone(demand) });
        fi.incremental_marketing += d.extra_spend_per_month;
        event(demand.id, d.id, 'campaign_spend', 'Incremental marketing spend');
      }
      if (month === d.start_month + d.duration_months) event(identity, d.id, 'campaign_end', 'Campaign spending ended');
    }
  }
  for (const cohort of state.technician_cohorts) {
    if (month < cohort.employment_start_month) continue;
    const age = month - cohort.employment_start_month + 1;
    const ramp = cohort.ramp_months === 0 ? 1 : Math.min(1, age / cohort.ramp_months);
    const payroll = cohort.quantity * cohort.annual_loaded_cost_per_person / 12 * growth(a.wage_inflation) * factors.wage_multiplier;
    out.employed_technicians += cohort.quantity;
    out.productive_technician_fte += cohort.quantity * ramp;
    fi.tech_direct_labor += payroll;
    if (cohort.decision_id !== null) {
      fi.incremental_investment_outlay += payroll;
      if (month === cohort.employment_start_month) {
        out.employment_starts.push({ decision_id: cohort.decision_id, cohort_id: cohort.id, quantity: cohort.quantity });
        event(cohort.id, cohort.decision_id, 'employment_start', 'Technician employment begins');
      }
      if (age === Math.max(1, cohort.ramp_months)) event(cohort.id, cohort.decision_id, 'ramp_complete', 'Technician productivity ramp complete');
    }
  }
  for (const cohort of state.vehicle_cohorts) {
    if (month < cohort.in_service_month) continue;
    out.in_service_vehicles += cohort.quantity;
    fi.vehicle_direct_opex += cohort.quantity * cohort.annual_opex_per_vehicle / 12 * factors.vehicle_opex_multiplier;
    if (cohort.decision_id !== null && month === cohort.in_service_month) {
      out.vehicle_activations.push({ decision_id: cohort.decision_id, cohort_id: cohort.id, quantity: cohort.quantity });
      event(cohort.id, cohort.decision_id, 'truck_in_service', 'Truck(s) enter service');
    }
  }
  for (const demand of state.pending_campaign_demand) {
    if (demand.demand_month < month) throw new Error('Unconsumed campaign demand predates current step');
    if (demand.demand_month === month) {
      out.campaign_demand.push(structuredClone(demand));
      event(demand.id, demand.decision_id, 'campaign_demand', 'Marketing-generated potential demand');
    }
  }
  state.pending_campaign_demand = state.pending_campaign_demand.filter(d => d.demand_month > month);
  fi.incremental_investment_outlay += fi.growth_capex + fi.recruitment + fi.incremental_marketing;
  // Refuse ID collisions with financial schedules; never silently merge unrelated assets/debt.
  for (const addition of fi.asset_additions) {
    if (prior.financial.depreciable_assets.some(asset => asset.id === addition.asset.id)) throw new Error('Duplicate growth asset ID');
  }
  for (const debt of fi.new_debt_tranches) {
    if (prior.financial.debt_tranches.some(tranche => tranche.id === debt.id)) throw new Error('Duplicate new debt ID');
  }
  return MonthEventsSchema.parse(out);
};
