# OperatorOS repository assessment and implementation plan

Source of truth: [OperatorOS specification v1.0](OperatorOS_Implementation_Spec.md), read in full before this assessment. The requested `docs/IMPLEMENTATION_SPEC.md` does not exist; the existing specification has not been renamed or modified.

## Repository assessment

The starting checkout is clean and contains only a SvelteKit welcome page, layout, favicon, Tailwind stylesheet, TypeScript/Vite configuration, npm manifest/lockfile, starter README, static robots file, and the specification. No repository AGENTS.md was found. No OperatorOS calculations or product features exist to validate or preserve.

| Component / requirement | Existing implementation | Missing / dependency |
|---|---|---|
| C1 inputs and data | None | Validated company, 12 historical records, provenance, assumptions, fixture reconciliation |
| C2 scheduler | None | Decision unions, cohorts, stable events, timing and payroll/ramp tests |
| C3 operations | None | Demand, technician and vehicle bottlenecks, completed jobs, utilization |
| C4 financials | None | Monthly P&L, asset/debt schedules, working capital, taxes, cash roll-forward |
| C5 valuation and metrics | None | Historical TTM bridge, EV/equity, incremental UFCF/payback, liquidity milestones |
| C6 scenario runner | None | Immutable opening state, baseline and two alternatives, backend deltas |
| C7 uncertainty | None | Shared seeded macro paths, decision substreams, paired aggregation, benchmark |
| C8 API | None | Python/FastAPI validation, versioned schemas, five specified endpoints |
| C9 frontend | SvelteKit welcome screen | React/TypeScript/Recharts stack and all MVP interactions |
| C10 explanation | None | Optional; consumes validated results only, after core delivery |
| C11 QA | No test scripts or suites | pytest, contract checks, Vitest, integration and acceptance coverage |
| Delivery docs | Generic Svelte README | Setup, assumptions, limitations, repeatable demo and test commands |

Existing npm dependencies are SvelteKit/Svelte, Vite, Tailwind, TypeScript and svelte-check. React, Recharts, Vitest and backend dependency/configuration files are absent. Node/npm and a Python command are discoverable; Python reports a location warning and pytest is not installed. Dependency availability and clean installation must be verified during backend setup; discovery is not a passing environment check.

## Inconsistencies and decisions

1. **Frontend stack:** specification §0.5 selects React + TypeScript + Recharts. Migrate the starter in the UI phase; retaining Svelte would be a proposed deviation requiring an explicit specification decision. No migration is performed in this planning change.
2. **Specification path:** link to the existing document instead of creating competing copies. The proposed repository layout in §2.3 is advisory; the dependency direction and interfaces are mandatory.
3. **Illustrative response:** §11.3 is incomplete and contains null forecast placeholders. It is not a usable fixture or computed example. Generate a full 61-record response only after the deterministic engine reconciles; do not fabricate numbers to unblock UI work.
4. **Investment identity:** the example uses different truck decision IDs across scenarios, while §9.4 requires a shared stable investment key for matched risk. The contract adds an explicit `stable_investment_key`; identical reused actions must have identical keys and parameters. Distinct actions use different keys.
5. **Contracts are established, not yet frozen:** `contracts/contracts.ts` and `contracts/README.md` define the initial cross-module vocabulary. Gate A still requires backend runtime validation, generated JSON schemas, a reconciled fixture and a complete engine-produced example. Do not start independent module implementation against an alleged completed schema freeze.

## Financial policy register to close in phase 1

The following are disclosed implementation choices allowed by the specification, not additional financial formulas. Store approved values in the fixture/assumptions manifest and test their effects. Never silently use example values as calibrated facts.

| Policy | Proposed MVP interpretation / remaining input |
|---|---|
| Accounting scope | Reconciled P&L/cash/debt schedule; no claim of full GAAP balance sheet equality |
| Existing debt | Level principal, beginning-balance interest; remaining term and first repayment month still need fixture values |
| New truck borrowing | Level principal, interest on beginning balance; explicitly decide first interest/principal month and same-month disbursement treatment before implementing |
| Working capital | Fractional revenue-to-AR and eligible-cost-to-AP factors; explicitly enumerate AP-eligible cost categories, inventory policy and opening balances |
| Recruitment charge | Proposed charge in decision start month; wages from employment month; document and test zero-delay case |
| Marketing tail | Proposed each spend month generates demand exactly lag months later, including after campaign spending ends; no permanent customer compounding |
| Existing assets / maintenance | Asset bases, remaining depreciation lives, and treatment of maintenance CapEx depreciation need explicit fixture policy; avoid duplicate existing depreciation |
| Growth/inflation | Annual compounding conversion and reference-month convention must be explicit, including whether month 1 already includes growth |
| Other revenue/cost | Separate explicit growth assumptions; no truck-driven uplift |
| Month 0 | Opening balances, no operations/flows/events, null valuation consistently for MVP response |
| Nonpositive TTM EBITDA | EV and equity null with `nonpositive_ttm_ebitda`; no invented fallback. Comparisons and MC must disclose unavailable valuations and valid sample counts |
| Payback | First meaningful incremental investment outlay gates evaluation; define numerical tolerance, track first crossing and subsequent reversal; empty scenario is not applicable |
| Stochastic settings | Full bounds, spreads, persistence, initial macro state and zero-spread behavior must be stored before MC; no empirically calibrated claim |
| Baseline risk/payback | Baseline incremental exit risk and payback are not applicable, represented explicitly rather than as a successful zero-month payback |

