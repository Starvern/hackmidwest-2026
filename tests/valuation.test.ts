import assert from 'node:assert/strict';
import test from 'node:test';
import { calculate_valuation } from '../src/lib/server/engine/valuation.ts';
import { financialFixture } from './financial-fixture.ts';

test('FIN-08/09: first TTM drops oldest history, includes new month and bridges EV to equity', () => {
  const x = financialFixture(); x.company.historical_months.forEach((row, i) => { row.ebitda = (i + 1) * 1000; });
  x.prior.month = 1; x.prior.financial.cash = 40000; x.prior.financial.debt_tranches[0].principal = 100000;
  const before = structuredClone(x);
  assert.deepEqual(calculate_valuation(x.company, [{ ebitda: 20000 }], x.prior), {
    status: 'meaningful', ttm_ebitda: 97000, enterprise_multiple: 6, enterprise_value: 582000, equity_value: 522000,
  });
  assert.deepEqual(x, before);
});

test('month 12 uses forecast only; month 13 rolls off forecast month 1', () => {
  const x = financialFixture(); x.prior.month = 12;
  const history = Array.from({ length: 12 }, () => ({ ebitda: 10000 }));
  assert.equal(calculate_valuation(x.company, history, x.prior).ttm_ebitda, 120000);
  x.prior.month = 13; history.push({ ebitda: 20000 });
  assert.equal(calculate_valuation(x.company, history, x.prior).ttm_ebitda, 130000);
});

test('FIN-11: zero/negative TTM has explicit unavailable valuation', () => {
  for (const ebitda of [0, -1000]) {
    const x = financialFixture(); x.prior.month = 12;
    const value = calculate_valuation(x.company, Array.from({ length: 12 }, () => ({ ebitda })), x.prior);
    assert.equal(value.status, 'nonpositive_ttm_ebitda'); assert.equal(value.enterprise_value, null); assert.equal(value.equity_value, null);
  }
});

test('positive EBITDA may still yield negative equity; negative cash remains part of bridge', () => {
  const x = financialFixture(); x.prior.month = 12; x.prior.financial.cash = -100000;
  const v = calculate_valuation(x.company, Array.from({ length: 12 }, () => ({ ebitda: 1000 })), x.prior);
  assert.equal(v.enterprise_value, 72000); assert.equal(v.equity_value, -1228000);
});

test('month 0, missing months, nonfinite EBITDA and invalid multiples reject', () => {
  const x = financialFixture();
  assert.throws(() => calculate_valuation(x.company, [], x.prior));
  x.prior.month = 2; assert.throws(() => calculate_valuation(x.company, [{ ebitda: 1 }], x.prior));
  x.prior.month = 1; assert.throws(() => calculate_valuation(x.company, [{ ebitda: Infinity }], x.prior));
  x.company.global_assumptions.valuation_multiple = 0;
  assert.throws(() => calculate_valuation(x.company, [{ ebitda: 1 }], x.prior));
});
