# Company-specific intake: HVAC and plumbing

Status: proposed shared specification, approved product direction from user.
Prepared by P1 against `0d83db7` and P2 flexible-investment candidate `acfba83`.
Planning deliverable only: no intake UI, upload service, profile schema or new
engine behavior is implemented/accepted by this document. Prior gates keep their scope.

P1/P2 operating design agreement recorded in issue #2 comments
[P1](https://github.com/Starvern/hackmidwest-2026/issues/2#issuecomment-6104109103)
and [P2](https://github.com/Starvern/hackmidwest-2026/issues/2#issuecomment-6104131820).
The policies below are design requirements, not implemented validation guarantees
or a business owner's confirmation of their own inputs.

## Goal and first release

Help small/medium HVAC, plumbing and mixed field-service owners describe their
existing business, confirm a credible starting forecast, then compare investments.
Manual entry and a downloadable spreadsheet template first; document extraction
later, always followed by review. Keep the fictional company as an explicit demo.
Do not imply that typing a real company name personalizes the demo economics.

Flow: Choose demo or your business → About your business → Past performance →
Cash, bills and loans → Team, trucks and customer demand → Review assumptions →
Confirm starting picture → Compare plans → Read plain-English results.

Allow incomplete drafts. Unknown, confirmed zero and not applicable are distinct.
No simulation until required facts/estimates and supported-model checks pass.
Owners may enter reviewed estimates, visibly labeled; never fill gaps with demo data.

## Required before a company-specific run

Engine names below are mapping targets, not labels to put in the owner interface.

| Owner-facing information | Intake requirement and unit | Current engine target / treatment |
|---|---|---|
| Business name and type | Required; HVAC / plumbing / both | `name`; new profile trade field; current `industry` only accepts HVAC, extension required before plumbing runs |
| Currency, books through date, forecast starts | Required; USD first, actual dates | New dated profile history; engine only supports January start and ordered Jan–Dec history today |
| Accounting basis | Required; cash / accrual / unknown | New intake fact; do not treat cash receipts as earned sales; unsupported conversion blocks run pending reconciliation |
| Last 12 complete months | Required dated monthly records; sales, expense categories, operating earnings | `historical_months`; each row maps to service/other revenue, direct labor, fleet, variable/other direct costs, overhead, COGS and EBITDA |
| Cash available today | Required signed USD balance at books-through date | `opening_financial_state.cash`; cash is a stock, not annual profit |
| Unpaid customer invoices, inventory, unpaid supplier bills | Each required amount or confirmed zero; same date | opening AR/inventory/AP; do not add loan principal or taxes to supplier AP |
| Existing loans | Explicit none or one row per loan | `debt_tranches`; balance, annual rate, repayment structure, remaining schedule and next payment date |
| Existing depreciable equipment | Explicit none or reconciled asset schedule | `depreciable_assets`; cost, depreciation to date, remaining life, monthly charge; no duplicate baseline depreciation |
| Working technicians and service vehicles | Required nonnegative whole counts | `operations.technicians`, `vehicles`; distinguish office staff and vehicles not available for service |
| Working days and realistic job capacity | Required owner-confirmed figures/estimates | `working_days_per_month`, jobs per technician/vehicle/day; combined trade/service-mix limitation below |
| Jobs completed and typical service sale | Required monthly records or reviewed representative estimate | historical `service_jobs`, `operations.average_ticket`; weighted service revenue / completed jobs where meaningful |
| Customers asking for work, including work turned away | Required estimate or confirmed no unserved work | `base_monthly_job_demand`; completed jobs alone are not demand when the team is at capacity |
| Full technician employment cost | Required USD/year/person | `technician_loaded_cost_per_year`; include employer costs/benefits; exclude already allocated office payroll |
| Fleet operating cost | Required USD/year/vehicle | `vehicle_opex_per_year`; separate loan payments and depreciation |
| Materials/subcontractor and other direct costs | Required classification and monthly amounts/rates | `service_variable_cost_rate`, `non_service_direct_cost_per_month`; review job-related allocation |
| Other sales and fixed running costs | Required USD/month or confirmed zero | `non_service_revenue_per_month`, `fixed_overhead_per_month`; detailed expense ledger reconciles to these totals |
| Current marketing budget | Required amount or confirmed zero | `baseline_marketing_in_overhead`; already part of fixed overhead, never added a second time |
| Seasonal demand, expected growth and cost changes | Required confirmation of assumptions, not necessarily measured facts | 12 seasonality factors; growth/inflation fields; no silent calibration from one year of sales |
| Payment timing, maintenance spending and inventory policy | Required reviewed assumptions | collection/payment delay, AP-eligible categories, constant inventory, maintenance CapEx |
| Cash safety cushion | Required owner choice, USD | `liquidity_floor` / request reserve; show meaning in plain English |
| Tax and business-value assumptions | Required reviewed estimates for current outputs | tax rate / valuation multiple; label assumptions, not valuations inferred from uploaded statements |

Historical EBITDA is derived/reconciled as sales minus mapped direct costs minus
operating overhead. Keep the original statement's profit separately: net income
may include interest, taxes and depreciation and must not be relabeled as EBITDA.
Show reconciliation and obtain confirmation when figures disagree; no balancing plug.

## Existing custom expenses versus new plan expenses

Maintain a dated, itemized baseline expense ledger in the proposed profile. Each
row has name, category, amount, frequency (one-time/monthly/annual), coverage dates,
source, and an explicit mapping to exactly one modeled cost bucket. Example:
dispatch software, rent, insurance, office wages, licensing and subscriptions.

The owner chooses **replace a category total with details** or **describe items
already included in that total**. Never add an uploaded P&L's overhead total and
its detailed rent/software/payroll rows together. Display the category total and
reconciled item sum before accepting. Annual/prepaid/accrual timing requires an
explicit allocation policy, not automatic same-month annual cash treatment.

Existing expenses apply to baseline and every plan. P2's `operating_expense` and
`purchase_asset` candidates describe NEW changes in alternatives, not a workaround
for storing the starting business. In first release, baseline itemization resolves
to the engine's existing totals. Uneven existing future payment schedules need an
explicit baseline-scheduling extension; do not pretend a constant monthly average
models their actual cash timing. Existing debt is not a new asset-purchase decision.

P2's candidate fixed-dollar, same-month custom expense/AP exclusion can be disclosed
for new plans, but must not silently govern real company's invoice/payment behavior.
Financial review of candidate `acfba83` remains separate and outstanding.

## Optional enrichment and unsupported situations

Optional: service mix (HVAC/plumbing, repairs/installations/maintenance), contract
revenue, monthly unserved jobs, lead conversion, overtime, equipment availability,
marketing history and more than 12 months of history. Preserve source detail even
when the current engine uses a reviewed blended assumption.

HVAC and plumbing may have different job sizes, labor requirements and technician
skills. First release can offer an explicitly confirmed blended service model for
appropriate businesses. Counts must not imply every technician/vehicle can serve
every job. Materially incompatible mixes require a future service-line model or a
clear unsupported outcome, not fabricated capacity or an industry-label-only change.

Current blockers to real-business execution need coordinated implementation:
- Industry literal HVAC: add reviewed plumbing/mixed profile-to-engine semantics.
- Forecast January-only / history calendar-only: introduce actual dated observations
  and chronological trailing history, or explicitly restrict intake to a supported
  date window. Never relabel arbitrary months as January to satisfy validation.
- Debt level-principal-only: capture real payment structure; amortizing equal-payment,
  interest-only, balloon or revolving debt must not be silently converted. Add support
  or block that profile with an explanation before claiming company-specific cash.
- Constant inventory and fractional payment timing: disclose approximations; request
  review where opening balances differ from the steady-state forecast assumptions.
- Negative historical sales/cost adjustments: preserve raw credits/refunds in intake;
  current nonnegative categories need reviewed netting/classification, not deletion.
- No full balance sheet, accrual-to-cash reconstruction, owner distributions or
  custom equipment productivity benefits currently modeled. Expose material omissions.

## Confirmed operating design policies

- Define a comparable job and preserve service mix. Require explicit owner
  confirmation that technician/vehicle pooling is suitable; incompatible mixes
  block compilation until supported. Apply each availability constraint once.
- Derive observed weighted ticket as summed comparable service revenue divided by
  summed comparable completed jobs, excluding non-service revenue. A zero-job
  period has unavailable derived ticket, not zero. Require a separately reviewed
  forecast ticket; positive service revenue with zero jobs needs reconciliation.
- Demand requires measured evidence, a reviewed estimate or explicit confirmation
  of no unserved work. Capacity-constrained completions alone cannot establish it.
- Use 12 calendar seasonality factors with mean 1 and separately confirmed base
  demand. Preserve original factors, normalization and provenance. Reject all-zero
  factors; never infer growth or seasonality silently from historical sales.
- Capture actual employment, availability, part-time and ramp facts. Unsupported
  opening cohorts block compilation unless a specific disclosed approximation is
  explicitly reviewed. Whole fully productive opening headcounts are a limitation,
  not permission to discard these facts or reduce both headcount and capacity twice.
- Existing costs map once into monthly baseline buckets. Preserve annual/prepaid
  facts separately; material irregular cash timing blocks the profile until baseline
  scheduling support exists. Disclose bucket inflation and MC overhead factors:
  a named subscription does not become individually fixed by retaining its label.

## P1 financial mapping and initial support policy

These are P1's financial requirements for the shared mapping proposal. P3/shared
owner must encode and review the profile/compiler boundary before implementation.

Map service and non-service revenue separately. Technician loaded payroll and fleet
operating costs each have dedicated direct-cost buckets; remove amounts already
allocated there from variable costs and overhead. Materials/job subcontractors map
to service variable costs where supported; other direct costs remain separate.
Office wages, rent and ordinary subscriptions map to overhead. Baseline marketing
is an included subset of overhead. Category mapping is explicit, never inferred
solely from an expense label. Reconcile historical categories independently of the
chosen forecast run rate; preserve both observations and reviewed assumptions.

Principal is financing cash flow, interest is below EBITDA, asset purchases are
CapEx and depreciation is a noncash charge from the asset schedule. None belongs
in operating-expense totals. Reconcile opening loan balances and net asset values
to their schedules. The existing-depreciation summary is a reconciliation figure,
not an additional charge on top of scheduled depreciation. Existing allocations
retain source/period/stable row ID and replace-total versus included-detail mode.
No balancing plugs, duplicate costs or automatic debt conversion.

Reconciliation requirements:
- Compiled engine financial identities use absolute USD tolerance `1e-6` plus
  relative `1e-12`: `abs(actual - expected) <= 1e-6 + 1e-12 * max(abs(actual), abs(expected))`.
  This checks arithmetic, not permission to ignore source discrepancies.
- Preserve source precision. For cent-denominated statement totals and category
  sums, compare normalized integer cents exactly. Rounded whole-dollar or other
  reports retain their stated precision; show any discrepancy and obtain an
  explicit documented reconciliation before confirmation. Never silently round
  away a difference or overwrite the source figure.
- Service sales/job/ticket checks use matching periods and comparable services.
  A reviewed forecast ticket need not equal every historical month's ticket.
  Unexplained historical identity/allocation conflicts block confirmation; reviewed
  estimates remain labeled and cannot masquerade as reconciled observations.

Initial debt support: explicit no debt, or existing fixed-rate level-principal
loans whose remaining monthly schedule can be represented exactly by current
tranche fields. Capture outstanding principal (not original borrowing), annual
rate, monthly principal, remaining term and first repayment month. Verify the
schedule retires the balance within its stated remaining term (final principal
capped at balance) and interest on beginning balance agrees with the actual terms.
Reject material fees, arrears, irregular payment dates, equal-total-payment loans,
interest-only/balloon debt, variable rates and revolvers until reviewed support
exists. Never approximate those silently with level principal. New alternative
financing remains a separate decision and review scope.

P1 recommends a restricted initial date boundary: books through December 31,
the preceding complete January–December history, and forecast beginning the
following January. Retain actual dates/year in the profile and verify opening
balances share that as-of date. Other periods remain unsupported until a reviewed
dated-history/calendar extension exists. This is a recommendation for the shared
contract checkpoint, not a claim that date validation already exists. Plumbing
and mixed-trade runs still require authoritative industry/mapping changes; do not
compile them by relabeling the company HVAC.

## Spreadsheet template and later document intake

Proposed template tabs (specification only; no spreadsheet delivered yet):
Business; Monthly history; Existing expenses; Opening balances; Loans; Equipment;
Operations; Assumptions. Include units, dated periods and sample instructions, with
demo/example rows clearly separated from the owner's data. CSV import may use one
table per file; a workbook provides the same mappings. Both enter the same review flow.

Later documents: monthly profit-and-loss reports, recent balance sheet, debt and
asset schedules, payroll summaries and job reports. Extract into a draft, never
straight into a simulation. For each figure retain source file/sheet/cell or page,
period, raw value/unit, normalized value and whether owner confirmed/overrode it.
Low-confidence extraction, conflicts and missing periods must be visible.

Before uploads: agree local versus server processing, access, storage, retention,
deletion, permitted file types/size and whether an external extraction service
receives documents. Financial documents are not Git fixtures, issue attachments or
analytics logs. Implement bounded validation and a defined deletion path before use.

## Review, reconciliation and simulation boundary

1. Normalize currency/unit/frequency; preserve raw inputs. Parse only recognized
   formats; reject ambiguous periods/amounts instead of guessing.
2. Validate 12 contiguous completed periods, consistent as-of date, finite amounts,
   category identities, loan/asset schedules and explicit zero/unknown distinctions.
3. Reconcile monthly sales/direct costs/overhead/earnings, payroll and fleet cost
   allocations. Check service sales against jobs x weighted ticket; explain differences.
4. Surface capacity versus observed/turned-away jobs, seasonality/growth assumptions,
   payment timing and existing cash/debt. Apply the financial reconciliation policy above.
5. Present “Here is the business we will simulate”: confirmed numbers, estimates,
   missing/unsupported items and limitations. Owner confirms an immutable profile revision.
6. Compile a validated CompanyInput with complete per-leaf provenance and approved
   mapping version. New profile/source metadata requires reviewed schema/unit extensions;
   existing provenance vocabulary must not label real history as synthetic.
7. Server resolves submitted company/profile revision, not hardcoded demo or trusted
   client totals. Bind deterministic/MC/worker/jobs/recorded data to exact snapshot and
   fingerprints. Profile edits mark old results stale. Never mix demo recorded risks
   with a real company's results; MC parameters need separate disclosed confirmation.

## Ownership, sequence and acceptance checkpoints

P1: financial categories, baseline-versus-plan separation, debt/assets/payment mapping,
reconciliation and sign-off of the compiled baseline. P2: operating questionnaire,
capacity/demand/service-mix mapping and approved expense scheduling. P3/shared owner:
authoritative profile/import schemas, intake/review UI, profile storage/access and
company-aware API/job binding. P3 availability is a scheduling dependency, not approval.

Next deliverables, in order:
1. Operating design agreement is recorded above. Shared owner reviews the proposed
   restricted date boundary, P1 debt/mapping requirements and unsupported cases.
2. Publish versioned draft profile/mapping contracts and a spreadsheet template; agree
   source/provenance and storage scope. No silent revision of frozen demo contracts.
3. Implement manual entry/import/review and profile revision selection, plus supported
   engine/API changes. Manual and spreadsheet routes produce the same reviewed profile.
4. Validate synthetic HVAC, plumbing and mixed profiles, missing/conflicting data,
   duplicate expenses, loan timing, arbitrary calendar periods and immutability. Include
   known-answer baseline checks and company/request isolation across workers/jobs.
5. Owner-facing review: understandable summary, editable assumptions, explicit estimate
   labels, no demo-number leakage, stale results and honest unsupported outcomes. Then
   accept the new intake scope jointly; prior demo gates do not automatically cover it.
6. Add document extraction after those controls work; evaluate extraction on permitted
   test documents and owner-confirmed corrections before enabling real uploads.

Immediate requests: P3/shared owner publish the versioned draft/confirmed profile,
mapping and provenance proposal, including date/industry boundaries and company-aware
API/job binding. P2 owns operating questionnaire/column definitions and acceptance
examples against that shared proposal, then the matching template after agreement.
No repeat broad operating review is requested. No
intake coding or file uploads are implied to be complete by publishing this plan.
