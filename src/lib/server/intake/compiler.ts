import { z } from 'zod';
import { CompanyInputSchema, APPROVED_POLICIES, NEUTRAL_MARKET_FACTORS } from '../schemas.ts';
import { scalarLeaves, inputUnit } from '../validation.ts';
import { sha256Canonical } from '../fingerprint.ts';
import { simulate_months } from '../engine/scenarios.ts';
import { ProfilePayloadSchema, CompanyBindingSchema, PROFILE_VERSION, MAPPING_VERSION } from './schemas.ts';
import { assessIntake } from './eligibility.ts';

export const ProfileIdentitySchema = z.strictObject({ profile_id: z.uuid(), revision: z.number().int().positive() });
export type ProfileIdentity = z.infer<typeof ProfileIdentitySchema>;
type Field = { value: unknown; state: string; source_ids: string[]; derivation: { inputs: string[] } | null; review: { actor_id: string } | null };
function resolve(root: unknown, pointer: string): unknown {
  if (!pointer.startsWith('/')) throw new Error('Invalid profile dependency');
  return pointer.slice(1).split('/').reduce<unknown>((value, part) => {
    const key = part.replaceAll('~1', '/').replaceAll('~0', '~');
    return value && typeof value === 'object' && Object.hasOwn(value, key) ? (value as Record<string, unknown>)[key] : undefined;
  }, root);
}

