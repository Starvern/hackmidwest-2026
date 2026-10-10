# Person 2 interface review and next handoff

Status: operational proposal ready for Persons 1/3 review; joint acceptance pending.
Stack: pure TypeScript engine, SvelteKit server routes, authoritative Zod types owned by Person 3.

Person 1 approved the fixture policies in [issue #2](https://github.com/Starvern/hackmidwest-2026/issues/2#issuecomment-6101606666).
Person 2 agrees with recruitment at decision start, full payroll from employment,
configured activation delays, four-month 25/50/75/100% ramp, no vehicle operating
cost before service, and exact marketing lag including the post-spending tail.
Maintenance depreciation begins in the spend month; the earlier Person 1 next-month
proposal is superseded. No schema or engine implementation is accepted by this document.

## Proposed internal types (Person 3 encodes after review)

```ts
interface TechnicianCohort {
  id: string;
  decision_id: string | null; // null for initial workforce
  stable_investment_key: string | null;
  quantity: number;
  employment_start_month: number; // 0 for fully productive initial cohort
  ramp_months: number; // 0 for initial cohort
  annual_loaded_cost_per_person: number;
}
interface VehicleCohort {
  id: string;
  decision_id: string | null;
  stable_investment_key: string | null;
  quantity: number;
  in_service_month: number; // 0 for initial fleet
  annual_opex_per_vehicle: number;
}
interface CampaignDemand {
  id: string; // stable decision/spend-month identity
  decision_id: string;
  stable_investment_key: string;
  spend_month: number;
  demand_month: number;
  potential_jobs: number; // already adjusted by path-specific effectiveness
}
interface OperationalState {
  technician_cohorts: TechnicianCohort[];
  vehicle_cohorts: VehicleCohort[];
  pending_campaign_demand: CampaignDemand[];
}
interface MarketFactors {
  demand_multiplier: number;
  ticket_multiplier: number;
  wage_multiplier: number;
  vehicle_opex_multiplier: number;
  overhead_multiplier: number;
  service_variable_cost_multiplier: number;
  other_revenue_multiplier: number;
  other_direct_cost_multiplier: number;
}
interface DecisionRisk {
  in_service_delay_months: number | null;
  hiring_delay_months: number | null;
  ramp_months: number | null;
  lead_to_job_lag_months: number | null;
  marketing_effectiveness_multiplier: number;
}
interface PathRisks {
  by_stable_investment_key: Record<string, DecisionRisk>;
}
interface PurchaseTransition {
  decision_id: string;
  stable_investment_key: string;
  quantity: number;
  cost_per_unit: number;
  in_service_month: number;
  funding: Funding;
}
interface EmploymentTransition {
  decision_id: string;
  cohort_id: string;
  quantity: number;
}
interface ServiceTransition {
  decision_id: string;
  cohort_id: string;
  quantity: number;
}
interface CampaignSpend {
  decision_id: string;
  stable_investment_key: string;
  spend_month: number;
  amount: number;
  demand: CampaignDemand;
}
interface MonthEvents {
  month: number;
  purchases: PurchaseTransition[];
  employment_starts: EmploymentTransition[];
  vehicle_activations: ServiceTransition[];
  campaign_spending: CampaignSpend[];
  campaign_demand: CampaignDemand[];
  employed_technicians: number;
  productive_technician_fte: number;
  in_service_vehicles: number;
  financial_inputs: FinancialMonthInputs; // Person 1 proposal in issue #2
  ending_operational_state: OperationalState;
  events: ModelEvent[];
}
```

Persistent cohorts include scheduled future employment/service dates. Active counts are
derived by month; no events are rebooked from those cohorts. Recruitment is charged only
at decision start. Initial workforce/fleet are separate cohorts with null decision identity.
Campaign spending creates one pending demand item; it is consumed in its demand month,
including zero-lag in the spend month. Expired items are removed. Out-of-horizon demand
does not produce jobs inside the horizon. The runner calls months exactly once in order
and checks `prior_state.month === month - 1`; scheduler rejects month 0. All state is copied.

Neutral market factors are all 1 and exclude deterministic growth/seasonality. Empty
`by_stable_investment_key` means configured deterministic delays/ramp and effectiveness 1.
Risk overrides are resolved once per path/action, reused every month; irrelevant fields
are null. Reject unknown investment keys, negative/fractional delays and nonfinite or
negative multipliers. Distinct keys are independent; reused keys require matching actions.
MC must reject empty distribution configuration, despite explicit deterministic neutrality.

## Proposed signature change to resolve cost ownership

```ts
schedule_month(company, scenario, month, path_risks, prior_state, market_factors): MonthEvents
calculate_operations(company, prior_state, month_events, market_factors): OperationsResult
calculate_financials(company, prior_state, operations, month_events): FinancialStepResult
```

Adding explicit `market_factors` to scheduler is a coordinated internal signature proposal,
not a silent contract change. Runner supplies the same month's factors to both functions.
Scheduler resolves cohort payroll from full employed headcount, vehicle running cost from
active fleet, deterministic annual growth and relevant cost multipliers exactly once into
`financial_inputs`. Other-revenue is an exogenous cost/revenue driver, never calculated
from jobs in scheduler. Operations resolves demand/seasonality, ticket and constrained jobs;
financials alone calculates service revenue, statements, debt, depreciation and cash.

Annual cost bases are reference-month values, including new hires; apply the agreed
`(1 + annual_rate) ** ((month - 1) / 12)` once, not a second cohort-age inflation factor.
Vehicle opex has no separate deterministic inflation input; use its reference rate times
the explicit vehicle multiplier. Maintenance additions remain Person 1's responsibility:
create exactly one asset per monthly maintenance spend inside financials, with unique ID
and spend-month depreciation. Scheduler supplies maintenance CapEx but no maintenance
asset addition. `asset_additions` carries growth/truck additions only; Person 1/P3 must
confirm this clarification to the initial FinancialMonthInputs proposal to avoid duplication.

Incremental investment outlay includes growth CapEx, recruitment, incremental marketing,
and full new-hire payroll. It excludes initial workforce, baseline maintenance, financing,
principal and depreciation. Person 2 agrees with Person 1's absolute payback tolerance
1e-6 and first-recovery/reversal rules; engine identities use abs 1e-6 plus rel 1e-12.

## Provenance and hashing review

Company pointers are rooted at company; decision pointers at each decision. Cover every
scalar leaf including identity/calendar, excluding provenance itself and empty containers.
Units: USD for historical period amounts/balances/acquisition costs; USD/year or USD/month
for rate inputs; USD/job for ticket; jobs/month for demand/history; jobs/resource/day for
productivity; days/month for working days; count for headcount/vehicles; months for delays/terms; calendar_month_index
for calendar position; decimal_rate for interest/growth/tax; multiple for seasonality and
valuation; label for string identity/enums. Existing manifest uses this vocabulary.

Agree with Person 1's proposed hashing rules: Person 3 owns shared canonicalization and
SHA-256; normalize negative zero, reject nonfinite values, preserve finite JS precision,
sort object keys and scenario/decision collections by unique IDs only for hashing; preserve
time/seasonality order. Include validated inputs, resolved policies, provenance, versions,
MC settings; exclude run IDs/timestamps/presentation names. Per-path hashes exclude other
scenarios; response hash covers the request. Person 3 must finalize exact implementation.

## Exit and next work

1. Persons 1/3 review the proposals above, especially scheduler factors and asset ownership.
2. Person 3 commits authoritative Zod/internal types and generated contract artifacts.
3. Person 2 runs fixture validation against that schema; all owners identify the accepted
   dependency revision; Person 1 records checkpoint acceptance.
4. Person 2 implements scheduler/operations and OP/TIME tests, then delivers one real
   month to Person 1. No dashboard/MC or Gate A/B freeze is implied by this checkpoint.

## Executable candidate validation evidence

Person 2 integrated exact candidate `0177c63` (`checkpoint-1-candidate-1`) via
fast-forward and reviewed the internal schemas/function aliases against this proposal.
Cohort persistence, units, sixth scheduler argument, growth-only additions and financial
return wrapper match the reviewed implementation plan. Person 2 accepts this candidate
from the operations/fixture side; Person 1 records final joint acceptance separately.

Local environment: Windows, Node 22.20.0, npm 11.12.1. Installed candidate lockfile with
`npm ci --ignore-scripts --no-audit --fetch-retries=0`, using process-local
`NODE_OPTIONS=--use-system-ca` to resolve certificate trust without disabling TLS checks.

Passed: `npm run fixture:contract`, `node scripts/validate_fixture.ts`, `npm test`
(artifact drift, TypeScript boundary checks, 11 tests), `npm run check` (0 errors/warnings),
and `npm run build`. The actual fixture was validated without altered input values.

Windows checkout converted generated artifacts to CRLF, causing the first byte-for-byte
drift check to fail. `npm run contracts:generate` restored LF; Git showed no content
changes, and the full test then passed. Person 3 should make drift checks tolerate
checkout line endings or pin generated artifacts to LF for clean-checkout reproducibility.
No schema edits or generated artifact changes are included in this evidence update.
Build uses adapter-auto; hosting adapter selection remains future deployment work.

Authoritative fixture validation is complete against the candidate. Checkpoint closure
and full deterministic Gates A/B still require their separately documented acceptance.
