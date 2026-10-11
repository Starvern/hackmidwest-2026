# Sapling selected demo: presenter and final review

Reference runtime: `luke fe7242b`; P1 integration `gavin ea25029`.
Financial reference: `docs/PERSON_1_SELECTED_SHOWCASE_REVIEW.md`.
Workbook: `outputs/showcase-demo/showcase-company.xlsx`, SHA256
`11db0060e763103f84188be7fcd8731692dbed3d96f6ad0c1f914349776f32da`.

## Two-minute presenter script

“Sapling helps a business owner compare a decision using their own business
numbers. Today we are using a fictional HVAC company. We upload its workbook,
check its records and estimates, and confirm the starting picture before comparing
plans. Importing a file alone does not approve its assumptions.

“This company has ten technicians and eight trucks. It could receive 600 jobs a
month, but its trucks limit completed work to 480. At $175 a job, that is $84,000
in monthly sales. Sales are not the same as cash: wages, materials, taxes and
the timing of customer payments all matter.

“Our first plan keeps operations as they are. Our second adds a $1,000 monthly
software subscription for five years. We have not assumed that software brings
customers or makes work faster. With those assumptions, first-month cash ends
at $19,300 without software and $18,550 with it. The $750 difference reflects
the added expense and lower modeled taxes.

“After five years the subscription leaves $45,000 less cash. Estimated owner
value is $93,000 lower, because the model combines lower ongoing earnings with
less cash. That value is an estimate, not money in the bank or a promised sale
price. This does not prove software is a bad purchase: its benefit needs evidence
before we include it. Keeping the current plan is a useful comparison.

“The lowest cash balance is negative $100 at the starting date. Forecast months
stay above our $1,000 cushion, but the starting shortfall still matters. Company
risk probabilities are unavailable here. This comparison follows one reviewed
set of assumptions; actual results can differ.”

Keep the comparison tab open. Reload resets plan edits. Use the separate fictional
risk example only if rehearsed and clearly identified as a different business.

## Final independent browser review record

Reviewer: pending. Date/time: pending. Chosen Mac/Linux host: pending.
Exact integrated commit: pending. Browser/viewport: pending.
Confirmed profile/revision: pending. Result/input fingerprint: pending.
P3 owner rehearsal reported profile `b01847d9-c6fe-4536-87b0-bd42204f734a`,
revision 2 on its local Mac; do not reuse that identity on another installation.

Record pass/fail, screenshot/evidence and finding owner for each item:

| Check | Required observation | Disposition |
| --- | --- | --- |
| Workbook and input review | Correct hash, fictional label, dates, sources, estimates; import begins unreviewed | Pending |
| Preview and confirmation | Actual preview acknowledged; workspace uses the confirmed revision | Pending |
| Plans and settings | Empty baseline/A; B only $1,000 expense, start 1, duration 60; reserve $1,000, multiple 4 | Pending |
| Month 1 financials | Sales $84,000 both; EBITDA $43,600/$42,600; cash $19,300/$18,550 | Pending |
| Five-year outcome | Cash $1,948,600/$1,903,600; owner value $4,041,400/$3,948,400 | Pending |
| Interpretation | $45,000 cash reduction differs from $93,000 owner-value reduction; no assumed software benefit | Pending |
| Cash scope and payback | Minimum -$100 at month 0; no forward reserve breaches; empty payback N/A, software not reached | Pending |
| Edit/recalculate | Editing marks old results stale; rerun updates them and clears stale marking | Pending |
| Plan independence | Copy then edit one plan; original decisions/results stay separate | Pending |
| Risk and old revisions | Company MC unavailable; fictional risk separate; older revision clearly labeled | Pending |
| Layout and errors | Readable projector/mobile layout, navigation and tables; no blocking console/network errors | Pending |
| Reload/recovery | Disclosed plan reset; confirmed profile reopens with same session; supported server restart succeeds | Pending |

Evidence filenames should identify the commit, revision, plan and inspected month.
P3 fixes any blocker; reviewer rechecks the fix. Owner rehearsal and P1 numerical
review do not automatically fill this independent-browser record.

## Fallback and freeze

Use the financial reference table and this script as a static expected-results
fallback, explicitly describing it as a prepared fictional example. It is not a
capture of an independently accepted live run. P3 captures the actual accepted
screenshots/recording after review; preserve workbook hash and exact settings.

Before release E, record the chosen host/commit, D disposition, outstanding
limitations, submission destination/format/deadline, named submitter, team go/no-go
and submission confirmation. These are currently open, not implied approvals.

P1 reconciliation of P3's issue report at `fe7242b`: reported financial amounts,
cash delta, equity delta and payback agree with the independently accepted package.
Source inspection confirms cards/table project engine values, currency formatting
rounds only for display, and the five-year explanation uses terminal cash and
equity deltas separately. No blocking mismatch identified in this narrow review.
Screenshots were not supplied in that report; no independent remote-browser or
visual-layout acceptance is claimed. The reserve sentence includes opening cash;
use the month-zero explanation above so it is not mistaken for a future breach.
