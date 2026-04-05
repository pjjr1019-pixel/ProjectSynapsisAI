---
identity_status: resolved_medium_confidence
identity_confidence: 96
source_confidence: 0
summary_confidence: 58
unresolved_reason: 
enrichment_attempts: 1
last_successful_enrichment: 2026-04-02T05:36:11.034Z
last_failed_enrichment: 
evidence_sources: 0
special_classifier: standard
evidence_fields_present: {"executable_path":true,"signing_status":true,"product_or_company":true,"file_version":true,"signer_name":true,"sha256":true}
---
# powershell

## AI Summary
Microsoftr Windowsr Operating System was identified with medium confidence from local executable evidence; classification=standard, trusted_source_level=none.

## What it does
This identity was resolved using local executable evidence first, then trusted external references when available. Query used: 0ff6f2c94bc7e2833a5f7e16de1622e5dba70396f31c7d5f56381870317e8c46 CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US Microsoftr Windowsr Operating System PowerShell.EXE.MUI 10.0.26100.5074 (WinBuild.160101.0800).

## Local Identity Evidence
- PID: 13152
- Parent PID: 15120
- Sample PIDs: 18948, 18988, 17140, 17600, 19304, 19884, 19056, 19128, 12244, 13152, 10456, 11676, 16048, 16416, 14832, 14992
- Image name: powershell
- Executable path: C:\WINDOWS\System32\WindowsPowerShell\v1.0\powershell.exe
- CPU snapshot: 0.0%
- Memory snapshot: 83161088 bytes
- Company name: Microsoft Corporation
- Product name: Microsoftr Windowsr Operating System
- File version: 10.0.26100.5074 (WinBuild.160101.0800)
- Original filename: PowerShell.EXE.MUI
- Signing status: unknown
- Signer name: CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US
- SHA-256: 0ff6f2c94bc7e2833a5f7e16de1622e5dba70396f31c7d5f56381870317e8c46

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
