import type { CompanyInput, EngineState, FinancialResult, ValuationResult } from '../../../../contracts/contracts.ts';
import { EngineStateSchema, ValuationResultSchema } from '../schemas.ts';
import { requireModel } from './invariants.ts';

/** History contains forecast months 1..ending_state.month, in chronological order. */
export function calculate_valuation(
  company: CompanyInput,
  financial_history: readonly Pick<FinancialResult, 'ebitda'>[],
  ending_state: EngineState,
): ValuationResult {
  const state = EngineStateSchema.parse(ending_state);
  requireModel(state.month > 0 && financial_history.length === state.month, 'Valuation needs every forecast month through ending state');
  requireModel(company.historical_months.length === 12
    && company.historical_months.every((row, i) => row.month_of_year === i + 1), 'Valuation needs ordered 12-month history');
  const earnings = [...company.historical_months, ...financial_history].map(row => row.ebitda);
  requireModel(earnings.every(Number.isFinite), 'Nonfinite EBITDA history');
  const ttm = earnings.slice(-12).reduce((sum, amount) => sum + amount, 0);
  const multiple = company.global_assumptions.valuation_multiple;
  const debt = state.financial.debt_tranches.reduce((sum, tranche) => sum + tranche.principal, 0);
  return ValuationResultSchema.parse(ttm <= 0 ? {
    status: 'nonpositive_ttm_ebitda', ttm_ebitda: ttm, enterprise_multiple: multiple,
    enterprise_value: null, equity_value: null,
  } : {
    status: 'meaningful', ttm_ebitda: ttm, enterprise_multiple: multiple,
    enterprise_value: ttm * multiple, equity_value: ttm * multiple - debt + state.financial.cash,
  });
}
