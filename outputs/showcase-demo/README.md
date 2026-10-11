# Selected showcase package

Primary deterministic demo, selected by P2. Runtime target: P3 `e5d29a0`, startup
runbook `ae9620f`. Uses the existing synthetic intake fixture, preserving the
economics already rehearsed by P3 and checked by P1. This is a fictional HVAC
business, not actual company records or calibrated risk evidence.

- Workbook: `showcase-company.xlsx`, eight revision-2 template sheets.
- SHA256: `11db0060e763103f84188be7fcd8731692dbed3d96f6ad0c1f914349776f32da`.
- History: January–December 2026; opening December 31, 2026; forecast January 2027.
- `demo-plans.json`: exact illustrative decision settings, with scalar provenance.
  Its company ID belongs to the disposable verification import. In the browser,
  use the active confirmed company binding and recreate these settings; do not
  submit this request against another import unchanged.
- `expected-results.json`: real engine output checkpoints for months 0/1/2/12/60
  and summary metrics, generated from this exact exported workbook.

## Presenter flow

Use P3's `docs/DEMO_RUNBOOK.md` on the supported Mac/Linux host. Import this workbook,
inspect sources/periods/estimates, explicitly review, preview, acknowledge and confirm.
The workbook supplies inputs, not approval; demand evidence stays a reviewed estimate.
Company risk configuration remains unknown and company Monte Carlo remains unavailable.

Leave baseline and Plan A empty. Name Plan A “Hold current operations”. Clear any
pre-existing decisions from Plan B; add only an operating expense named “Software
subscription (cost only)”: $1,000/month, start month 1, duration 60 months. Recalculate.
Use reserve $1,000, exit multiple 4, horizon 60 months. Keep this tab open: plan edits
currently disappear on reload. Recreate the settings after a reload.

| Check | Baseline / Plan A | Plan B |
| --- | ---: | ---: |
| Technicians / vehicles | 10 / 8 | 10 / 8 |
| Demand / completed / unserved jobs per month | 600 / 480 / 120 | 600 / 480 / 120 |
| Technician / vehicle capacity per month | 600 / 480 | 600 / 480 |
| Forecast ticket | $175 | $175 |
| Month 1 revenue | $84,000 | $84,000 |
| Month 1 COGS | $30,400 | $30,400 |
| Month 1 EBITDA | $43,600 | $42,600 |
| Month 1 taxes | $10,900 | $10,650 |
| Month 1 ending cash | $19,300 | $18,550 |
| Month 60 exit equity | $4,041,400 | $3,948,400 |

Opening cash is deliberately -$100 in this existing stress fixture. Minimum cash
includes that opening balance; forward reserve-breach months are empty. Explain
this distinction rather than calling the business always liquid. History has 400
completed jobs/month; forecast demand of 600 is an explicit synthetic estimate,
not a calibrated extrapolation. Growth/inflation are explicitly zero.

Narration: “The fleet limits completed work even though technicians have spare
capacity. Adding software costs reduces cash and modeled value. Its name alone
does not create a productivity benefit.” Plan B cash delta in month 1 is -$750;
exit-equity delta is -$93,000. Payback is not reached for the cost-only expense;
baseline/empty Plan A payback is not applicable. This is a transparent cost
comparison, not a recommendation to buy software or a claim of operational benefit.

## Verification and next owners

`node scripts/prepare_demo.ts verify` checks the workbook hash, imports the actual
XLSX, reviews fields and sources in an in-memory store, previews, acknowledges and
confirms, then runs the actual deterministic engine. It checks baseline/alternative
M1 cash and all 60 months' demand/completed/unserved/revenue. Windows in-memory
verification is not supported-host durable or independent browser acceptance.

Rebuild with `node scripts/prepare_demo.ts prepare`, then the bundled Node runtime
and `ARTIFACT_NODE_MODULES` to run `scripts/build_demo_workbook.mjs`, then verify.
Rebuilding may change ZIP bytes/hash; update this recorded hash before handoff.

P1: independently check selected financial output. P3: rehearse this exact workbook
and plan settings on the presentation host, confirm displayed values and capture
fallback evidence. Independent browser D and release E remain separate. No new
runtime feature, full MC run, calibration or benchmark is claimed by this package.
