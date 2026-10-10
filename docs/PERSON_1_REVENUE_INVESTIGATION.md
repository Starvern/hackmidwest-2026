# Person 1 — unchanged-example financial investigation

Reviewed P2 trace `51a89cf`, based on unchanged engine/UI `7dfff3c`. Fresh execution
exactly reproduces the accepted reference and comparisons and matches P2's all-month
trace/input fingerprint. **Disposition: expected assumptions; no accounting,
financing, cash, paired-delta or payback defect found in this example.** This is
financial-owner review, not acceptance of browser chart consumption or usability.

Reproduce with Node 24: `node scripts/reconcile_example_financials.ts`.
The script asserts monthly revenue/EBITDA/tax/cash/debt/UFCF/valuation bridges,
cumulative cash versus paired deltas, agreement with P2 trace, immutable inputs,
reference equality and negative cumulative project recovery throughout the horizon.
All-month evidence: `data/example-financial-reconciliation.json`; requested-month
table: `docs/EXAMPLE_FINANCIAL_TRACE.md` (0/1/2/3/5/12/13/24/60).

## Where the five-year difference comes from

USD, additional amounts versus doing nothing; these are totals across 60 months,
not one month's statement. Tax savings mean less tax than baseline, not tax refunds.

| Driver | Truck-only | Combined |
|---|---:|---:|
| Extra revenue | 0.00 | 316,934.93 |
| Extra job-related variable costs | 0.00 | 82,770.28 |
| Extra technician payroll | 0.00 | 990,826.18 |
| Extra fleet running costs | 147,500.00 | 147,500.00 |
| Extra marketing | 0.00 | 48,000.00 |
| Recruitment | 0.00 | 6,000.00 |
| EBITDA difference | -147,500.00 | -958,161.53 |
| Truck purchase | 120,000.00 | 120,000.00 |
| New borrowing | 60,000.00 | 60,000.00 |
| Added loan principal repaid | 60,000.00 | 60,000.00 |
| Extra interest | 9,800.00 | 9,800.00 |
| Cash tax savings versus baseline | 68,825.00 | 271,490.38 |
| Ending cash difference | -208,475.00 | -816,471.15 |
| Cumulative incremental unlevered FCF | -201,125.00 | -809,121.15 |

Combined incremental service gross profit is $234,164.65: $316,934.93 sales less
$82,770.28 variable costs. Subtract payroll, fleet costs, marketing and recruitment
to obtain -$958,161.53 EBITDA. Fixed overhead/other revenue/other direct costs and
baseline maintenance do not change. Payroll is full employed payroll from month 3,
even during ramp; the extra capacity is never needed by this example's demand.

The $120,000 purchase and $60,000 borrowing occur once in month 1. That month's
cash difference is -$60,000 and debt difference +$60,000 in both alternatives.
Truck running costs and depreciation begin in month 2. The added loan pays
$1,250 principal monthly in months 2–49; beginning-balance interest totals $9,800.
By month 60 additional debt is zero. Borrowing is financing, not sales or profit;
principal repayment is a cash use, not an operating expense. No purchase or loan
was charged twice.

Cash bridge: EBITDA difference minus added interest, minus tax difference, minus
working-capital change difference, minus extra CapEx, plus borrowing, minus principal.
For combined: -958,161.53 - 9,800 + 271,490.38 - 120,000 + 60,000 - 60,000
= -816,471.15. Working capital temporarily absorbs some campaign receipts and
releases them when the campaign benefit ends; its total incremental change is zero
by month 60. Extra depreciation is $118,000 through month 60 and affects taxes,
but is not also subtracted as a cash payment.

Payback uses incremental unlevered cash flow and actual investment timing, not
borrowing or ending cash. Both first invest in month 1, both stay cumulatively
negative every subsequent month, and both correctly report not reached. The
$7,350 difference between each cash deficit and project-FCF deficit is additional
interest after its modeled tax saving ($9,800 x 75%); added borrowing and principal
cancel across the full horizon. Financing therefore does not create project recovery.

## Why the final value looks worse even though marketing increased sales

Marketing buys 40 extra jobs per month in months 5–16, 480 in total. It spends in
months 3–14 with a two-month lag; the last two months of benefit remain after
spending ends. Month 5 sales are $447,503.39 versus $421,331.20 (+$26,172.19).
At month 17 sales return to baseline, while hires and trucks remain. This approved
model has no permanent customer-retention or recurring campaign effect.

Month-60 valuation uses the final trailing 12 months, after marketing benefits
have ended. Truck-only TTM EBITDA is $30,000 lower, giving $180,000 lower EV at
6x; with $208,475 less cash and no extra debt remaining, equity is $388,475 lower.
Combined TTM EBITDA is $246,771.37 lower: EV difference -$1,480,628.24 plus cash
difference -$816,471.15 equals equity difference -$2,297,099.39. This follows the
accepted EV-minus-debt-plus-cash bridge, not an arbitrary downward adjustment.

## Plain-language explanation for the app

The business already has enough trucks and technicians for its customers. Adding
more increases costs without increasing sales. Marketing does bring in extra jobs
after a two-month wait, but its benefit lasts one year. The extra employees and
trucks keep costing money after those extra sales stop, so this particular combined
plan leaves less cash and a lower modeled business value over five years.

P3 should make months 5–16 visibly explainable and distinguish demand from capacity,
temporary sales benefits from continuing costs, and project payback from bank cash.
The report does not prove the revenue chart is correct; reconcile the UI against
the supplied trace. A separate, clearly labeled illustrative plan may be useful,
but it is a scenario-design change rather than a bug fix. Do not silently retune
the accepted fixture or force profitable expansion. Any new assumptions/reference
follow owner review and version/fingerprint disclosure. Gate D/E usability/display
and the separate risk-dashboard review remain open; A/B/C acceptance is unchanged.
