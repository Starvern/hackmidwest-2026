# Person 2 Monte Carlo assumptions and implementation proposal

Status: proposed for Persons 1/3 review, not calibrated or approved risk configuration.
Deterministic Gates A/B accepted at `2f146e9`, acceptance record `f16523e`.
Existing company distribution manifest remains empty until joint parameter review and
Person 3 runtime validation are ready. No statistical result or Gate C claim is made.

## Proposed illustrative uncertainty

Keep deterministic annual growth/inflation and all financial policies unchanged.
Sample input factors, never finished revenue, EBITDA, cash or equity. Parameters below
are synthetic sensitivity settings, not empirical HVAC distributions or market facts.

| Risk key | Family / exact proposed parameters | Unit / consumer |
|---|---|---|
| macro | Annual latent AR(1): initial state 0, rho 0.6, innovation spread 1, state clamp [-3, 3] | dimensionless; shared across scenarios |
| demand_macro | `clamp(exp(0.08 * M_y), 0.70, 1.30)` | multiplier; base demand only |
| ticket_macro | `clamp(exp(0.02 * M_y), 0.90, 1.10)` | multiplier; service ticket |
| exit_macro | `clamp(request.exit_multiple + 0.5 * M_y, 4, 8)` with bounds expanded to include the requested multiple | EBITDA multiple; valuation |
| wage | One triangular factor per path, min 0.95, mode 1, max 1.05 | multiplier; shared full payroll |
| vehicle_opex | One triangular factor per path, min 0.90, mode 1, max 1.20 | multiplier; shared active-fleet direct costs |
| marketing_effectiveness | One triangular factor per stable campaign key, min 0.60, mode 1, max 1.40 | multiplier; lagged booked demand |
| truck_service_delay_offset | Discrete offsets [-1, 0, 1], probabilities [0.20, 0.60, 0.20] | months; add to configured delay, floor at 0 |
| hiring_delay_offset | Discrete offsets [-1, 0, 1, 2], probabilities [0.15, 0.50, 0.25, 0.10] | months; add to configured delay, floor at 0 |
| ramp_offset | Discrete offsets [-1, 0, 1], probabilities [0.20, 0.60, 0.20] | months; add to configured ramp, floor at 0 |

All other market factors are explicitly fixed at 1; campaign lag is configured, not
sampled, in this initial proposal. No independent annual-growth shock is added: the
existing 2% growth remains, while macro shocks vary demand levels. No local monthly
noise initially; annual persistent environment is the disclosed granularity. New-tech
productivity uncertainty enters via ramp duration, with full employed wages unchanged.
Fleet factor is shared across vehicles in this MVP; equipment-specific shocks are deferred.

At forecast January y = 1..5, update `M_y = clamp(0.6 * M_(y-1) +
sqrt(1 - 0.6^2) * innovation_spread * epsilon_y, -3, 3)`, epsilon standard normal.
Hold that state for all twelve months of the year. This is a clipped latent process;
do not describe its realized state as an unbounded normal. Lower M means lower demand,
ticket and valuation multiple, creating a common downside mechanism.

Multiple bounds resolve to `[min(4, request.exit_multiple), max(8, request.exit_multiple)]`;
no permitted positive request multiple is silently forced into the illustrative 4–8 range.
For a zero-width run, all macro loadings/innovation spread are zero, triangular endpoints
are 1, delay/ramp distributions put probability 1 on offset 0, and multiple sensitivity
is zero. Every path must then equal the deterministic path, including its requested multiple.
The nonzero-width triangular/discrete parameters are not claimed to preserve the deterministic
mean: e.g. vehicle-cost mean is above 1 and hiring delays have a positive expected offset.

## Required schema/engine coordination before implementation

Person 3 owns the exact distribution key/parameter shapes, units manifest, bounds and
cross-field validators. The table is a review proposal, not permission to bypass the
current deliberate rejection of nonempty unapproved distributions. Families should use
existing latent_ar1/triangular/discrete/fixed vocabulary; factor mappings, bounds and units
need explicit representation. Store all approved parameters in fixture/provenance and
include them in fingerprints. Do not introduce schema financial defaults.

