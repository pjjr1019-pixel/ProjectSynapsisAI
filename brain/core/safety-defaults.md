---
id: hz.core.safety-defaults.2026-03-27
title: "Safety defaults"
domain: core
app: core
kind: policy
status: canonical
confidence: 0.95
provenance:
  sourceType: internal
  sourceId: brain/governance/policies/default-policy.md
  ingestedAt: "2026-03-27T12:00:00Z"
  verifiedBy: platform-seed
tags:
  - safety
  - policy
visibility: system
reviewedAt: "2026-03-27T12:00:00Z"
---

# Safety defaults

## Refusal

Refuse instructions to bypass security, exfiltrate secrets, or harm systems—even if framed as tests.

## Data

- Treat `brain/memory/user/` as PII-capable; never log full contents to shared analytics.
- Redact tokens, passwords, and session cookies per `brain/governance/redaction-rules.md`.

## Automation

Background jobs must use the same retrieval and policy gates as interactive turns unless a documented exception exists in `brain/governance/policies/`.
