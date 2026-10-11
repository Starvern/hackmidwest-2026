import test from 'node:test';
import assert from 'node:assert/strict';
import { unzipSync, zipSync, strToU8 } from 'fflate';
import { importWorkbook } from '../src/lib/server/intake/import.ts';
import { ImportFailure } from '../src/lib/server/intake/xlsx.ts';
import { readXlsx } from '../src/lib/server/intake/xlsx.ts';
import { ProfileStore } from '../src/lib/server/intake/store.ts';
import { fieldEntries } from '../src/lib/intake/form.ts';
import { blankWorkbook, populatedWorkbook, mutated, setCell } from './intake-import-fixture.ts';
test('actual P2 blank template imports unknowns without invented dates, schedules or economics',()=>{
  const r=importWorkbook(blankWorkbook());assert.equal(r.profile.history.length,0);assert.equal(r.profile.business.books_through.value,null);assert.equal(r.profile.opening.loans.length,0);assert.equal(r.profile.operations.forecast_ticket.value,null);assert.deepEqual(r.profile.sources,[]);
});
test('populated actual workbook preserves source precision, typed zero, actual periods and linked evidence; real confirmed projection matches',()=>{
  const r=importWorkbook(populatedWorkbook()); assert.equal(r.profile.history.length,12);assert.equal(r.profile.history[0].period,'2026-01');assert.equal(r.profile.history[0].other_revenue.value,0);assert.equal(r.profile.opening.cash.value,-100);assert.equal(r.profile.operations.demand_evidence.value?.kind,'reviewed_estimate');
  assert.equal(r.profile.history[0].service_revenue.raw?.precision,'0.01');assert.equal(r.profile.opening.cash.review,null);assert.equal(r.profile.opening.cash.state,'entered');
  assert.ok(r.profile.sources.some(s=>s.kind==='spreadsheet_cell'&&s.locator?.includes('Monthly history!C11')));
  assert.ok(r.estimate_pointers.includes('/operations/demand_evidence'));
  const store=new ProfileStore(':memory:');try{
    const created=store.create('owner',r.profile,r.estimate_pointers), id=created.profile_id;
    const selections=fieldEntries(r.profile).filter(e=>e.field.value!==null).map(e=>({pointer:e.pointer,state:r.estimate_pointers.includes(e.pointer)?'reviewed_estimate' as const:'confirmed' as const,rationale:'Synthetic import review'}));
    const reviewed=store.review('owner',id,1,[...selections,...r.profile.sources.map((_,i)=>({pointer:`/sources/${i}`,state:'confirmed' as const,rationale:'Synthetic source review'}))]);
    const preview=store.preview('owner',id,reviewed.revision);assert.equal(preview.baseline.months[1].operations?.completed_jobs,480);assert.equal(preview.baseline.months[1].financials.cash_end,19300);
    store.acknowledge('owner',id,reviewed.revision,preview.preview_id);assert.equal(store.confirm('owner',id,reviewed.revision).status,'confirmed');
  }finally{store.close();}
});
test('rejects malformed lists, text numbers, duplicate pointers, wrong units and missing value coverage with cell locations',()=>{
 const base=populatedWorkbook();
 for(const [sheet,address,value]of [[1,'J10','source'],[4,'C10','-100'],[1,'A11','business.name'],[4,'B10','USD/month'],[4,'G10',null]] as const){
  assert.throws(()=>importWorkbook(mutated(f=>setCell(f,sheet,address,value),base)));
 }
});
test('formulas cannot import stale caches; external relationships, malformed ZIP and expansion limits reject',()=>{
 assert.throws(()=>importWorkbook(mutated(f=>setCell(f,1,'C10',2,true))),/Formulas/);
 assert.throws(()=>readXlsx(strToU8('not a workbook')),/valid/);
 const f=unzipSync(blankWorkbook());f['xl/_rels/bad.rels']=strToU8('<Relationships><Relationship TargetMode="External" Target="https://example.com"/></Relationships>');assert.throws(()=>readXlsx(zipSync(f)),/External/);
 f['xl/large.xml']=new Uint8Array(4*1024*1024+1);assert.throws(()=>readXlsx(zipSync(f)),/limit/);
});
test('measured demand variants use their linked observations; inactive members and unknown parents reject',()=>{
 const base=populatedWorkbook(), sheets=readXlsx(base), tables=new Map<string,{n:number,columns:Map<string,any>}>();
 for(const[n,c]of sheets[6].rows)if(c.get('A')?.value==='record_kind')tables.set(String(sheets[6].rows.get(n+1)!.get('A')!.value),{n:n+1,columns:c});
 const variant=mutated(files=>{
  for(const kind of ['demand','measured']){
   const {n,columns}=tables.get(kind)!;const values:Record<string,unknown>=kind==='demand'?{kind:'measured'}:{row_id:'observation',period:'2026-12',requested_jobs:600,unserved_jobs:120,service_mix_row_ids:'["mix"]',source_ids:'["source"]'};
   for(const[col,c]of columns)if(typeof c.value==='string'&&!['record_kind','parent_pointer'].includes(c.value))setCell(files,7,`${col}${n}`,values[c.value]??null);
  }
  // The parent may be confirmed in the workbook but is still unreviewed on import.
  const parent=[...sheets[6].rows].find(([,c])=>c.get('A')?.value==='operations.demand_evidence')![0];setCell(files,7,`D${parent}`,'confirmed');
 },base);
 const p=importWorkbook(variant).profile;assert.equal(p.operations.demand_evidence.value?.kind,'measured');assert.equal(p.operations.demand_evidence.state,'entered');
 const parent=[...sheets[6].rows].find(([,c])=>c.get('A')?.value==='operations.service_mix')![0];assert.throws(()=>importWorkbook(mutated(f=>setCell(f,7,`D${parent}`,'unknown'),base)),/parent is unknown/);
});
test('standard Excel date serials normalize explicitly while 1900 leap-day ambiguity rejects',()=>{
 const serial=Math.round((Date.UTC(2026,11,31)-Date.UTC(1899,11,30))/86400000);
 const bytes=mutated(files=>{
   files['xl/styles.xml']=strToU8('<styleSheet><cellXfs><xf numFmtId="14"/></cellXfs></styleSheet>');
   for(const address of ['C14','G14']){setCell(files,1,address,serial);const file='xl/worksheets/sheet1.xml';files[file]=strToU8(new TextDecoder().decode(files[file]).replace(`<x:c r="${address}"`,`<x:c r="${address}" s="0"`));}
 },populatedWorkbook());
 assert.equal(importWorkbook(bytes).profile.business.books_through.value,'2026-12-31');
 assert.throws(()=>readXlsx(mutated(files=>{setCell(files,1,'C14',60);const file='xl/worksheets/sheet1.xml';files[file]=strToU8(new TextDecoder().decode(files[file]).replace('<x:c r="C14"','<x:c r="C14" s="0"'));},bytes)),/calendar date/);
});
test('loan, equipment and expense row groups map by stable ID without adding costs to totals',()=>{
 const base=populatedWorkbook(), sheets=readXlsx(base);
 const values:Record<string,Record<string,unknown>>={Loans:{lender:'Synthetic bank',name:'Existing loan',amortization_policy:'level_principal',terms_source:'source',outstanding_principal:250,monthly_principal:100,annual_rate:.12,remaining_term:3,next_payment_date:'2027-01-15'},Equipment:{name:'Existing equipment',cost_basis:1000,accumulated_depreciation:400,monthly_depreciation:100,remaining_life:6,service_date:'2025-01-01'},'Existing expenses':{name:'Included subscription',category:'overhead',source_period:'2026',currency:'USD',frequency:'monthly',target_bucket:'fixed_overhead_per_month',mapping_mode:'included_detail',allocation_rule:'Already included',raw_amount:1000,normalized_recognition_amount:1000,coverage_start:'2026-01-01',coverage_end:'2026-12-31',irregular_payment:false}};
 const bytes=mutated(files=>sheets.forEach((sheet,i)=>{for(const[n,c]of sheet.rows){const pointer=c.get('A')?.value;if(typeof pointer!=='string')continue;
  const member=pointer.split('.').at(-1)!;const value=values[sheet.name]?.[member] ?? (pointer==='opening.debt_declaration'||pointer==='opening.asset_declaration'?'itemized':pointer==='assumptions.existing_depreciation_per_year'?1200:undefined);
  if(value===undefined)continue;
  setCell(files,i+1,`C${n}`,value);setCell(files,i+1,`D${n}`,'confirmed');setCell(files,i+1,`G${n}`,'2026-12-31');setCell(files,i+1,`J${n}`,'["source"]');
 }}),base);
 const imported=importWorkbook(bytes);assert.equal(imported.profile.opening.loans[0].row_id,'loan-1');assert.equal(imported.profile.opening.assets[0].monthly_depreciation.value,100);assert.equal(imported.profile.expense_ledger[0].mapping_mode.value,'included_detail');
 const store=new ProfileStore(':memory:');try{
 const created=store.create('owner',imported.profile,imported.estimate_pointers),id=created.profile_id;
 store.review('owner',id,1,[...fieldEntries(imported.profile).filter(e=>e.field.value!==null).map(e=>({pointer:e.pointer,state:imported.estimate_pointers.includes(e.pointer)?'reviewed_estimate' as const:'confirmed' as const,rationale:'Synthetic schedule review'})),...imported.profile.sources.map((_,i)=>({pointer:`/sources/${i}`,state:'confirmed' as const,rationale:'Synthetic source review'}))]);
 const preview=store.preview('owner',id,2),m=preview.baseline.months[1];if(m.is_opening_state)throw new Error('Expected forecast');assert.equal(m.financials.ebitda,43600);assert.equal(m.financials.depreciation,100);assert.equal(m.financials.debt_principal,100);assert.equal(m.financials.cash_end,19223.125);
 }finally{store.close();}
});

