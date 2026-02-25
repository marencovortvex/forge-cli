# PRODUCT VISION — FORGE CLI (pre-launch)

## Who is the initial user?
**Initial user:** senior dev / tech lead (startup or enterprise) who wants to use AI for building software **without losing governance**.

Secondary: strong solo devs who ship fast and want guardrails.

## The exact problem we solve (today)
When teams use LLMs to generate/modify systems, they lose:
- **Control:** what exactly changed and why?
- **Safety:** security/compliance signals are discovered too late.
- **Repeatability:** outputs drift; builds aren’t deterministic.
- **Auditability:** no provenance, no policy trace.

FORGE solves this by making **SPEC the source of truth** and producing:
- a deterministic compile process
- a clear **policy gate** result
- explicit **warnings vs deploy blockers**
- **provenance artifacts** by default

## What FORGE does NOT solve yet
- Production-grade deploy orchestration (Cloud Run deploy command is not shipped yet).
- Multi-tenant or enterprise compliance packs.
- Full LLM adapter layer (planned; not implemented).
- Rich UI or dashboards.

## Real scenario where someone uses FORGE tomorrow
A tech lead wants to adopt AI for scaffolding/internal tools but needs governance:
1) the team writes/updates a SPEC
2) FORGE compiles and surfaces risk early
3) CI enforces the governance contract
4) only when blockers are 0, shipping is allowed

## Why this matters (positioning)
FORGE is not a code generator.
FORGE is a **governance layer** that makes AI-built software auditable and controllable.
