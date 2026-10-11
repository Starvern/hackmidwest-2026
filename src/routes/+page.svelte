<script lang="ts">
  import { onMount } from 'svelte';
  import { requestJson as get } from '../lib/dashboard/api.ts';
  import type { CompanyInput, DeterministicRequest, MetricKey, ModelMetadata, SimulationResult } from '../../contracts/contracts.ts';
  import example from '../../contracts/example-request.json';
  import RiskPanel from '../lib/dashboard/RiskPanel.svelte';
  import ResultsExplanation from '../lib/dashboard/ResultsExplanation.svelte';
  import Timeline from '../lib/dashboard/Timeline.svelte';
  import { metrics, metricValue, formatValue, paybackLabel, decisionFields, fieldValue, editDecision } from '../lib/dashboard/model.ts';
  let request = $state<DeterministicRequest>(structuredClone(example) as unknown as DeterministicRequest);
  let company = $state<CompanyInput | null>(null);
  let metadata = $state<ModelMetadata | null>(null);
  let result = $state<SimulationResult | null>(null);
  let resultInput = $state('');
  let pending = $state(false);
  let error = $state('');
  let metric = $state<MetricKey>('cash_end');
  let month = $state(1);
  let scenarioId = $state('combined_expansion');
  let editorForm: HTMLFormElement;
  let stale = $derived(result !== null && resultInput !== JSON.stringify(request));
  let paths = $derived(result ? Object.values(result.scenarios) : []);
  let scenario = $derived(request.scenarios.find(s => s.id === scenarioId)!);
  let selectedPath = $derived(result?.scenarios[scenarioId]);
  let selectedRow = $derived(selectedPath?.months[month]);
  let comparison = $derived(result?.comparisons[scenarioId]);
  let metricInfo = $derived(metrics.find(item => item.key === metric)!);
  async function run() {
    if (editorForm && !editorForm.reportValidity()) return;
    pending = true; error = '';
    const snapshot = JSON.stringify(request);
    try {
      result = await get<SimulationResult>('/api/v1/simulate/deterministic', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: snapshot,
      });
      resultInput = snapshot;
    } catch (cause) { error = cause instanceof Error ? cause.message : 'Simulation failed. Please retry.'; }
    finally { pending = false; }
  }
  async function initialize() {
    pending = true; error = '';
    try {
      [company, metadata] = await Promise.all([get<CompanyInput>('/api/v1/company/demo'), get<ModelMetadata>('/api/v1/model/metadata')]);
      await run();
    } catch (cause) { error = cause instanceof Error ? cause.message : 'Could not load company.'; pending = false; }
  }
  onMount(() => { void initialize(); });
</script>

<svelte:head><title>Sapling · Investment workspace</title><meta name="description" content="Explore the operational and financial effects of business decisions with Sapling." /></svelte:head>

