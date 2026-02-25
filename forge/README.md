# @vortvex/forge-cli

FORGE is the AI-native system governance layer between **LLMs ↔ SPEC ↔ Policy ↔ Infra**.

This package provides the **MVP CLI**.

## Install (dev preview)
```bash
npm i -g @vortvex/forge-cli
```

## Quickstart (no install)
```bash
npx @vortvex/forge-cli compile path/to/spec.yaml --clean -o ./output
```

## What you get
FORGE prints a terminal-facing governance summary and generates governance artifacts:
- `POLICY_REPORT.json` (policy gate, warnings, advisories, deploy blockers)
- `BUILD_PROVENANCE.json` (spec hash + build provenance)

### Example GOVERNANCE SUMMARY
```text
FORGE GOVERNANCE SUMMARY
────────────────────────────────────────
POLICY GATE: PASS (compile)
ENFORCEMENT MODE: standard
WARNINGS (2):
- PII field detected: User.email
- Security advisory: next (GHSA-...) severity=high (see report)
DEPLOY BLOCKERS (0):
- none
REPORT: ./output/demoapp/POLICY_REPORT.json
PROVENANCE: ./output/demoapp/BUILD_PROVENANCE.json
────────────────────────────────────────
```

## Commands
- `forge validate <specPath>`
- `forge compile <specPath> --clean`
- `forge verify <specPath>` (enforces governance contract: PASS + blockers=0)
