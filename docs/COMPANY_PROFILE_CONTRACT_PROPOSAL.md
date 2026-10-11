# Company profile and mapping — shared review proposal

Proposal version: `company-profile-1-draft`. Mapping version:
`company-mapping-1-draft`. Status: **design proposal, not an implemented API or an
accepted runtime contract**. Prepared by P3 using P1 `821861f` financial policy,
P2 `6f105fb` operating fields, and their integration at `890f3e8`.
This supplies canonical planning identifiers for P2's template specification.
P1/P2 review precedes authoritative schemas, imports and real-company execution.
Existing demo contracts and prior gate acceptance remain scoped as before.

## Initial supported boundary

Choose the restricted initial scope recommended by P1: USD, HVAC, accrual-based
or explicitly reconciled accrual-equivalent historical figures, December 31 opening
balances, the immediately preceding full January–December history, and the next
January forecast. Retain actual ISO dates and years. Plumbing/mixed businesses,
other dates/currencies and unreconciled cash-basis history may be saved as drafts
but cannot compile. A future industry/calendar extension requires owner review;
changing an industry label is insufficient.

Opening technicians must be whole, fully available/productive service employees,
with comparable jobs and explicitly confirmed pooling suitability. Preserve actual
part-time/ramp/skill/availability facts. Initially block unsupported cohorts rather
than introduce an unreviewed approximation. Zero employees/vehicles are valid facts;
show zero-capacity consequences during baseline review.

Existing debt: explicit none, or fixed-rate monthly level-principal schedules
exactly representable by existing fields, beginning-balance interest and a final
principal payment capped at the remaining balance. Verify retirement against actual
remaining terms/payment dates. Unsupported equal-total-payment, balloon/revolver,
variable rates, arrears/fees and irregular schedules block compilation. No conversion.

Existing costs compile into approved recurring monthly buckets. Material irregular
cash timing blocks compilation; preserve annual/prepaid facts and recognition
allocation even when monthly recognition is supported. New alternative custom
expenses/assets remain separate candidate decisions, never opening-company storage.

## Canonical root and immutable revisions

| Root key | Proposed representation / rule |
| --- | --- |
| `profile_version` | Literal `company-profile-1-draft`. |
| `profile_id` | Server-created UUID; stable across revisions, separate from demo company ID. |
| `revision` | Positive server-assigned integer. Every saved edit creates a revision; no overwrite of confirmed revisions. |
| `status` | `draft` or `confirmed`; only server confirmation transitions a reviewed draft. |
| `business` | Fields: `name`, `trade`, `currency`, `accounting_basis`, `books_through`, `forecast_start`. |
| `history` | Rows keyed by stable `row_id` and `period` (`YYYY-MM`); exactly 12 ordered eligible periods at confirmation. |
| `opening` | Dated `cash`, `accounts_receivable`, `inventory`, `accounts_payable`; `debt_declaration` and `asset_declaration` (`none` / `itemized` / `unknown`), plus `loans` and `assets`. |
| `operations` | Canonical facts/assumptions in the projection table below, plus job/mix/pooling/availability evidence. |
| `expense_ledger` | Dated stable-ID rows; category totals and included/replacement details kept distinct. |
| `assumptions` | All approved forecast/timing/tax/value/inflation/risk fields, with field-level review. |
| `sources` | Source records keyed by stable `source_id`, with kind, title, applicable period and optional locator. |
| `reconciliations` | Explicit source discrepancy resolutions and owner/reviewer rationale, not balancing numbers. |
| `reviews` | Reviewer/time/revision-bound decisions, including baseline preview acknowledgment. |
| `confirmation` | Null for drafts; confirmed revision, actor/time, mapping version and snapshot fingerprints for confirmed profiles. |

No required field defaults to the demo fixture. `profile_id` is not proof of access;
all profile/revision reads, writes and simulation resolution require owner/session
access. Multi-user authentication and persistence are implementation prerequisites.

## Field envelope and provenance

Every source or assumption leaf uses the same envelope:

```ts
type ProfileField<T> = {
  value: T | null;
  state: 'unknown' | 'entered' | 'reviewed_estimate' | 'confirmed' | 'not_applicable';
  unit: string; // canonical unit for this field
  period: { start: string; end: string } | { as_of: string };
  source_ids: string[];
  raw: { text: string; unit: string; precision: string } | null;
  derivation: { mapping_version: 'company-mapping-1-draft'; rule: string; inputs: string[] } | null;
  review: { actor_id: string; reviewed_at: string; rationale: string } | null;
};
```

