import test from 'node:test';
import assert from 'node:assert/strict';
import { ProfileStore } from '../src/lib/server/intake/store.ts';
import { prepareRiskConfiguration } from '../src/lib/server/intake/risk-editor.ts';
import { scalarLeaves } from '../src/lib/server/validation.ts';
import { eligibleFixture } from './intake-fixture.ts';
import { fieldEntries } from '../src/lib/intake/form.ts';
import { resolveProfileMCContext } from '../src/lib/server/monte-carlo/profile-context.ts';
import example from '../contracts/example-request.json' with { type: 'json' };
import { riskDraft } from './intake-risk-fixture.ts';
test('risk editor maps only complete explicit parameters into authoritative MCConfig with every scalar source/unit', () => {
  const profile = eligibleFixture(), draft = riskDraft(), before = structuredClone(draft);
  const result = prepareRiskConfiguration(draft, profile.sources);
  assert.deepEqual(draft,before);
  for (const [pointer] of scalarLeaves(result.configuration)) assert.ok(result.configuration.provenance[pointer]);
  assert.deepEqual(result.source_ids,['source']);
  assert.ok(Object.values(result.configuration.provenance).every(p => p.kind === 'assumed' && p.source.includes('no empirical calibration')));
  for (const mutate of [
    (d: any) => { d.values['macro.rho'] = ''; }, (d: any) => { d.values['macro.rho'] = '0x10'; },
    (d: any) => { d.values['macro.rho'] = '1'; }, (d: any) => { d.values['decision.ramp_offset.probabilities'] = '0.2, 0.2, 0.2'; },
    (d: any) => { d.evidence.macro.source_id = 'missing'; }, (d: any) => { d.evidence.macro.method = ''; },
    (d: any) => { d.omitted_uncertainty_acknowledged = false; }, (d: any) => { d.values.extra = '1'; },
  ]) { const bad = structuredClone(draft); mutate(bad); assert.throws(() => prepareRiskConfiguration(bad, profile.sources)); }
});
test('risk editing creates a new unreviewed estimate revision and requires reviewed sources before confirmation', () => {
  const store = new ProfileStore(':memory:');
  try {
    const created = store.create('owner',eligibleFixture()), id = created.profile_id;
    assert.throws(() => store.saveRiskConfiguration('foreign',id,1,riskDraft()), /not found/);
    const invalid = riskDraft(); invalid.values['macro.rho'] = '';
    assert.throws(() => store.saveRiskConfiguration('owner',id,1,invalid));
    assert.equal(store.list('owner')[0].revision,1);
    const saved = store.saveRiskConfiguration('owner',id,1,riskDraft());
    assert.equal(saved.profile.assumptions.risk_configuration.state,'entered');
    assert.equal(saved.profile.assumptions.risk_configuration.review,null);
    assert.equal(store.read('owner',id,1).profile.assumptions.risk_configuration.value,null);
    assert.throws(() => store.review('owner',id,saved.revision,[{pointer:'/assumptions/risk_configuration',state:'confirmed',rationale:'Relabel'}]), /retain estimate/);
    const selections = fieldEntries(saved.profile).filter(e=>e.field.value!==null).map(e=>({pointer:e.pointer,state:e.pointer==='/assumptions/risk_configuration'?'reviewed_estimate' as const:'confirmed' as const,rationale:'Synthetic review only; no calibration approval'}));
    const reviewed = store.review('owner',id,saved.revision,[...selections,...saved.profile.sources.map((_,i)=>({pointer:`/sources/${i}`,state:'confirmed' as const,rationale:'Synthetic source review'}))]);
    const preview = store.preview('owner',id,reviewed.revision); store.acknowledge('owner',id,reviewed.revision,preview.preview_id);
    const confirmed = store.confirm('owner',id,reviewed.revision);
    const input = {simulation_version:'profile-simulation-2-draft',company:confirmed.compiled!.binding,request:{...example,company_id:`profile:${id}`,monte_carlo:{enabled:true,runs:2000,seed:42}}};
    const context = resolveProfileMCContext(store,'owner',input);
    assert.equal(context.context.config_fingerprint.length,64);
    assert.deepEqual(context.snapshot.company.global_assumptions.distribution_parameters,{});
    assert.throws(()=>store.simulate('owner',input),/unavailable/);
  } finally {store.close();}
});
