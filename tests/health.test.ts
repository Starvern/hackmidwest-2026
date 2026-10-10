import assert from 'node:assert/strict';
import test from 'node:test';
import { GET } from '../src/routes/api/v1/health/+server.ts';

test('health reports HTTP availability separately from simulation readiness', async () => {
	const response = GET();
	assert.equal(response.status, 200);
	assert.match(response.headers.get('content-type') ?? '', /application\/json/);
	assert.deepEqual(await response.json(), { status: 'ok', simulation_ready: false });
});
