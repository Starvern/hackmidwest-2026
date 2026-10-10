# Person 3 — Separate MC contract candidate

Based on P1 parameter/design approval in issue #2 comment 6102447792 and exact
P2 manifest/foundations `e638380`. The company fixture, CompanyInput runtime
schema, deterministic interface `checkpoint-1-candidate-1`, fingerprints and
computed reference remain unchanged. P3 encoded the actual separate proposed
manifest without changing any P2 parameter, unit or provenance entry.

## Candidate ownership and versions

- P2 owns `data/monte-carlo-config.proposed.json`, sampling and aggregation.
- P3 owns `src/lib/server/monte-carlo/{contracts,config,fingerprint,result}.ts`,
  generated separate artifacts and boundary tests.
- P1 owns monthly valuation-vector consumption and any accounting/runner change.
- Versions retain P2's exact proposed literals: config `mc-config-1-proposed`, sampler
  `sha256-mulberry32-boxmuller-1`, execution `mc-execution-1-proposed`.
  Returned extension candidate is `mc-result-1-proposed`. These are separate from
  deterministic version identifiers and require affected-owner review before product use.

`loadMonteCarloConfig()` imports and validates the proposed JSON in the server
bundle and returns independent objects. It is a candidate/internal loader, not
Gate C approval or a way to enable current HTTP execution. Company distributions
stay empty and existing rejection of unapproved nonempty company settings remains.

## Executable schema and units

`MCConfigSchema` encodes exact known keys, no coercion/defaults, finite values,
positive factor bounds, ordered triangular min/mode/max, discrete integer offsets
with unique values, matched array lengths and probabilities totaling 1 within
absolute 1e-12. It validates |rho| < 1, nonnegative innovation/loading, macro initial
state within bounds, forecast updates exactly 1/13/25/37/49, request-expanded
positive valuation bounds and explicitly neutral fixed factors.

MC-local unit resolution requires complete scalar JSON Pointer coverage and rejects
missing/dangling/wrong-unit provenance. Strings/booleans use label; macro scalars
use dimensionless; update dates forecast_month_index; offsets months; probabilities
probability; mapping/shared/effectiveness/fixed factors multiple, matching P2's exact
manifest. No company unit vocabulary was widened. Structural validation of another
configuration is not approval of its assumptions; the loader exposes only the reviewed
candidate data. Zero-width configurations are supported for internal identity tests.

`MCValuationMultiplesSchema` supplies an exactly-60 positive finite readonly vector
for P1/P2's coordinated execution boundary. P1 still owns wiring month m to m-1;
this commit does not modify engine valuation or simulate sampled paths. Resolved
sampled delay/ramp safe-integer checks remain P2 sampling/scheduler responsibilities.

## Hashing and returned result extension

MC-only functions:
- `fingerprintMonteCarloConfig(config)` hashes the entire validated config/provenance.
- `fingerprintMonteCarloRequest(company, request, policies, config)` wraps the existing
  deterministic request hash with an MC domain, result-extension version, runs/seed
  and full validated config including config/sampler/execution versions.
- `fingerprintMonteCarloScenario(..., scenarioId)` uses the corresponding existing
  per-scenario hash; other valid scenarios do not enter the projection.

Random streams must continue using P2's stable seed/run/risk/action tuples, never
these request fingerprints. Deterministic helpers are unchanged and their reference
fingerprint is explicitly regression-tested.

`MCResultExtensionSchema` is a **separate proposed envelope**, not a silent revision
of `SimulationResult.monte_carlo` or an already published HTTP response. Fields:
extension/schema/model/contract versions, run/company IDs, runs/seed, config/sampler/
execution versions, config/input fingerprints, full configuration, scenarios,
comparisons and payback_counts. Scenario/comparison shapes reuse accepted schemas.
P2's exact `payback_counts[id]` has reached_count and subsequent_reversal_count;
not-reached/not-applicable counts remain in scenario.payback. The validator reconciles
those counts/median, baseline inapplicability and every valid/unavailable denominator
to total runs, and verifies the config fingerprint. All comparison/scenario keys agree.

`validateMonteCarloResult(result, company, request, policies, config)` additionally
checks company, runs, seed, full configuration/fingerprints and request scenario IDs.
It checks a future real runner's output; it never manufactures results. P1/P2 should
review this separate envelope/metadata placement before a route consumes it.

## Reproducible artifacts and evidence

`node scripts/monte_carlo_contracts.ts [--check]` generates/checks
`contracts/monte-carlo.ts` and individual `MC*.schema.json` artifacts. Integrated
with existing npm contract generate/check scripts and strict TypeScript checks.
JSON Schema expresses structure; Zod remains required for cross-field validation.

Passing validation: `npm test`, `npm run check`, `npm run build`. Tests cover actual
manifest, malformed bounds/arrays/units/provenance/versions, zero-width representation,
config/settings/provenance hash sensitivity, per-scenario isolation/order/addition,
frozen deterministic hash, valuation vector bounds, P2 aggregation-shaped result counts
and contextual mismatch rejection. Aggregation transport tests repeat the deterministic
reference 2,000 times solely to exercise schema denominators; these are neither sampled
forecasts nor a runner performance benchmark.

## Next handoff

P1/P2: review the exact candidate representation, units/version literals, separate
result envelope and functions. P1 supplies valuation-vector wiring; P2 can consume
this loader/config/vector validation in its actual sampled runner after representation
review. P3 connects background execution/API only against the measured accepted runner.
No MC endpoint, worker, stochastic reference, risk bands/probabilities, benchmark or
Gate C completion is introduced. Deterministic dashboard/readiness stays available.
