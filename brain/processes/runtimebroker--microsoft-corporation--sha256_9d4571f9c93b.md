---
identity_status: resolved_medium_confidence
identity_confidence: 96
source_confidence: 0
summary_confidence: 58
unresolved_reason: 
enrichment_attempts: 1
last_successful_enrichment: 2026-04-02T05:13:06.694Z
last_failed_enrichment: 
evidence_sources: 0
special_classifier: standard
evidence_fields_present: {"executable_path":true,"signing_status":true,"product_or_company":true,"file_version":true,"signer_name":true,"sha256":true}
---
# runtimebroker

## AI Summary
Microsoftr Windowsr Operating System was identified with medium confidence from local executable evidence; classification=standard, trusted_source_level=none.

## What it does
This identity was resolved using local executable evidence first, then trusted external references when available. Query used: 9d4571f9c93bc1cfa5f390d09ef79ac0a29656122a793cb6376027566b8d3121 CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US Microsoftr Windowsr Operating System RuntimeBroker.exe 10.0.26100.7309 (WinBuild.160101.0800).

## Local Identity Evidence
- PID: 8864
- Parent PID: 1428
- Sample PIDs: 11220, 9252, 8864
- Image name: RuntimeBroker
- Executable path: C:\Windows\System32\RuntimeBroker.exe
- Command line: C:\Windows\System32\RuntimeBroker.exe -Embedding
- Username: PhilsPc\Pjjr1019
- CPU snapshot: 0.0%
- Memory snapshot: 5517312 bytes
- Company name: Microsoft Corporation
- Product name: Microsoftr Windowsr Operating System
- File version: 10.0.26100.7309 (WinBuild.160101.0800)
- Original filename: RuntimeBroker.exe
- Signing status: unknown
- Signer name: CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US
- SHA-256: 9d4571f9c93bc1cfa5f390d09ef79ac0a29656122a793cb6376027566b8d3121

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