test('internal gaps reject supplied field, named-source and linked-detail records without crossing section boundaries', () => {
  const base = populatedWorkbook();
  const copyRow = (files: Record<string, Uint8Array>, sheet: number, from: number, to: number) => {
    const name = `xl/worksheets/sheet${sheet}.xml`;
    const xml = new TextDecoder().decode(files[name]);
    const row = xml.match(new RegExp(`<x:row r="${from}"[^>]*>[\\s\\S]*?</x:row>`))?.[0];
    assert.ok(row, 'Fixture row exists');
    const copy = row.replace(`r="${from}"`, `r="${to}"`).replace(new RegExp(`r="([A-Z]+)${from}"`, 'g'), `r="$1${to}"`);
    const existing = new RegExp(`<x:row r="${to}"[^>]*(?:/>|>[\\s\\S]*?</x:row>)`);
    files[name] = strToU8(existing.test(xml) ? xml.replace(existing, copy) : xml.replace('</x:sheetData>', `${copy}</x:sheetData>`));
  };
  const fields = mutated(files => { for (const col of 'ABCDEFGHIJKLMNOPQRS') setCell(files, 1, `${col}11`, null); }, base);
  assert.throws(() => importWorkbook(fields), e => e instanceof ImportFailure && e.issues[0].location === 'Business!A12' && /internal blank row/.test(e.message));
  const sources = mutated(files => copyRow(files, 1, 28, 30), base);
  assert.throws(() => importWorkbook(sources), e => e instanceof ImportFailure && e.issues[0].location === 'Business!A30' && /internal blank row/.test(e.message));
  const details = mutated(files => copyRow(files, 7, 35, 37), base);
  assert.throws(() => importWorkbook(details), e => e instanceof ImportFailure && e.issues[0].location === 'Operations!A37' && /internal blank row/.test(e.message));
  const orphan = mutated(files => { copyRow(files, 7, 35, 36); setCell(files, 7, 'A36', null); }, base);
  assert.throws(() => importWorkbook(orphan), e => e instanceof ImportFailure && e.issues[0].location === 'Operations!A36' && /leading key/.test(e.message));
  // Normal blank table tails, notes and later sections remain independent.
  assert.equal(importWorkbook(base).profile.sources.filter(s => s.source_id === 'source').length, 1);
  assert.equal(importWorkbook(blankWorkbook()).profile.history.length, 0);
});
