# P1 financial review: flexible investment candidate

Reviewed exact P2 implementation `acfba83` in an isolated archive with Node
24.19.0. Disposition: P1 accepts the financial semantics for this candidate's
explicitly limited scope; no blocking financial finding. This does not merge the
candidate, accept shared contracts/UI, expand A/B/C, or close D/E.

## Accounting disposition

- New alternative expenses are fixed-dollar overhead paid in their scheduled
  months. Same-month payment and AP exclusion are acceptable disclosed candidate
  assumptions, not a policy for existing company invoices or prepaid expenses.
- Asset purchases capitalize once. Borrowing is financing, not revenue. Repayment
  and beginning-balance interest start the following month even if service is
  delayed. Principal does not reduce EBITDA.
- Depreciation begins in service over explicit life (1–600 months), capped at cost;
  operating costs continue after depreciation ends. No salvage/disposal benefit.
  Out-of-horizon service creates no early depreciation or running costs.
- Positive expense charges, asset CapEx and running costs count toward the existing
  investment-outlay eligibility signal. Paired UFCF measures recovery, excluding
  financing; zero outlays do not create artificial payback eligibility.
- No capacity/demand benefit is inferred from an item name. Custom amounts/lives
  stay fixed in MC; shared market effects elsewhere still apply. No custom ensemble
  or full performance benchmark was reviewed here.

## Independent evidence

Executed at `acfba83`: `node --test tests/flexible-investments.test.ts` (4 passed),
`node scripts/contracts.ts --check` (match), and
`node scripts/generate_reference_result.ts --check` (all original 61-state paths
and fingerprints reproduced). Source review covered scheduler, financials,
financial invariants, candidate schemas and custom-action MC handling. P2's full
119-test/build/browser claims were not independently repeated by this review.

Additionally executed an independent known-answer bridge against fresh actual
engine output. Use the unchanged synthetic company, clear all scenario decisions,
then add only to `combined_expansion`: asset cost $6,000 purchased month 1, 50%
financing at 12% annually over 3 months, service delay 2 months, useful life 2
months and running cost $100/month. Compare to the same request without this asset.

| Month | Cumulative cash difference | Monthly UFCF difference |
| --- | ---: | ---: |
| 1 | -3,000.00 | -6,000.00 |
| 2 | -4,022.50 | 0.00 |
| 3 | -4,362.50 | 675.00 |
| 4 | -4,695.00 | 675.00 |
| 5 | -4,770.00 | -75.00 |

The company remains taxable in these observations. Additional interest is $30,
$20 and $10 in months 2–4; principal is $1,000 each month. Depreciation is $3,000
in months 3 and 4. Thus month 3 cash change is -$100 running cost -$20 interest
+$780 tax saving -$1,000 principal = -$340; UFCF is -$100 +$775 unlevered tax
saving = +$675. These tax shields explain positive monthly UFCF despite no sales
benefit; they are not extra revenue or evidence of total project recovery.

All five cash/UFCF expectations passed within $1e-6. Baseline and truck-only
scenario outputs were deeply equal to the no-asset comparison. Candidate focused
tests separately cover scheduled expenses, tax floor, zero outlays, depreciation,
debt timing, no working-capital/revenue benefit and original-reference compatibility.

## Remaining coordination

P3/shared owner still reviews additive contract discovery and editor/stale-result
behavior. P2 should preserve candidate disclosures and distinguish these new
alternative decisions from the baseline expense ledger in company intake.
Intake profile/mapping work is separate and remains dependent on shared contracts.
