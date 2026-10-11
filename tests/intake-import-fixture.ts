/** Disposable in-memory OOXML test mutations of P2's actual checked-in template. */
import { readFileSync } from 'node:fs';
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';
import { readXlsx } from '../src/lib/server/intake/xlsx.ts';
import { eligibleFixture } from './intake-fixture.ts';
import { fieldEntries } from '../src/lib/intake/form.ts';
export const blankWorkbook=()=>new Uint8Array(readFileSync(new URL('../outputs/intake-v2/company-intake-v2.xlsx',import.meta.url)));
const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function setCell(files:Record<string,Uint8Array>,sheet:number,address:string,value:unknown,formula=false) {
  const name=`xl/worksheets/sheet${sheet}.xml`, xml=strFromU8(files[name]);
  const body=formula?`<x:f>1+1</x:f><x:v>2</x:v>`:value===null?'':typeof value==='number'?`<x:v>${value}</x:v>`:typeof value==='boolean'?`<x:v>${value?1:0}</x:v>`:`<x:is><x:t>${escape(String(value))}</x:t></x:is>`;
  const type=typeof value==='boolean'?' t="b"':typeof value==='number'||value===null||formula?'':' t="inlineStr"';
  const replacement=`<x:c r="${address}"${type}>${body}</x:c>`;
  const pattern=new RegExp(`<x:c r="${address}"[^>]*?(?:\\/>|>[\\s\\S]*?<\\/x:c>)`);
  if(!pattern.test(xml)) throw new Error(`Test address missing: ${name}!${address}`);
  files[name]=strToU8(xml.replace(pattern,replacement));
}
export function mutated(changes:(files:Record<string,Uint8Array>)=>void, initial=blankWorkbook()) {const files=unzipSync(initial);changes(files);return zipSync(files);}
export function populatedWorkbook() {
  const files=unzipSync(blankWorkbook()), sheets=readXlsx(blankWorkbook()), p=eligibleFixture();
  p.history.forEach((row,i)=>{row.row_id=`history-${String(i+1).padStart(2,'0')}`; row.service_revenue.raw={text:'70000.00',unit:'USD/month',precision:'0.01'};});
  p.operations.service_mix.value![0].historical_row_ids=p.history.map(h=>h.row_id);
  p.operations.demand_evidence.value={kind:'reviewed_estimate',period_start:'2026-01-01',period_end:'2026-12-31',estimated_jobs_per_month:600,method:'Synthetic request estimate',limitations:'Test only',service_mix_row_ids:['mix'],source_ids:['source']};
  p.operations.demand_evidence.state='reviewed_estimate';
  const entries=fieldEntries(p), source=JSON.stringify(['source']);
  sheets.forEach((sheet,index)=> {for(const [n,cells] of sheet.rows) {
    const pointer=cells.get('A')?.value; if(typeof pointer!=='string')continue;
    let canonical=pointer.replace(/^history\[\]\./,`history.${Math.floor((n-10)/13)}.`).replace(/\[(\d+)\]/g,'.$1').replaceAll('.','/');
    canonical='/'+canonical;
    const entry=entries.find(e=>e.pointer===canonical);if(!entry)continue;
    const f=entry.field;
    if(canonical.startsWith('/history/')) setCell(files,index+1,`I${n}`,p.history[Math.floor((n-10)/13)].period);
    if(f.period && 'as_of'in f.period)setCell(files,index+1,`G${n}`,f.period.as_of);
    else if(f.period) {setCell(files,index+1,`E${n}`,f.period.start);setCell(files,index+1,`F${n}`,f.period.end);}
    if(f.value!==null) {
      if(!['record','record_list'].includes(f.unit)) setCell(files,index+1,`C${n}`,f.unit==='category_list'?JSON.stringify(f.value):f.value);
      setCell(files,index+1,`D${n}`,f.state);setCell(files,index+1,`J${n}`,source);
      if(f.raw) {setCell(files,index+1,`K${n}`,f.raw.text);setCell(files,index+1,`L${n}`,f.raw.unit);setCell(files,index+1,`M${n}`,f.raw.precision);}
      setCell(files,index+1,`Q${n}`,'forged-workbook-actor');
    }
  }});
  for(const [col,value] of Object.entries({A:'source',B:'manual_statement',C:'Synthetic workbook source',D:'2026-01-01',E:'2026-12-31'}))setCell(files,1,`${col}28`,value);
  // Reuse the actual linked-table headers and populate their first placeholder rows.
  const ops=sheets[6];
  for(const [n,cells]of ops.rows)if(cells.get('A')?.value==='record_kind'){
    const kind=ops.rows.get(n+1)!.get('A')!.value;
    const data=kind==='service_mix'?p.operations.service_mix.value![0]:kind==='workforce'?{declaration:'none'}:kind==='demand'?p.operations.demand_evidence.value:null;
    if(!data)continue;
    for(const[col,c]of cells)if(typeof c.value==='string'&&c.value in data){const v=(data as Record<string,unknown>)[c.value];setCell(files,7,`${col}${n+1}`,Array.isArray(v)?JSON.stringify(v):v);}
  }
  // Template IDs differ from fixture IDs; references must use the actual stable imported IDs.
  const opsXml=strFromU8(files['xl/worksheets/sheet7.xml']);
  files['xl/worksheets/sheet7.xml']=strToU8(opsXml.replace(/history-(\d+)(?=&quot;|"|<)/g,(_,n)=>`history-${String(Number(n)).padStart(2,'0')}`));
  return zipSync(files);
}
