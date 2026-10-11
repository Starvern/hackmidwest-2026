/** Actual 100-path HTTP/worker run; results stay in ignored local build output. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const base='http://127.0.0.1:5173',started=Date.now();
const request={...JSON.parse(readFileSync('contracts/example-request.json','utf8')),monte_carlo:{enabled:true,runs:100,seed:42}};
const response=await fetch(`${base}/api/v1/simulate/monte-carlo`,{method:'POST',headers:{'content-type':'application/json',origin:base},body:JSON.stringify(request)});
assert.equal(response.status,202,await response.clone().text());
const receipt=await response.json();assert.equal(receipt.total_runs,100);
const headers={'x-mc-job-token':receipt.access_token};let last=-1,complete=false;
try{
 while(Date.now()-started<10*60_000){
  const response=await fetch(base+receipt.status_url,{headers});assert.equal(response.status,200);
  const status=await response.json();assert.equal(status.total_runs,100);assert.ok(status.completed_runs<=100);
  if(status.completed_runs>=last+10){last=status.completed_runs;console.log(`${last}/100 paths (${Math.round((Date.now()-started)/1000)}s)`);}
  assert.ok(!['failed','cancelled'].includes(status.state),JSON.stringify(status));
  if(status.state==='succeeded'){
   const response=await fetch(base+receipt.result_url,{headers});assert.equal(response.status,200);
   const result=await response.json();assert.equal(result.runs,100);assert.equal(result.run_id,receipt.job_id);
   assert.equal(result.scenarios.baseline.path_risks.probability_cash_below_reserve_any_month.valid_path_count,100);
   writeFileSync('.mc-worker/preview-verification.json',JSON.stringify({elapsed_seconds:(Date.now()-started)/1000,result},null,2));
   complete=true;console.log(`PASS real 100-path HTTP preview: ${((Date.now()-started)/1000).toFixed(1)} seconds`);break;
  }
  await new Promise(resolve=>setTimeout(resolve,1000));
 }
 assert.ok(complete,'Preview timed out');
}finally{if(!complete)await fetch(base+receipt.status_url,{method:'DELETE',headers:{...headers,origin:base}});}
