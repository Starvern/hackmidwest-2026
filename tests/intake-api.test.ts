import test from 'node:test';
import assert from 'node:assert/strict';
import type { RequestEvent } from '@sveltejs/kit';
import { ProfileStore } from '../src/lib/server/intake/store.ts';
import { intakeApi } from '../src/lib/server/intake/api.ts';
import { intakeTemplate } from '../src/lib/server/intake/template.ts';
import { fieldEntries } from '../src/lib/intake/form.ts';
import { eligibleFixture } from './intake-fixture.ts';

function client(store: ProfileStore) {
  const cookies = new Map<string, string>(); let options: unknown;
  const handle = intakeApi(store);
  return { cookies, get options() { return options; }, async call(path: string, method = 'GET', body?: unknown, origin = 'http://127.0.0.1:4175') {
    const url = new URL('http://127.0.0.1:4175/api/v2/intake' + path);
    const request = new Request(url, { method, headers: { ...(method === 'GET' ? {} : { origin }), ...(body === undefined ? {} : { 'content-type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return handle({ url, request, cookies: { get: (name: string) => cookies.get(name), set: (name: string, value: string, opts: unknown) => { cookies.set(name, value); options = opts; } } } as unknown as RequestEvent);
  } };
}
test('blank manual template carries dates but no demo values, source claims or forecast assumptions', () => {
  const t = intakeTemplate('2026-12-31');
  assert.equal(t.profile.history.length, 12);
  assert.equal(t.profile.operations.forecast_ticket.value, null);
  assert.equal(t.profile.business.forecast_start.value, null);
  assert.deepEqual(t.profile.sources, []);
  assert.equal(fieldEntries(t.profile).filter(f => f.field.value !== null).length, 1);
});
test('sessions use private cookies and reject cross-origin writes, forged tokens and foreign profile access', async () => {
  const store = new ProfileStore(':memory:');
  try {
    const a = client(store), b = client(store);
    assert.equal((await a.call('/profiles')).status, 401);
    assert.equal((await a.call('/session', 'POST', undefined, 'https://elsewhere.example')).status, 403);
    assert.equal((await a.call('/session', 'POST')).status, 200);
    assert.deepEqual(a.options, { path: '/', httpOnly: true, sameSite: 'strict', secure: false, maxAge: 2592000 });
    await b.call('/session','POST');
    const created = await (await a.call('/profiles','POST',eligibleFixture())).json();
    assert.equal(created.profile.opening.cash.state, 'entered');
    assert.equal(created.profile.opening.cash.review, null);
    assert.equal((await b.call(`/profiles/${created.profile_id}?revision=1`)).status, 404);
    assert.equal((await b.call(`/profiles/${created.profile_id}`, 'DELETE')).status, 404);
    assert.equal((await a.call('/profiles')).headers.get('cache-control'), 'no-store');
    a.cookies.set('operatoros_intake_session', '0'.repeat(64));
    assert.equal((await a.call('/profiles')).status, 401);
  } finally { store.close(); }
});
test('HTTP review -> real preview -> acknowledge -> confirm -> bound deterministic run uses only the session owner', async () => {
  const store = new ProfileStore(':memory:');
  try {
    const a = client(store); await a.call('/session','POST');
    const created = await (await a.call('/profiles','POST',eligibleFixture())).json(), id = created.profile_id;
    const selections = fieldEntries(created.profile).filter(e => e.field.value !== null).map(e => ({ pointer: e.pointer, state: 'confirmed', rationale: 'Reviewed synthetic evidence' }));
    selections.push({ pointer: '/sources/0', state: 'confirmed', rationale: 'Reviewed synthetic source' });
    assert.equal((await a.call(`/profiles/${id}/review`,'POST',{ revision: 1, selections, actor_id: 'forged' })).status, 422);
    const reviewed = await (await a.call(`/profiles/${id}/review`,'POST',{ revision: 1, selections })).json();
    assert.notEqual(reviewed.profile.opening.cash.review.actor_id, 'owner');
    const preview = await (await a.call(`/profiles/${id}/preview`,'POST',{ revision: 2 })).json();
    assert.equal(preview.baseline.months[1].operations.completed_jobs, 480);
    assert.equal((await a.call(`/profiles/${id}/confirm`,'POST',{ revision: 2 })).status, 409);
    assert.equal((await a.call(`/profiles/${id}/acknowledge`,'POST',{ revision: 2, preview_id: preview.preview_id })).status, 200);
    const confirmed = await (await a.call(`/profiles/${id}/confirm`,'POST',{ revision: 2 })).json();
    const binding = confirmed.compiled.binding;
    const response = await a.call('/simulate','POST',{ simulation_version: 'profile-simulation-2-draft', company: binding, request: {
      schema_version: '1.0', company_id: confirmed.compiled.company.id, horizon_months: 60, reserve_floor_usd: 500, exit_multiple: 5,
      scenarios: [{ id: 'baseline', name: 'Baseline', decisions: [] },{ id: 'a', name: 'A', decisions: [] },{ id: 'b', name: 'B', decisions: [] }],
    } });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).company, binding);
    assert.equal((await a.call(`/profiles/${id}`,'DELETE')).status, 200);
    assert.equal((await a.call(`/profiles/${id}?revision=2`)).status, 404);
  } finally { store.close(); }
});
test('JSON request limit applies before payload parsing', async () => {
  const store = new ProfileStore(':memory:');
  try {
    const a = client(store); await a.call('/session','POST');
    assert.equal((await a.call('/profiles','POST',{ big: 'x'.repeat(1024 * 1024) })).status, 413);
  } finally { store.close(); }
});
