import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eligibleFixture } from './intake-fixture.ts';
import { compileProfile, previewProfile } from '../src/lib/server/intake/compiler.ts';
import { assessIntake } from '../src/lib/server/intake/eligibility.ts';
import { CompanyInputSchema } from '../src/lib/server/schemas.ts';

const identity = () => ({ profile_id: randomUUID(), revision: 3 });
test('P2: compiled bottleneck, spare capacity and zero resources preserve explicit demand', () => {
  for (const [demand, vehicles, completed, unserved] of [[600,8,480,120],[400,8,400,0],[600,0,0,600]]) {
    const p=eligibleFixture(); p.operations.base_monthly_demand.value=demand;
    p.operations.service_vehicles_available.value=vehicles;
    const before=structuredClone(p), compiled=compileProfile(p,identity());
    const m=previewProfile(compiled).baseline.months[1];
    assert.equal(m.operations?.technician_capacity_jobs,600);
    assert.equal(m.operations?.vehicle_capacity_jobs,vehicles*60);
    assert.equal(m.operations?.service_demand_jobs,demand);
    assert.equal(m.operations?.completed_jobs,completed);
    assert.equal(m.operations?.unserved_jobs,unserved);
    assert.equal(m.financials.revenue,completed*175);
    assert.deepEqual(p,before);
  }
});
test('P2: ticket review preserves zero-job unavailability and separately reviewed weighted forecast', () => {
  const p=eligibleFixture();
  p.operations.service_mix.value![0].completed_jobs=null;
  p.operations.service_mix.value![0].service_revenue_usd=null;
  for (const [i,jobs,revenue] of [[0,10,1000],[1,30,6000],[2,0,0]]) {
    const h=p.history[i];h.service_jobs.value=jobs;h.service_revenue.value=revenue;
    h.revenue.value=revenue;h.ebitda.value=revenue-h.cogs.value!-h.operating_overhead.value!;
  }
  const report=assessIntake(p);
  assert.equal(report.input_eligible,true,JSON.stringify(report.issues));
  assert.equal(report.historical_tickets[0].value,100);
  assert.equal(report.historical_tickets[1].value,200);
  assert.equal(report.historical_tickets[2].status,'unavailable');
  assert.equal(report.historical_tickets[2].reason,'zero_jobs');
  p.operations.forecast_ticket.value=(1000+6000)/(10+30);
  p.operations.forecast_ticket.derivation={mapping_version:'company-mapping-2-draft',rule:'Weighted compatible periods',inputs:['/history/0/service_revenue','/history/1/service_revenue','/history/0/service_jobs','/history/1/service_jobs']};
  const compiled=compileProfile(p,identity());
  assert.equal(compiled.company.operations.average_ticket,175);
  assert.deepEqual(compiled.source_sidecar.operations.forecast_ticket.derivation,p.operations.forecast_ticket.derivation);
  p.history[2].service_revenue.value=500;p.history[2].revenue.value=500;
  p.history[2].ebitda.value=500-p.history[2].cogs.value!-p.history[2].operating_overhead.value!;
  assert.equal(assessIntake(p).input_eligible,false);
  assert.throws(()=>compileProfile(p,identity()),/blocking/);
});
test('P2: seasonality is projected once; invalid factors, pools and workforce block compilation', () => {
  const p=eligibleFixture();p.operations.base_monthly_demand.value=100;
  p.assumptions.seasonality.forEach((f,i)=>{f.value=i<6?.5:1.5;});
  const compiled=compileProfile(p,identity()), path=previewProfile(compiled).baseline;
  assert.equal(path.months[1].operations?.service_demand_jobs,50);
  assert.equal(path.months[7].operations?.service_demand_jobs,150);
  for(const change of [
    (v:typeof p)=>v.assumptions.seasonality.forEach(f=>{f.value=0;}),
    (v:typeof p)=>{v.operations.pooling_suitable.value=false;},
    (v:typeof p)=>{v.operations.service_mix.value![0].trade='plumbing';},
    (v:typeof p)=>{v.operations.workforce_availability.value={declaration:'itemized',constraints:[{row_id:'part-time',people:2,kind:'part_time',available_fraction:.5,productivity_fraction:1,pool_id:'pool',description:'Two part-time staff',source_ids:['source']}]};},
    (v:typeof p)=>{v.operations.demand_evidence.value=null;v.operations.demand_evidence.state='unknown';v.operations.demand_evidence.review=null;v.operations.demand_evidence.source_ids=[];},
  ]) {const v=structuredClone(p);change(v);assert.equal(assessIntake(v).input_eligible,false);assert.throws(()=>compileProfile(v,identity()),/blocking/);}
});
test('P2: engine provenance retains exact revision, units, evidence and independent source snapshots', () => {
  const p=eligibleFixture(), id=identity();
  p.operations.forecast_ticket.state='reviewed_estimate';
  p.operations.forecast_ticket.raw={text:'175.00',unit:'USD/job',precision:'0.01'};
  p.sources[0].kind='owner_estimate';
  const c=compileProfile(p,id);CompanyInputSchema.parse(c.company);
  for(const [target,source,unit] of [
    ['/operations/technicians','/operations/service_technicians_employed','count'],
    ['/operations/max_jobs_per_tech_per_day','/operations/jobs_per_technician_day','jobs/resource/day'],
    ['/operations/average_ticket','/operations/forecast_ticket','USD/job'],
    ['/global_assumptions/seasonality/0','/assumptions/seasonality/0','multiple'],
  ]){const f=c.company.provenance[target];assert.equal(f.kind,'profile_source');assert.equal(f.unit,unit);assert.deepEqual(f.profile_ref,{...id,mapping_version:'company-mapping-2-draft',pointers:[source],source_ids:['source']});}
  assert.equal(c.source_sidecar.operations.forecast_ticket.state,'reviewed_estimate');
  assert.equal(c.source_sidecar.operations.forecast_ticket.raw?.text,'175.00');
  assert.equal(c.source_sidecar.sources[0].kind,'owner_estimate');
  assert.deepEqual(c.company.global_assumptions.distribution_parameters,{});
  p.operations.forecast_ticket.value=999;
  assert.equal(c.source_sidecar.operations.forecast_ticket.value,175);
});
