# Company sensitivity configuration editor candidate

Builds on `358bdb1`; implements P2's mapping guidance at `will 1a2022a`.

The intake page now has a blank-first risk assumption editor. Every numerical parameter is explicit; no demo configuration is loaded. Each group requires a dated existing profile source, method and limitations. Fixed factors and omitted uncertainty require acknowledgment. The server maps this into the existing complete MCConfig at `/assumptions/risk_configuration`, with scalar provenance and units. Legacy distribution parameters remain empty and XLSX risk editing remains unsupported.

Saving creates a new unreviewed draft revision and a dated owner-estimate source. Existing review, preview, acknowledgment and confirmation remain necessary; owner-estimate parameters cannot be relabeled confirmed facts. The session-owned, same-origin POST `/api/v2/intake/profiles/:id/risk-configuration` rejects extra keys, incomplete/invalid parameters and stale revisions without partial writes. Public company MC remains unavailable.

## Reproduction and evidence

Run `npm run check`, `npm test`, and `npm run build`. Focused tests: `node --test tests/intake-risk-editor.test.ts tests/intake-api.test.ts`.

For a supported macOS/Linux local review host, start with `OPERATOROS_INTAKE_REVIEW=1 OPERATOROS_INTAKE_DIRECTORY=/tmp/operatoros-risk-editor-review npm run dev -- --host 127.0.0.1`. Open `/intake`, create/import a synthetic draft, expand Company risk assumptions, explicitly supply parameters and group evidence, save, then review entered inputs. Blank fields reject; saved parameters reload; the risk field becomes a reviewed estimate only after explicit review. Browser smoke exercised save to revision 2, reload and explicit review to revision 3, with no captured console errors. This is implementation-owner evidence, not independent D/E acceptance.

## Deadline scope and next handoff

Prioritize the existing workbook -> import -> review/confirm -> deterministic comparison workflow on one macOS/Linux presentation machine. This editor is a bounded configuration candidate, not a reason to delay that primary showcase.

P2/P1 can review editor mapping and evidence capture now. No actual company parameters or empirical evidence have been supplied or accepted; the neutral synthetic test settings are contract checks only. An exact confirmed company revision/configuration fingerprint and its evidence still need publication for parameter review. Real full company aggregate execution, session/UI/lifecycle integration, joint exposure decision and independent D/E remain open. No calibration or company probability claim is made. Windows durable storage remains unsupported. No repeat full performance benchmark requested.
