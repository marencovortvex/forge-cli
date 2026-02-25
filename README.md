# FORGE CLI

FORGE is an **AI-native system compiler with visible governance**.

It turns a structured **SPEC** into a real system, while producing:
- a **policy gate** outcome (PASS/FAIL)
- **warnings vs deploy blockers** (enforcement-ready)
- **provenance** (hashes + build metadata)

## Run (3 commands)
```bash
# 1) Compile (idempotent)
npx -y @vortvex/forge-cli@0.1.1 compile ./examples/demoapp.yaml --clean -o ./output

# 2) Verify (enforces governance contract)
npx -y @vortvex/forge-cli@0.1.1 verify ./examples/demoapp.yaml -o ./output

# 3) Inspect governance artifacts
cat ./output/demoapp/POLICY_REPORT.json
```

## Example GOVERNANCE SUMMARY
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

## Concepts
- **POLICY GATE**: compile-time decision for the SPEC + policies.
- **WARNINGS**: risks surfaced early; do not block iteration.
- **DEPLOY BLOCKERS**: must block shipping (deploy should refuse).
- **PROVENANCE**: spec hash + metadata recorded in `BUILD_PROVENANCE.json`.

## Repo structure
- `forge/` — TypeScript source for the CLI
- `examples/` — demo SPECs
