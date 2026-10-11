# Person 1 — Gate C acceptance, October 10, 2026

**Gate C accepted for the local 2,000-run engine and bounded job API workflow** at
exact integrated dependency `181090d16e5a707438d49b704fc6f9eaff2c2ae7`.
Includes P2 completed runner/benchmark `dde4e2d`, P1 numerical/valuation/execution
reviews and P3 packaged-worker/job transport. This permits P3 risk-dashboard
integration; it does not accept Gate D/E or a hosted deployment.

## Independent evidence

Windows, explicit bundled Node 24.19.0: 109 tests pass, including zero-width
identity at non-default multiples, pairing/order/isolation, accounting invariants,
null denominators, queue bounds, result-context validation, worker failure/timeout,
cancellation and token isolation. Strict contract TypeScript and all generated
deterministic/MC/job artifacts pass; frozen deterministic reference reproduces.
Svelte check reports zero errors/warnings; production dashboard build and separately
built real worker pass.

Independently inspected actual full P2 result against exact company/request/config:
2,000 runs, 195 probability objects and 2,753 quantile objects, reconciled counts,
bounded probabilities and ordered quantiles. Benchmark/config/input fingerprints
match the saved output. Combined terminal valuations genuinely unavailable on 19
paths, so paired exit-risk eligibility is 1,981; unavailable paths are not zeros.
Both investment alternatives have zero reached-payback paths and null conditional
medians. At the disclosed $150,000 reserve, saved forward shortfall probabilities
are .0215 baseline, .052 trucks and .181 combined. Synthetic sensitivity outputs,
not calibrated business probabilities.

P2's completed workstation measurement is 1,436.5009268 seconds, 530.2109375 MiB
peak process RSS, zero failures: Windows x64 Node 22.20.0, i3-1005G1, four logical
CPUs, 11.81 GiB RAM. Includes sampling/engine/aggregation/context validation;
excludes final serialization; early work overlapped tests. This is one recorded
workstation realization, not a universal SLA. P1 inspected the complete artifact
without repeating the expensive full workload.

Independently executed the compiled real worker to first aggregated progress,
verified responsive parent loop and awaited cancellation/termination. Through the
compiled Svelte preview HTTP routes, verified 202 submission, missing-token 404,
pending result 409, real aggregated progress, responsive health, cancellation,
no-store and rejection of partial results. Deterministic live API acceptance passes.
Full-result transfer/success tests use the labeled saved-artifact fixture; they
are not a second newly computed ensemble. Opt-in loopback preview was stopped.

## Accepted scope and remaining checkpoints

Accept separate `mc-config-1-proposed`, `sha256-mulberry32-boxmuller-1`,
`mc-execution-1-proposed`, `mc-result-1-proposed` and `mc-job-1-candidate` literals
for this versioned local workflow. Preserve them in hashes/metadata until an
explicit migration. Deterministic schema/model/revision/interface/hashes unchanged.

Local limits: one active worker, two waiting, eight retained records, 64 KiB body,
45-minute active timeout and one-hour terminal retention. In-memory state is lost
on restart; per-job capability tokens authorize access. No durable/multi-instance
or authenticated hosted deployment, 5,000-run capacity or hosting adapter accepted.

P3 may now integrate progress/cancel/error/retry/stale-result and risk displays
against this accepted API/result contract. Preserve eligible/unavailable counts,
conditional-payback labels, pointwise-versus-horizon distinctions and prior results
on failure. Current default review opt-in and metadata MC=false are intentional;
readiness/UI publication is P3-owned and requires a consistent follow-up change.
Gate D requires independent display/lifecycle reconciliation; Gate E requires final
demo/release checks. P1's current Gate C review is complete; next review follows
P3's risk UI delivery. A/B/C accepted in the scopes recorded; D/E pending.
