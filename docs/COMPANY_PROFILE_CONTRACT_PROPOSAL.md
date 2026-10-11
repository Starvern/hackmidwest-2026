# Company profile and mapping — shared review proposal

Proposal version: `company-profile-2-draft`. Mapping version:
`company-mapping-2-draft`. Status: **design proposal, not an implemented API or an
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
| `profile_version` | Literal `company-profile-2-draft`. |
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
| `reviews` | Field/source/reconciliation reviews included in the preview payload. Baseline acknowledgment is separate, as specified below. |
| `preview_acknowledgment` | Server-owned acknowledgment record, null until the exact preview is acknowledged; excluded from the preview/profile hash. |
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
  unit: ProfileUnit; // closed literal vocabulary below; each pointer has exactly one unit
  period: { start: string; end: string } | { as_of: string };
  source_ids: string[];
  raw: { text: string; unit: string; precision: string } | null;
  derivation: { mapping_version: 'company-mapping-2-draft'; rule: string; inputs: string[] } | null;
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
  profile_id: string; revision: number; mapping_version: 'company-mapping-2-draft';
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
  profile_version: 'company-profile-2-draft'; mapping_version: 'company-mapping-2-draft';
  profile_fingerprint: string; compiled_company_fingerprint: string;
};
// Proposed profile-simulation version, not a currently callable route.
type ProfileSimulationInput = {
  simulation_version: 'profile-simulation-2-draft'; company: CompanyBinding;
  request: DeterministicRequest | MonteCarloRequest;
};
```

Server resolves an authorized **confirmed exact revision** and verifies all versions,
fingerprints, eligibility and matching `request.company_id`; never trust a client
CompanyInput or fall back to demo. Profile fingerprint hashes a canonical payload containing profile ID/revision,
profile/mapping versions, business, history, opening, operations, expense ledger,
assumptions, sources, reconciliations and field/source/reconciliation reviews, including actual dates. Exclude
status, preview acknowledgment, the derived confirmation/fingerprint envelope, transport timestamps and
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

## Revision 2: exact review corrections and template representation

This section is normative within this **design proposal** and supersedes ambiguous
revision-1 narrative representations. Canonical pointers and economic mapping targets
are unchanged. Profile/mapping/simulation draft version literals advance to `2-draft`
so P2 can target the exact revision. No intake runtime schema or importer is claimed.

### Preview, acknowledgment and confirmation identity

`reviews` contains only field/source/reconciliation reviews, which must be complete
before baseline preview. Baseline acknowledgment lives at root
`preview_acknowledgment`, never inside `reviews` or the hashed data payload:

```ts
type PreviewAcknowledgment = {
  preview_id: string; profile_id: string; revision: number;
  profile_fingerprint: string; compiled_company_fingerprint: string;
  mapping_version: 'company-mapping-2-draft';
  baseline_input_fingerprint: string;
  actor_id: string; acknowledged_at: string;
};
```

Server creates an immutable preview record binding the exact eligible draft payload,
compiled snapshot, policy/mapping versions and baseline output. Authorized owner
acknowledgment copies that binding from the server record; client-supplied actor IDs
or hashes are not authority. Writing this acknowledgment is a workflow transition,
not a data edit: no new data revision, source review or payload hash is created.
Confirmation atomically verifies the current revision/payload/compiled fingerprints,
mapping/policies and acknowledged preview record, then freezes that revision and
stores confirmation separately. Neither acknowledgment nor confirmation is fed back
into the payload it approves. No mutable preview result can be substituted.

Any change to economics, sources, raw precision, field reviews, reconciliations,
dates or mapping creates a new draft revision (or invalidates the preview on a mapping
version change), clears acknowledgment and requires a new preview. Even a label-only
profile edit creates a new revision and cannot reuse acknowledgment accidentally.
A confirmed revision remains immutable; editing it creates a fresh draft. Economic
fingerprints may be unchanged by presentation edits, but revision binding still differs.

Acceptance sequence: draft R7 with complete reviews -> preview P7/H7 -> acknowledge
P7/H7 -> confirm R7/H7 succeeds with no circular hash or extra data revision. Change
an economic input, source or mapping after P7 -> old acknowledgment is rejected and
confirmation fails until the new revision/mapping is previewed and acknowledged.
Acknowledging another user's or another revision's preview is rejected. These are
required future implementation tests, not currently executed runtime claims.

### Closed units and explicit projection

```ts
type ProfileUnit = 'text' | 'boolean' | 'ISO_date' | 'calendar_month' | 'integer'
  | 'people' | 'vehicles' | 'days/month' | 'jobs/person/day' | 'jobs/vehicle/day'
  | 'jobs' | 'jobs/month' | 'USD' | 'USD/month' | 'USD/year' | 'USD/job'
  | 'USD/person/year' | 'USD/vehicle/year' | 'fraction' | 'annual_fraction'
  | 'dimensionless' | 'months' | 'record' | 'record_list' | 'category_list';
