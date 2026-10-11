# P2 company risk configuration evidence and activation guidance

Guidance against P3 `358bdb1`; responds to issue #2's P2 handoff. This specifies
the review gate, not approval of any company distribution or public activation.

## One authoritative mapping

Use the existing profile field `/assumptions/risk_configuration`. Its value is the
complete `MCConfigSchema` object, including versions and scalar-leaf provenance.
Keep the profile envelope's dated coverage, source IDs and server review alongside
it. The internal resolver requires confirmed/reviewed_estimate state, review and
sources, and parses the complete config. Schema validity and server review alone
do not prove statistical calibration or joint approval.

Retain current config/sampler/execution literals and validators; a semantic or
family change requires coordinated contract review. The deterministic compiler's
legacy `distribution_parameters` stays empty. No second manifest, replacement
schema, demo-loader fallback or automatic copying of synthetic distributions.
Revision-2 XLSX currently rejects entered risk configuration; keep it unknown there.
P3 should use the authoritative profile draft/review flow for future configuration
editing. Workbook support would need its own explicit mapping revision and review.

## Evidence required for each risk group

Every parameter needs existing MC scalar-pointer provenance with the required unit.
Profile sources should identify the supporting document/data, applicable company,
date range, method and limitations. Review notes must distinguish measured evidence
from an elicited estimate or illustrative assumption. Do not invent evidence or
mark a fitted parameter as measured merely because its underlying records are real.

| Existing config group | Required evidence and interpretation |
| --- | --- |
| `macro`, `mappings.demand`, `mappings.ticket` | State time scale, persistence, innovation/clamp assumptions and common-driver dependence. Separate unconstrained demand from completed jobs and ticket from revenue; disclose capacity censoring, mix, seasonality and growth treatment. Twelve aggregate revenue months do not establish these distributions or annual persistence. |
| `mappings.valuation_multiple` | Document request-relative loading, positive bounds and expansion to the requested multiple; source the valuation sensitivity independently of operating sales history. P1 reviews valuation policy. |
| `shared.wage`, `shared.vehicle_opex` | Identify payroll/fleet cost coverage and normalization against deterministic inputs. Explain triangular endpoints/mode and shared-path dependence; disclose omitted cost categories and mean shifts. |
| `decision.marketing_effectiveness` | Identify campaign cohorts, lag, spend and attributable incremental booked demand; document confounding and why the multiplier range applies to the proposed action. Sales growth alone is insufficient attribution. |
| `decision.truck_service_delay_offset`, `hiring_delay_offset`, `ramp_offset` | Source delivery, recruitment and productivity-ramp observations or reviewed operator estimates. Explain offsets relative to configured baseline delays, integer-month probabilities and floor-at-zero behavior. Keep stable action-key pairing. |
| `fixed_market_factors` | Explicitly acknowledge factors fixed at 1 as omitted uncertainty. They are not proof that overhead, direct costs or other revenue have no risk. |

For an empirical calibration claim, retain the input sample definition, observation
count/coverage, exclusions/missingness, fitting method, dependence assumptions and
validation evidence (including holdout evidence where available, or its absence).
There is no accepted universal minimum sample size or automatic fitter in this MVP.
Insufficient data must remain a disclosed estimate/unknown, not fabricated precision.

## Two separate decisions

The existing synthetic Gate C settings demonstrate engine behavior under illustrative
assumptions. They do not approve another company's parameters. A separately approved
company sensitivity configuration can remain explicitly illustrative/reviewed_estimate;
it must not be described as calibrated default/failure probabilities. Whether to expose
that company sensitivity mode publicly is a joint product decision still outstanding.
Actual calibrated-company claims require the empirical evidence above and explicit
P1/P2 approval; none is supplied by the current synthetic fixture or storage tests.

P2 reviews sampling mapping, units, data relevance, dependence and limitations. P1
reviews economic/valuation interpretation and overrides. P3 owns authoritative
validation, source/review UX, immutable confirmed revision binding and execution
integration. Record approvals against the exact profile revision and config fingerprint;
changed parameters/evidence require a new reviewed revision and acceptance decision.

## Concrete activation handoff

1. P3 publishes the configuration editing/review candidate using the existing profile
   contract, visibly distinguishing estimates, unsupported risks and calibrated claims.
2. P2/P1 review one explicit company configuration and its evidence at an exact revision
   and fingerprint. Unknown, missing or unreviewed configuration continues to block MC.
3. On a supported host, execute a real company worker aggregate at accepted product
   run counts, seed and exact plan/config context; verify result binding, paired paths,
   denominator/quantile semantics and relevant accounting checks. Neutral-path equality
   and synthetic transport/storage summaries alone do not satisfy this execution gate.
   Reuse existing benchmark evidence where applicable; do not repeat a full benchmark
   without a performance change or unresolved concern.
4. P3 completes session API/UI activation and lifecycle handling, followed by independent
   browser D and release E review. Public activation remains blocked until the affected
   owners explicitly accept that scope. Windows durable storage remains unsupported.

No numerical parameters, runtime behavior, engine policy or gate status change here.
