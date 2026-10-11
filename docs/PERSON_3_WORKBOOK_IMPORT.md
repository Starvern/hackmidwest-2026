# Person 3 — revision-2 workbook importer candidate

Builds on local API/UI `7f69e13`. P2's checked-in eight-sheet workbook is now
available to download in /intake and import as a **new draft** through the local
review environment. Existing revisions are never overwritten by import. Supported
platform/session/retention boundaries from PERSON_3_INTAKE_API_UI.md still apply.

## Exact mapping and review

The server reads values-only OOXML using fflate and fast-xml-parser. No Python
backend, spreadsheet calculation, demo fallback or upload retention is introduced.
Field pointers/units/mapping version and exact headers are checked against the
revision-2 template. Repeated fields join by stable row ID, not row position; history
periods come from actual supplied YYYY-MM text. Empty placeholder schedules/history
are omitted, without inferring no-debt/no-assets or an observation year. Missing
values remain unknown; typed zeros remain zero. Numeric and boolean strings are not
coerced. Category/reference lists must be JSON arrays, never comma-split strings.

Linked service mix, workforce declarations/constraints, and tagged demand evidence
(measured observations, estimate or no-unserved declaration) map to the same strict
ProfilePayload as manual entry. Parent periods/states must agree with linked records.
Orphan observations/constraints, inactive demand members, duplicate pointers, units,
IDs/references and invalid typed values reject. Unsupported operating facts remain
schema-valid drafts and block existing eligibility rather than silently simplifying.
Risk settings are not imported or copied from the demo.

Period columns require either explicit start/end or as-of coverage. ISO date strings
and unambiguous standard Excel 1900 calendar date cells are supported. Fractional
serial dates, serial 60 and the 1904 calendar reject. No date is inferred from a
filename, blank month column or operating total. Month keys stay YYYY-MM text.
Percent-formatted numeric cells preserve their underlying fraction; no percent
text conversion. Raw text/unit/precision columns must be complete together and are
preserved. Otherwise original numeric XML text/lexical precision is retained; display
formatting alone is not a claim of source precision. Supply raw monetary precision
explicitly when the source states cents.

Named source records preserve kind/title/coverage/locator. Entered values additionally
reference exact workbook SHA256 + sheet/cell source records. Operating evidence includes
its detail-cell sources. Upload filenames/local paths are not stored. Only normalized
facts/source records persist; uploaded bytes stay in request memory. Imported actor/time
and claimed confirmation are discarded. Estimate intent is retained separately and
review cannot relabel an unchanged estimate as a measured fact. Draft source review,
real baseline preview and exact acknowledgment/confirmation remain mandatory.

## Transport and UI

POST /api/v2/intake/import accepts the XLSX media type under existing session and
same-origin enforcement. Streaming upload limit: 1 MiB. Archive limits: 200 entries,
4 MiB per expanded entry, 8 MiB total declared/returned content; worksheet limit:
50,000 cells and row 10,000. Import allows 500 fields / 800 source records. Duplicate
archive names, traversal paths, macros/embeddings/ActiveX/external links, XML entities
or malformed XML, formulas and error cells reject. Formula caches are never treated
as reviewed facts. Failure creates no partial profile. File errors return bounded
cell/pointer diagnostics without echoing source values. This is candidate local
handling, not a completed public-upload/security review.

The form shows imported operating facts and methods/limitations, estimate labels,
editable source periods, and an add-source form. Each scalar source dropdown includes
its assigned cell references plus named evidence/estimates; unrelated workbook cells
are omitted from that dropdown to avoid tens of thousands of repeated option nodes.
The full source list remains inspectable. Eligibility notices are distinguished from
blocking inputs. Blank imported workbooks have no historical rows; fill actual history
in the workbook and import another draft rather than inventing months in the app.
Complex linked evidence can be inspected, but the manual editor still supports only
one pool/fully available staff/estimated demand. Edit other variants in the workbook.

## Evidence and next owners

Actual checked-in P2 blank workbook imports with zero invented sources/history/value
claims. Disposable in-memory OOXML mutations of that same template cover populated
financial/history/operating fields, raw cents, explicit zeros, stable IDs, workbook
review stripping, retained demand estimate, source-cell references, real review →
preview → confirm, measured observation variant, date serials, schedule normalization,
malformed lists, text numbers, duplicate pointers, wrong units, missing periods,
unknown parent evidence, formula caches, external relationships and expansion bounds.
Loan/asset/included expense import reproduces P1's $19,223.125 first-month cash,
$100 principal/depreciation and unchanged $43,600 EBITDA. No-asset/debt fixture gives
$19,300 ending cash, $84,000 sales and 480 completed jobs.

HTTP upload test covers session ownership, unauthorized/cross-origin/foreign reads,
unreviewed draft/estimate retention, and no partial profile on malformed files.
Final integrated suite: 167 tests pass on macOS; contracts/types, frozen reference,
Svelte zero errors/warnings and production app/worker build pass. Dependencies installed
from npm with zero audit findings at installation; prior unrelated lockfile edits
remain excluded from the commit.

Browser implementation-owner smoke: uploaded a populated synthetic copy through the
file chooser and import button, inspected imported evidence, reviewed through the form,
calculated the real baseline and confirmed revision 2. Displayed $84,000 M1 sales,
-$100 minimum cash and 480 jobs. The dropdown performance issue discovered in this smoke
was corrected and review succeeded afterward. Not native Excel round-trip acceptance,
independent browser Gate D, broad upload audit or release Gate E.

P2 is now up for focused **actual importer** normalization review using the accepted
workbook/operating matrix. P1 may narrowly review financial schedule/raw-precision import;
prior compiler accounting review need not repeat. P3 handles resulting findings and
continues exact company worker/job/recorded snapshot binding separately. Company MC,
public hosting/multi-user sharing, extraction and Windows private storage remain disabled.
