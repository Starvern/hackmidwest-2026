# Person 3 interface checkpoint

Status: pending joint review by Persons 1 and 2. This document does not freeze
contracts, approve financial policies, or establish Gates A/B/C/D.

Working branch: `codex/contracts-api`; executable candidate `checkpoint-1-candidate-1`.
See [schema handoff](PERSON_3_SCHEMA_HANDOFF.md) and issue #2 for the exact published commit.

## Ready for review

The existing `contracts/contracts.ts` and contract README remain the proposed
public vocabulary. Person 3 has encoded the reviewed candidate in Zod and added reproducible JSON Schema and inferred TypeScript artifacts. No financial defaults
will be introduced by schema defaults.

Backend setup now supports npm dependency installation, Node tests, SvelteKit and a health
endpoint. Health reports HTTP service availability separately from simulation
readiness. No simulation endpoint exists until a real engine can be connected.

## Reviewed design areas (executable acceptance pending)

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
the exact interface commit in the implementation plan. Candidate schemas, boundary validation and reproducible artifact/drift checks are now implemented; Persons 1/2 must review the executable commit. Full deterministic
freeze additionally requires the reconciled fixture, engine tests and complete
61-state engine-generated result.

## Handoff status

- Owned changes: SvelteKit routes/dependencies, API infrastructure/tests, setup
  documentation and this checkpoint agenda.
- Public interface: GET `/api/v1/health` returns `status` and `simulation_ready`.
- Contract revision: unchanged; existing revision 1 is still a review baseline.
- Financial assumptions added: none. Coordinated internal changes: sixth scheduler argument and FinancialStepResult wrapper; see the schema handoff.
- Delivered candidate: runtime schemas, internal types, fingerprint utility, drift checks and actual fixture validation.
- Pending: P2/P1 executable candidate review and acceptance, engine adapters, four remaining
  specified endpoints and SvelteKit dashboard. Gates A/B/C/D remain pending.
- Verification: `npm test` passed 11 contract/API tests plus artifact/type checks; `npm run check`
  reported zero errors/warnings; `npm run build` passed.
- Example: GET `/api/v1/health` → HTTP 200,
  `{"status":"ok","simulation_ready":false}`.
- Stack: user-directed SvelteKit amendment; see [decision](STACK_DECISION.md).
- The original Python setup was pushed as `f465634`; this change replaces it.
