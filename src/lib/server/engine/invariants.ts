import type { FinancialResult, FinancialState, OperationsResult } from '../../../../contracts/contracts.ts';
import { APPROVED_POLICIES } from '../schemas.ts';

export class ModelInvariantError extends Error {
  constructor(message: string) { super(message); this.name = 'ModelInvariantError'; }
}

export function requireModel(condition: boolean, message: string): asserts condition {
  if (!condition) throw new ModelInvariantError(message);
}

export function assertClose(actual: number, expected: number, label: string): void {
  const tolerance = APPROVED_POLICIES.engine_absolute_tolerance_usd
    + APPROVED_POLICIES.engine_relative_tolerance * Math.max(Math.abs(actual), Math.abs(expected));
  requireModel(Number.isFinite(actual) && Number.isFinite(expected) && Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, received ${actual}`);
}

export function assertOperations(o: OperationsResult): void {
  requireModel(o.completed_jobs <= o.service_demand_jobs && o.completed_jobs <= o.service_capacity_jobs,
    'Completed jobs exceed demand or capacity');
  assertClose(o.service_capacity_jobs, Math.min(o.technician_capacity_jobs, o.vehicle_capacity_jobs), 'Capacity bottleneck');
  assertClose(o.completed_jobs, Math.min(o.service_demand_jobs, o.service_capacity_jobs), 'Constrained throughput');
  assertClose(o.unserved_jobs, o.service_demand_jobs - o.completed_jobs, 'Unserved jobs');
  assertClose(o.utilization, o.service_capacity_jobs === 0 ? 0 : o.completed_jobs / o.service_capacity_jobs, 'Utilization');
  requireModel(o.productive_technician_fte <= o.employed_technicians, 'Productive FTE exceeds employed headcount');
}

export function assertFinancials(f: FinancialResult, ending: FinancialState): void {
  assertClose(f.revenue, f.service_revenue + f.other_revenue, 'Revenue');
  assertClose(f.cogs, f.service_variable_cost + f.tech_direct_labor + f.vehicle_direct_opex + f.other_direct_cost, 'COGS');
  assertClose(f.gross_profit, f.revenue - f.cogs, 'Gross profit');
  assertClose(f.operating_overhead, f.fixed_overhead + f.incremental_marketing + f.recruitment, 'Overhead');
  assertClose(f.ebitda, f.gross_profit - f.operating_overhead, 'EBITDA');
  assertClose(f.ebit, f.ebitda - f.depreciation - f.amortization, 'EBIT');
  assertClose(f.pretax_income, f.ebit - f.cash_interest, 'Pretax income');
  assertClose(f.nwc_end, f.accounts_receivable_end + f.inventory_end - f.accounts_payable_end, 'Ending NWC');
  assertClose(f.delta_nwc, f.nwc_end - f.nwc_begin, 'Delta NWC');
  assertClose(f.operating_cash_flow, f.ebitda - f.cash_interest - f.cash_taxes - f.delta_nwc, 'OCF');
  assertClose(f.capex, f.maintenance_capex + f.growth_capex, 'CapEx');
  assertClose(f.debt_end, f.debt_begin + f.new_borrowings - f.debt_principal, 'Debt roll-forward');
  assertClose(f.cash_change, f.operating_cash_flow - f.capex + f.new_borrowings - f.debt_principal - f.owner_distributions, 'Cash change');
  assertClose(f.cash_end, f.cash_begin + f.cash_change, 'Cash roll-forward');
  assertClose(f.unlevered_fcf, f.ebit - f.unlevered_tax + f.depreciation + f.amortization - f.delta_nwc - f.capex, 'UFCF');
  assertClose(ending.cash, f.cash_end, 'Ending state cash');
  assertClose(ending.accounts_receivable, f.accounts_receivable_end, 'Ending state AR');
  assertClose(ending.inventory, f.inventory_end, 'Ending state inventory');
  assertClose(ending.accounts_payable, f.accounts_payable_end, 'Ending state AP');
  assertClose(ending.debt_tranches.reduce((sum, t) => sum + t.principal, 0), f.debt_end, 'Ending state debt');
  assertClose(f.debt_movements.reduce((sum, m) => sum + m.principal_begin, 0), f.debt_begin, 'Tranche opening totals');
  assertClose(f.debt_movements.reduce((sum, m) => sum + m.borrowing, 0), f.new_borrowings, 'Tranche borrowing totals');
  assertClose(f.debt_movements.reduce((sum, m) => sum + m.principal_repayment, 0), f.debt_principal, 'Tranche repayment totals');
  assertClose(f.debt_movements.reduce((sum, m) => sum + m.cash_interest, 0), f.cash_interest, 'Tranche interest totals');
  for (const movement of f.debt_movements) {
    assertClose(movement.principal_end, movement.principal_begin + movement.borrowing - movement.principal_repayment,
      `Tranche ${movement.tranche_id}`);
  }
}