## Ordered implementation and release gates

1. **Contracts and synthetic data (C1).** Set up Python project with Pydantic, pytest, FastAPI and NumPy dependencies; validate the runtime. Implement backend types matching the contract, reject extra/type-incompatible fields and nonfinite values, generate company/scenario/result JSON schemas, and add TypeScript/schema drift checks. Close the policy register; supply 12 historical records and consistent opening cash, AR, inventory, AP, debts and assets. Record provenance for every input and all assumptions. Assert $5m revenue, $2.75m COGS, $1.5m overhead, $750k EBITDA, $400k cash and $1.2m debt. Full Gate A additionally requires the computed example from step 4; independent UI/module work must wait for that freeze.
2. **Scheduler and operations (C2/C3).** Implement the specified semantic interfaces. Test OP-01–07 and TIME-01–04: zero/one-month delays, out-of-horizon benefits, purchase booked once, full payroll during 25/50/75/100% ramp, campaign lag/tail, capacity saturation and unused trucks. No financial calculations in the scheduler.
3. **Deterministic accounting and valuation (C4/C5).** Implement one pure monthly engine with current flows and ending balances, tranche and asset roll-forwards, tax and NWC policies, historical TTM bridge, EV/equity validity and unlevered FCF. Implement FIN-01–11 and assertions on every forward month, including negative cash without plugs. Use hand-computed expected cases, not snapshots copied from implementation. This work precedes MC, AI and dashboard development.
4. **Scenario orchestration and contract freeze (C6).** Produce baseline, truck-only and coordinated expansion from cloned company inputs. Implement SCN-01–04, all-month identity, order independence, no input mutation, incremental UFCF, guarded payback and reversal, earliest-tie cash/debt milestones, model version and canonical input fingerprint. Generate complete example request/response from the tested engine. Freeze contract revision 1 only when Gate A and Gate B pass; do not promise a favorable expansion result.
5. **Paired Monte Carlo (C7).** Sample inputs into the existing engine using deterministic digest-derived streams and stable investment keys. Implement MC-01–08, bounds, zero-spread identity, invariant checks on sampled paths, monthly pointwise quantiles and full-path risks. Validate missing valuations explicitly. Benchmark 2,000 paired paths across three scenarios and 60 months; offer 5,000 only if measured performance permits. Gate C precedes risk UI integration.
6. **API adapter (C8).** Wire the five §11.1 endpoints to the tested functions, with no route business logic. Deterministic requests reject MC configuration; MC requests require enabled configuration and bounded run count. Test structured 4xx validation, 5xx invariant failures, strict serialization, versions, fingerprints and seeds. Restrict CORS to configured local frontend origins.
7. **React frontend and integration (C9).** Replace the starter with typed API client and React/Recharts views. Build decision editor, event timeline, six metric modes, selected-month inspector, comparison and risk panels, assumptions/provenance and limitations. Consume computed deltas and KPIs. Test 61 states, null handling, units, threshold only on cash, mean versus median, pointwise versus horizon risk, stale/loading/error states and keyboard/tabular access. Gate D requires agreement with API payloads.
8. **Optional explanation and delivery (C10/C11).** Prefer grounded rule-based explanations; no generated forecasts. Complete assumptions/limitations documentation, setup README and repeatable demo. Rerun deterministic, contract, MC and integration acceptance checks for Gate E. Deferred features in §0.4 remain excluded.

## Verification of this planning change

### Person 1 kickoff status

Person 1 has prepared [the shared checkpoint proposal](PERSON_1_CHECKPOINT.md) and [independent financial acceptance cases](../backend/tests/financial_acceptance_cases.json). These cases are test-only arithmetic targets, not a validated company fixture or generated simulation response. Runtime schemas, internal event/state interfaces and shared policy review remain prerequisites for independent engine implementation. No checkpoint or Gate A/B/C/D/E is marked passed. Person 2 must review fixture/operational timing; Person 3 must implement agreed runtime contracts and setup. The next integration milestone remains one reconciled real month.

Repository files and all specification sections/appendices were inspected. No financial module or dashboard has been implemented and no forecast has been fabricated. Contract checks are recorded with the delivery; engine, fixture and UI acceptance tests remain future gates, not claimed passes.
