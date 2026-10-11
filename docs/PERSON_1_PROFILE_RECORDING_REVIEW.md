# P1 profile-risk binding and recording review

Exact target `358bdb1`; isolated archive, Windows Node 24.19.0.
Disposition: no blocking finding in the inspected internal binding, override
provenance and in-memory recording lifecycle. This is not public MC activation,
distribution calibration, durable Windows support or D/E acceptance.

Independently executed `tests/profile-monte-carlo.test.ts` and
`tests/profile-mc-recordings.test.ts`: seven reported passes. On Windows the two
durable cases do not exercise persistence: one tests explicit unsupported-platform
rejection and one returns before disk corruption/expiry assertions. Thus five cases
exercise the cross-platform binding/storage logic; no supported-host reopen or disk
integrity acceptance is inferred from the seven-pass summary.

Inspected shared context resolution, record transaction/identity/limits/read/list
paths and existing override test. A confirmed owned revision plus reviewed explicit
configuration is required; demo defaults are absent. Changed plan/config/revision
contexts reject. Reserve and valuation overrides become request user-input
provenance without a superseded profile reference; other company references remain,
and the immutable snapshot is unchanged. Real neutral sampled paths reproduce
deterministic months/metrics. Synthetic result adapters test transport/storage only.

One additional independent in-memory acceptance test passed: successful job -> save
-> read; foreign owner and wrong token rejected; changed reserve, exit multiple,
seed or revision rejected; returned-object mutation isolated; profile deletion
revokes both recording and job-result access. Reusable source is
`docs/review-cases/profile-recording.test.ts`; run with Node `--test` in a candidate
integration tree containing P3 `358bdb1` and its profile fixture. It intentionally
lives outside the older P1 runtime's default test glob pending integration.

Remaining evidence is explicit: supported-host durable reopen/corruption/expiry
checks remain implementation-owner evidence, public session/UI activation and
configuration acceptance are pending, and active jobs are not restart-recovered.
Deletion revokes access but does not proactively terminate active workers. Preserve
that limitation before public activation; no duplicate full benchmark requested.
