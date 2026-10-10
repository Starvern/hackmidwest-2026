# Person 2 — sampled runner handoff

Based on Gavin's valuation handoff `cc45bf0`, including Luke's corrected boundary
`3e0fdf6`. Uses the shared proposed MC versions and approved separate manifest.
This is implementation evidence for review, not shared Gate C acceptance.

## Callable interface

`src/lib/server/engine/monte_carlo.ts` exports:

- `sample_shared_path(config, seed, run, requestedMultiple)`: zero-based run index;
  returns the 60 macro states, market-factor rows and valuation multiples.
- `sample_action_risks(config, seed, run, decisions)`: typed validated PathRisks.
- `simulate_monte_carlo(companyValue, requestValue, configValue?, runId?, onProgress?)`:
  validates original company/request/separate configuration, executes all requested
  runs and returns the context-validated separate MC result envelope. The default
  configuration comes from P3's loader; run ID defaults to UUID. Optional synchronous
  progress callback receives completed runs after their observations are aggregated.
  Exceptions propagate; failed runs are never silently discarded or counted as zero.

Execution is synchronous CPU work for a P3-owned background worker, not an HTTP
handler. No endpoint, readiness flag, worker lifecycle or dashboard risk UI changes.

## Sampling and pairing

The five macro updates occur at months 1/13/25/37/49. Each is
`clamp(rho * previous + sqrt(1-rho^2) * spread * normal, lower, upper)`.
One macro stream per seed/run supplies the ordered innovations; each updated state
is held for its forecast-year block. Demand/ticket exponential mappings and current
month valuation use that same state. Valuation bounds expand to include the request.

Wage and vehicle operating-cost triangular draws are fixed once per run and shared
by all scenarios. Marketing effectiveness and service/hiring/ramp offsets use
independent stable-action/risk streams. Different scenarios and decision IDs do not
enter random identities. Offsets resolve from each action's configured timing, floor
at zero and reject unsafe integers without upper clipping. Campaign lag stays fixed.
Neutral overrides are omitted to preserve deterministic event provenance in the
zero-width case; changed overrides retain the scheduler's simulated provenance.

The resolved company copies request reserve/multiple and provenance in the same way
as deterministic execution. Original company/request/config are untouched. Full
original-input fingerprints are precomputed independently of random streams.
Every scenario consumes the same shared factor/multiple vectors. The existing engine
recomputes the correct internal baseline for each alternative; no reuse optimization
or accounting change is introduced. With three scenarios this means five physical
60-month engine paths per run, although the output contains three scenario paths.

Compact observations feed the existing iterator aggregator; expanded paths are
released per run. Pointwise percentiles and paired deltas are separate from full-path
cash-risk counts. Missing valuations and no-investment payback remain explicitly
unavailable/inapplicable. P3's corrected validator binds counts/probabilities/context.

## Verification and reproduction

`npm test` checks artifacts, strict shared types, frozen deterministic reference and
the complete test suite. New runner tests cover independent AR arithmetic, fixed
blocks/bounds, seed/run separation, matched-key/order independence, exact zero-width
months/metrics at requested multiples 3.25/6/9, actual sampled cash/debt/throughput
identities, repeatable real-path aggregation, identical baseline/alternatives,
ordered quantiles, direct full-horizon cash-risk counts, monotone saved-path reserves
and actual negative-TTM paths with eligible/unavailable denominators.

MC-01/02/03/05/06/07/08 are covered by those real-path tests plus existing sampler,
paired-aggregation and boundary regressions. MC-04's thousands-of-path probability
bounds and all quantile ordering are additionally checked on the full benchmark
artifact. Reproducibility tests rerun small real ensembles, not two full 2,000-run
workloads. The benchmark artifact is one measured seed/config realization.

Run `node scripts/benchmark_monte_carlo.ts` from the repository root to execute the
actual 2,000 runs × 3 output scenarios × 60 months at seed 42. It logs progress every
100 runs and writes `data/example-monte-carlo-result.json` and
`data/monte-carlo-benchmark.json` only after complete context validation. Timing covers
sampling, engine execution, aggregation and final validation, excluding final file
serialization. Peak RSS is process high-water memory from Node resourceUsage.
No 5,000-run offering is enabled or measured.

## Remaining review

P1 independently reviews this implementation, sampled invariants, pairing/identity
and measured evidence, then coordinates an exact integrated Gate C acceptance.
P3 owns worker/API integration and the separately documented response placement.
Preserve deterministic readiness and leave MC readiness false until shared acceptance.
