# P3 — focused P1/P2 review corrections

Responds to P1 confirmation-identity review and P2 representation/pairing review of
`ae9e4e4`. Includes P2's template draft `b29bb7c`. Existing economic assumptions,
engine formulas, fixtures/reference and completed MC benchmark remain unchanged.

## Runtime correction: presentation labels preserve pairing

`editPlanAction` now handles `name` locally, updating only the selected action's
label/provenance and preserving its stable investment key. Economic edits still
detach shared keys. Shared-action validation excludes presentation names, matching
the fingerprint's existing behavior; conflicting shared economic parameters and
local duplicate keys remain invalid.

The original three operational variants did not accept action names. Their common
schema now permits optional presentation `name` (1–100 trimmed characters), with
normal provenance coverage if supplied; custom items retain required names. The
editor exposes Action label for every action and uses it in the summary. Generated
TypeScript/JSON schemas reflect this additive presentation field. Existing request,
reference and economic fingerprint behavior is preserved when it is absent.

Focused regression renames copied trucks, hires and marketing, verifies unchanged
original labels, same shared keys/economic fingerprint and identical sampled action
risks across 20 run indices, then verifies an economic edit changes identity and a
conflicting shared economic edit is still rejected. Custom rename expectations now
retain the original key. No duplicate full benchmark is needed.

## Design correction: intake revision 2

`COMPANY_PROFILE_CONTRACT_PROPOSAL.md` advances profile, mapping and simulation
proposal literals to `2-draft`, with unchanged target pointers/economic policies.

- Baseline acknowledgment is separate from hashed field/source/reconciliation
  reviews. Preview -> acknowledge -> confirm binds one unchanged revision/hash;
  economic/source/review/mapping changes invalidate it. Acceptance sequence specified.
- Closed canonical units, exact pointer-specific engine unit aliases, typed
  service-mix/workforce/demand evidence and stable-ID workbook detail rows; lists
  use JSON arrays rather than ambiguous CSV splitting. Actual unsupported facts
  remain drafts and do not create runtime support.
- `review_projection.historical_tickets` is a server-derived, revision-bound review
  response field, outside editable inputs and hashes. Available/unavailable tags
  and explicit zero-jobs/unreviewed/conflict reasons preserve null semantics.
  Forecast ticket remains a separately reviewed required input.

P1/P2: review these narrow revision-2 changes, then P2 can finalize the matching
column specification. Intake runtime/schema/importer/storage are still future work;
no new gate acceptance is claimed by this document.

Verification: `npm test` 126 passing (including schema/type/reference checks);
`npm run check` zero errors/warnings; app/worker build passes; recorded MC context
195 probability / 2,753 quantile objects still validates. Browser renamed a copied
truck action, reran successfully, and confirmed the original still said Purchase
trucks. Both original/copy month-5 cash remained $349,634. Console clean. Confirmation
and derived-ticket acceptance sequences are design requirements awaiting intake
implementation, not claims of executed profile runtime tests.
