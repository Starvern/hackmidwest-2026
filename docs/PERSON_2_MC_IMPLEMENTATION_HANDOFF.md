# Person 2 Monte Carlo foundations and exact manifest handoff

Dependency: deterministic Gates A/B accepted at `2f146e9`, record `f16523e`.
P1 approved numerical settings/design in issue #2 comment `6102447792`.
The executable config representation and MC execution extension remain for P3/P1 review.

## Exact proposed configuration

`data/monte-carlo-config.proposed.json` is a separate proposed manifest, not CompanyInput
and not accepted for live MC execution. It contains explicit `config_version`,
`sampler_version`, `execution_version`, macro settings, mapping definitions, shared
triangular factors, action-specific triangular/discrete distributions and fixed factors.
Each discrete distribution uses real `values`/`probabilities` arrays. Every scalar leaf
has rooted JSON Pointer provenance; no numeric key encoding or implicit defaults.

Person 3 owns authoritative types/validators/loading and the final version literals.
Proposed additional unit labels are `dimensionless`, `probability` and
`forecast_month_index`; `multiple`, `months` and `label` retain their documented meanings.
These are proposals for this separate scope, not changes to the company unit resolver.
Validate probabilities sum to 1 with absolute tolerance 1e-12, lengths match/nonempty,
triangular min <= mode <= max, finite macro/mapping values, |rho| < 1, positive factor/
valuation bounds, nonnegative spreads/loadings and exact macro update dates 1/13/25/37/49.
Require complete coverage/exclude provenance itself, reject unknown fields/keys and
validate sampled resolved dates as safe nonnegative integers without upper clipping.

Keep deterministic company distributions empty and the frozen deterministic reference
unchanged. P3 must provide separately validated MC manifest loading and MC-only
fingerprint projection rather than forcing this manifest through the current CompanyInput
distribution rejection. MC hashes/returned metadata must include config/execution/sampler
versions and the exact parameter/provenance payload. Existing deterministic hash behavior
must retain regression coverage. Proposed MC result extension also exposes reached_count
and subsequent_reversal_count; current public payback schema lacks those explicit fields.

P1 owns the reviewed monthly_valuation_multiples runner extension; P2 will pass current-year
macro multiples only after that change is available. No change to accepted engine signatures
or public result schemas is made by this foundations delivery.

## Implemented foundations

- `sampling.ts`: deterministic digest-derived Mulberry32 streams with explicit unsigned
  wrapping and open-interval midpoint conversion `(uint32 + 0.5) / 2^32`; Box–Muller
  normal, inverse-CDF triangular, discrete CDF, safe delay/ramp offset resolution.
- Proposed sampler identity `sha256-mulberry32-boxmuller-1`. Shared tuple is
  `[version, seed, run_index, risk_key]`; decision tuple inserts stable investment key
  before risk key. First SHA-256 word is read big-endian. No scenario/display order,
  request fingerprint or unrelated actions affect streams. Seed/run use safe integers.
- `aggregation.ts`: null-aware pointwise interpolated quantiles and mean, eligible-only
  probability denominators, conditional payback median, reached/not-reached/inapplicable
  and reversal counts. Invalid finite observations throw rather than disappear.
- `aggregate_paired_paths(iterable, reserve)` keeps compact observations instead of
  expanded paths; returns internal `{runs, scenarios, comparisons, payback_counts}`.
  It consumes actual engine ScenarioPaths, forms deltas per pair before quantiles,
  keeps opening flow/valuation null, separates opening monthly shortfall from any
  forward-month breach and explicitly treats baseline incremental risk as inapplicable.
  Output scenario shapes use existing validators; outer metadata awaits P3's extension.

These helpers are internal and not connected to an HTTP endpoint. They permit small
synthetic test batches; public MC request validation remains 2,000–5,000. Aggregation
expects accepted engine output and does not independently recreate accounting or
payback. Its test observations are clearly synthetic aggregation data, not forecasts.
No macro-path execution, product runner, complete MC result or benchmark is claimed.

## Verification and next ownership handoff

`tests/monte_carlo_primitives.test.ts` covers stream independence/repeatability, open
uniform bounds, independent inverse-CDF arithmetic, fixed-width identity, offset bounds,
invalid inputs, quantile/mean distinctions, unavailable denominators, reserve monotonicity,
conditional payback/reversals, paired quantiles and forward/opening shortfall separation.
Full engine MC-01–08 and zero-width identity across 60 months remain future evidence.

Next: P3 reviews/encodes separate config + MC result/version projection; P1 publishes
monthly valuation execution input. P2 then samples correlated macro/factors and action
risks, composes the existing paired runner, validates end-to-end zero-width/paired paths,
and benchmarks 2,000 x 3 x 60 with runtime/memory. MC readiness stays false until Gate C.
