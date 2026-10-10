# Person 1 kickoff and integration checkpoint

Status: **Checkpoint 1 accepted October 10, 2026** against dependency `5725edf1e8e979c9c9bcb3b0673acb308a96385f`, interface `checkpoint-1-candidate-1`. See [the current integration record](IMPLEMENTATION_PLAN.md#person-1-kickoff-status) for independent verification and next work. No financial engine or release gate is accepted yet.

The sections below preserve the original kickoff proposals and pending-state record for history; they are superseded by the accepted issue #2 decisions, `docs/assumptions.md`, `docs/STACK_DECISION.md` and the authoritative TypeScript/Zod contracts at the dependency commit. In particular: maintenance depreciation starts in the spend month; scheduler asset additions are growth-only; financials creates maintenance assets; scheduler takes a sixth market-factor argument; implementation uses TypeScript, not Python/Pydantic. All original pending labels below refer to kickoff, not current status.

Authority: `OperatorOS_Implementation_Spec.md`, `IMPLEMENTATION_PLAN.md`, and the three role guides. Current `contracts/contracts.ts` is a review baseline. Python runtime schemas, company fixture, and internal event/state contracts are not present at kickoff.

## Financial policy proposal for the shared checkpoint

The following are Person 1's proposed MVP decisions, awaiting review by Persons 2 and 3. They are not fixture defaults or permission to silently implement missing inputs.

| Policy | Proposed decision | Review needed |
|---|---|---|
| Accounting scope | Reconciled P&L/cash/debt schedule; no full GAAP balance sheet claim | Person 2 labels fixture scope |
| Taxes | Positive pretax income times tax rate; no loss carryforwards, credits or deferred taxes | Person 3 validates explicit inputs |
| Existing debt | Level principal; beginning-balance interest; fixture supplies remaining term, monthly principal and first repayment month | Person 2 supplies reconciled tranche inputs |
| New truck debt | Disburse at purchase; first interest and principal in the following month; beginning balance excludes current-month disbursement | Person 2 schedules purchase/borrowing; Person 3 represents repayment timing |
| Recruitment/payroll | Recruitment charged at decision start; full payroll from employment, including ramp months | Person 2 confirms zero-delay timing and cohort costs |
| Working capital | Fractional revenue-to-AR and eligible-cost-to-AP; constant inventory; opening balances use the same reference run rate | Person 2 supplies factors and balances; agree eligible categories explicitly |
| Growth reference | Month 1 has growth exponent zero; monthly factor `(1 + annual_rate) ** (1 / 12)`; seasonality still follows calendar month | Person 2 confirms demand, ticket and cost drivers |
| Marketing tail | Each spending month yields demand exactly its lag later, including after spend ends; no permanent customer compounding | Person 2 confirms campaign events |
| Other revenue/cost | Separate disclosed growth inputs; no automatic truck uplift | Person 2 supplies separate streams |
| Existing assets | Existing asset schedules must reconcile to annual reference depreciation; never add baseline depreciation twice | Person 2 supplies asset bases/lives; Person 3 validates representation |
| Maintenance assets | Separate maintenance CapEx cash flow; propose 60-month straight-line life beginning next month | Requires explicit shared representation; current contract has no maintenance asset policy field |
| Truck depreciation | 60-month straight line starting in service; cap cumulative depreciation at asset cost | Person 2 supplies service transition; Person 3 confirms asset state |
| Distributions | Zero for MVP | Person 3 makes scope explicit |
| Valuation | Actual rolling 12-month EBITDA; nonpositive totals yield null EV/equity with status | Shared contract already specifies status |
| Payback | First meaningful incremental investment gates eligibility; propose USD 1e-6 tolerance; record first recovery and later reversal | Agree explicit investment-outlay signal with Persons 2/3 |
| Numerical checks | No display rounding in calculations; compare USD identities with absolute tolerance 1e-6 and relative tolerance 1e-12 | All owners use same test convention |

## Requests for Person 3: runtime and internal interfaces

Implement the shared Pydantic vocabulary and runnable pytest environment. Resolve these internal contract gaps with both engine owners before independent implementation:

- An engine state containing financial balances, debt and asset schedules, technician cohorts and vehicle service state. `FinancialState` alone cannot persist operational cohorts.
- `MonthEvents` containing month, purchases, disbursements/funding, employment/cohort costs, full payroll, productive FTE ramps, recruitment charges, in-service transitions, campaign spending and lagged demand inputs.
- Explicit neutral market factors/path risks for deterministic execution and resolved stochastic inputs later. Financial cost inflation must reach accounting without inferring randomness or copying operations formulas.
- A defined method to return ending debt/asset state from `calculate_financials`: current `FinancialResult` contains flows and balances but not complete updated schedules. Agree on a result wrapper or separate state transition; do not mutate prior state.
- Explicit maintenance depreciation policy and first-investment outlay signal for comparison/payback.
- Canonical fingerprint serialization, numeric representation and ordering rules shared with the runner.

Preserve documented public signatures unless a coordinated revision is agreed. Person 3 owns changes to schemas/generated contracts; Person 1 approves integration, Person 2 reviews operational impacts.

## Requests for Person 2: fixture and first real month

- Supply 12 ordered historical records reconciling to revenue 5,000,000; COGS 2,750,000; overhead 1,500,000; EBITDA 750,000.
- Supply opening cash 400,000 and debt 1,200,000 with explicit debt and asset schedules, AR/inventory/AP policy and provenance.
- Record resolved policy values in `docs/assumptions.md`, distinguishing synthetic illustrative inputs from derived values.
- Supply real `MonthEvents` and `OperationsResult` for a reference month; include a truck purchase and hiring/campaign timing examples separately.
- Confirm demand 540, capacity 720, jobs 540, utilization 0.75 in the neutral reference case.

## Person 1 preparation and build sequence

1. Use `backend/tests/financial_acceptance_cases.json` as independently calculated targets. These are arithmetic test cases, not the company fixture or API forecasts.
2. After the shared checkpoint, implement accounting with pure state transitions and per-month invariants, then valuation using historical TTM windows.
3. Reconcile one real month with Person 2 before extending to the 60-month scenario runner.
4. Add comparisons, investment-gated payback/reversal, earliest-tie cash/debt milestones and reserve breaches.
5. Generate the complete reference response from the tested engine. Approve Gates A/B only after fixture, contracts, deterministic tests and reproducible setup pass.
6. Review Person 2's paired Monte Carlo and Person 3's API/UI integration; lead final Gate E.

## Checkpoint acceptance record

- Person 1 financial policy review: proposed above; shared approval pending.
- Person 2 operational/fixture review: pending.
- Person 3 runtime/internal contract review: pending.
- Accepted dependency commit/revision: not yet assigned.
- One reconciled real month: not run.
- Gates A/B/C/D/E: not passed.

Every handoff must include commit/branch, files/signatures, dependency revision, policies, exact test commands/results, example input/output, limitations and breaking changes.
