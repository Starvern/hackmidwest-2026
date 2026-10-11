# Company intake workbook, revision 2

`company-intake-v2.xlsx` is a blank collection/review template targeting the accepted
design at P3 `340508a`: `company-profile-2-draft` / `company-mapping-2-draft`.
P1 confirmation disposition: issue #2 comment 6104770395. P2 mapping:
`docs/PERSON_2_TEMPLATE_COLUMN_SPEC.md` at `fa12778`.

Eight sheets: Business, Monthly history, Existing expenses, Opening balances,
Loans, Equipment, Operations and Assumptions. Business includes source records
and completion instructions. Operations includes linked service-mix, workforce
and tagged-demand detail tables. The history sheet supplies 12 stable-ID row
groups; actual years/periods and all company values remain blank. Source/review
envelopes, raw precision and JSON-array list columns remain visible to reviewers.

Enter typed numbers and actual dates. Keep raw source text/units/precision in the
raw columns. Zero is explicit, not missing. Values start blank with unknown state;
no financial defaults, estimates, date assumptions or company approvals are supplied.
Amber identifies entry areas; field-pointer/unit/version columns are template
metadata and should not be changed. State choices do not grant server authorization.
Copy complete repeated-record groups with fresh stable IDs as needed. Supply period
on every history field within its row group. Conditional optional values require
reviewed reasons rather than fabricated zeroes.

This is not a forecasting workbook or an implemented upload/import format. Field
pointers and financial record member spellings expressed narratively by the design
must be checked against P3's authoritative encoded schema before importer integration.
Review metadata must be authorized by the application, not trusted from spreadsheet
cells. Historical ticket is deliberately not an editable input; the application
must derive the revision-bound available/unavailable review projection.

Initial execution eligibility remains USD HVAC, Dec-31 opening, preceding full
Jan–Dec history and next-Jan forecast, reviewed accrual-equivalent facts, supported
fully productive cohorts and exactly representable fixed-rate level-principal debt.
Material irregular baseline cash timing and unsupported facts block compilation.
Existing company costs are separate from new alternative expense/purchase decisions.
Company-specific intake execution, persistence and confirmation are P3 runtime work.

## Reproduce

Use the bundled runtime returned by `load_workspace_dependencies`. Set
`ARTIFACT_NODE_MODULES` to its node_modules directory, then run that bundled Node:

```text
node scripts/build_intake_workbook.mjs outputs/intake-v2
```

Builder uses `@oai/artifact-tool`, recalculates, inspects inputs, scans formula errors,
renders each sheet and exports XLSX. Previews/runtime diagnostics are ignored by Git.
The workbook intentionally has no forecast/reconciliation formulas: those belong to
the authoritative intake mapping/engine and must not be duplicated here.

## Review checks

Verify eight named sheets, required pointers/common envelope columns, 12 distinct
history row groups, blank company values, revision-2 literals, no formula errors,
state dropdowns, frozen identifiers/headers, source and structured evidence tables.
Rendered opening ranges for all eight sheets and supplementary instructions/detail
ranges are visually reviewed. Archive/XML inspection verifies saved structure and
blank values; no Excel-native application or importer execution is claimed.