`unknown` means null and blocks a required field. `entered` retains an unreviewed
value and also blocks confirmation. `confirmed` requires a non-null value, source
and review. `reviewed_estimate` also requires value/source/review, plus the estimation
method/limitations in rationale; owner confirmation does not relabel it measured.
`not_applicable` is null with an explicit reviewed reason, allowed only for fields
whose declared condition is false. Zero is a non-null confirmed/estimated value,
never represented by unknown or not applicable. Required numeric engine fields
must ultimately have a value; declarations may make an empty schedule legitimate.

Source kinds: `manual_statement`, `owner_estimate`, `spreadsheet_cell`,
`document_page`, `derived`, `synthetic_demo`. Locators identify sheet/cell or page,
not file contents in logs. File extraction/upload is future work. Manual estimates
receive an owner-estimate source record rather than a fictitious statement citation.
Derived fields name exact source pointers/revisions and mapping rule. Financial raw
amounts retain decimal text and stated precision; never round source facts to fit.

The envelope is separate from current CompanyInput provenance. Real source types
must receive a reviewed authoritative provenance extension before compilation;
never mark real financial history `synthetic`, or erase its source as a generic
assumption. Demo stays explicitly synthetic and uses its unchanged contract.

## History and financial mapping

Each `history` row contains field envelopes for the current historical engine
columns: `service_jobs`, `service_revenue`, `other_revenue`, `revenue`,
`tech_direct_labor`, `vehicle_direct_opex`, `service_variable_cost`,
`other_direct_cost`, `cogs`, `operating_overhead`, `ebitda`.
Additional `reported_profit` and `reported_profit_basis` retain the source statement
figure without relabeling net income as EBITDA. `period` is the actual month;
projection supplies `month_of_year` 1–12 after the date checks.

| Profile input | Engine projection / confirmation rule |
| --- | --- |
| `history[].service_revenue`, `.other_revenue` | Earned service/other sales separately; total revenue reconciles to their sum. Statement revenue remains authoritative pending explicit reconciliation. |
| Historical cost columns | COGS reconciles to four direct-cost components; EBITDA reconciles to revenue minus COGS minus overhead. No silent net-profit conversion or plug. |
| `opening.cash`, `.accounts_receivable`, `.inventory`, `.accounts_payable` | Map once to same-as-of opening balances. AP excludes debt principal/tax balances outside supported policy. Cash may be signed. |
| `opening.loans[]` | Row ID, lender/name, outstanding principal, annual rate, monthly principal, remaining term, next payment date, amortization policy, terms source and review. Compile only exact supported schedules. |
| `opening.assets[]` | Row ID/name, cost basis, accumulated depreciation, monthly depreciation, remaining life, service date and source. Reconcile net values and future depreciation to the schedule; no duplicate depreciation summary charge. Unsupported disposals/salvage/irregular schedules block. |
| `expense_ledger[]` | Row ID/name/category, source period, raw amount/currency/frequency, coverage dates, target bucket, `mapping_mode` (`replace_total` / `included_detail`), normalized recognition amount, allocation rule, irregular-payment flag and review. Exactly one modeled bucket per allocated portion. |
| Category totals and ledger | Included detail describes an existing total and adds nothing. Replacement details must reconcile to the replaced total or an explicitly resolved discrepancy. Payroll/fleet/marketing cannot appear twice. |

For cent-denominated source totals/category sums compare integer cents exactly.
Preserve other stated precision and record reviewed discrepancies explicitly.
Compiled arithmetic uses P1's tolerance:
`abs(actual - expected) <= 1e-6 + 1e-12 * max(abs(actual), abs(expected))` USD.
That tolerance never authorizes ignoring source conflicts.
Principal/interest/CapEx/depreciation stay outside operating-expense rows and map to
separate schedules. Office payroll belongs in overhead; service payroll maps once
to technician cost. Baseline marketing is included in overhead, not an added charge.

## Operating and assumption projection

