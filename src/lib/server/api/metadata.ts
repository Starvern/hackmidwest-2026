import { INTERFACE_REVISION, ModelMetadataSchema } from '../schemas.ts';

/** Discovery only. Readiness changes require accepted real engine integration. */
export function loadModelMetadata() {
  return ModelMetadataSchema.parse({
    schema_version: '1.0', model_version: 'mvp-1.0', contract_revision: 1,
    interface_revision: INTERFACE_REVISION, horizon_months: 60, currency: 'USD',
    decision_types: ['purchase_trucks', 'hire_technicians', 'increase_marketing'],
    metrics: [
      { key: 'cash_end', label: 'Ending cash', unit: 'USD', kind: 'ending_balance', available_at_opening: true,
        description: 'Month-end cash after operating, investing and financing flows; negative cash remains visible.' },
      { key: 'ebitda', label: 'Monthly EBITDA', unit: 'USD/month', kind: 'monthly_flow', available_at_opening: false,
        description: 'Monthly earnings before interest, taxes, depreciation and amortization; this is not cash flow.' },
      { key: 'revenue', label: 'Monthly revenue', unit: 'USD/month', kind: 'monthly_flow', available_at_opening: false,
        description: 'Monthly service and other operating revenue; receipts may occur later.' },
      { key: 'debt_end', label: 'Ending debt', unit: 'USD', kind: 'ending_balance', available_at_opening: true,
        description: 'Outstanding month-end debt principal after borrowing and repayment.' },
      { key: 'utilization', label: 'Service utilization', unit: 'decimal_ratio', kind: 'ratio', available_at_opening: false,
        description: 'Completed jobs divided by constrained service capacity; zero when capacity is zero.' },
      { key: 'ttm_ebitda', label: 'Trailing 12-month EBITDA', unit: 'USD', kind: 'trailing_12_month_flow', available_at_opening: false,
        description: 'Total EBITDA over the preceding 12 historical/forecast months, not monthly EBITDA annualized.' },
      { key: 'enterprise_value', label: 'Modeled enterprise value', unit: 'USD', kind: 'valuation', available_at_opening: false,
        description: 'Positive trailing EBITDA valued at the selected multiple; null when the method is unavailable.' },
      { key: 'equity_value', label: 'Modeled equity value', unit: 'USD', kind: 'valuation', available_at_opening: false,
        description: 'Modeled enterprise value less ending debt plus cash; null when valuation is unavailable.' },
      { key: 'unlevered_fcf', label: 'Monthly unlevered free cash flow', unit: 'USD/month', kind: 'monthly_flow', available_at_opening: false,
        description: 'Monthly free cash flow excluding borrowing, debt repayment and financing interest effects; used for paired project payback.' },
    ],
    readiness: { deterministic: true, monte_carlo: false },
    data_notice: 'Synthetic illustrative HVAC company inputs; no measured industry data or calibrated forecasts.',
    limitations: [
      'A reconciled operating P&L/cash/debt schedule, not full GAAP financial statements.',
      'Month-end liquidity does not capture intramonth cash shocks.',
      'Modeled valuation is not a market appraisal; project payback is undiscounted and is not investor IRR.',
      'Monte Carlo requires accepted distribution assumptions and a validated real runner; empty settings do not mean zero risk.',
    ],
  });
}
