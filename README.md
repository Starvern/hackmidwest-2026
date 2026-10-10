# OperatorOS

Operational and financial scenario modeling for a synthetic HVAC business.
The [specification](docs/OperatorOS_Implementation_Spec.md) is authoritative.

Current status: Person 3 backend infrastructure is available. Runtime contracts,
fixture and engines await the shared interface checkpoint. The Svelte starter
remains until Gates A/B permit the React + TypeScript + Recharts migration.

## Backend setup

Requires Python 3.11 or newer. From the repository root:

```sh
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -e 'backend[dev]'
```

Run checks and start the API from `backend/`:

```sh
cd backend
.venv/bin/python -m pytest
.venv/bin/python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

GET `http://127.0.0.1:8000/api/v1/health` returns:

```json
{"status":"ok","simulation_ready":false}
```

Health checks HTTP service availability separately from engine readiness. The
other four specified endpoints await real fixture/engine integration. OpenAPI
is available at `/docs`.

CORS permits `http://localhost:5173` by default. Set
`OPERATOROS_FRONTEND_ORIGINS` to a comma-separated list of explicit origins;
wildcards are rejected.

Dependencies are declared in `backend/pyproject.toml`. The tested Python 3.13
environment is pinned in `backend/requirements-dev.lock`. To reproduce it:

```sh
backend/.venv/bin/python -m pip install -r backend/requirements-dev.lock
backend/.venv/bin/python -m pip install --no-deps -e backend
```

## Existing frontend starter

Node 24 and npm 11 were available during setup. Run `npm ci`, then `npm run dev`.
Existing checks are `npm run check` and `npm run build`. This is still the starter,
not an OperatorOS dashboard or a completed frontend acceptance gate.

## Person 3 workflow

Follow [our ownership guide](docs/PERSON_3_CONTRACTS_API_FRONTEND.md).
[The checkpoint agenda](docs/PERSON_3_CHECKPOINT.md) records unresolved interfaces
and policies for Persons 1 and 2 to review before runtime schema implementation.
The TypeScript contract remains a review baseline.

Merge order: setup/schema → fixture → scheduler/operations → financials and
scenario response → deterministic acceptance → API/dashboard. Monte Carlo
integration follows Gate C. This setup introduces no financial assumptions.
