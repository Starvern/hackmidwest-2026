// Original P2 reproduction; now passes at 0177fd0. Equivalent P3 coverage is in the default suite.
import test from 'node:test';
import assert from 'node:assert/strict';
import { importWorkbook } from '../../src/lib/server/intake/import.ts';
import { populatedWorkbook, mutated, setCell } from '../../tests/intake-import-fixture.ts';
test('P2 finding: an internal blank row must not silently discard later populated field rows',()=>{
  const bytes=mutated(files=>{for(const c of 'ABCDEFGHIJKLMNOPQRS')setCell(files,1,`${c}11`,null);},populatedWorkbook());
  // If gaps are unsupported, reject with a bounded diagnostic. Returning success while
  // discarding populated currency/date/basis rows below the gap is not acceptable.
  assert.throws(()=>importWorkbook(bytes),/row|gap|table|field/i);
});
