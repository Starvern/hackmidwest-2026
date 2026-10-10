# Person 1 — Financial engine and integration lead

## Your responsibility

Own the deterministic accounting, valuation, scenario comparisons and integration decisions. Your first shared milestone is **one validated month from decisions through operations, accounting, cash and valuation**. Extend this to 60 months before Monte Carlo, AI or dashboard development.

Read these before changing code:

- [Implementation specification](OperatorOS_Implementation_Spec.md), especially §§2–3, 6–8, 14–16 and Appendix A/B.
- [Assessment and implementation plan](IMPLEMENTATION_PLAN.md), including the financial policy register.
- [Contract rules](../contracts/README.md) and [initial shared types](../contracts/contracts.ts).
- [Person 2 guide](PERSON_2_DATA_OPERATIONS.md) and [Person 3 guide](PERSON_3_CONTRACTS_API_FRONTEND.md).

The specification takes precedence. The current types are a review baseline, not a completed contract freeze. Any proposed departure from the specification must be identified and recorded before implementation.

## File ownership

Primary ownership:

- `backend/app/financials.py`, `valuation.py`, `scenarios.py` and financial invariant helpers.
- `backend/tests/test_accounting.py`, `test_valuation.py`, `test_scenarios.py` and engine integration tests.
- `contracts/example-result.json`: generated from the tested deterministic engine, never hand-written forecast numbers.
- `docs/model-limitations.md` and the integration status section in `docs/IMPLEMENTATION_PLAN.md`.

Person 2 owns fixture/scheduler/operations and later Monte Carlo. Person 3 owns schemas, schema generation, dependency configuration, API and frontend. Request changes to their files through their owner. Person 3 implements contract changes; you approve the integrated contract after both engine owners review it.

## Start together: contract checkpoint

Before independent module implementation, hold one shared checkpoint with all three people:

1. Agree on requests, responses, module signatures, units, null semantics and stable investment identity.
2. Finalize internal `MonthEvents`, prior/ending state, market-factor and path-risk types. Include cohort-specific payroll costs, timed financing, asset transitions and monthly state persistence so modules do not need to infer missing inputs.
3. Close deterministic accounting policies: existing/new debt payment timing, new borrowing interest treatment, AP-eligible costs, inventory, opening balances, recruitment timing, asset/maintenance depreciation, growth reference month, marketing tail, valuation applicability and payback tolerance/reversal.
4. Person 2 records resolved assumptions and provenance; Person 3 encodes validators and generates contracts. Record the agreed commit/revision and ownership in the implementation plan.

Distinguish **interface checkpoint** from **full contract freeze**. The checkpoint lets Persons 1 and 2 build the engine against agreed types. Full Gate A/B freeze requires the reconciled fixture, passing deterministic tests and complete computed response. Do not wait for that response before building the engine that produces it. Dashboard work waits for the full freeze.

## Build order

1. **Financial test cases.** Prepare small, hand-calculated cases from the specification while Person 2 builds operations. Test financial functions with typed operational inputs; label these test inputs, not product forecasts.
2. **Monthly accounting.** Implement `calculate_financials(company, prior_state, operations, month_events) -> FinancialResult`. Preserve separate period flows and ending balances. Book costs once; maintain tranche/asset schedules. Use only disclosed policies.
3. **Valuation.** Implement `calculate_valuation(company, financial_history, ending_state) -> ValuationResult`. Use historical months for the first 11 forecast TTM windows. Nonpositive TTM EBITDA produces explicit unavailability, not a fabricated fallback.
4. **Early integration.** Connect one month using Person 2's real fixture/scheduler/operations outputs. Reconcile it before expanding the runner.
5. **Scenario runner.** Implement `simulate_months(initial_company, decisions, stochastic_inputs, horizon=60) -> ScenarioPath`, calling scheduler → operations → financials → valuation. Clone initial state; no global mutation. Deterministic paths use explicit neutral stochastic inputs.
6. **Comparisons and milestones.** Implement `compare_paths(baseline_path, scenario_path) -> PathComparison`. Compute backend deltas, incremental unlevered FCF, investment-gated payback and reversals, earliest-tie cash trough/debt peak, and reserve breaches.
7. **Reference result and freeze.** Run baseline, truck-only and coordinated expansion with identical assumptions. Work with Person 3 on canonical fingerprints, versions and serialization. Generate the complete example request/result, pass Gates A/B, and announce the exact contract commit to all three people.

## Required verification

- FIN-01–11 and SCN-01–04 from §14, plus all-month invariants from §6.7.
- Historical totals: revenue $5m, COGS $2.75m, overhead $1.5m, EBITDA $750k; opening cash $400k and debt $1.2m.
- Cash/debt roll-forwards reconcile for every month; interest is subtracted once; principal and CapEx never reduce EBITDA.
- Working-capital changes affect cash; truck borrowing never becomes revenue or investment payback.
- Month 0 has no operating flows or decisions; forward months are exactly 1–60.
- Empty decisions equal baseline; scenario reordering and other scenarios' control changes do not change results.
- Payback before investment is impossible; no investment is `not_applicable`; unavailable values remain null.
- Negative cash remains visible; invariant failures reject results. No financing plugs or guaranteed positive expansion outcome.

Agree a clean-checkout test command with Person 3 and record it in the README. Run the relevant tests at each handoff and the complete deterministic suite before Gates A/B.

## Parallel work and merge rules

Each person works in a separate checkout/worktree and branch, such as `codex/financial-engine`. Give your agents bounded assignments with exclusive file ownership. Agents working simultaneously need separate worktrees or explicitly disjoint files; never let multiple agents edit the same module/configuration concurrently.

Merge small, tested changes through this integration sequence: dependency/schema setup → reconciled fixture → scheduler/operations → financials/valuation → scenario runner/reference result. If a branch depends on another change, integrate that prerequisite first or explicitly base the branch on its agreed commit. Rebase/update against the integration branch and rerun relevant checks before merging.

For a contract change, record the reason, affected consumers, revision/migration and required tests. Person 3 updates the authoritative schemas and generated files; affected owners update consumers before integration. No silent renames, copied formulas, or temporary production stubs to make imports pass. Do not merge unfinished code as a working feature.

## After deterministic acceptance

Person 2 implements paired Monte Carlo using your unchanged engine. Review its zero-spread identity, paired deltas, accounting invariants and treatment of unavailable valuations. Person 3 integrates API/UI against the frozen result. You own cross-component acceptance and final Gate E; optional explanations remain last.

## Required handoff

Every agent/person handoff includes: commit/branch, files changed, public signatures and contract revision, assumptions/policies added, exact test commands and results, example input/output, known limitations and blocking dependencies. Report contract-breaking changes explicitly. Update the implementation plan with gate status; passing one module does not imply passing the entire application.

## Starter prompt for your agent

> Read `docs/OperatorOS_Implementation_Spec.md`, `docs/IMPLEMENTATION_PLAN.md`, `contracts/README.md`, and `docs/PERSON_1_FINANCIAL_ENGINE.md` before changes. Own financials, valuation and deterministic scenario integration. Start with the shared interface/policy checkpoint; do not implement unresolved accounting assumptions silently. Coordinate schema changes through Person 3 and operational inputs through Person 2. Build one reconciled month, then 60-month paths and comparisons with specification tests. Do not implement Monte Carlo, dashboard or AI first. Follow file ownership and provide the required handoff.
