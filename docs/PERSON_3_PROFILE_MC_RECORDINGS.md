# Internal durable company risk recordings

Builds on the importer correction 0177fd0 and internal binding candidate e39a7a8.
P2 independently accepted the focused importer correction at 0177fd0 (will 1c711d1).
This work does not change public company-risk readiness or the importer.

## Storage and lifecycle

`ProfileMonteCarloJobs.record(owner, job_id, token)` requires a successful complete
job and the existing owner/token/exact-confirmed-revision checks. It then saves through
`ProfileStore.saveMonteCarloRecording`. Save revalidates the full bound result against
the stored revision's reviewed explicit MCConfig and request before writing anything.
The generic store method is an internal trusted adapter, not an HTTP upload or proof
that arbitrary supplied output was computed. No external route can call it.

Recordings live in the existing private SQLite file (macOS/Linux support only), with
foreign-key cascade on profile deletion. They include the original request, full
company/plan/config context, result, run identity and server creation/expiry times.
The immutable run ID is the recording ID. Saving the identical completed job again is
idempotent; a different input or summary under the same run ID is rejected. There is
no replacement/upsert behavior. Writes and record-count checks are transactional.

Limits: eight recordings per owner, two MiB per serialized recording, thirty-day
retention. At capacity, save rejects without eviction or a partial row. Explicit
owner-scoped deletion frees capacity. Expired records cannot be listed/read and are
removed during saves, profile-job pruning or explicit prune. There is no autonomous
cleanup scheduler or disk vacuum/shrink claim. Tokens are never saved in recordings.

`readMonteCarloRecording(owner,id,currentInput)` requires the caller's current plan,
then validates both the original saved context and that plan against the exact owned
confirmed profile. Changed economic plans/configurations/revisions and deleted profiles
reject. Returned records are labeled by recording metadata and contain independent
objects; retrieval never converts a recording into a fresh simulation. Listing is
restricted to the exact confirmed revision and returns metadata/context, not result
summaries. Stored body digests detect accidental corruption (not cryptographic
authentication against an attacker who can rewrite the private database).

No session endpoint, browser selector or risk-configuration editor is activated here.
Public company MC remains unavailable. Active workers remain single-process and are
not recovered after restart; completed recordings survive reopen. Deleting a profile
cascades recordings and revokes output access but does not proactively cancel a running
worker. A future activation needs that lifecycle and accepted distribution calibration.

## Validation and review handoff

Tests exercise a completed synthetic job -> save -> private DB close/reopen -> exact
owner/plan read; idempotent saves; foreign owners; changed plan; newer draft isolation;
copy mutation; profile-deletion cascade; eight-record cap; oversized/malformed values
without partial writes; owner deletion; altered stored body rejection; expiry and prune.
Existing worker-binding and real neutral sampled-path regression coverage remains.
The stored summary fixtures are explicitly synthetic transport/storage evidence,
not newly computed company aggregates or calibrated financial acceptance.

P1: requested narrow review of profile binding/request override provenance and durable
recording owner/revision/plan lifecycle. P2's importer finding is already closed; no
repeat broad operating/accounting review or full MC benchmark is requested. Public
activation, accepted configuration UX/calibration, real full company worker output,
Windows durable storage, independent browser D and release E remain open.

Validation completed on macOS: 175 integrated tests pass, including authoritative
contract/type checks and frozen deterministic reference. After the shared validation
refactor, all seven focused recording/profile-binding tests and type checks pass.
Svelte reports zero errors/warnings; production app and worker builds pass. No new
browser workflow or full Monte Carlo benchmark was run because neither is activated.
