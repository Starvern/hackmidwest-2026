"""Dependency-free fixture reconciliation; runtime schema validation remains separate."""
import csv
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def validate():
    company = json.loads((ROOT / 'data/synthetic_hvac_company.json').read_text())
    history = company['historical_months']
    with (ROOT / 'data/historical_12_months.csv').open(newline='') as stream:
        rows = list(csv.DictReader(stream))
    assert len(history) == len(rows) == 12
    assert [m['month_of_year'] for m in history] == list(range(1, 13))
    for month, row in zip(history, rows):
        assert set(month) == set(row)
        assert all(float(row[k]) == v for k, v in month.items())
        for total, parts in [('revenue', ['service_revenue', 'other_revenue']),
                             ('cogs', ['tech_direct_labor', 'vehicle_direct_opex', 'service_variable_cost', 'other_direct_cost'])]:
            assert math.isclose(month[total], sum(month[k] for k in parts), abs_tol=1e-8)
        assert math.isclose(month['ebitda'], month['revenue'] - month['cogs'] - month['operating_overhead'], abs_tol=1e-8)
    expected = dict(service_jobs=6480, service_revenue=4212000, other_revenue=788000,
                    revenue=5000000, tech_direct_labor=1140000, vehicle_direct_opex=180000,
                    service_variable_cost=1100000, other_direct_cost=330000,
                    cogs=2750000, operating_overhead=1500000, ebitda=750000)
    for key, value in expected.items():
        assert math.isclose(sum(m[key] for m in history), value, abs_tol=1e-7), key
    ops = company['operations']
    capacity = min(ops['technicians'] * ops['working_days_per_month'] * ops['max_jobs_per_tech_per_day'],
                   ops['vehicles'] * ops['working_days_per_month'] * ops['max_jobs_per_vehicle_per_day'])
    assert capacity == 720 and ops['base_monthly_job_demand'] == 540
    state = company['opening_financial_state']
    assumptions = company['global_assumptions']
    assert state['cash'] == 400000
    assert sum(t['principal'] for t in state['debt_tranches']) == 1200000
    assert math.isclose(state['accounts_receivable'], history[-1]['revenue'] * assumptions['collection_delay_months'], abs_tol=1e-8)
    assert math.isclose(state['accounts_payable'], sum(history[-1][k] for k in assumptions['ap_eligible_cost_categories']) * assumptions['payment_delay_months'], abs_tol=1e-8)
    assert state['inventory'] == assumptions['constant_inventory']
    assert sum(a['monthly_depreciation'] for a in state['depreciable_assets']) * 12 == 150000
    assert len(assumptions['seasonality']) == 12 and sum(assumptions['seasonality']) == 12
    pointers = set()
    def visit(value, pointer=''):
        if isinstance(value, dict):
            for key, child in value.items():
                if pointer == '' and key == 'provenance':
                    continue
                visit(child, pointer + '/' + key.replace('~', '~0').replace('/', '~1'))
        elif isinstance(value, list):
            for index, child in enumerate(value):
                visit(child, pointer + '/' + str(index))
        else:
            if isinstance(value, (int, float)):
                assert math.isfinite(value), pointer
            pointers.add(pointer)
    visit(company)
    assert pointers == set(company['provenance']), 'Provenance leaf coverage mismatch'
    assert all(p['kind'] in {'assumed', 'derived', 'synthetic_historical'} and p['source'] and p['unit'] for p in company['provenance'].values())
    print('PASS: 12 matching CSV/JSON months, annual P&L, baseline capacity, opening balances, finite inputs and provenance.')
    print('Pending: Person 1 policy approval and Person 3 Pydantic/schema validation. Gates A/B are not complete.')


if __name__ == '__main__':
    validate()
