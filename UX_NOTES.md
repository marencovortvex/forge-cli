# UX NOTES — FORGE CLI (from-zero simulation)

## Goal
Capture friction and missing clarity from a new-user perspective.

## Simulation steps
1) Write a new SPEC from scratch
2) Run `npx @vortvex/forge-cli verify ...`
3) Run `compile`
4) Run generated backend
5) Run generated web

## Observed frictions / notes
- `npx` prompts "Ok to proceed?" unless user uses `-y`.
  - Recommendation: docs always use `npx -y ...`.
- The value is in the **terminal governance summary**; this should remain stable.
- Users need a clear mental model:
  - WARNINGS = safe to iterate
  - DEPLOY BLOCKERS = must block shipping
- Determinism needs to be guaranteed by tests; timestamps must be controlled.

## Clarity wins
- `POLICY_REPORT.json` + `BUILD_PROVENANCE.json` are the “enterprise feeling” artifacts.
- The summary output is the core demo.
