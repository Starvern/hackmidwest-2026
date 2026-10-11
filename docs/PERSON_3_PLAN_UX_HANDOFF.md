# Person 3 — Plan editor, chart explanation and risk summary

Built on P2/P1 unchanged-input investigations through `e5bdc0d`. Publishes to
`luke`. This supersedes the two-template/shared-edit limitations in the original
deterministic dashboard handoff. A/B/C acceptance is unchanged; D/E remain pending.
Schema/model/contract revisions, engine formulas, example request and company fixture
are unchanged. All displayed forecasts and financial deltas come from the real engine.

## Delivered

- Create empty plans, copy/rename/remove plans, and add/remove trucks, hires and
  marketing actions. Keep the contract minimum of baseline plus two alternatives.
  New actions copy disclosed example assumptions and preserve provenance; identity
  leaves become user input. Plan edits affect only the selected plan. A shared action
  receives a fresh stable key before its economics change, preserving the original.
- Deterministic comparison accepts the existing contract's additional alternatives.
  Risk comparison remains baseline plus selected plan plus one chosen alternative:
  2,000 runs × 3 scenarios. No workload expansion or contract change.
- Total/change-from-baseline chart toggle, selected-month legend values and zero
  reference line. Change mode projects backend `monthly_deltas`; baseline remains
  an explicit reference, with no invented numeric delta. Utilization changes use pp.
  Reserve line appears only on total cash. Opening nulls remain gaps/unavailable.
- Result-derived sales-uplift month ranges, monthly sales/cash deltas and customer
  demand versus capacity. Explain finite marketing response and continuing resource
  costs only where those actions actually occur in the completed result. Default
  inspection starts at month 5 so the original example's campaign response is visible.
- Plain-language risk questions: reserve shortfall over the horizon, finishing below
  paired baseline, investment recovery and modeled year-five owner-value range.
  Eligibility/unavailable counts remain visible; recovery reversal caveat remains.
  Technical distributions, month inspector, pointwise chart and run identity remain
  behind a disclosure. Seed moves into simulation settings.
- Example risk results are explicitly labeled with original inputs/seed, stale
  comparisons are marked, and a new plan absent from recorded output gets an explicit
  message rather than another plan's results. Prior successful results survive running,
  cancellation and errors through the existing controller.
- Larger planning text, collapsed action settings and monthly financial inspector
  reduce the initial reading burden. Synthetic assumptions remain disclosed.

## Evidence

- `npm test`: 118 passing, including new independent-edit/provenance, all-action
  composition, three-scenario risk selection and revenue-window/delta checks.
  Contract artifacts/types and frozen 61-state reference pass.
- `npm run check`: zero errors and warnings. `npm run build`: passes.
- Browser on the compiled opt-in local preview, port 4174:
  - Combined revenue uplift: month 5 $26,172, month 12 $26,476, month 13 $26,520;
    month 17 $0, matching P1/P2 traces after currency display rounding.
  - Trucks-only revenue delta $0; chart clearly shows combined benefit months 5–16.
  - Created and ran a user-authored marketing-only test plan (monthly spend $5,000),
    then copied it and edited the copy to $6,000. Original remained $5,000. Removed
    the copied action and plan successfully; stale results remained labeled.
    This temporary UI test did not alter any committed example or reference output.
  - Recorded combined risk summary: shortfall 18.10%; lower paired exit value
    100.00% among 1,981 eligible / 19 unavailable; recovery 0.00%; owner-value
    P10–P90 $2,381,318–$10,537,408, median $5,923,551.
  - A plan absent from recorded output displays an explicit unavailable-plan message.
  - Submitted a manual real 2,000-run job, observed running/progress (6 aggregated
    runs), cancelled it and verified recorded results remained visible. This is
    lifecycle evidence, not another completed benchmark.
  - No console errors/warnings; document width equals the 1120px browser viewport.

## Remaining review and limits

P1: independently review the displayed financial values, chart delta semantics,
reserve/payback/valuation wording and risk eligibility for Gate D. P2: review the
operational explanation and identity/pairing of independently edited actions.
Implementation verification does not self-accept D/E.

Plans are held in memory until page reload, disclosed beside the editor. Durable
plan storage, undo, broader accessibility/browser acceptance and hosted deployment
remain follow-ups. Additional deterministic plans share six chart colors cyclically.
Risk execution remains the accepted explicitly enabled local workflow; full reruns
can take roughly 24 minutes. This handoff introduces no new completed MC benchmark.
