/** Bounded, values-only OOXML reader. Never executes formulas or follows relationships. */
import { unzipSync, strFromU8 } from 'fflate';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { posix } from 'node:path';
export class ImportFailure extends Error {
  issues: { location: string; message: string }[];
  constructor(location: string, message: string) { super(message); this.issues = [{ location, message }]; }
}
export type Cell = { value: string | number | boolean | null; raw: string; address: string };
export type Sheet = { name: string; rows: Map<number, Map<string, Cell>> };
type Node = Record<string, any>;
const list = (v: any): Node[] => v === undefined ? [] : Array.isArray(v) ? v : [v];
const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true, parseTagValue: false, parseAttributeValue: false, trimValues: false, processEntities: false });
function xml(bytes: Uint8Array | undefined, name: string): Node {
  if (!bytes) throw new ImportFailure(name, 'Required workbook part is missing.');
  const s = strFromU8(bytes);
  if (/<!DOCTYPE|<!ENTITY/i.test(s) || XMLValidator.validate(s) !== true) throw new ImportFailure(name, 'Unsupported or malformed XML.');
  // Decode only standard XML escapes after parsing, never arbitrary entities.
  return parser.parse(s);
}
const decode = (s: unknown): string => String(s ?? '').replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/gi, e => {
  const named: Record<string, string> = { '&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'" };
  if (named[e]) return named[e];
  const n = e.startsWith('&#x') ? parseInt(e.slice(3,-1),16) : Number(e.slice(2,-1));
  return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : e;
});
const richText = (v: Node): string => decode(typeof v?.t === 'object' ? v.t['#text'] : v?.t) + list(v?.r).map(r => decode(typeof r.t === 'object' ? r.t['#text'] : r.t)).join('');
export function readXlsx(bytes: Uint8Array): Sheet[] {
  if (bytes.length > 1024 * 1024) throw new ImportFailure('Workbook', 'Workbook must be 1 MB or smaller.');
  let size = 0, count = 0; const names = new Set<string>();
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, { filter: entry => {
      if (++count > 200 || names.has(entry.name) || entry.name.includes('..') || entry.name.startsWith('/')) throw new ImportFailure('Workbook', 'Unsupported archive structure.');
      names.add(entry.name); size += entry.originalSize;
      if (entry.originalSize > 4 * 1024 * 1024 || size > 8 * 1024 * 1024) throw new ImportFailure('Workbook', 'Expanded workbook exceeds the import limit.');
      if (/vbaProject|externalLinks|embeddings|activeX/i.test(entry.name)) throw new ImportFailure('Workbook', 'Macros, embedded files and external links are unsupported.');
      return /\.xml$|\.rels$/.test(entry.name);
    } });
  } catch (e) { if (e instanceof ImportFailure) throw e; throw new ImportFailure('Workbook', 'Use a valid, unencrypted .xlsx workbook.'); }
  if (Object.values(files).reduce((n,b)=>n+b.length,0) > 8*1024*1024) throw new ImportFailure('Workbook','Expanded workbook exceeds the import limit.');
  for (const [name, data] of Object.entries(files)) if (name.endsWith('.rels')) {
    for (const rel of list(xml(data,name).Relationships?.Relationship)) if (rel['@_TargetMode'] === 'External') throw new ImportFailure(name,'External relationships are unsupported.');
  }
  const wb = xml(files['xl/workbook.xml'],'Workbook').workbook;
  if (['1','true'].includes(wb?.workbookPr?.['@_date1904'])) throw new ImportFailure('Workbook','1904 date workbooks are unsupported; use ISO dates or the standard 1900 calendar.');
  const rels = list(xml(files['xl/_rels/workbook.xml.rels'],'Workbook relationships').Relationships?.Relationship);
  const strings = files['xl/sharedStrings.xml'] ? list(xml(files['xl/sharedStrings.xml'],'Shared strings').sst?.si).map(richText) : [];
  const styles = files['xl/styles.xml'] ? xml(files['xl/styles.xml'],'Styles').styleSheet : {};
  const formats = new Map(list(styles.numFmts?.numFmt).map(f => [f['@_numFmtId'],f['@_formatCode']]));
  const xfs = list(styles.cellXfs?.xf);
  const dateStyle = (index: string) => {
    const id = xfs[Number(index)]?.['@_numFmtId'];
    return Number(id) >= 14 && Number(id) <= 22 || /[dy]/i.test(String(formats.get(id) ?? '').replace(/"[^"]*"|\[[^\]]*\]|\\./g,''));
  };
  const sheets = list(wb?.sheets?.sheet); if (sheets.length !== 8) throw new ImportFailure('Workbook','Use the eight-sheet revision-2 intake template.');
  let cells = 0;
  return sheets.map(s => {
    const name = decode(s['@_name']), rel = rels.find(r=>r['@_Id'] === s['@_id']);
    if (!rel) throw new ImportFailure(name,'Missing sheet relationship.');
    const target = String(rel['@_Target']);
    const part = target.startsWith('/') ? target.slice(1) : posix.normalize('xl/'+target);
    if (!/^xl\/worksheets\/[^/]+\.xml$/.test(part)) throw new ImportFailure(name,'Unsupported sheet relationship.');
    const sheet = xml(files[part],name).worksheet, rows = new Map<number,Map<string,Cell>>();
    for (const row of list(sheet?.sheetData?.row)) for (const c of list(row.c)) {
      if (++cells > 50000) throw new ImportFailure(name,'Too many workbook cells.');
      const address = String(c['@_r']), match = /^([A-Z]{1,3})([1-9]\d{0,4})$/.exec(address);
      if (!match || Number(match[2]) > 10000) throw new ImportFailure(name,'Unsupported cell address.');
      if ('f' in c || c['@_t'] === 'e') throw new ImportFailure(`${name}!${address}`,'Formulas and error cells are unsupported; replace with reviewed source values.');
      const raw = String(c.v ?? ''), t = c['@_t']; let value: Cell['value'];
      if (t === 's') { value = strings[Number(raw)]; if (value === undefined || !/^\d+$/.test(raw)) throw new ImportFailure(`${name}!${address}`,'Invalid shared string.'); }
      else if (t === 'inlineStr') value = richText(c.is);
      else if (t === 'str' || t === 'd') value = decode(raw);
      else if (t === 'b') { if (!['0','1'].includes(raw)) throw new ImportFailure(`${name}!${address}`,'Invalid boolean.'); value = raw === '1'; }
      else if (!raw) value = null;
      else { value = Number(raw); if (!Number.isFinite(value)) throw new ImportFailure(`${name}!${address}`,'Invalid numeric cell.');
        if (dateStyle(c['@_s'])) {
          if (!Number.isInteger(value) || value < 1 || value === 60 || value > 2958465) throw new ImportFailure(`${name}!${address}`,'Use an unambiguous whole calendar date.');
          value = new Date(Date.UTC(1899,11,31)+(value-(value>60?1:0))*86400000).toISOString().slice(0,10);
        }
      }
      const number = Number(match[2]); if (!rows.has(number)) rows.set(number,new Map());
      if (rows.get(number)!.has(match[1])) throw new ImportFailure(`${name}!${address}`,'Duplicate cell address.');
      rows.get(number)!.set(match[1],{ value: value === '' ? null : value, raw: typeof value === 'string' ? value : raw, address });
    }
    return {name,rows};
  });
}
