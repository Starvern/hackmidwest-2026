# Local deterministic showcase rehearsal

Runtime: `luke d72f765`, including Sapling branding and concise results. Selected package integrated from `will d3948d0` at `outputs/showcase-demo`. Rehearsal host: Luke's current macOS checkout, Node v24.4.0. This is a verified presentation-host candidate; final host still needs team agreement. The selected workbook describes a fictional business.

## Selected package rehearsal completed

Workbook SHA256 `11db0060e763103f84188be7fcd8731692dbed3d96f6ad0c1f914349776f32da` matches P2's handoff. `node scripts/prepare_demo.ts verify` passed against this checkout, checking the actual exported XLSX, review/preview/confirmation and all 60 forecast months. The supplied verification script rewrites generated plans/checkpoints with disposable import identities; the checked-in P2 originals were preserved after verification.

The built browser flow on port 4182 imported this exact workbook, explicitly reviewed inputs/sources, calculated the baseline and confirmed **profile `b01847d9-c6fe-4536-87b0-bd42204f734a`, revision 2**. This ID is local to the rehearsal browser and database, not a portable account or submission link.

Baseline is empty. Plan A is empty and named “Hold current operations”. Plan B is “Software subscription (cost only)” with only a $1,000/month operating expense starting month 1 for 60 months. Reserve $1,000 and exit multiple 4 were verified in the browser. Results became stale after edits and current after recalculation.

Displayed month-one sales $84,000 for every plan; EBITDA $43,600 baseline/Plan A vs $42,600 software; cash $19,300 vs $18,550, delta -$750. Demand/capacity 600/480, completed jobs 480, productive technicians 10, active trucks 8. Year-five owner value $4,041,400 vs $3,948,400, delta -$93,000. Starting/minimum cash -$100 at month 0. Empty plan payback not applicable; software payback not reached. Five-year explanation reports $45,000 less ending cash, $93,000 less estimated value and three concise bullets. No browser console errors captured. Company risk stays unavailable.

This completes P3 selected-package integration and implementation-owner browser rehearsal. P1/P2 independent selected-result/browser review and joint D/E acceptance remain outstanding. Keep the comparison tab open; plan settings reset on reload.

## Start the built app

From the repository, with dependencies installed:

```sh
npm run build
mkdir -m 700 /tmp/operatoros-showcase
OPERATOROS_INTAKE_REVIEW=1 OPERATOROS_INTAKE_DIRECTORY=/tmp/operatoros-showcase npm run preview -- --host 127.0.0.1 --port 4182 --strictPort
```

If that directory already exists, reuse it only if it is your private rehearsal directory; the server enforces private storage permissions. Do not remove it to restart. Open `http://127.0.0.1:4182/intake` in the same browser throughout. Keep its cookies and the storage directory to reopen confirmed profiles. Stop the server with Ctrl-C. Restart with the same environment/directory/port. This is local preview, not a production deployment. Windows durable storage is unsupported; do not bind to an external interface.

## Present the flow

1. Select the team's prepared revision-2 `.xlsx` workbook; import as a new draft. Explain sources and the distinction between facts and estimates. Imported review claims grant no approval.
2. Inspect opening balances, history, staffing/fleet, demand and forecast assumptions. Review entered inputs with an explicit rationale and checkbox. Resolve blocking issues before proceeding; do not fill unknowns from the fictional demo.
3. Calculate the starting picture. Explain month-one sales, completed jobs and lowest cash; negative cash has no automatic funding. Acknowledge that exact picture and confirm the revision.
4. Open Compare investment plans. Confirm business name/revision and Results current. Empty alternatives initially equal the baseline. Add the selected demo actions, inspect costs/timing, then Run comparison. Editing marks prior results stale until recalculation.
5. Inspect month one and later months using the slider. Explain demand versus capacity, sales versus cash, debt and modeled exit equity. A cost-only expense has no invented sales benefit. Present payback only as reported by the engine.
6. Company risk remains unavailable while configuration/execution/exposure gates remain open. If showing the separate fictional risk demo, identify it as a different synthetic business. Never describe it as this imported company's forecast.

Plans currently last only until page reload. Rehearse action entry, and capture final screenshots before presentation. Confirmed company snapshots persist, but lost session cookies have no account recovery. Do not rely on browser reload to retain investment plans.

## Completed implementation-owner rehearsal

Actual browser file chooser -> workbook import -> review -> real preview -> acknowledgment -> confirmation -> bound comparison passed on macOS at `e5d29a0`. Input was `populatedWorkbook()` from `tests/intake-import-fixture.ts`, an explicitly synthetic QA fixture, not P2's final showcase workbook. It includes deliberately forged workbook review metadata to verify that application review is still required.

Observed preview: month-one sales $84,000, 480 completed jobs, minimum cash -$100. Confirmed revision 2 opened with current results and equal empty alternatives. Adding an explicit $1,000/month expense for 60 months marked results stale; recalculation and month-one inspection showed baseline/empty Plan A cash $19,300, expense Plan B $18,550, sales delta $0, cash delta -$750 and demand/capacity 600/480. Baseline exit equity $4,041,400; expense alternative $3,948,400. These are synthetic arithmetic checks, not an approved investment recommendation or final showcase story. They match P1's month-one financial rehearsal figures at `gavin 6d47342`.

The built app on port 4182 reopened the same persisted confirmed snapshot and ran the baseline comparison successfully. No captured browser console errors in the full development-flow rehearsal. Prior implementation validation: 178 tests, zero Svelte errors/warnings, app/worker build pass. No runtime changes in this runbook commit; no repeated full suite needed. Independent browser D/release E remain open.

## Remaining handoff

P2's selected workbook/plans are integrated and the exact browser rehearsal is complete. P1: independently verify the selected displayed financial values. P2: independently check operating results and help with browser acceptance. P3: address review findings and capture final presentation fallback evidence after acceptance. The current Mac is available as the supported host candidate; final presentation-host decision and submission target/submitter are still pending. No new company risk parameters or full company Monte Carlo aggregate are claimed.
