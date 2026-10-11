# Person 3 — compiler and local revision workflow candidate

Builds on preflight `80e2d97`. This is an internal implementation candidate for
focused P1/P2 review, not a new callable API or owner-facing intake release.

## Compilation and provenance

`compileProfile` validates the exact revision payload/preflight, maps supported
financial/history/operations/assumptions into authoritative `CompanyInput`, and
validates that output before use. Expense details reconcile to existing buckets;
they are never added a second time. Historical profit/basis, actual dates, detailed
sources, raw precision, evidence and reviews remain in the immutable source sidecar.
No demo data is imported. Empty `distribution_parameters` explicitly means company
MC is unavailable, even if a draft risk envelope has been supplied.

The additive `profile_source` provenance kind requires `profile_ref` with exact
profile UUID, revision, mapping version, dependency pointers and source IDs.
Other kinds cannot carry this reference. Every compiled scalar has existing engine
unit validation plus an exact revision reference; engine mapping constants retain
profile dependencies and the named mapping/policy context. The full sidecar preserves
manual_statement/owner_estimate/spreadsheet_cell/document_page distinctions instead
of relabeling real history synthetic or generic assumed. Derived dependencies must
resolve to reviewed fields and cannot cycle. Reconciliation/review pointers must exist.

This is the requested authoritative provenance extension **candidate**, not prior
joint acceptance. Generated artifacts reflect the additive vocabulary/reference;
existing demo data, output and fingerprint reproduction remain unchanged. Existing
deterministic request control resolution now drops the profile reference when
reserve/value are explicitly replaced by request user-input provenance; the original
compiled snapshot remains unchanged.

`CompanyBinding` and `ProfileSimulationInput` have authoritative strict schemas and
generated artifacts. Binding includes all version/identity/fingerprint fields and
the request company ID must match the bound profile. Parsing is not authorization.

## Durable local workflow

`ProfileStore` uses Node's built-in SQLite in a caller-configured private application
directory, outside fixtures. There is no default path or automatic production
enablement. Parent directory must be private; database permissions are 0600 and
symlink file opens reject. Tests use temporary private directories only. Requires
the Node runtime with `node:sqlite` (tested Node 24; currently marked experimental).
No new dependency or unrelated lockfile edit is included.

Each operation takes a **trusted server principal**, never a request-supplied actor.
Owner-scoped lookup occurs for reads/edits/reviews/previews/acknowledgments/confirmation,
snapshot resolution and deletion. HTTP session authentication is still to implement;
calling these methods directly is a trusted application boundary, not public auth.

- Create/save strips incoming field/source/reconciliation review authority. Values
  remain entered or unknown; reviewed-estimate intent is retained separately so
  unchanged estimates cannot be relabeled measured via a save/import.
- Explicit review selects fields/sources/reconciliations and rationale; the server
  stamps actor/time. Reviewed owner-estimate sources retain estimate state.
- Data/review edits append revisions and clear preview/acknowledgment. Saves from
  confirmed revisions create new drafts. Expected-head checks reject stale edits.
- Preview requires reviewed sources, compiles an exact snapshot and runs the real
  engine's 61-state baseline. Its stored record is immutable to callers.
- Acknowledge copies the server's exact preview binding without creating a revision
  or changing payload hashes. New previews clear previous acknowledgment.
- Confirm uses a SQLite write transaction to verify current revision, preview ID,
  actor, freshly compiled identity/fingerprints and current baseline-policy hash,
  then freezes the revision. It does not hash acknowledgment back into its payload.
- Resolve requires exact confirmed binding and revalidates the persisted snapshot;
  returns independent copies. Internal bound deterministic execution carries that
  exact binding with the result. Other companies/owners/draft bindings reject.
- Delete removes the profile and all its saved revisions/previews/snapshots from
  this store. No separate jobs/results are stored yet; future job retention/deletion
  must be coordinated before company-specific jobs are enabled. Backups and external
  copies are outside this local store's deletion guarantee.

## Evidence and review requests

Eight focused synthetic tests cover the real 600-demand/480-completed/120-unserved
baseline; 0.5/1.5 seasonal demand; source sidecar/provenance/dependency cycles;
estimate retention and discarded imported authority; owner isolation; unchanged
preview→acknowledge→confirm without circular hashes; label-edit/new-preview invalidation;
confirmed snapshot isolation; 0600 persistence across reopen/deletion; and exact-bound
deterministic runs through the existing runner with reserve/value overrides.

P1: review exact financial projection, provenance/sidecar semantics and confirmation
binding against your prepared financial cases; flag narrow mismatches. P2: actual
compiler/engine projection is now ready for your published operating matrix, and
the authoritative source reference can be reviewed alongside it. No repeat broad
custom-investment accounting review or full MC benchmark is requested.

Remaining P3 work: HTTP session/access integration, bounded API transport/errors,
manual intake/review forms, importer normalization, UI stale-result handling and
worker/job/recorded snapshot binding. Company MC, extraction/uploads, hosting/sharing,
broader dates/debt/trades and multi-user deployment are not enabled. Preflight's
`execution_available: false` still describes public availability. Gates D/E remain open.
