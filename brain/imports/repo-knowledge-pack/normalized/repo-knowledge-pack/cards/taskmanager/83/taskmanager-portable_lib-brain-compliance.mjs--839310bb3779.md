---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-compliance.mjs"
source_name: "brain-compliance.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 582
content_hash: "a6ffd0eb25fb8234789578f5237909185c6531da5e6ae6a15c96f17d079625ee"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./brain-build-utils.mjs"
  - "./brain-text-tokens.mjs"
exports:
  - "async"
  - "exactContentHash"
  - "isNearDuplicate"
  - "LICENSE_MAP"
  - "nearDuplicateSimilarity"
  - "resolveLicensePolicy"
  - "scanForPii"
---

# taskmanager/portable_lib/brain-compliance.mjs

> Code module; imports ./brain-build-utils.mjs, ./brain-text-tokens.mjs; exports async, exactContentHash, isNearDuplicate, LICENSE_MAP

## Key Signals

- Source path: taskmanager/portable_lib/brain-compliance.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-build-utils.mjs, ./brain-text-tokens.mjs
- Exports: async, exactContentHash, isNearDuplicate, LICENSE_MAP, nearDuplicateSimilarity, resolveLicensePolicy

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-compliance.mjs

## Excerpt

~~~javascript
import { sha256Text } from "./brain-build-utils.mjs";
import { tokenizeForRetrieval } from "./brain-text-tokens.mjs";

export const LICENSE_MAP = {
  "public-domain": { risk: "green", retrievalSafe: true, trainingSafe: true },
  cc0: { risk: "green", retrievalSafe: true, trainingSafe: true },
  "cc-by-4.0": { risk: "green", retrievalSafe: true, trainingSafe: true },
  "us-government": { risk: "green", retrievalSafe: true, trainingSafe: true },
  "odc-by-1.0": { risk: "green", retrievalSafe: true, trainingSafe: true },
  "rss-link-only": { risk: "yellow", retrievalSafe: true, trainingSafe: false },
  unknown: { risk: "red", retrievalSafe: false, trainingSafe: false },
};

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_RE = /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?){2}\d{4}\b/;
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/;

function normalizeLicense(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

export function resolveLicensePolicy(license) {
  const normalized = normalizeLicense(license) || "unknown";
  return {
    license: normalized,
~~~