# Company-specific intake: HVAC and plumbing

Status: proposed shared specification, approved product direction from user.
Prepared by P1 against `0d83db7` and P2 flexible-investment candidate `acfba83`.
Planning deliverable only: no intake UI, upload service, profile schema or new
engine behavior is implemented/accepted by this document. Prior gates keep their scope.

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
   payment timing and existing cash/debt. Reconciliation tolerances need owner agreement.
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
1. P1/P2 review this field list and unsupported cases; settle minimum blended-service
   scope, date/debt support and monthly baseline-expense treatment.
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

Immediate requests: P2 confirm operation/service-mix fields and existing-expense mapping;
P3/shared owner review date/profile/provenance/API implications when available. No
intake coding or file uploads are implied to be complete by publishing this plan.
