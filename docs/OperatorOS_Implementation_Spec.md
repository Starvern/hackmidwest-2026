# OperatorOS: Implementation Specification and Multi-Agent Build Handoff

**Document status:** Implementation-ready MVP specification  
**Version:** 1.0  
**Product:** OperatorOS (working name)  
**Primary audience:** Engineering agents, developers, financial-model reviewers, product designers, and QA agents  
**Initial use case:** A U.S. HVAC service operator evaluating operational investments  
**Target build:** Hackathon MVP, with a modular foundation for further development

> **Authority and scope.** This document is the source of truth for the initial build. When choices in an exploratory discussion conflict with this specification, follow this document. All company figures, probability distributions, pricing assumptions, and forecasts used in the MVP are **synthetic and illustrative**. The application is decision-support software, not an investment recommendation, accounting system, lending decision, or guarantee of financial outcomes.

---

## 0. Executive build brief

### 0.1 Product definition

OperatorOS is an **operational and financial digital twin** for an established service business. Users configure business decisions, such as purchasing service vehicles, hiring technicians, and increasing marketing. One time-stepped simulation engine translates those decisions into operational capacity, completed work, expenses, financing requirements, cash flow, debt, and modeled exit equity value.

The application produces two linked views:

1. **Deterministic comparison:** What does each decision produce under explicitly stated assumptions?
2. **Monte Carlo comparison:** How do the results change across plausible, correlated business and economic conditions?

The primary user interface is a **visual investment timeline** that reveals *when* an action occurs, when its operational effect begins, when cash is constrained, and what the range of eventual outcomes looks like.

### 0.2 Nonnegotiable design rule

```text
User decisions + operating assumptions + initial company state
                     |
                     v
         Monthly operational simulation
           (demand and constrained capacity)
                     |
                     v
           Monthly financial engine
       (income, cash, debt, working capital)
                     |
                     v
        Valuation and investment metrics
                     |
          +----------+-----------+
          |                      |
          v                      v
 Deterministic scenario     Repeated Monte Carlo runs
          |                      |
          +----------+-----------+
                     |
                     v
     One structured, versioned result payload
                     |
          +----------+-----------+
          |                      |
          v                      v
  Interactive timeline    Comparison / risk dashboard
                     |
                     v
     Optional AI explanation of computed results
```

**Neither the frontend nor the language model independently recalculates financial results.** All displayed KPIs, chart points, event milestones, and AI explanations must trace to engine outputs.

### 0.3 MVP capabilities: mandatory

- [ ] Load a consistent, documented **synthetic HVAC company** with 12 months of sample history and a starting balance sheet state.
- [ ] Configure **three decision types**: buy trucks, hire technicians, and adjust incremental monthly marketing spend.
- [ ] Set the timing and duration of each decision; support onboarding delays and productivity ramp-up.
- [ ] Generate an **initial state (month 0)** and **60 forward monthly periods (months 1–60)**.
- [ ] Model capacity and demand constraints before calculating service revenue.
- [ ] Model revenue, direct costs, overhead, EBITDA, depreciation, cash interest, taxes, working capital, capital expenditure, debt, and cash in one consistent engine.
- [ ] Calculate annualized or trailing-12-month EBITDA, enterprise value, and exit equity value with explicit assumptions.
- [ ] Compare the baseline with **at least two named investment scenarios** and combinations of choices.
- [ ] Run seeded Monte Carlo simulations with **2,000–5,000 paired paths** across baseline and investment scenarios.
- [ ] Display a timeline with **event markers, baseline/scenario lines, Monte Carlo percentile bands, risk threshold, and hover/selection details**.
- [ ] Display liquidity shortfall risk, payback status, and exit value comparisons, clearly distinguishing expected, median, and percentile values.
- [ ] Document financial assumptions, data provenance, model limitations, and deterministic validation tests.

### 0.4 Deliberately deferred

- Real bank-account connectivity, payment initiation, and live money movement.
- Automatic interpretation of arbitrary uploaded PDFs or accounting exports.
- Acquiring another company or modeling acquisition integration and purchase accounting.
- Full leveraged-buyout waterfalls, sponsor-level IRR/MOIC, investor distributions, and preferred equity.
- Automatic portfolio optimization or autonomous financial decisions.
- Real-time multiuser collaboration, comprehensive permissions, and production-grade audit compliance.
- Cross-industry calibration, generalized accounting standards, and predictive models trained on real customers.
- An LLM that sets forecast numbers. AI may explain **validated** results only.

### 0.5 Working assumptions to lock for MVP

| Dimension | Decision |
|---|---|
| Company type | HVAC service company, without claiming representativeness of the industry |
| Users | Business operator, CFO, investment analyst, PE portfolio-operations professional |
| Units | USD; monetary values internally as numeric USD amounts; display rounded to cents or whole dollars |
| Time step | Calendar-aligned monthly; month 0 = opening state, months 1–60 = forecast |
| Forecast horizon | 60 months / five years |
| Scenario types | Baseline, Scenario A, Scenario B; scenario decisions may be combined |
| Required investment actions | Purchase trucks; hire technicians; incremental marketing spend |
| Initial capital structure | Cash and existing debt; new truck borrowing optional |
| MC runs | Default 2,000; 5,000 when performance permits; same seed for reproducibility |
| Main liquidity floor | User-adjustable; default $150,000 |
| Valuation method | Trailing-12-month EBITDA × explicitly selected enterprise-value multiple |
| App stack | React + TypeScript + Recharts; Python + FastAPI + NumPy; test using pytest / Vitest |
| Persistence | Local fixture and in-memory scenario state for MVP; optional simple JSON persistence |
| Source of truth | Python simulation engine and its shared schema |

---

## 1. Product goals, use cases, and operating principles

### 1.1 Problem to solve

Small-business operators and PE-backed service businesses routinely weigh investments whose financial effects unfold over different months and depend on interacting bottlenecks. For example, buying trucks produces little additional revenue without trained technicians and sufficient customer demand. Hiring technicians produces little additional service capacity without trucks. Marketing can raise demand without increasing actual completed jobs when capacity is saturated.

Standard flat growth assumptions obscure these relationships. OperatorOS makes those causal constraints explicit and quantifies the resulting profitability, cash, financing, and valuation impacts over time.

### 1.2 Primary user journey

1. **Choose company:** Load sample HVAC business; inspect initial financial and operating conditions.
2. **Establish baseline:** Generate the no-new-investment forecast under shared company and market assumptions.
3. **Configure decisions:** Add truck purchases, technician hiring, or marketing; set quantities, start dates, costs, financing, and ramp parameters.
4. **Run base forecast:** Generate the deterministic monthly time series for the selected scenario.
5. **Run uncertainty analysis:** Simulate multiple paired sets of economic and operational assumptions using Monte Carlo.
6. **Inspect timeline:** Select a metric and month; review planned actions, operational milestones, balances, base-case differences, and risk bands.
7. **Compare alternatives:** Examine cash shortfall probability, payback, EBITDA differences, and exit equity value differences across scenarios.
8. **Inspect reasons:** Show which modeled drivers create the change. Optional AI may summarize already-computed results and limitations.

### 1.3 Operating principles

- **Decisions modify drivers, not dashboard numbers.** The engine derives all downstream metrics.
- **A company is capacity- and demand-constrained.** New equipment alone does not imply sales.
- **Time matters.** Purchases, recruiting, delays, training, billing, collections, loan payments, and exits occur at explicit times.
- **Profits are not cash.** Separate EBITDA, operating cash, free cash flow, financing cash flow, and ending cash.
- **Enterprise value is not equity return.** Net debt, cash, invested capital, and timing matter.
- **Comparisons use matched conditions.** The same sampled economic environment affects baseline and alternatives within a paired run.
- **Distributions are assumptions, not discoveries.** Every range is labeled and user-auditable.
- **Model outputs must reconcile.** No silent plugs, implicit recalculations, or double counts.
- **An agent cannot change another module's public contract without coordinating the change.**

### 1.4 MVP success demonstration

A demonstrator loads the HVAC fixture, observes the baseline, creates a truck-only scenario, creates a trucks-plus-hires-plus-marketing scenario, then runs both. Truck-only creates extra expenses and/or unused capacity; the coordinated expansion can increase completed jobs **only if its demand and capacity assumptions support it**. The timeline shows up-front cash requirements, hiring ramp-up, eventual cash recovery if achieved, and the range of exit outcomes. A risk panel highlights paths breaching the minimum cash reserve.

---

## 2. System boundaries and component ownership

| ID | Component | Responsibility | Authoritative outputs | Must not do |
|---|---|---|---|---|
| C1 | Input/data layer | Validate synthetic fixture, assumptions, and decisions | `CompanyInput`, `ScenarioInput`, provenance | Infer real financial facts from marketing copy |
| C2 | Timeline/event scheduler | Translate decisions to month-specific operational/financial effects | Active assets, hires, marketing, event log | Compute revenue or valuation |
| C3 | Operational engine | Demand, staffing productivity, vehicles, constrained completed jobs | Jobs, capacity, utilization, ticket values | Book revenue directly to cash |
| C4 | Financial engine | Income statement, assets/depreciation, NWC, taxes, cash, debt roll-forward | Monthly financial statements and balances | Sample randomness, display charts |
| C5 | Valuation/metrics | TTM EBITDA, enterprise/equity value, incremental cash flows, payback, shortfall | Standardized KPI results | Alter operating assumptions |
| C6 | Scenario runner | Apply common state/assumptions across baseline and scenarios | Comparable deterministic paths and deltas | Duplicate C3/C4 financial logic |
| C7 | Monte Carlo engine | Sample uncertain time-dependent drivers and run paired scenarios | Path-level metrics, percentile arrays, risks | Replace deterministic formulas |
| C8 | API/schema adapter | Parse requests, validate versions, serialize outputs/errors | Documented JSON contracts | Business logic in route handlers |
| C9 | Timeline/dashboard UI | Visualize approved model results and decision events | Views and scenario interactions | Recompute financial KPIs |
| C10 | Explanation layer (optional) | Explain computed changes and assumptions | Grounded narrative | Introduce fabricated output values |
| C11 | QA/integration | Assert invariants, trace data, performance, acceptance workflows | Automated tests and review results | Modify contracts without review |