```

Use P2's operating unit table exactly: job definition `text`, pooling `boolean`,
headcount `people`, fleet `vehicles`, days `days/month`, throughput `jobs/person/day`
and `jobs/vehicle/day`, historical jobs/base demand `jobs/month`, forecast ticket
`USD/job`, loaded payroll `USD/person/year`, fleet running cost `USD/vehicle/year`,
forecast monthly monetary buckets `USD/month`, variable-cost rate `fraction`,
growth/inflation `annual_fraction`, seasonality `dimensionless`.

Business names/enums/declarations and reported-profit basis use `text`; business
books-through/forecast-start use `ISO_date`. Historical monetary columns and reported
profit use `USD/month`; opening balances, loan principal/monthly principal and asset
cost/accumulated depreciation use `USD`; remaining terms/lives use `months`; asset
monthly depreciation uses `USD/month`; loan annual interest uses `annual_fraction`.
Loan payment/asset service dates use `ISO_date`. Delay/truck-life assumptions use
`months`, inventory/reserve use `USD`, depreciation/maintenance annual amounts use
`USD/year`, tax uses `fraction`, valuation multiple `dimensionless`, AP categories
`category_list`, risk configuration `record`. Source raw units remain independent;
normalization requires a named reviewed rule, never implicit percent conversion.

Engine provenance aliases are explicit, pointer-specific mappings (values retain
meaning; the unit label alone does not convert amounts):

| Profile unit / pointer | Exact current engine provenance unit |
| --- | --- |
| `people`, `vehicles` opening resource counts | `count` |
| `jobs/person/day`, `jobs/vehicle/day` throughput | `jobs/resource/day` |
| `USD/person/year`, `USD/vehicle/year` per-resource costs | `USD/year` on the corresponding per-resource engine field |
| `fraction`, `annual_fraction` rates | `decimal_rate` |
| `dimensionless` seasonality / valuation multiple | `multiple` |
| `category_list` AP categories | Each array leaf `label` |
| `text` projected labels | `label` |
| `days/month`, `jobs/month`, `USD/job`, `USD/month`, `USD/year`, `USD`, `months` | Same literal on their corresponding numeric engine fields |
| `ISO_date`, `calendar_month`, `record`, `record_list`, eligibility `boolean`, aggregate mix `jobs` | Retain in profile/sidecar or derive a reviewed projection; no direct frozen-engine leaf |

This table defines the initial registry; unsupported new target/pointer pairs block
compilation until reviewed. The profile vocabulary does not redefine frozen engine
units, convert annual totals into per-resource costs, or discard actual dates.

Lists in workbook cells (`source_ids`, dependency pointers and category lists) use
JSON arrays, never comma splitting. Structured evidence is serialized as linked
stable-ID tables in Operations, with `record_kind`, `parent_pointer`, `row_id` and
the exact member columns below. Parent envelopes have common review/source columns.
Never encode a whole evidence object as unvalidated prose or discard its raw facts.

### Structured operating values

`operations.service_mix` is `ProfileField<ServiceMixRow[]>`, unit `record_list`:

```ts
type ServiceMixRow = {
  row_id: string; trade: 'HVAC' | 'plumbing' | 'other';
  service_kind: 'repair' | 'installation' | 'maintenance' | 'other';
  description: string; comparable_job_definition: string;
  pool_id: string; // explicit owner-identified compatible technician/vehicle pool
  historical_row_ids: string[];
  completed_jobs: number | null; service_revenue_usd: number | null;
  source_ids: string[];
};
```

Names/descriptions/IDs/enums use text; optional detail counts are `jobs` summed over
referenced matching history periods, and revenue is USD summed over those periods
(not an invented monthly observation). Null optional mix detail means not supplied,
never zero; parent review/source coverage and actual referenced dates remain. Counts
must be finite/nonnegative; supplied mix totals reconcile to their history coverage.
At least one reviewed row and confirmed compatible job definition/pooling are required.
Unsupported trade/pool mixtures remain drafts and block initial compilation.

`operations.workforce_availability` is `ProfileField<WorkforceAvailability>`,
unit `record`:

```ts
type WorkforceAvailability = {
  declaration: 'none' | 'itemized' | 'unknown';
  constraints: {
    row_id: string; people: number;
    kind: 'part_time' | 'absence' | 'ramping' | 'skill_pool' | 'crew' | 'other';
    available_fraction: number | null; productivity_fraction: number | null;
    pool_id: string | null; description: string; source_ids: string[];
  }[];
};
```

`none` requires an empty list and explicit reviewed confirmation that employed
service technicians are fully available/productive in the modeled pool. `unknown`
blocks confirmation. `itemized` requires at least one row, preserving whole affected
headcount (`people`), fractions in [0,1] where known and actual constraints. Null
fractions preserve unknown facts, never default to 1. Overlapping constraint rows
may describe the same people; do not sum them or multiply capacity reductions twice.
Initial compilation blocks itemized unsupported cohorts; this shape does not invent
part-time/ramp scheduling or authorize an approximation.

`operations.demand_evidence` is `ProfileField<DemandEvidence>`, unit `record`:

```ts
type DemandEvidence =
  | { kind: 'measured'; observations: {
      row_id: string; period: string; requested_jobs: number;
      unserved_jobs: number | null; service_mix_row_ids: string[]; source_ids: string[];
    }[] }
  | { kind: 'reviewed_estimate'; period_start: string; period_end: string;
      estimated_jobs_per_month: number; method: string; limitations: string;
      service_mix_row_ids: string[]; source_ids: string[] }
  | { kind: 'confirmed_no_unserved'; historical_row_ids: string[];
      rationale: string; source_ids: string[] };
