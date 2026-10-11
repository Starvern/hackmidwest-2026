# P2 template column specification — shared proposal review

Finalized P2 column mapping against exact P3 `340508a`, `company-profile-2-draft`
and `company-mapping-2-draft`. Design only; not an implemented importer or generated
workbook. Operating representation disposition: accepted by P2; the revision-2
resolution below supersedes the original clarification requests. Initial runtime scope remains USD HVAC,
Dec-31 opening, prior Jan–Dec history, next January forecast, supported fully
productive cohorts, and exact supported debt. Drafts can preserve unsupported facts.

## Common columns

Use long-form field rows for scalar envelopes and stable-ID repeated records.
All sheets use canonical pointer, value, state, unit, period_start, period_end,
as_of, source_ids, raw_text, raw_unit, raw_precision, derivation_rule,
derivation_inputs, mapping_version, review_actor, reviewed_at and review_rationale.
Exactly one dated-period form applies. Do not infer review from a filled cell or
accept arbitrary client reviewer identity as authorization. Server owns profile
identity/revision, confirmation, fingerprints and access checks.

Pointers must resolve into P3's canonical profile; IDs bind repeated rows so sort
order cannot change identity. Workbook serialization of source-ID and pointer
lists must be specified by the shared importer; do not use ambiguous comma-splitting.
Blank is unknown, numeric zero is an explicit value, and not applicable needs a
reviewed conditional reason. Preserve reviewed estimates as estimates after owner
confirmation. Source records should be a dedicated table within Business or a
separate Sources sheet, with source_id, kind, title, period and locator.

## Sheet-to-profile projection

| Sheet | Record keys and canonical projection |
| --- | --- |
| Business | `business.name`, `.trade`, `.currency`, `.accounting_basis`, `.books_through`, `.forecast_start`; source table as above. Server-created root IDs are displayed/exported, not operator-authoritative. |
| Monthly history | `row_id`, `period`, field pointer and envelope columns. Fields: `service_jobs`, `service_revenue`, `other_revenue`, `revenue`, `tech_direct_labor`, `vehicle_direct_opex`, `service_variable_cost`, `other_direct_cost`, `cogs`, `operating_overhead`, `ebitda`, plus `reported_profit`, `reported_profit_basis` when applicable. These project to `history[]`; actual years retained. |
| Existing expenses | Stable `row_id`, name, category, source period, raw amount/currency/frequency, coverage dates, target bucket, `mapping_mode`, normalized recognition amount, allocation rule, irregular-payment flag and common source/review columns. Exact record member names beyond those named by P3 still need authoritative encoding. Never add included detail to its total. |
| Opening balances | `opening.cash`, `.accounts_receivable`, `.inventory`, `.accounts_payable`, `.debt_declaration`, `.asset_declaration`; dated to books_through. Explicit none versus unknown schedules. |
| Loans | Stable row_id and P3 `opening.loans[]` fields: lender/name, outstanding principal, annual rate, monthly principal, remaining term, next payment date, amortization policy, terms source/review. P1/shared owner finalize exact members and debt validation. |
| Equipment | Stable row_id and `opening.assets[]`: name, cost basis, accumulated depreciation, monthly depreciation, remaining life, service date and sources. No new-purchase decision rows. |
| Operations | Scalar `operations` pointers in the next table. Structured mix/availability evidence uses linked stable-ID detail rows whose shape is to be finalized by P3. Do not flatten away unsupported facts. |
| Assumptions | Canonical `assumptions` pointers from P3 projection, one row per scalar; seasonality uses 12 explicit calendar-month rows; risk configuration remains separate reviewed scope, never copied from demo. |

## Operating pointer and proposed unit vocabulary

These are proposed exact intake units for P3 confirmation, not existing engine
provenance aliases. Template/export and manual entry must use the same vocabulary.

| Canonical pointer | Proposed unit / representation |
| --- | --- |
| `operations.job_definition` | `text` |
| `operations.service_mix` | Structured evidence; P3 define detail record shape, preserving service/trade distinctions. |
| `operations.pooling_suitable` | `boolean`; confirmed true required to compile. |
| `operations.service_technicians_employed` | `people`; whole nonnegative employed service headcount. |
| `operations.workforce_availability` | Structured evidence; P3 define supported/unsupported detail, no invented productivity defaults. |
| `operations.service_vehicles_available` | `vehicles`; whole nonnegative available fleet. |
| `operations.working_days_per_month` | `days/month`; reviewed constant. |
| `operations.jobs_per_technician_day` | `jobs/person/day` |
| `operations.jobs_per_vehicle_day` | `jobs/vehicle/day` |
| `history[].service_jobs` | `jobs/month`; historical count/estimate, not throughput assumption. |
| `operations.forecast_ticket` | `USD/job`; separately reviewed. |
| `operations.demand_evidence` | Evidence record/source pointers; P3 finalize shape and support measured/estimated/no-unserved distinction. |
| `operations.base_monthly_demand` | `jobs/month`; before seasonality/growth. |
| `operations.loaded_technician_cost` | `USD/person/year` |
| `operations.fleet_operating_cost` | `USD/vehicle/year` |
| `operations.non_service_revenue_per_month`, `.non_service_direct_cost_per_month`, `.fixed_overhead_per_month`, `.baseline_marketing_in_overhead` | `USD/month`; separate forecast run rates, marketing included in overhead. |
| `operations.service_variable_cost_rate` | `fraction`; separate service labor/fleet allocations excluded. |
| `assumptions.seasonality[0..11]` | `dimensionless`; explicit month 1..12 export label, Jan index 0 in profile, normalized mean 1. |
| Growth/inflation assumption pointers | `annual_fraction`; no silent percent/fraction conversion. |

