# MVP model limitations

All company/scenario inputs are synthetic and illustrative. Growth, working-capital factors, costs, tax rate and valuation multiple are disclosed assumptions, not calibrated market estimates.

The model is an operational P&L/cash/debt schedule, not a full GAAP balance sheet. Fractional-month AR/AP factors are steady-state approximations rather than invoice aging. Inventory is constant. Taxes apply to positive pretax income with no loss carryforwards, credits or deferred taxes; amortization and owner distributions are zero.

Assets use explicit straight-line schedules. Monthly maintenance additions depreciate from spend month; truck assets begin in service. Debt uses level principal and beginning-balance interest, with new-loan payments beginning the month after purchase. No automatic liquidity funding or revolver is modeled; negative cash remains visible. Monthly cash cannot show intramonth liquidity shortfalls.

EV uses actual trailing 12-month EBITDA and the resolved positive multiple. Nonpositive TTM EBITDA yields unavailable EV/equity. Positive EBITDA can still yield negative equity. Modeled value is not an appraisal, investor profit or transaction price. Payback is undiscounted incremental unlevered cash-flow recovery, with explicit investment gating and later reversal; it is not IRR or sponsor return.

The deterministic runner now uses the real scheduler/operations, with baseline, truck-only and combined reference outputs. Some focused unit tests use explicit typed operational inputs; integration tests use the actual modules. Shared deterministic release/freeze review and live simulation API integration remain pending. Empty distribution parameters do not mean zero risk; Monte Carlo and statistical claims remain deferred until deterministic acceptance and Gate C.

Current release status: shared deterministic Gates A/B accepted on October 10, 2026, superseding earlier pending-review statements above. See [Person 1 acceptance record](PERSON_1_DETERMINISTIC_ACCEPTANCE.md) for the exact integrated dependency, 66-test and live API evidence, and next-owner checkpoints. Gates C/D/E remain pending.
