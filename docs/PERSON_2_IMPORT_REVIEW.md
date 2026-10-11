# Person 2 workbook importer review

Reviewed P3 commit `aeebd00`, integrated on `will` through `abe676a`.
Disposition: acceptance pending the internal blank-row finding below.

## Independent evidence

The seven existing actual-XLSX importer tests pass. Two added tests in
`tests/intake-p2-import.test.ts` pass: whole history records reordered across
months still join by stable ID, retain periods, raw cents and typed zero;
unknown cash differs from entered zero, workbook cell sources remain attached,
and claimed actor/time approval is discarded. Estimate intent remains entered
and unreviewed. These use the real workbook parser and checked-in template.

## Finding: successful import silently truncates populated rows after a gap

Reproduce on the populated fixture by clearing Business sheet `A11:S11` while
leaving rows 12–15 populated. `importWorkbook` returns successfully, but currency,
accounting basis, books-through and forecast-start all become unknown/null.
This is silent loss of supplied input even if later eligibility blocks preview.

`table()` in `src/lib/server/intake/import.ts` stops at the first row with a
blank leading cell when the rest of that row is empty. It does not check for
populated records below that gap. The detail-table reader uses a similar stopping
pattern; its gap behavior should also receive focused regression coverage.

Requested P3 correction: reject internal gaps with bounded diagnostics, or safely
read subsequent keyed records within the declared table bounds. Preserve the
separation between field, source, notes and linked-detail tables. Add coverage for
field-table gaps and the corresponding named-source/detail-table cases.

Run the deliberately failing expected-behavior reproduction separately:

```powershell
node --test docs/review-cases/intake-p2-gap.test.ts
```

At the reviewed commit this fails with `Missing expected exception`. It is kept
outside the default passing test glob until P3 incorporates the fix and regression.
Run the nine normal importer tests with:

```powershell
node --test tests/intake-import.test.ts tests/intake-p2-import.test.ts
```

## Scope

This is a focused parser/normalization review on Windows Node 22.20. It does not
accept Windows durable storage, native Excel round-trips, upload security,
independent browser Gate D, release Gate E or company worker/job/recorded binding.
No engine policy change or full Monte Carlo benchmark is included.
