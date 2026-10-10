# Person 3 interface checkpoint

Status: pending joint review by Persons 1 and 2. This document does not freeze
contracts, approve financial policies, or establish Gates A/B/C/D.

Working branch: `codex/contracts-api`; review baseline: Gavin commit `8c7acc7`.

## Ready for review

The existing `contracts/contracts.ts` and contract README remain the proposed
public vocabulary. Person 3 will encode the agreed version in Zod and
generate/check its JSON Schema and TypeScript artifacts. No financial defaults
will be introduced by schema defaults.

Backend setup now supports npm dependency installation, Node tests, SvelteKit and a health
endpoint. Health reports HTTP service availability separately from simulation
readiness. No simulation endpoint exists until a real engine can be connected.

## Decisions needed at the checkpoint

| Topic | Decision needed | Review owner |
| --- | --- | --- |
| Persistent state | Where technician cohorts, vehicle activation and campaign history persist between months; exact prior/ending-state types | Persons 1 and 2 |
| Monthly events | Exact purchase/financing, cohort payroll, recruitment, marketing spend/demand and asset-transition fields | Persons 1 and 2 |
| Stochastic inputs | Explicit neutral market factors and decision path risks usable by the deterministic engine; distribution keys/bounds later | Persons 1 and 2 |
| Debt | New borrowing's first interest/principal month and disbursement treatment; existing debt timing | Person 1 |
| Assets | Existing depreciation reconciliation and maintenance CapEx depreciation policy | Person 1 |
| Working capital | AP-eligible categories, inventory policy and consistent opening balances | Person 1, recorded by Person 2 |
| Timing | Recruitment charge, marketing tail and growth reference month | Persons 1 and 2 |
| Payback | Numerical tolerance and investment-outlay qualification; reversal semantics | Person 1 |
| Fingerprint | Canonical numeric representation, ordering of scenarios/decisions, included provenance/assumptions and digest ownership | Persons 1 and 3 |
| Provenance | JSON Pointer root/scope for company and decision manifests, required units and treatment of nonfinancial identity leaves | Persons 2 and 3 |
| Versioning | Accepted initial interface commit, contract revision and migration policy | Person 1 with both reviewers |

After review, record the accepted choices in Person 2's assumptions manifest and
the exact interface commit in the implementation plan. Then implement schemas,
boundary validation and reproducible artifact/drift checks. Full deterministic
freeze additionally requires the reconciled fixture, engine tests and complete
61-state engine-generated result.

## Handoff status

- Owned changes: SvelteKit routes/dependencies, API infrastructure/tests, setup
  documentation and this checkpoint agenda.
- Public interface: GET `/api/v1/health` returns `status` and `simulation_ready`.
- Contract revision: unchanged; existing revision 1 is still a review baseline.
- Financial assumptions added: none. Breaking contract changes: none.
- Pending: runtime schemas, fixture validation, engine adapters, four remaining
  specified endpoints and SvelteKit dashboard. Gates A/B/C/D remain pending.
- Verification: `npm test` passed the health-route test; `npm run check`
  reported zero errors/warnings; `npm run build` passed.
- Example: GET `/api/v1/health` → HTTP 200,
  `{"status":"ok","simulation_ready":false}`.
- Stack: user-directed SvelteKit amendment; see [decision](STACK_DECISION.md).
- The original Python setup was pushed as `f465634`; this change replaces it.
