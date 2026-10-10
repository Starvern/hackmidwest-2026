# Unchanged example: operational trace

Generated with `node scripts/trace_example_operations.ts`. All 61 states and comparisons exactly reproduce the accepted deterministic reference. No inputs were modified. Raw numbers and all monthly fields are in `data/example-operational-trace.json`. Month 0 contains opening cash/debt only; initial resources are 12 trucks / 12 technicians, not forecast month-0 operations.

## baseline

| Month | Demand | Tech capacity | Truck capacity | Effective capacity | Jobs | Ticket USD | Service revenue USD | Total revenue USD | Active trucks | Productive tech FTE | Binding constraint |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | — | — | — | — | — | — | — | — | — | — | Opening only |
| 1 | 540.00 | 720.00 | 720.00 | 720.00 | 540.00 | 650.00 | 351,000.00 | 416,666.67 | 12 | 12.00 | demand |
| 2 | 540.89 | 720.00 | 720.00 | 720.00 | 540.89 | 651.07 | 352,160.37 | 417,827.03 | 12 | 12.00 | demand |
| 3 | 541.79 | 720.00 | 720.00 | 720.00 | 541.79 | 652.15 | 353,324.57 | 418,991.24 | 12 | 12.00 | demand |
| 5 | 543.58 | 720.00 | 720.00 | 720.00 | 543.58 | 654.30 | 355,664.54 | 421,331.20 | 12 | 12.00 | demand |
| 12 | 549.89 | 720.00 | 720.00 | 720.00 | 549.89 | 661.91 | 363,977.13 | 429,643.80 | 12 | 12.00 | demand |
| 13 | 550.80 | 720.00 | 720.00 | 720.00 | 550.80 | 663.00 | 365,180.40 | 430,847.07 | 12 | 12.00 | demand |
| 24 | 560.89 | 720.00 | 720.00 | 720.00 | 560.89 | 675.14 | 378,681.81 | 444,348.47 | 12 | 12.00 | demand |
| 60 | 595.22 | 720.00 | 720.00 | 720.00 | 595.22 | 716.47 | 426,457.22 | 492,123.89 | 12 | 12.00 | demand |

## combined_expansion

| Month | Demand | Tech capacity | Truck capacity | Effective capacity | Jobs | Ticket USD | Service revenue USD | Total revenue USD | Active trucks | Productive tech FTE | Binding constraint |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | — | — | — | — | — | — | — | — | — | — | Opening only |
| 1 | 540.00 | 720.00 | 720.00 | 720.00 | 540.00 | 650.00 | 351,000.00 | 416,666.67 | 12 | 12.00 | demand |
| 2 | 540.89 | 720.00 | 840.00 | 720.00 | 540.89 | 651.07 | 352,160.37 | 417,827.03 | 14 | 12.00 | demand |
| 3 | 541.79 | 750.00 | 840.00 | 750.00 | 541.79 | 652.15 | 353,324.57 | 418,991.24 | 14 | 12.50 | demand |
| 5 | 583.58 | 810.00 | 840.00 | 810.00 | 583.58 | 654.30 | 381,836.73 | 447,503.39 | 14 | 13.50 | demand |
| 12 | 589.89 | 840.00 | 840.00 | 840.00 | 589.89 | 661.91 | 390,453.40 | 456,120.07 | 14 | 14.00 | demand |
| 13 | 590.80 | 840.00 | 840.00 | 840.00 | 590.80 | 663.00 | 391,700.40 | 457,367.07 | 14 | 14.00 | demand |
| 24 | 560.89 | 840.00 | 840.00 | 840.00 | 560.89 | 675.14 | 378,681.81 | 444,348.47 | 14 | 14.00 | demand |
| 60 | 595.22 | 840.00 | 840.00 | 840.00 | 595.22 | 716.47 | 426,457.22 | 492,123.89 | 14 | 14.00 | demand |

## trucks_only

| Month | Demand | Tech capacity | Truck capacity | Effective capacity | Jobs | Ticket USD | Service revenue USD | Total revenue USD | Active trucks | Productive tech FTE | Binding constraint |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | — | — | — | — | — | — | — | — | — | — | Opening only |
| 1 | 540.00 | 720.00 | 720.00 | 720.00 | 540.00 | 650.00 | 351,000.00 | 416,666.67 | 12 | 12.00 | demand |
| 2 | 540.89 | 720.00 | 840.00 | 720.00 | 540.89 | 651.07 | 352,160.37 | 417,827.03 | 14 | 12.00 | demand |
| 3 | 541.79 | 720.00 | 840.00 | 720.00 | 541.79 | 652.15 | 353,324.57 | 418,991.24 | 14 | 12.00 | demand |
| 5 | 543.58 | 720.00 | 840.00 | 720.00 | 543.58 | 654.30 | 355,664.54 | 421,331.20 | 14 | 12.00 | demand |
| 12 | 549.89 | 720.00 | 840.00 | 720.00 | 549.89 | 661.91 | 363,977.13 | 429,643.80 | 14 | 12.00 | demand |
| 13 | 550.80 | 720.00 | 840.00 | 720.00 | 550.80 | 663.00 | 365,180.40 | 430,847.07 | 14 | 12.00 | demand |
| 24 | 560.89 | 720.00 | 840.00 | 720.00 | 560.89 | 675.14 | 378,681.81 | 444,348.47 | 14 | 12.00 | demand |
| 60 | 595.22 | 720.00 | 840.00 | 720.00 | 595.22 | 716.47 | 426,457.22 | 492,123.89 | 14 | 12.00 | demand |

