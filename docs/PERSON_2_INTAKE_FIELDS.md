# P2 operating intake fields and acceptance examples

Draft handoff based on P1 policy confirmation `821861f`, P2 operating review and
implementation `acfba83`. Field names below are proposed intake identifiers, not
authoritative Zod fields or an implemented import format. Shared owner must map
them into the versioned profile contract before a workbook/importer is finalized.
No runtime or gate acceptance changes are made by this document.

## Common field envelope and dates

Every entered fact/estimate needs value, unit, applicable period/as-of date,
source reference, and state (unknown / entered / reviewed estimate / confirmed /
not applicable, with final vocabulary owned by the shared contract). Explicit
zero is a value, not missing. Preserve raw value/unit, normalization, reviewer and
revision. Derived values retain source dependencies and formula/mapping version.
An incomplete draft is allowed; unsupported or missing required facts block
compilation. No default demo numbers. No real company data in repository fixtures.

Initial supported opening date: December 31, with 12 contiguous observations for
the immediately preceding January–December and forecast starting the next January.
Preserve actual years. January demand seasonality is index 1 in intake, index 0
in the current engine array. Dates/industry validation and company/job binding
remain shared-owner implementation dependencies.

## Proposed questionnaire and columns

| Proposed identifier | Owner question / unit | Requirement and mapping |
| --- | --- | --- |
| `job_definition` | What counts as one completed service job? | Required description; define repairs/installs/multi-day work and completion recognition. |
| `service_mix` | Which services/trades do you perform? | Preserve lines and any counts/revenue; plumbing/mixed not currently supported merely by changing industry text. |
| `pooling_suitable` | Can the pooled team and fleet reasonably serve these comparable jobs? | Explicit confirmed suitability or unsupported outcome; no silent skill/crew substitution. |
| `service_technicians_employed` | How many employed service technicians at opening? / people | Whole nonnegative count; exclude office staff; target `operations.technicians` only if starting-cohort eligibility passes. |
| `workforce_availability` | Any part-time, absence, ramp, skill or crew constraints? | Required facts or confirmed none; preserve actual availability separately from headcount. Unsupported cohorts block unless a specific approximation is reviewed. |
| `service_vehicles_available` | How many service vehicles are in service and available? / vehicles | Whole nonnegative count; exclude office/out-of-service vehicles; target `operations.vehicles`. |
| `working_days_per_month` | How many working days in a representative month? / days/month | Reviewed nonnegative figure; current engine uses one constant, not varying monthly calendars. |
| `jobs_per_technician_day` | Realistic jobs completed per productive technician/day? | Reviewed nonnegative rate; target `max_jobs_per_tech_per_day`; disclose crew/job-duration adjustment. |
| `jobs_per_vehicle_day` | Realistic jobs supported per service vehicle/day? | Reviewed nonnegative rate; target `max_jobs_per_vehicle_per_day`; avoid a second reduction for an already accounted constraint. |
| `monthly_completed_jobs` | Jobs completed in each dated historical month? / jobs | Twelve observations or explicitly reviewed representative estimate, with evidence/limitations. Never silently fabricate monthly history from an annual count. Historical schema implications remain shared review. |
| `monthly_service_revenue` | Earned revenue for those comparable service jobs? / USD/month | P1 financial-history mapping; keep non-service sales separate; preserve accounting basis. |
| `historical_ticket` | Derived revenue per comparable completed job? / USD/job | Derived, not required user entry. For positive jobs, revenue/jobs; zero jobs => unavailable. Revenue with zero jobs requires classification/timing review. |
| `forecast_ticket` | Typical service revenue per job at forecast start? / USD/job | Separately reviewed assumption; map `average_ticket`. If using history, use sum revenue / sum comparable jobs with disclosed included periods. |
| `demand_evidence` | How many jobs were requested, including work turned away? | Required measured source, reviewed estimate, or confirmation of no unserved work; completed jobs alone insufficient under a bottleneck. |
| `base_monthly_demand` | Representative demand before seasonal factors? / jobs/month | Reviewed nonnegative value; target `base_monthly_job_demand`; separate from monthly observations and growth. |
| `seasonality_factors` | Relative demand for each calendar month? / dimensionless | Twelve nonnegative factors, mean 1. Retain raw factors and disclosed normalization; all-zero set invalid. Flat factors require explicit confirmation, not an automatic fallback. |
| `loaded_technician_cost` | Annual total employer cost per service technician? / USD/person/year | Reviewed nonnegative value; include benefits/employer costs; target `technician_loaded_cost_per_year`. P1 reconciles to payroll allocation. |
| `fleet_operating_cost` | Annual operating expense per service vehicle? / USD/vehicle/year | Reviewed nonnegative value; exclude debt service, depreciation and purchases; target `vehicle_opex_per_year`. |
| `forecast_changes` | Expected demand/ticket/payroll changes? / annual fractions | Owner-reviewed assumptions mapped to growth/inflation fields; no silent fit from one year. |

