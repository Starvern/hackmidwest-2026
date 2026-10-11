import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const requireArtifact=createRequire(path.join(process.env.ARTIFACT_NODE_MODULES,'..','artifact-loader.cjs'));
const {FileBlob,SpreadsheetFile}=await import(pathToFileURL(requireArtifact.resolve('@oai/artifact-tool')).href);
const out='outputs/showcase-demo';
const wb=await SpreadsheetFile.importXlsx(await FileBlob.load('outputs/intake-v2/company-intake-v2.xlsx'));
await fs.mkdir(out,{recursive:true});
if(process.argv[2]==='preview'){
 const image=await wb.render({sheetName:'Business',range:'A1:D15',scale:1,format:'png'});
 await fs.writeFile(`${out}/before.png`,new Uint8Array(await image.arrayBuffer()));
}else{
 for(const sheet of JSON.parse(await fs.readFile(`${out}/cells.json`,'utf8'))){
  const s=wb.worksheets.getItem(sheet.name);
  for(const [n,cells]of sheet.rows)for(const[col,value]of cells)s.getRange(`${col}${n}`).values=[[col==='D'&&value==='confirmed'?'entered':value]];
  s.getRange('A5').values=[['Synthetic showcase data. Review in the application. Company risk configuration is unknown.']];
 }
 const business=wb.worksheets.getItem('Business');
 business.getRange('C10').values=[['Showcase HVAC (synthetic)']];
 business.getRange('C28').values=[['Synthetic showcase assumptions; no actual company records']];
 for(let i=0;i<8;i++)wb.worksheets.getItemAt(i).getRange('Q10:R260').clear({applyTo:'contents'});
 wb.recalculate();
 for(const name of ['Business','Operations']){
  const image=await wb.render({sheetName:name,range:'A1:D24',scale:1,format:'png'});
  await fs.writeFile(`${out}/${name}.png`,new Uint8Array(await image.arrayBuffer()));
 }
 await(await SpreadsheetFile.exportXlsx(wb)).save(`${out}/showcase-company.xlsx`);
 console.log('Exported populated showcase workbook.');
}
