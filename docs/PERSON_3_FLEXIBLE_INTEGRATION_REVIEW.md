# P3 shared contract/UI review — flexible investment integration

Integrated P2/P1 `890f3e8` (candidate `acfba83`, P1 financial disposition `af4bb32`)
with P3 plan/editor/chart/risk work `0df8b22`. The merge required one page conflict;
shared candidate schemas, generated contracts and engine code match `890f3e8`
unchanged. Original demo/reference economics remain unchanged.

## Disposition and resulting controls

No blocking shared contract/UI finding within the documented candidate scope.
Both new decision types retain `flexible-investment-1-candidate`, full provenance,
additive discovery and fixed-entered-cost MC treatment. Authoritative generation,
TypeScript validation, original reference reproduction and saved MC result context
checks pass. This closes P3's requested #3 contract/UI review; it does not accept
new operational benefits, real-company intake, a completed custom ensemble, hosting,
or all Gate D/E display requirements.

The unified Add investment selector discovers candidate types from metadata and
supports custom expenses/assets inside any new/copied plan. Both use the existing
add/remove flow. Names and numeric fields edit only the selected plan; shared
copied items detach to a fresh key before editing, including renamed custom items
because current shared-action validation includes names. Original plans stay intact.
Candidate disclosures explain fixed costs, same-month expenses, purchase/service/
loan timing and separation from existing company expenses. No benefit is inferred
from an item's name. P1's five-year explanation is retained in a disclosure beside
the timeline/operating explanation, avoiding two always-expanded result narratives.

## Verification

- `npm test`: 125 passing, including the candidate real-engine financial tests,
  P1 explanation tests, and a new composed custom-plan/copy/rename/funding-isolation
  test. Artifact/type/frozen 61-state reference checks pass.
- `npm run check`: zero errors/warnings. `npm run build`: app and MC worker pass.
- `npm run test:mc:artifact`: original 2,000 × 3 recorded context remains valid,
  with 195 probability and 2,753 quantile objects; no new full ensemble run.
- `OPERATOROS_API_BASE_URL=http://127.0.0.1:4174 OPERATOROS_EXPECT_MC_READY=1 npm run test:api:live`: passes.
- Compiled browser: added/renamed $1,000/month dispatch software for 12 months and
  $10,000 cash diagnostic equipment to combined plan. Month-1 EBITDA $61,500,
  cash $344,993 (display-rounded), revenue $416,667; baseline and truck-only unchanged.
- Copied that plan, renamed its expense and changed it to $2,000/month. Copy EBITDA
  $60,500 / cash $344,243; original still $61,500 / $344,993 and its input remained
  $1,000. Removed the copied custom action and plan; stale/rerun flow works.
- Browser console clean; document and viewport widths both 1120px. UI verification
  inputs are temporary session data, not committed fixture/example changes.

## Next owners

P1/P2: review the combined display at the published integration commit for Gate D;
reuse prior numerical evidence instead of repeating the full financial investigation.
P3's new intake proposal is `COMPANY_PROFILE_CONTRACT_PROPOSAL.md`, separately
versioned and explicitly unimplemented. P1/P2 review that specific mapping before
P2 finalizes matching template columns and P3 encodes runtime contracts.
