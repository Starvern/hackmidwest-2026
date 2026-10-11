<script lang="ts">
  import { onMount } from 'svelte';
  import { requestJson } from '../../lib/dashboard/api.ts';
  import { fieldEntries, issueLabel, type Envelope } from '../../lib/intake/form.ts';
  import RiskEditor from '../../lib/intake/RiskEditor.svelte';
  import FieldEditor from '../../lib/intake/FieldEditor.svelte';
  import type { ProfilePayload } from '../../../contracts/intake.ts';
  import type { ProfileStore } from '../../lib/server/intake/store.ts';
  import type { assessIntake } from '../../lib/server/intake/eligibility.ts';
  import workbookUrl from '../../../outputs/intake-v2/company-intake-v2.xlsx?url';
  type Record = ReturnType<ProfileStore['read']> & { profile_id: string; eligibility: ReturnType<typeof assessIntake> };
  let record = $state<Record | null>(null), saved = $state(''), error = $state(''), busy = $state(false);
  let profiles = $state<{ profile_id: string; revision: number; name: string | null; status: string }[]>([]);
  let name = $state(''), date = $state(''), sourceTitle = $state(''), rationale = $state('');
  let ownerReviewed = $state(false), startingPictureReviewed = $state(false);
  let rows = $state<{ loan: unknown; asset: unknown; expense: unknown } | null>(null);
  let serviceKind = $state(''), fullyAvailable = $state(false), method = $state(''), limitations = $state('');
  let workbook = $state<File | null>(null), importNote = $state('');
  let addedSourceTitle = $state(''), addedSourceDate = $state(''), addedSourceEstimate = $state(false);
  const base = '/api/v2/intake';
  const dirty = $derived(record !== null && saved !== JSON.stringify(record.profile));
  const preview = $derived(record?.preview);
  const groups = $derived(record ? [
    ['About your business', record.profile.business, '/business'], ['Cash and opening balances', Object.fromEntries(Object.entries(record.profile.opening).filter(([key]) => !['loans','assets'].includes(key))), '/opening'],
    ['Team, vehicles and customer demand', record.profile.operations, '/operations'], ['Forecast assumptions', record.profile.assumptions, '/assumptions'],
  ] as const : []);
  const schedules = $derived(record ? [['Existing loans','loan',record.profile.opening.loans,'/opening/loans'],['Existing equipment','asset',record.profile.opening.assets,'/opening/assets'],['Existing expense details','expense',record.profile.expense_ledger,'/expense_ledger']] as const : []);
  async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    return requestJson<T>(base + path, { method, ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) });
  }
  async function action(fn: () => Promise<void>) { busy = true; error = ''; try { await fn(); } catch (e) { error = e instanceof Error ? e.message : 'Please retry.'; } finally { busy = false; } }
  function accept(value: Record) { record = value; saved = JSON.stringify(value.profile); ownerReviewed = false; startingPictureReviewed = false; }
  async function refresh() { profiles = await api('/profiles'); }
  async function importFile() { await action(async () => {
    if (!workbook) return;
    if (!workbook.name.toLowerCase().endsWith('.xlsx') || workbook.size > 1024 * 1024) throw new Error('Choose a revision-2 .xlsx workbook of 1 MB or less.');
    const value = await requestJson<Record>(base + '/import', { method: 'POST', headers: { 'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }, body: workbook });
    accept(value); rows = null; const books = value.profile.business.books_through.value;
    if (books) rows = (await api<{ rows: typeof rows }>(`/template?books_through=${books}`)).rows;
    importNote = 'Workbook imported as a new draft. Review the imported facts, sources and estimates before calculating your starting picture.'; await refresh();
  }); }
  onMount(() => { void action(async () => { await api('/session', 'POST'); await refresh(); }); });
  async function create() { await action(async () => {
    const template = await api<{ profile: ProfilePayload; rows: typeof rows }>(`/template?books_through=${encodeURIComponent(date)}`);
    rows = template.rows;
    template.profile.sources = [
      { source_id: 'facts', kind: 'manual_statement', title: sourceTitle, period: { as_of: date }, locator: null },
      { source_id: 'estimates', kind: 'owner_estimate', title: 'Owner planning estimates', period: { as_of: date }, locator: null },
    ];
    template.profile.business.name.value = name; template.profile.business.name.state = 'entered';
    template.profile.business.name.source_ids = ['facts']; template.profile.business.books_through.source_ids = ['facts'];
    accept(await api<Record>('/profiles', 'POST', template.profile)); await refresh();
  }); }
  async function load(id: string, revision: number) { await action(async () => {
    accept(await api<Record>(`/profiles/${id}?revision=${revision}`));
    const books = record!.profile.business.books_through.value;
    if (books) rows = (await api<{ rows: typeof rows }>(`/template?books_through=${books}`)).rows;
  }); }
  function edit(field: Envelope, value: unknown, source: string, raw?: string) {
    field.value = value; field.state = value === null ? 'unknown' : 'entered'; field.review = null; field.derivation = null;
    field.source_ids = value === null || !source ? [] : [source];
    if (value === null) field.raw = null;
    if (raw !== undefined && value !== null) field.raw = { text: raw, unit: field.unit, precision: typeof value === 'number' ? raw.includes('.') ? '0.' + '0'.repeat(Math.max(0, raw.split('.')[1].length - 1)) + '1' : '1' : 'as entered' };
    ownerReviewed = false; startingPictureReviewed = false;
  }
  async function save() { if (record && dirty) accept(await api<Record>(`/profiles/${record.profile_id}`, 'PATCH', { revision: record.revision, profile: record.profile })); }
  async function review() { await action(async () => {
    if (!record) return; await save();
    const selections = fieldEntries(record.profile).filter(e => e.field.value !== null).map(e => ({ pointer: e.pointer, state: record!.estimate_pointers.includes(e.pointer) || record!.profile.sources.some(s => e.field.source_ids.includes(s.source_id) && s.kind === 'owner_estimate') ? 'reviewed_estimate' : 'confirmed', rationale }));
    record.profile.sources.forEach((_, i) => selections.push({ pointer: `/sources/${i}`, state: 'confirmed', rationale }));
    accept(await api<Record>(`/profiles/${record.profile_id}/review`, 'POST', { revision: record.revision, selections })); await refresh();
  }); }
  async function makePreview() { await action(async () => { if (!record) return; await save(); await api(`/profiles/${record.profile_id}/preview`, 'POST', { revision: record.revision }); await loadRecord(); }); }
  async function loadRecord() { if (record) accept(await api<Record>(`/profiles/${record.profile_id}?revision=${record.revision}`)); }
  async function confirm() { await action(async () => {
    if (!record?.preview || dirty) return;
    await api(`/profiles/${record.profile_id}/acknowledge`, 'POST', { revision: record.revision, preview_id: record.preview.preview_id });
    accept(await api<Record>(`/profiles/${record.profile_id}/confirm`, 'POST', { revision: record.revision })); await refresh();
  }); }
  function addRow(kind: 'loan' | 'asset' | 'expense') {
    if (!rows || !record) return;
    const row = { ...structuredClone(rows[kind]) as object, row_id: crypto.randomUUID() };
    if (kind === 'loan') record.profile.opening.loans.push(row as ProfilePayload['opening']['loans'][number]);
    else if (kind === 'asset') record.profile.opening.assets.push(row as ProfilePayload['opening']['assets'][number]);
    else record.profile.expense_ledger.push(row as ProfilePayload['expense_ledger'][number]);
  }
  function evidence() {
    if (!record || !serviceKind) return;
    const p = record.profile, job = p.operations.job_definition.value;
    if (!job) { error = 'Define one comparable completed job first.'; return; }
    edit(p.operations.service_mix, [{ row_id: 'service-pool', trade: p.business.trade.value === 'HVAC' ? 'HVAC' : p.business.trade.value === 'plumbing' ? 'plumbing' : 'other', service_kind: serviceKind, description: job, comparable_job_definition: job, pool_id: 'service-team', historical_row_ids: p.history.map(h => h.row_id), completed_jobs: null, service_revenue_usd: null, source_ids: ['facts'] }], 'facts');
    if (fullyAvailable) edit(p.operations.workforce_availability, { declaration: 'none', constraints: [] }, 'facts');
    if (method && limitations && p.operations.base_monthly_demand.value !== null)
      edit(p.operations.demand_evidence, { kind: 'reviewed_estimate', period_start: `${p.history[0].period}-01`, period_end: p.business.books_through.value, estimated_jobs_per_month: p.operations.base_monthly_demand.value, method, limitations, service_mix_row_ids: ['service-pool'], source_ids: ['estimates'] }, 'estimates');
  }
</script>

<svelte:head><title>Your business · OperatorOS</title></svelte:head>
<main>
  <nav><a href="/">OperatorOS · Demo workspace</a><span>Your business</span></nav>
  <header><p class="eyebrow">START WITH YOUR BUSINESS</p><h1>A starting picture you can trust.</h1><p>Enter existing facts and planning estimates, review what the model supports, then compare investments. Nothing is filled from the demo.</p></header>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
  {#if importNote}<p role="status">{importNote}</p>{/if}
  <section class="panel"><h2>Your drafts and confirmed businesses</h2><p class="note">Local review only. Access belongs to this browser session for 30 days. Keep this browser’s cookies to return; there is no account recovery yet. Use synthetic review data during this candidate review.</p>{#each profiles as item}<button class="saved" disabled={busy} onclick={() => load(item.profile_id, item.revision)}>{item.name ?? 'Unnamed business'} · revision {item.revision} · {item.status}</button>{/each}
    <details open={!record}><summary>Start a business profile</summary><form onsubmit={e => { e.preventDefault(); void create(); }}><div class="grid"><label>Business name<input required bind:value={name} /></label><label>Books through<input type="date" required bind:value={date} /></label><label>Source of the opening facts<input required bind:value={sourceTitle} placeholder="e.g. year-end accounts and owner statement" /></label></div><p class="note">The initial model supports USD HVAC, December 31 opening balances, the previous January–December history, and a January forecast. Other facts may be saved as drafts.</p><button class="primary" disabled={busy}>Create draft</button></form></details>
  </section>
  <section class="panel"><h2>Bring in your intake workbook</h2><p>Use the revision-2 template. Import creates a separate draft and preserves cell sources. Workbook review claims do not approve your inputs.</p><a href={workbookUrl} download="company-intake-v2.xlsx">Download the blank workbook</a><p class="note">Values only · .xlsx · up to 1 MB. Formulas, macros and external links are unsupported. Use ISO dates or standard Excel dates. Blank means unknown; enter numeric zero explicitly.</p><label>Completed intake workbook<input type="file" accept=".xlsx" disabled={busy} onchange={e => { workbook = e.currentTarget.files?.[0] ?? null; importNote = ''; }} /></label><button disabled={busy || !workbook} onclick={importFile}>Import as a new draft</button></section>
  {#if record}
    <section class="status"><strong>{record.profile.business.name.value ?? 'Your business'}</strong><span>Revision {record.revision} · {record.status}{dirty ? ' · unsaved changes' : ''}</span><button disabled={busy || !dirty} onclick={() => action(async () => { await save(); await refresh(); })}>Save {record.status === 'confirmed' ? 'as new draft' : 'draft'}</button></section>
    <details class="panel"><summary>Evidence sources and owner estimates</summary><ul>{#each record.profile.sources as source}<li>{source.title} · {source.kind.replaceAll('_',' ')}{source.locator ? ` · ${source.locator}` : ''}</li>{/each}</ul><form onsubmit={e => { e.preventDefault(); if (!record) return; record.profile.sources.push({ source_id: crypto.randomUUID(), title: addedSourceTitle, kind: addedSourceEstimate ? 'owner_estimate' : 'manual_statement', period: { as_of: addedSourceDate }, locator: null }); addedSourceTitle = ''; ownerReviewed = false; startingPictureReviewed = false; }}><div class="grid"><label>New source title<input required bind:value={addedSourceTitle} /></label><label>Source as-of date<input type="date" required bind:value={addedSourceDate} /></label></div><label class="check"><input type="checkbox" bind:checked={addedSourceEstimate} />This source is an owner estimate.</label><button disabled={busy}>Add source</button></form></details>
    {#each groups as [title, value, pointer]}<details class="panel"><summary>{title}</summary><p class="note">Choose an evidence source or an owner estimate for each value. Fractions use decimals: 5% = 0.05. Blank means unknown; zero is a real value.</p><div class="grid">{#each fieldEntries(value, pointer).filter(e => !['record','record_list','category_list'].includes(e.field.unit)) as entry}<FieldEditor field={entry.field} fieldKey={entry.key} pointer={entry.pointer} sources={record.profile.sources} estimated={record.estimate_pointers.includes(entry.pointer)} onchange={(value, source, raw) => edit(entry.field, value, source, raw)} />{/each}</div></details>{/each}
    <details class="panel"><summary>Monthly history · actual {record.profile.history[0]?.period.slice(0,4)} observations</summary><p class="note">Use earned sales and recognized costs for each displayed month. Keep statement profit and its basis separate from operating earnings.</p>{#each record.profile.history as row, i}<details><summary>{row.period}</summary><div class="grid">{#each fieldEntries(row, `/history/${i}`) as entry}<FieldEditor field={entry.field} fieldKey={entry.key} pointer={entry.pointer} sources={record.profile.sources} estimated={record.estimate_pointers.includes(entry.pointer)} onchange={(value, source, raw) => edit(entry.field, value, source, raw)} />{/each}</div></details>{/each}</details>
    <details class="panel"><summary>Service, staffing and demand evidence</summary><p class="note">This form supports one comparable service pool. If staff have part-time, ramp, skill or crew constraints, leave availability unconfirmed; the profile stays a draft until supported.</p><div class="grid"><label>Service kind<select bind:value={serviceKind}><option value="">Choose a service</option><option value="repair">Repair</option><option value="installation">Installation</option><option value="maintenance">Maintenance</option><option value="other">Other</option></select></label><label>How did you estimate requested jobs?<textarea bind:value={method}></textarea></label><label>Limitations of the estimate<textarea bind:value={limitations}></textarea></label></div><label class="check"><input type="checkbox" bind:checked={fullyAvailable} />All employed service technicians are fully available and productive in this pool.</label><button disabled={busy} onclick={evidence}>Record these operating facts and demand estimate</button><h3>Current operating evidence</h3>{#each record.profile.operations.service_mix.value ?? [] as pool}<p><strong>{pool.description}</strong> · {pool.trade} / {pool.service_kind} · pool {pool.pool_id}<br />One job: {pool.comparable_job_definition}. Covered history: {pool.historical_row_ids.join(', ')}. Recorded jobs: {pool.completed_jobs ?? 'unknown'}; recorded sales: {pool.service_revenue_usd ?? 'unknown'}.</p>{/each}
      {#if record.profile.operations.workforce_availability.value}<p>Workforce declaration: {record.profile.operations.workforce_availability.value.declaration}</p>{#each record.profile.operations.workforce_availability.value.constraints as constraint}<p>{constraint.description} · {constraint.people} people · available fraction {constraint.available_fraction ?? 'unknown'} · productivity fraction {constraint.productivity_fraction ?? 'unknown'}</p>{/each}{/if}
      {#each [record.profile.operations.demand_evidence.value] as demand}
      {#if demand?.kind === 'reviewed_estimate'}<p><strong>Demand estimate:</strong> {demand.estimated_jobs_per_month} jobs/month · {demand.period_start} to {demand.period_end}<br />Method: {demand.method}<br />Limitations: {demand.limitations}</p>{:else if demand?.kind === 'measured'}{#each demand.observations as observation}<p>{observation.period}: {observation.requested_jobs} requested jobs; {observation.unserved_jobs ?? 'unknown'} unserved. Service records: {observation.service_mix_row_ids.join(', ')}.</p>{/each}{:else if demand?.kind === 'confirmed_no_unserved'}<p>No unserved work declared: {demand.rationale}. Covered history: {demand.historical_row_ids.join(', ')}.</p>{/if}{/each}
      <p class="note">Current service evidence: {record.profile.operations.service_mix.state.replaceAll('_',' ')} · staffing: {record.profile.operations.workforce_availability.state.replaceAll('_',' ')} · demand: {record.profile.operations.demand_evidence.state.replaceAll('_',' ')}</p></details>
    <details class="panel"><summary>Supplier cost categories</summary><p class="note">Select which direct costs support the accounts-payable timing assumption. Payroll and vehicle running costs are excluded in this initial policy.</p>{#each [['service_variable_cost','Service materials / variable costs'],['other_direct_cost','Other direct costs']] as [value, title]}<label class="check"><input type="checkbox" checked={record.profile.assumptions.ap_eligible_cost_categories.value?.includes(value) ?? false} onchange={e => { const current = record!.profile.assumptions.ap_eligible_cost_categories.value ?? []; edit(record!.profile.assumptions.ap_eligible_cost_categories, e.currentTarget.checked ? [...current, value] : current.filter(v => v !== value), 'estimates'); }} />{title}</label>{/each}</details>
    {#each schedules as [title, kind, items, pointer]}<details class="panel"><summary>{title}</summary><p class="note">Existing costs apply to every plan. Included details add nothing to totals. Replacement details must reconcile. Monthly recognized expense is not a payment schedule; materially irregular payments remain unsupported.</p>{#each items as row, i}<div class="row"><div class="grid">{#each fieldEntries(row, `${pointer}/${i}`) as entry}<FieldEditor field={entry.field} fieldKey={entry.key} pointer={entry.pointer} sources={record.profile.sources} estimated={record.estimate_pointers.includes(entry.pointer)} onchange={(value, source, raw) => edit(entry.field, value, source, raw)} />{/each}</div><button disabled={busy} onclick={() => items.splice(i,1)}>Remove this record</button></div>{/each}<button disabled={busy || !rows} onclick={() => addRow(kind as 'loan' | 'asset' | 'expense')}>Add record</button></details>{/each}
    {#key record.profile_id + ':' + record.revision}<RiskEditor field={record.profile.assumptions.risk_configuration} sources={record.profile.sources} {busy} onapply={async draft => {
      busy = true; error = ''; try { await save(); if (!record) return; accept(await api<Record>(`/profiles/${record.profile_id}/risk-configuration`, 'POST', { revision: record.revision, draft })); await refresh(); } finally { busy = false; }
    }} />{/key}
    <section class="panel"><h2>Review your starting inputs</h2><p>Saving does not approve values. This review keeps estimates labeled and records your acknowledgment of the entered facts and their sources.</p><label>Review rationale, estimate methods and limitations<textarea bind:value={rationale} placeholder="Explain what you reviewed and where estimates remain limited."></textarea></label><label class="check"><input type="checkbox" bind:checked={ownerReviewed} />I reviewed the entered facts, sources and estimates above.</label><button class="primary" disabled={busy || !ownerReviewed || !rationale.trim() || record.status === 'confirmed'} onclick={review}>Review entered inputs</button>
      <h3>What needs attention</h3>{#if dirty}<p>Save and review your changes to refresh these checks.</p>{:else}{#if record.eligibility.issues.length}<details><summary>{record.eligibility.input_eligible ? 'Input checks passed · review model notes' : `${record.eligibility.issues.filter(i => i.severity === 'blocking').length} inputs need review or completion`}</summary><ul>{#each record.eligibility.issues as issue}<li>{issue.severity === 'notice' ? 'Note · ' : ''}{issueLabel(issue.pointer, record.profile.history)}: {issue.message}</li>{/each}</ul></details>{:else}<p>Input checks passed. Review a calculated starting picture next.</p>{/if}{/if}
      <button disabled={busy || dirty || !record.eligibility.input_eligible || record.status === 'confirmed'} onclick={makePreview}>Calculate starting picture</button>
    </section>
    {#if preview}<section class="panel"><h2>Here is the business we will simulate</h2><p>This is a calculated baseline from revision {record.revision}. It includes no new investments. Negative cash remains visible and no automatic funding is assumed.</p><div class="grid"><div><span>Month 1 sales</span><strong>{preview.baseline.months[1].is_opening_state ? '—' : preview.baseline.months[1].financials.revenue.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0})}</strong></div><div><span>Lowest cash across the forecast</span><strong>{preview.baseline.metrics.minimum_cash.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0})}</strong></div><div><span>Completed jobs · month 1</span><strong>{preview.baseline.months[1].operations?.completed_jobs.toLocaleString()}</strong></div></div>{#if record.status !== 'confirmed'}<label class="check"><input type="checkbox" bind:checked={startingPictureReviewed} />I reviewed this exact starting picture and its assumptions.</label><button class="primary" disabled={busy || dirty || !startingPictureReviewed} onclick={confirm}>Confirm this revision</button>{:else}<p>Confirmed. Editing creates a separate draft; this snapshot stays unchanged.</p><a class="primary link" href={`/?profile=${record.profile_id}&revision=${record.revision}`}>Compare investment plans →</a>{/if}</section>{/if}
    <details class="panel"><summary>Remove this business from local storage</summary><p>Deletes all saved revisions and starting pictures for this business.</p><button disabled={busy} onclick={() => action(async () => { await api(`/profiles/${record!.profile_id}`, 'DELETE'); record = null; saved = ''; await refresh(); })}>Delete this business and its revisions</button></details>
  {/if}
  <footer><a href="/">Use the fictional demo instead</a><span>{busy ? 'Working…' : 'Your facts stay separate from demo economics.'}</span></footer>
</main>
<style>:global(body){background:#f2f5f2;color:#17363b;font-family:Arial,sans-serif}main{max-width:1100px;margin:0 auto;padding:2rem 1.2rem}nav,footer,.status{display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap}nav a,a{color:#176d60}header{max-width:760px;margin:3rem 0 2rem}h1{font-size:clamp(2rem,5vw,3.4rem);line-height:1.08;letter-spacing:-.04em;margin:.7rem 0}h2{font-size:1.3rem}p{line-height:1.6}.eyebrow{font-size:.75rem;letter-spacing:.16em}.panel{background:white;padding:1.5rem;border:1px solid #d5dfd9;border-radius:12px;margin:1rem 0}summary{cursor:pointer;font-weight:600;padding:.5rem 0}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1.2rem;margin:1rem 0}.grid strong{display:block;font-size:1.8rem;margin:.5rem 0}.note{color:#536b69;font-size:.86rem}label{display:grid;gap:.4rem;font-size:.9rem}input,select,textarea{box-sizing:border-box;width:100%;padding:.65rem;border:1px solid #b9c8c9;border-radius:6px;background:white;font:inherit}textarea{min-height:80px}.check{display:flex;align-items:center;gap:.7rem;margin:1rem 0}.check input{width:auto}button,.link{padding:.7rem 1rem;border:1px solid #b4c6bd;border-radius:7px;background:#f5f8f4;color:#17363b;cursor:pointer;font:inherit}button:disabled{opacity:.5;cursor:default}.primary{background:#176d60;color:white;border-color:#176d60}.link{display:inline-block;text-decoration:none}.saved{margin:.4rem}.error{border-left:4px solid #b94731;padding:1rem;background:#fff0e9}.row{border-top:1px solid #dce5df;padding:1rem 0}.status{position:sticky;top:0;background:#e0ece3;padding:1rem;z-index:1}ul{max-height:350px;overflow:auto;font-size:.9rem;line-height:1.7}footer{padding:2rem 0;font-size:.85rem}@media(max-width:700px){.grid{grid-template-columns:1fr}.panel{padding:1rem}.status{position:static}}</style>