/** Internal compiler candidate. Caller supplies server identity; this does not authorize a run. */
export function compileProfile(input: unknown, identityValue: ProfileIdentity) {
  const identity = ProfileIdentitySchema.parse(identityValue);
  const profile = ProfilePayloadSchema.parse(input);
  const report = assessIntake(profile);
  if (!report.input_eligible) throw new Error('Intake has blocking preflight issues');
  const fields = new Map<string, Field>();
  function visit(value: unknown, pointer: string) {
    if (!value || typeof value !== 'object') return;
    if ('state' in value && 'value' in value) {
      const field = value as Field;
      fields.set(pointer, field);
      for (const dependency of field.derivation?.inputs ?? []) {
        if (dependency === pointer || resolve(profile, dependency) === undefined) throw new Error('Unresolved profile derivation dependency');
      }
      return;
    }
    Object.entries(value).forEach(([key, child]) => visit(child, `${pointer}/${key}`));
  }
  visit(profile, '');
  const visiting = new Set<string>(), visited = new Set<string>();
  function checkDependencies(pointer: string) {
    if (visiting.has(pointer)) throw new Error('Cyclic profile derivation dependency');
    if (visited.has(pointer)) return;
    visiting.add(pointer);
    for (const dependency of fields.get(pointer)?.derivation?.inputs ?? []) {
      const field = fields.get(dependency);
      if (!field || field.value === null || !['confirmed', 'reviewed_estimate'].includes(field.state)) throw new Error('Unreviewed profile derivation dependency');
      checkDependencies(dependency);
    }
    visiting.delete(pointer); visited.add(pointer);
  }
  for (const pointer of fields.keys()) checkDependencies(pointer);
  // Reconciliation prose cannot waive a conflicting arithmetic value or unresolved pointer.
  for (const record of profile.reconciliations) for (const pointer of record.pointers)
    if (!fields.has(pointer)) throw new Error('Unresolved reconciliation pointer');
  for (const record of profile.reviews) if (resolve(profile, record.pointer) === undefined)
    throw new Error('Unresolved review pointer');
  const dependencies = new Map<string, string[]>();
  const get = (target: string, pointer: string) => {
    const field = fields.get(pointer);
    if (!field || field.value === null) throw new Error('Missing compiled input');
    dependencies.set(target, [pointer]);
    return structuredClone(field.value);
  };
  const raw: Record<string, unknown> = {
    id: `profile:${identity.profile_id}`, name: get('/name', '/business/name'),
    industry: get('/industry', '/business/trade'), currency: get('/currency', '/business/currency'),
    model_version: 'mvp-1.0', valuation_month: 60, horizon_months: 60, forecast_start_month_of_year: 1,
  };
  raw.historical_months = profile.history.map((row, i) => Object.fromEntries([
    ['month_of_year', i + 1],
    ...Object.keys(row).filter(key => !['row_id', 'period', 'reported_profit', 'reported_profit_basis'].includes(key))
      .map(key => [key, get(`/historical_months/${i}/${key}`, `/history/${i}/${key}`)]),
  ]));
  const opening: Record<string, unknown> = Object.fromEntries(['cash', 'accounts_receivable', 'inventory', 'accounts_payable']
    .map(key => [key, get(`/opening_financial_state/${key}`, `/opening/${key}`)]));
  opening.debt_tranches = profile.opening.loans.map((row, i) => ({ id: `loan:${row.row_id}`,
    ...Object.fromEntries(Object.entries({ principal: 'outstanding_principal', annual_interest_rate: 'annual_rate', remaining_term_months: 'remaining_term', monthly_principal: 'monthly_principal', amortization_policy: 'amortization_policy' })
      .map(([target, field]) => [target, get(`/opening_financial_state/debt_tranches/${i}/${target}`, `/opening/loans/${i}/${field}`)])),
    first_repayment_month: 1,
  }));
  opening.depreciable_assets = profile.opening.assets.map((row, i) => ({ id: `asset:${row.row_id}`,
    ...Object.fromEntries(Object.entries({ cost_basis: 'cost_basis', accumulated_depreciation: 'accumulated_depreciation', monthly_depreciation: 'monthly_depreciation', remaining_life_months: 'remaining_life' })
      .map(([target, field]) => [target, get(`/opening_financial_state/depreciable_assets/${i}/${target}`, `/opening/assets/${i}/${field}`)])),
    in_service_month: 0,
  }));
  raw.opening_financial_state = opening;
  const operationAliases: Record<string, string> = {
    technicians: 'service_technicians_employed', vehicles: 'service_vehicles_available',
    max_jobs_per_tech_per_day: 'jobs_per_technician_day', max_jobs_per_vehicle_per_day: 'jobs_per_vehicle_day',
    base_monthly_job_demand: 'base_monthly_demand', average_ticket: 'forecast_ticket',
    technician_loaded_cost_per_year: 'loaded_technician_cost', vehicle_opex_per_year: 'fleet_operating_cost',
  };
  const operations = ['technicians', 'vehicles', 'working_days_per_month', 'max_jobs_per_tech_per_day', 'max_jobs_per_vehicle_per_day', 'base_monthly_job_demand', 'average_ticket',
    'non_service_revenue_per_month', 'technician_loaded_cost_per_year', 'vehicle_opex_per_year', 'service_variable_cost_rate', 'non_service_direct_cost_per_month', 'fixed_overhead_per_month', 'baseline_marketing_in_overhead'];
  raw.operations = Object.fromEntries(operations.map(key => [key, get(`/operations/${key}`, `/operations/${operationAliases[key] ?? key}`)]));
  const assumptions = Object.keys(profile.assumptions).filter(key => !['risk_configuration', 'seasonality'].includes(key));
  raw.global_assumptions = {
    ...Object.fromEntries(assumptions.map(key => [key, get(`/global_assumptions/${key}`, `/assumptions/${key}`)])),
    seasonality: profile.assumptions.seasonality.map((_, i) => get(`/global_assumptions/seasonality/${i}`, `/assumptions/seasonality/${i}`)),
    distribution_parameters: {}, // Explicit absence: company MC remains unavailable, never demo distributions.
  };
  const provenance = Object.fromEntries(scalarLeaves(raw).map(([pointer, value]) => {
    // Container leaves inherit their envelope's sources. Mapping constants retain policy dependencies.
    const parent = pointer.slice(0, pointer.lastIndexOf('/'));
    const inputs = dependencies.get(pointer) ?? dependencies.get(parent) ?? (
      pointer.startsWith('/historical_months/') ? [`/history/${pointer.split('/')[2]}/service_jobs`] :
      pointer.startsWith('/opening_financial_state/debt_tranches/') ? [`/opening/loans/${pointer.split('/')[3]}/next_payment_date`] :
      pointer.startsWith('/opening_financial_state/depreciable_assets/') ? [`/opening/assets/${pointer.split('/')[3]}/service_date`] : ['/business/forecast_start']);
    const sourceIds = [...new Set(inputs.flatMap(input => fields.get(input)?.source_ids ?? []))];
    return [pointer, { kind: 'profile_source', source: `${MAPPING_VERSION}:${identity.profile_id}:${identity.revision}:${inputs.join('|')}`, unit: inputUnit(pointer, value),
      profile_ref: { ...identity, mapping_version: MAPPING_VERSION, pointers: inputs, source_ids: sourceIds } }];
  }));
  const company = CompanyInputSchema.parse({ ...raw, provenance });
  const binding = CompanyBindingSchema.parse({ ...identity, profile_version: PROFILE_VERSION, mapping_version: MAPPING_VERSION,
    profile_fingerprint: sha256Canonical({ ...identity, mapping_version: MAPPING_VERSION, profile }),
    compiled_company_fingerprint: sha256Canonical({ company, mapping_version: MAPPING_VERSION }) });
  return { binding, company, source_sidecar: profile };
}

export function previewProfile(compiled: ReturnType<typeof compileProfile>) {
  const baseline_input_fingerprint = baselineInputFingerprint(compiled);
  const baseline = simulate_months(compiled.company, [], {
    scenario: { id: 'baseline', name: 'Starting picture' }, seed: null,
    monthly_market_factors: Array.from({ length: 60 }, () => NEUTRAL_MARKET_FACTORS),
    path_risks: { by_stable_investment_key: {} }, input_fingerprint: baseline_input_fingerprint,
  }, 60);
  return { ...compiled.binding, baseline_input_fingerprint, baseline };
}

export function baselineInputFingerprint(compiled: ReturnType<typeof compileProfile>) {
  return sha256Canonical({ company: compiled.company, policies: APPROVED_POLICIES, mapping_version: MAPPING_VERSION });
}
