<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { DeterministicRequest, MetricKey } from '../../../contracts/contracts.ts';
  import { createRiskController, emptyRiskState, riskRequest, probabilityLabel, eligibilityLabel, pairedExit } from './monte-carlo.ts';
  import { riskComparison } from './plans.ts';
  import { formatValue, metrics } from './model.ts';
  let { request, enabled, month, scenarioId, metric }: { request: DeterministicRequest; enabled: boolean; month: number; scenarioId: string; metric: MetricKey } = $props();
  const riskMetrics: { key: MetricKey; label: string }[] = [...metrics, { key: 'ttm_ebitda', label: 'Trailing 12-month EBITDA' }, { key: 'enterprise_value', label: 'Enterprise value' }, { key: 'unlevered_fcf', label: 'Monthly unlevered FCF' }];
  let seed = $state(42);
  let runs = $state<100 | 2000>(100);
  let otherId = $state('trucks_only');
  let otherPlans = $derived(request.scenarios.filter(s => s.id !== 'baseline' && s.id !== scenarioId));
  let selectedOther = $derived(otherPlans.find(s => s.id === otherId)?.id ?? otherPlans[0]?.id ?? '');
  let comparedRequest = $derived(riskComparison(request, scenarioId, selectedOther));
  let risk = $state(emptyRiskState());
  const controller = createRiskController(value => risk = value);
  onDestroy(() => controller.dispose());
  let desired = $derived(JSON.stringify({ ...comparedRequest, monte_carlo: { enabled: true, runs, seed } }));
  let stale = $derived(risk.result !== null && risk.resultInput !== desired);
  let submitted = $derived(risk.resultInput ? JSON.parse(risk.resultInput) as ReturnType<typeof riskRequest> : null);
  let selected = $derived(risk.result?.scenarios[scenarioId]);
  let rows = $derived(selected?.monthly_percentiles[metric] ?? []);
  let values = $derived(rows.flatMap(row => [row.p10, row.p50, row.p90].filter((v): v is number => v !== null)));
  let low = $derived(Math.min(0, ...values));
  let high = $derived(Math.max(1, ...values));
  const x = (m: number) => 45 + m / 60 * 690;
  const y = (value: number) => 200 - (value - low) / (high - low || 1) * 175;
  function line(key: 'p10' | 'p50' | 'p90') {
    let pen = false;
    return rows.map((row, m) => {
      const value = row[key]; if (value === null) { pen = false; return ''; }
      const command = `${pen ? 'L' : 'M'}${x(m)},${y(value)}`; pen = true; return command;
    }).join(' ');
  }
  async function run() {
    try { await controller.start(riskRequest($state.snapshot(comparedRequest), seed, runs)); }
    catch (error) { risk = { ...risk, error: error instanceof Error ? error.message : 'Invalid risk request.' }; }
  }
</script>

