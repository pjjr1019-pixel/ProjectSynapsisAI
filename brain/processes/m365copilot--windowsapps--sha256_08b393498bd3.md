---
identity_status: resolved_medium_confidence
identity_confidence: 96
source_confidence: 0
summary_confidence: 58
unresolved_reason: 
enrichment_attempts: 1
last_successful_enrichment: 2026-04-02T17:47:13.665Z
last_failed_enrichment: 
evidence_sources: 0
special_classifier: standard
evidence_fields_present: {"executable_path":true,"signing_status":true,"product_or_company":true,"file_version":true,"signer_name":true,"sha256":true}
---
# m365copilot

## AI Summary
Microsoft 365 Copilot was identified with medium confidence from local executable evidence; classification=standard, trusted_source_level=none.

## What it does
This identity was resolved using local executable evidence first, then trusted external references when available. Query used: 08b393498bd3561b24433c3daba1185d52f03c713912c81872077b8962b98bb0 CN=Microsoft Corporation, O=Microsoft Corporation, L=Redmond, S=Washington, C=US Microsoft 365 Copilot M365Copilot.exe 19.2603.55121.0.

## Local Identity Evidence
- Image name: m365copilot
- Executable path: C:/Program Files/WindowsApps/Microsoft.MicrosoftOfficeHub_19.2603.55121.0_x64__8wekyb3d8bbwe/M365Copilot.exe
- CPU snapshot: 0.0%
- Memory snapshot: 0 bytes
- Company name: Microsoft Corporation
- Product name: Microsoft 365 Copilot
- File version: 19.2603.55121.0
- Original filename: M365Copilot.exe
- Signing status: unknown
- Signer name: CN=Microsoft Corporation, O=Microsoft Corporation, L=Redmond, S=Washington, C=US
- SHA-256: 08b393498bd3561b24433c3daba1185d52f03c713912c81872077b8962b98bb0

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
