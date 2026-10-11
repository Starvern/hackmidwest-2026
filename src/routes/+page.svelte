<script lang="ts">
  import { onMount } from 'svelte';
  import { label as financialLabel } from '../lib/intake/form.ts';
  import { page } from '$app/state';
  import type { CompanyBinding } from '../../contracts/intake.ts';
  import { requestJson as get } from '../lib/dashboard/api.ts';
  import type { Decision, CompanyInput, DeterministicRequest, MetricKey, ModelMetadata, SimulationResult } from '../../contracts/contracts.ts';
  import example from '../../contracts/example-request.json';
  import PlanExplanation from '../lib/dashboard/PlanExplanation.svelte';
  import Sidebar from '../lib/dashboard/Sidebar.svelte';
  import { createGrowthPlans } from '../lib/dashboard/growth-example.ts';
  import { createPlanningRequest, addPlan, addAction, editPlanAction } from '../lib/dashboard/plans.ts';
  import RiskPanel from '../lib/dashboard/RiskPanel.svelte';
  import ResultsExplanation from '../lib/dashboard/ResultsExplanation.svelte';
  import Timeline from '../lib/dashboard/Timeline.svelte';
  import { metrics, metricValue, formatValue, paybackLabel, decisionFields, fieldValue } from '../lib/dashboard/model.ts';
  const profileMode = $derived(page.url.searchParams.has('profile'));
  const growthExample = $derived(!profileMode && page.url.searchParams.get('example') === 'growth');
  let binding = $state<CompanyBinding | null>(null);
  let latestRevision = $state<number | null>(null);
  let request = $state<DeterministicRequest>(!page.url.searchParams.has('profile') && page.url.searchParams.get('example') === 'growth' ? createGrowthPlans() : page.url.searchParams.has('profile') ? createPlanningRequest() : createPlanningRequest(example.company_id, example.reserve_floor_usd, example.exit_multiple));
  let company = $state<CompanyInput | null>(null);
  let metadata = $state<ModelMetadata | null>(null);
  let result = $state<SimulationResult | null>(null);
  let resultInput = $state('');
  let pending = $state(false);
  let error = $state('');
  let metric = $state<MetricKey>('cash_end');
  let month = $state(5);
  let changes = $state(false);
  let actionType = $state<Decision['type']>('increase_marketing');
  let scenarioId = $state('plan_a');
  let editorForm: HTMLFormElement;
  let stale = $derived(result !== null && resultInput !== JSON.stringify(request));
  let paths = $derived(result ? Object.values(result.scenarios) : []);
  let scenario = $derived(request.scenarios.find(s => s.id === scenarioId)!);
  let selectedPath = $derived(result?.scenarios[scenarioId]);
  let selectedRow = $derived(selectedPath?.months[month]);
  let comparison = $derived(result?.comparisons[scenarioId]);
  let metricInfo = $derived(metrics.find(item => item.key === metric)!);
  function createPlan(copy = false) {
    const id = crypto.randomUUID();
    request = addPlan($state.snapshot(request), id, copy ? scenarioId : undefined);
    scenarioId = id;
  }
  function removePlan() {
    if (request.scenarios.length <= 3) return;
    request.scenarios = request.scenarios.filter(s => s.id !== scenarioId);
    scenarioId = request.scenarios.find(s => s.id !== 'baseline')!.id;
  }
  async function run() {
    if (editorForm && !editorForm.reportValidity()) return;
    pending = true; error = '';
    const snapshot = JSON.stringify(request);
    try {
      if (profileMode) {
        if (!binding) throw new Error('Load a confirmed business revision first.');
        const response = await get<{ company: CompanyBinding; result: SimulationResult }>('/api/v2/intake/simulate', {
          method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ simulation_version: 'profile-simulation-2-draft', company: binding, request: JSON.parse(snapshot) }),
        });
        if (JSON.stringify(response.company) !== JSON.stringify(binding) || response.result.company_id !== request.company_id) throw new Error('The result does not match this business revision.');
        result = response.result;
      } else result = await get<SimulationResult>('/api/v1/simulate/deterministic', {
          method: 'POST', headers: { 'content-type': 'application/json' }, body: snapshot,
        });
      resultInput = snapshot;
    } catch (cause) { error = cause instanceof Error ? cause.message : 'Simulation failed. Please retry.'; }
    finally { pending = false; }
  }
  async function initialize() {
    pending = true; error = '';
    try {
      if (profileMode) {
        const id = page.url.searchParams.get('profile'), revision = page.url.searchParams.get('revision');
        const [record, model, profiles] = await Promise.all([
          get<{ status: string; compiled: { company: CompanyInput; binding: CompanyBinding } | null }>(`/api/v2/intake/profiles/${encodeURIComponent(id ?? '')}?revision=${encodeURIComponent(revision ?? '')}`),
          get<ModelMetadata>('/api/v1/model/metadata'), get<{ profile_id: string; revision: number }[]>('/api/v2/intake/profiles'),
        ]);
        if (record.status !== 'confirmed' || !record.compiled) throw new Error('Confirm this business’s starting picture before comparing investments.');
        company = record.compiled.company; binding = record.compiled.binding; metadata = model;
        latestRevision = profiles.find(p => p.profile_id === id)?.revision ?? binding.revision;
        request.company_id = company.id; request.reserve_floor_usd = company.global_assumptions.liquidity_floor; request.exit_multiple = company.global_assumptions.valuation_multiple;
      } else [company, metadata] = await Promise.all([get<CompanyInput>(growthExample ? '/api/v1/company/growth' : '/api/v1/company/demo'), get<ModelMetadata>('/api/v1/model/metadata')]);
      await run();
    } catch (cause) { error = cause instanceof Error ? cause.message : 'Could not load company.'; pending = false; }
  }
  onMount(() => { void initialize(); });