<section class="panel risk-panel" aria-labelledby="risk-title" aria-busy={risk.busy}>
  <div class="panel-head"><div><p class="eyebrow">04 / EXPLORE UNCERTAINTY</p><h2 id="risk-title">Explore uncertainty</h2></div><span class="small-tag">{runs === 100 ? '100-path quick preview' : '2,000-path full run'}</span></div>
  <div class="risk-options">
    <label>Simulation size<select bind:value={runs} disabled={risk.busy || (risk.job !== null && ['queued','running'].includes(risk.job.state))}><option value={100}>Quick preview · 100 paths</option><option value={2000}>Full run · 2,000 paths</option></select></label>
    <div class="selected-plan"><span>Selected plan</span><strong>{request.scenarios.find(s => s.id === scenarioId)?.name ?? 'Select a plan'}</strong><a href="#plans">Edit plan</a></div>
  </div>
  {#if runs === 100}<p class="availability">Quick preview uses fewer paths. Percentiles and estimated probabilities are rough and may change substantially in a full run.</p>{/if}
  <p class="muted">Explore how this plan responds when demand, costs and timing vary together. These are results under synthetic assumptions, not measured odds for a real business.</p>
  {#if !enabled}<p class="availability">New risk simulations are unavailable in this session.</p>{/if}
  <div class="risk-controls"><label>Compare selected plan with<select value={selectedOther} onchange={event => otherId = event.currentTarget.value} disabled={risk.busy}>{#each otherPlans as plan}<option value={plan.id}>{plan.name}</option>{/each}</select></label><button class="primary" onclick={run} disabled={!enabled || risk.busy || (risk.job !== null && ['queued','running'].includes(risk.job.state))}>Run risk simulation</button>
    <button onclick={() => controller.recorded()} disabled={!enabled || risk.busy || (risk.job !== null && ['queued','running'].includes(risk.job.state))}>View example risk results</button>
    {#if risk.job && ['queued','running'].includes(risk.job.state)}<button onclick={() => controller.cancel()}>Cancel run</button>{/if}
    {#if risk.error && risk.job}<button onclick={() => controller.resume()} disabled={risk.busy}>Check progress</button>{/if}
  </div>
  <details class="simulation-settings"><summary>Simulation settings</summary><label>Random seed<input aria-label="Monte Carlo random seed" type="number" min="0" max="4294967295" step="1" bind:value={seed} disabled={risk.busy} /></label><p class="muted">The same seed makes runs reproducible. Each run compares doing nothing, your selected plan and one other plan.</p></details>
  <p class="muted">The 100-path preview does one twentieth of the path calculations. A full 2,000-path simulation previously took about 24 minutes; timing varies by computer. Changing inputs does not launch another run.</p>
  {#if risk.job}<div class="job-status" aria-live="polite"><strong>{risk.job.state === 'queued' ? 'Waiting for a worker' : risk.job.state === 'running' ? 'Calculating outcomes' : risk.job.state === 'succeeded' ? 'Risk simulation complete' : risk.job.state === 'cancelled' ? 'Run cancelled' : 'Run failed'}</strong><span>{risk.job.completed_runs.toLocaleString()} / {risk.job.total_runs.toLocaleString()} completed runs</span><progress max={risk.job.total_runs} value={risk.job.completed_runs} aria-label="Completed aggregated Monte Carlo runs"></progress></div>{/if}
  {#if risk.error}<div class="error" role="alert"><p>{risk.error}</p>{#if !risk.job}<button onclick={run} disabled={risk.busy || !enabled}>Retry submission</button>{/if}</div>{/if}
  {#if risk.result}
    {#if risk.result.runs === 100}<p class="availability"><strong>100-path preview result</strong> — exploratory estimates with limited sampling. Run 2,000 paths for a more stable comparison.</p>{/if}
    <p><strong>{risk.source === 'recorded' ? 'Example results · original plans and assumptions · seed 42' : 'New simulation results'}</strong></p>
    <p class:stale class="result-notice">{stale ? 'Previous risk result — the plans, simulation size or seed changed. Run again to update.' : 'Risk result matches the selected comparison and seed.'}{risk.busy ? ' Previous successful result stays visible while the new job runs.' : ''}</p>
    {#if selected}
      <h3>{submitted?.scenarios.find(s => s.id === scenarioId)?.name ?? scenarioId}</h3>
      <div class="risk-summary">
        <article><h4>Could cash fall below the reserve?</h4><strong>{probabilityLabel(selected.path_risks.probability_cash_below_reserve_any_month)}</strong><p>of eligible modeled outcomes fall below {formatValue(submitted?.reserve_floor_usd)} at least once in the next five years.</p><small>{eligibilityLabel(selected.path_risks.probability_cash_below_reserve_any_month)}</small></article>
        <article><h4>Could it finish worse than doing nothing?</h4><strong>{probabilityLabel(selected.path_risks.probability_negative_exit_equity_delta)}</strong><p>of eligible outcomes have a lower modeled owner value at year five than their matching baseline.</p><small>{eligibilityLabel(selected.path_risks.probability_negative_exit_equity_delta)}</small></article>
        <article><h4>Could the investment earn its money back?</h4>
          {#if selected.payback.probability_within_horizon.unavailable_reason === 'not_applicable'}
            <strong>Not applicable</strong><p>This plan has no qualifying investment outlay to earn back. Cash risk and owner value are still simulated.</p><small>{selected.payback.not_applicable_count} paths with no applicable investment payback</small>
          {:else}
            <strong>{probabilityLabel(selected.payback.probability_within_horizon)}</strong><p>of eligible outcomes first recover the investment within five years. Recovery can reverse; this uses project cash flow before financing.</p><small>{eligibilityLabel(selected.payback.probability_within_horizon)}</small>
          {/if}
        </article>
      </div>
      <div class="value-range"><h4>What could the owner’s stake be worth in year five?</h4><p><strong>{formatValue(selected.terminal_distributions.exit_equity_value.p10)} – {formatValue(selected.terminal_distributions.exit_equity_value.p90)}</strong></p><p>The 10th–90th percentile range across eligible modeled outcomes, with a median of {formatValue(selected.terminal_distributions.exit_equity_value.p50)}. Outcomes can fall outside this range.</p><small>{eligibilityLabel(selected.terminal_distributions.exit_equity_value)}</small></div>
    {:else}<p class="availability">These results do not include the selected plan. Run a new comparison to evaluate it.</p>{/if}
    <details class="technical-results"><summary>Explore all plans, uncertainty charts and calculation details</summary>
    <div class="risk-cards">{#each Object.entries(risk.result.scenarios) as [id, scenario]}<article><h3>{submitted?.scenarios.find(s => s.id === id)?.name ?? id}</h3>
      <dl><dt>Any reserve shortfall · months 1–60</dt><dd>{probabilityLabel(scenario.path_risks.probability_cash_below_reserve_any_month)}</dd><dd class="counts">{eligibilityLabel(scenario.path_risks.probability_cash_below_reserve_any_month)}</dd>
      <dt>Lower owner value than doing nothing</dt><dd>{probabilityLabel(scenario.path_risks.probability_negative_exit_equity_delta)}</dd><dd class="counts">{eligibilityLabel(scenario.path_risks.probability_negative_exit_equity_delta)}</dd>
      <dt>Project payback by month 60</dt><dd>{probabilityLabel(scenario.payback.probability_within_horizon)}</dd><dd class="counts">{eligibilityLabel(scenario.payback.probability_within_horizon)}</dd>
      <dt>Median recovery month · recovered paths only</dt><dd>{scenario.payback.median_month_conditional_on_payback_or_null === null ? (scenario.payback.not_applicable_count === risk.result.runs ? 'Not applicable — no investment outlay' : 'Unavailable — no recovered paths') : `Month ${scenario.payback.median_month_conditional_on_payback_or_null}`}</dd>
      <dd class="counts">{risk.result.payback_counts[id].reached_count} reached · {scenario.payback.not_reached_count} not reached · {scenario.payback.not_applicable_count} not applicable · {risk.result.payback_counts[id].subsequent_reversal_count} subsequent reversals</dd></dl>
      <h4>Exit equity · month 60</h4><p>P10 {formatValue(scenario.terminal_distributions.exit_equity_value.p10)} · P50 {formatValue(scenario.terminal_distributions.exit_equity_value.p50)} · P90 {formatValue(scenario.terminal_distributions.exit_equity_value.p90)}</p><p class="counts">Mean {formatValue(scenario.terminal_distributions.exit_equity_value.mean)} · {eligibilityLabel(scenario.terminal_distributions.exit_equity_value)}</p>
      <h4>Owner value change vs doing nothing</h4><p>P10 {formatValue(pairedExit(risk.result, id).p10)} · P50 {formatValue(pairedExit(risk.result, id).p50)} · P90 {formatValue(pairedExit(risk.result, id).p90)}</p><p class="counts">{eligibilityLabel(pairedExit(risk.result, id))}</p>
    </article>{/each}</div>
    {#if selected}<h3>Monthly {metrics.find(m => m.key === metric)?.label.toLowerCase()} · {submitted?.scenarios.find(s => s.id === scenarioId)?.name ?? scenarioId}</h3>
      <p class="muted">P10 / P50 / P90 at each month. These curves are not individual paths or a probability of avoiding shortfall across the horizon. Use the scenario and metric controls above to change this view.</p>
      <svg viewBox="0 0 780 230" role="img" aria-label="Pointwise Monte Carlo percentiles over months zero to sixty"><title>Pointwise percentiles; individual paths may cross the displayed curves</title><text x="4" y="20">{formatValue(high, metric === 'utilization')}</text><text x="4" y="218">{formatValue(low, metric === 'utilization')}</text>{#each ['p10','p50','p90'] as key}<path d={line(key as 'p10'|'p50'|'p90')} fill="none" stroke={key === 'p50' ? '#208c7c' : '#72828e'} stroke-width={key === 'p50' ? 3 : 1.5} stroke-dasharray={key === 'p50' ? undefined : '5 4'} />{/each}<text x="45" y="230">Month 0</text><text x="680" y="230">Month 60</text></svg>
      <p>P10 / P90 dashed · P50 solid. Missing values leave gaps. Opening flows and valuation remain unavailable.</p>
      <h3>Risk inspector · {month === 0 ? 'opening state' : `month ${month}`}</h3><p>Cash below reserve in this month: <strong>{probabilityLabel(selected.monthly_probability_cash_below_reserve[month])}</strong> · {eligibilityLabel(selected.monthly_probability_cash_below_reserve[month])}</p>
      <div class="table-wrap"><table><caption class="sr-only">Pointwise percentile and paired delta values for selected month</caption><thead><tr><th>Metric</th><th>P10</th><th>P50</th><th>P90</th><th>Mean</th><th>Eligible / unavailable</th><th>Paired Δ P50</th></tr></thead><tbody>{#each riskMetrics as item}{@const q = selected.monthly_percentiles[item.key][month]}{@const delta = risk.result.comparisons[scenarioId].paired_monthly_delta_percentiles[item.key][month]}<tr><th>{item.label}</th><td>{formatValue(q.p10, item.key === 'utilization')}</td><td>{formatValue(q.p50, item.key === 'utilization')}</td><td>{formatValue(q.p90, item.key === 'utilization')}</td><td>{formatValue(q.mean, item.key === 'utilization')}</td><td>{eligibilityLabel(q)}</td><td>{item.key === 'utilization' ? formatValue(delta.p50, true).replace('%', ' pp') : formatValue(delta.p50)}<small>{eligibilityLabel(delta)}</small></td></tr>{/each}</tbody></table></div>
    {/if}
    <details><summary>Technical simulation records</summary><p>Reserve {formatValue(submitted?.reserve_floor_usd)} · seed {risk.result.seed} · {risk.result.runs} runs · model {risk.result.model_version} · schema {risk.result.schema_version} · config {risk.result.config_version} · sampler {risk.result.sampler_version} · execution {risk.result.execution_version}</p><p class="fingerprint">Run {risk.result.run_id}<br />Input {risk.result.input_fingerprint}<br />Configuration {risk.result.config_fingerprint}</p><pre>{JSON.stringify(risk.result.configuration, null, 2)}</pre></details>
    </details>
  {:else}<p class="muted">No risk results yet. The forecast above uses one set of assumptions.</p>{/if}
</section>
<style>
  .risk-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:20px}.risk-summary article,.value-range{padding:20px;background:#f4f7f1;border-radius:8px}.risk-summary h4,.value-range h4{font-size:14px;margin:0 0 14px}.risk-summary strong{font-size:30px;font-weight:500}.risk-summary p,.value-range p{font-size:13px;line-height:1.65}.value-range{margin-top:16px}.value-range strong{font-size:24px}.technical-results>summary{padding:16px 0;font-size:14px}.risk-panel{margin-top:24px;padding:24px}.risk-controls{display:flex;gap:12px;align-items:end;flex-wrap:wrap}.risk-controls label{display:grid;gap:6px;font-size:12px}.risk-controls select{max-width:100%;padding:10px;border:1px solid #dce5df;border-radius:5px}.risk-controls label{min-width:0;max-width:100%}input{padding:10px;max-width:170px}.risk-controls button{padding:12px}.risk-controls .primary{width:auto;margin:0;flex:none}.job-status{display:grid;gap:8px;padding:16px;background:#eef4f1;margin:16px 0}.job-status progress{width:100%;accent-color:#208c7c}.risk-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.risk-cards article{border:1px solid #dce5df;border-radius:12px;padding:16px;min-width:0}.risk-cards h3{font-size:16px}.risk-cards h4{font-size:12px;margin:16px 0 8px}.risk-cards dt{font-size:12px;margin-top:16px}.risk-cards dd{margin:4px 0;font-weight:600}.risk-cards p{font-size:12px;line-height:1.6}.counts,small{font-size:11px!important;color:#65766c;font-weight:400!important;line-height:1.5}small{display:block}.result-notice{padding:12px;background:#eaf3ed}.result-notice.stale{background:#fff1d8}.availability{padding:12px;background:#f0f2ef}svg{width:100%;max-height:300px;margin:12px 0}svg text{font-size:10px;fill:#65766c}.fingerprint,pre{overflow-wrap:anywhere;white-space:pre-wrap;font-size:11px}details{margin-top:18px}h3{margin-top:20px}@media(max-width:850px){.risk-summary{grid-template-columns:1fr}.risk-cards{grid-template-columns:1fr}.risk-panel{padding:16px}}

.risk-controls{display:grid;grid-template-columns:minmax(220px,1fr) auto auto;align-items:end;gap:12px;margin:20px 0}
.risk-controls label{font-size:13px;line-height:1.5;gap:8px}
.risk-controls select{width:100%;min-height:42px;font-size:13px}
.risk-controls button{min-height:42px;border:1px solid #d7e0d4;border-radius:6px;background:white;color:#365342;font-size:13px;line-height:1.4;padding:10px 14px}
.risk-controls .primary{background:#204e3c;color:white;border-color:#204e3c}
.risk-panel .panel-head{align-items:flex-start}
.risk-options{display:grid;grid-template-columns:minmax(220px,1fr) minmax(0,1fr);gap:24px;margin-bottom:16px;align-items:start}
.risk-options label,.simulation-settings label{display:grid;gap:8px;font-size:13px;color:#607366;line-height:1.5}
.risk-options select,.simulation-settings input{width:100%;min-height:42px;padding:10px 12px;border:1px solid #d7e0d4;border-radius:6px;background:white;color:#233e3c;font-size:13px}
.selected-plan{display:grid;gap:8px;min-width:0;font-size:13px;line-height:1.5}.selected-plan span{color:#607366}.selected-plan strong{font-weight:600;overflow-wrap:anywhere}.selected-plan a{font-size:12px;color:#204e3c;text-underline-offset:3px}
.simulation-settings{border-top:1px solid #e5ebe2;padding-top:16px}.simulation-settings summary{font-size:13px;font-weight:600}.simulation-settings label{max-width:180px;margin-top:16px}
.availability{font-size:13px;line-height:1.65;border-radius:6px;margin:12px 0}
.job-status{border-radius:6px;font-size:13px;line-height:1.5}.risk-summary strong{line-height:1.2;overflow-wrap:anywhere}
@media(max-width:1000px){.risk-controls{grid-template-columns:1fr 1fr}.risk-controls label{grid-column:1/-1}}
@media(max-width:600px){.risk-options{grid-template-columns:1fr;gap:16px}.risk-controls{grid-template-columns:1fr}.risk-controls label{grid-column:auto}.risk-controls button{width:100%}.risk-panel .panel-head{flex-wrap:wrap}}
</style>
