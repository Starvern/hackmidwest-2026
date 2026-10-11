# Person 2 — unchanged-example revenue investigation

Disposition: **expected operating behavior under the existing assumptions; no
scheduler/operations defect identified in this trace.** Browser/chart reconciliation
and financial-owner review remain separate. This does not declare the UI concern
resolved or accept Gate D/E.

Investigated engine/UI dependency `7dfff3c`, unchanged company and example request.
`node scripts/trace_example_operations.ts` reproduces all 61 states and comparisons
exactly against the frozen deterministic reference, checks input immutability,
service revenue = completed jobs × ticket, revenue comparison deltas and the existing
dashboard metric projection. Canonical input fingerprint and raw input-file hashes
are recorded in [the full trace](../data/example-operational-trace.json).
[Selected-month tables](EXAMPLE_OPERATIONAL_TRACE.md) cover 0/1/2/3/5/12/13/24/60
for all three scenarios; the machine-readable trace contains every month.

## What happens and when

- Opening resources: 12 trucks / 12 technicians; month 0 is opening balances only.
  Baseline can do 720 jobs/month but demand starts at 540. Organic demand grows 2%
  annually to only 595.22 jobs by month 60. Ticket grows 2% annually in every scenario.
- Trucks: purchase two for $120,000 in month 1, borrow $60,000, activate in month 2.
  Truck capacity rises from 720 to 840, but technician capacity stays 720. More
  importantly, demand remains below both. Truck-only produces **zero additional jobs
  or revenue in every month**, while truck operating costs start in month 2.
- Hiring: recruit two in month 2 ($6,000), employment/full payroll begins month 3.
  Total productive FTE rises 12.5/13/13.5/14 in months 3/4/5/6, taking capacity
  750/780/810/840 with the new trucks. The requested month-5 snapshot is still ramping;
  month 6 completes the ramp. Demand never requires the extra capacity.
- Marketing: spend $4,000/month in months 3–14, at $100 per incremental booked job.
  A two-month lag yields **40 additional jobs/month in months 5–16**. There is no
  benefit in months 3–4; months 15–16 retain the final lagged benefit after spending
  ends. Month 17 onward returns to baseline demand/revenue. The accepted model has
  no permanent marketing uplift, repeat-customer retention or spillover beyond lag.

Demand is the actual binding throughput constraint for **every forecast month in
every scenario**. Even combined demand never exceeds 595.22, below the original
720-job capacity. All 480 marketing-generated jobs would fit within original capacity;
the added trucks/hires do not unlock any of those jobs in this example.

## Revenue benefit and costs visible in the trace

Combined month-5 total revenue is **$447,503.39 vs $421,331.20 baseline**, a
**$26,172.19 benefit**. Total incremental revenue over months 5–16 is **$316,934.93**
from 480 extra jobs. Revenue is identical again at months 24 and 60. A terminal
snapshot therefore misses the campaign's earlier, temporary revenue benefit.

The combined trace also contains $48,000 marketing spend, $6,000 recruitment,
$990,826.18 additional payroll over months 3–60 and $147,500 additional truck opex
over months 2–60, besides truck capital/financing. Additional service-variable costs
reduce $316,934.93 revenue to $234,164.65 incremental gross profit. These operating
lines reconcile to **−$958,161.53 cumulative EBITDA delta**. Truck-only cumulative
EBITDA delta is −$147,500. These are backend trace observations and arithmetic;
P1 owns independent accounting, cash/debt/payback and valuation reconciliation.

## User-facing explanation / next owners

“The company already has room to handle more jobs. Buying trucks and hiring people
adds costs without bringing in customers. Marketing brings in 40 more jobs a month
after a two-month wait, but only for a year. Those sales stop; the extra employees
and trucks keep costing money.”

P1: reconcile financial/cash/paired-payback consequences using this exact trace.
P3: reconcile month-5/12/13 uplift and month-17 return in revenue charts; explain
demand versus capacity, hiring ramp and finite campaign effects in the plan editor.
Source-level `metricValue` returns exact backend revenue, but that alone does not
prove browser chart/layout/label correctness. Display review is still required.

A demand-constrained warning or a separately labeled capacity-constrained illustrative
example could improve the demo. Either needs coordinated product/assumption review;
this investigation changes no fixture, engine economics, contract, accepted reference
or Monte Carlo artifact. No long Monte Carlo rerun is needed for this diagnosis.