### 2.1 Dependency order

```text
Shared schemas + synthetic fixture
              |
      Decision event scheduler
              |
      Operational calculation
              |
      Financial calculation
              |
        Valuation / metrics
              |
         Scenario runner
              |
         Monte Carlo
              |
      REST API and aggregation
              |
      Timeline and dashboard
              |
    Explanations and final QA
```

Work can proceed concurrently if schema contracts are frozen first. Frontend development may begin with committed example API payloads and swap to live endpoints without changing views.

### 2.2 Public engine interfaces

The following are **semantic contracts**. Agents may implement them as typed Python functions or equivalent classes, but their inputs/outputs and ownership must remain stable.

```python
def schedule_month(company, scenario, month, path_risks, prior_state) -> "MonthEvents": ...
def calculate_operations(company, prior_state, month_events, market_factors) -> "OperationsResult": ...
def calculate_financials(company, prior_state, operations, month_events) -> "FinancialResult": ...
def calculate_valuation(company, financial_history, ending_state) -> "ValuationResult": ...
def simulate_months(initial_company, decisions, stochastic_inputs, horizon=60) -> "ScenarioPath": ...
def compare_paths(baseline_path, scenario_path) -> "PathComparison": ...
def aggregate_percentiles_and_risks(paired_paths) -> "MonteCarloSummary": ...
```

The `ScenarioPath` object must contain the ordered 61 snapshots/records for months 0 through 60, plus immutable metadata. `MonthEvents` must distinguish scheduled inputs from realized and calculated milestones. `FinancialResult` must expose both current-period flows and end-of-period balances. The backend is responsible for validation and serialization of these types, not for recalculating them.

### 2.3 Proposed repository structure

```text
operatoros/
├── README.md
├── docs/
│   ├── OPERATOROS_IMPLEMENTATION_SPEC.md
│   ├── assumptions.md
│   └── model-limitations.md
├── contracts/
│   ├── company.schema.json
│   ├── scenario.schema.json
│   ├── simulation-result.schema.json
│   └── example-result.json
├── data/
│   ├── synthetic_hvac_company.json
│   └── historical_12_months.csv
├── backend/
│   ├── pyproject.toml
│   ├── app/
│   │   ├── main.py
│   │   ├── schemas.py
│   │   ├── fixtures.py
│   │   ├── event_scheduler.py
│   │   ├── operations.py
│   │   ├── financials.py
│   │   ├── valuation.py
│   │   ├── scenarios.py
│   │   ├── monte_carlo.py
│   │   ├── aggregation.py
│   │   └── routes/
│   │       ├── companies.py
│   │       └── simulations.py
│   └── tests/
│       ├── test_operations.py
│       ├── test_accounting.py
│       ├── test_event_timing.py
│       ├── test_scenarios.py
│       ├── test_monte_carlo.py
│       └── test_api.py
├── frontend/
│   ├── package.json
│   └── src/
│       ├── api/client.ts
│       ├── types/contracts.ts
│       ├── components/ScenarioEditor.tsx
│       ├── components/InvestmentTimeline.tsx
│       ├── components/MetricSelector.tsx
│       ├── components/MilestonePanel.tsx
│       ├── components/RiskPanel.tsx
│       ├── components/ScenarioComparison.tsx
│       ├── components/AssumptionsDrawer.tsx
│       └── pages/Dashboard.tsx
└── scripts/
    └── validate_fixture.py
```

The structure is a proposed contract, not a requirement to introduce extra infrastructure during the hackathon.

---

## 3. Canonical data definitions and conventions

### 3.1 Units and time

- Monetary fields: USD; no mixing USD with `$000` or cents in payloads. Display formatting happens only in the UI.
- Rates: decimals (`0.25` means 25%), not mixed percentages. Exit multiples are numeric (`6.0` means 6×).
- Job counts: numeric; monthly modeled quantities may be fractional expectations for deterministic forecasting, with discrete counts optional later.
- Month `0`: opening balances/initial state only; **no decisions or operating flows occur in month 0**.
- Months `1` to `60`: each record contains **flows during that month** and **ending balances after that month's events**.
- `start_month: 1` applies a decision beginning in the first modeled month. All MVP decisions must have `start_month` between 1 and 60 inclusive. Month 0 is immutable and reserved for the initial state.
- Annual-to-monthly conversion: annual operating rates divided by 12 unless driven by actual working days; annual interest rate divided by 12 for monthly debt calculations; growth and inflation use a documented monthly compounding conversion.
- Full-year EBITDA is a flow; month-end cash, debt, and valuation are stocks or point-in-time calculations. Do not place these on one unlabeled axis.
- For comparable outputs, every scenario has an identical time index and valuation date. The demo forecast begins in January after the supplied 12-month historical year; `forecast_start_month_of_year = 1` is an explicit fixture assumption, not inferred from the system clock.

### 3.2 Data provenance

Each underlying input must be tagged with one of:

- `synthetic_historical`: generated baseline history supplied with the demo;
- `user_input`: explicitly entered by user;
- `derived`: computed from prior state or historical facts;
- `assumed`: model default, including distribution parameters;
- `simulated`: sampled stochastic realization.

Display the source, value, and unit in the assumptions drawer. Values from synthetic fixtures must never be described as measured industry facts.

### 3.3 Canonical initial state

The **same initial state** must be deep-copied for baseline and every scenario. Never mutate global fixture state when running a scenario.

Minimum fields:

```text
CompanyInput
  id, name, industry, currency
  model_version, valuation_month, horizon_months, forecast_start_month_of_year
  historical_months[12]
  opening_financial_state
    cash, accounts_receivable, inventory, accounts_payable
    existing_debt_tranches, depreciable_assets, opening_equity_if_used
  operations
    technicians, vehicles, working_days_per_month
    max_jobs_per_tech_per_day, base_monthly_job_demand
    average_ticket, non_service_revenue_per_month
    technician_loaded_cost_per_year, vehicle_opex_per_year
    service_variable_cost_rate, non_service_direct_cost_per_month
    fixed_overhead_per_month, baseline_marketing_in_overhead
  global_assumptions
    organic_demand_growth, wage_inflation, overhead_inflation
    collection/payment/working_capital policy
    existing_depreciation, tax_rate, maintenance_capex
    baseline_financing, liquidity_floor, valuation_multiple
    seasonality[12], sensitivity/distribution parameters
```

`fixed_overhead_per_month` includes baseline marketing and **excludes** service direct labor, vehicle direct costs, service variable costs, and incremental scenario marketing. This avoids double counting.

### 3.4 Synthetic HVAC fixture: internally reconcilable year-zero model

The fixture is a deliberate test case and must balance at the starting operating run rate. These annual values are illustrative:

| Baseline item | Annual USD | Treatment |
|---|---:|---|
| Service revenue | 4,212,000 | `12 tech × 20 days/month × 12 months × 3 potential jobs/day × 0.75 demand-utilization × $650/ticket` |
| Other revenue | 788,000 | Separate non-service stream, not auto-generated by technician capacity |
| **Total revenue** | **5,000,000** | Sum of service and other revenue |
| Technician fully loaded direct labor | 1,140,000 | 12 × $95,000; belongs to direct cost only |
| Vehicle direct operating cost | 180,000 | 12 × $15,000; belongs to direct cost only |
| Service materials and other variable direct costs | 1,100,000 | Variable service-cost rate: $1.10m / $4.212m |
| Other-revenue direct costs | 330,000 | Separate cost stream |
| **Total direct costs / COGS** | **2,750,000** | Sum of preceding four cost lines |
| Fixed overhead excluding D&A | 1,500,000 | Includes baseline marketing; excludes scenario incremental marketing |
| **EBITDA** | **750,000** | $5m − $2.75m − $1.50m |
| Opening cash | 400,000 | Month-0 starting balance |
| Opening interest-bearing debt | 1,200,000 | Tranche schedule required |
| Maintenance CapEx | 100,000 | Annual cash outflow, not an EBITDA expense |
| Existing annual depreciation | 150,000 | Below EBITDA; input to taxable profit |
| Existing debt assumption | 8% nominal annual rate | Demo assumption; monthly debt schedule must specify amortization |
| Tax rate | 25% | Simplified effective cash tax rate for positive taxable income |
| Exit EV / EBITDA multiple | 6.0× | User-adjustable illustrative assumption |
| Minimum cash floor | 150,000 | User-adjustable risk threshold |

**Reconciliation notes:** Service capacity is `12 × 20 × 3 = 720` potential jobs per month. The baseline has **540 jobs of demand per month** and therefore completes 540, a **75% realized capacity utilization**. Do **not** multiply throughput by 75% a second time. Monthly service revenue is $351,000 and monthly other revenue is $65,666.67 before output rounding. The four direct-cost categories sum exactly to $2.75m annually. Baseline month-1 operations may grow or seasonally vary according to explicit forecast assumptions; year-zero figures are the **historical annual reference**, not a promise that year 1 matches them exactly.

