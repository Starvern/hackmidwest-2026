import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { ApiErrorSchema, CompanyInputSchema, ModelMetadataSchema, SimulationResultSchema } from '../src/lib/server/schemas.ts';

const base = process.env.OPERATOROS_API_BASE_URL ?? 'http://127.0.0.1:4173';
const companyResponse = await fetch(`${base}/api/v1/company/demo`);
assert.equal(companyResponse.status, 200);
assert.equal(CompanyInputSchema.parse(await companyResponse.json()).id, 'synthetic-hvac-001');
const metadataResponse = await fetch(`${base}/api/v1/model/metadata`);
assert.equal(metadataResponse.status, 200);
assert.deepEqual(ModelMetadataSchema.parse(await metadataResponse.json()).readiness, { deterministic: true, monte_carlo: false });
const health = await fetch(`${base}/api/v1/health`);
assert.equal(health.status, 200);
assert.deepEqual(await health.json(), { status: 'ok', simulation_ready: true });
for (const [path, method, status, code] of [
  ['/api/v1/company/demo', 'POST', 405, 'METHOD_NOT_ALLOWED'],
  ['/api/v1/missing', 'GET', 404, 'NOT_FOUND'],
  ['/api/v1/simulate/deterministic', 'GET', 405, 'METHOD_NOT_ALLOWED'],
] as const) {
  const response = await fetch(`${base}${path}`, { method, headers: { accept: 'application/json', 'content-type': 'application/json' } });
  assert.equal(response.status, status, path);
  assert.equal(ApiErrorSchema.parse(await response.json()).error.code, code, path);
}
const input = JSON.parse(readFileSync(new URL('../contracts/example-request.json', import.meta.url), 'utf8'));
const simulated = await fetch(base + '/api/v1/simulate/deterministic', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) });
assert.equal(simulated.status, 200);
const result = SimulationResultSchema.parse(await simulated.json());
const expected = JSON.parse(readFileSync(new URL('../contracts/example-result.json', import.meta.url), 'utf8'));
assert.deepEqual({ ...result, run_id: expected.run_id }, expected);
const malformed = await fetch(base + '/api/v1/simulate/deterministic', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' });
assert.equal(malformed.status, 400);
assert.equal(ApiErrorSchema.parse(await malformed.json()).error.code, 'INVALID_JSON');
const page = await fetch(base);
assert.equal(page.status, 200);
assert.match(page.headers.get('content-type') ?? '', /text\/html/);
console.log('PASS: live company/metadata/health, structured 404/405, real deterministic response and malformed-input rejection and existing page.');
