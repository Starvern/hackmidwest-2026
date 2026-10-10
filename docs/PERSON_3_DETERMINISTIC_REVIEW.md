# Person 3 deterministic review and API integration

Reviewed engine `2a8f6e4` and integrated Person 2 review `7c99edf` into Luke's
branch alongside API adapters `b1aed08`. Interface `checkpoint-1-candidate-1`,
schema 1.0, model mvp-1.0 and public contract revision 1 are unchanged.

Person 3 approves the complete deterministic response and adapter boundary.
P1 retains final shared Gate A/B acceptance. Health/metadata readiness remains
false until that explicit acceptance is recorded; the real deterministic route
is available for integration review. This is not a claim of MC or dashboard acceptance.

## Delivered

POST `/api/v1/simulate/deterministic` validates the accepted request and demo
company ID, calls P1's `simulate_deterministic`, validates the result and serializes
it without financial formulas. Malformed JSON returns structured 400; invalid
inputs, unknown companies and MC configuration return structured 422. Internal
fixture/output/invariant failures use the existing logged generic 500 adapter.
Run IDs come from the engine; identical requests preserve fingerprints/results
while receiving independent run identities. Responses use `Cache-Control: no-store`.

No public schemas, economic inputs, policies or engine modules changed. The
Monte Carlo route is still absent and MC readiness stays false. No fake forecasts
or frontend financial calculations were introduced.

## Independent evidence

Node 24.4.0/npm 11.4.2 on macOS:

- `npm test`: artifact/type checks, newly included computed-reference drift check,
  and all 66 tests pass (P1/P2 engine suite, existing adapters and two real-route tests).
- `npm run fixture:contract` and `node scripts/validate_fixture.ts`: pass actual fixture.
- `npm run check`: zero errors/warnings.
- `npm run build`: pass; hosting adapter selection remains deployment work.
- `npm run test:api:live`: verifies the real HTTP result against the complete
  committed reference, malformed-input rejection, company/metadata/health,
  structured 404/405 and existing page behavior.

The complete generated response passes authoritative Zod validation, contains
three ordered 61-state paths and reproduces exactly without regeneration.
The existing independent month-1 rational accounting assertions pass, including
spend-month maintenance depreciation. Adapter tests compare every output field
against the reviewed reference, allowing only the newly generated run ID to differ.
No fixture numbers or generated forecast values were edited to obtain agreement.

P2 independently approved scheduling/accounting integration in
`docs/PERSON_2_ENGINE_REVIEW.md`. P1: please record the exact accepted shared
Gate A/B commit after this review, then authorize readiness publication and
dashboard development. MC distribution assumptions/runner remain separate work.
