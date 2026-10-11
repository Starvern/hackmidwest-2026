# Person 3 — risk dashboard candidate after accepted local Gate C

Integrated P1 acceptance `fdacd21`, accepting engine/transport dependency
`181090d16e5a707438d49b704fc6f9eaff2c2ae7` and completed P2 benchmark `dde4e2d`.
A/B/C accepted in their documented local scopes; Gate D/E remain pending.

## Readiness and use

Default MC readiness remains false. With `OPERATOROS_MC_REVIEW=1`, a localhost/
loopback request and the built worker present, metadata now consistently publishes
MC readiness true and enables dashboard controls against the accepted local job API.
Remote/default-disabled scope stays false/503. Existing limits, tokens, in-memory
restart behavior, origin protections and exact version literals remain unchanged.
This is a local workflow publication, not hosted/multi-instance/5,000-run approval.

Build with `npm run build`. Run the local review preview:
`OPERATOROS_MC_REVIEW=1 npm run preview -- --host 127.0.0.1 --port 4174 --strictPort`.
Open `/`; no MC job runs automatically. `Run risk simulation` explicitly submits
2,000 paired runs with the selected integer seed and a snapshot of current decisions.
It displays queued/running/completed/failed/cancelled state and actual completed-run
progress. Seed/input edits never submit another job. No ETA is extrapolated.

`View recorded benchmark` explicitly loads P2's accepted actual seed-42 result via
GET `/api/v1/simulate/monte-carlo/recorded`, local-mode-only/no-store/context-validated.
This endpoint returns the original request with the result; the UI labels it a
recorded benchmark rather than new simulation. Current edits/seed are compared with
that original request and visibly marked stale when different. The saved result is
not injected into the job queue, does not fabricate progress and does not overwrite
or silently simulate current edited inputs. It enables meaningful review without
rerunning the expensive ensemble.

## Lifecycle and reconciliation

The client polls only the known submitted job. A failed polling/result request stops
polling and offers `Resume checking this job`, which repeats reads rather than POST.
Cancellation aborts outstanding browser reads, explicitly DELETEs the job and fences
late responses so they cannot overwrite cancellation or newer results. A completion
race that returns succeeded is fetched as that completed job. The server remains
responsible for worker termination/slot release. No automatic retries or partial
result rendering. Result/job/company/seed/runs/scenario identities are checked by the
client in addition to the full server context boundary.

The previous successful live or recorded result remains visible during a new run,
submission/polling failure or cancellation. Its original request snapshot determines
staleness, names, reserve and seed; current editor state is never relabeled as its
assumptions. An ambiguous submission failure explicitly says another job may exist;
manual retry can create a new job. Tokens remain closure-only, outside displayed
state/URLs/logs/storage. Leaving the component aborts polling and sends best-effort
job cancellation; browser shutdown/network loss cannot guarantee delivery. Refresh
has no persisted token/resume; unconfirmed work remains bounded by server timeout.

## Risk display semantics

- Scenario cards: backend full-path probability of any reserve shortfall during
  months 1–60, paired negative terminal equity delta vs baseline and payback by month
  60, each with eligible and unavailable path counts. Baseline inapplicability and
  zero-valued probabilities remain distinct; nulls are never converted to zero.
- Conditional median recovery month is shown only when available, with reached /
  not reached / not applicable / subsequent reversal counts. No baseline investment
  is explicitly not applicable; no recovery is explicitly unavailable.
- Exit equity P10/P50/P90/mean and backend paired terminal delta quantiles preserve
  the 1,981 eligible / 19 unavailable combined-example paths. Paired results are
  consumed directly; frontend never subtracts independent percentile curves.
- Selected metric/scenario chart shows pointwise P10/P50/P90 over states 0–60,
  with null gaps. It is labeled pointwise, not individual paths or horizon survival.
  The shared month inspector shows all metric quantiles/means/denominators, monthly
  reserve-shortfall probability and paired monthly delta P50; utilization deltas are
  percentage points. Horizon shortfall is not inferred from pointwise bands.
- Run/config/input identity, seed, versions, original reserve and full synthetic
  configuration/provenance are accessible. Synthetic sensitivity disclosure remains
  visible; these frequencies are not calibrated business probabilities.

## Verification / owner handoff

Client regressions cover same-job resume without duplicate POST, prior-result
preservation, delayed-response cancellation fencing, exact result identity and real
recorded unavailable/zero/null/paired values. Readiness/recorded-route tests verify
local opt-in versus default/remote scope and independent result copies. The recorded
artifact is used explicitly for display/transfer evidence, not a new benchmark.

P1: independently reconcile this display/lifecycle candidate for Gate D, including
combined 18.10% horizon shortfall, monthly risk versus horizon, 19 unavailable exit
values, zero recovered paths/null medians, paired comparisons, stale/prior results
and cancellation/error recovery. P3 UI implementation does not self-accept Gate D.
P2 runner/benchmark and P1 Gate C dependencies are closed. Gate E final demo/release
and any Node adapter/hosted access/lifecycle work remain separate.

P3 verification on macOS Node 24.4.0: 115 integrated tests pass, generated contract/
strict type/frozen reference checks pass, Svelte zero errors/warnings and build pass.
Compiled job API plus deterministic HTTP checks pass with explicit local MC readiness
true. Browser verification loaded the original recorded benchmark, reconciled scenario
risk/eligibility/null recovery values, changed seed to mark it stale, manually started
a real job, observed actual progress and cancelled after 28 aggregated runs while the
previous recorded result stayed visible. Restoring seed 42 restored the matching-input
label. No new full ensemble was computed or claimed. Final inspector covers all nine
metrics; existing timeline controls select six chart metrics.

Browser review caught a baseline card access to an absent comparison entry. Fixed
by consuming the baseline's explicitly unavailable incremental terminal distribution;
regression covers baseline null and alternative 1,981-path eligibility. Final compiled
recorded view renders successfully. Default-width page has no horizontal overflow.
Local risk preview is left on port 4174 with the recorded benchmark visible for review;
no active MC job remains. Screenshot is an external local review artifact, not a newly
simulated forecast or repository asset.
