import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {populatedWorkbook} from '../tests/intake-import-fixture.ts';
import {readXlsx} from '../src/lib/server/intake/xlsx.ts';
import {importWorkbook} from '../src/lib/server/intake/import.ts';
import {ProfileStore} from '../src/lib/server/intake/store.ts';
import {fieldEntries} from '../src/lib/intake/form.ts';
import {DeterministicRequestSchema} from '../src/lib/server/schemas.ts';
import {simulate_deterministic} from '../src/lib/server/engine/scenarios.ts';
import {addFlexibleDecision,editDecision} from '../src/lib/dashboard/model.ts';
const out='outputs/showcase-demo';mkdirSync(out,{recursive:true});
if(process.argv[2]==='prepare'){
 const sheets=readXlsx(populatedWorkbook());
 writeFileSync(`${out}/cells.json`,JSON.stringify(sheets.map(s=>({name:s.name,rows:[...s.rows].map(([n,c])=>[n,[...c].map(([col,v])=>[col,v.value])])}))));
}else{
 const bytes=readFileSync(`${out}/showcase-company.xlsx`), imported=importWorkbook(bytes);
 assert.equal(imported.profile.business.name.value,'Showcase HVAC (synthetic)');
 assert.equal(imported.profile.assumptions.risk_configuration.value,null);
 const store=new ProfileStore(':memory:');
 try{
  const owner='demo-verification',created=store.create(owner,imported.profile,imported.estimate_pointers),id=created.profile_id;
  const selections=fieldEntries(imported.profile).filter(e=>e.field.value!==null).map(e=>({pointer:e.pointer,state:imported.estimate_pointers.includes(e.pointer)?'reviewed_estimate' as const:'confirmed' as const,rationale:'Reviewed synthetic showcase assumptions'}));
  const reviewed=store.review(owner,id,1,[...selections,...imported.profile.sources.map((_,i)=>({pointer:`/sources/${i}`,state:'confirmed' as const,rationale:'Synthetic source review'}))]);
  const preview=store.preview(owner,id,reviewed.revision);
  store.acknowledge(owner,id,reviewed.revision,preview.preview_id);
  const confirmed=store.confirm(owner,id,reviewed.revision);
  const compiled=store.resolve(owner,confirmed.compiled!.binding);
  let request=DeterministicRequestSchema.parse({schema_version:'1.0',company_id:compiled.company.id,horizon_months:60,reserve_floor_usd:1000,exit_multiple:4,scenarios:[{id:'baseline',name:'Current business',decisions:[]},{id:'plan-a',name:'Hold current operations',decisions:[]},{id:'plan-b',name:'Software subscription (cost only)',decisions:[]}]});
  request=addFlexibleDecision(request,'plan-b','operating_expense','showcase-software');
  request=editDecision(request,'showcase-software','name','Software subscription (cost only)');
  for(const [key,value]of Object.entries({amount_per_month:1000,duration_months:60,start_month:1}))request=editDecision(request,'showcase-software',key,value);
  const result=simulate_deterministic(compiled.company,request);
  assert.equal(result.scenarios.baseline.months[1].financials.cash_end,19300);
  assert.equal(result.scenarios['plan-b'].months[1].financials.cash_end,18550);
  for(const path of Object.values(result.scenarios))for(const month of path.months.slice(1)){
   assert.equal(month.operations?.service_demand_jobs,600);assert.equal(month.operations?.completed_jobs,480);assert.equal(month.operations?.unserved_jobs,120);assert.equal(month.financials.revenue,84000);
  }
  const hash=createHash('sha256').update(bytes).digest('hex');
  const recordedHash=readFileSync(`${out}/README.md`,'utf8').match(/SHA256: `([a-f0-9]{64})`/)?.[1];
  assert.equal(hash,recordedHash,'Update the selected workbook hash before handoff');
  writeFileSync(`${out}/demo-plans.json`,JSON.stringify(request,null,2)+'\n');
  writeFileSync(`${out}/expected-results.json`,JSON.stringify({synthetic:true,workbook_sha256:hash,verification:'actual exported workbook -> importer -> in-memory review/preview/confirm -> deterministic engine',identity_note:'Profile IDs, source hashes and request fingerprints vary by import; use the active confirmed company ID, not this verification ID.',scenarios:Object.fromEntries(Object.entries(result.scenarios).map(([id,p])=>[id,{months:[0,1,2,12,60].map(m=>({month:m,operations:p.months[m].operations,financials:p.months[m].financials})),metrics:p.metrics}]))},null,2)+'\n');
  console.log(JSON.stringify({workbook_sha256:hash,scenarios:Object.keys(result.scenarios),verified:true}));
 }finally{store.close();}
}
