import { z } from 'zod';
import { createHash } from 'node:crypto';
import { readXlsx, ImportFailure, type Sheet, type Cell } from './xlsx.ts';
import { envelopes } from './template.ts';
import { ProfilePayloadSchema, HistoryRowSchema, LoanRowSchema, AssetRowSchema, ExpenseRowSchema, PROFILE_VERSION, MAPPING_VERSION, PeriodSchema } from './schemas.ts';
import { reviewDraft } from './review.ts';
import type { Envelope } from '../../intake/form.ts';
const headers = ['field_pointer','unit','value','state','period_start','period_end','as_of','row_id','period','source_ids','raw_text','raw_unit','raw_precision','derivation_rule','derivation_inputs','mapping_version','review_actor','reviewed_at','review_rationale'];
const sheetNames = ['Business','Monthly history','Existing expenses','Opening balances','Loans','Equipment','Operations','Assumptions'];
type Row = Record<string, Cell>;
const val = (r: Row, k: string) => r[k]?.value ?? null;
const str = (r: Row, k: string) => { const v=val(r,k); if (v !== null && typeof v !== 'string') throw new ImportFailure(r[k].address,`${k} must be text.`); return v; };
function json(r: Row, k: string, fallback: unknown) {
  const s=str(r,k); if (s===null) return fallback;
  try { return JSON.parse(s); } catch { throw new ImportFailure(r[k].address,`${k} must contain valid JSON.`); }
}
function ids(r: Row, k: string) { const v=json(r,k,[]); if (!Array.isArray(v) || v.some(x=>typeof x!=='string' || !x) || new Set(v).size!==v.length) throw new ImportFailure(r[k]?.address ?? k,`${k} must be a JSON array of unique IDs.`); return v as string[]; }
function period(r: Row) {
  const start=str(r,'period_start'), end=str(r,'period_end'), as_of=str(r,'as_of');
  if (!start && !end && !as_of) return null;
  const p = PeriodSchema.safeParse(as_of && !start && !end ? {as_of} : !as_of ? {start,end} : {});
  if (!p.success) throw new ImportFailure(r.as_of?.address ?? r.period_start?.address ?? 'Period','Provide either a complete date range or one as-of date.');
  return p.data;
}
/** Header-driven table data; bounded to the first blank leading cell, with no positional joins. */
function table(sheet: Sheet, first: string, columns?: string[]): Row[] {
  const found=[...sheet.rows.entries()].filter(([,r])=>r.get('A')?.value === first);
  if (found.length!==1) throw new ImportFailure(sheet.name,`Expected one ${first} table.`);
  const [n, header]=found[0];
  const names=[...header.entries()].filter(([,c])=>c.value!==null).sort(([a],[b])=>a.length-b.length || a.localeCompare(b)).map(([column,c])=>[column,c.value] as const);
  if (names.some(([,v])=>typeof v!=='string') || new Set(names.map(([,v])=>v)).size!==names.length || columns && (names.length!==columns.length || names.some(([,v],i)=>v!==columns[i]))) throw new ImportFailure(`${sheet.name}!A${n}`,'Unexpected or duplicate table columns. Use the revision-2 template.');
  const result: Row[]=[];
  for(let i=n+1;i<=10000;i++) {
    const cells=sheet.rows.get(i); if(!cells || cells.get('A')?.value==null) {
      if(cells && [...cells.values()].some(c=>c.value!==null)) throw new ImportFailure(`${sheet.name}!A${i}`,'Row has data but is missing its leading key.');
      break;
    }
    const r:Row={}; for(const [column,key] of names) r[key as string]=cells.get(column) ?? {value:null,raw:'',address:`${column}${i}`};
    result.push(r);
  }
  return result;
}
function detailTables(sheet: Sheet) {
  const result = new Map<string, Row[]>();
  const allowed: Record<string,string[]> = {
    service_mix:['row_id','trade','service_kind','description','comparable_job_definition','pool_id','historical_row_ids','completed_jobs','service_revenue_usd','source_ids'],
    workforce:['declaration'], constraint:['row_id','people','kind','available_fraction','productivity_fraction','pool_id','description','source_ids'],
    demand:['kind','period_start','period_end','estimated_jobs_per_month','method','limitations','historical_row_ids','rationale','service_mix_row_ids','source_ids'],
    measured:['row_id','period','requested_jobs','unserved_jobs','service_mix_row_ids','source_ids'],
  };
  for (const [n,h] of sheet.rows) if(h.get('A')?.value==='record_kind') {
    const cols=[...h.entries()].filter(([,c])=>c.value!==null).sort(([a],[b])=>a.length-b.length || a.localeCompare(b)).map(([c,v])=>[c,v.value] as const);
    const first=sheet.rows.get(n+1)?.get('A')?.value;
    if(typeof first!=='string' || !allowed[first] || result.has(first) || cols.map(([,v])=>v).join('|')!==['record_kind','parent_pointer',...allowed[first]].join('|')) throw new ImportFailure(`${sheet.name}!A${n}`,'Unexpected operating detail columns or kind.');
    const rows:Row[]=[];
    for(let i=n+1;i<=10000;i++) {
      const cells=sheet.rows.get(i); if(!cells || cells.get('A')?.value==null) break;
      const r:Row={}; for(const [c,key] of cols) r[key as string]=cells.get(c) ?? {value:null,raw:'',address:`${c}${i}`};
      if(val(r,'record_kind')!==first || val(r,'parent_pointer')!==`operations.${first==='service_mix'?'service_mix':['workforce','constraint'].includes(first)?'workforce_availability':'demand_evidence'}`) throw new ImportFailure(`Operations!A${i}`,'Detail kind/parent mismatch.');
      if(allowed[first].some(k=>val(r,k)!==null)) rows.push(r);
    }
    result.set(first,rows);
  }
  if(result.size!==5) throw new ImportFailure('Operations','Missing linked detail tables.');
  return result;
}
function detail(row: Row, keys: string[]) {
  return Object.fromEntries(keys.map(k=>[k, ['source_ids','historical_row_ids','service_mix_row_ids'].includes(k) ? ids(row,k) : val(row,k)]));
}
export function importWorkbook(bytes: Uint8Array) {
  const sheets=readXlsx(bytes), byName=new Map(sheets.map(s=>[s.name,s]));
  if(byName.size!==8 || sheetNames.some(n=>!byName.has(n))) throw new ImportFailure('Workbook','Use the eight named sheets in the revision-2 template.');
  const p: Record<string, any>={ profile_version:PROFILE_VERSION, business:envelopes(ProfilePayloadSchema.shape.business,null), history:[], opening:envelopes(ProfilePayloadSchema.shape.opening,null), operations:envelopes(ProfilePayloadSchema.shape.operations,null), assumptions:envelopes(ProfilePayloadSchema.shape.assumptions,null), expense_ledger:[], sources:[], reviews:[], reconciliations:[] };
  const states=new Map<string,string>();
  const estimates:string[]=[], locations:Record<string,string>={}, seen=new Set<string>(), sourceIds=new Set<string>();
  const digest=createHash('sha256').update(bytes).digest('hex');
  // Stable, bounded cell IDs avoid filename/path disclosure and preserve exact uploaded bytes identity.
  function source(sheet: string, cell: Cell, coverage: unknown) {
    const id=`xlsx-${digest.slice(0,16)}-${sheetNames.indexOf(sheet)}-${cell.address}`;
    if(!sourceIds.has(id)) { if(sourceIds.size>=800) throw new ImportFailure('Workbook','Import supports at most 800 source records.'); sourceIds.add(id); p.sources.push({source_id:id,kind:'spreadsheet_cell',title:`Intake workbook · ${sheet}`,period:coverage,locator:`sha256:${digest}#${sheet}!${cell.address}`}); }
    return id;
  }
  for(const r of table(byName.get('Business')!,'source_id',['source_id','kind','title','period_start','period_end','locator'])) {
    const id=str(r,'source_id')!; if(sourceIds.has(id) || id.startsWith('xlsx-')) throw new ImportFailure(`Business!${r.source_id.address}`,'Duplicate or reserved source ID.');
    sourceIds.add(id); p.sources.push({source_id:id,kind:str(r,'kind'),title:str(r,'title'),period:period(r),locator:str(r,'locator')});
  }
  const groups=new Map<string,Map<string,any>>();
  for(const name of sheetNames) for(const r of table(byName.get(name)!,'field_pointer',headers)) {
    const rawPointer=str(r,'field_pointer')!, unit=str(r,'unit'), state=str(r,'state');
    if(val(r,'mapping_version')!==MAPPING_VERSION) throw new ImportFailure(`${name}!${r.mapping_version.address}`,'Mapping version must match the revision-2 template.');
    if(!['unknown','entered','reviewed_estimate','confirmed','not_applicable'].includes(state ?? '')) throw new ImportFailure(`${name}!${r.state.address}`,'Unknown field state.');
    const expectedPrefix:Record<string,string>={Business:'business.', 'Monthly history':'history[].', 'Existing expenses':'expense_ledger[].', 'Opening balances':'opening.', Loans:'opening.loans[].', Equipment:'opening.assets[].', Operations:'operations.', Assumptions:'assumptions.'};
    if(!rawPointer.startsWith(expectedPrefix[name])) throw new ImportFailure(`${name}!${r.field_pointer.address}`,'Field is on the wrong sheet.');
    let target:any=p, pointer='', key='';
    const match=/^(history|expense_ledger|opening\.loans|opening\.assets)\[\]\.([a-z_]+)$/.exec(rawPointer);
    if(match) {
      const [,collection,member]=match, id=str(r,'row_id');
      if(!id) throw new ImportFailure(`${name}!${r.row_id.address}`,'Repeated records require a stable row ID.');
      if(!groups.has(collection)) groups.set(collection,new Map());
      const map=groups.get(collection)!;
      if(!map.has(id)) {
        const schema=collection==='history'?HistoryRowSchema:collection==='opening.loans'?LoanRowSchema:collection==='opening.assets'?AssetRowSchema:ExpenseRowSchema;
        const row={...envelopes(schema,null),row_id:id,...(collection==='history'?{period:str(r,'period')}: {})};
        map.set(id,row);
      }
      target=map.get(id); key=member; pointer=`${collection}:${id}/${member}`;
      if(collection==='history' && target.period!==str(r,'period')) throw new ImportFailure(`${name}!${r.period.address}`,'History rows with the same ID must have the same actual month.');
    } else {
      const m=/^(business|opening|operations|assumptions)\.([a-z_]+)(?:\[(\d+)\])?$/.exec(rawPointer);
      if(!m) throw new ImportFailure(`${name}!${r.field_pointer.address}`,'Unknown canonical field pointer.');
      target=p[m[1]]; key=m[2]; pointer=`/${m[1]}/${key}`;
      if(m[3]!==undefined) { if(key!=='seasonality' || Number(m[3])>11) throw new ImportFailure(`${name}!${r.field_pointer.address}`,'Invalid calendar-month field.'); target=target[key];key=m[3];pointer+=`/${key}`; }
    }
    if(seen.has(pointer)) throw new ImportFailure(`${name}!${r.field_pointer.address}`,'Duplicate field pointer for this stable record.'); seen.add(pointer); states.set(pointer,state!);
    if(seen.size>500) throw new ImportFailure('Workbook','Import supports at most 500 input fields.');
    const field=target[key] as Envelope;
    if(!field || typeof field!=='object' || !('unit' in field) || field.unit!==unit) throw new ImportFailure(`${name}!${r.unit.address}`,'Unknown field or mismatched unit.');
    locations[pointer]=`${name}!${r.value.address}`;
    const coverage=period(r), value=val(r,'value');
    if((state==='unknown' || state==='not_applicable') && value!==null) throw new ImportFailure(`${name}!${r.value.address}`,'Unknown/not-applicable cannot contain a value.');
    if(['entered','confirmed','reviewed_estimate'].includes(state!) && value===null && !['record','record_list'].includes(unit!)) throw new ImportFailure(`${name}!${r.value.address}`,'Entered field is blank; use unknown.');
    if(value!==null && !coverage) throw new ImportFailure(`${name}!${r.value.address}`,'Entered values need an explicit applicable period.');
    field.period=coverage; field.source_ids=ids(r,'source_ids');
    // Linked record members are assembled separately; cells cannot hide a competing JSON object.
    if(['record','record_list'].includes(unit!)) {
      if(value!==null) throw new ImportFailure(`${name}!${r.value.address}`,'Use the linked detail tables for structured operating evidence; risk configuration stays unknown.');
    } else if(unit==='category_list') field.value=json(r,'value',null);
    else field.value=value;
    field.state=field.value===null?'unknown':'entered'; field.review=null;
    if(state==='reviewed_estimate') estimates.push(pointer);
    const raw=str(r,'raw_text'), rawUnit=str(r,'raw_unit'), precision=str(r,'raw_precision');
    if([raw,rawUnit,precision].some(x=>x!==null) && ![raw,rawUnit,precision].every(x=>x!==null)) throw new ImportFailure(`${name}!${r.raw_text.address}`,'Raw text, unit and precision must be supplied together.');
    if(raw!==null) field.raw={text:raw,unit:rawUnit!,precision:precision!};
    else if(field.value!==null && !['record','record_list','category_list'].includes(unit!)) {
      const rawValue=r.value.raw; const decimals=/\.(\d+)$/.exec(rawValue)?.[1].length;
      field.raw={text:rawValue,unit:unit!,precision:typeof field.value==='number'?(decimals?'0.'+'0'.repeat(decimals-1)+'1':'1'):'as entered'};
    }
    const rule=str(r,'derivation_rule'), inputs=ids(r,'derivation_inputs');
    if(!rule && inputs.length) throw new ImportFailure(`${name}!${r.derivation_inputs.address}`,'Derivation inputs require a rule.');
    if(rule) field.derivation={mapping_version:MAPPING_VERSION,rule,inputs};
    if(field.value!==null) field.source_ids.push(source(name,r.value,coverage));
  }
  // Empty placeholder schedules do not imply a debt/asset declaration or an actual observation.
  for(const [collection,map] of groups) {
    const rows=[...map.values()].filter(row=>Object.entries(row).some(([k,v])=>k!=='row_id' && k!=='period' && (v as Envelope).value!==null) || collection==='history' && row.period!==null);
    const [a,b]=collection.split('.'); if(b) p[a][b]=rows;else p[a]=rows;
    rows.forEach((row,i)=> { for(const k of Object.keys(row)) { const old=`${collection}:${row.row_id}/${k}`, next=`/${collection.replaceAll('.','/')}/${i}/${k}`;if(locations[old]) {locations[next]=locations[old]; delete locations[old];}const e=estimates.indexOf(old);if(e>=0)estimates[e]=next; } });
  }
  const details=detailTables(byName.get('Operations')!);
  const mix=details.get('service_mix')!.map(r=>detail(r,['row_id','trade','service_kind','description','comparable_job_definition','pool_id','historical_row_ids','completed_jobs','service_revenue_usd','source_ids']));
  const workforce=details.get('workforce')!, constraints=details.get('constraint')!, demands=details.get('demand')!, measured=details.get('measured')!;
  if(workforce.length>1 || demands.length>1 || !workforce.length && constraints.length || !demands.length && measured.length) throw new ImportFailure('Operations','Duplicate or orphan operating declarations.');
  const values:Record<string,unknown>={service_mix:mix.length?mix:null,workforce_availability:workforce.length?{declaration:val(workforce[0],'declaration'),constraints:constraints.map(r=>detail(r,['row_id','people','kind','available_fraction','productivity_fraction','pool_id','description','source_ids']))}:null,demand_evidence:null};
  if(demands.length) {
    const r=demands[0], kind=val(r,'kind');
    const keys=kind==='measured'?['kind']:kind==='reviewed_estimate'?['kind','period_start','period_end','estimated_jobs_per_month','method','limitations','service_mix_row_ids','source_ids']:kind==='confirmed_no_unserved'?['kind','historical_row_ids','rationale','source_ids']:[];
    if(!keys.length || kind!=='measured' && measured.length) throw new ImportFailure('Operations','Unsupported demand kind or orphan observations.');
    for(const k of ['period_start','period_end','estimated_jobs_per_month','method','limitations','historical_row_ids','rationale','service_mix_row_ids','source_ids']) if(!keys.includes(k) && val(r,k)!==null) throw new ImportFailure(`Operations!${r[k].address}`,'This member does not apply to the selected demand kind.');
    values.demand_evidence={...detail(r,keys),...(kind==='measured'?{observations:measured.map(r=>detail(r,['row_id','period','requested_jobs','unserved_jobs','service_mix_row_ids','source_ids']))}:{})};
    if(kind==='reviewed_estimate') estimates.push('/operations/demand_evidence');
  }
  for(const [key,value] of Object.entries(values)) if(value!==null) {
    const field=p.operations[key] as Envelope; if(!['entered','confirmed','reviewed_estimate'].includes(states.get(`/operations/${key}`)??'')) throw new ImportFailure('Operations',`${key} has details but its parent is unknown; mark the parent entered or estimated.`); if(!field.period) throw new ImportFailure('Operations',`${key} needs a period on its parent input row.`);
    field.value=value;field.state='entered';
    // Preserve exact detail-cell locations as source records for the parent evidence envelope.
    const kinds=key==='service_mix'?['service_mix']:key==='workforce_availability'?['workforce','constraint']:['demand','measured'];
    for(const kind of kinds) for(const row of details.get(kind)!) for(const [k,cell] of Object.entries(row)) if(!['record_kind','parent_pointer'].includes(k) && cell.value!==null) field.source_ids.push(source('Operations',cell,field.period));
  }
  for(const key of ['service_mix','workforce_availability','demand_evidence']) if(values[key]===null && ['entered','confirmed','reviewed_estimate'].includes(states.get(`/operations/${key}`)??'')) throw new ImportFailure('Operations',`${key} is entered but linked details are missing.`);
  if(['entered','confirmed','reviewed_estimate'].includes(states.get('/assumptions/risk_configuration')??'')) throw new ImportFailure('Assumptions','Workbook risk configuration is not supported; keep it unknown.');
  const parsed=ProfilePayloadSchema.safeParse(p);
  if(!parsed.success) { const error=new ImportFailure('Workbook','Check imported values and periods.');error.issues=parsed.error.issues.map(i=>({location:locations['/'+i.path.slice(0,-1).join('/')] ?? '/'+i.path.join('/'),message:i.message}));throw error; }
  const references=reviewDraft(parsed.data).issues;
  if(references.length) {const error=new ImportFailure('Workbook','Resolve duplicate IDs and source references.');error.issues=references.map(i=>({location:i.pointer,message:i.message}));throw error;}
  return { profile:parsed.data, estimate_pointers:[...new Set(estimates.filter(x=>x.startsWith('/')))], workbook_fingerprint:digest, warnings:['Imported review claims were discarded. Review facts and estimates in the application before calculating a starting picture.'] };
}
