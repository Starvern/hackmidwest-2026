import assert from 'node:assert/strict';
import test from 'node:test';
import { requestJson } from '../src/lib/dashboard/api.ts';

test('dashboard client preserves API validation details and request options', async () => {
  const init = {method:'POST', headers:{'content-type':'application/json'},body:'{"quantity":-1}'};
  await assert.rejects(requestJson('/api/v1/simulate/deterministic',init,async (url,options) => {
    assert.equal(url,'/api/v1/simulate/deterministic'); assert.deepEqual(options,init);
    return Response.json({error:{message:'Request validation failed.',details:[{path:'/quantity',message:'Must be nonnegative'}]}},{status:422});
  }), /Request validation failed\. \/quantity: Must be nonnegative/);
});

test('dashboard client handles network, cancellation, HTML and malformed errors without raw parser diagnostics', async () => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(requestJson('/api/v1/health',{},async()=>{throw new TypeError('private network implementation');}),/Could not reach the server/);
  await assert.rejects(requestJson('/api/v1/health',{signal:controller.signal},async()=>{throw new Error('aborted');}),/request was cancelled/);
  for (const [response,message] of [
    [new Response('<h1>private proxy diagnostic</h1>',{status:502}),/HTTP 502/],
    [new Response('{',{status:200}),/unreadable response/],
    [Response.json({error:{details:[null,{}]}},{status:500}),/HTTP 500/],
  ] as const) await assert.rejects(requestJson('/api/v1/health',{},async()=>response),message);
});

test('dashboard client permits an explicit successful retry without automatic duplicate submissions', async () => {
  let calls=0;
  const fetcher: typeof fetch = async()=>{calls++;return calls===1 ? new Response('Unavailable',{status:503}) : Response.json({run_id:'retry-success'});};
  await assert.rejects(requestJson('/api/v1/simulate/deterministic',{},fetcher),/HTTP 503/);
  assert.equal(calls,1);
  assert.deepEqual(await requestJson('/api/v1/simulate/deterministic',{},fetcher),{run_id:'retry-success'});
  assert.equal(calls,2);
});