**Required historical consistency:** The provided 12 historical records must sum to the annual reference P&L above and reconcile with opening balances. If synthetic seasonality is added, its factors should have a mean of 1 and preserve the annual history totals, with documented rounding adjustments.

**Minimum cash/debt fixture details:** Create a valid opening balance sheet or explicitly label the prototype a *reconciled income/cash/debt schedule rather than full GAAP three-statement accounting*. If using a full balance sheet, assets = liabilities + equity must be verified. For the MVP, a reconciled operational P&L and cash/debt roll-forward is mandatory; full balance sheet reporting is optional.

---

## 4. Decision model and timed event scheduler (C2)

### 4.1 Decision structure

Every decision is an object with a stable ID, type, schedule, values, optional financing information, and explicit input provenance. **Decisions are additive to the baseline**, and each decision's cash and operating effects must be booked exactly once.

```json
{
  "id": "buy-trucks-01",
  "type": "purchase_trucks",
  "start_month": 1,
  "quantity": 2,
  "cost_per_unit": 60000,
  "funding": {
    "debt_fraction": 0.5,
    "annual_interest_rate": 0.08,
    "term_months": 48
  },
  "in_service_delay_months": 1
}
```

```json
{
  "id": "hire-techs-01",
  "type": "hire_technicians",
  "start_month": 2,
  "quantity": 2,
  "fully_loaded_annual_cost_per_person": 95000,
  "hiring_delay_months": 1,
  "ramp_months": 4,
  "one_time_hiring_cost_per_person": 3000
}
```

```json
{
  "id": "marketing-01",
  "type": "increase_marketing",
  "start_month": 3,
  "duration_months": 12,
  "extra_spend_per_month": 4000,
  "lead_to_job_lag_months": 2,
  "incremental_cost_per_booked_job": 100
}
```

The cost-per-booked-job number is a **hypothesis**, not a verified acquisition cost. Use a bounded or diminishing-return function if the decision size increases significantly. New demand cannot generate revenue beyond productive service capacity.

### 4.2 Explicit event conventions

| Event | When cost hits | When operating benefit begins | Notes |
|---|---|---|---|
| Truck purchase | Purchase month CapEx; financing at purchase | After in-service delay | Adds fleet capacity, direct running cost only while in service |
| Hire technicians | Hiring charge when incurred; wage cost once employed | After hiring delay, then ramped | Benefits may lag full payroll cost |
| Marketing spend | Each active campaign month | After lead-to-job lag | Causes *potential demand*, not automatically completed work |
| Financing | Loan proceeds in truck purchase month | No direct revenue impact | Interest and principal booked in monthly debt schedule |
| Depreciation | No cash movement | Begin in-service month | Hits EBIT, not EBITDA |
| End of campaign | Stop incremental spend | Lead tail handled explicitly | MVP may assume no further lift after a defined lag/tail |

**Exact timing rule:** `purchase_month = start_month`; `in_service_month = start_month + in_service_delay_months`; `employment_start_month = start_month + hiring_delay_months`; `first_campaign_demand_month = start_month + lead_to_job_lag_months`. For these equations, a delay of zero permits effects in the start month. Out-of-horizon effects are ignored for the forecast but the initiating expense still applies if in horizon. Productive ramp starts in employment month at a documented fraction. For deterministic paths use each decision's configured delay and ramp. For Monte Carlo, sampled delays and effectiveness are inputs into this same scheduler, not separate formulas.

### 4.3 Technician ramp logic

For a cohort with `hire_start`, `hiring_delay`, and `ramp_months`:

- Before employment: 0 incremental payroll and 0 productive FTE; recruitment charge can be incurred.
- Once employed: full modeled payroll unless explicitly overridden; productivity starts at a documented fraction and ramps to 100% over `ramp_months`.
- Productive technician equivalents may be fractional; actual headcount and payroll remain based on employed people.

Use `ramp_fraction = min(1, (t - employment_start_month + 1) / ramp_months)` for `ramp_months >= 1` and employed months `t >= employment_start_month`; use 1 immediately if `ramp_months = 0`. Thus a four-month ramp produces 25%, 50%, 75%, and 100% productivity in employment months 1–4. Full wages are charged in each employed month. Tests must assert this exact behavior.

### 4.4 Decision combination and event order

For each forecast month:

1. Apply scheduled purchases, financing disbursements, hiring state transitions, campaigns, and in-service events.
2. Calculate active productive tech equivalents and active vehicle availability.
3. Calculate demand and feasible completed jobs.
4. Calculate revenue and expenses for that month.
5. Update depreciation, working capital, taxes, loan interest and principal, then cash.
6. Derive period-end valuation and milestone conditions.
7. Emit month-end state and an event log with stable event IDs.

No module should create cash changes solely for the purpose of moving a chart marker.

---

## 5. Operational model and causal dependencies (C3)

### 5.1 Essential capacity chain

The engine must differentiate **underlying demand**, **productive technical labor**, and **available vehicles**. For the MVP, assume one usable service vehicle per productive technician equivalent. This is a modeling choice, not a universal industry truth.

For month `t`:

```text
technician_job_capacity_t
  = productive_technician_FTE_t × working_days_t × jobs_per_tech_per_day_t

vehicle_job_capacity_t
  = available_vehicle_equivalents_t × working_days_t × jobs_per_vehicle_per_day_t

feasible_service_capacity_t
  = min(technician_job_capacity_t, vehicle_job_capacity_t)

completed_service_jobs_t
  = min(nonnegative_service_demand_t, feasible_service_capacity_t)

realized_utilization_t
  = completed_service_jobs_t / feasible_service_capacity_t
  (defined as 0 when capacity = 0)
```

Never multiply completed jobs by `realized_utilization` again. Utilization is an **output** from realized demand divided by capacity, not an independent automatic revenue haircut.

### 5.2 Demand model

Suggested monthly formulation:

```text
base_service_demand_t
  = reference_monthly_demand
    × annual_growth_factor(t)
    × seasonality_factor(month_of_year)
    × sampled_economic_demand_factor_t

campaign_incremental_demand_t
  = sum of each active campaign's post-lag generated booked-job demand

nonnegative_service_demand_t
  = max(0, base_service_demand_t + campaign_incremental_demand_t)
```

If scenario marketing is active, extra booked-job demand is estimated from spend divided by assumed acquisition cost after the modeled lag. **Repeated monthly marketing spending generates contemporaneous incremental demand, not permanent compounding customers by default.** A recurring-customer lifetime model is outside initial scope. Protect against zero or negative acquisition-cost inputs.

### 5.3 Revenue and direct costs

```text
service_revenue_t = completed_service_jobs_t × average_service_ticket_t
other_revenue_t   = separately modeled other revenue stream
revenue_t         = service_revenue_t + other_revenue_t

service_variable_cost_t = service_revenue_t × service_variable_cost_rate_t
tech_direct_labor_t     = employed_technicians_t × annual_loaded_cost / 12
vehicle_direct_opex_t  = in_service_vehicles_t × annual_vehicle_opex / 12
other_direct_cost_t    = separate other-revenue cost stream
COGS_t                 = sum of all four direct-cost categories
```

Baseline existing employees and vehicles belong to the same counts and costs as scenario additions; do not include labor or fleet costs elsewhere. Other revenue should **not** automatically grow because a service truck was purchased. If other revenue growth is assumed, it must be separate and disclosed.

### 5.4 Explicit operational bottlenecks

- More vehicles with no productive technicians: no technician capacity increase.
- More technicians with no vehicles: no effective capacity increase under the 1:1 assumption.
- More demand with no spare capacity: more unserved demand, not more completed jobs.
- Increasing demand when spare capacity exists: potential additional service jobs.
- Increasing capacity with no incremental demand: costs rise; revenue need not rise.
- Combining capacity investment and marketing can create **nonadditive effects**; calculate combinations from scratch rather than adding stand-alone investment uplifts.

### 5.5 Optional, not first-release dependencies

Scheduling efficiency, cancellations, installation jobs versus maintenance jobs, dispatch radius, service-level agreements, parts inventory constraints, season-specific call mix, repeat customers, and pricing elasticity. Keep interfaces extensible but do not fabricate these relationships in MVP data.

---

## 6. Financial model and accounting policies (C4)

### 6.1 Monthly income statement

```text
revenue_t = service_revenue_t + other_revenue_t
COGS_t = service materials + other direct costs + direct labor + vehicle direct opex
gross_profit_t = revenue_t - COGS_t
operating_overhead_t = fixed overhead + incremental marketing + recruitment
EBITDA_t = gross_profit_t - operating_overhead_t
EBIT_t = EBITDA_t - depreciation_t - amortization_t
pretax_income_t = EBIT_t - interest_expense_t
cash_taxes_t = max(0, taxable_income_t) × tax_rate
```

For MVP, `taxable_income_t` can equal `pretax_income_t` with **no loss carryforwards, tax credits, or deferred tax modeling**. Document this simplification. Recruitment may be treated as operating expense and vehicle purchases as capital expenditure. Do not subtract CapEx from EBITDA.

### 6.2 Debt and financing

For each loan tranche, maintain:

- opening principal;
- disbursements;
- monthly interest;
- scheduled principal payment;
- closing principal;
- term, rate, and amortization policy.

