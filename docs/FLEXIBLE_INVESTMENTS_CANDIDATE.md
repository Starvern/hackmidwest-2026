# Flexible expenses and asset purchases — candidate

Implemented at the user's direction while P3 is unavailable, based on integrated
`e5bdc0d`. This is an additive contract/accounting/editor candidate for P1 review,
not an expansion of the previous A/B/C acceptance. Original fixture, example request,
61-state reference response and deterministic fingerprints remain unchanged.

## Operator controls

In either alternative, **Add expense** creates a named amount/start/duration item.
One charged month means a one-time expense; multiple months mean the same amount
each month. **Add asset purchase** creates a named purchase with price, purchase
month, service delay, depreciation life, monthly operating cost and optional funding.
Items can be renamed, edited and removed. New stable identities are unique to their
plan; existing shared truck edits continue to update both alternatives. Existing
results remain visible and stale until an explicit comparison rerun.

These controls do not infer productivity, customers or revenue from a name. Existing
truck/hire/marketing decisions remain the supported operational effects. Arbitrary
demand/productivity attachments, non-depreciable assets, disposals/resale, variable
expense inflation, reimbursements/negative expenses and custom loan amortization
are outside this first slice.

## Explicit candidate accounting assumptions

- `operating_expense`: nonnegative `amount_per_month`, charged from `start_month`
  for `duration_months` (1–60), truncated only by the forecast horizon. Classified
  as fixed-dollar operating overhead, paid in the same month, excluded from AP.
  Reduces EBITDA/EBIT and positive-income taxes; no loss carryforwards. Positive
  charges count as investment outlays for existing paired UFCF payback gating.
- `purchase_asset`: cost capitalized once at purchase, with optional debt proceeds
  at purchase. Existing level-principal debt policy applies: first interest and
  principal next month, independent of service date. Straight-line depreciation
  begins in service over the entered life (1–600 months), capped at book value.
  No salvage value. Fixed-dollar monthly operating costs begin in service and
  continue through the horizon, including after accounting depreciation ends.
  They are same-month overhead/cash expenses, excluded from AP. Purchase cost and
  positive ongoing costs count as payback outlays; financing never counts as revenue.
- Out-of-horizon service dates remain out of horizon: purchase/debt still occur,
  but no early depreciation or operating costs. Zero charges/purchases create no
  artificial outlay/payback signal. No workforce or fleet cohorts are created.

## Contracts and versioning

Both new authoritative Zod decision variants require
`decision_version: flexible-investment-1-candidate`, label/name and complete scalar
provenance. Economic settings and version enter normal request/path hashes; names
remain presentation-only. Metadata exposes a separate candidate `decision_extensions`
descriptor; the existing three-entry `decision_types` discovery field stays intact.
Generated JSON Schema and inferred types are regenerated from authoritative source.

Optional `custom_operating_expenses` fields extend financial inputs/results only
when a positive custom charge occurs. Asset additions may include explicit
`depreciation_life_months`; legacy trucks retain their existing 60-month validation.
Existing overhead/accounting invariants include the optional expense amount as zero
when absent. Old request outputs and hashes reproduce exactly; these are changed
candidate schemas, so consumers of new decisions must use the regenerated contracts.
This does not silently rename the accepted interface/model/result versions.

The MC sampler leaves these new cost/life/service assumptions fixed as entered;
there are no approved new custom-risk distributions. Existing shared macro risks
still affect ordinary operations. The original saved 2,000-run artifact revalidates
unchanged; no new full custom-investment ensemble or benchmark is claimed.

## Evidence and review

119 tests pass, including new real-engine tests of recurring/one-time timing,
tax floors, after-tax cash, no AP/revenue effects, next-month debt service,
two-month depreciation capped at cost, deferred service beyond horizon, input
immutability, provenance/version validation, editor removal and hash sensitivity.
Svelte check has zero errors/warnings; app and compiled worker build pass.

Browser verified adding a $1,000/month subscription for 12 months and a $10,000
cash-funded asset, renaming them and rerunning the actual API. Combined month-1
EBITDA becomes $61,500 and cash $344,993.06 (rounded $344,993 in UI), while revenue
stays $416,666.67. Previous baseline/truck-only paths remain unchanged.

P1 should review the new expense classification, AP exclusion, useful-life/debt
timing and payback outlay treatment. P3/shared integration review should cover the
additive candidate contract and controls when available. Future operational benefit
attachments need explicit semantics and tests, not name-based inference.