<div class="workspace">
  <aside class="rail" aria-label="Workspace navigation">
    <a class="brand" href="/" aria-label="Sapling home"><img src="/brand/sapling-symbol.png" alt="" /></a>
    <span class="rail-label">SAPLING</span><a class="rail-active" href="#timeline" aria-label="Scenario timeline">▥</a>
    <a href="#assumptions" aria-label="Assumptions and model details">≡</a>
    <span class="rail-bottom">01</span>
  </aside>
  <main>
    <header><div class="wordmark"><img class="sapling-wordmark" src="/brand/sapling-logo.png" alt="Sapling" /><span class="divider">/</span><span class="workspace-name">Investment workspace</span></div><span class="synthetic">● Synthetic company</span></header>
    <section class="intro"><div><p class="eyebrow">OPERATING DECISIONS, OVER TIME</p><h1>Plan the next move.</h1><p class="subtitle">See what your investments change—and when they matter.</p></div><div class="company-tag"><span class="company-icon">⌁</span><div><strong>{company?.name ?? 'Loading company…'}</strong><small>HVAC services · USD · 60-month horizon</small></div></div></section>
    <div class="notice"><span>↗</span><p>Deterministic workspace <span>One set of disclosed assumptions. Risk simulations are shown separately below.</span></p><span class="status">{pending ? 'Computing…' : stale ? 'Results need updating' : result ? 'Results current' : 'Ready to load'}</span></div>
    {#if error}<div class="error" role="alert"><strong>We couldn’t complete that request.</strong><p>{error}</p><button onclick={() => company ? run() : initialize()} disabled={pending}>Retry</button></div>{/if}
    <div class="main-grid">
      <section class="panel editor" aria-labelledby="editor-title">
        <div class="panel-head"><div><p class="eyebrow">01 / CONFIGURE</p><h2 id="editor-title">Your decisions</h2></div><span class="small-tag">3 scenarios</span></div>
        <form bind:this={editorForm} onsubmit={event => { event.preventDefault(); void run(); }}>
          <label class="full-label">Editing scenario<select bind:value={scenarioId} disabled={pending}>{#each request.scenarios.filter(s => s.id !== 'baseline') as s}<option value={s.id}>{s.name}</option>{/each}</select></label>
          <p class="editor-note">The truck decision is shared across both alternatives. Editing it updates both.</p>
          {#each scenario.decisions as decision (decision.id)}
            <details class="decision" open><summary><span class="decision-icon">{decision.type === 'purchase_trucks' ? '↗' : decision.type === 'hire_technicians' ? '+' : '◎'}</span><strong>{decision.type === 'purchase_trucks' ? 'Purchase trucks' : decision.type === 'hire_technicians' ? 'Hire technicians' : 'Increase marketing'}</strong><span>M{decision.start_month}</span></summary>
              <div class="field-grid">{#each decisionFields(decision) as field}<label>{field.label}<input type="number" value={fieldValue(decision, field.path)} min={field.min} max={field.max} step={field.step ?? 1} required disabled={pending} oninput={event => { request = editDecision($state.snapshot(request), decision.stable_investment_key, field.path, event.currentTarget.valueAsNumber); }} /></label>{/each}</div>
            </details>
          {/each}
          <details class="decision"><summary><strong>Model controls</strong></summary><div class="field-grid"><label>Cash reserve · USD<input type="number" min="0" step="1000" required bind:value={request.reserve_floor_usd} disabled={pending} /></label><label>Exit EBITDA multiple<input type="number" min="0.01" step="0.01" required bind:value={request.exit_multiple} disabled={pending} /></label></div></details>
          <button class="primary" type="submit" disabled={pending || !company}>{pending ? 'Running simulation…' : 'Run comparison'}<span>↗</span></button>
          <p class="editor-note">{stale ? 'Inputs changed. Charts and cards still show the previous run.' : 'All financial results are calculated by the simulation engine.'}</p>
        </form>
      </section>
      <div class="results" aria-busy={pending}>
        <section class="panel timeline" id="timeline" aria-labelledby="timeline-title"><div class="panel-head"><div><p class="eyebrow">02 / EXPLORE</p><h2 id="timeline-title">The investment timeline</h2></div><span class="small-tag">Deterministic{stale ? ' · previous run' : ''}</span></div>
          <div class="metric-tabs" aria-label="Timeline metric">{#each metrics as item}<button class:active={metric === item.key} aria-pressed={metric === item.key} onclick={() => metric = item.key}>{item.label}</button>{/each}</div>
          <div class="chart-caption"><strong>{metricInfo.label}</strong><span>{metricInfo.unit} · opening state + months 1–60</span></div>
          {#if result}<Timeline {paths} {metric} {month} reserve={result.assumptions.cash_reserve_floor} onselect={value => month = value} />{:else}<div class="empty">{pending ? 'Building your 60-month comparison…' : 'Run a comparison to explore the timeline.'}</div>{/if}
        </section>
        <section class="cards" aria-label="Scenario outcomes">{#each paths as path, i}<article class="panel outcome" style:--scenario-color={['#72828e','#208c7c','#d17742'][i % 3]}><p class="scenario-name">{path.metadata.name}</p><p class="card-label">Modeled exit equity · month 60</p><h3>{formatValue(path.metrics.exit_equity_value)}</h3><p class="delta">{path.metadata.scenario_id === 'baseline' ? 'Reference scenario' : `${formatValue(result?.comparisons[path.metadata.scenario_id].incremental_exit_equity_value)} vs baseline`}</p><dl><div><dt>Minimum cash</dt><dd>{formatValue(path.metrics.minimum_cash)}</dd></div><div><dt>Cash trough</dt><dd>Month {path.metrics.cash_trough_month}</dd></div><div><dt>Project payback</dt><dd>{paybackLabel(path.metrics.payback)}</dd></div></dl></article>{/each}</section>
        <section class="panel inspector"><div class="panel-head"><div><p class="eyebrow">03 / UNDERSTAND</p><h2>{month === 0 ? 'Opening state' : `Inside month ${month}`}</h2></div><span class="small-tag">{selectedPath?.metadata.name ?? 'Selected scenario'}</span></div>
          <p class="muted">Inspecting the scenario selected in the decision editor.{stale ? ' Values are from the previous run.' : ''}</p>
          <div class="table-wrap"><table><caption class="sr-only">Selected month values and backend differences from baseline</caption><thead><tr><th scope="col">Metric</th>{#each paths as path}<th scope="col">{path.metadata.name}</th>{/each}<th scope="col">Selected Δ vs baseline</th></tr></thead><tbody>{#each metrics as item}<tr><th scope="row">{item.label}</th>{#each paths as path}<td>{formatValue(metricValue(path.months[month], item.key), item.key === 'utilization')}</td>{/each}<td>{item.key === 'utilization' ? formatValue(comparison?.monthly_deltas[month].values[item.key], true).replace('%', ' pp') : formatValue(comparison?.monthly_deltas[month].values[item.key])}</td></tr>{/each}</tbody></table></div>
          {#if selectedRow && !selectedRow.is_opening_state}<div class="operation-strip"><span><strong>{selectedRow.operations.completed_jobs.toFixed(1)}</strong> completed jobs</span><span><strong>{selectedRow.operations.service_capacity_jobs.toFixed(1)}</strong> service capacity</span><span><strong>{selectedRow.operations.productive_technician_fte.toFixed(2)}</strong> productive technician FTE</span><span><strong>{selectedRow.operations.in_service_vehicles}</strong> active trucks</span></div>{/if}
          {#if selectedRow}
            <details class="statement"><summary>Full month breakdown · {selectedPath?.metadata.name}</summary>
              <div class="table-wrap"><table><caption class="sr-only">Engine financial statement for selected month</caption><thead><tr><th scope="col">Financial field · USD</th><th scope="col">Engine value</th></tr></thead><tbody>{#each Object.entries(selectedRow.financials) as [key, value]}{#if typeof value === 'number'}<tr><th scope="row">{key.replaceAll('_', ' ')}</th><td>{formatValue(value)}</td></tr>{/if}{/each}</tbody></table></div>
              {#if !selectedRow.is_opening_state}<h3 class="subheading">Debt movements</h3><div class="table-wrap"><table><thead><tr><th scope="col">Tranche</th><th scope="col">Opening</th><th scope="col">Borrowing</th><th scope="col">Interest</th><th scope="col">Principal paid</th><th scope="col">Ending</th></tr></thead><tbody>{#each selectedRow.financials.debt_movements as debt}<tr><th scope="row">{debt.tranche_id}</th><td>{formatValue(debt.principal_begin)}</td><td>{formatValue(debt.borrowing)}</td><td>{formatValue(debt.cash_interest)}</td><td>{formatValue(debt.principal_repayment)}</td><td>{formatValue(debt.principal_end)}</td></tr>{/each}</tbody></table></div><p class="muted">TTM EBITDA {formatValue(selectedRow.valuation.ttm_ebitda)} · Enterprise value {formatValue(selectedRow.valuation.enterprise_value)} · Valuation {selectedRow.valuation.status.replaceAll('_', ' ')}</p>{/if}
              {#if comparison}<p class="muted">Cumulative incremental unlevered FCF: {formatValue(comparison.monthly_deltas[month].cumulative_incremental_unlevered_fcf)}</p>{/if}
            </details>
          {/if}
          <h3 class="subheading">Events this month</h3>{#if selectedRow?.events.length}<ul class="events">{#each selectedRow.events as event}<li><span class="event-dot"></span><strong>{event.label}</strong><span>{event.type.replaceAll('_', ' ')} · {event.provenance}</span></li>{/each}</ul>{:else}<p class="muted">{month === 0 ? 'Opening balances only; no operating flows or valuation.' : 'No scheduled or calculated events in this month.'}</p>{/if}
        </section>
        {#if result?.warnings.length}<section class="panel warnings"><h2>Model warnings</h2><ul>{#each result.warnings as warning}<li>{warning.message}</li>{/each}</ul></section>{/if}
      </div>
    </div>
    {#if result}<ResultsExplanation {result} {scenarioId} {stale} />{/if}
    <RiskPanel {request} enabled={metadata?.readiness.monte_carlo ?? false} {month} {scenarioId} {metric} />
    <section class="panel assumptions" id="assumptions"><details><summary><div><p class="eyebrow">CONTEXT MATTERS</p><h2>Assumptions & model notes</h2></div><span>View details +</span></summary><p>{metadata?.data_notice}</p><ul>{#each metadata?.limitations ?? [] as limitation}<li>{limitation}</li>{/each}</ul><p>Month 0 contains opening balances only. Null valuation means unavailable. Project payback uses paired incremental unlevered cash flow and may reverse. Utilization differences are percentage-point differences.</p><details><summary>Resolved run assumptions and company input provenance</summary><pre>{JSON.stringify({ assumptions: result?.assumptions ?? company?.global_assumptions, provenance: company?.provenance }, null, 2)}</pre></details><p class="muted">Schema {metadata?.schema_version ?? '—'} · Model {metadata?.model_version ?? '—'} · Revision {metadata?.contract_revision ?? '—'} · Run {result?.run_id ?? 'not run'}</p><p class="fingerprint">Input fingerprint: {result?.input_fingerprint ?? 'not run'}</p></details></section>
    <footer><span>Sapling / A clearer view of what comes next.</span><span>Synthetic inputs. Modeled outcomes.</span></footer>
    <div class="sr-only" aria-live="polite">{pending ? 'Simulation running' : error ? 'Request failed' : stale ? 'Inputs changed; results are stale' : result ? 'Simulation complete' : ''}</div>
  </main>
</div>
