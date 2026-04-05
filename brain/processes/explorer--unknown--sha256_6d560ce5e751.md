---
identity_status: resolved_medium_confidence
identity_confidence: 96
source_confidence: 0
summary_confidence: 58
unresolved_reason: 
enrichment_attempts: 1
last_successful_enrichment: 2026-04-02T12:27:48.379Z
last_failed_enrichment: 
evidence_sources: 0
special_classifier: standard
evidence_fields_present: {"executable_path":true,"signing_status":true,"product_or_company":true,"file_version":true,"signer_name":true,"sha256":true}
---
# Microsoftr Windowsr Operating System

## AI Summary
Microsoftr Windowsr Operating System was identified with medium confidence from local executable evidence; classification=standard, trusted_source_level=none.

## What it does
This identity was resolved using local executable evidence first, then trusted external references when available. Query used: f468e15e73aae3ddab99ea74a9b34bab0104790e5e5b90906fafb713f3f4c7ea CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US Microsoftr Windowsr Operating System EXPLORER.EXE.MUI 10.0.26100.8117 (WinBuild.160101.0800).

## Local Identity Evidence
- Image name: explorer
- Executable path: C:/WINDOWS/Explorer.EXE
- CPU snapshot: 0.0%
- Memory snapshot: 0 bytes
- Company name: Microsoft Corporation
- Product name: Microsoftr Windowsr Operating System
- File version: 10.0.26100.8117 (WinBuild.160101.0800)
- Original filename: EXPLORER.EXE.MUI
- Signing status: unknown
- Signer name: CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US
- SHA-256: f468e15e73aae3ddab99ea74a9b34bab0104790e5e5b90906fafb713f3f4c7ea

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