```

Measured rows use actual `YYYY-MM` periods and nonnegative finite job counts
(`jobs/month`); null unserved count is unavailable evidence, never confirmed zero.
Estimates use ISO period dates, reviewed jobs/month and explicit method/limitations;
the parent remains `reviewed_estimate`. No-unserved evidence requires confirmed
owner/source review over explicit history rows; it does not by itself calibrate base
demand, growth or seasonality. Base demand remains a separate required reviewed
input. Referenced source/mix/history IDs must exist in this revision. Empty measured
observations or an empty no-unserved coverage list are invalid. Required evidence
cannot be satisfied by an unknown envelope or prose without typed source coverage.

### Derived historical ticket outside required input envelopes

Exact location: `review_projection.historical_tickets[]`, a server-generated review
view, never an editable/importable profile fact and never part of the preview payload.
It belongs to the review-response root beside `profile` and `eligibility`, not
to the editable profile payload. The projection carries `profile_id`, `revision`
and `mapping_version` so a UI cannot reuse tickets from another draft. One row per
dated history row; recompute from exact revision source facts:

```ts
type HistoricalTicket = {
  history_row_id: string; period: string; unit: 'USD/job';
  mapping_version: 'company-mapping-2-draft'; source_ids: string[];
  dependencies: string[]; // stable pointers to service_revenue and service_jobs
} & (
  | { status: 'available'; value: number; reason: null }
  | { status: 'unavailable'; value: null;
      reason: 'zero_jobs' | 'inputs_unreviewed' | 'source_conflict' }
);
```

Positive comparable jobs plus reviewed/reconciled service revenue yield revenue/jobs.
Zero jobs and zero service revenue yield `unavailable/zero_jobs`, not unknown, zero
or not applicable. Zero jobs with nonzero service revenue yield unavailable with
`source_conflict` and a separate blocking reconciliation issue. Missing/unreviewed
inputs yield unavailable with `inputs_unreviewed` plus normal required-field blockers.
Available ticket cannot bypass comparable-pool/source reconciliation. P2 may export
this projection as read-only review columns, tagged with status/reason and revision;
import ignores/recomputes it rather than trusting uploaded derived values.
`operations.forecast_ticket` remains a separately required reviewed input. Weighted
historical derivation uses sums across disclosed compatible positive-job periods;
exclude unresolved zero-job revenue conflicts, never silently discard their revenue.

P1/P2: review these exact revision-2 corrections. P2's `b29bb7c` column draft can
now bind unit literals, structured detail tables and the read-only ticket projection.
No broader policy or engine review is requested; authoritative intake encoding and
workbook generation still follow specific shared agreement.
