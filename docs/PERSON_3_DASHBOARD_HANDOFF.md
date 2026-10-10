# Person 3 — Deterministic dashboard, first review

Built on shared Gates A/B acceptance at `f16523e`, accepting integrated dependency
`2f146e9`. Schema 1.0, model mvp-1.0, public revision 1 and interface identifier
`checkpoint-1-candidate-1` remain unchanged. No economic inputs or engine formulas changed.

## Delivered

- Health `simulation_ready: true`; metadata deterministic readiness true and MC false.
- Svelte dashboard loads company/metadata and runs the real deterministic API on entry.
- Two alternative scenario editors expose all three seeded decision types, timing,
  delays, ramp, payroll, marketing duration/cost, truck funding and loan terms.
  Baseline remains empty. Zero quantities/spend permit no-effect decisions.
- Shared truck edits update both alternatives by stable investment key. Edited
  decision leaves retain unit metadata and become user_input provenance.
- Six timeline modes: cash, monthly EBITDA, revenue, debt, utilization and modeled
  equity. Stock metrics include opening; unavailable flows/valuation remain gaps.
  Reserve is drawn only for cash and comes from the completed run's assumptions.
- Month slider supports keyboard selection from 0–60. Event markers include native
  hover descriptions. Inspector has tabular scenario values/backend deltas, events,
  operations, a full financial breakdown/debt movements and valuation context.
- Cards use backend exit value/deltas, minimum cash/trough and explicit payback and
  reversal statuses. No favorable expansion assumption or frontend financial math.
- Input edits label charts/cards as previous results until a successful rerun.
  Pending/error/retry states and polite status announcements are present.
- Synthetic-data notice, resolved run assumptions, company input provenance,
  model limitations/version/run/fingerprint are available in the page.
- Responsive layout, native labeled controls, focus outlines, and accessible table.

## Verification

`npm test`: 68 passing tests including existing engine/API acceptance and two
new projection/paired-edit tests. Artifact/types/reference checks pass.
`npm run check`: zero errors/warnings. `npm run build`: passes.
`npm run test:api:live`: real output matches complete reference and readiness is true.

Browser verification on the real local Svelte app:
- Clean load matches reference exit cards ($8,432,705 baseline, $6,135,605 combined,
  $8,044,230 trucks); month-1 cash/debt/EBITDA and backend deltas match the API.
- Editing trucks 2 → 3 marks previous results stale; rerun updates both alternatives
  and returns current results (cash month 1 $325,701, incremental borrowing $90,000).
- Opening month renders cash/debt and unavailable flows/valuation, not zero.
- Keyboard ArrowLeft changes selected month 60 → 59 and the inspector updates.
- Desktop 1440px and narrow 497px document widths equal their viewports; tables
  scroll inside their containers. Temporary viewport override restored.
- Browser validation caught/fixed currency/multiple step-base mismatches and
  Svelte state snapshots avoid cloning reactive proxies on edit.

## Remaining review

This is the first functional design for user/team review, not a declaration of full
Gate D/E acceptance. Scenario construction is currently the two provided templates;
freeform adding/removing scenarios/actions, visual refinements and broader browser
error/retry/accessibility acceptance can follow user feedback. MC is explicitly not
run: no simulated bands, percentiles, probabilities or stochastic claims are shown.
P2 owns distribution/runner work and Gate C precedes integration of those results.
Hosting adapter/deployment remains separate. The local dev preview can be kept
running on port 4173 for the user's UI review.
