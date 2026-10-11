import type { Decision, DeterministicRequest, MetricKey, ScenarioPath, SimulationResult } from '../../../contracts/contracts.ts';
import example from '../../../contracts/example-request.json' with { type: 'json' };
import { editDecision, metricValue } from './model.ts';

const userLabel = { kind: 'user_input' as const, source: 'OperatorOS plan editor', unit: 'label' };
export function addPlan(request: DeterministicRequest, id: string, copyId?: string): DeterministicRequest {
  const next = structuredClone(request);
  const source = next.scenarios.find(s => s.id === copyId);
  next.scenarios.push({ id, name: source ? `${source.name} copy` : 'My new plan', decisions: source ? structuredClone(source.decisions) : [] });
  return next;
}
export function addAction(request: DeterministicRequest, scenarioId: string, type: Decision['type'], id: string): DeterministicRequest {
  const next = structuredClone(request);
  const template = example.scenarios.flatMap(s => s.decisions).find(d => d.type === type)!;
  const decision = structuredClone(template) as unknown as Decision;
  decision.id = id; decision.stable_investment_key = id;
  decision.provenance['/id'] = { ...userLabel };
  decision.provenance['/stable_investment_key'] = { ...userLabel };
  next.scenarios.find(s => s.id === scenarioId)!.decisions.push(decision);
  return next;
}
/** Editing a copied/shared action detaches it before changing its economics. Other plans stay intact. */
export function editPlanAction(request: DeterministicRequest, scenarioId: string, decisionId: string, path: string, value: number, detachedKey: string): DeterministicRequest {
  const next = structuredClone(request);
  const decision = next.scenarios.find(s => s.id === scenarioId)!.decisions.find(d => d.id === decisionId)!;
  const shared = next.scenarios.some(s => s.id !== scenarioId && s.decisions.some(d => d.stable_investment_key === decision.stable_investment_key));
  if (shared) {
    decision.stable_investment_key = detachedKey;
    decision.provenance['/stable_investment_key'] = { ...userLabel };
  }
  return editDecision(next, decision.stable_investment_key, path, value);
}
/** Preserve accepted risk workload: baseline + the selected plan + one comparison plan. */
export function riskComparison(request: DeterministicRequest, selectedId: string, otherId: string): DeterministicRequest {
  const alternatives = request.scenarios.filter(s => s.id !== 'baseline' && s.id !== selectedId);
  const other = alternatives.find(s => s.id === otherId) ?? alternatives[0];
  return { ...request, scenarios: request.scenarios.filter(s => s.id === 'baseline' || s.id === selectedId || s.id === other?.id) };
}
export function timelineValue(path: ScenarioPath, metric: MetricKey, month: number, result: SimulationResult, changes: boolean): number | null {
  return changes ? result.comparisons[path.metadata.scenario_id]?.monthly_deltas[month].values[metric] ?? null : metricValue(path.months[month], metric);
}
export function revenueWindows(result: SimulationResult, id: string): string {
  const months = result.comparisons[id]?.monthly_deltas.filter(row => (row.values.revenue ?? 0) > 0.005).map(row => row.month) ?? [];
  const ranges: number[][] = [];
  for (const month of months) {
    const last = ranges.at(-1);
    if (last && last[1] + 1 === month) last[1] = month;
    else ranges.push([month, month]);
  }
  return ranges.map(([start, end]) => start === end ? `${start}` : `${start}–${end}`).join(', ');
}
