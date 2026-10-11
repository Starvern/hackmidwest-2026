<script lang="ts">
  import type { SimulationResult } from '../../../contracts/contracts.ts';
  import { explainResults } from './explanation.ts';
  let { result, scenarioId, stale }: { result: SimulationResult; scenarioId: string; stale: boolean } = $props();
  let explanation = $derived(explainResults(result, scenarioId));
  let highlights = $derived(explanation ? [
    explanation.reasons[0].split('. ')[0] + '.',
    ...explanation.reasons.slice(1, -1).slice(-1).map(reason => reason.split('. ')[0] + '.'),
    explanation.reasons.at(-1)!,
    explanation.reserve.split('. ')[0] + '.',
  ] : []);
</script>

{#if explanation}
  <section class="panel plain-results" aria-label="Plan results">
    {#if stale}<p class="previous" role="status">Previous results. Run the comparison again to include your edits.</p>{/if}
    <p class="takeaway">{explanation.cash} {explanation.value}</p>
    <ul>{#each highlights as highlight}<li>{highlight}</li>{/each}</ul>
  </section>
{/if}

<style>
  .plain-results{padding:24px;margin-top:24px;line-height:1.65;max-width:100%}.plain-results ul{list-style:disc;padding-left:22px}.plain-results li{margin:8px 0}.takeaway{font-size:16px;color:#244a40}.previous{padding:12px;background:#fff1d8;border-radius:8px}@media(max-width:850px){.plain-results{padding:16px}}
</style>
