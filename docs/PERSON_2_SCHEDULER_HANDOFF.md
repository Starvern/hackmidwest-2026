# Person 2 scheduler handoff

Dependency: accepted `5725edf`, interface `checkpoint-1-candidate-1`, acceptance
record `3e7717e`. Local branch: `will`. No contract-breaking changes or new policies.

## Delivered

- `src/lib/server/engine/fixtures.ts`: `parse_company(input: unknown): CompanyInput`
  validates loaded JSON; `create_initial_state(company): EngineState` copies the
  opening balances and initializes baseline workforce/fleet cohorts at month 0.
- `src/lib/server/engine/event_scheduler.ts`: `schedule_month` implements the
  accepted six-argument `ScheduleMonth` function type from `contracts/engine.ts`.
- `tests/event_timing.test.ts`: independent scheduler assertions for TIME-01–04,
  zero delays/ramp, out-of-horizon dates, cost factors, no-effect actions,
  sequential steps, collision rejection, input immutability and decision-order identity.
- `src/lib/server/engine/operations.ts`: accepted `CalculateOperations` signature;
  computes demand, constrained jobs, utilization and ticket, without accounting.
- `tests/operations.test.ts`: OP-01–07, zero resource capacity, fractional FTE,
  seasonality/calendar growth, invalid step/demand/factors and input immutability.
- `scripts/example_month_one.ts` generates `data/example-month-1.json` from the
  actual baseline scheduler/operations, including all inputs needed for integration.

The scheduler validates inputs with authoritative Zod schemas and contextual risk
validation, copies prior operational state and returns validated MonthEvents.
Truck purchases produce growth CapEx, growth asset additions and new debt tranches
in the purchase month. Truck depreciation/loan repayments remain financial-engine
responsibilities. Financials exclusively creates maintenance assets.

Recruitment occurs once at decision start; full new-hire payroll begins in employment
month, with ramp controlling productive FTE only. Campaign spend creates demand due
exactly after the lag, including post-spend tails; due demand is consumed once. A
`campaign_end` event marks the first month with no further spend. Costs apply the
approved calendar inflation and explicit market multipliers once. Scenario decisions
are processed in stable ID order without changing caller ordering.

Example baseline month 1: employed technicians 12, productive FTE 12, active vehicles
12, payroll $95,000, vehicle opex $15,000, fixed overhead $125,000, maintenance CapEx
$100,000 / 12, incremental investment outlay 0, no decision events. These are actual
scheduler outputs asserted in tests, not a financial forecast. For two $60,000 trucks
bought month 1 at 50% debt funding and one-month service delay: growth CapEx $120,000,
new debt $60,000, first debt repayment month 2, active vehicles 12 in month 1 and 14
in month 2. No vehicle costs for the purchased trucks before service.

## Verification and remaining work

`npm test` passes artifact drift checks, strict contract TypeScript checks and all
27 tests (10 scheduler tests, 6 operations tests and 11 existing contract/API tests).
`npm run check` reports zero errors/warnings. Run `node scripts/example_month_one.ts`
to reproduce the month-1 handoff: demand 540, capacity 720, completed jobs 540,
utilization 0.75, unserved jobs 0, ticket $650.

Operations and the real month-1 OperationsResult are implemented. Financial integration
with Person 1 is next. The scheduler-only test harness advances operational state
with unchanged financial balances and is explicitly not a scenario/financial runner.
The integration runner must combine scheduler ending operational state with financials'
ending financial state, pass the same monthly factors to scheduler/operations and keep
the same validated company/scenario/path-risk realization across sequential steps.
The scheduler checks month continuity; it does not implement scenario-switch detection
or Monte Carlo sampling. No accounting, valuation, complete forecast, Gate A/B freeze,
MC or dashboard completion is claimed.
