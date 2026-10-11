# Person 1 — monthly valuation execution handoff

Integrated P2 foundations/P3 dashboard and corrected MC boundary through `3e0fdf6`.
The MC internal execution extension is `mc-execution-1-proposed`; deterministic
interface `checkpoint-1-candidate-1`, public schema/model/revision and hashes stay unchanged.

`ResolvedPathInputs` in `src/lib/server/engine/scenarios.ts` now accepts
`monthly_valuation_multiples?: readonly number[]`. P2's MC caller must supply this
vector from the shared per-run macro realization, together with market factors,
fixed-once action risks, MC per-scenario fingerprint and seed. It is validated with
P3's `MCValuationMultiplesSchema`: exactly 60 finite positive values. Month m uses
entry m-1 only for valuation. A fresh shallow company/assumption context carries
the multiple into valuation; accounting and shared inputs remain untouched.

The deterministic runner explicitly supplies the resolved request multiple 60 times.
Existing direct callers that omit the optional vector preserve their constant
company multiple. Omission is compatibility behavior, not permission for an MC
caller to forget sampled multiples. No new HTTP field, financial policy, forecast
formula or fingerprint projection is introduced. The internally paired baseline
inherits the same factor/multiple vectors. No baseline reuse optimization was made.

New tests verify varying month-1/month-13 multiples, exact accounting/operations/event
and TTM isolation, future terminal changes leaving months 0–59 identical, immutable
inputs, unchanged paired payback, constant non-default 3.25 identity against all
three real deterministic paths, legacy-call compatibility, and rejection of invalid
length/nonpositive/nonfinite vectors.

P1 source-reviewed P3's `3e0fdf6` payback probability/count and baseline unavailable
fixes; they resolve the concrete findings from issue comment 6102608819. The internal
separate manifest/result candidate is approved for P2 consumption. Product route
placement remains P3-owned. Full MC sampled runner, MC-01–08, benchmark and Gate C
remain pending P2 delivery and P1 independent review.

## Independent verification

Windows, explicit bundled Node 24.19.0: all 88 tests pass; strict contract TypeScript,
schema/request/separate-MC artifact checks, generated deterministic response drift,
authoritative fixture validation and independent CSV/JSON reconciliation pass.
Svelte check has zero errors/warnings and production build passes. Live HTTP check
passes the complete real reference response, structured errors and deterministic
readiness true / MC false. Hosting adapter selection remains deployment work.

P1 reviewed the integrated dashboard source and browser behavior: initial reference
exit cards and month-1 statement match; truck edit 2 to 3 marks old results stale;
rerun updates both alternatives to month-1 cash $325,701 and debt delta $90,000.
Opening month shows $400,000 cash / $1,200,000 debt and unavailable flows/valuation;
keyboard month selection moves 60 to 59 with updated values. Financial projections,
backend comparisons and cash-only reserve rendering are consistent with the engine.
This completes the current P1 deterministic financial-display review, not full Gate D:
broader error/retry/accessibility, responsive/product acceptance and MC risk integration
remain team UI work. No MC result or performance claim is made.
