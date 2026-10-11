# P1 intake compiler review

Exact target: P3 `adbb458`, isolated archive, Node 24.19.0 on Windows.
Financial projection: no blocking finding in reviewed cases. Durable local
persistence: Windows blocker found; do not accept this candidate as fully verified.
No public intake, importer, browser or release acceptance is claimed.

Executed P3's three intake test files: 19 passed, 1 failed. Failure is
`private SQLite storage persists confirmed snapshots across reopen and deletion
revokes resolution` at `tests/intake-workflow.test.ts:120`. Construction throws
`Profile database requires a private application directory` in `store.ts:53`.
The parent POSIX mode-bit check does not establish Windows ACL privacy and rejects
the test-created Windows temporary directory. P3 should define supported storage
platforms and implement Windows access control or an explicit unsupported-platform
boundary; do not merely remove the privacy check. Durable reopen/deletion did not
execute here. In-memory confirmation/isolation checks passed.

Three additional P1 known-answer tests passed. Reusable source is
`docs/review-cases/intake-financial.test.ts`; run with Node's `--test` against an
integration tree containing P3 `adbb458` and its intake fixture, not the older P1
runtime tree. This file is deliberately outside the default test glob pending
integration and does not introduce competing intake schemas.

1. Starting fixture: 480 jobs at $175 gives $84,000 sales; $30,400 COGS,
   $43,600 EBITDA, $10,900 taxes and $13,300 working-capital increase. From
   opening cash -$100, month-1 cash is $19,300. Source payload remains unchanged
   and the sidecar preserves the exact parsed financial facts.
2. Add opening loan $250, monthly principal $100, annual interest 12%, 3 months:
   principal payments $100/$100/$50, interest $2.50/$1.50/$0.50, then zero.
   Add asset cost $1,000, accumulated depreciation $400, remaining life 6 months,
   monthly depreciation $100, summary annual depreciation $1,200: expense is
   $100 once per month for six months, then zero; EBITDA is unchanged. Combined
   month-1 cash is $19,223.125 before display rounding.
3. A $1,000 included detail leaves the $10,000 overhead bucket and all financial
   rows unchanged. Replacing that total with only $1,000 blocks compilation;
   a reconciled $10,000 replacement preserves the original financial outputs.
   Material irregular annual payment blocks compilation instead of cash smoothing.

Source review confirms profile-specific provenance references/immutable sidecar,
no demo risk defaults, and exact revision/compiled/preview binding direction.
P3's tests independently passed unchanged preview -> acknowledgment -> confirmation,
foreign-owner rejection, stale/new-preview invalidation and snapshot-copy isolation.
This is a focused financial/internal-workflow review, not HTTP authentication or
complete adversarial security review. P2 operating and future importer review remain
separate; no full numerical/MC benchmark was repeated.
