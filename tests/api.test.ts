import assert from 'node:assert/strict';
import test from 'node:test';
import { z } from 'zod';
import { GET as companyGET } from '../src/routes/api/v1/company/demo/+server.ts';
import { GET as metadataGET } from '../src/routes/api/v1/model/metadata/+server.ts';
import { loadDemoCompany } from '../src/lib/server/api/company.ts';
import { apiResponse, normalizeApiError, readApiInput } from '../src/lib/server/api/http.ts';
import { ApiErrorSchema, CompanyInputSchema, ModelMetadataSchema, INTERFACE_REVISION } from '../src/lib/server/schemas.ts';

test('company endpoint returns the accepted actual fixture and complete provenance', async () => {
  const response = await companyGET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const company = CompanyInputSchema.parse(await response.json());
  assert.equal(company.id, 'synthetic-hvac-001');
  assert.equal(company.historical_months.length, 12);
  assert.equal(company.provenance['/operations/working_days_per_month'].unit, 'days/month');
  assert.deepEqual(company, loadDemoCompany());
});

test('fixture loading returns independent objects across requests', () => {
  const first = loadDemoCompany();
  first.operations.technicians = 999;
  first.historical_months[0].revenue = 0;
  first.provenance['/id'].unit = 'broken';
  const next = loadDemoCompany();
  assert.equal(next.operations.technicians, 12);
  assert.equal(next.historical_months[0].revenue, 5000000 / 12);
  assert.equal(next.provenance['/id'].unit, 'label');
});

test('metadata exposes approved versions, all decisions/metrics and accepted deterministic and unavailable MC readiness', async () => {
  const response = await metadataGET();
  assert.equal(response.status, 200);
  const metadata = ModelMetadataSchema.parse(await response.json());
  assert.equal(metadata.interface_revision, INTERFACE_REVISION);
  assert.deepEqual(metadata.readiness, { deterministic: true, monte_carlo: false });
  assert.deepEqual(metadata.decision_types, ['purchase_trucks', 'hire_technicians', 'increase_marketing']);
  const byKey = Object.fromEntries(metadata.metrics.map(metric => [metric.key, metric]));
  assert.equal(Object.keys(byKey).length, 9);
  assert.equal(byKey.ebitda.unit, 'USD/month');
  assert.equal(byKey.ttm_ebitda.unit, 'USD');
  assert.equal(byKey.utilization.unit, 'decimal_ratio');
  assert.equal(byKey.cash_end.available_at_opening, true);
  assert.equal(byKey.revenue.available_at_opening, false);
  assert.equal(byKey.equity_value.available_at_opening, false);
  const duplicate = structuredClone(metadata); duplicate.metrics[0] = duplicate.metrics[1];
  assert.equal(ModelMetadataSchema.safeParse(duplicate).success, false);
});

const inputSchema = z.strictObject({ quantity: z.number().int().nonnegative() });
const bodyRequest = (body: string) => new Request('http://localhost/api/v1/test', { method: 'POST', body, headers: { 'content-type': 'application/json' } });
test('incoming malformed JSON is a structured 400, invalid fields are a structured 422', async () => {
  const errors: unknown[] = [];
  const malformed = await apiResponse(() => readApiInput(bodyRequest('{'), inputSchema), error => errors.push(error));
  assert.equal(malformed.status, 400);
  assert.equal(ApiErrorSchema.parse(await malformed.json()).error.code, 'INVALID_JSON');
  const invalid = await apiResponse(() => readApiInput(bodyRequest('{"quantity":-1}'), inputSchema), error => errors.push(error));
  assert.equal(invalid.status, 422);
  const payload = ApiErrorSchema.parse(await invalid.json());
  assert.equal(payload.error.code, 'VALIDATION_ERROR');
  assert.equal(payload.error.details[0].path, '/quantity');
  assert.equal(errors.length, 0);
  const valid = await apiResponse(() => readApiInput(bodyRequest('{"quantity":0}'), inputSchema));
  assert.equal(valid.status, 200);
  assert.deepEqual(await valid.json(), { quantity: 0 });
});