## Narrow representation changes requested from P3

Historical review requests against revision 1, resolved by revision 2 below:

1. Publish canonical unit literals and structured evidence member shapes for the
   operating pointers. `unit: string` alone does not settle interoperable workbook
   columns. The table above supplies P2's unit proposal; engine provenance units
   may differ but need explicit mapping.
2. Define exact pointer and tagged representation for derived historical ticket.
   The proposal currently names `historical_ticket` without its location, while
   the common envelope has no unavailable state. A zero-job ticket must be a
   derived unavailable result with reason/source dependencies, not unknown or
   conditional not-applicable used to bypass confirmation. Prefer a derived
   review projection outside required input envelopes; zero-job revenue still
   triggers reconciliation. Keep forecast_ticket a required reviewed input.

## Acceptance disposition and next step

P3's proposal retains the required 600-demand/480-capacity case, weighted $175
ticket, zero-job ticket, 0.5/1.5 normalized seasonality, workforce/pool blocking,
zero-versus-unknown, date boundaries and no-demo company binding. No broad operating
policy mismatch found. P1 retains financial schedule/reconciliation review.

Both P2 representation requests are resolved at `340508a`. No executable intake
schema/importer is introduced here. Workbook generation follows shared agreement,
including P1's specific confirmation-identity disposition. No runtime intake tests
are claimed for these design rules.

## Revision-2 final mapping and review disposition

Use the closed `ProfileUnit` registry and pointer-specific engine aliases in
`340508a:docs/COMPANY_PROFILE_CONTRACT_PROPOSAL.md`; the operating unit table above
is confirmed there. Monetary raw precision is preserved. Lists in cells are JSON
arrays (source IDs, history/mix references, dependencies and category lists), never
comma-split text. Reject malformed lists rather than guessing.

Operations uses linked detail tables with `record_kind`, `parent_pointer`,
`row_id` and the following exact value-member columns; parent envelope columns
carry applicable source/review/period information. Container records are identified
by their canonical pointer; child records use stable row IDs. Do not add fictional
row IDs to objects that have no row_id member in the profile contract.

| Record kind / parent | Exact value members / detail columns |
| --- | --- |
| Service mix / `operations.service_mix` | `row_id`, `trade`, `service_kind`, `description`, `comparable_job_definition`, `pool_id`, `historical_row_ids`, `completed_jobs`, `service_revenue_usd`, `source_ids` |
| Workforce declaration / `operations.workforce_availability` | `declaration` (`none`, `itemized`, `unknown`); linked constraints supply `constraints[]`. |
| Workforce constraint / `operations.workforce_availability` | `row_id`, `people`, `kind`, `available_fraction`, `productivity_fraction`, `pool_id`, `description`, `source_ids` |
| Demand declaration / `operations.demand_evidence` | Tagged `kind`: `measured`, `reviewed_estimate`, `confirmed_no_unserved`. Only the selected variant's members apply. |
| Measured demand observation | `row_id`, `period`, `requested_jobs`, `unserved_jobs`, `service_mix_row_ids`, `source_ids` under `observations[]` |
| Demand estimate | `period_start`, `period_end`, `estimated_jobs_per_month`, `method`, `limitations`, `service_mix_row_ids`, `source_ids` |
| No-unserved declaration | `historical_row_ids`, `rationale`, `source_ids` |

Trade/service-kind enums and exact restrictions come from the revision-2 proposal.
Optional null mix counts/revenue or unknown availability fractions remain null,
not zero/one. Mix totals reference actual covered history periods. Workforce
overlapping constraints are not added or multiplied into a second capacity loss;
initial unsupported itemized constraints block compilation. Demand estimates retain
reviewed_estimate state; no-unserved declarations need explicit reviewed history
coverage and do not calibrate base demand. Referenced IDs must exist in the revision.

Derived ticket location is `review_projection.historical_tickets[]` in the server
review response, outside editable profile facts and hashed preview payload.
Optional read-only export columns: `history_row_id`, `period`, `unit`,
`mapping_version`, `source_ids`, `dependencies`, `status`, `value`, `reason`, plus
response-level `profile_id`/`revision`. Available values have null reason;
unavailable values are null with `zero_jobs`, `inputs_unreviewed` or
`source_conflict`. Import ignores/recomputes these values. Zero-job revenue still
blocks reconciliation and forecast_ticket remains separately required/reviewed.

P2 accepts these exact operating representations and known-answer obligations.
P1's confirmation-identity and financial display disposition remains separate.
P3 owns authoritative intake encoding; no implemented company-specific execution,
browser/Gate D/E acceptance or importer compatibility is established by this mapping.

Focused independent correction verification at `340508a`:
`node --test tests/dashboard.test.ts` passed all seven tests, including copied
truck/hire/marketing labels preserving original labels, shared keys, economic
fingerprints and sampled action risks across 20 run indices. Economic edits still
detach and conflicting shared economics reject. P2's rename finding is resolved.