Current MarketFactors has no valuation driver, and ResolvedPathInputs carries only
60 operating-factor values. **Person 1 review request:** add an explicit execution-context
vector `monthly_valuation_multiples: readonly number[]` (60 finite positive values),
consumed only by valuation in each month's cloned company context. The deterministic
runner supplies the request multiple 60 times. Person 3 reviews the coordinated interface
revision/fingerprint impact before this change is implemented. Do not use a terminal
future macro state to value earlier months, mutate the shared company, or randomly
perturb computed equity. This is the only proposed new engine input for these risks.

Person 1 should also review paired execution efficiency: current simulate_months runs
an internal baseline for every alternative. Initially preserve this correct behavior;
any optimization to reuse an explicit shared baseline/outlay-bearing path wrapper is
Person 1-owned and must retain paired payback and all accounting checks. No performance
promise is possible before benchmarking the accepted runner.

## Sampling and pairing algorithm

1. Validate company/request/config once at the outer boundary; require 2,000–5,000
   production runs and a nonnegative integer seed. Small internal test batches are
   allowed for unit tests, not exposed as valid product requests.
2. Derive independent digest seeds from canonical tuples `[sampler_version, seed,
   run_index, risk_key]` for shared risks and `[sampler_version, seed, run_index,
   stable_investment_key, risk_key]` for decision risks. Never include scenario ID,
   array index, unrelated scenarios or request fingerprint in random stream identity.
3. Use an explicitly versioned deterministic integer PRNG with documented integer/float
   conversion and Box–Muller transform; guard uniform draws away from 0/1. Draw annual
   macro states once and resolve the same 60-month factor/multiple vectors for every
   scenario. Draw each decision override once per action/path, never again each month.
4. Reused economic keys share exact risk draws. Validate matching action parameters
   before sampling; irrelevant overrides remain null. Distinct action keys are separate.
5. Call the same accepted deterministic functions on copied input/state. Pair each
   alternative with the same baseline realization; use actual scheduler outlays and
   scenario-minus-baseline UFCF for payback. No copied accounting/operating formulas.
6. Stream compact metric arrays and terminal/payback/risk records to aggregation rather
   than retaining every expanded event/state object for all 2,000 runs. Never drop failed
   accounting paths to improve apparent risk; fail the run on invariant violation.

Sampler version must participate in MC fingerprint/version metadata. Person 3 to confirm
the explicit metadata placement; never rename the accepted deterministic interface ID
or silently change model semantics just to introduce stochastic paths.

## Aggregation semantics and Gate C evidence

Use pointwise p10/p50/p90 and mean for each metric/month; quantiles use sorted finite
values and linear interpolation at `(n - 1) * p`. Unavailable valuations remain null
and report valid/unavailable counts. Opening flow/valuation metrics remain unavailable;
opening cash/debt are valid. Pair deltas within each run before calculating percentiles.

Cash shortfall is `any(cash_end < reserve)` over forward months 1–60, consistent with
spec §9.5; opening shortfall is disclosed separately, not silently added to forward risk.
Negative exit delta requires meaningful scenario AND baseline valuations. Missing values
are unavailable, never treated as zero/false. Baseline incremental exit risk/payback is
not applicable. Scenarios with no real investment have not-applicable payback paths;
conditional payback median uses reached paths only. Report all denominator counts.

Verification must include MC-01–08, zero-width deterministic identity, shared/matched-key
draws, scenario order/addition independence, fractional capacity and event timing bounds,
sampled accounting invariants, ordered quantiles, probabilities/denominators and monotone
reserve risk using the same saved paths. Benchmark 2,000 runs × 3 scenarios × 60 months
with recorded runtime/environment and memory. Offer 5,000 only after measurement.
Execute off the UI thread; Person 3 owns worker/API plumbing and readiness. No risk UI
readiness before Person 1 independent review and shared Gate C acceptance.

## Review requests and next deliverables

- Person 1: approve/revise numerical risk assumptions, conditional risk semantics,
  valuation input vector and paired accounting/invariant handling.
- Person 3: encode agreed config/units/provenance and fingerprint/sampler version;
  coordinate any interface revision, MC transport and background execution.
- Person 2 after review: implement sampler, paired runner and aggregation with the
  approved parameter manifest, tests, repeatable example and measured benchmark.

The accepted deterministic fixture and reference outputs remain unchanged by this proposal.
