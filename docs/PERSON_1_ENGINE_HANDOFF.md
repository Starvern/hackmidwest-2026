# Person 1 — Financial module handoff

Dependency: `5725edf`, interface `checkpoint-1-candidate-1`, schema `1.0`, model `mvp-1.0`, public contract revision `1`. Integrated real scheduler/operations from P2 `8fe7dd1`. Working/published branch: `gavin`; the issue #2 handoff identifies the implementation commit. **Real one-month integration and complete 60-month deterministic response are now implemented and tested.**

## Delivered interfaces

- `src/lib/server/engine/financials.ts`: `calculate_financials(company, prior_state, operations, month_events): FinancialStepResult`, implementing the accepted function alias.
- `src/lib/server/engine/valuation.ts`: `calculate_valuation(company, financial_history, ending_state): ValuationResult`. History is the ordered **forecast** EBITDA records from month 1 through `ending_state.month`; the function prepends the company's 12 historical months internally. Do not prepend historical records twice. It rejects missing forecast months and month 0 valuation.
- `src/lib/server/engine/invariants.ts`: accounting/operational invariant helpers and `ModelInvariantError`. Invalid accounting rejects the step rather than returning a warning or financing plug.
- `src/lib/server/engine/scenarios.ts`: `calculate_payback(incrementalUfcf, investmentOutlays)`, `calculate_path_metrics(months, reserveFloor, payback)`, and `compare_paths(baseline, scenario)`.
- `simulate_months(initial_company, decisions, stochastic_inputs, horizon=60): ScenarioPath` uses an exported TypeScript execution context `ResolvedPathInputs`: scenario identity/name, 60 explicit `monthly_market_factors`, `path_risks`, caller-supplied per-path fingerprint and seed. These are resolved execution inputs, not a new HTTP or distribution schema. It calls the real engine and pairs a baseline internally for payback; no stochastic sampling is implemented.
- `simulate_deterministic(company, request, runId?): SimulationResult` validates the accepted request, resolves request reserve/multiple, computes fingerprints, runs baseline/alternatives once each, pairs UFCF with actual scheduler outlays, emits milestone/warning records and validates the complete response. API adapters should call this function without duplicating formulas.
- `scripts/generate_reference_result.ts` generates or checks `contracts/example-result.json` using the real deterministic engine and accepted `contracts/example-request.json`; use `--check` for drift detection.

No public contracts, schemas, dependency manifests, fixture inputs or Person 2 implementation files were edited. P2's implementation was integrated by merge. The reference artifact is calculated output, not a hand-written forecast or temporary stub.

## State and ownership

Financials validates incoming state/events/operations, enforces sequential months and scheduled counts, returns new financial state and never mutates company/state/events. It charges supplied full payroll/vehicle costs and exogenous drivers; it does not reproduce inflation, ramp, demand or scheduler formulas. Service revenue is completed jobs times ticket, with utilization never applied again.

New loans have purchase-month disbursement and no purchase-month interest/principal. Beginning-balance interest and level principal start next month. Final repayment is capped; only numerical residue within approved tolerances is absorbed. Invalid material loan residuals reject. Principal/CapEx do not reduce EBITDA, and debt proceeds do not enter UFCF.

Growth additions must reconcile to growth CapEx and use 60-month straight-line service life. Scheduler additions must be un-depreciated and cannot collide with existing IDs. Financials exclusively creates monthly maintenance assets using reserved IDs `maintenance:month:N`; Person 2 should avoid that namespace for growth assets. Maintenance depreciation starts in spend month. Pending assets retain useful life until service; depreciation is capped at book value. Existing asset schedules are the only existing-depreciation charge.

Working-capital categories/factors come from explicit company assumptions; duplicate categories reject. Accounts payable is computed from eligible cost categories, not all COGS by default. Positive-income taxes, zero distributions/amortization, separate UFCF and negative cash follow accepted MVP scope.

## Comparisons and runner integration requirements

The runner must collect each month's actual `financial_inputs.incremental_investment_outlay`, and pair scenario/base UFCF before calling `calculate_payback`. This preserves the explicit scheduler signal; `compare_paths` deliberately reuses `scenario.metrics.payback` instead of inventing an outlay formula from statement differences. The runner must assign this paired payback to the scenario's metrics before comparison. Baseline and no-investment paths use `not_applicable`.