</script>

<svelte:head><title>Sapling · Investment workspace</title><meta name="description" content="Explore the operational and financial effects of business decisions with Sapling." /></svelte:head>

<div class="workspace">
  <Sidebar />
  <main>
    <header class="workspace-header"><div class="wordmark"><img class="sapling-wordmark" src="/brand/sapling-logo.png" alt="Sapling" /><span class="divider">/</span><span class="workspace-name">Investment workspace</span></div><a href={profileMode && binding ? `/intake?profile=${binding.profile_id}&revision=${binding.revision}` : '/intake'} class="synthetic" title="View this company in Businesses"><span aria-hidden="true">● </span>{company?.name ?? 'Loading company…'}</a></header>
    {#if profileMode && binding && latestRevision !== binding.revision}<p class="editor-note">Viewing confirmed revision {binding.revision}. A newer revision {latestRevision} exists. <a href="/intake">Review the latest draft</a>.</p>{/if}
    <section class="intro"><div><p class="eyebrow">OPERATING DECISIONS, OVER TIME</p><h1>Plant the next move.</h1><p class="subtitle">See what your investments change—and when they matter.</p></div><div class="company-tag"><span class="company-icon">⌁</span><div><strong>{company?.name ?? 'Loading company…'}</strong><small>HVAC services · USD · Five-year forecast</small></div></div></section>
    {#if growthExample}<p class="editor-note">Synthetic growth example: 600 requested jobs per month, but four trucks can serve only 240. Compare adding trucks and technicians with spending on marketing before increasing capacity. Both plans are editable.</p>{/if}
    <div class="notice"><span>↗</span><p>Plan comparison <span>Five-year forecasts based on your inputs and assumptions.</span></p><span class="status">{pending ? 'Computing…' : stale ? 'Results need updating' : result ? 'Results current' : 'Ready to load'}</span></div>
    {#if error}<div class="error" role="alert"><strong>We couldn’t complete that request.</strong><p>{error}</p><button onclick={() => company ? run() : initialize()} disabled={pending}>Retry</button></div>{/if}
    <div class="main-grid">
      <section id="plans" class="panel editor" aria-labelledby="editor-title">
        <div class="panel-head"><div><p class="eyebrow">01 / CONFIGURE</p><h2 id="editor-title">Build your plan</h2></div><span class="small-tag">{request.scenarios.length - 1} plans</span></div>
        <form bind:this={editorForm} onsubmit={event => { event.preventDefault(); void run(); }}>
          <label class="full-label">Selected plan<select bind:value={scenarioId} disabled={pending}>{#each request.scenarios.filter(s => s.id !== 'baseline') as s}<option value={s.id}>{s.name}</option>{/each}</select></label>
          <div class="plan-buttons"><button type="button" onclick={() => createPlan()} disabled={pending}>+ New plan</button><button type="button" onclick={() => createPlan(true)} disabled={pending}>Copy plan</button><button type="button" onclick={removePlan} disabled={pending || request.scenarios.length <= 3}>Remove plan</button></div>
          <label class="full-label">Plan name<input class="plan-name" bind:value={scenario.name} required disabled={pending} /></label>
          <p class="editor-note">Add actions to compare this plan with doing nothing new. Edits affect this plan only. Plans reset when you reload the page.</p>
          {#if !scenario.decisions.length}<p class="empty-plan">No actions yet. Add an investment below.</p>{/if}
          {#each scenario.decisions as decision (decision.id)}
            <details class="decision"><summary><span class="decision-icon">{decision.type === 'purchase_trucks' ? '↗' : decision.type === 'hire_technicians' ? '+' : '◎'}</span><strong>{decision.name ?? (decision.type === 'purchase_trucks' ? 'Purchase trucks' : decision.type === 'hire_technicians' ? 'Hire technicians' : decision.type === 'increase_marketing' ? 'Increase marketing' : decision.name)}</strong><span>M{decision.start_month}</span></summary>
              <label class="full-label">Action label<input class="item-name" type="text" value={decision.name ?? (decision.type === 'purchase_trucks' ? 'Purchase trucks' : decision.type === 'hire_technicians' ? 'Hire technicians' : 'Increase marketing')} maxlength="100" required disabled={pending} oninput={event => { request = editPlanAction($state.snapshot(request), scenarioId, decision.id, 'name', event.currentTarget.value, crypto.randomUUID()); }} /></label>{#if decision.type === 'operating_expense' || decision.type === 'purchase_asset'}<p class="editor-note">{decision.type === 'operating_expense' ? 'New plan cost, paid as overhead in each charged month. One month means a one-time expense. No automatic sales benefit.' : 'New plan asset, purchased once. Depreciation and running costs begin in service. Loan payments begin the month after purchase. No automatic capacity or sales benefit.'} These costs are additional to your existing business expenses.</p>{/if}
              <div class="field-grid">{#each decisionFields(decision) as field}<label>{field.label}<input type="number" value={fieldValue(decision, field.path)} min={field.min} max={field.max} step={field.step ?? 1} required disabled={pending} oninput={event => { request = editPlanAction($state.snapshot(request), scenarioId, decision.id, field.path, event.currentTarget.valueAsNumber, crypto.randomUUID()); }} /></label>{/each}</div><button class="text-button" type="button" disabled={pending} onclick={() => { scenario.decisions = scenario.decisions.filter(d => d.id !== decision.id); }}>Remove action</button>
            </details>
          {/each}
          <div class="add-action"><label class="full-label">Add an investment<select bind:value={actionType} disabled={pending}><option value="increase_marketing">Marketing campaign</option><option value="purchase_trucks">Truck purchase</option><option value="hire_technicians">Hire technicians</option>{#if metadata?.decision_extensions?.status === 'candidate'}<option value="operating_expense">Operating expense</option><option value="purchase_asset">Equipment purchase</option>{/if}</select></label><button type="button" disabled={pending} onclick={() => { request = addAction($state.snapshot(request), scenarioId, actionType, crypto.randomUUID()); }}>+ Add action</button></div>
          <p class="editor-note">Actions start with example values. Check each action’s cost, timing and expected effect before running your comparison.</p>
          <details class="decision"><summary><strong>Forecast settings</strong></summary><div class="field-grid"><label>Cash reserve · USD<input type="number" min="0" step="1000" required bind:value={request.reserve_floor_usd} disabled={pending} /></label><label>Exit EBITDA multiple<input type="number" min="0.01" step="0.01" required bind:value={request.exit_multiple} disabled={pending} /></label></div></details>
          <button class="primary" type="submit" disabled={pending || !company}>{pending ? 'Running simulation…' : 'Run comparison'}<span>↗</span></button>
          <p class="editor-note">{stale ? 'Inputs changed. Charts and cards still show the previous run.' : 'Results reflect the costs, timing and assumptions entered above.'}</p>
        </form>
      </section>
      <div class="results" aria-busy={pending}>
        <section class="panel timeline" id="timeline" aria-labelledby="timeline-title"><div class="panel-head"><div><p class="eyebrow">02 / EXPLORE</p><h2 id="timeline-title">The investment timeline</h2></div><span class="small-tag">Forecast{stale ? ' · previous run' : ''}</span></div>
          <div class="metric-tabs" aria-label="Timeline metric">{#each metrics as item}<button class:active={metric === item.key} aria-pressed={metric === item.key} onclick={() => metric = item.key}>{item.label}</button>{/each}</div>
          <div class="chart-mode" aria-label="Chart view"><button class:active={!changes} aria-pressed={!changes} onclick={() => changes = false}>Total values</button><button class:active={changes} aria-pressed={changes} onclick={() => changes = true}>Change from baseline</button></div>
          <div class="chart-caption"><strong>{metricInfo.label}{changes ? ' · change from baseline' : ''}</strong><span>{metricInfo.unit} · starting balance + months 1–60</span></div>
          {#if result}<Timeline {paths} {metric} {month} {result} {changes} reserve={result.assumptions.cash_reserve_floor} onselect={value => month = value} />{:else}<div class="empty">{pending ? 'Building your 60-month comparison…' : 'Run a comparison to explore the timeline.'}</div>{/if}
        </section>
        {#if result}<PlanExplanation {result} {scenarioId} {month} {stale} />{/if}
      </div>
    </div>
    <div class="results result-details" aria-busy={pending}>
        {#if result}<details class="panel"><summary class="inspector-summary">Five-year summary</summary><ResultsExplanation {result} {scenarioId} {stale} /></details>{/if}
        <section id="outcomes" class="cards" aria-label="Scenario outcomes">{#each paths as path, i}<article class="panel outcome" style:--scenario-color={['#72828e','#208c7c','#d17742','#7b65ad','#3175b0','#b44d6b'][i % 6]}><p class="scenario-name">{path.metadata.name}</p><p class="card-label">Estimated owner value · year 5</p><h3>{formatValue(path.metrics.exit_equity_value)}</h3><p class="delta">{path.metadata.scenario_id === 'baseline' ? 'Reference scenario' : `${formatValue(result?.comparisons[path.metadata.scenario_id].incremental_exit_equity_value)} vs baseline`}</p><dl><div><dt>Minimum cash</dt><dd>{formatValue(path.metrics.minimum_cash)}</dd></div><div><dt>Lowest cash month</dt><dd>Month {path.metrics.cash_trough_month}</dd></div><div><dt>Project payback</dt><dd>{paybackLabel(path.metrics.payback)}</dd></div></dl></article>{/each}</section>
        <section class="panel inspector"><details><summary class="inspector-summary">Monthly financials</summary><div class="panel-head"><div><p class="eyebrow">03 / UNDERSTAND</p><h2>{month === 0 ? 'Opening state' : `Inside month ${month}`}</h2></div><span class="small-tag">{selectedPath?.metadata.name ?? 'Selected scenario'}</span></div>
          <p class="muted">Inspecting the scenario selected in the decision editor.{stale ? ' Values are from the previous run.' : ''}</p>
          <div class="table-wrap"><table><caption class="sr-only">Selected month values and backend differences from baseline</caption><thead><tr><th scope="col">Metric</th>{#each paths as path}<th scope="col">{path.metadata.name}</th>{/each}<th scope="col">Selected plan’s change</th></tr></thead><tbody>{#each metrics as item}<tr><th scope="row">{item.label}</th>{#each paths as path}<td>{formatValue(metricValue(path.months[month], item.key), item.key === 'utilization')}</td>{/each}<td>{item.key === 'utilization' ? formatValue(comparison?.monthly_deltas[month].values[item.key], true).replace('%', ' pp') : formatValue(comparison?.monthly_deltas[month].values[item.key])}</td></tr>{/each}</tbody></table></div>
          {#if selectedRow && !selectedRow.is_opening_state}<div class="operation-strip"><span><strong>{selectedRow.operations.completed_jobs.toFixed(1)}</strong> completed jobs</span><span><strong>{selectedRow.operations.service_capacity_jobs.toFixed(1)}</strong> service capacity</span><span><strong>{selectedRow.operations.productive_technician_fte.toFixed(2)}</strong> full-time-equivalent productive technicians</span><span><strong>{selectedRow.operations.in_service_vehicles}</strong> active trucks</span></div>{/if}
          {#if selectedRow}
            <details class="statement"><summary>Full month breakdown · {selectedPath?.metadata.name}</summary>
              <div class="table-wrap"><table><caption class="sr-only">Engine financial statement for selected month</caption><thead><tr><th scope="col">Financial item · USD</th><th scope="col">Amount</th></tr></thead><tbody>{#each Object.entries(selectedRow.financials) as [key, value]}{#if typeof value === 'number'}<tr><th scope="row">{financialLabel(key)}</th><td>{formatValue(value)}</td></tr>{/if}{/each}</tbody></table></div>
              {#if !selectedRow.is_opening_state}<h3 class="subheading">Debt movements</h3><div class="table-wrap"><table><thead><tr><th scope="col">Loan</th><th scope="col">Opening</th><th scope="col">Borrowing</th><th scope="col">Interest</th><th scope="col">Principal paid</th><th scope="col">Ending</th></tr></thead><tbody>{#each selectedRow.financials.debt_movements as debt}<tr><th scope="row">{debt.tranche_id}</th><td>{formatValue(debt.principal_begin)}</td><td>{formatValue(debt.borrowing)}</td><td>{formatValue(debt.cash_interest)}</td><td>{formatValue(debt.principal_repayment)}</td><td>{formatValue(debt.principal_end)}</td></tr>{/each}</tbody></table></div><p class="muted">TTM EBITDA {formatValue(selectedRow.valuation.ttm_ebitda)} · Enterprise value {formatValue(selectedRow.valuation.enterprise_value)} · Valuation {selectedRow.valuation.status.replaceAll('_', ' ')}</p>{/if}
              {#if comparison}<p class="muted">Cumulative extra project cash flow before financing: {formatValue(comparison.monthly_deltas[month].cumulative_incremental_unlevered_fcf)}</p>{/if}
            </details>
          {/if}
          <h3 class="subheading">Events this month</h3>{#if selectedRow?.events.length}<ul class="events">{#each selectedRow.events as event}<li><span class="event-dot"></span><strong>{event.label}</strong><span>{event.type.replaceAll('_', ' ')}</span></li>{/each}</ul>{:else}<p class="muted">{month === 0 ? 'Opening balances only; no operating flows or valuation.' : 'No scheduled or calculated events in this month.'}</p>{/if}
        </details></section>
        {#if result?.warnings.length}<section class="panel warnings"><h2>Things to watch</h2><ul>{#each [...new Set(result.warnings.map(warning => warning.message))] as message}<li>{message}<small> · Applies to: {Array.from(new Set(result.warnings.filter(w => w.message === message && w.scenario_id).map(w => result!.scenarios[w.scenario_id!]?.metadata.name).filter(Boolean))).join(", ")}</small></li>{/each}</ul></section>{/if}
      </div>
    <div id="risk">{#if profileMode || growthExample}<section class="panel"><h2>Risk analysis is not available for this business yet</h2><p>This comparison uses one set of assumptions. It does not estimate the likelihood of different outcomes.</p></section>{:else}<RiskPanel {request} enabled={metadata?.readiness.monte_carlo ?? false} {month} {scenarioId} {metric} />{/if}</div>
    <section class="panel assumptions" id="assumptions"><details><summary><div><p class="eyebrow">CONTEXT MATTERS</p><h2>Assumptions</h2></div><span>View details</span></summary><p>{profileMode ? 'This run uses the selected confirmed business revision, including its reviewed estimates. Results are modeled outcomes.' : metadata?.data_notice}</p><ul>{#each metadata?.limitations ?? [] as limitation}<li>{limitation}</li>{/each}</ul><p>Month 0 shows starting balances. An unavailable value is not zero. Payback compares the plan’s extra cash flow with doing nothing new, before financing; a later cash shortfall can reverse that recovery.</p><details><summary>Technical records</summary><pre>{JSON.stringify({ assumptions: result?.assumptions ?? company?.global_assumptions, provenance: company?.provenance }, null, 2)}</pre><p class="muted">Schema {metadata?.schema_version ?? '—'} · Model {metadata?.model_version ?? '—'} · Revision {metadata?.contract_revision ?? '—'} · Run {result?.run_id ?? 'not run'}</p><p class="fingerprint">Input fingerprint: {result?.input_fingerprint ?? 'not run'}</p></details></details></section>
    <footer><span>Sapling / A clearer view of what comes next.</span><span>{profileMode ? 'Confirmed facts and reviewed estimates. Modeled outcomes.' : 'Synthetic inputs. Modeled outcomes.'}</span></footer>
    <div class="sr-only" aria-live="polite">{pending ? 'Simulation running' : error ? 'Request failed' : stale ? 'Inputs changed; results are stale' : result ? 'Simulation complete' : ''}</div>
  </main>
</div>
