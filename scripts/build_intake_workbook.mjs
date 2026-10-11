import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
if (!process.env.ARTIFACT_NODE_MODULES) throw new Error('Set ARTIFACT_NODE_MODULES to the bundled dependency node_modules path returned by load_workspace_dependencies.');
const requireArtifact=createRequire(path.join(process.env.ARTIFACT_NODE_MODULES,'..','artifact-loader.cjs'));
const {Workbook,SpreadsheetFile}=await import(pathToFileURL(requireArtifact.resolve('@oai/artifact-tool')).href);
const out = path.resolve(process.argv[2]??'outputs/intake-v2');
const wb = Workbook.create();
const headers=['field_pointer','unit','value','state','period_start','period_end','as_of','row_id','period','source_ids','raw_text','raw_unit','raw_precision','derivation_rule','derivation_inputs','mapping_version','review_actor','reviewed_at','review_rationale'];
const states=['unknown','entered','reviewed_estimate','confirmed','not_applicable'];
const sheets=[];
function table(s,row,title,cols,rows,name){
  s.getCell(row-1,0).values=[[title]];
  s.getCell(row-1,0).format.font={bold:true,size:11};
  s.getRangeByIndexes(row+1,0,1,cols.length).values=[cols];
  const matrix=rows.length?rows:[cols.map(()=>null)];
  s.getRangeByIndexes(row+2,0,matrix.length,cols.length).values=matrix;
  s.tables.add(`A${row+2}:${col(cols.length)}${row+2+matrix.length}`,true,name);
  s.getRangeByIndexes(row+1,0,1,cols.length).format={fill:'#243B53',font:{color:'#FFFFFF',bold:true,size:10},rowHeight:46,wrapText:true};
  s.getRangeByIndexes(row+2,0,matrix.length,cols.length).format.fill='#FFF8DF';
  return row+matrix.length+6;
}
function col(n){let t='';while(n){n--;t=String.fromCharCode(65+n%26)+t;n=Math.floor(n/26);}return t;}
function make(name,note,fields){
 const s=wb.worksheets.add(name);sheets.push(s);s.showGridLines=false;
 s.getRange('A1:S260').format.font={name:'Arial',size:10,color:'#172B4D'};
 s.getRange('A1:S260').format.rowHeight=23;
 s.getRange('A2').values=[[name]];s.getRange('A2').format.font={size:15,bold:true};
 s.getRange('A3').values=[[note]];s.getRange('A4').values=[['Amber cells accept entries. Blank value means unknown; 0 is explicit zero. Review is completed in the application.']];
 s.getRange('A5').values=[['company-profile-2-draft / company-mapping-2-draft. Collection template; importer and company-specific runs are not implemented.']];
 const rows=fields.map(([pointer,unit,row_id='',period=''])=>[pointer,unit,null,'unknown',null,null,null,row_id,period,null,null,null,null,null,null,'company-mapping-2-draft',null,null,null]);
 const next=table(s,7,'Input fields',headers,rows,name.replaceAll(' ','')+'Fields');
 s.getRange(`D10:D${9+rows.length}`).dataValidation={rule:{type:'list',values:states}};
 s.getRange('A1:A260').format.columnWidth=53;s.getRange('B1:B260').format.columnWidth=42;
 s.getRange('C1:D260').format.columnWidth=24;s.getRange('E1:I260').format.columnWidth=18;
 s.getRange('J1:S260').format.columnWidth=28;
 s.freezePanes.freezeRows(9);s.freezePanes.freezeColumns(2);
 return [s,next];
}
make('Business','Start here: enter business dates and facts. Initial supported scope is USD HVAC, Dec-31 opening and next-Jan forecast.',[
 ...['name','trade','currency','accounting_basis'].map(x=>['business.'+x,'text']),...['books_through','forecast_start'].map(x=>['business.'+x,'ISO_date'])]);
