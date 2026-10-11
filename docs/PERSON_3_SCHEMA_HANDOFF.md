# Person 3 — Checkpoint 1 executable contract candidate

Status: candidate for Persons 1/2 review, not joint acceptance. Interface revision
`checkpoint-1-candidate-1`; schema version `1.0`, model `mvp-1.0`, public contract
revision `1` remain distinct. Working branch `codex/contracts-api`, published to
`luke`. The handoff comment in issue #2 identifies the exact dependency commit.

## Owned changes and imports

- `src/lib/server/schemas.ts`: authoritative strict Zod schemas for all shared
  public inputs/results and the reviewed internal interfaces; inferred types are
  generated into `contracts/contracts.ts`.
- `src/lib/server/validation.ts`: JSON Pointer coverage/units, unique IDs, economic
  investment-key reuse and canonical JSON serialization.
- `src/lib/server/fingerprint.ts`: SHA-256 request/scenario fingerprints.
- `contracts/engine.ts`: reviewed scheduler, operations and financial function types.
- `contracts/*.schema.json`, `contracts/schemas.json`: generated JSON Schema shapes.
- `scripts/contracts.ts`, `scripts/example_request.ts`: deterministic artifact generation
  and drift checks; `scripts/validate_contract_fixture.ts`: strict fixture validation.
- `tests/contracts.test.ts`, `tsconfig.contracts.json`, npm scripts/Node type definitions.

Engine modules import types from `contracts/contracts.ts`, runtime schemas from
`src/lib/server/schemas.ts`, and function type aliases from `contracts/engine.ts`.
Relative imports should resolve to those single definitions; do not copy schemas.
Type-only imports do not add server code to browser bundles.

## Coordinated internal changes

```ts
schedule_month(company, scenario, month, path_risks, prior_state, market_factors): MonthEvents
calculate_operations(company, prior_state, month_events, market_factors): OperationsResult
calculate_financials(company, prior_state, operations, month_events): FinancialStepResult
```

The scheduler's sixth argument is new. Financials now returns both public
`financials: FinancialResult` and `ending_financial_state: FinancialState`.
The runner composes `EngineState` from that financial state and scheduler's
`ending_operational_state`. Public monthly financial fields are unchanged.
Scheduler asset additions are `GrowthAssetAddition[]` only; financials exclusively
creates maintenance additions. These are breaking changes to the original semantic
internal signatures, coordinated in issue #2; no implemented engine consumer existed
on this dependency branch. Persons 1/2 must implement against this candidate before
joint acceptance. No forecast implementation or route business logic is included.

Cohorts and pending campaigns persist; IDs are unique within their collections.
Derived employment/service/demand dates can exceed 60. Monthly step and request
start months remain 1–60; initial cohorts can start at 0. Runner/scheduler must enforce
sequential steps, once-only transitions, copied inputs, and the approved timing.
`validatePathRisks` checks risk keys/irrelevant overrides against validated decisions;
shape parsing alone cannot check that context. `NEUTRAL_MARKET_FACTORS` is explicitly
all ones; an empty risk map preserves configured deterministic values.

## Explicit approved policies

`ApprovedPoliciesSchema` and `APPROVED_POLICIES` encode the policy identifiers and
tolerances approved by Person 1 in issue #2. They add no schema defaults. Fingerprint
functions require an explicit resolved policy argument. Numeric company/decision
assumptions remain required inputs with provenance. Financials owns their calculations.

Maintenance depreciation begins in spend month, over 60 months; pending trucks do
not depreciate or consume remaining life until service. Existing asset schedules are
the only existing-depreciation charge. New debt first interest/principal is purchase
month + 1. Growth uses calendar `(month - 1) / 12`; no cohort-age growth. Recruitment
is charged at start, full hire payroll from employment, marketing has exact lag/tail.
Taxes apply to positive pretax income only; distributions are zero. No new policy
was invented by this implementation.

## Hash projection