Required invariant:

\[
Debt_{end,t}=Debt_{begin,t}+Borrowings_t-PrincipalRepayments_t
\]

Interest is an income-statement expense and an operating cash outflow under the MVP convention. Principal is a financing cash outflow, **not** an income-statement expense. New borrowing is a financing cash inflow, **not** revenue.

Choose one amortization convention for each tranche and test it. Default: level monthly principal repayment with interest calculated on beginning-of-month outstanding balance. Do not accidentally model level-payment interest and level-principal amortization at the same time.

### 6.3 Depreciation and capital investment

- Truck purchase amount becomes capital expenditure at purchase.
- Financed and cash-funded amounts are distinguished through debt proceeds.
- Truck depreciation starts when placed in service, using a simple straight-line useful life of 60 months in the demo (user-editable only if implementation supports it).
- Existing annual depreciation is an explicit baseline input.
- Cash purchase does **not** decrease EBITDA; vehicle depreciation decreases EBIT and tax expense where applicable.
- Maintenance CapEx is modeled independently to avoid incorrectly treating all asset-related spending as one-time expansion CapEx.

### 6.4 Working capital and collection policy

The model must not assume every dollar of booked revenue is instantly received in cash without stating that assumption.

The minimal required mechanism is an **accounts receivable / payable working-capital policy**. The MVP can use a simple constant ratio of receivables to monthly revenue and payables to relevant direct costs, initialized from opening balances:

```text
AR_end_t = collection_delay_months × revenue_t
AP_end_t = payment_delay_months × eligible_operating_cost_t
NWC_t = AR_end_t + inventory_t - AP_end_t
DeltaNWC_t = NWC_t - NWC_(t-1)
```

Use fractional-month delay factors as a simplified steady-state approximation, label them clearly, and ensure a change in receivables affects cash rather than EBITDA. For example, the fixture could initially assume 0.5 months of revenue in AR and 0.3 months of applicable costs in AP. Opening balances must be initialized consistently so the first forecast period does not show a fake working-capital shock. A future model can use explicit invoice-aging cohorts.

### 6.5 Cash flow and cash reconciliation

Adopt the following consistent convention for the MVP:

```text
operating_cash_flow_t
  = EBITDA_t
    - cash_interest_t
    - cash_taxes_t
    - DeltaNWC_t

cash_change_t
  = operating_cash_flow_t
    - maintenance_capex_t
    - growth_capex_t
    + new_borrowings_t
    - debt_principal_t
    - owner_distributions_t

cash_end_t = cash_begin_t + cash_change_t
```

`cash_interest_t` must not be subtracted again anywhere. Likewise, do not count vehicle investment twice as a cash purchase and a debt repayment. In MVP, `owner_distributions_t = 0` unless intentionally modeled.

Cash balances are allowed to go negative **in the simulated results as an infeasibility signal**, rather than silently injecting debt or clipping cash to zero. A run with negative cash or cash below the chosen reserve should be flagged. Optional revolver automation is deferred.

### 6.6 Company cash versus investment cash flow

These are separate concepts:

- **Company cash path:** Actual modeled cash including loan proceeds and repayment, used for liquidity risk.
- **Unlevered incremental free cash flow:** Scenario versus baseline operating cash generation **without** financing flows, used for economically consistent project payback.

Define project-level unlevered FCF as:

\[
UFCF_t = EBIT_t - TaxOnUnleveredEBIT_t + D\&A_t - \Delta NWC_t - CapEx_t
\]

`TaxOnUnleveredEBIT_t = max(0, EBIT_t) × tax_rate` for the simplified model. `CapEx_t` includes growth and maintenance CapEx. Project cash flow delta is `UFCF_scenario,t - UFCF_baseline,t` under identical market assumptions. This removes the distortion where debt proceeds make a fully financed purchase appear immediately profitable.

**Payback definition:** First month where cumulative incremental unlevered FCF becomes nonnegative *after including all relevant initial investment CapEx*; show `Not reached within horizon` if not achieved. This is **undiscounted project payback**, not sponsor cash-on-cash return, IRR, or a guaranteed date.

### 6.7 Accounting and model invariants

For every month and every deterministic or stochastic path:

- `gross_profit = revenue − COGS`;
- `EBITDA = gross_profit − cash operating overhead`;
- `EBIT = EBITDA − D&A`;
- `debt_end = debt_begin + borrowing − principal`;
- `cash_end = cash_begin + operating_cash_flow − CapEx + borrowing − principal − distributions`;
- `completed_jobs ≤ demand` and `completed_jobs ≤ operational_capacity`;
- job demand, capacity, headcount, loans, and in-service vehicles cannot be negative;
- no scenario changes global opening state or another scenario's assumptions;
- year-zero annual P&L reconciles exactly to the published fixture values;
- full balance sheet equality is asserted **only if** a full balance sheet module is actually implemented.

Any invariant failure is a model error, not a chart warning.

---

## 7. Valuation and investment analytics (C5)

### 7.1 Valuation convention

At each month where at least 12 months of EBITDA history are available:

\[
TTMEBITDA_t = \sum_{i=t-11}^{t} EBITDA_i
\]

For the first 11 forecast months, use the preceding historical months to complete the rolling 12-month window. No multiplication of one volatile month's EBITDA by 12 unless explicitly labeled an annualization alternative.

\[
EnterpriseValue_t = TTMEBITDA_t \times ExitMultiple_t
\]

\[
EquityValue_t = EnterpriseValue_t - Debt_{end,t} + Cash_{end,t}
\]

For the MVP, this omits other debt-like adjustments, minority interests, transaction costs, and non-operating assets. If TTM EBITDA is nonpositive, display enterprise valuation as `Not meaningful under positive EBITDA multiple` or use an explicitly documented fallback; **do not silently treat negative multiples as reliable company valuations**.

### 7.2 Metrics and meanings

| Metric | Computation | Interpretation / caveat |
|---|---|---|
| Monthly revenue | Total invoiced operating revenue | Flow during month |
| Monthly EBITDA | Revenue less cash operating costs | Flow during month, not cash |
| TTM EBITDA | Last 12 months' monthly EBITDA | Appropriate annual earnings denominator for multiple |
| Ending cash | Cash roll-forward | Month-end stock |
| Ending debt | Debt tranche balances | Month-end stock |
| Minimum cash | `min(cash_end_t)` across horizon | Lowest modeled end-of-month cash; does not capture intramonth shocks |
| Company EV | TTM EBITDA × multiple | Simplified operating valuation |
| Company equity value | EV − debt + cash | Not a fund-level investor return |
| Incremental exit equity value | Scenario equity at month 60 minus paired baseline equity | Difference under shared assumptions |
| Unlevered project payback | First cumulative incremental UFCF recovery month | Discounting and full sponsor economics excluded |
| Shortfall probability | Fraction of MC paths with `min cash < reserve` | Path-level, across the entire horizon |
| P(negative incremental exit equity) | Fraction of paired paths with exit equity delta < 0 | Downside risk |
| Payback probability | Fraction of paths meeting payback definition by month 60 | Distinct from median payback month |

### 7.3 Important valuation restrictions

- Hold the exit multiple fixed **between competing deterministic scenarios** when isolating operational changes.
- Monte Carlo may vary the exit multiple according to the shared economic state, but the same market-driven valuation shock must apply to paired scenarios.
- **Do not present increased enterprise value as investor profit.** Separate change in equity value, upfront project outlay, and financing effects.
- Do not claim a modeled equity value is a market appraisal or third-party transaction price.
- Investor IRR and MOIC require a separate investor equity-contribution/distribution model and are outside the MVP.

---

## 8. Scenario runner and comparison contract (C6)

### 8.1 Baseline definition

The baseline represents the company's modeled operation **without additional selected decisions**. It still includes existing employees, vehicles, debts, maintenance CapEx, organic demand change, inflation, and the forecast's economic assumptions.

### 8.2 Scenario definition

Each scenario contains zero or more decisions and a reference to one immutable company profile and one assumption set. Multiple investments are evaluated together, in one operational and financial path.

Example comparison:

- **Baseline:** No new decisions.
- **Scenario A:** Purchase two trucks only.
- **Scenario B:** Purchase two trucks, hire two techs, and launch a marketing campaign.

Do not calculate Scenario B by summing the separate ROI of each decision. The joint operational bottleneck calculation is necessary.

### 8.3 Comparison rules

- Same initial financial and operating state.
- Same calendar/horizon and units.
- Same deterministic external growth/seasonality assumptions.
- In stochastic mode, same paired external shock draws per simulation ID.
- Each scenario may have its own **decision-specific** random effects, such as the training delay for hires unique to Scenario B.
- Report absolute levels **and** incremental differences relative to the baseline.
- Comparison calculation should be performed in the backend to avoid frontend inconsistencies.

### 8.4 Baseline identity test

An investment scenario with no decisions and no changed assumptions must match the baseline for **all 60 periods, all financial outputs, and all milestone calculations**. In Monte Carlo with paired identical scenarios, the pathwise difference must be zero up to numerical tolerance.

---

## 9. Monte Carlo engine: explicit uncertainty specification (C7)

### 9.1 Purpose

Monte Carlo quantifies the consequences of uncertainty **inside the same operational and financial engines**. It does not randomly perturb final EBITDA or equity value after calculating deterministic results.

### 9.2 Candidate risk factors