const hist=['service_jobs','service_revenue','other_revenue','revenue','tech_direct_labor','vehicle_direct_opex','service_variable_cost','other_direct_cost','cogs','operating_overhead','ebitda','reported_profit','reported_profit_basis'];
make('Monthly history','Supply 12 actual contiguous Jan-Dec periods (YYYY-MM). Keep reported profit basis separate from EBITDA.',Array.from({length:12},(_,i)=>hist.map(x=>['history[].'+x,x==='service_jobs'?'jobs/month':x==='reported_profit_basis'?'text':'USD/month',`history-${String(i+1).padStart(2,'0')}`,''])).flat());
make('Existing expenses','Existing costs apply to all plans. Included detail does not add to totals. Material irregular cash timing requires support.',[
 ...['name','category','source_period','currency','frequency','target_bucket','mapping_mode','allocation_rule'].map(x=>['expense_ledger[].'+x,'text','expense-1']),
 ...['raw_amount','normalized_recognition_amount'].map(x=>['expense_ledger[].'+x,x==='raw_amount'?'USD':'USD/month','expense-1']),
 ...['coverage_start','coverage_end'].map(x=>['expense_ledger[].'+x,'ISO_date','expense-1']),['expense_ledger[].irregular_payment','boolean','expense-1']]);
make('Opening balances','Use the same Dec-31 as-of date. Cash may be negative. Declare no debt/assets explicitly rather than leaving schedules unknown.',[
 ...['cash','accounts_receivable','inventory','accounts_payable'].map(x=>['opening.'+x,'USD']),...['debt_declaration','asset_declaration'].map(x=>['opening.'+x,'text'])]);
make('Loans','Initial support: exactly representable fixed-rate, monthly level-principal loans. No conversion from equal-payment or irregular debt.',[
 ...['lender','name','amortization_policy','terms_source'].map(x=>['opening.loans[].'+x,'text','loan-1']),...['outstanding_principal','monthly_principal'].map(x=>['opening.loans[].'+x,'USD','loan-1']),['opening.loans[].annual_rate','annual_fraction','loan-1'],['opening.loans[].remaining_term','months','loan-1'],['opening.loans[].next_payment_date','ISO_date','loan-1']]);
make('Equipment','Existing asset schedule only. New proposed purchases belong in alternative plans. Reconcile cost, accumulated and future depreciation.',[
 ['opening.assets[].name','text','asset-1'],...['cost_basis','accumulated_depreciation'].map(x=>['opening.assets[].'+x,'USD','asset-1']),['opening.assets[].monthly_depreciation','USD/month','asset-1'],['opening.assets[].remaining_life','months','asset-1'],['opening.assets[].service_date','ISO_date','asset-1']]);
const [ops,opnext]=make('Operations','Use comparable pooled jobs. Demand includes turned-away work. Forecast assumptions are separate from historical observations.',[
 ['job_definition','text'],['pooling_suitable','boolean'],['service_technicians_employed','people'],['service_vehicles_available','vehicles'],['working_days_per_month','days/month'],['jobs_per_technician_day','jobs/person/day'],['jobs_per_vehicle_day','jobs/vehicle/day'],['forecast_ticket','USD/job'],['base_monthly_demand','jobs/month'],['loaded_technician_cost','USD/person/year'],['fleet_operating_cost','USD/vehicle/year'],...['non_service_revenue_per_month','non_service_direct_cost_per_month','fixed_overhead_per_month','baseline_marketing_in_overhead'].map(x=>[x,'USD/month']),['service_variable_cost_rate','fraction'],['service_mix','record_list'],['workforce_availability','record'],['demand_evidence','record']].map(([x,u])=>['operations.'+x,u]));
