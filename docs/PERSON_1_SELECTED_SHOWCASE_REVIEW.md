# Person 1 selected showcase financial review

Candidate: P2 `d3948d0`. Selected workbook SHA256:
`11db0060e763103f84188be7fcd8731692dbed3d96f6ad0c1f914349776f32da`.
Fictional HVAC inputs; reserve $1,000, exit multiple 4, horizon 60.
Baseline and Plan A empty; Plan B software expense $1,000/month, months 1–60.
This supersedes the earlier optional 12-month software rehearsal for this demo.

## Independent arithmetic

Sales: 480 completed jobs × $175 = $84,000. COGS: $20,000 labor +
$2,000 vehicles + $8,400 materials = $30,400. Baseline overhead $10,000
already includes marketing. EBITDA $43,600, tax at 25% $10,900.
Working capital rises from $66,500 to $79,800, consuming $13,300 once.
Baseline cash at month n ≥ 1 is -$100 + n × $32,700 - $13,300.
Software lowers monthly EBITDA by $1,000 and tax by $250; monthly cash
is $750 lower. No productivity, jobs or revenue benefit is assumed.

| Check | Baseline / Plan A | Software Plan B |
| --- | ---: | ---: |
| Month 1 EBITDA | $43,600 | $42,600 |
| Month 1 tax | $10,900 | $10,650 |
| Month 1 cash | $19,300 | $18,550 |
| Month 2 cash | $52,000 | $50,500 |
| Month 12 cash | $379,000 | $370,000 |
| Month 60 cash | $1,948,600 | $1,903,600 |
| Exit enterprise value | $2,092,800 | $2,044,800 |
| Exit equity value | $4,041,400 | $3,948,400 |

Equity = final 12 months EBITDA × 4 + ending cash - debt (zero).
The $93,000 equity reduction consists of $48,000 lower enterprise value plus
$45,000 less accumulated cash. Owner value is not a bank balance or guaranteed
sale price. Cost-only software payback is not reached; empty-plan payback is
not applicable. Minimum cash -$100 occurs at opening month 0; the forward
reserve-breach list is empty. Do not describe the opening position as safe.

## Reproduction and remaining acceptance

In an isolated checkout at `d3948d0`, run `node scripts/prepare_demo.ts verify`
to regenerate results from the actual XLSX through in-memory import/review/
preview/acknowledgment/confirmation and the deterministic engine. Then run
`node docs/review-cases/selected-showcase-check.ts <candidate-checkout>` from
this branch to compare those regenerated checkpoints with independent formulas,
the equity bridge, payback, minimum cash and workbook hash.

Financial expectations are accepted for this exact selected package. This is
internal financial verification on Windows Node 24.19.0, not durable storage or
independent browser acceptance. P3 must provide the integrated supported-host
commit, active profile/revision and screenshots of the selected workbook/plans;
P1 then checks displayed values against this table. Gate D/E and final host/
submission decisions remain open. Company MC remains unavailable.
