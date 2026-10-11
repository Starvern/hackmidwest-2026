# Internal company Monte Carlo binding candidate

Builds on aeebd00. Public `/api/v2/intake/simulate` still rejects MC; the profile
workspace still has no risk runner or demo recording. No readiness/gate changes.

`ProfileMonteCarloJobs` resolves the owner's exact confirmed CompanyBinding through
ProfileStore before submission and each status/result/cancel operation. It reads
only `assumptions.risk_configuration` on that revision: a reviewed, dated, sourced
full MCConfig. Unknown/absent/unreviewed/malformed configuration rejects. There is
no demo config loader in this path. The compiler still emits an empty legacy
`distribution_parameters`; explicit MCConfig is supplied separately to the existing
runner, whose MC fingerprint uses its deterministic request projection plus config.
This does not establish calibrated or jointly accepted company distributions.

The candidate context contains full profile revision/mapping/content binding and
request/config fingerprints. Its company hash uses the compiler's exact
`{company, mapping_version}` projection. The queue snapshots that context, the
worker independently validates it before execution, and the parent requires the
matching context on its result message alongside existing run ID/progress/result
checks. Profile IDs cannot enter the generic job/worker adapter without context.
Demo transport schemas/URLs remain unchanged. Profile receipts omit demo URLs;
this internal class has no route, session wiring, or UI activation.

Owner access and job token are both required. Returned contexts/results are copies;
plan edits cannot retarget jobs. Deleting the profile revokes retrieval. Queue limits,
timeouts, cancellation, single-process retention and expiry use the existing job
manager. Tokens are hashed there, and not retained by the profile wrapper. Records
are pruned with job expiry. No durable/restart/multi-host job persistence claim.
Deleting a profile does not proactively cancel its worker; bounded execution may
finish, but output becomes inaccessible. A future HTTP lifecycle needs cleanup.

`validateRecordedProfileMonteCarlo` requires exactly `{context,result}` and rechecks
owner/confirmed snapshot, plan/config hashes and full result context. A bare demo
recording, different revision/configuration, changed economic plan or deleted
profile rejects. This validates supplied records; it does not save them to disk.

Also fixes MC request reserve/value overrides to drop superseded `profile_ref`
authority, matching the deterministic runner. Other profile provenance is retained.

## Validation and limits

`node --test tests/profile-monte-carlo.test.ts` covers missing reviewed configuration,
owner/revision/token checks, mutation isolation, plan-stale/bare/forged records,
expiry/deletion, actual worker-thread transfer with missing/wrong revision echoes,
and input hash mismatch. Worker transfer uses explicitly synthetic re-contextualized
saved summaries, not new sampled aggregate results or financial acceptance evidence.
A real zero-width sampled path for each plan reproduces all deterministic months
and metrics for a compiled profile, preserves inputs and checks override provenance.
No new 2,000-path company benchmark or full worker computation is claimed.

Integrated regression: 171 tests pass, authoritative contract/type and frozen demo
reference checks pass; Svelte reports zero errors/warnings and app/worker build passes.
Public/local intake platform restrictions and independent browser D/release E remain.

Next: P2's importer review remains the active peer handoff. P1 may narrowly inspect
MC override provenance; no duplicate accounting review is needed. Company risk
configuration UX, accepted calibration/source mapping, session API/UI, durable
recording and an actual company full worker run remain explicit integration gates.
