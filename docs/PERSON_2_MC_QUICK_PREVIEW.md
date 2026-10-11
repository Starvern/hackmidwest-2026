# 100-path local risk preview

User-requested demo workflow: the fictional-business risk panel defaults to
100-path Quick preview and offers the existing 2,000-path Full run. Explicit
submission remains required. Both the selected mode and completed preview result
carry warnings about sampling instability. Saved example results retain their
original 2,000 paths; they are not relabeled previews. Changing run count marks
previous results stale, and job/result checks bind to the submitted run count.

Authoritative request/summary/result schemas add exactly 100 as a supported preview
size while preserving the previous full-run range. The local queue supports only
100 or 2,000; 5,000 remains rejected. Progress bounds and successful completion use
the actual job total. Generated JSON schemas were regenerated. No sampling formula,
distribution, seed pairing, accounting or deterministic reference changed.

Validation on Windows Node 22.20:
- 24 focused contract/job/API/client/preview tests pass.
- Contract artifact/type checks and frozen deterministic reference pass.
- Svelte zero errors/warnings; app and worker production build pass.
- Real local HTTP submission -> packaged worker -> 100 completed paths -> validated
  result retrieval passed in **99.6 seconds**, seed42, unchanged fictional example
  plans. Baseline reserve-risk eligible denominator is100. This is one observed
  timing, not a performance guarantee or a new 2,000-path benchmark.
- Browser inspection confirms preview selected, warnings visible, full option
  present and Run risk simulation enabled after initialization.

Reproduce the full preview check with `node scripts/check_mc_preview.ts` against
the opt-in server at127.0.0.1:5173 after `npm run build:mc-worker`. The script saves
its real result only under ignored `.mc-worker/preview-verification.json`; it does
not replace the published recorded example or hold a job token in an artifact.

Start locally with `OPERATOROS_MC_REVIEW=1` in the server environment. The current
Windows development server uses this setting. Restart clears process-local jobs.
Imported-company MC remains unavailable; no company assumption or browser/release
gate acceptance is implied. P3 should preserve this preview/full distinction when
integrating newer UI work, and independent review remains separate.
