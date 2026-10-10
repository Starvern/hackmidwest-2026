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
{"status":"ok","simulation_ready":false}
```

Health reports HTTP availability separately from engine readiness. The four
remaining specified endpoints await real fixture/engine integration. API routes
live under `src/routes/api/v1/`; runtime schemas will use Zod after the checkpoint.
There is no separate Python API to install or run.

## Person 3 workflow

Follow [our ownership guide](docs/PERSON_3_CONTRACTS_API_FRONTEND.md) and
[checkpoint agenda](docs/PERSON_3_CHECKPOINT.md). Current shared types remain a
review baseline. Dashboard development waits for deterministic Gates A/B;
Monte Carlo integration waits for Gate C. No financial defaults or forecasts
are introduced by the infrastructure setup.
