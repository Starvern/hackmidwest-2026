/** Reviewed internal signature changes; implementations belong to Persons 1 and 2. */
import type {
  CompanyInput, ScenarioInput, PathRisks, EngineState, MarketFactors,
  MonthEvents, OperationsResult, FinancialStepResult,
} from './contracts.ts';

export type ScheduleMonth = (
  company: CompanyInput, scenario: ScenarioInput, month: number,
  path_risks: PathRisks, prior_state: EngineState, market_factors: MarketFactors,
) => MonthEvents;
export type CalculateOperations = (
  company: CompanyInput, prior_state: EngineState, month_events: MonthEvents, market_factors: MarketFactors,
) => OperationsResult;
export type CalculateFinancials = (
  company: CompanyInput, prior_state: EngineState, operations: OperationsResult, month_events: MonthEvents,
) => FinancialStepResult;
