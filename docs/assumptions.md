# Synthetic company fixture and proposed policies

Status: Person 2 review baseline, not an approved interface checkpoint or Gate A/B freeze.
All figures are synthetic and illustrative, not measured HVAC industry facts. Authority:
`OperatorOS_Implementation_Spec.md` §3.4; fields follow `contracts/contracts.ts`.

## Historical reference and calendar

Twelve historical months run January–December of an unspecified reference year. Forecast
month 1 is the following January; no clock-based date is inferred. Historical months are
flat, and all twelve seasonality factors equal 1. This deliberately preserves the specified
540 monthly service jobs at $650 per job, $4,212,000 annual service revenue, $788,000 other
revenue, $2,750,000 COGS, $1,500,000 overhead and $750,000 EBITDA.
Other revenue and service variable costs use annual totals divided by twelve at full float
precision; no cent rounding or artificial December adjustment. Validation tolerance is
$0.0000001 for annual sums. CSV and JSON contain identical historical values.

The operating baseline has 12 technicians and 12 vehicles, each with 20 working days and
3 jobs per day: capacity 720 jobs/month, demand 540, utilization 75%. Do not apply utilization
again to completed jobs. Labor is $95,000 per technician/year; vehicle operating costs are
$15,000 per vehicle/year. Service variable cost rate is exactly 1,100,000 / 4,212,000.
Other direct costs are $330,000/year. These are specified synthetic values.

## Additional fixture proposals requiring Person 1 review

| Input/policy | Proposed value and interpretation |
|---|---|
| Existing debt | $1.2m at specified 8%; proposed 60 remaining months, $20,000 level monthly principal, first repayment month 1; interest on beginning balance |
| Receivables | One month of total revenue; opening AR = December revenue = $416,666.666… |
| Payables | Half a month of service variable costs plus other direct costs only; opening AP = $59,583.333…; payroll and vehicle costs excluded |
| Inventory | Constant $50,000, including opening inventory |
| Existing assets | Aggregate pool: $900,000 cost less $150,000 accumulated depreciation = $750,000 net; 60 months remaining at $12,500/month, matching specified $150,000 annual D&A |
| Maintenance CapEx | Specified $100,000/year; proposed equal monthly spend, capitalized with a 60-month straight-line life starting in spend month; Person 1 must approve and track separately from existing assets |
| Baseline marketing | $10,000/month included within $125,000 fixed overhead, never added again |
| Annual forecast rates | Demand +2%, ticket +2%, wages +3%, overhead +2%; other revenue and other direct costs flat |
| Growth reference | Proposed multiplier `(1 + annual_rate) ** ((month - 1) / 12)`; first January uses unchanged reference run rate; historical year contains no growth |
| New borrowing | Proposed purchase-month disbursement; first interest and principal in the next month, with interest on beginning balance; no financing revenue |
| Recruitment/payroll | Proposed recruitment charge at decision start; full wages from employment month; spec's 25/50/75/100% four-month productivity ramp |
| Marketing tail | Proposed each spend month produces incremental demand exactly lag months later, including after the spending period ends; no compounding customer base |
| Tax/reserve/valuation | Specified 25% positive-income cash tax, $150,000 reserve floor, 6× positive TTM EBITDA |

Opening cash is the specified $400,000. Opening balances are synthetic starting inputs,
not the result of a reconstructed historical cash-flow statement. The prototype is a
reconciled operational P&L/cash/debt schedule; no full GAAP balance sheet equality is claimed.
Month 0 contains opening balances only. Proposed timing policies are documented here because
the current CompanyInput does not encode every policy; do not treat them as silently approved defaults.

## Provenance and uncertainty

Every scalar input has a JSON Pointer provenance entry in the company JSON. Historical
records are `synthetic_historical`, opening AR/AP are `derived`, and other inputs are
conservatively tagged `assumed` with specification/policy references. No input is tagged
as actual user data or a stochastic realization.

`distribution_parameters` is deliberately empty. This fixture supports deterministic
development only; Monte Carlo must reject missing risk configuration until bounds,
spreads, persistence and stable streams are agreed. An empty manifest is not a claim
that risk is zero. No operational or financial forecast output has been fabricated.

## Reproduction and handoff

Run `node scripts/build_synthetic_fixture.ts` to regenerate the data, then
`node scripts/validate_fixture.ts` to check reconciliation, opening balances, capacity,
finite values, CSV agreement and provenance coverage. These scripts use TypeScript and Node built-ins (Node 22.20+). Person 3 still needs to
validate the JSON against authoritative Zod schemas;
the reconciliation script does not replace runtime schema validation.

Public engine signatures and shared contracts are unchanged. Before scheduler work,
Person 1 must approve these policies and Person 3 must finalize internal MonthEvents,
prior-state and market-factor types. Next handoff: validated fixture plus one month's
real scheduler/operations output. No Gate A/B completion is claimed by this data delivery.

## Accepted implementation stack

User confirmed SvelteKit, TypeScript and Zod. The engine will use pure TypeScript
functions, called by SvelteKit server routes; no Python service boundary is required.
Person 3 owns authoritative Zod schemas. The fixture scripts perform reconciliation
without defining competing runtime schemas. Financial policy approval remains pending.
