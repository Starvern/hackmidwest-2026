# Person 3 — local manual intake and bound workspace candidate

Workbook import follow-up: see PERSON_3_WORKBOOK_IMPORT.md.

Builds on compiler `adbb458`. This slice exposes the existing revision workflow
through SvelteKit and a manual form. It is opt-in local review, not public release.

## Running locally

Requires Node with node:sqlite and macOS or Linux. Create a private directory
outside the repository (mode 0700), set OPERATOROS_INTAKE_REVIEW=1 and
OPERATOROS_INTAKE_DIRECTORY to its absolute path, then start the app. Open /intake.
The route rejects other hostnames, unset configuration and unsupported platforms.
Default application behavior keeps intake unavailable.

P1/P2 independently found Windows POSIX-mode checks cannot establish ACL privacy.
Durable storage now explicitly rejects platforms other than macOS/Linux before
opening a database. Windows HTTP intake returns a clear 503. In-memory test stores
remain available. The persistence test exercises explicit unsupported-platform
rejection on Windows; this is not Windows persistence acceptance. POSIX private
parent/no-follow/0600 enforcement is retained. Windows ACL support remains future work.

## Access and transport

POST /api/v2/intake/session issues an opaque browser token. Only its digest is saved;
server-generated owner identity scopes every subsequent operation. Cookie is HttpOnly,
SameSite Strict, Secure on HTTPS, with 30-day expiry. Browser writes require matching
Origin. Requests stream through a 1 MiB bound before strict schema parsing. Responses
are no-store JSON. Actor injection, foreign owners, forged tokens, stale revisions,
unsupported media and oversized payloads reject. Unexpected errors expose no source
payload or stack. Limits are 20 profiles per owner and 200 revisions per profile.

Endpoints under /api/v2/intake: template; profiles list/create; profile read/save/delete;
review; preview; acknowledge; confirm; and separate versioned /simulate. Confirmation
and run resolution retain exact compiler/version/revision/fingerprint bindings.

This browser cookie is local access, not an account. Expiry or lost cookies removes
access; recovery, retention cleanup, rate limiting and multi-user deployment remain
unimplemented. Expired sessions do not automatically delete old local profile rows.
Use synthetic data for this candidate review.

## Manual workflow and supported subset

Blank templates contain actual monthly dates from the user's books-through date,
unknown values and no demo economics. Unknown fields may have null period; entered
or reviewed fields still require period coverage. User enters a business name and
source title, then facts/estimates, monthly history, opening balances, loans/assets,
expense details, operating evidence and forecast assumptions. Each scalar has a source
choice; no imported review authority becomes approval. Review records server owner/time
and retains estimate intent. Missing checks show month-specific context in an expandable
list. Preview uses the real 61-state baseline; confirmation requires acknowledgment of
that exact preview. Editing a confirmed profile creates another draft.

The operating evidence form currently supports one comparable service pool, fully
available staff and an explicitly described demand estimate. Constraints or more
complex evidence can remain unknown drafts. This is not a workbook importer or the
full schema's complex evidence editor. No uploads/extraction are enabled.

Confirmed profiles open /?profile=<uuid>&revision=<n> with empty baseline/alternatives.
Company data and reserve/value controls come from that exact snapshot. Bound deterministic
responses must match the revision binding/company before display; edits retain existing
stale-result marking. Action templates remain illustrative and require owner editing.
The fictional recorded-risk component is never mounted in profile mode, including SSR.
Company MC and exact job/worker/recorded snapshot binding remain unavailable.

## Evidence and ownership

150 tests passed before integrating peer cases. Adopted P1's five financial cases from
4db3907 (imports and explicit forecast-month type narrowing adapted) and P2's four
operating cases from a0ce933. Their independent compiler reviews found no blocking
financial/operating issue in tested scope. Tests cover HTTP session isolation,
review-to-confirm-to-bound-execution, request bounds and blank templates in addition
to earlier compiler/store tests. Final integrated suite: 159 tests pass on macOS.
Svelte check: zero errors/warnings. Production application/worker build passes.

Browser implementation-owner smoke on local production preview: created a blank draft
through UI; separately seeded eligibleFixture through the server store under the local
synthetic browser principal, then reviewed, previewed, acknowledged and confirmed through
UI. Displayed $84,000 M1 sales, -$100 minimum cash and 480 completed jobs. Opened bound
workspace with results current and identical empty alternatives, demand/capacity 600/480.
This does not claim every manual field was entered end-to-end or independent Gate D.

P3 next: importer normalization with P2's workbook cases, clearer manual field guidance,
and exact company worker/job/recorded binding. P1/P2 broad compiler review need not repeat;
Windows rejection can be checked narrowly. Original accepted A/B/C scopes unchanged;
independent browser D and release E remain open. Unrelated lockfile changes excluded.
