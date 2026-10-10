"""Reproduce the illustrative fixture; proposals are documented in assumptions.md."""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
monthly = dict(service_jobs=540, service_revenue=351000, other_revenue=788000/12,
               revenue=5000000/12, tech_direct_labor=95000, vehicle_direct_opex=15000,
               service_variable_cost=1100000/12, other_direct_cost=27500,
               cogs=2750000/12, operating_overhead=125000, ebitda=62500)
company = dict(
    id='synthetic-hvac-001', name='Illustrative HVAC Company', industry='HVAC', currency='USD',
    model_version='mvp-1.0', valuation_month=60, horizon_months=60, forecast_start_month_of_year=1,
    historical_months=[dict(month_of_year=m, **monthly) for m in range(1, 13)],
    opening_financial_state=dict(
        cash=400000, accounts_receivable=5000000/12, inventory=50000,
        accounts_payable=(1100000/12 + 27500)*0.5,
        debt_tranches=[dict(id='existing-debt-01', principal=1200000, annual_interest_rate=0.08,
                            remaining_term_months=60, monthly_principal=20000,
                            first_repayment_month=1, amortization_policy='level_principal')],
        depreciable_assets=[dict(id='existing-assets-01', cost_basis=900000,
                                 accumulated_depreciation=150000, monthly_depreciation=12500,
                                 remaining_life_months=60, in_service_month=0)]),
    operations=dict(technicians=12, vehicles=12, working_days_per_month=20,
                    max_jobs_per_tech_per_day=3, max_jobs_per_vehicle_per_day=3,
                    base_monthly_job_demand=540, average_ticket=650,
                    non_service_revenue_per_month=788000/12,
                    technician_loaded_cost_per_year=95000, vehicle_opex_per_year=15000,
                    service_variable_cost_rate=1100000/4212000,
                    non_service_direct_cost_per_month=27500, fixed_overhead_per_month=125000,
                    baseline_marketing_in_overhead=10000),
    global_assumptions=dict(organic_demand_growth=0.02, wage_inflation=0.03,
                           overhead_inflation=0.02, ticket_growth=0.02,
                           other_revenue_growth=0, other_direct_cost_growth=0,
                           collection_delay_months=1, payment_delay_months=0.5,
                           ap_eligible_cost_categories=['service_variable_cost', 'other_direct_cost'],
                           constant_inventory=50000, existing_depreciation_per_year=150000,
                           maintenance_capex_per_year=100000, truck_useful_life_months=60,
                           tax_rate=0.25, liquidity_floor=150000, valuation_multiple=6,
                           seasonality=[1]*12, distribution_parameters={}))

provenance = {}
def visit(value, pointer=''):
    if isinstance(value, dict):
        for key, child in value.items():
            visit(child, pointer + '/' + key)
    elif isinstance(value, list):
        for index, child in enumerate(value):
            visit(child, pointer + '/' + str(index))
    else:
        key = pointer.rsplit('/', 1)[-1]
        unit = 'label'
        if isinstance(value, (int, float)):
            unit = 'USD'
            if 'month' in key or key in {'remaining_life_months', 'valuation_month'}:
                unit = 'months'
            if key == 'month_of_year' or key == 'forecast_start_month_of_year': unit = 'calendar_month_index'
            if key in {'technicians', 'vehicles'}: unit = 'count'
            if key in {'service_jobs', 'base_monthly_job_demand'}: unit = 'jobs/month'
            if key == 'working_days_per_month': unit = 'days/month'
            if key.startswith('max_jobs_per_'): unit = 'jobs/resource/day'
            if key == 'average_ticket': unit = 'USD/job'
            if key.endswith('_per_year'): unit = 'USD/year'
            if key.endswith('_per_month') or key == 'monthly_depreciation' or key == 'monthly_principal' or key == 'baseline_marketing_in_overhead': unit = 'USD/month'
            if key.endswith('_rate') or key.endswith('_growth') or key.endswith('_inflation'): unit = 'decimal_rate'
            if key == 'valuation_multiple' or '/seasonality/' in pointer: unit = 'multiple'
        historical = pointer.startswith('/historical_months/')
        kind = 'synthetic_historical' if historical else 'assumed'
        source = 'Spec §3.4 synthetic annual reference; flat monthly allocation' if historical else 'docs/assumptions.md: proposed fixture inputs; spec §§3.1–3.4'
        if pointer in {'/opening_financial_state/accounts_receivable', '/opening_financial_state/accounts_payable'}:
            kind, source = 'derived', 'December synthetic history × proposed collection/payment factors; docs/assumptions.md'
        provenance[pointer] = dict(kind=kind, source=source, unit=unit)
visit(company)
company['provenance'] = provenance
data = ROOT / 'data'
data.mkdir(exist_ok=True)
(data / 'synthetic_hvac_company.json').write_text(json.dumps(company, indent=2, allow_nan=False) + '\n')
with (data / 'historical_12_months.csv').open('w', newline='') as stream:
    writer = csv.DictWriter(stream, fieldnames=['month_of_year', *monthly])
    writer.writeheader()
    writer.writerows(company['historical_months'])
print('Wrote synthetic company JSON and 12-month historical CSV.')
