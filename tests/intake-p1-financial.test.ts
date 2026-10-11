import test from 'node:test';
import assert from 'node:assert/strict';
import { eligibleFixture, f } from './intake-fixture.ts';
import { ProfilePayloadSchema } from '../src/lib/server/intake/schemas.ts';
import { compileProfile, previewProfile } from '../src/lib/server/intake/compiler.ts';
import { assessIntake } from '../src/lib/server/intake/eligibility.ts';
const identity={profile_id:'ac70439a-c9ec-4200-959a-6917b28d56f4',revision:1};
test('P1 exact first-month financial bridge and source snapshot',()=>{
 const p=eligibleFixture(), before=structuredClone(p);
 const c=compileProfile(p,identity), r=previewProfile(c).baseline.months[1];
 assert.equal(r.financials.revenue,84000);
 assert.equal(r.financials.cogs,30400);
 assert.equal(r.financials.ebitda,43600);
 assert.equal(r.financials.cash_taxes,10900);
 assert.equal(r.financials.delta_nwc,13300);
 assert.equal(r.financials.cash_end,19300);
 assert.deepEqual(p,before);
 assert.deepEqual(c.source_sidecar,p);
});
test('P1 capped loan and existing depreciation are charged once',()=>{
 const p=eligibleFixture(), b=previewProfile(compileProfile(p,identity));
 p.opening.debt_declaration.value='itemized';
 p.opening.loans=[ProfilePayloadSchema.shape.opening.shape.loans.element.parse({row_id:'loan',lender:f('Bank','text'),name:f('Loan','text'),amortization_policy:f('level_principal','text'),terms_source:f('source','text'),outstanding_principal:f(250,'USD'),monthly_principal:f(100,'USD'),annual_rate:f(.12,'annual_fraction'),remaining_term:f(3,'months'),next_payment_date:f('2027-01-15','ISO_date')})];
 p.opening.asset_declaration.value='itemized';
 p.opening.assets=[ProfilePayloadSchema.shape.opening.shape.assets.element.parse({row_id:'asset',name:f('Asset','text'),cost_basis:f(1000,'USD'),accumulated_depreciation:f(400,'USD'),monthly_depreciation:f(100,'USD/month'),remaining_life:f(6,'months'),service_date:f('2025-01-01','ISO_date')})];
 p.assumptions.existing_depreciation_per_year.value=1200;
 const a=previewProfile(compileProfile(p,identity));
 for(let m=1;m<=7;m++){
  const ax=a.baseline.months[m], by=b.baseline.months[m];
  assert.equal(ax.is_opening_state,false); assert.equal(by.is_opening_state,false);
  if(ax.is_opening_state || by.is_opening_state) throw new Error("Expected forecast month");
  const x=ax.financials,y=by.financials;
  assert.equal(x.ebitda,y.ebitda);
  assert.equal(x.depreciation,m<=6?100:0);
  assert.equal(x.debt_principal,m<=2?100:m===3?50:0);
  assert.equal(x.cash_interest,m===1?2.5:m===2?1.5:m===3?.5:0);
 }
 assert.equal(a.baseline.months[1].financials.cash_end,19223.125);
});
test('P1 included and replacement expense details never add twice; annual cash blocks',()=>{
 const p=eligibleFixture(), b=previewProfile(compileProfile(p,identity));
 const row=ProfilePayloadSchema.shape.expense_ledger.element.parse({row_id:'cost',name:f('Subscription','text'),category:f('overhead','text'),source_period:f('2026','text'),currency:f('USD','text'),frequency:f('monthly','text'),target_bucket:f('fixed_overhead_per_month','text'),mapping_mode:f('included_detail','text'),allocation_rule:f('Included','text'),raw_amount:f(1000,'USD'),normalized_recognition_amount:f(1000,'USD/month'),coverage_start:f('2026-01-01','ISO_date'),coverage_end:f('2026-12-31','ISO_date'),irregular_payment:f(false,'boolean')});
 p.expense_ledger=[row];
 assert.deepEqual(previewProfile(compileProfile(p,identity)).baseline.months.map(r=>r.financials),b.baseline.months.map(r=>r.financials));
 row.mapping_mode.value='replace_total';
 assert.throws(()=>compileProfile(p,identity),/blocking/);
 row.normalized_recognition_amount.value=10000;
 assert.deepEqual(previewProfile(compileProfile(p,identity)).baseline.months.map(r=>r.financials),b.baseline.months.map(r=>r.financials));
 row.frequency.value='annual';row.raw_amount.value=120000;row.irregular_payment.value=true;
 assert.throws(()=>compileProfile(p,identity),/blocking/);
});

test('P1 conflicting source cents and normalized totals block without mutation',()=>{
 const p=eligibleFixture();
 p.history[0].revenue.raw={text:'70000.01',unit:'USD',precision:'0.01'};
 const before=structuredClone(p);
 const report=assessIntake(p);
 assert.ok(report.issues.some(i=>i.code==='SOURCE_CONFLICT' && i.pointer==='/history/0/revenue'));
 assert.equal(report.historical_tickets[0].reason,'source_conflict');
 assert.throws(()=>compileProfile(p,identity),/blocking/);
 assert.deepEqual(p,before);
 // Normalized arithmetic is inconsistent too: do not plug the extra cent into EBITDA.
 p.history[0].revenue.raw=null;
 p.history[0].revenue.value=70000.01;
 assert.throws(()=>compileProfile(p,identity),/blocking/);
});

test('P1 unsupported loan terms and duplicated marketing block before execution',()=>{
 const p=eligibleFixture();
 p.operations.baseline_marketing_in_overhead.value=10000.01;
 assert.ok(assessIntake(p).issues.some(i=>i.code==='DUPLICATE_COST_MAPPING'));
 assert.throws(()=>compileProfile(p,identity),/blocking/);
 p.operations.baseline_marketing_in_overhead.value=2000;
 p.opening.debt_declaration.value='itemized';
 p.opening.loans=[ProfilePayloadSchema.shape.opening.shape.loans.element.parse({row_id:'bad-loan',lender:f('Bank','text'),name:f('Loan','text'),amortization_policy:f('level_principal','text'),terms_source:f('source','text'),outstanding_principal:f(250,'USD'),monthly_principal:f(100,'USD'),annual_rate:f(.12,'annual_fraction'),remaining_term:f(2,'months'),next_payment_date:f('2027-01-15','ISO_date')})];
 assert.ok(assessIntake(p).issues.some(i=>i.code==='UNSUPPORTED_DEBT'));
 assert.throws(()=>compileProfile(p,identity),/blocking/);
 p.opening.loans[0].remaining_term.value=3;
 p.opening.loans[0].amortization_policy.value='equal_payment';
 assert.throws(()=>compileProfile(p,identity),/blocking/);
 p.opening.loans[0].amortization_policy.value='level_principal';
 p.opening.loans[0].next_payment_date.value='2027-02-15';
 assert.throws(()=>compileProfile(p,identity),/blocking/);
});
