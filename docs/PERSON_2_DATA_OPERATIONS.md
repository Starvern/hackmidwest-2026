# Person 2 — Synthetic data, scheduler and operations

Implementation stack: SvelteKit, TypeScript and Zod, confirmed by the user. See
[stack amendment](STACK_DECISION.md); it supersedes historical Python/React references.

## Your responsibility

Own the validated company fixture and the causal chain from decisions to demand, capacity and completed jobs. After deterministic acceptance, own paired Monte Carlo. Your first shared milestone is **one validated month from decisions through operations, accounting, cash and valuation** with Person 1.

Read these before changing code:

- [Implementation specification](OperatorOS_Implementation_Spec.md), especially §§2–5, 9, 14–16 and Appendix A/B.
- [Implementation plan](IMPLEMENTATION_PLAN.md), including unresolved policies.
- [Contract rules](../contracts/README.md) and [initial shared types](../contracts/contracts.ts).
- [Person 1 guide](PERSON_1_FINANCIAL_ENGINE.md) and [Person 3 guide](PERSON_3_CONTRACTS_API_FRONTEND.md).

The specification is the authority. Fixture values and distributions are synthetic and illustrative. Do not invent industry facts or add operational relationships beyond the MVP.

## File ownership

Primary ownership:

- `data/synthetic_hvac_company.json`, `data/historical_12_months.csv` and named scenario input fixtures.
- `src/lib/server/fixtures.ts`, `event_scheduler.ts`, `operations.ts`.
- `scripts/validate_fixture.ts` and `scripts/build_synthetic_fixture.ts`.
- `tests/fixture.test.ts`, `tests/operations.test.ts`, `tests/event_timing.test.ts`.
- `docs/assumptions.md`: shared policy register with Person 1's financial decisions explicitly recorded.
- Later: `src/lib/server/monte_carlo.ts`, `aggregation.ts`, and `tests/monte_carlo.test.ts`.

Person 1 owns financials/valuation/scenario orchestration and integration approval. Person 3 owns schemas, generated contracts, dependencies, API and frontend. Do not edit those files without coordination. Submit missing schema fields to Person 3 instead of building local incompatible types.

## Start together: contract checkpoint

Before independent engine implementation, all three people agree on public types and internal scheduler → operations → financials interfaces. Ensure `MonthEvents` describes purchases, activation, employment cohorts, full payroll costs, productivity ramps, campaign spending and lagged demand inputs. Market factors and path risks must enter through explicit types so Monte Carlo can later reuse the same engine.

Close deterministic policies with Person 1: historical/opening balance consistency, payroll and recruitment timing, marketing tail, growth reference month, other-revenue behavior, vehicle costs, assets/depreciation and working capital. Record approved values and provenance in the assumptions manifest. Person 3 encodes and validates the types; Person 1 approves the integration checkpoint.

The checkpoint permits engine development. Full Gate A/B contract freeze comes later, after the fixture, engine tests and complete engine-generated response exist. Do not wait for that response to start operations, and do not treat initial TypeScript types as a completed freeze.

## Build order

1. **Historical fixture.** Supply 12 ordered records reconciling exactly to the specification's annual P&L. Initialize cash/debt, AR/inventory/AP and assets according to documented policy. Include provenance for all inputs, calendar start, units, seasonality and separate other revenue/cost assumptions.
2. **Fixture validation.** Validate through Person 3's Zod schemas and assert totals, finite values and opening-state consistency. Do not adjust forecast outputs to force historical reconciliation.
3. **Scheduler.** Implement `schedule_month(company, scenario, month, path_risks, prior_state) -> MonthEvents`. Schedule costs and state transitions exactly once; no revenue, tax, cash or valuation calculations here.
4. **Operations.** Implement `calculate_operations(company, prior_state, month_events, market_factors) -> OperationsResult`. Constrain completed jobs by nonnegative demand, productive technician capacity and available vehicle capacity. Utilization is an output, never a second revenue haircut.
5. **One-month handoff.** Give Person 1 validated fixture, real scheduled events and operational output for a reference month. Jointly verify timing and downstream accounting; resolve interface issues through Person 3.
6. **Boundary coverage.** Complete timing/bottleneck tests across the horizon, including events whose benefits occur after month 60. Provide baseline, truck-only and combined input scenarios using matched stable investment keys for reused actions.

