import test from 'node:test';
import assert from 'node:assert/strict';
import { importWorkbook } from '../src/lib/server/intake/import.ts';
import { readXlsx } from '../src/lib/server/intake/xlsx.ts';
import { blankWorkbook, populatedWorkbook, mutated, setCell } from './intake-import-fixture.ts';

test('P2 actual workbook: reordered history fields join stable IDs and preserve dates/zero/source precision',()=>{
  const base=populatedWorkbook(), sheet=readXlsx(base)[1];
  const bytes=mutated(files=>{
    // Swap whole records across months, not merely labels; stable IDs must own the join.
    for(const column of 'ABCDEFGHIJKLMNOPQRS'){
      const a=sheet.rows.get(10)?.get(column)?.value??null;
      const b=sheet.rows.get(23)?.get(column)?.value??null;
      setCell(files,2,`${column}10`,b);setCell(files,2,`${column}23`,a);
    }
  },base);
  const p=importWorkbook(bytes).profile;
  assert.equal(p.history.length,12);
  const january=p.history.find(h=>h.row_id==='history-01')!;
  assert.equal(january.period,'2026-01');assert.equal(january.other_revenue.value,0);
  assert.equal(january.service_revenue.raw?.text,'70000.00');
  assert.equal(january.service_revenue.raw?.precision,'0.01');
  assert.equal(p.operations.demand_evidence.state,'entered');
  assert.equal(p.operations.demand_evidence.review,null);
  assert.equal(p.operations.demand_evidence.value?.kind,'reviewed_estimate');
});
test('P2 actual workbook: missing versus zero and discarded claimed approval remain distinct',()=>{
  const blank=importWorkbook(blankWorkbook()).profile;
  assert.equal(blank.opening.cash.value,null);assert.equal(blank.opening.cash.state,'unknown');
  const bytes=mutated(f=>{setCell(f,4,'C10',0);setCell(f,4,'Q10','claimed-admin');setCell(f,4,'R10','2026-12-31T00:00:00Z');},populatedWorkbook());
  const p=importWorkbook(bytes).profile;
  assert.equal(p.opening.cash.value,0);assert.equal(p.opening.cash.state,'entered');assert.equal(p.opening.cash.review,null);
  assert.ok(p.opening.cash.source_ids.some(id=>id.startsWith('xlsx-')));
});