test('internal and output-validation failures log internally and return generic structured 500', async () => {
  for (const operation of [
    () => { throw new Error('private engine diagnostic'); },
    () => CompanyInputSchema.parse({ id: 'broken fixture' }),
  ]) {
    const errors: unknown[] = [];
    const response = await apiResponse(operation, error => errors.push(error));
    assert.equal(response.status, 500);
    assert.equal(errors.length, 1);
    assert.deepEqual(ApiErrorSchema.parse(await response.json()), {
      error: { code: 'INTERNAL_ERROR', message: 'The request could not be completed.', details: [] },
    });
  }
});

test('framework API errors normalize to the shared shape without leaking HTML or internal details', async () => {
  for (const [status, code] of [[404, 'NOT_FOUND'], [405, 'METHOD_NOT_ALLOWED'], [500, 'INTERNAL_ERROR']] as const) {
    const response = await normalizeApiError(new Response('<p>private framework details</p>', {
      status, headers: { 'content-type': 'text/html', allow: 'GET', 'content-length': '100' },
    }));
    assert.equal(response.status, status);
    assert.equal(response.headers.get('allow'), 'GET');
    assert.equal(response.headers.get('content-type'), 'application/json');
    const body = await response.text();
    assert.equal(response.headers.get('content-length'), String(Buffer.byteLength(body)));
    const payload = ApiErrorSchema.parse(JSON.parse(body));
    assert.equal(payload.error.code, code);
    assert.ok(!payload.error.message.includes('private'));
  }
  const existing = await apiResponse(() => readApiInput(bodyRequest('{"quantity":-1}'), inputSchema));
  assert.equal(await normalizeApiError(existing), existing);
});

// Compare transport output against the independently reviewed generated engine artifact.
test('deterministic API returns the real complete reference response with unique run identity', async () => {
  const { POST } = await import('../src/routes/api/v1/simulate/deterministic/+server.ts');
  const { readFileSync } = await import('node:fs');
  const { SimulationResultSchema } = await import('../src/lib/server/schemas.ts');
  const input = JSON.parse(readFileSync(new URL('../contracts/example-request.json', import.meta.url), 'utf8'));
  const expected = JSON.parse(readFileSync(new URL('../contracts/example-result.json', import.meta.url), 'utf8'));
  const run = async () => {
    const response = await POST({ request: bodyRequest(JSON.stringify(input)) });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    return SimulationResultSchema.parse(await response.json());
  };
  const first = await run(); const second = await run();
  assert.notEqual(first.run_id, second.run_id);
  assert.deepEqual({ ...first, run_id: expected.run_id }, expected);
  assert.deepEqual({ ...second, run_id: expected.run_id }, expected);
});

test('deterministic API rejects malformed, invalid, unknown-company and MC requests as user errors', async () => {
  const { POST } = await import('../src/routes/api/v1/simulate/deterministic/+server.ts');
  const { readFileSync } = await import('node:fs');
  const input = JSON.parse(readFileSync(new URL('../contracts/example-request.json', import.meta.url), 'utf8'));
  for (const [body, status, pointer] of [
    ['{', 400, undefined],
    [JSON.stringify({ ...input, company_id: 'missing' }), 422, '/company_id'],
    [JSON.stringify({ ...input, horizon_months: 12 }), 422, '/horizon_months'],
    [JSON.stringify({ ...input, monte_carlo: { enabled: true } }), 422, undefined],
  ] as const) {
    const response = await POST({ request: bodyRequest(body) });
    assert.equal(response.status, status);
    const payload = ApiErrorSchema.parse(await response.json());
    if (pointer) assert.ok(payload.error.details.some(detail => detail.path === pointer));
  }
});
