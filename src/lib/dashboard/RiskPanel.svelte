<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { DeterministicRequest, MetricKey } from '../../../contracts/contracts.ts';
  import { createRiskController, emptyRiskState, riskRequest, probabilityLabel, eligibilityLabel, pairedExit } from './monte-carlo.ts';
  import { formatValue, metrics } from './model.ts';
  let { request, enabled, month, scenarioId, metric }: { request: DeterministicRequest; enabled: boolean; month: number; scenarioId: string; metric: MetricKey } = $props();
  const riskMetrics: { key: MetricKey; label: string }[] = [...metrics, { key: 'ttm_ebitda', label: 'Trailing 12-month EBITDA' }, { key: 'enterprise_value', label: 'Enterprise value' }, { key: 'unlevered_fcf', label: 'Monthly unlevered FCF' }];
  let seed = $state(42);
  let risk = $state(emptyRiskState());
  const controller = createRiskController(value => risk = value);
  onDestroy(() => controller.dispose());
  let desired = $derived(JSON.stringify({ ...request, monte_carlo: { enabled: true, runs: 2000, seed } }));
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
    try { await controller.start(riskRequest($state.snapshot(request), seed)); }
    catch (error) { risk = { ...risk, error: error instanceof Error ? error.message : 'Invalid risk request.' }; }
  }
</script>

