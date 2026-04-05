# Tool contracts (shared)

Define how tools are invoked and what the model may assume.

## General

- Tools may return errors; the model must surface failures without inventing success.
- Destructive or high-impact actions require explicit user confirmation per product policy (see `brain/governance/policies/default-policy.md`).
- Log references: use `traceId` from runtime when describing “what ran,” never paste secrets.

## Extensibility

Per-app tools register in code; knowledge here documents **behavioral** expectations only. Update this file when adding a new tool family so retrieval stays consistent.
