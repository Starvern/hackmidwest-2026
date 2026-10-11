<script lang="ts">
  import type { CompanyInput } from '../../../contracts/contracts.ts';
  let { company, href, description, expanded = false }: { company: CompanyInput; href: string; description: string; expanded?: boolean } = $props();
  const money = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const number = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 1 });
  const percent = (value: number) => `${number(value * 100)}%`;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const operations = $derived(company.operations);
  const opening = $derived(company.opening_financial_state);
  const assumptions = $derived(company.global_assumptions);
  const capacity = $derived(Math.min(operations.technicians * operations.max_jobs_per_tech_per_day, operations.vehicles * operations.max_jobs_per_vehicle_per_day) * operations.working_days_per_month);
</script>

<article aria-label={company.name}>
  <h3>{company.name}</h3><p class="description">{description}</p>
  <p class="source">Synthetic example · USD · Five-year forecast</p>
  <dl class="facts">
    <div><dt>Technicians / trucks</dt><dd>{operations.technicians} / {operations.vehicles}</dd></div>
    <div><dt>Current job capacity / month</dt><dd>{number(capacity)}</dd></div>
    <div><dt>Average requested jobs / month</dt><dd>{number(operations.base_monthly_job_demand)}</dd></div>
    <div><dt>Average service ticket</dt><dd>{money(operations.average_ticket)}</dd></div>
    <div><dt>Opening cash</dt><dd>{money(opening.cash)}</dd></div>
    <div><dt>Existing loan balance</dt><dd>{money(opening.debt_tranches.reduce((sum, loan) => sum + loan.principal, 0))}</dd></div>
  </dl>
  <details open={expanded}>
    <summary>Company financials and assumptions</summary>
    <h4>Starting balances and monthly costs</h4>
    <dl class="rows">
      <div><dt>Customer receivables</dt><dd>{money(opening.accounts_receivable)}</dd></div>
      <div><dt>Supplier payables</dt><dd>{money(opening.accounts_payable)}</dd></div>
      <div><dt>Inventory</dt><dd>{money(opening.inventory)}</dd></div>
      <div><dt>Fixed overhead / month</dt><dd>{money(operations.fixed_overhead_per_month)}</dd></div>
      <div><dt>Marketing included in overhead</dt><dd>{money(operations.baseline_marketing_in_overhead)}</dd></div>
      <div><dt>Loaded technician cost / year</dt><dd>{money(operations.technician_loaded_cost_per_year)}</dd></div>
      <div><dt>Running cost per truck / year</dt><dd>{money(operations.vehicle_opex_per_year)}</dd></div>
      <div><dt>Service variable cost / service sales</dt><dd>{percent(operations.service_variable_cost_rate)}</dd></div>
      <div><dt>Other sales / month</dt><dd>{money(operations.non_service_revenue_per_month)}</dd></div>
      <div><dt>Other direct costs / month</dt><dd>{money(operations.non_service_direct_cost_per_month)}</dd></div>
      <div><dt>Maintenance purchases / year</dt><dd>{money(assumptions.maintenance_capex_per_year)}</dd></div>
    </dl>
    <h4>Existing loans</h4>
    {#each opening.debt_tranches as loan}<p class="loan">{money(loan.principal)} at {percent(loan.annual_interest_rate)} annual interest · {loan.remaining_term_months} months remaining · {money(loan.monthly_principal)} monthly principal, plus interest.</p>{:else}<p>No existing loans.</p>{/each}
    <h4>Existing equipment</h4>
    {#each opening.depreciable_assets as asset}<p>{money(asset.cost_basis)} original cost · {money(asset.accumulated_depreciation)} accumulated depreciation · {money(asset.monthly_depreciation)} monthly depreciation · {asset.remaining_life_months} months of useful life remaining.</p>{:else}<p>No depreciable assets.</p>{/each}
    <h4>Forecast assumptions</h4>
    <dl class="rows">
      <div><dt>Working days / month</dt><dd>{number(operations.working_days_per_month)}</dd></div>
      <div><dt>Jobs / technician / working day</dt><dd>{number(operations.max_jobs_per_tech_per_day)}</dd></div>
      <div><dt>Jobs / truck / working day</dt><dd>{number(operations.max_jobs_per_vehicle_per_day)}</dd></div>
      <div><dt>Annual demand / service price growth</dt><dd>{percent(assumptions.organic_demand_growth)} / {percent(assumptions.ticket_growth)}</dd></div>
      <div><dt>Annual wage / overhead inflation</dt><dd>{percent(assumptions.wage_inflation)} / {percent(assumptions.overhead_inflation)}</dd></div>
      <div><dt>Customer / supplier payment timing</dt><dd>{number(assumptions.collection_delay_months * 30)} / {number(assumptions.payment_delay_months * 30)} days</dd></div>
      <div><dt>Cash reserve floor</dt><dd>{money(assumptions.liquidity_floor)}</dd></div>
      <div><dt>Exit EBITDA multiple / tax rate</dt><dd>{number(assumptions.valuation_multiple)}× / {percent(assumptions.tax_rate)}</dd></div>
    </dl>
    <details><summary>Seasonal demand by month</summary><p>Requested jobs before annual growth; completed jobs are limited by available staff and trucks.</p><div class="table-wrap"><table><thead><tr><th>Month</th><th>Requested jobs</th></tr></thead><tbody>{#each assumptions.seasonality as factor, i}<tr><th>{months[i]}</th><td>{number(operations.base_monthly_job_demand * factor)}</td></tr>{/each}</tbody></table></div></details>
    <details><summary>Monthly starting history</summary><div class="table-wrap"><table><thead><tr><th>Month</th><th>Jobs</th><th>Sales</th><th>EBITDA</th></tr></thead><tbody>{#each company.historical_months as row}<tr><th>{months[row.month_of_year - 1]}</th><td>{number(row.service_jobs)}</td><td>{money(row.revenue)}</td><td>{money(row.ebitda)}</td></tr>{/each}</tbody></table></div></details>
    <p class="source">All figures are illustrative inputs and assumptions, not actual company records.</p>
  </details>
  <a class="plan-link" {href} data-sveltekit-reload>Build a plan →</a>
</article>

<style>
  article{min-width:0;padding:22px;border:1px solid #d5dfd9;border-radius:10px;background:white;color:#233e3c;scroll-margin-top:24px}
  h3{font-size:18px;line-height:1.4;margin:0 0 8px}h4{font-size:13px;margin:20px 0 10px}
  p{font-size:13px;line-height:1.65;margin:8px 0}.description{min-height:44px}.source{font-size:11px;color:#607366}
  dl{margin:18px 0}.facts{display:grid;grid-template-columns:1fr 1fr;gap:16px}.facts>div{display:block}.facts dt{font-size:11px;color:#607366}.facts dd{font-size:20px;margin:5px 0 0;text-align:left}
  .rows>div{display:flex;justify-content:space-between;align-items:start;gap:16px;border-bottom:1px solid #e6ebe5;padding:9px 0;font-size:12px;line-height:1.5}.rows dt{color:#607366}.rows dd{margin:0;text-align:right;font-weight:500}
  details{margin:16px 0}summary{cursor:pointer;font-size:13px;font-weight:600;padding:8px 0;line-height:1.5}
  .plan-link{display:block;margin-top:18px;padding:12px 16px;border-radius:6px;background:#204e3c;color:white;text-align:center;text-decoration:none;font-size:13px;font-weight:500}.plan-link:hover{background:#31594f}
  .table-wrap{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:12px}th,td{padding:9px;text-align:right;border-bottom:1px solid #e6ebe5;white-space:nowrap}th:first-child{text-align:left}
  @media(max-width:600px){article{padding:18px}.rows>div{flex-wrap:wrap;gap:4px}.rows dd{text-align:left}}
</style>