<section class="panel risk-panel" aria-labelledby="risk-title" aria-busy={risk.busy}>
  <div class="panel-head"><div><p class="eyebrow">04 / EXPLORE UNCERTAINTY</p><h2 id="risk-title">Risk & resilience</h2></div><span class="small-tag">2,000 paired paths</span></div>
  <p class="muted">Synthetic sensitivity assumptions. These modeled frequencies are not calibrated business probabilities.</p>
  {#if !enabled}<p class="availability">Risk runs are available in the accepted local workflow. Enable local Monte Carlo review and build the worker to use these controls.</p>{/if}
  <div class="risk-controls"><label>Random seed<input aria-label="Monte Carlo random seed" type="number" min="0" max="4294967295" step="1" bind:value={seed} disabled={risk.busy} /></label><button class="primary" onclick={run} disabled={!enabled || risk.busy || (risk.job !== null && ['queued','running'].includes(risk.job.state))}>Run risk simulation</button>
    <button onclick={() => controller.recorded()} disabled={!enabled || risk.busy || (risk.job !== null && ['queued','running'].includes(risk.job.state))}>View recorded benchmark</button>
    {#if risk.job && ['queued','running'].includes(risk.job.state)}<button onclick={() => controller.cancel()}>Cancel run</button>{/if}
    {#if risk.error && risk.job}<button onclick={() => controller.resume()} disabled={risk.busy}>Resume checking this job</button>{/if}
  </div>
  <p class="muted">A recorded workstation run took about 24 minutes. Your runtime may differ. Runs are manual; editing inputs does not start another job.</p>
  {#if risk.job}<div class="job-status" aria-live="polite"><strong>{risk.job.state === 'queued' ? 'Waiting for a worker' : risk.job.state === 'running' ? 'Simulating paired paths' : risk.job.state === 'succeeded' ? 'Risk simulation complete' : risk.job.state === 'cancelled' ? 'Run cancelled' : 'Run failed'}</strong><span>{risk.job.completed_runs.toLocaleString()} / {risk.job.total_runs.toLocaleString()} completed runs</span><progress max={risk.job.total_runs} value={risk.job.completed_runs} aria-label="Completed aggregated Monte Carlo runs"></progress></div>{/if}
  {#if risk.error}<div class="error" role="alert"><p>{risk.error}</p>{#if !risk.job}<button onclick={run} disabled={risk.busy || !enabled}>Retry submission</button>{/if}</div>{/if}
  {#if risk.result}
    <p><strong>{risk.source === 'recorded' ? 'Recorded benchmark · original example inputs · seed 42' : 'Completed live job'}</strong></p>
    <p class:stale class="result-notice">{stale ? 'Previous risk result — inputs or seed changed. Run again to update.' : 'Risk result matches current inputs and seed.'}{risk.busy ? ' Previous successful result stays visible while the new job runs.' : ''}</p>
    <div class="risk-cards">{#each Object.entries(risk.result.scenarios) as [id, scenario]}<article><h3>{submitted?.scenarios.find(s => s.id === id)?.name ?? id}</h3>
      <dl><dt>Any reserve shortfall · months 1–60</dt><dd>{probabilityLabel(scenario.path_risks.probability_cash_below_reserve_any_month)}</dd><dd class="counts">{eligibilityLabel(scenario.path_risks.probability_cash_below_reserve_any_month)}</dd>
      <dt>Negative paired exit Δ vs baseline</dt><dd>{probabilityLabel(scenario.path_risks.probability_negative_exit_equity_delta)}</dd><dd class="counts">{eligibilityLabel(scenario.path_risks.probability_negative_exit_equity_delta)}</dd>
      <dt>Project payback by month 60</dt><dd>{probabilityLabel(scenario.payback.probability_within_horizon)}</dd><dd class="counts">{eligibilityLabel(scenario.payback.probability_within_horizon)}</dd>
      <dt>Median recovery month · recovered paths only</dt><dd>{scenario.payback.median_month_conditional_on_payback_or_null === null ? (scenario.payback.not_applicable_count === risk.result.runs ? 'Not applicable — no investment outlay' : 'Unavailable — no recovered paths') : `Month ${scenario.payback.median_month_conditional_on_payback_or_null}`}</dd>
      <dd class="counts">{risk.result.payback_counts[id].reached_count} reached · {scenario.payback.not_reached_count} not reached · {scenario.payback.not_applicable_count} not applicable · {risk.result.payback_counts[id].subsequent_reversal_count} subsequent reversals</dd></dl>
      <h4>Exit equity · month 60</h4><p>P10 {formatValue(scenario.terminal_distributions.exit_equity_value.p10)} · P50 {formatValue(scenario.terminal_distributions.exit_equity_value.p50)} · P90 {formatValue(scenario.terminal_distributions.exit_equity_value.p90)}</p><p class="counts">Mean {formatValue(scenario.terminal_distributions.exit_equity_value.mean)} · {eligibilityLabel(scenario.terminal_distributions.exit_equity_value)}</p>
      <h4>Paired exit equity Δ vs baseline</h4><p>P10 {formatValue(pairedExit(risk.result, id).p10)} · P50 {formatValue(pairedExit(risk.result, id).p50)} · P90 {formatValue(pairedExit(risk.result, id).p90)}</p><p class="counts">{eligibilityLabel(pairedExit(risk.result, id))}</p>
    </article>{/each}</div>
    {#if selected}<h3>Pointwise {metrics.find(m => m.key === metric)?.label.toLowerCase()} · {submitted?.scenarios.find(s => s.id === scenarioId)?.name ?? scenarioId}</h3>
      <p class="muted">P10 / P50 / P90 at each month. These curves are not individual paths or a probability of avoiding shortfall across the horizon. Use the scenario and metric controls above to change this view.</p>
      <svg viewBox="0 0 780 230" role="img" aria-label="Pointwise Monte Carlo percentiles over months zero to sixty"><title>Pointwise percentiles; individual paths may cross the displayed curves</title><text x="4" y="20">{formatValue(high, metric === 'utilization')}</text><text x="4" y="218">{formatValue(low, metric === 'utilization')}</text>{#each ['p10','p50','p90'] as key}<path d={line(key as 'p10'|'p50'|'p90')} fill="none" stroke={key === 'p50' ? '#208c7c' : '#72828e'} stroke-width={key === 'p50' ? 3 : 1.5} stroke-dasharray={key === 'p50' ? undefined : '5 4'} />{/each}<text x="45" y="230">Month 0</text><text x="680" y="230">Month 60</text></svg>
      <p>P10 / P90 dashed · P50 solid. Missing values leave gaps. Opening flows and valuation remain unavailable.</p>
      <h3>Risk inspector · {month === 0 ? 'opening state' : `month ${month}`}</h3><p>Cash below reserve in this month: <strong>{probabilityLabel(selected.monthly_probability_cash_below_reserve[month])}</strong> · {eligibilityLabel(selected.monthly_probability_cash_below_reserve[month])}</p>
      <div class="table-wrap"><table><caption class="sr-only">Pointwise percentile and paired delta values for selected month</caption><thead><tr><th>Metric</th><th>P10</th><th>P50</th><th>P90</th><th>Mean</th><th>Eligible / unavailable</th><th>Paired Δ P50</th></tr></thead><tbody>{#each riskMetrics as item}{@const q = selected.monthly_percentiles[item.key][month]}{@const delta = risk.result.comparisons[scenarioId].paired_monthly_delta_percentiles[item.key][month]}<tr><th>{item.label}</th><td>{formatValue(q.p10, item.key === 'utilization')}</td><td>{formatValue(q.p50, item.key === 'utilization')}</td><td>{formatValue(q.p90, item.key === 'utilization')}</td><td>{formatValue(q.mean, item.key === 'utilization')}</td><td>{eligibilityLabel(q)}</td><td>{item.key === 'utilization' ? formatValue(delta.p50, true).replace('%', ' pp') : formatValue(delta.p50)}<small>{eligibilityLabel(delta)}</small></td></tr>{/each}</tbody></table></div>
    {/if}
    <details><summary>Risk assumptions & run identity</summary><p>Reserve {formatValue(submitted?.reserve_floor_usd)} · seed {risk.result.seed} · {risk.result.runs} runs · model {risk.result.model_version} · schema {risk.result.schema_version} · config {risk.result.config_version} · sampler {risk.result.sampler_version} · execution {risk.result.execution_version}</p><p class="fingerprint">Run {risk.result.run_id}<br />Input {risk.result.input_fingerprint}<br />Configuration {risk.result.config_fingerprint}</p><pre>{JSON.stringify(risk.result.configuration, null, 2)}</pre></details>
  {:else}<p class="muted">No risk simulation has completed in this workspace. Deterministic results above use one disclosed set of assumptions.</p>{/if}
</section>
<style>
  .risk-panel{margin-top:24px;padding:24px}.risk-controls{display:flex;gap:12px;align-items:end;flex-wrap:wrap}.risk-controls label{display:grid;gap:6px;font-size:12px}.risk-controls input{padding:10px;max-width:170px}.risk-controls button{padding:12px}.risk-controls .primary{width:auto;margin:0;flex:none}.job-status{display:grid;gap:8px;padding:16px;background:#eef4f1;margin:16px 0}.job-status progress{width:100%;accent-color:#208c7c}.risk-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.risk-cards article{border:1px solid #dce5df;border-radius:12px;padding:16px;min-width:0}.risk-cards h3{font-size:16px}.risk-cards h4{font-size:12px;margin:16px 0 8px}.risk-cards dt{font-size:12px;margin-top:16px}.risk-cards dd{margin:4px 0;font-weight:600}.risk-cards p{font-size:12px;line-height:1.6}.counts,small{font-size:11px!important;color:#65766c;font-weight:400!important;line-height:1.5}small{display:block}.result-notice{padding:12px;background:#eaf3ed}.result-notice.stale{background:#fff1d8}.availability{padding:12px;background:#f0f2ef}svg{width:100%;max-height:300px;margin:12px 0}svg text{font-size:10px;fill:#65766c}.fingerprint,pre{overflow-wrap:anywhere;white-space:pre-wrap;font-size:11px}details{margin-top:18px}h3{margin-top:20px}@media(max-width:850px){.risk-cards{grid-template-columns:1fr}.risk-panel{padding:16px}}
</style>