| Canonical profile pointer | Engine target / required evidence |
| --- | --- |
| `operations.job_definition`, `.service_mix`, `.pooling_suitable` | Retained eligibility facts. Comparable jobs and explicit confirmed pooling required; incompatible pools block. |
| `operations.service_technicians_employed`, `.workforce_availability` | `operations.technicians` only after fully productive opening-cohort checks; facts never discarded. |
| `operations.service_vehicles_available` | `operations.vehicles`; only available service vehicles. |
| `operations.working_days_per_month` | Same engine name; one reviewed constant, disclose monthly-calendar limitation. |
| `operations.jobs_per_technician_day`, `.jobs_per_vehicle_day` | `max_jobs_per_tech_per_day`, `max_jobs_per_vehicle_per_day`; no double availability adjustment. |
| `history[].service_jobs` | Dated completed-job observations or visibly reviewed representative estimates. No silently generated monthly observations from annual figures. |
| Derived `historical_ticket` | Service revenue / comparable completed jobs for matching periods. Zero jobs => unavailable with explicit reason; zero-job revenue needs classification/timing reconciliation. |
| `operations.forecast_ticket` | `average_ticket`; separately reviewed. A historical derivation uses sum revenue / sum jobs over disclosed compatible periods, not mean of tickets. |
| `operations.demand_evidence`, `.base_monthly_demand` | `base_monthly_job_demand`; demand source, reviewed estimate, or confirmed no unserved work required. Bottlenecked completed jobs alone are insufficient. |
| `operations.loaded_technician_cost` | `technician_loaded_cost_per_year`, USD/person/year; service payroll allocation reviewed once. |
| `operations.fleet_operating_cost` | `vehicle_opex_per_year`, USD/vehicle/year; exclude purchases/debt/depreciation. |
| `operations.non_service_revenue_per_month`, `.service_variable_cost_rate`, `.non_service_direct_cost_per_month`, `.fixed_overhead_per_month`, `.baseline_marketing_in_overhead` | Corresponding engine fields; separately reviewed forecast run rates, not silently fitted history. Marketing is a disclosed part of overhead. |
| `assumptions.seasonality` | Twelve calendar-month envelopes; normalized nonnegative mean-1 factors, raw values and normalization retained. All-zero factors invalid. Base demand confirmed separately. Jan maps index 0. |
| `assumptions.organic_demand_growth`, `.wage_inflation`, `.overhead_inflation`, `.ticket_growth`, `.other_revenue_growth`, `.other_direct_cost_growth` | Same engine fields; reviewed annual fractions greater than -1. No silent calibration. |
| `assumptions.collection_delay_months`, `.payment_delay_months`, `.ap_eligible_cost_categories`, `.constant_inventory` | Same engine fields; reviewed timing/bucket policy. Inventory reconciles to opening facts; source payment facts preserved. |
| `assumptions.existing_depreciation_per_year`, `.maintenance_capex_per_year`, `.truck_useful_life_months` | Same engine fields; existing depreciation reconciles to assets, truck life supported 60-month policy disclosed. |
| `assumptions.tax_rate`, `.liquidity_floor`, `.valuation_multiple` | Same engine fields. Reserve and multiple become request controls copied explicitly from confirmed assumptions; later run overrides remain separate provenance. |
| `assumptions.risk_configuration` | Separate reviewed company-specific sensitivity configuration/version. Deterministic eligibility does not imply MC eligibility; never inherit demo distributions silently. |

P2 template columns use these canonical pointers plus common envelope/source keys.
Repeated rows are keyed by `row_id` (not editable names); row order is presentation,
while dated periods and mapping dependencies are semantic. Template sheets remain
Business, Monthly history, Existing expenses, Opening balances, Loans, Equipment,
Operations and Assumptions. P2 should publish column specification against this
proposal before generating the workbook; draft schema changes remain reviewable.

## Confirmation, eligibility and error representation

Draft save permits missing/unsupported values but rejects malformed envelopes and
nonfinite/ambiguous normalized numbers. Confirmation validates source/review states,
period continuity, operating eligibility, all financial identities and exact schedules.
Run a deterministic baseline preview against the candidate compiled snapshot before
final owner confirmation; its preview identity is bound to the draft revision and
mapping version. Edits invalidate that acknowledgment. Confirmation produces an
immutable compiled snapshot plus full provenance sidecar. It does not accept every
plan or the separate stochastic scope.

Proposed eligibility report:

```ts
type EligibilityReport = {
  profile_id: string; revision: number; mapping_version: 'company-mapping-1-draft';
  deterministic_eligible: boolean; monte_carlo_eligible: boolean;
  issues: { code: string; pointer: string; row_id: string | null;
    severity: 'blocking' | 'notice'; message: string; source_ids: string[] }[];
};
```

