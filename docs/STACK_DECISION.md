# Stack amendment — October 10, 2026

The user directed Person 3 to build on the existing SvelteKit repository.
This supersedes the Python/FastAPI/Pydantic and React stack requirements in
specification §0.5 and the original implementation/ownership guides.

- Keep SvelteKit, TypeScript, Vite and the existing npm configuration.
- Implement HTTP adapters as `src/routes/api/v1/**/+server.ts` routes.
- Use Zod for runtime contracts in `src/lib/server/schemas.ts` after the shared
  interface checkpoint; derive/check TypeScript and JSON Schema artifacts.
- Build the dashboard with Svelte components after Gates A/B.
- Serve UI and API from the same origin; no separate development CORS layer is
  needed. SvelteKit's existing origin protections remain enabled.
- Use Node's test runner for current API checks; add appropriate Svelte/component
  tooling when dashboard development begins.

The Person 3 Python infrastructure has been removed. If Persons 1/2 are already
implementing a Python engine, agree the engine boundary at the checkpoint;
this amendment does not silently rewrite their owned modules. Person 3's API
must call the accepted engine and never duplicate its financial formulas.

Financial policies, module ownership, response vocabulary, deterministic-first
ordering, provenance, null semantics and acceptance gates are unchanged.
Historical documents mentioning Python or React should be read with this
amendment. No runtime contract has been frozen.
