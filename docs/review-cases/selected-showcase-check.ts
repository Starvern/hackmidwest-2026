/** Run after prepare_demo.ts verify in the selected-package checkout. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root=process.argv[2] ?? '.';
const hash='11db0060e763103f84188be7fcd8731692dbed3d96f6ad0c1f914349776f32da';
assert.equal(createHash('sha256').update(readFileSync(`${root}/outputs/showcase-demo/showcase-company.xlsx`)).digest('hex'),hash);
const output=JSON.parse(readFileSync(`${root}/outputs/showcase-demo/expected-results.json`,'utf8'));
assert.equal(output.workbook_sha256,hash);
for(const [id,path] of Object.entries(output.scenarios) as [string,any][]){
 const expense=id==='plan-b'?1000:0;
 const revenue=480*175, cogs=20000+2000+revenue*.1;
 const ebitda=revenue-cogs-10000-expense, tax=ebitda*.25;
 const workingCapitalIncrease=(84000-4200)-(70000-3500);
 for(const row of path.months){
  const f=row.financials,m=row.month;
  assert.equal(f.cash_end,m===0?-100:-100+m*(ebitda-tax)-workingCapitalIncrease,`${id} cash month ${m}`);
  assert.equal(f.debt_end,0);
  if(!m)continue;
  assert.equal(f.revenue,revenue); assert.equal(f.cogs,cogs);
  assert.equal(f.ebitda,ebitda); assert.equal(f.cash_taxes,tax);
  assert.equal(f.delta_nwc,m===1?workingCapitalIncrease:0);
  assert.equal(f.cash_end-f.cash_begin,f.cash_change);
  assert.equal(f.unlevered_fcf,ebitda-tax-f.delta_nwc);
 }
 const cash60=-100+60*(ebitda-tax)-workingCapitalIncrease;
 assert.equal(path.metrics.exit_equity_value,ebitda*12*4+cash60);
 assert.equal(path.metrics.minimum_cash,-100); assert.equal(path.metrics.cash_trough_month,0);
 assert.deepEqual(path.metrics.reserve_breach_months,[]);
 assert.equal(path.metrics.payback.status,expense?'not_reached':'not_applicable');
}
assert.deepEqual(output.scenarios.baseline,output.scenarios['plan-a']);
assert.equal(output.scenarios['plan-b'].metrics.exit_equity_value-output.scenarios.baseline.metrics.exit_equity_value,-93000);
console.log('Selected showcase: independent financial checkpoint formulas, equity bridge, payback and workbook hash passed.');
