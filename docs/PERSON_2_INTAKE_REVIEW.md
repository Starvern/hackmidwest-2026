# Person 2 review: business intake

Reviewed P1 specification `5c72207:docs/BUSINESS_INTAKE_SPEC.md` against
P2 implementation `acfba83`. This is a planning review, not intake implementation,
joint contract acceptance, or acceptance of the flexible-investment candidate.

## Confirmed direction

Keep existing company expenses in the compiled company baseline and all plans.
Use `operating_expense` / `purchase_asset` only for new alternative changes.
The runner rejects baseline decisions. Existing equipment and loans belong in
opening schedules, not new purchases. Itemization must replace or explain an
existing category total, never add both. Existing annual/prepaid expenses must
not inherit the candidate's fixed-dollar, same-month cash-payment policy.

Manual entry and spreadsheet import should produce the same reviewed profile.
Preserve missing, confirmed zero, and not applicable as distinct draft states;
do not compile missing values into zero or substitute demo assumptions.

## Operating mapping proposed for the shared contract

| Intake fact | Mapping / required review |
| --- | --- |
| Service job definition, service mix, period | Preserve definition and dated counts. Repairs, installations and multi-day projects cannot silently become interchangeable jobs. |
| Active service technicians | `operations.technicians`: whole employed service headcount; exclude office staff. Current opening cohorts treat all as fully productive. Part-time, ramping, absent or differently skilled staff need an explicit supported approximation or an extension. |
| Available service vehicles | `operations.vehicles`: in-service service vehicles only. Current pool assumes vehicles can serve the pooled jobs. |
| Working days; jobs per technician/vehicle/day | Map to the three capacity inputs with consistent job definitions. Effective rates must disclose crew size, downtime and mixed job durations; do not reduce both headcount and throughput for the same constraint. |
| Completed jobs and service revenue | Preserve monthly values. Weighted ticket = total comparable service revenue / total comparable completed jobs, not mean of row averages. Zero jobs cannot produce a derived ticket; require a reviewed estimate or resolve inconsistent revenue classification. |
| Demand including work turned away | Separate from completed jobs. Require measured demand, an owner estimate, or explicit confirmation of no unserved work. Capacity-constrained completed jobs do not identify underlying demand. |
| Base demand and seasonality | Propose 12 calendar-month factors with mean 1 and a separately confirmed month-1 base demand. The engine multiplies these, so importing seasonal demand and seasonality without normalization can double-count seasonality. Mean-1 is a proposed intake rule, not a current schema invariant. |
| Loaded technician cost | Annual USD per employed service technician, including employer costs/benefits. Full employed payroll is charged even when productive capacity is lower. Reconcile allocated totals; do not include them again in overhead or variable cost. |
| Fleet operating cost | Annual USD per service vehicle, excluding purchase, depreciation and debt service. Reconcile fleet allocation and avoid duplicate fuel/insurance/repair rows elsewhere. |
| Job-variable and other costs | Service variable cost rate excludes the separately modeled technician/fleet costs. Keep non-service revenue and its direct costs separate. P1 owns final classifications and reconciliation. |

Current throughput is `min(demand, productive technician FTE * days * jobs/tech/day,
in-service vehicles * days * jobs/vehicle/day)`. Revenue is completed jobs times
ticket, plus separately modeled non-service revenue. The engine has no job-hour,
crew, service-line, skill or assignment model. A blended service model requires
owner confirmation that this pooling is suitable; incompatible mixes must be
blocked or supported through a reviewed extension. An industry-label change alone
does not make plumbing/mixed operations supported.

Historical monthly observations and the starting forecast run rate are distinct.
Show the reconciliation and explain selected forward assumptions; do not force
all 12 historical months to match a constant opening run rate.

## Existing-expense mapping

Each ledger row needs stable identity, period, source, category, mapping target,
and whether it replaces a total or explains an included amount. Reconcile both
historical categories and the chosen forward baseline; unknown residuals require
review rather than an automatic balancing plug.

Rent, office payroll and subscriptions normally map to fixed overhead subject to
P1 classification. Baseline marketing is an included disclosure, not another
charge. Technician/fleet allocations belong in their specific modeled buckets.
Loan principal, interest, asset purchases and depreciation must not be folded into
operating costs. Existing future cancellations, one-time charges, annual payment
dates or prepayments need explicit scheduling support or a disclosed supported
approximation; current fixed baseline totals cannot reproduce those dates.

Baseline overhead currently receives overhead inflation and MC overhead factors.
New custom expenses remain fixed as entered. The profile must disclose that
difference; a fixed contractual baseline subscription is not individually held
fixed merely because its name is preserved in a ledger.

## Decisions before implementation

1. P1/P2: agree the blended-job definition and eligibility check, weighted ticket
   handling, demand evidence, normalized seasonality, and opening workforce scope.
2. P1: approve expense allocation/reconciliation and treatment of irregular
   existing costs; distinguish historical expense recognition from cash dates.
3. Shared owner: agree versioned draft/confirmed profile and mapping contracts,
   source/provenance vocabulary, date support, and company-aware API/worker/job
   binding. January-only/HVAC-only schema restrictions remain real blockers.
4. Publish the spreadsheet columns against those contracts. Do not implement a
   competing importer or promise arbitrary dates/debt/service mixes beforehand.

Suggested acceptance examples: constrained demand versus completed jobs; weighted
tickets with zero-job months; incompatible service pools; technician/fleet costs
included in an uploaded overhead total; baseline marketing duplication; annual
prepaid costs; zero-resource businesses; incomplete opening workforce information;
and separate companies/results across deterministic and MC jobs.

Evidence: inspected authoritative schemas, operations throughput, scheduler cost
drivers and baseline-decision rejection. No executable code changed and no new
test run or intake/browser acceptance is claimed.
