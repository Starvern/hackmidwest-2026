# OperatorOS

Operational and financial scenario modeling for a synthetic HVAC business,
built on the existing SvelteKit + TypeScript app.

The [specification](docs/OperatorOS_Implementation_Spec.md) defines product and
financial behavior. The user-directed [stack amendment](docs/STACK_DECISION.md)
supersedes its Python/React stack requirements for Person 3.

## Setup and checks

Use Node 24 or newer (the tests execute TypeScript directly) and npm 11:

```sh
npm ci
npm run dev
```

```sh
npm test
npm run check
npm run build
```

UI and API share the SvelteKit server, normally `http://localhost:5173`.
GET `/api/v1/health` returns:

```json
{"status":"ok","simulation_ready":true}
```

Health reports HTTP availability separately from shared acceptance. Company, metadata and the real deterministic simulation endpoint are available. Shared Gates A/B are accepted; deterministic readiness is true. Monte Carlo remains unavailable. API routes
live under `src/routes/api/v1/`; runtime schemas use Zod; the engine interface was accepted at Checkpoint 1.
There is no separate Python API to install or run.

## Person 3 workflow

Follow [our ownership guide](docs/PERSON_3_CONTRACTS_API_FRONTEND.md) and
[checkpoint agenda](docs/PERSON_3_CHECKPOINT.md). Current shared types use accepted interface checkpoint-1-candidate-1. Dashboard development waits for deterministic Gates A/B;
Monte Carlo integration waits for Gate C. No financial defaults or forecasts
are introduced by the infrastructure setup.

## Shared contracts

Authoritative runtime definitions are in `src/lib/server/schemas.ts`; generated
types are in `contracts/contracts.ts`. Engine signatures and the exact candidate
revision are documented in [the schema handoff](docs/PERSON_3_SCHEMA_HANDOFF.md).

```sh
npm run contracts:generate
npm run contracts:check
npm run contracts:types
npm run fixture:contract
node scripts/validate_fixture.ts
```

`npm test` includes artifact/type checks and contract/API tests. Validate both
the Zod schema and Person 2's reconciliation checks before fixture integration.
The example request is illustrative input. The complete engine-generated response is contracts/example-result.json; npm test checks its reproducibility.

## API adapters

GET `/api/v1/company/demo` returns the validated synthetic company. GET
`/api/v1/model/metadata` returns versions, decision/metric definitions, units and
explicit engine readiness. API errors use the shared structured JSON contract.
POST `/api/v1/simulate/deterministic` runs the accepted-shape request through the real engine. See [the deterministic review](docs/PERSON_3_DETERMINISTIC_REVIEW.md) for acceptance status and [the API handoff](docs/PERSON_3_API_HANDOFF.md) for behavior and limits.

With a local server on port 4173 (`npm run dev -- --host 127.0.0.1 --port 4173`),
run `npm run test:api:live`. Set `OPERATOROS_API_BASE_URL` for a different port.

## Dashboard

The Svelte dashboard at `/` runs the real deterministic API and provides editable
truck/hire/marketing templates, six timeline metrics, month inspection, comparisons
and disclosed assumptions. See [dashboard handoff](docs/PERSON_3_DASHBOARD_HANDOFF.md)
for verified behavior and remaining design/Gate D review. Monte Carlo is not run.
