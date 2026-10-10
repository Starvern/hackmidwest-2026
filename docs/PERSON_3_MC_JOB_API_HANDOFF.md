# Person 3 — MC job API candidate (local review)

Integrates completed P2 benchmark `dde4e2d` and P1 execution review `824a413`.
Async transport direction approved by P1 in issue #2. This additive candidate does
not replace frozen deterministic contracts or constitute Gate C/D/E acceptance.

## Measured input and independent inspection

P2's actual 2,000-run, three-output-scenario, 60-month, seed-42 workload took
1,436.50 seconds and 530.21 MiB peak process RSS on Windows Node 22.20.0 / Intel
i3-1005G1. Early local tests overlapped execution; this is not a universal SLA.
P3 reran the saved result/context checker: 195 probability objects and 2,753 quantile
objects validate, preserving unavailable denominators. No duplicate long run.

## Exact additive HTTP contract

Generated JSON Schemas: `contracts/MCJobReceipt.schema.json` and
`contracts/MCJobStatus.schema.json`; transport version `mc-job-1-candidate`.
Result remains the separate reviewed `MCResultExtension` envelope.

- POST `/api/v1/simulate/monte-carlo`: existing MonteCarloRequest, exactly 2,000 runs.
  202 receipt contains job_id, state, completed_runs/total_runs, created_at,
  finished_at/expires_at (initially null), error (initially null), status_url,
  result_url and a newly generated access_token. Receipt state is the queued
  submission snapshot; a subsequent status request may already show running.
- GET `/api/v1/simulate/monte-carlo/jobs/{id}`: 200 status, no access token.
- GET `/api/v1/simulate/monte-carlo/jobs/{id}/result`: 200 exact complete result;
  409 RESULT_UNAVAILABLE while queued/running, failed or cancelled.
- DELETE `/api/v1/simulate/monte-carlo/jobs/{id}`: 200 status; queued/running jobs
  become cancelled and discard partial output. Repeated cancellation is idempotent;
  succeeded/failed/cancelled jobs retain their existing terminal state/result.

All job GET/DELETE requests require `x-mc-job-token` from the submission receipt.
Tokens are random 256-bit capabilities; only their SHA-256 digests are stored and
compared in constant time. They are never put in URLs/logs/status/results. Wrong,
missing or unknown tokens and expired/unknown IDs all yield 404 JOB_NOT_FOUND.
Use same-origin requests and protect the receipt as access to that job. No user
accounts/tenant authorization or shared hosted access is claimed.

Every response uses Cache-Control: no-store and existing structured ApiError bodies.
Malformed JSON: 400 INVALID_JSON. Schema/company error: 422 VALIDATION_ERROR.
Unmeasured run count: 422 UNSUPPORTED_RUN_COUNT. Oversized body: 413 BODY_TOO_LARGE.
Queue/storage full: 429 QUEUE_FULL. Review disabled/nonlocal host: 503 MC_NOT_READY.
Missing packaged worker: 503 WORKER_UNAVAILABLE. No automatic retry or partial results.
Framework origin protections remain enabled.

## Bounded lifecycle and deployment scope

Local review is opt-in with `OPERATOROS_MC_REVIEW=1` and localhost/loopback URL.
Bind the server to 127.0.0.1; hostname checking is an additional guard, not network
isolation or authentication. Default endpoints reject with 503; metadata MC readiness
stays false and dashboard risk UI stays disabled.

Policy is one active worker, two waiting jobs, at most eight total retained records,
64 KiB streamed request body, 45 minutes execution timeout per active job and one hour
retention after terminal completion/cancellation. Timeout includes worker startup and
parent result validation boundary execution as scheduled by the Node event loop;
CPU validation cannot be preempted by a JS timer. The chosen margin above P2's roughly
24-minute run is a conservative local-review policy, not measured host capacity or a
speed guarantee. Waiting jobs have no execution progress; timeout starts on activation.
No 5,000-run offering. No memory reuse optimization changes engine economics.

Cancellation marks status promptly but the execution slot remains occupied until
worker termination settles. Failures/timeouts fail the whole job. Completed aggregated
runs are actual runner callbacks; no estimated ETA. Result company/request/config/run
identity, fingerprints and completed count are revalidated before retention. Terminal
records expire on access and a one-minute sweep. No automatic eviction of unexpired
results to admit new work; capacity returns as records expire.

Store is single-process and in memory; restart loses jobs/results/tokens (404), cannot
resume work and cannot support multi-instance routing. Vite module reload preserves
one process-global store; restart after editing lifecycle limits/worker implementation.
No persisted queue, hosted adapter, multi-user deployment or recovery is claimed.

`npm run build:mc-worker` separately bundles the real Node worker into
`.mc-worker/worker-entry.js`; `npm run build` includes this build. Run from repository
root with installed Node dependencies. API resolves that explicit built artifact and
does not ask Node to execute a Vite-rewritten TypeScript asset. Worker changes require
rebuild. A Node hosting adapter/process lifecycle and deployment path must still be
selected and checked before hosted readiness; Svelte preview is local review only.

## Evidence and remaining handoffs

Tests cover queue/retained-record bounds, tokens, input/status/result isolation,
queued/running cancellation and slot release, timeout/failure/protocol/context rejection,
expiry/restart semantics, HTTP gate/validation/no-store and cancellation. Full envelope
transfer/success tests replay P2's saved actual result through a fixture worker/executor;
they prove transport/context handling, not newly computed full-workload completion.
`npm run test:mc-worker` builds the actual runner and verifies a real first aggregated
run, responsive parent loop and cancellation after worker termination. No partial
forecast is returned. P2's completed benchmark is the full-computation evidence.

P1: inspect integrated candidate and exact completed P2 artifact; coordinate Gate C.
P3: dashboard MC pending/progress/cancel/error/stale result flow and acceptance evidence
remain pending; product MC readiness remains false. P2 implementation/benchmark handoff
is delivered; do not continue listing its benchmark as running.

Compiled Svelte preview HTTP verification also submits a real job, observes actual
aggregated progress, checks token isolation/pending result/no-store and responsive
health, then cancels without returning a partial result. `npm run test:mc:api:live`
expects an explicitly enabled loopback preview on port 4174 (`MC_REVIEW_BASE_URL`
overrides it). This is compiled local-route/worker evidence, not a selected hosted
adapter or a second complete 2,000-run computation. Intentional 503 MC_NOT_READY and
WORKER_UNAVAILABLE codes survive framework normalization; unexpected server details
remain generic.

## Gate C acceptance and dashboard follow-up

P1 accepted this exact local engine/transport dependency at `fdacd21` (see
`docs/PERSON_1_GATE_C_ACCEPTANCE.md`). The later risk dashboard candidate in
`docs/PERSON_3_RISK_DASHBOARD_HANDOFF.md` consistently publishes local MC readiness
true only for explicit local opt-in with a built worker; default/remote scope stays
false. It also adds an explicitly labeled recorded benchmark view. The original
MC=false statements above describe the reviewed transport delivery before that
follow-up. Gate D/E and hosted deployment acceptance remain separate.
