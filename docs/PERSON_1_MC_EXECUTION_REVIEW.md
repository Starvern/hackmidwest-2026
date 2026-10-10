# Person 1 — sampled execution review, October 10, 2026

Reviewed P2 runner `5a7e46e` and P3 client/transport proposal `cc73ef5`, integrated
at merge `395ec77` on gavin. This is independent implementation review, not Gate C.

The runner uses the approved shared forecast-year macro and fixed-once wage/fleet
draws, stable action streams, current-month valuation vector and unchanged real
scheduler/operations/accounting engine. Scenario sorting does not enter random
identities. Each alternative retains its internally paired baseline, identical
shared factors/multiples and actual outlay-gated UFCF payback. No accounting output
is randomly perturbed. Compact aggregation preserves null denominators, forward
cash risks, paired quantiles and conditional payback; output is validated against
the exact request/configuration. Input clones and failure propagation are retained.

Independently passed the integrated 97-test suite on Windows, explicit Node 24.19.0,
including real sampled-path arithmetic/invariants, zero-width identity at 3.25/6/9,
reproduction, action/scenario-order independence, actual negative-TTM denominators
and saved-path risk aggregation. Added one separate passing orchestration regression:
the public runner executes/aggregates a real run, reports completed=1, preserves all
inputs, and propagates the progress callback's exact exception without returning a
partial result. This deliberately stops after one run; it is not a full benchmark.

That regression exposed an inferred UUID-only TypeScript runId parameter, although
the documented benchmark supplies a named ID. Explicitly typed runId as string,
matching deterministic execution and the nonempty result schema. No numerical,
sampling, fingerprint, version or financial-policy changes were necessary.

Strict contract TypeScript, schema/request/MC artifact checks, frozen computed
deterministic reference, Svelte check (zero errors/warnings) and production build
pass. Total verified tests: 97 suite tests plus the new orchestration test. Reviewed
P3 client error/retry tests also pass; no new browser/lifecycle acceptance is claimed.

Approve implementation direction for P3's worker integration. Given P2's reported
early timing, use the proposed asynchronous 202 submission/status/result/cancel flow
rather than holding a request open. P3 owns publishing additive job schemas, measured
resource/queue/time limits, snapshots/context validation, worker failure/termination,
expiry/restart/access behavior and stale/error UI evidence. Progress is completed
aggregated runs, not a promise of remaining time. The synchronous callback is not an
AbortSignal; cancellation must terminate the worker and discard partial output.

Remaining Gate C evidence: P2's completed 2,000 x 3 x 60 measured runtime/peak memory
and actual validated result artifact; P1 independent artifact/context/MC-04 inspection;
P3 integrated worker/API lifecycle evidence and joint exact-commit acceptance. No
5,000-run offering or MC readiness is approved. A/B remain accepted; C/D/E pending.
