<script lang="ts">
  import type { SimulationResult } from '../../../contracts/contracts.ts';
  import { formatValue } from './model.ts';
  import { revenueWindows } from './plans.ts';
  let { result, scenarioId, month, stale }: { result: SimulationResult; scenarioId: string; month: number; stale: boolean } = $props();
  let path = $derived(result.scenarios[scenarioId]);
  let row = $derived(path?.months[month]);
  let delta = $derived(result.comparisons[scenarioId]?.monthly_deltas[month]);
  let hasCampaign = $derived(path?.months.some(row => row.events.some(event => event.kind === 'campaign_spend')) ?? false);
  let hasAddedResources = $derived(path?.months.some((row, m) => {
    const baseline = result.scenarios.baseline.months[m];
    return !row.is_opening_state && !baseline.is_opening_state && (row.operations.employed_technicians > baseline.operations.employed_technicians || row.operations.in_service_vehicles > baseline.operations.in_service_vehicles);
  }) ?? false);
  let windows = $derived(revenueWindows(result, scenarioId));
</script>
{#if path}
  <section class="plan-explanation" aria-label="What this plan changes">
    <div><p class="eyebrow">WHAT THIS PLAN CHANGES{stale ? ' · PREVIOUS RUN' : ''}</p><h3>{path.metadata.name}</h3></div>
    <p>{windows ? `Sales exceed baseline in months ${windows}.` : 'This plan adds no sales above baseline over the 60-month forecast.'} {#if hasAddedResources}Extra trucks and staff increase sales only when there is enough customer demand.{/if} {#if hasCampaign}Marketing adds demand during its modeled response window; it does not create permanent customer retention.{/if}</p>
    {#if row && !row.is_opening_state}
      <div class="explanation-numbers"><div><span>Sales change · month {month}</span><strong>{formatValue(delta?.values.revenue)}</strong></div><div><span>Cash change · month {month}</span><strong>{formatValue(delta?.values.cash_end)}</strong></div><div><span>Customer demand / job capacity</span><strong>{row.operations.service_demand_jobs.toFixed(0)} / {row.operations.service_capacity_jobs.toFixed(0)}</strong></div></div>
      <p class="explanation-note">{row.operations.service_demand_jobs < row.operations.service_capacity_jobs ? 'There is spare capacity this month. More capacity alone cannot bring more customers.' : 'Demand meets or exceeds capacity this month. Check both truck and technician capacity before expanding.'} Sales are revenue; cash also reflects expenses, purchases, taxes and loan payments. {#if hasAddedResources}Added employees and trucks continue to incur costs{hasCampaign ? " after the campaign ends" : " throughout their time in service"}.{/if}</p>
    {:else}<p class="explanation-note">Month 0 shows opening balances. Move the slider to a forecast month to see sales and operating capacity.</p>{/if}
  </section>
{:else}<p class="muted">Run the comparison to see results for this new plan.</p>{/if}
