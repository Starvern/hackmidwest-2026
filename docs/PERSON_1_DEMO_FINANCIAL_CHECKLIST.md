# Financial showcase checklist and rehearsal reference

Prepared for the deadline showcase. Reference implementation: P3 `358bdb1`,
Node 24.19.0. This is a synthetic financial verification aid, not selection or
acceptance of the final presentation workbook, investment story or release.
P2 owns the prepared workbook/operating story; P3 owns the supported-host integration.

## Freeze these identities before final review

Record presentation host (macOS/Linux), integrated commit, workbook hash/version,
confirmed profile ID/revision and compiled fingerprint, plan decisions, request
reserve/multiple, and result fingerprint. Verify actual displayed results against
that exact run. A changed workbook, revision or plan needs its corresponding results.
Windows can execute these internal arithmetic checks, not the durable intake UI.

## Ready-to-use synthetic rehearsal checks

Use the existing `tests/intake-fixture.ts:eligibleFixture`, with $1,000 reserve and
4x exit multiple. All growth is zero; ten technicians/eight vehicles support 480
jobs/month against 600 demand. At $175/job, service sales are $84,000/month.
Historical sales are $70,000/month; forecast assumptions are separate observations.
Opening cash is -$100, AR $70,000, AP $3,500, inventory zero; no opening debt/assets.

Month 1: technician cost $20,000, fleet $2,000, materials $8,400 gives $30,400
COGS. Overhead $10,000 includes $2,000 marketing. EBITDA is $43,600, tax $10,900.
AR rises to $84,000 and AP to $4,200: working capital absorbs $13,300. Cash is
-$100 + $43,600 - $10,900 - $13,300 = **$19,300**. Do not add marketing twice or
confuse EBITDA with money in the bank.

Two optional arithmetic-check alternatives, not profitability recommendations:
- Software: $1,000/month expense, months 1–12. No sales benefit modeled.
- Equipment: $6,000 purchase month 1, 50% debt at 12% annually over 3 months;
  service month 3; two-month useful life; $100/month running cost from service.
  Deliberately short life/loan make timing easy to verify; this is not a realistic
  recommended equipment assumption. No operating benefit is modeled.

| Check | Current business | Software | Equipment |
| --- | ---: | ---: | ---: |
| Month-1 sales | $84,000 | $84,000 | $84,000 |
| Month-1 EBITDA | $43,600 | $42,600 | $43,600 |
| Month-1 cash | $19,300 | $18,550 | $16,300 |
| Month-2 cash | $52,000 | $50,500 | $47,977.50 |
| Month-3 cash | $84,700 | $82,450 | $80,337.50 |
| Month-60 cash | $1,948,600 | $1,939,600 | $1,939,705 |
| Month-60 modeled equity value | $4,041,400 | $4,032,400 | $4,027,705 |
| Project payback | Not applicable | Not reached | Not reached |

Equipment borrowing is $3,000 once in month 1. Principal is $1,000 in months 2–4;
interest $30/$20/$10. Depreciation is $3,000 in months 3 and 4 only. Software
expense stops in month 13; equipment running cost continues after depreciation.
Sales stay unchanged in both examples; names alone do not generate productivity.
Minimum cash is -$100 in opening month 0; forecast reserve-breach months exclude
opening balances. Explain these scopes rather than claiming the opening cash is safe.

Reproduce with `node docs/review-cases/demo-financial-check.ts` in a candidate
integration containing P3 `358bdb1`. The script asserts key amounts and unchanged
sales and prints exact request/identity/selected-month outputs. Checked output is
`docs/review-cases/demo-financial-expected.json`. It is not a recorded MC result,
confirmed owner profile or replacement for P2's workbook.

## Independent presentation-host pass

1. Import the selected synthetic workbook as a new unreviewed draft. Inspect source
   precision, dates, historical versus forecast values and existing-cost allocation.
2. Review, preview, acknowledge and confirm the exact revision. Check baseline
   sales/jobs/capacity/cash against P2/P1's selected-case expectations.
3. Run the selected alternatives; inspect purchase, first debt payment, service,
   depreciation end and expense end months. Check loan cash versus earnings and
   equity value versus cash. Null values stay unavailable, not zero.
4. Verify total/delta chart values, selected plan and plain-English explanations.
   Copy/edit one plan: original stays unchanged; old results are marked stale until
   rerun. Inspect an old revision/result as old, not current.
5. Company risk is optional: no company MC without the separate reviewed config,
   real company execution and working UI. Show existing synthetic risk only as a
   separate labeled example; never substitute it for this company.
6. Record exact pass/fail, host/commit/run identities and screenshots for fallback.
   Browser layout/reconciliation and gate acceptance require actual host review;
   these internal reference checks do not establish them.

Plain-English narration: “We start with this company's own numbers. We check what
it earns and what it actually keeps in cash, then compare plans. A new cost does
not automatically create customers. The result depends on the assumptions you
reviewed; this example is fictional.”

Pending: P2 selects final workbook/plans; P3 confirms host/startup and integrated
commit; P1 verifies their resulting financial values. Broader trades/dates/debt,
Windows durable storage and generalized risk calibration are outside this rehearsal.
