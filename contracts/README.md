# Shared contract baseline

Authority: [specification](../docs/OperatorOS_Implementation_Spec.md). Generated typed vocabulary: [contracts.ts](contracts.ts). Status: established for review; **not a completed Gate A freeze**. No calculated example response is supplied until the engine exists.

Per the [stack amendment](../docs/STACK_DECISION.md), TypeScript/Zod is the Person 3 runtime validation source of truth; the accepted engine remains authoritative for financial calculations. Authoritative Zod definitions now live in `src/lib/server/schemas.ts`; generate/check JSON schemas and inferred TypeScript with the npm contract scripts. See the [candidate handoff](../docs/PERSON_3_SCHEMA_HANDOFF.md). Keep schema version `1.0`, model version `mvp-1.0`, and contract revision distinct. Breaking changes require an explicit revision/migration and coordinated changes; no silent field renames.

## Validation and serialization

- USD numeric amounts, decimal rates, numeric multiples, no display rounding in engine payloads. All numbers must be finite; reject NaN/infinity and unknown fields at runtime.
- Horizon fixed at 60; exactly 12 ordered historical records and exactly 61 ordered result states. Month 0 is a separate opening-state union member: no flows, operations, valuation or events. Months 1–60 require complete flow/balance records.
- Decisions are discriminated by `type`. Start month is integer 1–60; quantities are nonnegative integers; delays/ramps nonnegative integers; duration and loan term positive integers. Costs/spend nonnegative; acquisition cost strictly positive; funding fraction within [0,1]; annual loan rates nonnegative.
- Reserve nonnegative; exit multiple positive; MC runs integer 2,000–5,000, seed nonnegative integer. Exactly one `baseline` scenario with no decisions, plus at least two named alternatives for the MVP comparison workflow. Scenario IDs unique; decision IDs unique within each scenario.
- `stable_investment_key` identifies a reused economic action across scenarios. Reject inconsistent parameters for the same key. Decision `id` remains local identity; adding/reordering scenarios must not change draws.
- Provenance manifest keys are JSON Pointers to input leaf values, including array entries. Validate coverage and units; no undocumented financial defaults. Sampled realizations carry `simulated` provenance. Derived result values are engine outputs.
- Null means unavailable, never zero. Valuation includes an applicability status; payback includes reached/not_reached/not_applicable and reversal disclosure. Inapplicable risk probabilities are null, with reason and valid-path denominator. Engine invariant failure rejects the whole run.
- The deterministic endpoint accepts `DeterministicRequest` only, rejecting `monte_carlo`; the MC endpoint accepts `MonteCarloRequest`. All responses carry schema/model/revision, fingerprint, run identity and seed (null for deterministic).
- Fingerprint canonical validated financial inputs, resolved assumptions, model version and MC settings with deterministic serialization/digest. Exclude timestamps and presentation ordering; document numeric canonicalization before implementing caching.

## Module boundaries

| Interface | Inputs → output | Ownership |
|---|---|---|
| `schedule_month(company, scenario, month, path_risks, prior_state)` | Validated inputs + prior balances → `MonthEvents` | C2: active cohorts, purchases, campaign spending/demand inputs, no revenue or valuation |
| `calculate_operations(company, prior_state, month_events, market_factors)` | Capacity/demand drivers → `OperationsResult` | C3: jobs, capacity, ticket; no cash booking |
| `calculate_financials(company, prior_state, operations, month_events)` | Operations + timed costs/financing → `FinancialResult` | C4: statements, debt/assets and cash; no randomness |
| `calculate_valuation(company, financial_history, ending_state)` | Historical + forecast EBITDA and ending balances → `ValuationResult` | C5: TTM, EV/equity and applicability |
| `simulate_months(initial_company, decisions, stochastic_inputs, horizon=60)` | Immutable company + decisions + resolved path inputs → `ScenarioPath` | C6: call C2→C3→C4→C5, assert invariants |
| `compare_paths(baseline_path, scenario_path)` | Aligned paths → `PathComparison` | C5/C6: backend deltas, investment-gated payback |
| `aggregate_percentiles_and_risks(paired_paths)` | Complete paired paths → `MonteCarloSummary` | C7: pointwise quantiles and full-path risks |

Engine functions are callable without HTTP, UI or AI. No module mutates shared inputs. `prior_state` carries cash/AR/inventory/AP, debt tranches and assets. `MonthEvents` carries state transitions and decision-specific costs rather than recalculated KPIs; completed milestones are emitted by metrics after the financial step. These internal types must be finalized with the phase-1 policy register before scheduler work.

The response below includes the required cross-module and UI-facing fields. Distribution keys and parameter validation remain blocked on explicit fixture assumptions; `DistributionParameters` is a manifest, not permission for arbitrary risk formulas. Missing valuation paths must never silently disappear from reported risk denominators.

## Executable checkpoint candidate

Interface revision `checkpoint-1-candidate-1` awaits Persons 1/2 acceptance.
`contracts/engine.ts` records the coordinated sixth scheduler argument and
`FinancialStepResult` wrapper; growth-only asset additions prevent duplicate
maintenance ownership. All public types are generated from Zod.

JSON Schema captures shape/bounds; cross-field Zod refinements remain required
for provenance, IDs, request reuse, chronological states and null/status semantics.
Run `npm test`, `npm run fixture:contract` and P2's `node scripts/validate_fixture.ts`.
Do not hand-edit generated artifacts. No schema parsing constitutes accounting
acceptance or a completed Gate A/B freeze.