Stock metrics include opening month 0 in minimum cash/maximum debt, using earliest ties. Reserve breach lists cover forward months 1–60, with strict `< floor` comparisons. An opening reserve shortfall needs a separate opening warning in final orchestration, since the accepted breach-month schema excludes month 0. Opening flow/valuation deltas are null; cash/debt deltas are available. Unavailable valuation deltas remain null.

The implemented runner resolves request exit multiple/reserve consistently in its cloned company context and request/per-path fingerprints. Valuation consumes the resolved multiple. It clones opening state, collects events and real operations, composes financial/operational ending state, emits milestone events/warnings, validates the final response and generates the reference artifact. Cross-scenario isolation, order independence and full 61-state output are covered by integration tests. Opening shortfalls produce warnings without adding events to month 0.

## Independently calculated module reference

Using flat reference inputs, unchanged working capital, full initial payroll and spend-month maintenance depreciation:

| Field | Expected USD |
|---|---:|
| Service revenue | 351,000 |
| Total revenue | 1,250,000 / 3 |
| EBITDA | 62,500 |
| Depreciation | 12,500 + 1,250 / 9 |
| Interest | 8,000 |
| Cash taxes | 188,375 / 18 |
| Operating cash flow | 792,625 / 18 |
| Ending cash | 7,482,625 / 18 |
| Ending debt | 1,180,000 |
| Unlevered FCF | 750,625 / 18 |

These independent arithmetic targets are also verified against **P2's real month-1 scheduler/operations handoff** and the connected runner. Month-1 TTM EBITDA is $750,000; EV is $4,500,000; equity value is `67,242,625 / 18` ($3,735,701.39). Older arithmetic cases under `backend/tests` excluded depreciation on new maintenance assets; the TypeScript suite explicitly includes the accepted spend-month policy.

## Verification and next handoff

Windows, bundled Node 24.19.0. Execute the commands below with `$checkpointNode` set as in the implementation plan:

```powershell
& $checkpointNode node_modules/typescript/bin/tsc -p tsconfig.contracts.json
& $checkpointNode --test tests/*.test.ts
& $checkpointNode scripts/contracts.ts --check
& $checkpointNode scripts/example_request.ts --check
& $checkpointNode scripts/generate_reference_result.ts --check
& $checkpointNode node_modules/@sveltejs/kit/svelte-kit.js sync
& $checkpointNode node_modules/svelte-check/bin/svelte-check --tsconfig ./tsconfig.json
```

**58 tests pass**, with strict contract TypeScript/artifact checks and reference-response drift checking. Coverage includes P2's OP/TIME tests, FIN-01–11 behaviors, debt/asset caps, full payroll/overhead timing, negative cash/taxes, immutable inputs, 60 accounting roll-forwards, historical TTM bridging, payback gating/reversal, null comparisons, earliest-tie milestones, month-60 investments with benefits outside the horizon and real full-engine SCN-01–04 integration. Some focused module cases use hand-constructed inputs; `tests/engine-integration.test.ts` uses the real scheduler/operations and published month-1 handoff. Svelte check reports 0 errors/warnings and the production build passes; adapter selection remains hosting work.

The calculated reference outcomes are intentionally not guaranteed positive:

| Scenario | Month-60 equity USD | Minimum cash USD | Project payback |
|---|---:|---:|---|
| Baseline | 8,432,704.79 | 400,000.00 | Not applicable |
| Truck-only | 8,044,229.79 | 355,701.39 | Not reached |
| Combined expansion | 6,135,605.40 | 349,633.87 | Not reached |

Truck-only adds costs without changing jobs because baseline demand is below existing capacity. Combined expansion temporarily adds campaign-driven jobs but retains additional payroll/fleet costs after campaign demand ends. Its lower modeled value follows these disclosed assumptions; no favorable outcome is forced.

Next: P2 independently reviews the real accounting/operational integration; P3 validates/consumes the engine-generated response and connects the API. Automated deterministic acceptance evidence is ready for Gate A/B review; full shared freeze has not been announced. Gates C/D/E remain pending and Monte Carlo remains deferred. Repeated runtime boundary parsing is currently retained for correctness; no MC performance claim is made.

Current release status: shared deterministic Gates A/B accepted on October 10, 2026, superseding earlier pending-review statements above. See [Person 1 acceptance record](PERSON_1_DETERMINISTIC_ACCEPTANCE.md) for the exact integrated dependency, 66-test and live API evidence, and next-owner checkpoints. Gates C/D/E remain pending.
