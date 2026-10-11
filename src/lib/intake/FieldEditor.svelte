<script lang="ts">
  import { label, unitLabel, choices, type Envelope } from './form.ts';
  let { field, fieldKey, pointer, sources, onchange }: { field: Envelope; fieldKey: string; pointer: string; sources: { source_id: string; title: string }[]; onchange: (value: unknown, source: string, raw?: string) => void } = $props();
  const id = $derived('field' + pointer.replaceAll('/', '-'));
  const title = $derived(pointer.includes('/seasonality/') ? `${['January','February','March','April','May','June','July','August','September','October','November','December'][Number(fieldKey)]} demand factor` : label(fieldKey));
  let options = $derived(field.unit === 'boolean' ? [['true','Yes'],['false','No']] : choices[fieldKey]);
  function change(raw: string) {
    const value = raw === '' ? null : field.unit === 'boolean' ? raw === 'true' : ['text','ISO_date'].includes(field.unit) ? raw : Number(raw);
    onchange(value, field.source_ids[0] ?? sources[0]?.source_id ?? '', raw);
  }
</script>
<div class="field">
  <label for={id}>{title} <span>{unitLabel(field.unit)}</span></label>
  {#if options}<select {id} value={field.value === null ? '' : String(field.value)} onchange={e => change(e.currentTarget.value)}><option value="">Not yet known</option>{#each options as [value, title]}<option {value}>{title}</option>{/each}</select>
  {:else}<input {id} type={field.unit === 'ISO_date' ? 'date' : field.unit === 'text' ? 'text' : 'number'} step="any" value={field.value === null ? '' : String(field.value)} placeholder="Not yet known" oninput={e => change(e.currentTarget.value)} />{/if}
  <label class="source" for={id + '-source'}>Source</label><select id={id + '-source'} value={field.source_ids[0] ?? ''} onchange={e => onchange(field.value, e.currentTarget.value)}><option value="">Choose evidence or estimate</option>{#each sources as source}<option value={source.source_id}>{source.title}</option>{/each}</select>
  <small>{field.state.replaceAll('_', ' ')}</small>
</div>
<style>.field{display:grid;gap:.3rem;align-content:start}label{font-weight:600;font-size:.9rem}label span,small{display:block;font-size:.75rem;font-weight:400;color:#526a70}.source{font-size:.72rem;margin-top:.15rem;font-weight:400}input,select{width:100%;box-sizing:border-box;border:1px solid #b9c8c9;border-radius:6px;padding:.55rem;background:white;color:#17363b}small{color:#617271}</style>
