# P2 compiler review

Exact target: P3 `adbb458`. P2 operating projection/provenance disposition:
no blocking finding in tested scope. Four new executable operating acceptance
tests are in `tests/intake-p2-operations.test.ts`.

Verified actual compiled engine output for technician/fleet bottlenecks (600 demand,
480 completed, 120 unserved), spare capacity (400 completed), and zero fleet
(zero completed, 600 unserved). Reviewed weighted forecast ticket $175 versus
historical tickets $100/$200, zero-job unavailable ticket and zero-job revenue
conflict blocking. Mean-1 seasonal 0.5/1.5 factors yield demand 50/150 exactly.
Invalid seasonality, incompatible pools/trades, unsupported part-time workforce
and missing demand evidence block compilation. Exact revision/source references,
engine unit aliases, raw precision, estimate state and independent source snapshots
are preserved; no company MC defaults are supplied.

Independent Windows Node 22 verification:

- Four new P2 tests pass.
- Combined intake/schema/preflight/workflow/P2 suite: **23 passed, 1 failed**.
- Svelte check: zero errors/warnings.

## Narrow storage finding for P3

`node --test tests/intake.test.ts tests/intake-eligibility.test.ts tests/intake-workflow.test.ts tests/intake-p2-operations.test.ts`
fails the existing durable SQLite reopen/delete test at
`tests/intake-workflow.test.ts:120`. `ProfileStore` rejects the temporary directory
before opening the DB with `Profile database requires a private application directory`.
The constructor at `src/lib/server/intake/store.ts:53` checks POSIX group/other
mode bits; Windows privacy is expressed through ACLs, not those bits. Its later
0600 assertion also needs a platform-specific policy. In-memory workflow tests
and bound deterministic execution pass; durable local storage is not verified here.

P3 should define supported storage platforms and enforce/verify private access
appropriately, or explicitly restrict durable storage to supported platforms.
Do not silently remove the privacy check, mark Windows persistence accepted, or
skip the case while claiming the workflow passes. This is separate from P2's
operating/compiler disposition and P1's financial/confirmation review.

No public intake/HTTP auth, importer, native workbook roundtrip, independent browser
acceptance, Gate D/E closure or new full MC benchmark is claimed. P2 importer
integration review still awaits an actual importer.
