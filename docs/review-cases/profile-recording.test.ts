import test from 'node:test';
import assert from 'node:assert/strict';
import { setup, syntheticResult } from '../../tests/profile-mc-fixture.ts';
import { ProfileMonteCarloJobs } from '../../src/lib/server/monte-carlo/profile-jobs.ts';
test('P1 in-memory recording retrieval binds owner, revision, seed, plan and deletion',async()=>{
 const {store,input,id}=setup();
 try{
  const jobs=new ProfileMonteCarloJobs(store,{execute:async(c,r,f,o)=>syntheticResult(c,r,f,o)});
  const receipt=jobs.submit('owner',input);
  await new Promise(r=>setImmediate(r));
  const saved=jobs.record('owner',receipt.job.job_id,receipt.job.access_token);
  assert.deepEqual(store.readMonteCarloRecording('owner',saved.recording_id,input),saved);
  assert.throws(()=>store.readMonteCarloRecording('foreign',saved.recording_id,input));
  assert.throws(()=>jobs.record('owner',receipt.job.job_id,'bad-token'));
  for(const mutate of [q=>q.request.reserve_floor_usd++,q=>q.request.exit_multiple++,q=>q.request.monte_carlo.seed++,q=>q.company.revision++]){
   const altered=structuredClone(input);mutate(altered);
   assert.throws(()=>store.readMonteCarloRecording('owner',saved.recording_id,altered));
  }
  const altered=structuredClone(saved);altered.recording.result.seed++;
  assert.equal(store.readMonteCarloRecording('owner',saved.recording_id,input).recording.result.seed,42);
  store.delete('owner',id);
  assert.throws(()=>store.readMonteCarloRecording('owner',saved.recording_id,input));
  assert.throws(()=>jobs.result('owner',receipt.job.job_id,receipt.job.access_token));
 }finally{store.close();}
});
