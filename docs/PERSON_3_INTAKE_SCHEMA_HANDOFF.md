# Person 3 — revision-2 intake schema foundation

Based on accepted proposal `340508a`, P2 column mapping `fa12778`, workbook
`58fb378`, and P1's completed financial collection review in issue #2.

## Implemented scope

`src/lib/server/intake/schemas.ts` is the authoritative intake payload schema.
It encodes business/history/opening records, expense ledger, structured operations,
forecast assumptions, sources and review records. Every value has a typed unit and
the common state/period/raw/derivation/review envelope; no coercion or demo defaults.
Unsupported trade/calendar/amortization facts can remain draft text for later
eligibility review. Required unknown envelopes remain null. Blank history/schedules
are valid draft structure, not execution eligibility.

Financial row spellings match P2's workbook builder exactly:

- Loans: `lender`, `name`, `amortization_policy`, `terms_source`,
  `outstanding_principal`, `monthly_principal`, `annual_rate`, `remaining_term`,
  `next_payment_date`.
- Assets: `name`, `cost_basis`, `accumulated_depreciation`, `monthly_depreciation`,
  `remaining_life`, `service_date`.
- Expenses: `name`, `category`, `source_period`, `currency`, `frequency`,
  `target_bucket`, `mapping_mode`, `allocation_rule`, `raw_amount`,
  `normalized_recognition_amount`, `coverage_start`, `coverage_end`, `irregular_payment`.

All rows additionally have `row_id`; all listed members are field envelopes.
`mapping_mode` permits only `replace_total`/`included_detail`. Monthly recognition
and original payment amount remain separate; no cash schedule is inferred.
Schema member comparison used the checked-in builder, not native Excel/importer
execution. Workbook visual review and financial collection review remain P2/P1's.

`reviewDraft` checks duplicate stable IDs, source/history/mix references and the
zero-jobs/nonzero-revenue conflict. `historicalTickets` yields tagged available or
unavailable records, requires reviewed compatible pools/source coverage, and
accepts explicit upstream source-conflict row IDs. These are review helpers, not
financial reconciliation or a claim of execution eligibility.

Generated `contracts/intake.ts` and `contracts/company-profile.schema.json` are
checked by existing contract generation/check commands. JSON Schema consumers
must also run authoritative runtime validation: JSON Schema cannot express all
state, reference or review refinements.

## Authority and remaining implementation

The payload deliberately excludes server ID/revision/status, access credentials,
preview acknowledgment and confirmation. Client-supplied review actors are
recorded evidence only: parsing grants no authority. A future authenticated server
must establish actors and authorize review transitions; spreadsheet cells cannot.
No new callable intake route or real-company run is exposed by this foundation.

Next P3 slice: full financial/date/operating eligibility and provenance extension,
deterministic compilation, owner/session persistence and immutable revisions,
preview/acknowledgment/atomic confirmation tests, API/UI and exact worker/result
binding. Company-specific MC risk must pass its separate reviewed contract; the
draft risk envelope grants no MC eligibility. Manual/import inputs must converge
on this same payload. Reconciliation/review record spellings newly encoded here
are runtime candidates for focused integration review, not prior workbook claims.

P2's owner-guidance follow-up from P1 remains theirs: explain both mapping modes
and recognized monthly expense versus irregular cash beside the expense inputs.
Gate D independent browser acceptance and Gate E remain separate and open.
