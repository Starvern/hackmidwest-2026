<script lang="ts">
  import type { SimulationResult } from '../../../contracts/contracts.ts';
  import { explainResults } from './explanation.ts';
  let { result, scenarioId, stale }: { result: SimulationResult; scenarioId: string; stale: boolean } = $props();
  let explanation = $derived(explainResults(result, scenarioId));
</script>

{#if explanation}
  <section class="panel plain-results" aria-labelledby="plain-results-title">
    <p class="eyebrow">WHAT THIS MEANS FOR YOUR BUSINESS</p>
    <h2 id="plain-results-title">Your results, in plain English</h2>
    <p class="plan-name">{explanation.name} · compared with keeping your current plan</p>
    {#if stale}<p class="previous" role="status">These explanations describe your previous run. Run the comparison again to include your latest edits.</p>{/if}
    <p class="takeaway">{explanation.cash}</p>
    <p>{explanation.value} This is an estimate of business value, not money in your bank account or a promised sale price.</p>
    <h3>Why the result looks this way</h3>
    <ul>{#each explanation.reasons as reason}<li>{reason}</li>{/each}</ul>
    <p>{explanation.reserve}</p>
    <h3>Other choices worth comparing</h3>
    <p>These are ideas to test, not plans we have already calculated or promises of a better result.</p>
    <ul>{#each explanation.choices as choice}<li>{choice}</li>{/each}</ul>
    <p class="scope">This explanation uses the completed five-year forecast above. It uses one set of assumptions, rather than the separate risk simulation. Change the selected plan to read its explanation.</p>
  </section>
{/if}

<style>
  .plain-results{padding:24px;margin-top:24px;line-height:1.65;max-width:100%}.plain-results h2{margin:4px 0 8px}.plain-results h3{font-size:16px;margin-top:22px}.plain-results li{margin:10px 0}.takeaway{font-size:18px;font-weight:600;color:#244a40}.plan-name,.scope{color:#536865;font-size:13px}.previous{padding:12px;background:#fff1d8;border-radius:8px}.scope{border-top:1px solid #dce5df;padding-top:16px}@media(max-width:850px){.plain-results{padding:16px}}
</style>
