# Person 3 — source worker integration candidate

Integrated P2 runner `5a7e46e` and P1 independent review/fix `824a413`.
This delivery implements the internal execution boundary, not the proposed job API
or Gate C. Deterministic readiness remains true and MC readiness false.

## Delivered behavior

`runMonteCarloWorker(company, request, config, options)` validates and snapshots all
inputs, requires a caller-selected positive timeout, verifies company identity and
starts the real synchronous runner in a Node worker thread. The caller remains free
to handle HTTP work. Progress is strictly ordered completed aggregated runs; no
estimated percentage or simulated progress. The worker posts only a complete result
or failure, never partial forecasts. The parent revalidates the complete envelope
against submitted company/request/config/policies, run identity and completed count.

AbortSignal cancellation, timeout, invalid messages/results, worker failure, premature
exit and progress-consumer exceptions terminate execution. The returned promise settles
after worker termination so a future queue cannot release an execution slot early.
No automatic retries. Inputs remain unchanged. Worker exceptions log internally;
HTTP adapters must expose generic structured errors rather than forwarding exceptions.

## Reproduced evidence

Real source-worker tests execute an actual aggregated run before cancellation, verify
progress exactly [1], unchanged inputs and rejection without partial output. Additional
tests cover pre-cancelled jobs, invalid timeout/company context, execution timeout and
exact propagation of a progress consumer exception. These tests do not run a full
2,000-path workload or prove successful full-result transfer/performance.

## Remaining implementation and owner dependencies

- P2: completed benchmark and validated result artifact; do not duplicate the long run.
- P3: additive job receipt/status schemas, bounded queue, status/result/cancel handlers,
  retention/expiry and request limits, host/access scope, restart behavior and UI lifecycle.
- Worker entry currently resolves repository `.ts` source using Node's supported TS
  runtime. No Svelte/Vite production worker packaging is claimed: worker code is not
  imported into a public route. Select a Node hosting adapter and explicit worker build
  artifact before exposing this implementation in a deployment. A successful ordinary
  dashboard build alone does not verify deployed worker resolution.
- Timeout is explicitly supplied by the caller; no unmeasured hosted default or 5,000-run
  offering is selected. A future queue must reserve a slot until termination settles.
- Full real result/context transfer and queue/HTTP lifecycle evidence remain pending.
- P1: joint Gate C review after completed P2 benchmark and P3 transport evidence.

Async 202/status/result/cancel direction is approved by P1 in issue #2; API schemas and
resource limits have not yet been accepted or exposed. A/B accepted; C/D/E pending.

## Follow-up after completed benchmark

P2 delivered completed evidence at `dde4e2d`. The internal source-only packaging
limitation and missing job API described above are addressed by the later
`docs/PERSON_3_MC_JOB_API_HANDOFF.md` candidate: explicit built Node worker,
opt-in local review routes and bounded lifecycle. Hosted deployment and product
readiness still require their separate acceptance. This section preserves the
original delivery's scope rather than claiming it included the later work.