| Variable | Demo assumption/distribution | Enters model through | Correlation / timing |
|---|---|---|---|
| Annual underlying demand growth | Base 5% with stochastic annual shocks, bounded | Organic customer demand | Shared macro environment by year |
| Monthly demand variation | Modest nonnegative seasonal/local factor | Demand before capacity cap | Serial dependence preferred; not independent economic resets |
| Technician hiring delay | Discrete months, e.g. 0–3 | Cohort employment timing | Decision-specific hiring risk |
| New-tech productivity | Bounded ramp effectiveness | Productive FTE | Decision-specific; may reflect common labor conditions |
| Service ticket value | Bounded factor around $650 reference | Revenue per completed job | Shared customer-price / demand state where appropriate |
| Vehicle maintenance expense | Triangular or bounded distribution | Direct operating expense | Equipment-specific risk |
| Marketing customer-acquisition cost | Bounded positive distribution | Additional demand from spend | Campaign-specific risk |
| Exit EV / EBITDA multiple | Bounded plausible range, e.g. 4×–8× | Valuation | Correlated with macro environment; shared across scenarios |

All distribution bounds are **user-visible illustrative assumptions** until real data has been calibrated. Normal draws for quantities that must be nonnegative must be truncated or transformed; do not silently permit negative ticket prices, capacity, delays, or multiples.

### 9.3 Minimal correlated economic environment

Use a single latent annual economic factor for each path, with persistence:

\[
M_y = \rho M_{y-1} + \sqrt{1-\rho^2}\epsilon_y, \quad \epsilon_y\sim N(0,1)
\]

Then, for example, `demand_growth_y = clamp(g_base + sigma_g × M_y, lower, upper)`. The terminal macro state may also shift the exit multiple, and a monthly component may influence job demand. This creates **one common downside mechanism** rather than independently drawing demand and valuation, and protects scenario comparisons from random luck.

The precise parameters (`rho`, volatilities, bounds, multiple sensitivity) are modeling assumptions to store in the fixture and show in the UI. Do not treat the sample ranges as validated empirical distributions.

### 9.4 Path algorithm

```python
# Illustrative orchestrator. Called functions are implemented in engine modules.
def run_paired_monte_carlo(company, scenarios, number_of_runs, seed):
    all_runs = []

    for run_id in range(number_of_runs):
        macro_shocks = sample_shared_environment(
            seed=derive_seed(seed, run_id, "macro"), months=60
        )
        paired_results = {}

        for scenario in scenarios:
            # Stable decision keys ensure equivalent actions share risk draws.
            decision_risks = sample_decision_specific_risks(
                master_seed=seed,
                run_id=run_id,
                decisions=scenario.decisions,
            )
            inputs = combine(
                shared_environment=macro_shocks,
                decision_risks=decision_risks,
            )
            paired_results[scenario.id] = simulate_months(
                initial_company=deepcopy(company),
                decisions=scenario.decisions,
                stochastic_inputs=inputs,
                horizon=60,
            )

        all_runs.append(extract_pathwise_levels_and_differences(paired_results))

    return aggregate_percentiles_and_risks(all_runs)
```

