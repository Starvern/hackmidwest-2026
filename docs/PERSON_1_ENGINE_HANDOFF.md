# Person 1 — Financial module handoff

Dependency: `5725edf`, interface `checkpoint-1-candidate-1`, schema `1.0`, model `mvp-1.0`, public contract revision `1`. Working/published branch: `gavin`; the issue #2 handoff identifies the implementation commit.

## Delivered interfaces

- `src/lib/server/engine/financials.ts`: `calculate_financials(company, prior_state, operations, month_events): FinancialStepResult`, implementing the accepted function alias.
- `src/lib/server/engine/valuation.ts`: `calculate_valuation(company, financial_history, ending_state): ValuationResult`. History is the ordered **forecast** EBITDA records from month 1 through `ending_state.month`; the function prepends the company's 12 historical months internally. Do not prepend historical records twice. It rejects missing forecast months and month 0 valuation.
- `src/lib/server/engine/invariants.ts`: accounting/operational invariant helpers and `ModelInvariantError`. Invalid accounting rejects the step rather than returning a warning or financing plug.
- `src/lib/server/engine/scenarios.ts`: `calculate_payback(incrementalUfcf, investmentOutlays)`, `calculate_path_metrics(months, reserveFloor, payback)`, and `compare_paths(baseline, scenario)`.

No public contracts, schemas, dependency manifests, fixture inputs or Person 2 implementation files changed. The complete scenario runner is not implemented until real scheduler/operations imports are available; no temporary production stubs are supplied.

## State and ownership

Financials validates incoming state/events/operations, enforces sequential months and scheduled counts, returns new financial state and never mutates company/state/events. It charges supplied full payroll/vehicle costs and exogenous drivers; it does not reproduce inflation, ramp, demand or scheduler formulas. Service revenue is completed jobs times ticket, with utilization never applied again.

New loans have purchase-month disbursement and no purchase-month interest/principal. Beginning-balance interest and level principal start next month. Final repayment is capped; only numerical residue within approved tolerances is absorbed. Invalid material loan residuals reject. Principal/CapEx do not reduce EBITDA, and debt proceeds do not enter UFCF.

Growth additions must reconcile to growth CapEx and use 60-month straight-line service life. Scheduler additions must be un-depreciated and cannot collide with existing IDs. Financials exclusively creates monthly maintenance assets using reserved IDs `maintenance:month:N`; Person 2 should avoid that namespace for growth assets. Maintenance depreciation starts in spend month. Pending assets retain useful life until service; depreciation is capped at book value. Existing asset schedules are the only existing-depreciation charge.

Working-capital categories/factors come from explicit company assumptions; duplicate categories reject. Accounts payable is computed from eligible cost categories, not all COGS by default. Positive-income taxes, zero distributions/amortization, separate UFCF and negative cash follow accepted MVP scope.

## Comparisons and runner integration requirements

The runner must collect each month's actual `financial_inputs.incremental_investment_outlay`, and pair scenario/base UFCF before calling `calculate_payback`. This preserves the explicit scheduler signal; `compare_paths` deliberately reuses `scenario.metrics.payback` instead of inventing an outlay formula from statement differences. The runner must assign this paired payback to the scenario's metrics before comparison. Baseline and no-investment paths use `not_applicable`.

Stock metrics include opening month 0 in minimum cash/maximum debt, using earliest ties. Reserve breach lists cover forward months 1–60, with strict `< floor` comparisons. An opening reserve shortfall needs a separate opening warning in final orchestration, since the accepted breach-month schema excludes month 0. Opening flow/valuation deltas are null; cash/debt deltas are available. Unavailable valuation deltas remain null.

Before API integration, the runner must use request-resolved exit multiple/reserve consistently in company calculation context, fingerprints, valuation and metrics; current valuation takes the resolved multiple from company assumptions. It must clone opening state, collect events and real operations, compose financial/operational ending state, emit milestone events/warnings, validate the final response and generate the real reference artifact. Cross-scenario isolation, order independence and complete response acceptance remain integration work.

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

These are hand-constructed module-test inputs, **not real scheduler outputs or the complete product forecast**. Older arithmetic cases under `backend/tests` excluded depreciation on new maintenance assets; the TypeScript test suite explicitly includes the accepted spend-month policy.

## Verification and next handoff

Windows, bundled Node 24.19.0. Execute the commands below with `$checkpointNode` set as in the implementation plan:

```powershell
& $checkpointNode node_modules/typescript/bin/tsc -p tsconfig.contracts.json
& $checkpointNode --test tests/*.test.ts
& $checkpointNode scripts/contracts.ts --check
& $checkpointNode scripts/example_request.ts --check
& $checkpointNode node_modules/@sveltejs/kit/svelte-kit.js sync
& $checkpointNode node_modules/svelte-check/bin/svelte-check --tsconfig ./tsconfig.json
```

Tests include financial FIN-01–11 behaviors, capped depreciation/debt repayment, full payroll/overhead timing inputs, negative cash/taxes, input immutability, 60 accounting roll-forwards, historical TTM bridging, payback gating/reversal, null comparisons and earliest-tie milestones. The 60-month tests use flat typed operational inputs; they do not claim full scheduler/financial scenario integration or all SCN/OP/TIME acceptance.

Next dependency: Person 2 publishes actual scheduler/operations modules and one-month events/output at the accepted contract revision. Person 1 then performs real one-month reconciliation, completes orchestration and generates the full reference response. Gates A/B/C/D/E remain pending; Monte Carlo remains deferred.
