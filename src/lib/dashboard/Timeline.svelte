<script lang="ts">
  import type { MetricKey, ScenarioPath } from '../../../contracts/contracts.ts';
  import { metricValue, formatValue } from './model.ts';
  let { paths, metric, month, reserve, onselect }: {
    paths: ScenarioPath[]; metric: MetricKey; month: number; reserve: number; onselect: (month: number) => void;
  } = $props();
  const colors = ['#72828e', '#208c7c', '#d17742'];
  const x = (m: number) => 68 + m / 60 * 864;
  let values = $derived(paths.flatMap(path => path.months.map(row => metricValue(row, metric))).filter((v): v is number => v !== null));
  let low = $derived(Math.min(0, ...values, ...(metric === 'cash_end' ? [reserve] : [])));
  let high = $derived(Math.max(1, ...values, ...(metric === 'cash_end' ? [reserve] : [])));
  const y = (v: number) => 270 - (v - low) / (high - low) * 230;
  function line(path: ScenarioPath) {
    let started = false;
    return path.months.map(row => {
      const v = metricValue(row, metric);
      if (v === null) { started = false; return ''; }
      const command = started ? 'L' : 'M'; started = true;
      return `${command}${x(row.month)},${y(v)}`;
    }).join(' ');
  }
</script>
<div class="plot">
  <svg viewBox="0 0 960 320" role="img" aria-label="Deterministic scenario timeline. Use the month slider below to inspect values.">
    {#each [0, 1, 2, 3, 4] as tick}
      {@const value = low + (high - low) * tick / 4}
      <line x1="68" x2="932" y1={y(value)} y2={y(value)} stroke="#e2e8e7" />
      <text x="59" y={y(value) + 4} text-anchor="end">{metric === 'utilization' ? formatValue(value, true) : new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)}</text>
    {/each}
    {#each [0, 12, 24, 36, 48, 60] as tick}
      <text x={x(tick)} y="301" text-anchor="middle">{tick === 0 ? 'Opening' : `M${tick}`}</text>
    {/each}
    {#if metric === 'cash_end'}
      <line x1="68" x2="932" y1={y(reserve)} y2={y(reserve)} stroke="#b34e55" stroke-dasharray="5 5" />
      <text x="930" y={y(reserve) - 7} text-anchor="end" fill="#b34e55">Reserve floor</text>
    {/if}
    {#each paths as path, i}
      <path d={line(path)} fill="none" stroke={colors[i % colors.length]} stroke-width="3" />
      {#each path.months.filter(row => row.events.length && metricValue(row, metric) !== null) as row}
        <circle cx={x(row.month)} cy={y(metricValue(row, metric)!)} r="3.2" fill={colors[i % colors.length]}>
          <title>{path.metadata.name} · Month {row.month}: {row.events.map(event => event.label).join('; ')}</title>
        </circle>
      {/each}
      {@const selected = metricValue(path.months[month], metric)}
      {#if selected !== null}<circle cx={x(month)} cy={y(selected)} r="5" fill={colors[i % colors.length]} stroke="white" stroke-width="2" />{/if}
    {/each}
    <line x1={x(month)} x2={x(month)} y1="30" y2="278" stroke="#263e44" stroke-dasharray="3 4" />
  </svg>
</div>
<label class="month-control">Inspect month <strong>{month === 0 ? '0 · opening state' : month}</strong>
  <input aria-label="Selected month" type="range" min="0" max="60" value={month} oninput={event => onselect(Number(event.currentTarget.value))} />
</label>
<div class="legend">{#each paths as path, i}<span><i style:background={colors[i % colors.length]}></i>{path.metadata.name}</span>{/each}</div>
<style>
  .plot{width:100%;overflow:hidden}svg{width:100%;min-height:230px}text{font:11px system-ui;fill:#657574}.month-control{display:flex;align-items:center;gap:14px;font-size:12px;color:#536865}.month-control input{flex:1;accent-color:#208c7c;min-width:70px}.legend{display:flex;flex-wrap:wrap;gap:18px;margin-top:18px;font-size:12px;color:#536865}.legend span{display:flex;gap:7px;align-items:center}.legend i{width:19px;height:3px;display:inline-block}
</style>
