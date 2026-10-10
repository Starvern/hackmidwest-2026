import assert from 'node:assert/strict';
import { ApiErrorSchema, CompanyInputSchema, ModelMetadataSchema } from '../src/lib/server/schemas.ts';

const base = process.env.OPERATOROS_API_BASE_URL ?? 'http://127.0.0.1:4173';
const companyResponse = await fetch(`${base}/api/v1/company/demo`);
assert.equal(companyResponse.status, 200);
assert.equal(CompanyInputSchema.parse(await companyResponse.json()).id, 'synthetic-hvac-001');
const metadataResponse = await fetch(`${base}/api/v1/model/metadata`);
assert.equal(metadataResponse.status, 200);
assert.deepEqual(ModelMetadataSchema.parse(await metadataResponse.json()).readiness, { deterministic: false, monte_carlo: false });
const health = await fetch(`${base}/api/v1/health`);
assert.equal(health.status, 200);
assert.deepEqual(await health.json(), { status: 'ok', simulation_ready: false });
for (const [path, method, status, code] of [
  ['/api/v1/company/demo', 'POST', 405, 'METHOD_NOT_ALLOWED'],
  ['/api/v1/missing', 'GET', 404, 'NOT_FOUND'],
  ['/api/v1/simulate/deterministic', 'POST', 404, 'NOT_FOUND'],
] as const) {
  const response = await fetch(`${base}${path}`, { method, headers: { accept: 'application/json' } });
  assert.equal(response.status, status, path);
  assert.equal(ApiErrorSchema.parse(await response.json()).error.code, code, path);
}
const page = await fetch(base);
assert.equal(page.status, 200);
assert.match(page.headers.get('content-type') ?? '', /text\/html/);
console.log('PASS: live company/metadata/health, structured 404/405, absent simulation route and existing page.');