Do not multiply historical jobs by historical ticket to replace statement revenue
without resolving differences. Forecast base demand and ticket are assumptions,
not a promise that a constant run rate recreates every historical observation.
Current capacity is the minimum of technician and fleet throughput; there is no
multi-trade assignment or overtime model. Zero resources are valid facts but yield
zero modeled service capacity and require a visible baseline review.

## Existing expense ledger coordination

Proposed row columns: stable row ID, name, category, source period, raw amount,
currency/unit, frequency, coverage dates, source reference, mapping target,
mapping mode (replace total / included detail), normalized recognition amount,
allocation policy, review state and irregular-cash-timing flag. P1/shared owner
finalize financial semantics and column names. Monthly buckets include expenses
once; payroll/fleet allocations and baseline marketing must reconcile without
duplication. Principal, interest, CapEx and depreciation map to separate schedules.
Material irregular payment timing blocks compilation until supported. New
alternative expenses are not baseline ledger entries. Show inflation/MC treatment
of compiled baseline buckets explicitly.

## Known-answer acceptance examples for future implementation

These are synthetic specifications, not currently executed tests.

| Case | Inputs | Expected result |
| --- | --- | --- |
| Capacity bottleneck | 10 techs, 8 vehicles, 20 days, 3 jobs/day for each; demand 600 | Tech capacity 600, fleet 480, completed 480, unserved 120. Do not reset demand to 480. |
| Spare capacity | Same resources; demand 400 | Completed 400, spare capacity 80; more vehicles alone cannot create sales. |
| Weighted ticket | Comparable periods: 10 jobs/$1,000 and 30 jobs/$6,000 | Aggregate ticket $175, not mean of $100 and $200 ($150). |
| Zero-job period | 0 jobs/$0 service revenue | Historical ticket unavailable. Require reviewed forecast ticket; preserve zero jobs. |
| Inconsistent zero-job revenue | 0 completed jobs/$500 service revenue | Classification/recognition review; do not divide, assign infinite ticket or discard revenue. |
| Seasonal normalization | Raw factors six 1s and six 3s | Disclosed normalization gives six 0.5s and six 1.5s; mean 1. Base demand 100 gives 50/150 before growth. |
| Invalid seasonality | Twelve zero factors, negative factor or missing month | Block normalization/compilation; no invented flat set. |
| Unsupported workforce | 10 employed people, two part-time and one ramping | Preserve facts; do not compile as 10 fully productive techs without reviewed approximation or support. |
| Incompatible pools | Separate skills/crews for installations and repairs | Block pooled-model compilation absent suitability/support; do not infer capacity from combined count. |
| Zero fleet | Positive technician count, zero vehicles | Capacity/completed jobs zero; surface baseline limitation, never insert a demo vehicle. |
| Duplicate expenses | Overhead $10,000 includes $1,000 subscription | Included detail leaves $10,000 overhead; replacement reconciles details. Never $11,000. |
| Duplicate marketing | Overhead $10,000 includes marketing $2,000 | Overhead remains $10,000; marketing disclosure not another charge. |
| Payroll allocation | Source total includes service and office wages | Service cost mapped once to tech cost; office portion once to overhead; unresolved allocations block. |
| Irregular existing cash | Annual prepaid bill with materially different payment date | Preserve source/allocation; block exact-cash claim pending scheduling. Do not present monthly averaging as actual timing. |
| Date boundary | Opening 2026-12-31, history 2026-01..12 | Forecast 2027-01; valid initial date scope. Missing/duplicate month or June opening blocks initial compilation. |
| Missing versus zero | Unknown vehicle cost versus confirmed $0 | Unknown blocks required-field completion; confirmed zero remains $0 with provenance. |
| Company isolation | Profiles A/B, revisions A1/A2 | Results/jobs bind exact snapshot; edits stale old results. Recorded demo MC cannot appear as company A risk. Shared API acceptance obligation. |

## Remaining contract decisions

Shared owner must publish canonical field/envelope names, eligibility/error
representation, profile/mapping versions, actual dated-history representation,
provenance vocabulary, company revision binding and supported industry scope.
P1 owns financial reconciliation tolerances and exactly representable debt
validation. P2 reviews the operating projection and these cases against that
proposal, then supplies the matching template. This document is sufficient for
column planning but does not authorize bypassing those shared contracts.
