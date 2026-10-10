# Person 3 — Read-only API adapters after Checkpoint 1

Starting dependency: accepted `5725edf`, interface `checkpoint-1-candidate-1`.
Published branch: `luke`; exact API commit is linked in issue #2. This adds API
contracts/adapters, not an engine revision or full Gate A/B acceptance.

## Delivered behavior

| Endpoint | Response |
| --- | --- |
| GET `/api/v1/company/demo` | Existing strict `CompanyInput`, including 12 historical months, opening state, assumptions and provenance |
| GET `/api/v1/model/metadata` | Versions/interface ID, three decision types, nine shared metric definitions, units, opening-state availability, explicit readiness and limitations |
| GET `/api/v1/health` | Existing `{"status":"ok","simulation_ready":false}` |

Company loading imports P2's existing JSON into the server bundle and parses it
through the accepted Zod contract for each call, producing independent objects.
It does not depend on a deployment filesystem path or mutate shared fixture data.
API-only loader lives under `src/lib/server/api/`; P2's owned fixture module and
fixture/generator files are unchanged.

Metadata is a new additive endpoint shape in `ModelMetadataSchema` and
`MetricDefinitionSchema`, with inferred aliases and generated JSON Schema.
Existing engine/public request-result schemas, policies, interface identifier,
contract revision and fingerprint semantics are unchanged. Endpoint readiness
remains deterministic false and Monte Carlo false until actual engine acceptance.
Monthly/TTM/stock/ratio units and null valuation semantics are described without
calculating financial values.

## Error adapters

`readApiInput(request, schema)` validates incoming JSON for future real route
adapters. Malformed JSON returns structured HTTP 400 (`INVALID_JSON`); schema
violations return 422 (`VALIDATION_ERROR`) with JSON Pointer paths. This helper
is covered by tests but no simulation endpoint is exposed merely to exercise it.

`apiResponse(operation)` serializes real validated loaders/engines. Internal errors,
including fixture/output schema failures, log internally and return generic
structured 500 (`INTERNAL_ERROR`), never success or a user-validation error.
Callers must validate engine output with the relevant schema before returning it.

`src/hooks.server.ts` applies shared error formatting only to `/api/v1` and its
subpaths, including framework 404/405 and unexpected failures. Successful page
responses retain normal SvelteKit behavior. API error responses preserve useful
HTTP headers (such as Allow), replace the body/content type, recalculate content
length and disable caching. Same-origin UI/API and SvelteKit origin protections
remain in place; no wildcard CORS is introduced.

Example error:

```json
{"error":{"code":"NOT_FOUND","message":"API endpoint not found.","details":[]}}
```

## Verification

Passed on Node 24.4.0/npm 11.4.2:

```sh
npm test
npm run check
npm run build
```

17 tests pass, including actual route responses, independent fixture objects,
metadata units/readiness, malformed input, schema failures, internal logging and
framework error normalization. Artifact drift and strict boundary type checks
are included in npm test. Svelte check: zero errors/warnings; build passes.

Live checks passed with a local SvelteKit development server:

```sh
npm run dev -- --host 127.0.0.1 --port 4173 --strictPort
# In another terminal:
npm run test:api:live
```

Set `OPERATOROS_API_BASE_URL` if checking another local port. The script verifies
company/metadata/health responses, structured missing-route and unsupported-method
errors, absent deterministic simulation endpoint, and the existing HTML page.
Adapter-auto still requires choosing a deployment target before hosting.

## Remaining integration

P1/P2 review the additive metadata contract and hook/adapter behavior. When real
one-month/60-month engine functions are available, simulation routes will validate
requests, call those functions and validate the complete response. No financial
formula, simulation stub, MC runner, fake forecast or product dashboard is added.
Dashboard development remains behind full Gates A/B; MC integration remains
behind Gate C. These adapters alone do not advance those gates.