`fingerprintRequest(company, request, policies)` validates inputs and hashes all
scenarios. `fingerprintScenario(company, request, policies, scenarioId)` uses the same
common settings/company/policies and only the selected scenario. This still validates
the whole request; other *valid* scenarios do not affect the per-scenario hash.

Hash inputs include schema/model/public contract/interface revisions, company,
request settings, resolved policies, relevant provenance and explicit MC settings.
Deterministic requests have no MC settings; they cannot accept a `monte_carlo` field.

Normalize negative zero, reject nonfinite/non-JSON values, retain finite JS numeric
precision with JSON numeric serialization, recursively sort object keys and sort
scenario/decision collections by ID using locale-independent code-unit ordering.
Preserve all other array order, including historical/time/seasonality and debt/asset
arrays. Hash-only projections remove company/scenario/decision presentation names
and matching `/name` provenance entries at those scopes. They do not remove arbitrary
nested names, IDs, or other provenance. No mutation, cent rounding or cache is used.
Run IDs/timestamps are outside the input schemas and never hashed.

## Provenance and validation limits

Company pointers are rooted at company, decision pointers at their decision. Every
scalar leaf, including array entries, identity and calendar values, requires exact
unit coverage. Exclude provenance itself and empty containers; reject dangling entries.
Working days uses `days/month`, corrected by P2 at `1de4c32`; other vocabulary follows
P2's checkpoint. Identity/enums use `label`; acquisition decision costs retain the
reviewed `USD` convention; ticket uses `USD/job`.

JSON Schema artifacts capture structural bounds, required fields and unions. Zod
cross-field refinements additionally enforce coverage/units, IDs, baseline/reuse,
ordered histories/months, status/null consistency and result relationships. JSON
Schema alone does not replace runtime parsing. Tests verify artifact freshness and
compile the inferred type boundary. The generator and dependency lock must be kept
in sync when updating Zod.

Distribution families remain a syntax vocabulary, not an approved MC configuration.
Nonempty company distribution parameters require an approved parameter-unit manifest
before validation can accept them. Empty distribution settings reject MC fingerprint
execution. MC response shape validation is present, but runner/aggregator validity,
paired draw semantics and denominator reconciliation require Gate C engine tests.
No MC endpoint, sampling implementation, risk outputs or performance claim is supplied.

Runtime schemas do not calculate financial identities, forecast values, project payback
or fixture annual reconciliation. P2's reconciliation script and P1's invariant tests
remain required in addition to schema checks. Structural zero-valued response objects
in tests are explicitly test data; no `example-result.json` is fabricated.

## Verification and examples

Verified on Node 24.4.0/npm 11.4.2:

```sh
npm test
npm run fixture:contract
node scripts/validate_fixture.ts
npm run check
npm run build
```

`npm test` runs artifact drift checks, strict TypeScript checks and 11 passing API/
contract tests. Actual P2 fixture `1de4c32` passes Zod and P2 reconciliation. Svelte
check reports zero errors/warnings; production build passes. Adapter-auto still needs
a deployment target when hosting is chosen. A clean temporary dependency install
using the candidate lockfile (`npm ci --ignore-scripts`) passed with zero reported
vulnerabilities; lifecycle scripts were excluded because that directory contains
only the npm manifests, not a full application checkout.

`contracts/example-request.json` is a validated illustrative baseline/truck-only/
combined request, with provenance and matched truck investment keys. Regenerate via
`npm run contracts:generate`. GET `/api/v1/health` still returns HTTP 200 with
`{"status":"ok","simulation_ready":false}`. Simulation endpoints await real engines.

## Required next review

P2 validates the fixture against the exact published candidate commit and reports
commands/results. P1 reviews executable interfaces/policies and both owners' evidence,
then records the accepted commit/revision. Until then Checkpoint 1 is open. Full Gates
A/B require reconciled deterministic engine results and a complete real response;
Gate C (MC), Gate D (dashboard) and Gate E remain pending.