**Reproducibility detail:** Avoid scenario-order dependence in random draws. Derive stable random streams from `(master_seed, run_id, risk_factor_key)` for shared risks and `(master_seed, run_id, stable_investment_key, risk_factor_key)` for decision-specific risks. Where the *same investment decision* is reused in two scenarios, give it the same `stable_investment_key` so its delays and costs receive matched shocks. Distinct investments receive distinct keys. Adding or reordering a scenario must not change baseline or equivalent-investment draws. Generate stable substream seeds using a deterministic digest (not Python's process-randomized `hash()`).

### 9.5 Calculation and aggregation

For each metric at each month, calculate `p10`, `p50`, `p90` across complete simulated paths. Also record mean where useful, with separate field names: `mean` is **not** the same as `p50`.

For each path calculate:

```text
min_cash_path = minimum month-end cash over months 1..60
breached_floor_path = min_cash_path < reserve
incremental_exit_equity_path = exit_equity_scenario - exit_equity_baseline
payback_month_path = first cumulative incremental unlevered FCF recovery month, or null
```

Then aggregate:

```text
P_cash_shortfall = count(breached_floor_path) / number_of_runs
P_negative_incremental_exit_value = count(delta_exit_equity < 0) / runs
P_payback_by_horizon = count(payback_month_path != null) / runs
```

The **minimum of the month-by-month 10th-percentile cash line is not the same as the 10th percentile of each path's minimum cash**. Report actual path-level shortfall probabilities; never infer them from the fan chart alone.

Likewise, percentile curves are computed at each month and generally do not represent one actual simulated path; label them as pointwise percentile bands.

### 9.6 Monte Carlo validity tests

- Fixed seed and input → identical results, independent of display ordering.
- All uncertainty widths set to zero → every stochastic path equals the deterministic engine path.
- Identical baseline and scenario under paired conditions → pathwise delta 0.
- Demand, ticket prices, workforce, and multiple remain inside declared feasible bounds.
- Quantiles sorted: `p10 ≤ p50 ≤ p90` for every metric and month.
- `0 ≤ reported probabilities ≤ 1`.
- Increasing reserve threshold cannot lower the same set of paths' shortfall probability.
- Revenue never exceeds feasible completed-job capacity × ticket value plus explicitly modeled other revenue.
- Financial/accounting invariants hold for sampled paths, not just the deterministic scenario.

### 9.7 Monte Carlo performance

Performance target for a development laptop: 2,000 paths × up to 3 scenarios × 60 months should run without UI blocking; benchmark actual runtime and optimize before promising a latency target. Run work in the backend; cache by normalized request hash, model version, and seed where practical. Defer large distributed computing and streaming transport unless measured performance makes it necessary.

---

## 10. Investment timeline and dashboard specification (C9)

### 10.1 Primary layout

```text
+---------------------------------------------------------------------+
| Company title | Horizon | Scenario controls | Assumptions / Run    |
+---------------------------------------------------------------------+
| Decision editor: trucks | hires | marketing | dates | financing    |
+---------------------------------------------------------------------+
| KPI cards: min cash | shortfall probability | payback | exit delta |
+---------------------------------------------------------------------+
| Metric selector: Cash | EBITDA | Revenue | Debt | Utilization | EV  |
|                                                                     |
| TIMELINE EVENT TRACK: purchases, hires, training, campaigns, exit   |
|                                                                     |
| MAIN CHART: baseline vs selected scenario, pointwise MC fan bands   |
|            liquidity threshold / selected-month cursor              |
|                                                                     |
| x-axis month 0 ------------------------------ month 60              |
+---------------------------------------------------------------------+
| Selected month inspector: operations -> P&L -> debt/cash -> value  |
+---------------------------------------------------------------------+
| Scenario comparison table | Risk detail / exit-value distribution   |
+---------------------------------------------------------------------+
| Assumptions + provenance + model limitations                        |
+---------------------------------------------------------------------+
```

### 10.2 Metric selector

Required chart modes:

1. **Ending cash balance** (monthly, USD; default chart).
2. **Monthly EBITDA** (USD per month).
3. **Monthly revenue** (USD per month).
4. **Ending debt balance** (USD).
5. **Realized utilization** (% or decimal consistently labeled).
6. **Enterprise value or equity value** (month-end modeled valuation; distinguish clearly).

The default chart overlays **baseline** and **selected scenario** deterministic lines. If MC is available, show selected scenario's `p10/p50/p90` as a fan and make baseline percentile visibility optional. Do not treat a percentile line as the deterministic base case.

### 10.3 Event layers

Three distinct marker types:

| Type | Meaning | Example | Provenance |
|---|---|---|---|
| Scheduled | Decision input | Truck purchase in month 1 | User action |
| Simulated operational | Affected by scenario/uncertainty | Tech becomes productive in month 4 | Scheduler and sampled delay |
| Calculated milestone | Derived from financial trajectories | Cash trough, payback, reserve breach | Metrics engine |

Do not label stochastic milestones with one certain date. Show median/likelihood and disclose paths where a milestone never occurs within the horizon.

### 10.4 Month inspector

For selected month show:

- Events active this month and whether scheduled, simulated, or calculated.
- Demand, productive capacity, jobs completed, realized utilization, average ticket.
- Revenue, direct costs, EBITDA, interest, taxes, depreciation.
- Growth/maintenance CapEx, change in working capital, new borrowing, principal payments.
- Ending cash, ending debt, modeled TTM EBITDA, enterprise and equity value.
- Scenario-minus-baseline differences for selected metric.
- MC p10/p50/p90 and pointwise probability of cash below reserve where applicable.

All numbers come from the same result payload; UI formatters do not alter units or math.

### 10.5 Milestone calculations

- **Cash trough:** Month containing minimum modeled end-of-month cash (label tie behavior; choose earliest).
- **Cash reserve breach:** Months with `ending_cash < floor`, not `≤` unless policy explicitly changed.
- **Cash recovery:** Optional. If displayed, define precisely (e.g., first month cash ≥ pre-investment cash) and label it separately from project payback.
- **Project payback:** First month cumulative incremental unlevered FCF ≥ 0 after full investment effects; otherwise `Not reached`.
- **Debt peak:** Maximum ending debt balance (earliest month on ties).
- **Exit event:** Month 60 valuation under selected multiple.

### 10.6 Fan-chart behavior

- Dark/main line: deterministic scenario path or clearly labeled p50, never ambiguously both.
- Shaded region: pointwise p10–p90 or p25–p75; legend specifies which.
- Liquidity floor: horizontal threshold **only on cash chart**.
- At each hovered month, tooltip reports the actual three quantiles and scenario/base values.
- If a chart lacks MC, show deterministic data and `Monte Carlo not run`, not fabricated bands.
- On a risk chart, show the distinction between pointwise cash-breach risk and horizon-wide shortfall probability.

### 10.7 Usability and accessibility

- Labels must include units and distinguish annual/TTM versus monthly figures.
- Use legends and line styles, not color alone, for scenario identity.
- Keep charts keyboard accessible where feasible and provide a tabular fallback of selected-month metrics.
- Large scenario calculations require loading indicators, cancel/retry controls if available, and error states with actionable messages.
- New decisions must **not** immediately overwrite previously computed results while a run is pending; indicate `Scenario has changed; results are stale` until recomputed.
- Any displayed scenario metric must include or link to its underlying assumptions.

---

## 11. API and schema contract (C8)

### 11.1 Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/company/demo` | Return synthetic company profile and model assumptions |
| POST | `/api/v1/simulate/deterministic` | Generate baseline + scenario monthly paths |
| POST | `/api/v1/simulate/monte-carlo` | Generate paired stochastic outputs and risk aggregation |
| GET | `/api/v1/model/metadata` | Engine version, available decision types, metric definitions |
| GET | `/api/v1/health` | Lightweight readiness check |

No real-financial-data connector or production user-account endpoint is part of MVP.

### 11.2 Shared request contract

```json
{
  "schema_version": "1.0",
  "company_id": "synthetic-hvac-001",
  "horizon_months": 60,
  "reserve_floor_usd": 150000,
  "exit_multiple": 6.0,
  "scenarios": [
    {"id": "baseline", "name": "Baseline", "decisions": []},
    {
      "id": "trucks_only",
      "name": "Buy two trucks",
      "decisions": [
        {
          "id": "truck-01",
          "type": "purchase_trucks",
          "start_month": 1,
          "quantity": 2,
          "cost_per_unit": 60000,
          "in_service_delay_months": 1,
          "funding": {
            "debt_fraction": 0.5,
            "annual_interest_rate": 0.08,
            "term_months": 48
          }
        }
      ]
    },
    {
      "id": "combined_expansion",
      "name": "Trucks + techs + marketing",
      "decisions": [
        {"id": "truck-01b", "type": "purchase_trucks", "start_month": 1, "quantity": 2, "cost_per_unit": 60000, "in_service_delay_months": 1, "funding": {"debt_fraction": 0.5, "annual_interest_rate": 0.08, "term_months": 48}},
        {"id": "hire-01", "type": "hire_technicians", "start_month": 2, "quantity": 2, "fully_loaded_annual_cost_per_person": 95000, "hiring_delay_months": 1, "ramp_months": 4, "one_time_hiring_cost_per_person": 3000},
        {"id": "marketing-01", "type": "increase_marketing", "start_month": 3, "duration_months": 12, "extra_spend_per_month": 4000, "lead_to_job_lag_months": 2, "incremental_cost_per_booked_job": 100}
      ]
    }
  ],
  "monte_carlo": {"runs": 2000, "seed": 42, "enabled": true}
}
```

A deterministic route may ignore or reject a `monte_carlo` object according to its published Pydantic contract; choose one behavior consistently. The example is the general input structure, not a claim that every endpoint accepts every field. Define explicit discriminated decision unions keyed by `type` so incompatible field combinations fail validation.

### 11.3 Canonical response shape

```json
{
  "schema_version": "1.0",
  "model_version": "mvp-1.0",
  "run_id": "run-local-001",
  "company_id": "synthetic-hvac-001",
  "horizon_months": 60,
  "currency": "USD",
  "seed": 42,
  "assumptions": {"exit_multiple": 6.0, "cash_reserve_floor": 150000},
  "scenarios": {
    "baseline": {
      "months": [
        {
          "month": 0,
          "is_opening_state": true,
          "operations": null,
          "financials": {"cash_end": 400000, "debt_end": 1200000},
          "valuation": null,
          "events": []
        },
        {
          "month": 1,
          "is_opening_state": false,
          "operations": {
            "service_demand_jobs": 540,
            "service_capacity_jobs": 720,
            "completed_jobs": 540,
            "utilization": 0.75
          },
          "financials": {
            "revenue": 416666.67,
            "ebitda": 62500,
            "cash_end": null,
            "debt_end": null
          },
          "valuation": null,
          "events": []
        }
      ],
      "metrics": {
        "minimum_cash": null,
        "payback_month": null,
        "exit_equity_value": null
      }
    }
  },
  "comparisons": {},
  "monte_carlo": null,
  "warnings": []
}
```

**Important:** The numeric month-1 example above illustrates *field placement*, not a fully computed forecast. `null` placeholders must be replaced by actual engine-computed numbers for relevant fields in real responses. Production response arrays must contain **month 0 through month 60**. For month 0, `valuation` may be calculated from history if enough historical data exists; either choice must be consistent and documented. Historical TTM context must be available internally even when not repeated in the response.

Use a contract with **explicit nullable types for unavailable results** and a distinct `not_reached`/`not_applicable` reason where needed. The frontend must not interpret `null` as `$0`.

### 11.4 Required Monte Carlo response fields

```text
monte_carlo
  runs, seed, distribution_parameters, model_version
  scenarios[scenario_id]
    monthly_percentiles[metric_key][month]
      p10, p50, p90, mean
    path_risks
      probability_cash_below_reserve_any_month
      probability_negative_exit_equity_delta
      probability_payback_by_month_60
    terminal_distributions
      exit_equity_value: p10, p50, p90, mean
      incremental_exit_equity_value: p10, p50, p90, mean
    payback
      probability_within_horizon
      median_month_conditional_on_payback_or_null
      not_reached_count
  comparisons[scenario_id]
    paired_monthly_delta_percentiles
    paired_terminal_delta_percentiles
```

The complete API schemas must be generated from backend types or checked into `/contracts` and mirrored in frontend TypeScript types. Schema and API tests must catch divergent names/units.

### 11.5 Validation and failure modes

- Reject quantity < 0, nonfinite numbers, invalid type-specific fields, duplicate scenario/decision IDs within the same scenario, and event start months outside 1–60.
- Reject cash reserve < 0, exit multiple ≤ 0, loan term ≤ 0, financing fraction outside `[0,1]`, and nonpositive customer-acquisition cost.
- Cap or reject unreasonable run counts and malformed distributions to protect memory and compute.
- Validate that per-company opening balance and historical data can be reconciled.
- Return structured 4xx errors for invalid user inputs; return 5xx with internal logging for engine failures.
- Include model version and reproducibility seed on every result.
- Never return a `success` response with known accounting invariant failures.

---

## 12. AI explanation layer (C10, optional)

### 12.1 Allowed behavior

- Summarize **computed** scenario differences (e.g., more demand but no capacity; labor cost arrives before productive revenue).
- Identify assumptions with high modeled sensitivity, supported by available results.
- Explain terms such as EBITDA, working capital, payback, enterprise value, and probability of cash shortfall.
- Clearly qualify forecasts as hypothetical and assumption-dependent.

### 12.2 Prohibited behavior

- Inventing financial results not in the engine payload.
- Generating synthetic input assumptions while labeling them historical facts.
- Replacing the model's calculations with language-model arithmetic.
- Recommending irreversible financial transactions or claiming regulatory-grade compliance.

### 12.3 Integration contract

Pass a compact, structured subset of the validated scenario output, metric definitions, and flagged assumptions into the explanation generator. Prefer deterministic rule-based explanations for MVP. If an LLM is added, validate any numbers it quotes against structured source values or avoid numeric restatement altogether.

---

## 13. Model risk, realism boundaries, and safety

### 13.1 What the model does not claim

- An estimate of true HVAC industry average costs or margins.
- A calibrated probability of failure, default, insolvency, or actual exit proceeds.
- Tax advice, audit-ready financial statements, or a credit underwriting model.
- A full business valuation in the presence of negative EBITDA, unusual transactions, or other claims.
- Daily liquidity adequacy or intramonth covenant compliance from month-end simulations.
- Automatic detection of fraud, industry seasonality, and operational constraints not explicitly represented.

### 13.2 Risk controls

- Prominent `Synthetic demo data` designation in the UI.
- Assumptions drawer with provenance, distributions, and model version.
- Tooltips clarifying median vs mean, monthly EBITDA vs TTM EBITDA, EV vs equity value, and project payback vs sponsor return.
- Warnings for infeasible cash, overcapacity, missing input data, and negative EBITDA multiple applicability.
- No credentials, bank connections, or third-party account data required for demo.
- FastAPI CORS restricted to known local frontend origin in development; do not expose sensitive application secrets to frontend bundles.
- Save only deliberately selected synthetic scenarios by default. Real-client data storage requires a separate security/privacy design.

### 13.3 Explicit future model expansions

Real company imports; segmented HVAC installation/service revenue; invoice aging; parts inventory; seasonality calibration; maintenance contracts; pricing elasticity; technician churn; fleet reliability; revolving credit; covenants; acquisition consolidation; capital budgeting optimization; leveraged equity returns; multi-branch and cross-industry setups. These should be separate versions or modules, not hidden assumptions in the MVP.

---

## 14. Testing, acceptance criteria, and QA responsibilities (C11)

### 14.1 Unit tests: operations

| ID | Setup | Expected result |
|---|---|---|
| OP-01 | Extra truck, no extra technician and no binding vehicle bottleneck | No capacity gain from the unused truck |
| OP-02 | Extra technician, no spare vehicle | No effective capacity gain under 1:1 pairing |
| OP-03 | Extra marketing, service capacity already fully used | Demand rises; completed jobs capped |
| OP-04 | Extra capacity, unchanged demand below capacity | Completed jobs and service revenue do not automatically rise |
| OP-05 | Truck + technician + sufficient incremental demand | Completed jobs may rise after availability/ramp, within capacity |
| OP-06 | Demand = 540, capacity = 720 | Utilization = 0.75, completed jobs = 540 |
| OP-07 | Zero capacity | Completed jobs = 0 and utilization defined as 0 |

### 14.2 Unit tests: accounting and valuation

| ID | Setup | Expected result |
|---|---|---|
| FIN-01 | Synthetic year-zero fixture | Revenue $5m; COGS $2.75m; overhead $1.5m; EBITDA $750k |
| FIN-02 | $60k truck purchase in cash | CapEx/cash affected; EBITDA not reduced by $60k |
| FIN-03 | Fully financed truck | Asset/CapEx and debt disbursement booked; no false revenue |
| FIN-04 | Debt principal payment | Debt/cash fall; EBITDA and EBIT unaffected by principal |
| FIN-05 | Interest expense | EBIT unchanged; pretax profit and cash decrease |
| FIN-06 | Higher AR under same EBITDA | Cash is lower due to positive DeltaNWC |
| FIN-07 | Full cash and debt roll-forward | Reconciles each month within numerical tolerance |
| FIN-08 | Exit EV | `TTM EBITDA × multiple`, using trailing months correctly |
| FIN-09 | Exit equity | EV minus debt plus cash; no double count |
| FIN-10 | Debt proceeds in investment | Do not cause instant project payback from borrowing |
| FIN-11 | Negative TTM EBITDA | Appropriate warning / no invalid default positive-multiple valuation |

### 14.3 Unit tests: timing and scenario behavior

| ID | Setup | Expected result |
|---|---|---|
| TIME-01 | Truck decision in month 1 | Purchase cash event occurs exactly once |
| TIME-02 | Truck activation delay = 1 | Vehicle capacity begins only in defined service month |
| TIME-03 | Tech hiring delay + ramp | Payroll/productivity follow defined, tested timing |
| TIME-04 | Campaign lag = 2 months | No incremental booked demand before lag expires |
| SCN-01 | Empty decisions | Baseline identity at every month |
| SCN-02 | Combining decisions | Evaluated together through constraints, not summed uplifts |
| SCN-03 | Run scenarios in different orders | Same deterministic results |
| SCN-04 | Mutate Scenario A's controls | Baseline and Scenario B inputs unchanged |

### 14.4 Unit tests: Monte Carlo

| ID | Setup | Expected result |
|---|---|---|
| MC-01 | Same seed/config/version | Repeatable aggregate outputs |
| MC-02 | All stochastic spreads zero | MC paths equal deterministic path |
| MC-03 | Identical scenario and baseline | Paired metric differences are zero |
| MC-04 | Thousands of paths | Every displayed probability in [0,1] |
| MC-05 | Any percentile series | p10 ≤ p50 ≤ p90 |
| MC-06 | Increase cash reserve under same saved paths | Shortfall probability cannot decrease |
| MC-07 | Add/reorder unrelated scenario | Shared baseline shock sequence unchanged |
| MC-08 | Count full-horizon breaches | Probability calculated from paths, not percentile bands |

### 14.5 UI/integration tests

- Choose a scenario and run: timeline displays 61 indexed month states (`0..60`), with month 0 identified as an opening state.
- A truck purchase adds an event marker in its scheduled month and changes CapEx/cash/debt according to funding.
- Switch cash to EBITDA: axis units and risk-floor indicator update correctly.
- Hover/select a month: inspector agrees with API values (no independent arithmetic).
- Run Monte Carlo: p10/p50/p90 fan appears with explicit labels; without MC it does not appear.
- Month-60 exit value matches backend summary and displayed valuation assumptions.
- Liquidity floor violation uses `< floor`, and pathwise risk matches backend output.
- Payback not reached: show `Not reached within 60 months`, not zero or month 60 by default.
- Modify a decision after simulation: show stale-results status before rerunning.
- Invalid input produces readable validation error; nonfinite outputs never render as currency.
- API schema changes fail contract tests before frontend merge.

### 14.6 Quality gates before demo

**Gate A: Data and contracts**  
Historical fixture reconciles; contracts and TypeScript types match; startup with a clean environment works.

**Gate B: Engine integrity**  
Financial identities and bottleneck tests pass; two investment strategies produce distinguishable, explainable outcomes.

**Gate C: Risk integrity**  
Monte Carlo tests pass; pathwise risks, pointwise percentiles, and paired scenario differences have correct semantics.

**Gate D: UI integrity**  
Timeline events, metric axes, month inspectors, assumptions, and warning states match the backend payload.

**Gate E: Demonstration readiness**  
A first-time reviewer can reproduce a baseline, truck-only investment, and coordinated expansion and explain why the outcomes differ without relying on unsupported claims.

---

## 15. Multi-agent work allocation and integration protocol

### 15.1 Agent responsibilities

| Agent | Ownership | Deliverables | Depends on |
|---|---|---|---|
| A: Contracts/Data | Schemas, fixture, assumption manifest | `/contracts`, `/data`, `backend/app/schemas.py` | This specification |
| B: Event/Operations | Timed decisions, demand and capacity | `event_scheduler.py`, `operations.py`, operations tests | Agent A contracts |
| C: Financial/Valuation | Monthly P&L, financing, working capital, valuation | `financials.py`, `valuation.py`, accounting tests | A + B interfaces |
| D: Scenario/Monte Carlo | Paired runner, samples, aggregation | `scenarios.py`, `monte_carlo.py`, `aggregation.py`, MC tests | A + B + C functions |
| E: API/Integration | Route validation, serialization, metadata | FastAPI routes, integration tests, sample responses | A + C + D contracts |
| F: Frontend/UI | Decision editor, timeline, KPI and risk views | React components, typed client, UI tests | Agent A schemas + sample payload |
| G: QA/Review | Cross-component tests, mathematical review, final demo checklist | Test suite, discrepancy log, limitations | All agents |

**If fewer agents are available:** combine A+E, B+C, and D+G; keep frontend independent. **If more agents are available:** split chart/timeline UI from decision editor and visual QA, but retain one schema owner.

### 15.2 Concurrency rules

1. Agent A freezes schema v1.0 and commits a valid fixture and **complete** example API response.
2. Agent B and Agent F begin in parallel against frozen contracts.
3. Agent C uses Agent B's operational outputs, never copies operational formulas.
4. Agent D calls the deterministic engine as its inner loop, never rewrites its accounting.
5. Agent E connects functional backend to the frontend contract.
6. Agent G independently reruns balance/reconciliation and boundary tests.
7. When a shared contract must change, Agent A increments the contract revision and communicates the migration. No silent renames.

### 15.3 Required handoff format for every agent

Include:

- **Files changed** and public function/API signatures.
- **Assumptions added** and whether they change interpretation of outputs.
- **Tests run**, commands, pass/fail status.
- **Known limitations** and unresolved issues.
- **Example input and output** demonstrating the delivered module.
- **Contract-breaking changes**, if any, clearly identified.

### 15.4 Merge discipline

- No module can add undocumented financial adjustments to make demo results appear attractive.
- No unvalidated UI-only mock numerical forecasts after API integration.
- Test fixtures and actual numeric expectations belong in version control.
- A forecast function must be callable without HTTP or a frontend.
- Every scenario run records a model version, input fingerprint, and random seed (if stochastic).
- Resolve disagreements by accounting invariants and published contract definitions, not screenshots.

---

## 16. End-to-end implementation workflow

### Phase 1: Contracts and baseline fixture

**Build:** Canonical schemas, 12-month synthetic historical company, assumptions manifest, normalized example responses.  
**Exit criteria:** Annual totals reconcile to the fixture; month-0 cash/debt are stable; API/model units and time conventions are fixed.

### Phase 2: Event scheduler and operational engine

**Build:** Timed purchases, hiring cohorts, training ramp, marketing lag, demand/capacity/job throughput.  
**Exit criteria:** Bottleneck and timing tests pass; combination effects differ correctly from simple sums.

### Phase 3: Deterministic accounting and valuation

**Build:** Monthly revenue/expenses, EBITDA, CapEx, depreciation, tax, debt, NWC, cash, TTM EBITDA, equity value, incremental unlevered FCF, payback.  
**Exit criteria:** All financial invariants pass for 60 months; no decisions equals baseline; output is complete and typed.

### Phase 4: Scenario orchestration

**Build:** Shared baseline and alternative scenario comparisons; backend deltas, relevant milestones.  
**Exit criteria:** Baseline, truck-only, and coordinated expansion run under identical assumptions and produce explainable differences.

### Phase 5: Monte Carlo

**Build:** Seeded correlated macro environment, scenario-specific uncertainty, 2,000–5,000 paired paths, per-month percentiles, shortfall/payback/exit risks.  
**Exit criteria:** MC tests pass, uncertainty-zero identity works, runtime is measured, probabilities are path-derived.

### Phase 6: API and interactive timeline

**Build:** FastAPI endpoints, typed React client, decision editor, event track, multi-metric timeline, bands, risk cards, month inspector, warnings.  
**Exit criteria:** UI and API values match, all controls function, no real financial data required, invalid states are handled.

### Phase 7: Optional explanation layer and final verification

**Build:** Rule-based or restricted LLM explanation using validated payloads; complete QA, README, demonstration script.  
**Exit criteria:** Nothing important depends on AI-generated forecasts; test suite passes; disclaimers and assumptions remain visible.

### Suggested user demo sequence

1. Open synthetic $5m-revenue HVAC company.
2. Show baseline cash and EBITDA over 60 months.
3. Buy two trucks: observe immediate investment cash/financing and constrained impact if staff/demand remain bottlenecks.
4. Add two hires: observe delays, ramp and operating expense changes.
5. Add marketing: observe demand and capacity interaction, potentially greater completed jobs and cash recovery.
6. Switch cash → EBITDA → utilization → modeled equity value on the **same** timeline.
7. Run Monte Carlo: show p10–p90 bands and the separate horizon-wide liquidity breach probability.
8. Compare month-60 incremental exit equity value, assumptions, and documented limitations.

**Important:** Whether the combined scenario creates positive value must emerge from assumptions and calculations. Do not hardcode a favorable outcome for the demo.

---

## 17. Outstanding gaps, resolved decisions, and future backlog

This section exists so independent agents understand what earlier planning left uncertain, what has been resolved, and what should **not** become scope creep.

| Earlier gap | MVP resolution | Remaining limitation / follow-up |
|---|---|---|
| Independent financial calculations | Single C3→C4→C5 engine | Full multi-entity consolidation deferred |
| Operational cause and effect | `min(demand, tech capacity, vehicle capacity)` | Skills, parts, dispatch routing deferred |
| Timeline disconnected from engine | Scheduler events and computed milestones in monthly results | Stochastic event-date visualization can be expanded |
| Monte Carlo independent variables | Correlated shared macro driver, paired scenarios, seeded draws | Historical calibration and richer covariance deferred |
| EBITDA treated like cash | Working capital, taxes, interest, CapEx, principal, cash roll-forward | More detailed accounting policy later |
| Valuation versus return | EV, exit equity, project unlevered FCF/payback separated | Sponsor IRR/MOIC and full LBO deferred |
| Scenario comparison inconsistency | Immutable shared company state + baseline and paired shocks | Portfolio optimization deferred |
| Unknown data sources | One validated synthetic company, provenance on every input | Real imports later |
| Lack of model tests | Named invariants and operations/finance/MC acceptance suite | Audit-grade validation later |
| Ambiguous timeline milestones | Scheduled/simulated/calculated event types and payback definition | Intramonth event timing deferred |
| Ambiguous marketing effectiveness | Explicit acquisition-cost assumption and lag | Attribution, channel saturation, LTV deferred |
| HVAC versus general service market | HVAC-specific fixture on reusable decision/data contracts | Domain templates for other industries later |

### 17.1 Assumptions that can be tuned without redesign

- Organic demand growth, economic volatility, seasonality factors.
- Tech productivity ramp, time-to-hire, loaded labor cost.
- Truck cost, service-delay, financing fraction, interest rate, depreciation life.
- Monthly marketing spend, lead lag, acquisition cost, bounded effectiveness.
- Service ticket, variable-cost margin, overhead inflation, maintenance CapEx.
- Working-capital delay factors, tax rate, liquidity floor, exit multiple.

### 17.2 Choices that must stay stable during initial build

- Timeline semantics (`0` opening state, `1..60` monthly forecast).
- The single operational→financial→valuation dependency direction.
- Separate revenue/EBITDA/cash/debt/value metrics.
- Shared company state and matched stochastic macro conditions.
- No user-visible unlabeled or invented financial data.
- Explicit nullability for unavailable results and no conflation of `0` with `not reached`.

---

## 18. Final agent readiness checklist

### Architecture

- [ ] Contracts freeze decision types, units, month convention, risk outputs, and response shape.
- [ ] All model code produces results without UI and without an LLM.
- [ ] Backend is the only authority for metrics.
- [ ] Baseline and all scenarios clone the same opening state.

### Financial modeling

- [ ] Historical synthetic data reconciles to $5m revenue and $750k EBITDA.
- [ ] Labor, vehicle costs, marketing and depreciation are not double counted.
- [ ] Cash, debt, and operating flows reconcile monthly.
- [ ] Working capital separates revenue recognition from cash collection.
- [ ] Payback uses incremental unlevered FCF, not borrowed proceeds.
- [ ] Exit valuation uses TTM EBITDA; equity subtracts debt and adds cash.

### Operations and uncertainty

- [ ] Capacity depends on technicians and vehicles, and revenue depends on demand.
- [ ] Delays and productivity ramp have tested month semantics.
- [ ] Marketing adds potential demand only after lag.
- [ ] Paired Monte Carlo uses stable shared shocks.
- [ ] Quantiles are pointwise; risks are calculated from full paths.
- [ ] Negative cash is flagged, not hidden.

### UI and delivery

- [ ] Timeline overlays baseline/scenario, event markers, and MC bands.
- [ ] Metric axes use correct units; cash reserve line appears only on cash chart.
- [ ] User can trace a decision to operational and financial effects at selected month.
- [ ] Pending/stale/failed states are explicit.
- [ ] Assumptions, provenance, and limitations are visible.
- [ ] Demo uses only synthetic data and reports modeled outcomes responsibly.

---

## Appendix A. Authoritative formula inventory

```text
Initial reconciliation:
  annual_service_revenue = service_jobs_per_month × 12 × average_ticket
  annual_total_revenue = annual_service_revenue + annual_other_revenue
  annual_EBITDA = annual_total_revenue - annual_COGS - annual_overhead

Monthly operations:
  tech_capacity = productive_tech_equivalents × work_days × jobs_per_tech_day
  vehicle_capacity = available_vehicles × work_days × jobs_per_vehicle_day
  capacity = min(tech_capacity, vehicle_capacity)
  completed_jobs = min(nonnegative_demand, capacity)
  utilization = completed_jobs / capacity, or 0 if capacity = 0
  service_revenue = completed_jobs × ticket
  total_revenue = service_revenue + other_revenue

Monthly financials:
  gross_profit = total_revenue - COGS
  EBITDA = gross_profit - operating_overhead
  EBIT = EBITDA - depreciation - amortization
  pretax_income = EBIT - interest
  tax = max(0, taxable_income) × tax_rate
  NWC = AR + inventory - AP
  DeltaNWC = NWC_end - NWC_begin
  OCF = EBITDA - cash_interest - cash_tax - DeltaNWC
  ending_debt = beginning_debt + borrowing - principal
  ending_cash = beginning_cash + OCF - CapEx + borrowing - principal - distributions

Valuation:
  TTM_EBITDA = sum(last 12 monthly EBITDAs, with history as needed)
  enterprise_value = TTM_EBITDA × enterprise_multiple
  equity_value = enterprise_value - ending_debt + ending_cash

Project investment comparison:
  unlevered_tax = max(0, EBIT) × tax_rate
  UFCF = EBIT - unlevered_tax + D&A - DeltaNWC - CapEx
  incremental_UFCF = UFCF_scenario - UFCF_baseline
  cumulative_incremental_UFCF = sum(incremental_UFCF from month 1 through t)
  payback = first t with cumulative_incremental_UFCF >= 0 after investment,
            otherwise null/not reached

Stochastic results:
  monthly_quantiles = p10/p50/p90 over modeled paths for each month
  P(any shortfall) = mean( min_t(end_cash_path,t) < cash_floor )
  P(negative exit delta) = mean(exit_equity_scenario - exit_equity_baseline < 0)
  P(payback by month 60) = mean(payback_month is not null)
```

**Special payback guard:** A cumulative incremental UFCF series can equal zero *before* any investment occurs. Do not report `month 0` or a pre-investment month as payback. Only evaluate after first meaningful capital/operating investment outlay; when there is no incremental investment, report `not_applicable` rather than immediate payback. If cumulative FCF crosses zero multiple times, report the first crossing and separately disclose any subsequent reversal if the UI claims durable payback.

## Appendix B. Common implementation mistakes to prevent

1. Multiplying service jobs by a utilization factor twice.
2. Treating a truck purchase as an EBITDA expense.
3. Treating debt proceeds as operating revenue or project payback.
4. Subtracting loan interest twice from operating cash.
5. Booking new technician payroll only after reaching full productivity.
6. Adding scenario EBITDA uplifts instead of recomputing constrained operations.
7. Sampling baseline and investments under different macro paths.
8. Interpreting a monthly p10 cash level as the probability of **ever** crossing a reserve floor.
9. Treating pointwise percentile trajectories as literal representative company paths.
10. Treating a fixed-year EBITDA multiple as a proven transaction valuation.
11. Mixing annual overhead, monthly direct labor, and per-truck costs without unit conversion.
12. Using uncalibrated risk distributions while presenting probability estimates as empirically validated.
13. Using `null` for a zero-valued valid financial result, or `$0` for an unavailable value.
14. Hiding negative cash by automatically adding unexplained borrowing.
15. Recomputing KPIs in React or letting an LLM generate financial figures.

## Appendix C. Source and accuracy note

This specification consolidates the product decisions and conceptual technical model from the planning conversation. It is an **implementation design**, not a verified external market-research report. The synthetic financial values and stochastic examples are test data. Any future production use requires financial-model review, calibration with actual company records, security/privacy assessment, and domain-specific validation before users rely on forecasts for material investment decisions.