## Required deterministic verification

- OP-01–07 and TIME-01–04 from specification §14.
- Historical revenue $5m, COGS $2.75m, overhead $1.5m and EBITDA $750k.
- Reference demand 540, capacity 720, completed jobs 540 and utilization 0.75.
- Extra trucks alone cannot increase technician capacity; extra hires cannot bypass vehicle constraints; marketing cannot bypass capacity.
- Zero capacity produces zero completed jobs and defined zero utilization.
- Truck purchase in start month; activation after configured delay; no vehicle operating cost before service.
- Payroll starts at employment and is fully charged during ramp. Four-month productivity ramp is exactly 25%, 50%, 75%, 100%.
- Marketing produces demand only after lag, follows the documented campaign tail and never compounds permanent customers by default.
- Month 0 is immutable and has no decision effects. Running scenarios never mutates shared fixture inputs.

Use independently calculated expected values and document rounding tolerance. Record exact runnable test commands with Person 3; do not claim passing tests until run.

## Monte Carlo: start only after Gates A/B

Do not build stochastic forecasts before Person 1's deterministic engine and reference response pass acceptance. You may document proposed distribution parameters beforehand, but do not silently adopt example ranges as calibrated facts.

1. Finalize the distribution manifest, feasible bounds, persistence and zero-spread behavior with Person 1; Person 3 adds runtime validation.
2. Sample shared macro inputs once per path. Derive stable digest-based substreams from seed/run/risk keys; use stable investment keys for reused actions. Adding/reordering scenarios must not alter existing draws.
3. Call Person 1's `simulate_months` for every paired scenario. Do not rewrite operational or accounting formulas or perturb finished EBITDA/value numbers.
4. Implement `aggregate_percentiles_and_risks(paired_paths) -> MonteCarloSummary`: pointwise percentiles/mean, pathwise reserve breaches, paired terminal differences, guarded payback and explicit unavailable-value counts.
5. Pass MC-01–08, sampled accounting invariants, feasibility bounds and uncertainty-zero identity. Benchmark 2,000 paths × three scenarios × 60 months; record environment/runtime. Offer 5,000 only when measured performance permits.
6. Hand validated aggregation to Person 3 for risk API/UI integration. Have Person 1 independently review paired accounting and risk semantics before Gate C.

## Parallel work and merge rules

Use your own checkout/worktree and branch, such as `codex/data-operations`. Give agents bounded, nonoverlapping file ownership. Separate fixture and operations tasks may run concurrently after the interface checkpoint; they must consume the same schema revision. Do not assign two agents to the same file simultaneously.

Merge order through Person 1: schema/setup → fixture → scheduler/operations → financial engine and scenario response. Keep changes small and tested. Update against merged prerequisites before integration. Never change a public contract locally to unblock yourself: propose the change, identify affected consumers, let Person 3 update schemas/generated files, and retest with Person 1.

## Required handoff

Include commit/branch, files changed, public signatures and contract revision, assumptions added, exact tests/results, example input/output, remaining limitations and dependencies. Identify breaking changes explicitly. Report fixture and deterministic gates separately from Monte Carlo readiness.

## Starter prompt for your agent

> Read `docs/OperatorOS_Implementation_Spec.md`, `docs/IMPLEMENTATION_PLAN.md`, `contracts/README.md`, and `docs/PERSON_2_DATA_OPERATIONS.md` before changes. Own the synthetic fixture, scheduler and operations. Coordinate financial policy with Person 1 and schema changes with Person 3. After the shared interface checkpoint, build reconciled history and opening state, exact event timing, constrained operations and OP/TIME tests. Supply real outputs for the one-month integration milestone. Do not implement Monte Carlo until deterministic Gates A/B pass. Follow file ownership and provide the required handoff.