let r=opnext;
const details=[
 ['Service mix','service_mix',['row_id','trade','service_kind','description','comparable_job_definition','pool_id','historical_row_ids','completed_jobs','service_revenue_usd','source_ids']],
 ['Workforce declaration','workforce',['declaration']],
 ['Workforce constraints','constraint',['row_id','people','kind','available_fraction','productivity_fraction','pool_id','description','source_ids']],
 ['Demand declaration','demand',['kind','period_start','period_end','estimated_jobs_per_month','method','limitations','historical_row_ids','rationale','service_mix_row_ids','source_ids']],
 ['Measured demand observations','measured',['row_id','period','requested_jobs','unserved_jobs','service_mix_row_ids','source_ids']]
];
for(const [title,kind,cols] of details){const parent=kind==='service_mix'?'service_mix':['workforce','constraint'].includes(kind)?'workforce_availability':'demand_evidence';r=table(ops,r,title,['record_kind','parent_pointer',...cols],[[kind,'operations.'+parent,...cols.map(()=>null)]],'Operations'+kind);}
make('Assumptions','Enter reviewed fractions (5% = 0.05). Twelve mean-1 seasonality factors; all-zero factors invalid. No automatic demo risk settings.',[
 ...['organic_demand_growth','wage_inflation','overhead_inflation','ticket_growth','other_revenue_growth','other_direct_cost_growth'].map(x=>['assumptions.'+x,'annual_fraction']),
 ...['collection_delay_months','payment_delay_months','truck_useful_life_months'].map(x=>['assumptions.'+x,'months']),['assumptions.ap_eligible_cost_categories','category_list'],...['constant_inventory','liquidity_floor'].map(x=>['assumptions.'+x,'USD']),...['existing_depreciation_per_year','maintenance_capex_per_year'].map(x=>['assumptions.'+x,'USD/year']),['assumptions.tax_rate','fraction'],['assumptions.valuation_multiple','dimensionless'],...Array.from({length:12},(_,i)=>[`assumptions.seasonality[${i}]`,'dimensionless']),['assumptions.risk_configuration','record']]);
const biz=sheets[0];table(biz,25,'Sources: use stable IDs; JSON arrays in source_ids cells',['source_id','kind','title','period_start','period_end','locator'],[Array(6).fill(null)],'Sources');
table(biz,33,'Completion instructions',['Step','Action'],[
 ['1','Fill values and actual periods. Add sources using stable IDs. Duplicate row groups with new IDs when needed.'],
 ['2','State entered or reviewed_estimate accurately. Do not invent review actors or approve your own server confirmation.'],
 ['3','Lists are JSON arrays, such as ["source-1"]. Numeric values stay numeric; raw text preserves source precision.'],
 ['4','Historical ticket is computed by the application. Zero jobs means unavailable, not zero ticket.'],
 ['5','Confirm pooling, demand evidence and workforce facts. Unsupported trades, dates, debt or cohorts remain drafts.'],
 ['6','Review reconciliation and baseline preview in the application when implemented. This workbook does not confirm a profile.']
],'Instructions');
wb.recalculate();
console.log((await wb.inspect({kind:'region',sheetId:'Operations',range:'A9:D15',maxChars:1800})).ndjson);
console.log((await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?',options:{useRegex:true,maxResults:10},maxChars:600})).ndjson);
await fs.mkdir(out,{recursive:true});
for(const s of sheets){const img=await wb.render({sheetName:s.name,range:'A1:D15',scale:1,format:'png'});await fs.writeFile(`${out}/${s.name.replaceAll(' ','-')}.png`,new Uint8Array(await img.arrayBuffer()));}
for(const [name,range,suffix] of [['Business','A33:H43','instructions'],['Operations','A32:L43','details']]){const img=await wb.render({sheetName:name,range,scale:1,format:'png'});await fs.writeFile(`${out}/${suffix}.png`,new Uint8Array(await img.arrayBuffer()));}
await (await SpreadsheetFile.exportXlsx(wb)).save(`${out}/company-intake-v2.xlsx`);
console.log('Exported eight-sheet blank intake template.');
