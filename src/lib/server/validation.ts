import type { z } from 'zod';

type IssueContext = z.RefinementCtx;
type JsonObject = Record<string, unknown>;
const escapePointer = (key: string) => key.replaceAll('~', '~0').replaceAll('/', '~1');

export function scalarLeaves(value: unknown, path = ''): [string, unknown][] {
	if (Array.isArray(value)) return value.flatMap((entry, i) => scalarLeaves(entry, `${path}/${i}`));
	if (value !== null && typeof value === 'object') {
		return Object.entries(value).filter(([key]) => key !== 'provenance')
			.flatMap(([key, entry]) => scalarLeaves(entry, `${path}/${escapePointer(key)}`));
	}
	return [[path, value]];
}

/** Explicit input unit vocabulary, shared by fixture/decision validators and example tooling. */
export function inputUnit(pointer: string, value: unknown): string {
	const field = pointer.split('/').at(-1)!;
	if (typeof value === 'string' || typeof value === 'boolean' || value === null) return 'label';
	if (pointer.includes('/seasonality/')) return 'multiple';
	if (pointer.includes('/distribution_parameters/')) throw new Error('Distribution parameter units require an approved MC manifest');
	if (field === 'working_days_per_month') return 'days/month';
	if (field === 'month_of_year' || field === 'forecast_start_month_of_year') return 'calendar_month_index';
	if (field === 'service_jobs' || field === 'base_monthly_job_demand') return 'jobs/month';
	if (field.startsWith('max_jobs_per_')) return 'jobs/resource/day';
	if (field === 'average_ticket') return 'USD/job';
	if (['quantity', 'technicians', 'vehicles'].includes(field)) return 'count';
	if (field === 'valuation_multiple') return 'multiple';
	if (field.endsWith('_rate') || field.endsWith('_growth') || field.endsWith('_inflation') || field === 'debt_fraction') return 'decimal_rate';
	if (field.endsWith('_year') || field === 'fully_loaded_annual_cost_per_person') return 'USD/year';
	if (field.endsWith('_per_month') || field === 'baseline_marketing_in_overhead' || field === 'monthly_principal' || field === 'monthly_depreciation') return 'USD/month';
	if (field.endsWith('_months') || field.endsWith('_month') || field === 'start_month') return 'months';
	return 'USD';
}

export function validateProvenance(
	value: { provenance: Record<string, { unit: string }> }, ctx: IssueContext
) {
	const leaves = scalarLeaves(value);
	const expected = new Set(leaves.map(([pointer]) => pointer));
	for (const [pointer, entry] of leaves) {
		const path = ['provenance', pointer];
		const provenance = value.provenance[pointer];
		if (!provenance) { ctx.addIssue({ code: 'custom', path, message: 'Missing scalar-leaf provenance' }); continue; }
		try {
			const unit = inputUnit(pointer, entry);
			if (provenance.unit !== unit) ctx.addIssue({ code: 'custom', path: [...path, 'unit'], message: `Expected ${unit}` });
		} catch (error) {
			ctx.addIssue({ code: 'custom', path, message: (error as Error).message });
		}
	}
	for (const pointer of Object.keys(value.provenance)) {
		if (!expected.has(pointer)) ctx.addIssue({ code: 'custom', path: ['provenance', pointer], message: 'Provenance must point to an existing input scalar leaf' });
	}
}

export function uniqueIds(values: { id: string }[], path: (string | number)[], ctx: IssueContext) {
	const seen = new Set<string>();
	values.forEach((value, i) => {
		if (seen.has(value.id)) ctx.addIssue({ code: 'custom', path: [...path, i, 'id'], message: 'Duplicate ID' });
		seen.add(value.id);
	});
}

/** Stable representation for equality checks; rejects all non-JSON and nonfinite values. */
export function canonicalJson(value: unknown): string {
	if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
	if (typeof value === 'number') {
		if (!Number.isFinite(value)) throw new TypeError('Nonfinite number');
		return JSON.stringify(Object.is(value, -0) ? 0 : value);
	}
	if (Array.isArray(value)) return `[${Array.from(value, canonicalJson).join(',')}]`;
	if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype && Object.getOwnPropertySymbols(value).length === 0) {
		return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson((value as JsonObject)[key])}`).join(',')}}`;
	}
	throw new TypeError('Expected plain JSON value');
}

export function validateRequest(value: {
	scenarios: { id: string; decisions: { id: string; stable_investment_key: string; provenance: unknown }[] }[]
}, ctx: IssueContext) {
	uniqueIds(value.scenarios, ['scenarios'], ctx);
	if (value.scenarios.length < 3) ctx.addIssue({ code: 'custom', path: ['scenarios'], message: 'Require baseline and at least two alternatives' });
	const baseline = value.scenarios.filter(s => s.id === 'baseline');
	if (baseline.length !== 1 || baseline[0].decisions.length !== 0) ctx.addIssue({ code: 'custom', path: ['scenarios'], message: 'Require exactly one empty baseline' });
	const reused = new Map<string, string>();
	value.scenarios.forEach((scenario, i) => {
		const keys = new Set<string>();
		scenario.decisions.forEach((decision, j) => {
			const { id, provenance, ...action } = decision;
			void id; void provenance;
			const serialized = canonicalJson(action);
			const previous = reused.get(decision.stable_investment_key);
			if (keys.has(decision.stable_investment_key) || (previous !== undefined && previous !== serialized)) {
				ctx.addIssue({ code: 'custom', path: ['scenarios', i, 'decisions', j, 'stable_investment_key'], message: 'Investment key is duplicated locally or reused with conflicting economic parameters' });
			}
			keys.add(decision.stable_investment_key);
			reused.set(decision.stable_investment_key, serialized);
		});
	});
}
