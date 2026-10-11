// Synthetic review baseline. Policies remain in docs/assumptions.md.
import { mkdirSync, writeFileSync } from 'node:fs';
import type { CompanyInput } from '../contracts/contracts.ts';
const company: CompanyInput = {
  "id": "synthetic-hvac-001",
  "name": "Illustrative HVAC Company",
  "industry": "HVAC",
  "currency": "USD",
  "model_version": "mvp-1.0",
  "valuation_month": 60,
  "horizon_months": 60,
  "forecast_start_month_of_year": 1,
  "historical_months": [
    {
      "month_of_year": 1,
      "service_jobs": 540,
      "service_revenue": 351000,
      "other_revenue": 65666.66666666667,
      "revenue": 416666.6666666667,
      "tech_direct_labor": 95000,
      "vehicle_direct_opex": 15000,
      "service_variable_cost": 91666.66666666667,
      "other_direct_cost": 27500,
      "cogs": 229166.66666666666,
      "operating_overhead": 125000,
      "ebitda": 62500
    },
    {
      "month_of_year": 2,
      "service_jobs": 540,
      "service_revenue": 351000,
      "other_revenue": 65666.66666666667,
      "revenue": 416666.6666666667,
      "tech_direct_labor": 95000,
      "vehicle_direct_opex": 15000,
      "service_variable_cost": 91666.66666666667,
      "other_direct_cost": 27500,
      "cogs": 229166.66666666666,
      "operating_overhead": 125000,
      "ebitda": 62500
    },
    {
      "month_of_year": 3,
      "service_jobs": 540,
      "service_revenue": 351000,
      "other_revenue": 65666.66666666667,
      "revenue": 416666.6666666667,
      "tech_direct_labor": 95000,
      "vehicle_direct_opex": 15000,
      "service_variable_cost": 91666.66666666667,
      "other_direct_cost": 27500,
      "cogs": 229166.66666666666,
      "operating_overhead": 125000,
      "ebitda": 62500
    },
    {
      "month_of_year": 4,
      "service_jobs": 540,
      "service_revenue": 351000,
      "other_revenue": 65666.66666666667,
      "revenue": 416666.6666666667,
      "tech_direct_labor": 95000,
      "vehicle_direct_opex": 15000,
      "service_variable_cost": 91666.66666666667,
      "other_direct_cost": 27500,
      "cogs": 229166.66666666666,
      "operating_overhead": 125000,
      "ebitda": 62500
    },
    {
      "month_of_year": 5,
      "service_jobs": 540,
      "service_revenue": 351000,
      "other_revenue": 65666.66666666667,
      "revenue": 416666.6666666667,
      "tech_direct_labor": 95000,
      "vehicle_direct_opex": 15000,
      "service_variable_cost": 91666.66666666667,
      "other_direct_cost": 27500,
      "cogs": 229166.66666666666,
      "operating_overhead": 125000,
      "ebitda": 62500
    },
    {
      "month_of_year": 6,
      "service_jobs": 540,
      "service_revenue": 351000,
      "other_revenue": 65666.66666666667,
      "revenue": 416666.6666666667,
      "tech_direct_labor": 95000,
      "vehicle_direct_opex": 15000,
      "service_variable_cost": 91666.66666666667,
      "other_direct_cost": 27500,
      "cogs": 229166.66666666666,
      "operating_overhead": 125000,
      "ebitda": 62500
    },
    {
      "month_of_year": 7,
      "service_jobs": 540,
      "service_revenue": 351000,
      "other_revenue": 65666.66666666667,
      "revenue": 416666.6666666667,
      "tech_direct_labor": 95000,
      "vehicle_direct_opex": 15000,
      "service_variable_cost": 91666.66666666667,
      "other_direct_cost": 27500,
      "cogs": 229166.66666666666,
      "operating_overhead": 125000,
      "ebitda": 62500
    },
    {
      "month_of_year": 8,
      "service_jobs": 540,
      "service_revenue": 351000,
      "other_revenue": 65666.66666666667,
      "revenue": 416666.6666666667,
      "tech_direct_labor": 95000,
      "vehicle_direct_opex": 15000,
      "service_variable_cost": 91666.66666666667,
      "other_direct_cost": 27500,
      "cogs": 229166.66666666666,
      "operating_overhead": 125000,
      "ebitda": 62500
    },
    {
      "month_of_year": 9,
      "service_jobs": 540,
      "service_revenue": 351000,
      "other_revenue": 65666.66666666667,
      "revenue": 416666.6666666667,
      "tech_direct_labor": 95000,
      "vehicle_direct_opex": 15000,
      "service_variable_cost": 91666.66666666667,
      "other_direct_cost": 27500,
      "cogs": 229166.66666666666,
      "operating_overhead": 125000,
      "ebitda": 62500
    },
    {
      "month_of_year": 10,
      "service_jobs": 540,
      "service_revenue": 351000,
      "other_revenue": 65666.66666666667,
      "revenue": 416666.6666666667,
      "tech_direct_labor": 95000,
      "vehicle_direct_opex": 15000,
      "service_variable_cost": 91666.66666666667,
      "other_direct_cost": 27500,
      "cogs": 229166.66666666666,
      "operating_overhead": 125000,
      "ebitda": 62500
    },
    {
      "month_of_year": 11,
      "service_jobs": 540,
      "service_revenue": 351000,
      "other_revenue": 65666.66666666667,
      "revenue": 416666.6666666667,
      "tech_direct_labor": 95000,
      "vehicle_direct_opex": 15000,
      "service_variable_cost": 91666.66666666667,
      "other_direct_cost": 27500,
      "cogs": 229166.66666666666,
      "operating_overhead": 125000,
      "ebitda": 62500
    },
    {
      "month_of_year": 12,
      "service_jobs": 540,
      "service_revenue": 351000,
      "other_revenue": 65666.66666666667,
      "revenue": 416666.6666666667,
      "tech_direct_labor": 95000,
      "vehicle_direct_opex": 15000,
      "service_variable_cost": 91666.66666666667,
      "other_direct_cost": 27500,
      "cogs": 229166.66666666666,
      "operating_overhead": 125000,
      "ebitda": 62500
    }
  ],
  "opening_financial_state": {
    "cash": 400000,
    "accounts_receivable": 416666.6666666667,
    "inventory": 50000,
    "accounts_payable": 59583.333333333336,
    "debt_tranches": [
      {
        "id": "existing-debt-01",
        "principal": 1200000,
        "annual_interest_rate": 0.08,
        "remaining_term_months": 60,
        "monthly_principal": 20000,
        "first_repayment_month": 1,
        "amortization_policy": "level_principal"
      }
    ],
    "depreciable_assets": [
      {
        "id": "existing-assets-01",
        "cost_basis": 900000,
        "accumulated_depreciation": 150000,
        "monthly_depreciation": 12500,
        "remaining_life_months": 60,
        "in_service_month": 0
      }
    ]
  },
  "operations": {
    "technicians": 12,
    "vehicles": 12,
    "working_days_per_month": 20,
    "max_jobs_per_tech_per_day": 3,
    "max_jobs_per_vehicle_per_day": 3,
    "base_monthly_job_demand": 540,
    "average_ticket": 650,
    "non_service_revenue_per_month": 65666.66666666667,
    "technician_loaded_cost_per_year": 95000,
    "vehicle_opex_per_year": 15000,
    "service_variable_cost_rate": 0.2611585944919278,
    "non_service_direct_cost_per_month": 27500,
    "fixed_overhead_per_month": 125000,
    "baseline_marketing_in_overhead": 10000
  },
  "global_assumptions": {
    "organic_demand_growth": 0.02,
    "wage_inflation": 0.03,
    "overhead_inflation": 0.02,
    "ticket_growth": 0.02,
    "other_revenue_growth": 0,
    "other_direct_cost_growth": 0,
    "collection_delay_months": 1,
    "payment_delay_months": 0.5,
    "ap_eligible_cost_categories": [
      "service_variable_cost",
      "other_direct_cost"
    ],
    "constant_inventory": 50000,
    "existing_depreciation_per_year": 150000,
    "maintenance_capex_per_year": 100000,
    "truck_useful_life_months": 60,
    "tax_rate": 0.25,
    "liquidity_floor": 150000,
    "valuation_multiple": 6,
    "seasonality": [
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1
    ],
    "distribution_parameters": {}
  },
  "provenance": {
    "/id": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "label"
    },
    "/name": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "label"
    },
    "/industry": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "label"
    },
    "/currency": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "label"
    },
    "/model_version": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "label"
    },
    "/valuation_month": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "months"
    },
    "/horizon_months": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "months"
    },
    "/forecast_start_month_of_year": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "calendar_month_index"
    },
    "/historical_months/0/month_of_year": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "calendar_month_index"
    },
    "/historical_months/0/service_jobs": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "jobs/month"
    },
    "/historical_months/0/service_revenue": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/0/other_revenue": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/0/revenue": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/0/tech_direct_labor": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/0/vehicle_direct_opex": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/0/service_variable_cost": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/0/other_direct_cost": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/0/cogs": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/0/operating_overhead": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/0/ebitda": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/1/month_of_year": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "calendar_month_index"
    },
    "/historical_months/1/service_jobs": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "jobs/month"
    },
    "/historical_months/1/service_revenue": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/1/other_revenue": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/1/revenue": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/1/tech_direct_labor": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/1/vehicle_direct_opex": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/1/service_variable_cost": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/1/other_direct_cost": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/1/cogs": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/1/operating_overhead": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/1/ebitda": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/2/month_of_year": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "calendar_month_index"
    },
    "/historical_months/2/service_jobs": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "jobs/month"
    },
    "/historical_months/2/service_revenue": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/2/other_revenue": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/2/revenue": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/2/tech_direct_labor": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/2/vehicle_direct_opex": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/2/service_variable_cost": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/2/other_direct_cost": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/2/cogs": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/2/operating_overhead": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/2/ebitda": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/3/month_of_year": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "calendar_month_index"
    },
    "/historical_months/3/service_jobs": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "jobs/month"
    },
    "/historical_months/3/service_revenue": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/3/other_revenue": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/3/revenue": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/3/tech_direct_labor": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/3/vehicle_direct_opex": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/3/service_variable_cost": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/3/other_direct_cost": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/3/cogs": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/3/operating_overhead": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/3/ebitda": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/4/month_of_year": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "calendar_month_index"
    },
    "/historical_months/4/service_jobs": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "jobs/month"
    },
    "/historical_months/4/service_revenue": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/4/other_revenue": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/4/revenue": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/4/tech_direct_labor": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/4/vehicle_direct_opex": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/4/service_variable_cost": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/4/other_direct_cost": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/4/cogs": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/4/operating_overhead": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/4/ebitda": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/5/month_of_year": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "calendar_month_index"
    },
    "/historical_months/5/service_jobs": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "jobs/month"
    },
    "/historical_months/5/service_revenue": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/5/other_revenue": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/5/revenue": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/5/tech_direct_labor": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/5/vehicle_direct_opex": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/5/service_variable_cost": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/5/other_direct_cost": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/5/cogs": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/5/operating_overhead": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/5/ebitda": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/6/month_of_year": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "calendar_month_index"
    },
    "/historical_months/6/service_jobs": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "jobs/month"
    },
    "/historical_months/6/service_revenue": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/6/other_revenue": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/6/revenue": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/6/tech_direct_labor": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/6/vehicle_direct_opex": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/6/service_variable_cost": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/6/other_direct_cost": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/6/cogs": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/6/operating_overhead": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/6/ebitda": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/7/month_of_year": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "calendar_month_index"
    },
    "/historical_months/7/service_jobs": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "jobs/month"
    },
    "/historical_months/7/service_revenue": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/7/other_revenue": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/7/revenue": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/7/tech_direct_labor": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/7/vehicle_direct_opex": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/7/service_variable_cost": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/7/other_direct_cost": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/7/cogs": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/7/operating_overhead": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/7/ebitda": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/8/month_of_year": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "calendar_month_index"
    },
    "/historical_months/8/service_jobs": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "jobs/month"
    },
    "/historical_months/8/service_revenue": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/8/other_revenue": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/8/revenue": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/8/tech_direct_labor": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/8/vehicle_direct_opex": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/8/service_variable_cost": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/8/other_direct_cost": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/8/cogs": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/8/operating_overhead": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/8/ebitda": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/9/month_of_year": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "calendar_month_index"
    },
    "/historical_months/9/service_jobs": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "jobs/month"
    },
    "/historical_months/9/service_revenue": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/9/other_revenue": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/9/revenue": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/9/tech_direct_labor": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/9/vehicle_direct_opex": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/9/service_variable_cost": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/9/other_direct_cost": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/9/cogs": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/9/operating_overhead": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/9/ebitda": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/10/month_of_year": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "calendar_month_index"
    },
    "/historical_months/10/service_jobs": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "jobs/month"
    },
    "/historical_months/10/service_revenue": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/10/other_revenue": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/10/revenue": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/10/tech_direct_labor": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/10/vehicle_direct_opex": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/10/service_variable_cost": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/10/other_direct_cost": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/10/cogs": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/10/operating_overhead": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/10/ebitda": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/11/month_of_year": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "calendar_month_index"
    },
    "/historical_months/11/service_jobs": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "jobs/month"
    },
    "/historical_months/11/service_revenue": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/11/other_revenue": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/11/revenue": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/11/tech_direct_labor": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/11/vehicle_direct_opex": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/11/service_variable_cost": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/11/other_direct_cost": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/11/cogs": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/11/operating_overhead": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/historical_months/11/ebitda": {
      "kind": "synthetic_historical",
      "source": "Spec \u00a73.4 synthetic annual reference; flat monthly allocation",
      "unit": "USD"
    },
    "/opening_financial_state/cash": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "USD"
    },
    "/opening_financial_state/accounts_receivable": {
      "kind": "derived",
      "source": "December synthetic history \u00d7 proposed collection/payment factors; docs/assumptions.md",
      "unit": "USD"
    },
    "/opening_financial_state/inventory": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "USD"
    },
    "/opening_financial_state/accounts_payable": {
      "kind": "derived",
      "source": "December synthetic history \u00d7 proposed collection/payment factors; docs/assumptions.md",
      "unit": "USD"
    },
    "/opening_financial_state/debt_tranches/0/id": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "label"
    },
    "/opening_financial_state/debt_tranches/0/principal": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "USD"
    },
    "/opening_financial_state/debt_tranches/0/annual_interest_rate": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "decimal_rate"
    },
    "/opening_financial_state/debt_tranches/0/remaining_term_months": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "months"
    },
    "/opening_financial_state/debt_tranches/0/monthly_principal": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "USD/month"
    },
    "/opening_financial_state/debt_tranches/0/first_repayment_month": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "months"
    },
    "/opening_financial_state/debt_tranches/0/amortization_policy": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "label"
    },
    "/opening_financial_state/depreciable_assets/0/id": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "label"
    },
    "/opening_financial_state/depreciable_assets/0/cost_basis": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "USD"
    },
    "/opening_financial_state/depreciable_assets/0/accumulated_depreciation": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "USD"
    },
    "/opening_financial_state/depreciable_assets/0/monthly_depreciation": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "USD/month"
    },
    "/opening_financial_state/depreciable_assets/0/remaining_life_months": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "months"
    },
    "/opening_financial_state/depreciable_assets/0/in_service_month": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "months"
    },
    "/operations/technicians": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "count"
    },
    "/operations/vehicles": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "count"
    },
    "/operations/working_days_per_month": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "days/month"
    },
    "/operations/max_jobs_per_tech_per_day": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "jobs/resource/day"
    },
    "/operations/max_jobs_per_vehicle_per_day": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "jobs/resource/day"
    },
    "/operations/base_monthly_job_demand": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "jobs/month"
    },
    "/operations/average_ticket": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "USD/job"
    },
    "/operations/non_service_revenue_per_month": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "USD/month"
    },
    "/operations/technician_loaded_cost_per_year": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "USD/year"
    },
    "/operations/vehicle_opex_per_year": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "USD/year"
    },
    "/operations/service_variable_cost_rate": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "decimal_rate"
    },
    "/operations/non_service_direct_cost_per_month": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "USD/month"
    },
    "/operations/fixed_overhead_per_month": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "USD/month"
    },
    "/operations/baseline_marketing_in_overhead": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "USD/month"
    },
    "/global_assumptions/organic_demand_growth": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "decimal_rate"
    },
    "/global_assumptions/wage_inflation": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "decimal_rate"
    },
    "/global_assumptions/overhead_inflation": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "decimal_rate"
    },
    "/global_assumptions/ticket_growth": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "decimal_rate"
    },
    "/global_assumptions/other_revenue_growth": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "decimal_rate"
    },
    "/global_assumptions/other_direct_cost_growth": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "decimal_rate"
    },
    "/global_assumptions/collection_delay_months": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "months"
    },
    "/global_assumptions/payment_delay_months": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "months"
    },
    "/global_assumptions/ap_eligible_cost_categories/0": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "label"
    },
    "/global_assumptions/ap_eligible_cost_categories/1": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "label"
    },
    "/global_assumptions/constant_inventory": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "USD"
    },
    "/global_assumptions/existing_depreciation_per_year": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "USD/year"
    },
    "/global_assumptions/maintenance_capex_per_year": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "USD/year"
    },
    "/global_assumptions/truck_useful_life_months": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "months"
    },
    "/global_assumptions/tax_rate": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "decimal_rate"
    },
    "/global_assumptions/liquidity_floor": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "USD"
    },
    "/global_assumptions/valuation_multiple": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "multiple"
    },
    "/global_assumptions/seasonality/0": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "multiple"
    },
    "/global_assumptions/seasonality/1": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "multiple"
    },
    "/global_assumptions/seasonality/2": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "multiple"
    },
    "/global_assumptions/seasonality/3": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "multiple"
    },
    "/global_assumptions/seasonality/4": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "multiple"
    },
    "/global_assumptions/seasonality/5": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "multiple"
    },
    "/global_assumptions/seasonality/6": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "multiple"
    },
    "/global_assumptions/seasonality/7": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "multiple"
    },
    "/global_assumptions/seasonality/8": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "multiple"
    },
    "/global_assumptions/seasonality/9": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "multiple"
    },
    "/global_assumptions/seasonality/10": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "multiple"
    },
    "/global_assumptions/seasonality/11": {
      "kind": "assumed",
      "source": "docs/assumptions.md: proposed fixture inputs; spec \u00a7\u00a73.1\u20133.4",
      "unit": "multiple"
    }
  }
};
const data = new URL('../data/', import.meta.url);
mkdirSync(data, { recursive: true });
writeFileSync(new URL('synthetic_hvac_company.json', data), JSON.stringify(company, null, 2) + '\n');
const keys = Object.keys(company.historical_months[0]);
const rows = company.historical_months.map(month => keys.map(key => month[key as keyof typeof month]).join(','));
writeFileSync(new URL('historical_12_months.csv', data), [keys.join(','), ...rows].join('\n') + '\n');
console.log('Wrote synthetic company JSON and 12-month historical CSV.');
