<script lang="ts">
  import { untrack } from 'svelte';
  import { riskGroups, riskFieldLabel } from './risk-fields.ts';
  import type { ProfilePayload } from '../../../contracts/intake.ts';
  let { field, sources, busy, onapply }: { field: ProfilePayload['assumptions']['risk_configuration']; sources: ProfilePayload['sources']; busy: boolean; onapply: (draft: unknown) => Promise<void> } = $props();
  let values = $state<Record<string,string>>({}), evidence = $state<Record<string,{source_id:string;method:string;limitations:string}>>({});
  let start = $state(''), end = $state(''), omitted = $state(false), message = $state('');
  function reset() {
    values = {}; evidence = {}; start = ''; end = ''; omitted = false; message = '';
    for (const [group,,,paths] of riskGroups) {
      evidence[group] = { source_id: '', method: '', limitations: '' };
      for (const path of paths) {
        const value = path.split('.').reduce<any>((o,k) => o?.[k], field.value);
        values[path] = value == null ? '' : Array.isArray(value) ? value.join(', ') : String(value);
      }
    }
    if (field.period && 'start' in field.period) { start = field.period.start; end = field.period.end; }
    try {
      const raw = JSON.parse(field.raw?.text ?? '{}');
      if (raw.editor_version === 'risk-editor-1') { evidence = raw.evidence; values = raw.values; start = raw.start; end = raw.end; omitted = raw.omitted_uncertainty_acknowledged; }
    } catch { /* Existing non-editor configurations can still be edited explicitly. */ }
  }
  $effect(() => { field; untrack(reset); });
  async function apply() {
    message = '';
    try { await onapply({ editor_version: 'risk-editor-1', start, end, values: $state.snapshot(values), evidence: $state.snapshot(evidence), omitted_uncertainty_acknowledged: omitted }); }
    catch (error) { message = error instanceof Error ? error.message : 'Check the configuration.'; }
  }
</script>
<details class="risk"><summary>Company risk assumptions · {field.value === null ? 'not yet supplied' : field.state.replaceAll('_',' ')}</summary>
  <p>Prepare sensitivity assumptions for review. Fitted and operator-estimated parameters remain estimates. Saving or reviewing these inputs does not approve calibrated risk probabilities or enable a risk run.</p>
  <p>Use company evidence for each group. Blank parameters stay unknown; no demo settings are copied. Annual common-driver updates occur in months 1, 13, 25, 37 and 49.</p>
  {#if message}<p role="alert">{message}</p>{/if}
  <form onsubmit={e => { e.preventDefault(); void apply(); }}>
    <div class="grid"><label>Evidence coverage starts<input required type="date" bind:value={start} /></label><label>Evidence coverage ends<input required type="date" bind:value={end} /></label></div>
    {#each riskGroups as [group,title,guidance,paths]}
      <fieldset><legend>{title}</legend><p>{guidance}</p>
        <div class="grid">{#each paths as path}<label>{riskFieldLabel(path)}<input required type="text" inputmode="decimal" placeholder={path.endsWith('.values') || path.endsWith('.probabilities') ? 'Comma-separated numbers' : 'Not yet known'} bind:value={values[path]} /></label>{/each}</div>
        {#if evidence[group]}<label>Supporting source<select required bind:value={evidence[group].source_id}><option value="">Choose dated company evidence or an estimate</option>{#each sources.filter(s => s.kind !== 'spreadsheet_cell' || field.source_ids.includes(s.source_id)) as source}<option value={source.source_id}>{source.title}</option>{/each}</select></label>
        <label>Method, sample coverage and dependence<textarea required bind:value={evidence[group].method} placeholder="Explain observations, fitting or elicitation, exclusions, and how these parameters relate."></textarea></label>
        <label>Limitations and missing validation<textarea required bind:value={evidence[group].limitations} placeholder="State missing evidence, censoring, omitted uncertainty, and holdout validation or its absence."></textarea></label>{/if}
      </fieldset>
    {/each}
    <label class="check"><input type="checkbox" required bind:checked={omitted} />I acknowledge the fixed factors omit uncertainty, and these settings remain estimates pending parameter and evidence review.</label>
    <button disabled={busy}>Save risk assumptions as an unreviewed draft</button>
  </form>
  <p>After saving, use “Review entered inputs” and confirm a new starting picture. P1/P2 acceptance must identify the exact revision and configuration fingerprint before activation. Workbook risk configuration remains unsupported.</p>
</details>
<style>.risk{background:white;padding:1.5rem;border:1px solid #d5dfd9;border-radius:12px;margin:1rem 0}summary,legend{font-weight:600}summary{cursor:pointer}p{line-height:1.6;font-size:.9rem;color:#536b69}fieldset{border:1px solid #d5dfd9;border-radius:8px;margin:1.5rem 0;padding:1rem}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem}label{display:grid;gap:.4rem;font-size:.85rem;margin:.8rem 0}input,textarea,select{width:100%;box-sizing:border-box;font:inherit;padding:.6rem;border:1px solid #b9c8c9;border-radius:6px;background:white}textarea{min-height:75px}.check{display:flex;align-items:center;gap:.7rem}.check input{width:auto}button{padding:.7rem 1rem;border:0;border-radius:7px;background:#176d60;color:white;font:inherit;cursor:pointer}button:disabled{opacity:.5}@media(max-width:700px){.grid{grid-template-columns:1fr}}</style>
