import test from 'node:test';
import assert from 'node:assert/strict';
import example from '../contracts/example-request.json' with {type:'json'};
import type {DeterministicRequest} from '../contracts/contracts.ts';
import {MonteCarloRequestSchema} from '../src/lib/server/schemas.ts';
import {MCJobStatusSchema} from '../src/lib/server/monte-carlo/jobs-contracts.ts';
import {MonteCarloJobs} from '../src/lib/server/monte-carlo/jobs.ts';
import {loadDemoCompany} from '../src/lib/server/api/company.ts';
import {loadMonteCarloConfig} from '../src/lib/server/monte-carlo/config.ts';
import {createRiskController,emptyRiskState,riskRequest} from '../src/lib/dashboard/monte-carlo.ts';
test('preview is exactly 100 paths; default full request stays 2000 and intermediate sizes reject',()=>{
 const request=example as unknown as DeterministicRequest;
 assert.equal(riskRequest(request,42).monte_carlo.runs,2000);
 assert.equal(MonteCarloRequestSchema.parse(riskRequest(request,42,100)).monte_carlo.runs,100);
 for(const runs of [0,99,101,1000])assert.equal(MonteCarloRequestSchema.safeParse({...request,monte_carlo:{enabled:true,runs,seed:42}}).success,false);
});
test('preview queue reports 100 total paths and rejects progress beyond that bound',async()=>{
 const original=console.error;console.error=()=>{};
 try{
  const jobs=new MonteCarloJobs({execute:async(_c,_r,_f,options)=>{
   for(let n=1;n<=101;n++)options.onProgress!(n);
   throw new Error('Progress overflow was not rejected');
  }});
  const job=jobs.submit(loadDemoCompany(),riskRequest(example as unknown as DeterministicRequest,42,100),loadMonteCarloConfig());
  assert.equal(job.total_runs,100);assert.equal(MCJobStatusSchema.parse(jobs.status(job.job_id,job.access_token)).total_runs,100);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(jobs.status(job.job_id,job.access_token).state,'failed');
  assert.equal(jobs.status(job.job_id,job.access_token).completed_runs,100);
  assert.throws(()=>jobs.result(job.job_id,job.access_token),/not available/);
 }finally{console.error=original;}
});
test('preview client refuses a full-run result or mismatched progress rather than relabeling it',async()=>{
 for(const wrongTotal of [false,true]){
  let state=emptyRiskState();const id='11111111-1111-4111-8111-111111111111',base=`/api/v1/simulate/monte-carlo/jobs/${id}`;
  const status={job_id:id,state:'succeeded',completed_runs:100,total_runs:wrongTotal?2000:100};
  const fetcher=(async(url,init)=>new Response(JSON.stringify(init?.method==='POST'?{...status,access_token:'a'.repeat(64),status_url:base,result_url:base+'/result'}:String(url).endsWith('/result')?{run_id:id,company_id:example.company_id,seed:42,runs:2000}:status))) as typeof fetch;
  const controller=createRiskController(value=>state=value,fetcher);
  await controller.start(riskRequest(example as unknown as DeterministicRequest,42,100));
  assert.equal(state.result,null);assert.match(state.error,/different job or run count|does not match/);controller.dispose();
 }
});
