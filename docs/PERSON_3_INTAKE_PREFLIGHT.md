# Person 3 — intake preflight

Builds on schema foundation `ba6045a` and integrates P2 workbook owner-guidance
correction `f95e09e`. P1's requested expense explanations/dropdown are now delivered.
No workbook values, financial engine formulas or original demo contracts changed.

`assessIntake` in `src/lib/server/intake/eligibility.ts` runs the authoritative
payload/reference parser, then returns blocking issues and estimate notices with
field pointers/source IDs. It has no side effects and never changes source values.

Implemented input checks:

- Required reviewed facts versus unknown/entered/not-applicable; optional reported
  profit must be supplied/reviewed with its basis. Risk configuration is separate.
- USD HVAC and accrual/reconciled-accrual-equivalent; actual December-31 opening,
  next January forecast, ordered January–December history and matching monthly
  coverage/opening schedule dates.
- Revenue, four direct cost categories/COGS, and EBITDA identities; negative category
  adjustments remain unsupported. Integer-cent comparison when raw source precision
  is explicitly `0.01`, with decimal strings preserved and no rounding to fit.
- Explicit none/itemized schedules; level-principal debt retirement/final cap and
  first-forecast-month payment; asset net value/remaining depreciation, service date
  and depreciation summary reconciliation.
- Confirmed common HVAC pool/job definition and fully available opening workforce;
  source/history references, measured-demand coverage and unserved bounds. Forecast
  demand remains separate from completed history. Optional mix aggregates reconcile
  for one mix row; multiple supplied aggregates conservatively block pending allocation
  support rather than silently accepting unsupported allocations.
- Twelve nonnegative mean-1 seasonal factors, supported AP/truck-life/value policy,
  opening inventory agreement and marketing as a subset of overhead.
- Explicit supported expense targets: `fixed_overhead_per_month`,
  `non_service_direct_cost_per_month`, `tech_direct_labor`, `vehicle_direct_opex`.
  Included detail never adds to a bucket; replacement reconciles to that bucket;
  overlapping modes, unsupported targets and irregular cash timing block. Service
  variable expenses need rate/allocation support and conservatively remain blocked
  as ledger targets. No label-based inference or automatic annual cash smoothing.
- Financial source-conflict history rows produce unavailable historical tickets.

## Meaning and limits

`input_eligible` means these implemented preflight checks pass. It is not the
proposal's complete `deterministic_eligible` or an authorization/confirmation claim.
`execution_available` and `monte_carlo_eligible` are always false at this stage.
The report must not be used as a runnable-company receipt. Input reviews/actors
remain evidence supplied to the future authorized server workflow.

Still required: complete source/derivation/reconciliation authority and dependencies,
supported raw normalization/precision formats, compiled engine provenance extension,
full CompanyInput compilation/engine validation, immutable owner/session persistence,
preview → acknowledge → atomic confirmation, API/UI and exact worker/result binding.
This code neither calls a demo fallback nor grants real-company or MC execution.
Unsupported cases stay drafts. No uploads/importer or personal financial data added.

## Verification

Seven synthetic preflight tests cover supported readiness with execution unavailable,
input immutability/demand separation, years/monthly dates, unknown versus zero,
unsupported workforce/trade and mean-1 seasonality, source cents/category conflicts,
debt/asset schedules and included/replacement/irregular expenses. The prior five
schema tests remain. Existing engine known-answer tests retain capacity and forecast
verification; this preflight does not recalculate engine outcomes.

P1/P2 can flag specific policy mismatches here; no repeat broad review or benchmark
is needed. P3 can continue the compiler/provenance and revision workflow next.
Independent browser Gate D and release Gate E remain separate/open.
