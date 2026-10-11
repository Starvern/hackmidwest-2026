/** Input preflight only. No authorization, persistence, compilation or run defaults. */
import { MAPPING_VERSION, type ProfilePayload } from './schemas.ts';
import { reviewDraft, historicalTickets } from './review.ts';

type Field = { value: unknown; state: string; period: { as_of: string } | { start: string; end: string } | null; source_ids: string[]; raw: { text: string; unit: string; precision: string } | null };
export type IntakeIssue = { code: string; pointer: string; severity: 'blocking' | 'notice'; message: string; source_ids: string[] };
const isField = (v: unknown): v is Field => !!v && typeof v === 'object' && 'state' in v && 'unit' in v && 'value' in v;
const ready = (f: Field) => f.value !== null && ['confirmed', 'reviewed_estimate'].includes(f.state);
const close = (a: number, b: number) => Math.abs(a - b) <= 1e-6 + 1e-12 * Math.max(Math.abs(a), Math.abs(b));

/** Exact decimal-to-cent parsing: never round a source to make an identity pass. */
export function decimalCents(text: string): bigint | null {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) return null;
  const cents = BigInt(match[2]) * 100n + BigInt((match[3] ?? '').padEnd(2, '0'));
  return match[1] ? -cents : cents;
}

export function assessIntake(input: unknown) {
  const { profile: p, issues: structural } = reviewDraft(input);
  const issues: IntakeIssue[] = structural.map(issue => ({ ...issue, severity: 'blocking', source_ids: [] }));
  const add = (code: string, pointer: string, message: string, field?: Field, severity: 'blocking' | 'notice' = 'blocking') =>
    issues.push({ code, pointer, message, source_ids: field?.source_ids ?? [], severity });
  const optional = (pointer: string) => pointer === '/assumptions/risk_configuration' ||
    /^\/history\/\d+\/reported_profit(_basis)?$/.test(pointer);
  function walk(value: unknown, pointer: string) {
    if (isField(value)) {
      if ((!optional(pointer) || value.value !== null) && !ready(value)) add(value.state === 'entered' ? 'REVIEW_REQUIRED' : 'REQUIRED_UNKNOWN', pointer, 'Provide a reviewed value, including explicit zero where appropriate', value);
      if (value.state === 'reviewed_estimate') add('REVIEWED_ESTIMATE', pointer, 'This input remains an estimate', value, 'notice');
      if (ready(value) && value.raw?.precision === '0.01' && ['USD', 'USD/month'].includes(value.raw.unit)) {
        if (typeof value.value !== 'number' || decimalCents(value.raw.text) === null ||
          decimalCents(value.raw.text) !== decimalCents(String(value.value)))
          add('SOURCE_CONFLICT', pointer, 'Cent-denominated source and normalized value must agree exactly', value);
      }
      return;
    }
    if (Array.isArray(value)) value.forEach((child, i) => walk(child, `${pointer}/${i}`));
    else if (value && typeof value === 'object') Object.entries(value).forEach(([key, child]) => walk(child, `${pointer}/${key}`));
  }
  walk(p, '');
  const equal = (f: Field, expected: unknown, code: string, pointer: string, message: string) => {
    if (ready(f) && f.value !== expected) add(code, pointer, message, f);
  };
  equal(p.business.trade, 'HVAC', 'UNSUPPORTED_INDUSTRY', '/business/trade', 'Initial model supports HVAC only');
  equal(p.business.currency, 'USD', 'UNSUPPORTED_CURRENCY', '/business/currency', 'Initial model supports USD only');
  if (ready(p.business.accounting_basis) && !['accrual', 'reconciled_accrual_equivalent'].includes(p.business.accounting_basis.value!))
    add('ACCOUNTING_BASIS_UNRESOLVED', '/business/accounting_basis', 'Accrual or explicitly reconciled accrual-equivalent history is required', p.business.accounting_basis);
  const asOf = p.business.books_through.value;
  if (asOf && !asOf.endsWith('-12-31')) add('UNSUPPORTED_DATE', '/business/books_through', 'Opening date must be December 31', p.business.books_through);
  const year = asOf ? Number(asOf.slice(0, 4)) : null;
  if (year !== null) equal(p.business.forecast_start, `${String(year + 1).padStart(4, '0')}-01-01`, 'UNSUPPORTED_DATE', '/business/forecast_start', 'Forecast must begin the next January');
  if (p.history.length !== 12) add('HISTORY_GAP', '/history', 'Supply exactly twelve ordered January–December observations');
  p.history.forEach((row, i) => {
    if (year !== null && row.period !== `${year}-${String(i + 1).padStart(2, '0')}`)
      add('HISTORY_GAP', `/history/${i}/period`, 'History must cover the opening year in calendar order');
    const days = new Date(Date.UTC(Number(row.period.slice(0, 4)), Number(row.period.slice(5)), 0)).getUTCDate();
    for (const [key, field] of Object.entries(row)) if (isField(field) && ready(field)) {
      if (!field.period || !('start' in field.period) || field.period.start !== `${row.period}-01` || field.period.end !== `${row.period}-${days}`)
        add('AS_OF_MISMATCH', `/history/${i}/${key}`, 'Historical field coverage must match its actual calendar month', field);
    }
    const identity = (total: keyof typeof row, components: (keyof typeof row)[], subtract = false) => {
      const fields = [row[total], ...components.map(key => row[key])];
      if (!fields.every(f => isField(f) && ready(f))) return;
      const values = fields.map(f => Number((f as Field).value));
      const expected = subtract ? values[1] - values.slice(2).reduce((a, b) => a + b, 0) : values.slice(1).reduce((a, b) => a + b, 0);
      let matches = close(values[0], expected);
      const centFields = fields as Field[];
      if (centFields.every(f => f.raw && ['USD', 'USD/month'].includes(f.raw.unit) && f.raw.precision === '0.01')) {
        const cents = centFields.map(f => decimalCents(f.raw!.text));
        const rawMatches = cents.every((v, index) => v !== null && v === decimalCents(String(values[index])));
        if (!rawMatches) matches = false;
        else {
          const nums = cents as bigint[];
          matches = nums[0] === (subtract ? nums[1] - nums.slice(2).reduce((a, b) => a + b, 0n) : nums.slice(1).reduce((a, b) => a + b, 0n));
        }
      }
      if (!matches) add('SOURCE_CONFLICT', `/history/${i}/${String(total)}`, 'Statement categories must reconcile without rounding or balancing plugs', fields[0] as Field);
    };
    identity('revenue', ['service_revenue', 'other_revenue']);
    identity('cogs', ['tech_direct_labor', 'vehicle_direct_opex', 'service_variable_cost', 'other_direct_cost']);
    identity('ebitda', ['revenue', 'cogs', 'operating_overhead'], true);
    for (const [key, f] of Object.entries(row)) if (isField(f) && ready(f) && !['ebitda', 'reported_profit', 'reported_profit_basis'].includes(key) && Number(f.value) < 0)
      add('UNSUPPORTED_ADJUSTMENT', `/history/${i}/${key}`, 'Negative source adjustments require reviewed classification before projection', f);
    if ((row.reported_profit.value === null) !== (row.reported_profit_basis.value === null))
      add('SOURCE_CONFLICT', `/history/${i}/reported_profit_basis`, 'Reported profit and its basis must be supplied together');
  });
  for (const [key, field] of Object.entries(p.opening)) if (isField(field) && ready(field) && asOf && (!field.period || !('as_of' in field.period) || field.period.as_of !== asOf))
    add('AS_OF_MISMATCH', `/opening/${key}`, 'Opening balances and declarations must share the books-through date', field);
  for (const [declaration, rows, pointer] of [
    [p.opening.debt_declaration, p.opening.loans, '/opening/loans'],
    [p.opening.asset_declaration, p.opening.assets, '/opening/assets'],
  ] as const) if (ready(declaration) && (declaration.value === 'unknown' || (declaration.value === 'none' ? rows.length !== 0 : rows.length === 0)))
    add('SCHEDULE_DECLARATION_CONFLICT', pointer, 'Explicit none requires an empty schedule; itemized requires records', declaration);
  p.opening.loans.forEach((loan, i) => {
    const pointer = `/opening/loans/${i}`;
    if (loan.amortization_policy.value !== null && loan.amortization_policy.value !== 'level_principal') add('UNSUPPORTED_DEBT', `${pointer}/amortization_policy`, 'Only exactly representable fixed-rate monthly level-principal debt is supported', loan.amortization_policy);
    if (year !== null && loan.next_payment_date.value && !loan.next_payment_date.value.startsWith(`${year + 1}-01-`)) add('UNSUPPORTED_DEBT', `${pointer}/next_payment_date`, 'Opening debt must next repay in the first forecast month', loan.next_payment_date);
    const balance = loan.outstanding_principal.value, payment = loan.monthly_principal.value, term = loan.remaining_term.value;
    if (balance !== null && payment !== null && term !== null && (balance > 0 ? payment <= 0 || term < 1 ||
      balance > payment * term + 1e-6 || balance <= payment * (term - 1) : term !== 0 || payment !== 0))
      add('UNSUPPORTED_DEBT', pointer, 'Monthly principal must retire the outstanding balance exactly in the stated remaining term, with final payment capped');
    for (const [key, f] of Object.entries(loan)) if (isField(f) && ready(f) && asOf && (!f.period || !('as_of' in f.period) || f.period.as_of !== asOf))
      add('AS_OF_MISMATCH', `${pointer}/${key}`, 'Loan facts must describe the opening schedule', f);
  });
  p.opening.assets.forEach((asset, i) => {
    const pointer = `/opening/assets/${i}`;
    const cost = asset.cost_basis.value, accumulated = asset.accumulated_depreciation.value, monthly = asset.monthly_depreciation.value, life = asset.remaining_life.value;
    if (cost !== null && accumulated !== null && monthly !== null && life !== null &&
      (accumulated > cost || !close(cost - accumulated, monthly * life)))
      add('ASSET_SCHEDULE_CONFLICT', pointer, 'Remaining net asset value must reconcile to its straight-line remaining schedule');
    if (asset.service_date.value && asOf && asset.service_date.value > asOf) add('ASSET_SCHEDULE_CONFLICT', `${pointer}/service_date`, 'Future service assets require unsupported opening scheduling');
    for (const [key, f] of Object.entries(asset)) if (isField(f) && ready(f) && asOf && (!f.period || !('as_of' in f.period) || f.period.as_of !== asOf))
      add('AS_OF_MISMATCH', `${pointer}/${key}`, 'Asset facts must describe the opening schedule', f);
  });
  const o = p.operations, a = p.assumptions;
  if (o.pooling_suitable.value !== null && (o.pooling_suitable.state !== 'confirmed' || !o.pooling_suitable.value)) add('INCOMPATIBLE_JOB_POOL', '/operations/pooling_suitable', 'Owner must explicitly confirm compatible pooled jobs', o.pooling_suitable);
  const mix = o.service_mix.value;
  if (mix && (!mix.length || mix.some(row => row.trade !== 'HVAC' || row.pool_id !== mix[0].pool_id || row.comparable_job_definition !== o.job_definition.value)))
    add('INCOMPATIBLE_JOB_POOL', '/operations/service_mix', 'One compatible HVAC job definition and resource pool is required', o.service_mix);
  if (mix) for (const [i, row] of mix.entries()) {
    if (!row.source_ids.length || !row.historical_row_ids.length) add('SOURCE_CONFLICT', `/operations/service_mix/value/${i}`, 'Service mix needs explicit source and history coverage');
    // Aggregates may cover a subset only when all referenced rows exist; no invented monthly series.
    const rows = p.history.filter(h => row.historical_row_ids.includes(h.row_id));
    if (rows.length && mix.length === 1) for (const [value, key] of [[row.completed_jobs, 'service_jobs'], [row.service_revenue_usd, 'service_revenue']] as const)
      if (value !== null && rows.every(h => ready(h[key])) && !close(value, rows.reduce((sum, h) => sum + h[key].value!, 0)))
        add('SOURCE_CONFLICT', `/operations/service_mix/value/${i}`, 'Supplied service-mix aggregate must reconcile to its covered historical periods');
  }
  if (o.workforce_availability.value && (o.workforce_availability.value.declaration !== 'none' || o.workforce_availability.state !== 'confirmed'))
    add('UNSUPPORTED_WORKFORCE', '/operations/workforce_availability', 'Opening cohort must be explicitly confirmed fully available and productive', o.workforce_availability);
  if (mix && mix.length > 1 && mix.some(row => row.completed_jobs !== null || row.service_revenue_usd !== null))
    add('SOURCE_CONFLICT', '/operations/service_mix', 'Multiple supplied service-mix aggregates require allocation reconciliation before compilation', o.service_mix);
  const demand = o.demand_evidence.value;
  if (demand?.kind === 'measured') {
    const periods = new Set<string>();
    demand.observations.forEach((row, i) => {
      if (periods.has(row.period) || !p.history.some(h => h.period === row.period) ||
        (row.unserved_jobs !== null && row.unserved_jobs > row.requested_jobs))
        add('SOURCE_CONFLICT', `/operations/demand_evidence/value/observations/${i}`, 'Demand observations need unique covered periods and unserved jobs cannot exceed requests');
      periods.add(row.period);
    });
  }
  if (demand?.kind === 'measured' && demand.observations.some(row => !row.source_ids.length || !row.service_mix_row_ids.length))
    add('DEMAND_EVIDENCE_MISSING', '/operations/demand_evidence', 'Measured demand needs dated source and service-mix coverage', o.demand_evidence);
  if (demand?.kind === 'reviewed_estimate' && (!demand.source_ids.length || !demand.service_mix_row_ids.length))
    add('DEMAND_EVIDENCE_MISSING', '/operations/demand_evidence', 'Estimated demand needs source and service-mix coverage', o.demand_evidence);
  if (demand?.kind === 'confirmed_no_unserved' && (!demand.source_ids.length || o.demand_evidence.state !== 'confirmed'))
    add('DEMAND_EVIDENCE_MISSING', '/operations/demand_evidence', 'No-unserved evidence requires confirmed source coverage', o.demand_evidence);
  if (o.baseline_marketing_in_overhead.value !== null && o.fixed_overhead_per_month.value !== null && o.baseline_marketing_in_overhead.value > o.fixed_overhead_per_month.value)
    add('DUPLICATE_COST_MAPPING', '/operations/baseline_marketing_in_overhead', 'Baseline marketing is an included subset of overhead', o.baseline_marketing_in_overhead);
  const factors = a.seasonality.map(f => f.value);
  if (factors.every(v => v !== null) && !close((factors as number[]).reduce((sum, v) => sum + v, 0), 12))
    add('INVALID_SEASONALITY', '/assumptions/seasonality', 'Provide twelve reviewed mean-1 factors; retain raw values and explicit normalization');
  equal(a.truck_useful_life_months, 60, 'UNSUPPORTED_POLICY', '/assumptions/truck_useful_life_months', 'Current truck depreciation policy requires 60 months');
  if (a.valuation_multiple.value === 0) add('UNSUPPORTED_POLICY', '/assumptions/valuation_multiple', 'Valuation multiple must be positive', a.valuation_multiple);
  if (a.ap_eligible_cost_categories.value && (new Set(a.ap_eligible_cost_categories.value).size !== a.ap_eligible_cost_categories.value.length ||
      a.ap_eligible_cost_categories.value.some(v => !['service_variable_cost', 'other_direct_cost'].includes(v))))
    add('UNSUPPORTED_POLICY', '/assumptions/ap_eligible_cost_categories', 'Initial AP policy permits only service variable and other direct costs once', a.ap_eligible_cost_categories);
  if (a.constant_inventory.value !== null && p.opening.inventory.value !== null && !close(a.constant_inventory.value, p.opening.inventory.value))
    add('SOURCE_CONFLICT', '/assumptions/constant_inventory', 'Constant inventory must reconcile to opening inventory', a.constant_inventory);
  if (a.existing_depreciation_per_year.value !== null && p.opening.assets.every(asset => ready(asset.monthly_depreciation)) &&
    !close(a.existing_depreciation_per_year.value, p.opening.assets.reduce((sum, asset) => sum + asset.monthly_depreciation.value! * 12, 0)))
    add('ASSET_SCHEDULE_CONFLICT', '/assumptions/existing_depreciation_per_year', 'Summary depreciation reconciles to assets; it is never an additional charge', a.existing_depreciation_per_year);
  checkExpenses(p, add);
  p.reconciliations.forEach((row, i) => { if (!row.review) add('REVIEW_REQUIRED', `/reconciliations/${i}`, 'Source discrepancy resolutions require review'); });
  const blocking = issues.filter(issue => issue.severity === 'blocking');
  return {
    mapping_version: MAPPING_VERSION, input_eligible: blocking.length === 0,
    execution_available: false as const, monte_carlo_eligible: false as const,
    issues, historical_tickets: historicalTickets(p, new Set(p.history.filter((_, i) => blocking.some(issue => issue.code === 'SOURCE_CONFLICT' && issue.pointer.startsWith(`/history/${i}/`))).map(row => row.row_id))),
  };
}

