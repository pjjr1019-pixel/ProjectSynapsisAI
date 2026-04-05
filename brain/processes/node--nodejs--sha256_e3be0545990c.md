---
identity_status: resolved_medium_confidence
identity_confidence: 96
source_confidence: 0
summary_confidence: 58
unresolved_reason: 
enrichment_attempts: 1
last_successful_enrichment: 2026-04-03T04:33:00.013Z
last_failed_enrichment: 
evidence_sources: 0
special_classifier: standard
evidence_fields_present: {"executable_path":true,"signing_status":true,"product_or_company":true,"file_version":true,"signer_name":true,"sha256":true}
---
# Node.js

## AI Summary
Node.js was identified with medium confidence from local executable evidence; classification=standard, trusted_source_level=none.

## What it does
This identity was resolved using local executable evidence first, then trusted external references when available. Query used: e3be0545990c90995d7bf3a7af5d64af1f2e0fc1bbd9b79c27f7abc1e9676e50 CN=OpenJS Foundation, O=OpenJS Foundation, L=San Francisco, S=California, C=US Node.js node.exe 24.13.1.

## Local Identity Evidence
- PID: 3400
- Parent PID: 4916
- Sample PIDs: 8952, 11468, 16856, 2500, 3400, 4400
- Image name: node
- Executable path: C:\Program Files\nodejs\node.exe
- Command line: node server/dev-api.mjs
- Username: PhilsPc\Pjjr1019
- CPU snapshot: 8.0%
- Memory snapshot: 229023744 bytes
- Company name: Node.js
- Product name: Node.js
- File version: 24.13.1
- Original filename: node.exe
- Signing status: unknown
- Signer name: CN=OpenJS Foundation, O=OpenJS Foundation, L=San Francisco, S=California, C=US
- SHA-256: e3be0545990c90995d7bf3a7af5d64af1f2e0fc1bbd9b79c27f7abc1e9676e50

## Special Classification Notes
- Class: standard
- None

## Trusted Source Findings
- Source confidence level: none
- High trust: 0, Medium trust: 0, Low trust: 0
No web snippet text was available.

## Low-Confidence / Conflicting Findings
- None

## Verdict
- Status: resolved_medium_confidence
- Identity confidence: 96
- Source confidence: 0
- Summary confidence: 58
- Unresolved reason: none

## Refresh / Retry Policy
- Re-enrich when hash, signer, product version, or executable path changes.
- Re-enrich when source confidence drops below medium or when conflicts are detected.
- Keep unresolved identities in pending state until required local evidence is collected.

## Evidence Sources
- None
