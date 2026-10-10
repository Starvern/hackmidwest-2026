# Person 3 — MC transport proposal, pending runner measurements

Dependency: P1 valuation handoff `cc45bf0` and corrected/approved internal MC
boundary `3e0fdf6`. P2 may now connect the real paired runner. This document is
an API design proposal, not an implemented endpoint, new accepted schema or Gate C.

## Proposed background-job flow

Prefer an asynchronous job flow if the measured 2,000-run duration cannot fit a
reliable bounded HTTP request. POST `/api/v1/simulate/monte-carlo` retains the shared
MonteCarloRequest body; company/config load on the server and are snapshotted at
submission. Validate before scheduling. Return 202 with a separately versioned job
receipt (job ID, queued/running state, status URL), not a fabricated MC result.

Proposed additive endpoints:
- GET `/api/v1/simulate/monte-carlo/jobs/{id}`: queued/running/succeeded/failed/cancelled
  state, with progress only if the real runner reports completed work.
- GET `/api/v1/simulate/monte-carlo/jobs/{id}/result`: on success, the exact reviewed
  MCResultExtension envelope; otherwise structured pending/failed/not-found semantics.
- DELETE `/api/v1/simulate/monte-carlo/jobs/{id}`: cancel queued/running work, terminate
  its worker and discard partial results. Completed results are not mutated by cancellation.

P3 will publish exact receipt/status/error schemas and lifecycle/status codes before
exposure. This is an MC-only additive transport proposal; it does not redefine the
frozen deterministic SimulationResult.monte_carlo field. If measurement supports a
bounded direct POST worker response instead, document that simpler contract explicitly
before implementing; avoid maintaining both protocols without a need.

## Execution and result boundary

Node worker threads should run the real imported P2 runner outside the Svelte request
thread. Preserve origin protections and structured 400/422 input errors. Bound concurrency,
queue size, execution timeout, result retention and payload size based on measured memory/
runtime and the chosen host; do not invent performance guarantees. Worker errors, invalid
output and accounting invariant failures fail the whole job, log internally and expose a
generic structured error. No partial forecast, dropped paths or automatic duplicate retry.

Validate successful output against exact submitted company/request/policies/config using
validateMonteCarloResult before retaining or returning it. All job responses use no-store.
Seeds, config/provenance/versions and fingerprints describe the snapshotted inputs. A result
completed after user edits remains visibly stale until rerun. Preserve prior successful
results on failure/cancellation; do not label them as the new request's result.

Job state persistence/recovery is a hosting decision: an in-memory local demo store loses
jobs on restart and cannot pretend to serve a multi-instance deployment. Document restart/
expiry/not-found behavior and isolation/access scope for the selected deployment before
claiming hosted readiness. No hosting adapter or persistent service is selected here.

## P2 handoff needed / P3 acceptance checks

P2 supplies real runner signature, caller inputs/output, measured 2,000 x 3 x 60 wall time
and memory/environment, invariant failure behavior, and whether genuine progress/abort
hooks exist. Worker termination can support cancellation without changing engine formulas;
no engine progress API is presumed. Do not expose 5,000 runs until measured acceptance.

P3 then implements and tests schema validation, queue/concurrency limits, worker isolation,
real result/context equality, failure/timeout/cancellation cleanup, expired jobs, no-store,
and UI pending/error/retry/stale behavior. Gate C independent review covers the integrated
real engine and transport evidence before MC readiness/risk UI is enabled. Gate D/E remain
separate. Deterministic UI error/retry work can continue in parallel.