Blocking codes include `REQUIRED_UNKNOWN`, `REVIEW_REQUIRED`, `SOURCE_CONFLICT`,
`HISTORY_GAP`, `AS_OF_MISMATCH`, `UNSUPPORTED_DATE`, `UNSUPPORTED_INDUSTRY`,
`ACCOUNTING_BASIS_UNRESOLVED`, `INCOMPATIBLE_JOB_POOL`, `UNSUPPORTED_WORKFORCE`,
`DEMAND_EVIDENCE_MISSING`, `INVALID_SEASONALITY`, `DUPLICATE_COST_MAPPING`,
`IRREGULAR_BASELINE_CASH`, `UNSUPPORTED_DEBT`, `ASSET_SCHEDULE_CONFLICT`,
`PROVENANCE_UNSUPPORTED`, `RISK_REVIEW_REQUIRED`. Conditions may block only MC;
deterministic confirmation requires no deterministic blockers. Notices preserve
reviewed estimates/limitations. Machine codes remain separate from owner-facing text.

## API, worker and recorded-result binding proposal

Introduce a separately versioned profile simulation envelope rather than silently
adding fields to frozen v1 demo requests:

```ts
type CompanyBinding = {
  profile_id: string; revision: number;
  profile_version: 'company-profile-1-draft'; mapping_version: 'company-mapping-1-draft';
  profile_fingerprint: string; compiled_company_fingerprint: string;
};
// Proposed profile-simulation version, not a currently callable route.
type ProfileSimulationInput = {
  simulation_version: 'profile-simulation-1-draft'; company: CompanyBinding;
  request: DeterministicRequest | MonteCarloRequest;
};
```

Server resolves an authorized **confirmed exact revision** and verifies all versions,
fingerprints, eligibility and matching `request.company_id`; never trust a client
CompanyInput or fall back to demo. Profile fingerprint hashes a canonical payload containing profile ID/revision,
profile/mapping versions, business, history, opening, operations, expense ledger,
assumptions, sources, reconciliations and reviews, including actual dates. Exclude
status, the derived confirmation/fingerprint envelope, transport timestamps and
access secrets to avoid circular hashes and permit confirmation of the exact previewed
revision. Compiled fingerprint hashes validated CompanyInput plus mapping/version;
existing run fingerprint still covers company, decisions, controls and approved
policies. Specify canonical hash rules in authoritative implementation, retaining
existing demo hash outputs. Presentation-only name edits may preserve economic
fingerprints but create a distinct profile revision/identity.

The immutable server-resolved CompanyInput, source sidecar and binding are captured
before enqueue. Worker receives that exact snapshot and verifies binding against
its job record; it never reads a mutable latest profile. Receipts/status/results
carry the binding, and result context validation rejects mismatch before exposure.
Access-token isolation, cancellation, retained-result expiry and existing workload
limits remain. Profile edits show old results as previous revisions, not current.
UI compares binding plus submitted controls/actions/configuration/seed for staleness.

Recorded demo MC remains demo-only. A profile may view it as a visibly separate
example, never as its risk summary. Profile-specific recorded output must match the
entire binding, request fingerprint, MC configuration/version and seed. No matching
completed result means not run/unavailable. Deletion/retention policy applies to
profile snapshots and jobs/results together; no personal statement contents in Git,
issue comments or runtime logs.

Proposed first persistence scope: local single-user application storage, explicit
owner/session access, separate from repository fixtures, with deletion of a profile
and its retained artifacts. Hosting, sharing and third-party extraction require
separate implementation/security/data-lifecycle review. This is a design choice for
review, not a claim that secure storage or deletion exists today.

## Acceptance examples and owner review

Carry P2's complete known-answer matrix from `PERSON_2_INTAKE_FIELDS.md` into
implementation tests, plus P1 financial schedule/reconciliation cases. Required:
600-demand/480-capacity => 480 completed/120 unserved; weighted ticket $175;
zero-job ticket unavailable; disclosed 0.5/1.5 normalized seasonality; unknown versus
confirmed zero; incompatible pools/cohorts; duplicate payroll/fleet/marketing;
irregular annual cash; exact versus unsupported debt; date gaps/June opening;
profile A/B and revision A1/A2 isolation across deterministic/MC/worker/job/recorded
output; source discrepancy review; no demo data fallback; edits invalidate preview.

P1: review financial projection, dates/debt restrictions, cent/tolerance rules and
confirmation/schedule eligibility. P2: review operating pointers/units, source and
estimate envelopes, dates/job/ticket/seasonality cases, then propose matching template
columns. P3: encode the reviewed authoritative schema/mapping, access/storage and
API binding only after agreement. No duplicate broad financial/operating review is
requested; identify specific changes to this version. Manual intake and spreadsheet
imports must converge on this one profile; no parallel competing formats.
