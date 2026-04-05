---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-provenance.mjs"
source_name: "brain-provenance.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 598
content_hash: "d0ffcb8d8bb295984d4808b663be72ee3ead764913c0d643b1c1971fb91910b6"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./brain-compliance.mjs"
exports:
  - "buildExternalProvenance"
---

# taskmanager/portable_lib/brain-provenance.mjs

> Code module; imports ./brain-compliance.mjs; exports buildExternalProvenance

## Key Signals

- Source path: taskmanager/portable_lib/brain-provenance.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-compliance.mjs
- Exports: buildExternalProvenance

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-provenance.mjs

## Excerpt

~~~javascript
import { resolveLicensePolicy, scanForPii } from "./brain-compliance.mjs";

export function buildExternalProvenance(input = {}) {
  const licensePolicy = resolveLicensePolicy(input.license);
  const pii = input.piiText ? scanForPii(input.piiText) : { status: "clean", matches: [] };
  return {
    sourceType: "import",
    importLayer: String(input.importLayer || "live").trim(),
    sourceUrl: String(input.sourceUrl || "").trim(),
    sourceDomain: String(input.sourceDomain || "").trim(),
    fetchedAt: String(input.fetchedAt || new Date().toISOString()).trim(),
    contentHash: String(input.contentHash || "").trim(),
    hash: String(input.hash || input.contentHash || "").trim(),
    license: licensePolicy.license,
    licenseRisk: String(input.licenseRisk || licensePolicy.risk).trim(),
    retrievalSafe:
      input.retrievalSafe === undefined ? licensePolicy.retrievalSafe : input.retrievalSafe === true,
    trainingSafe:
      input.trainingSafe === undefined ? licensePolicy.trainingSafe : input.trainingSafe === true,
    piiScan: String(input.piiScan || pii.status || "clean").trim(),
    freshness: input.freshness ?? String(input.fetchedAt || "").trim(),
    ttlHours: Number(input.ttlHours || 0) || undefined,
    tool: String(input.tool || "horizons-ingestion").trim(),
    script: String(input.script || "").trim(),
    version: String(input.version || "1.0.0").trim(),
  };
}
~~~