function checkExpenses(p: ProfilePayload, add: (code: string, pointer: string, message: string, field?: Field) => void) {
  const o = p.operations;
  const buckets: Record<string, number | null> = {
    fixed_overhead_per_month: o.fixed_overhead_per_month.value,
    non_service_direct_cost_per_month: o.non_service_direct_cost_per_month.value,
    tech_direct_labor: o.loaded_technician_cost.value === null || o.service_technicians_employed.value === null ? null : o.loaded_technician_cost.value * o.service_technicians_employed.value / 12,
    vehicle_direct_opex: o.fleet_operating_cost.value === null || o.service_vehicles_available.value === null ? null : o.fleet_operating_cost.value * o.service_vehicles_available.value / 12,
  };
  const groups = new Map<string, typeof p.expense_ledger>();
  p.expense_ledger.forEach((row, i) => {
    const pointer = `/expense_ledger/${i}`;
    if (row.irregular_payment.value === true) add('IRREGULAR_BASELINE_CASH', `${pointer}/irregular_payment`, 'Material irregular payments require baseline scheduling support', row.irregular_payment);
    if (row.currency.value && row.currency.value !== 'USD') add('UNSUPPORTED_CURRENCY', `${pointer}/currency`, 'Expense source currency must be USD', row.currency);
    if (row.coverage_start.value && row.coverage_end.value && row.coverage_start.value > row.coverage_end.value) add('SOURCE_CONFLICT', pointer, 'Expense coverage dates are reversed');
    const bucket = row.target_bucket.value;
    if (!bucket) return;
    if (!Object.hasOwn(buckets, bucket)) add('DUPLICATE_COST_MAPPING', `${pointer}/target_bucket`, 'Unsupported baseline bucket; principal, interest, assets and depreciation need separate schedules', row.target_bucket);
    groups.set(bucket, [...(groups.get(bucket) ?? []), row]);
  });
  for (const [bucket, rows] of groups) {
    if (rows.some(row => !ready(row.normalized_recognition_amount) || !ready(row.mapping_mode))) continue;
    const modes = new Set(rows.map(row => row.mapping_mode.value));
    const total = rows.reduce((sum, row) => sum + row.normalized_recognition_amount.value!, 0);
    const target = buckets[bucket];
    if (modes.size !== 1 || (target != null && (modes.has('replace_total') ? !close(total, target) : total > target && !close(total, target))))
      add('DUPLICATE_COST_MAPPING', '/expense_ledger', 'Replacement details must equal their bucket; included details add nothing and cannot exceed it or overlap replacement rows');
  }
}
