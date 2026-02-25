# ROADMAP — Next 30 Days (CLI-only)

## Theme 1: Hardening (highest priority)
- Determinism test in CI (compile twice → same tree hash)
- Negative specs + negative tests in CI
- Error-message quality (human, actionable, no ugly stack traces)
- Stable governance summary contract

## Theme 2: Governance evolution (design-first)
- Enforcement modes:
  - standard (current)
  - strict (planned)
  - audit (planned)
  - permissive (planned)
- Spec versioning: formal `spec_version` in DSL + compatibility rules

## Theme 3: LLM Abstraction Layer (design only)
- Adapter interface: propose/repair SPEC, never emit raw code
- Governance events model (audit trail) — design doc only

## Theme 4: Deploy (incremental)
- `forge deploy` to Cloud Run (after hardening is solid)
- Deploy respects deploy_blockers (hard stop)

## Theme 5: Telemetry (minimal)
- Compile/verify metrics (duration, policy failures) written to local JSONL (optional)
