import type { ForecastRecord, SimulationResult } from '../../../contracts/contracts.ts';
import { formatValue } from './model.ts';

/** Explain completed engine output only; never calculate an alternative forecast. */
export function explainResults(result: SimulationResult, id: string) {
  const path = result.scenarios[id];
  const comparison = result.comparisons[id];
  if (!path || !comparison) return null;
  const rows = path.months.slice(1) as ForecastRecord[];
  const baseline = result.scenarios.baseline.months.slice(1) as ForecastRecord[];
  const finalCash = comparison.monthly_deltas[60].values.cash_end!;
  const exit = comparison.incremental_exit_equity_value;
  const cash = finalCash < -.01 ? `This plan leaves about ${formatValue(Math.abs(finalCash))} less cash after five years than keeping your current plan.`
    : finalCash > .01 ? `This plan leaves about ${formatValue(finalCash)} more cash after five years than keeping your current plan.`
    : 'This plan leaves about the same amount of cash after five years as keeping your current plan.';
  const salesMonths = rows.filter((_, i) => comparison.monthly_deltas[i + 1].values.revenue! > .01).map(row => row.month);
  const noMissedJobs = rows.every(row => row.operations.unserved_jobs <= 1e-6);
  const baselineHasRoom = baseline.every(row => row.operations.service_demand_jobs < row.operations.service_capacity_jobs - 1e-6);
  const temporary = salesMonths.length > 0 && salesMonths.at(-1)! < 60;
  const laterCosts = temporary && rows.some((row, i) => row.month > salesMonths.at(-1)!
    && row.financials.tech_direct_labor + row.financials.vehicle_direct_opex
      > baseline[i].financials.tech_direct_labor + baseline[i].financials.vehicle_direct_opex + .01);
  const reasons = [salesMonths.length === 0 ? 'Sales do not increase in this forecast. More equipment or staff only helps sales when it lets you serve customers you would otherwise turn away.'
    : temporary ? `Sales increase in ${salesMonths.length} of the 60 months. The last month with higher sales is month ${salesMonths.at(-1)}; the benefit does not last for the whole five years.`
    : `Sales increase in ${salesMonths.length} of the 60 months. More sales can help, but they still need to cover the added costs.`];
  if (baselineHasRoom && noMissedJobs) reasons.push('Your existing team and trucks have room to serve more customers throughout this forecast. Finding more customers may matter more than adding capacity.');
  if (laterCosts) reasons.push('Extra wages or truck running costs continue after the extra sales end. That puts pressure on cash even after the initial purchase is paid for.');
  const payback = path.metrics.payback;
  reasons.push(payback.status === 'not_reached' ? 'The plan does not earn back its extra investment costs within five years in this forecast.'
    : payback.status === 'not_applicable' ? 'This plan has no qualifying extra investment to earn back.'
    : `The plan first earns back its extra investment costs in month ${payback.month}.${payback.subsequent_reversal_month === null ? '' : ` That recovery is later lost in month ${payback.subsequent_reversal_month}.`}`);
  const choices = baselineHasRoom && noMissedJobs
    ? ['Compare marketing on its own, using your current team and trucks.', 'Compare delaying hiring or truck purchases until customer demand needs the extra capacity.']
    : ['Compare adding capacity in smaller steps as customer demand grows.', 'Compare changing the timing of hiring, truck purchases, and marketing so they support one another.'];
  if (temporary) choices.push('Compare a longer or repeat marketing campaign, including its ongoing cost. Extra sales are not guaranteed.');
  if (finalCash < -.01) choices.push('Keep your current plan as an option. In this forecast it preserves more cash than this expansion.');
  const firstBelowReserve = rows.find(row => row.financials.cash_end < result.assumptions.cash_reserve_floor);
  const startsBelowReserve = path.months[0].financials.cash_end < result.assumptions.cash_reserve_floor;
  return { name: path.metadata.name, cash, reasons, choices,
    value: exit === null ? 'The model cannot estimate a meaningful difference in business value for this plan. That does not mean the business is worth zero.'
      : exit < -.01 ? `Its estimated business value is also about ${formatValue(Math.abs(exit))} lower at the end of five years.`
      : exit > .01 ? `Its estimated business value is about ${formatValue(exit)} higher at the end of five years.`
      : 'Its estimated business value is about the same at the end of five years.',
    reserve: firstBelowReserve
      ? `Month ${firstBelowReserve.month} ends below your chosen safety cushion. Review when bills and loan payments come due before committing.`
      : startsBelowReserve
        ? 'Cash starts below your chosen safety cushion, but every forecast month ends at or above it. The model does not add funding automatically.'
        : 'Cash stays at or above your chosen safety cushion in this forecast. Real results can still differ.' };
}
