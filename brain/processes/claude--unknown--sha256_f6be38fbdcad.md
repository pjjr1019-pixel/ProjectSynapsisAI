---
identity_status: resolved_medium_confidence
identity_confidence: 96
source_confidence: 0
summary_confidence: 58
unresolved_reason: 
enrichment_attempts: 1
last_successful_enrichment: 2026-04-03T16:00:34.752Z
last_failed_enrichment: 
evidence_sources: 0
special_classifier: standard
evidence_fields_present: {"executable_path":true,"signing_status":true,"product_or_company":true,"file_version":true,"signer_name":true,"sha256":true}
---
# claude

## AI Summary
Claude Code was identified with medium confidence from local executable evidence; classification=standard, trusted_source_level=none.

## What it does
This identity was resolved using local executable evidence first, then trusted external references when available. Query used: f6be38fbdcadc373e93f751d1286845f58b032690e32be8f64799380a295a79f CN="Anthropic, PBC", O="Anthropic, PBC", L=San Francisco, S=California, C=US, SERIALNUMBER=4860621, OID.2.5.4.15=Private Organization, OID.1.3.6.1.4.1.311.60.2.1.2=Delaware, OID.1.3.6.1.4.1.311.60.2.1.3=US Claude Code claude 2.1.90.0.

## Local Identity Evidence
- PID: 15876
- Parent PID: 4420
- Sample PIDs: 15876
- Image name: claude
- Executable path: c:\Users\Pgiov\.vscode\extensions\anthropic.claude-code-2.1.90-win32-x64\resources\native-binary\claude.exe
- Command line: c:\Users\Pgiov\.vscode\extensions\anthropic.claude-code-2.1.90-win32-x64\resources\native-binary\claude.exe --output-format stream-json --verbose --input-format stream-json --max-thinking-tokens 31999 --permission-promp...
- Username: PhilsPc\Pjjr1019
- CPU snapshot: 0.0%
- Memory snapshot: 61034496 bytes
- Company name: Anthropic PBC
- Product name: Claude Code
- File version: 2.1.90.0
- Signing status: unknown
- Signer name: CN="Anthropic, PBC", O="Anthropic, PBC", L=San Francisco, S=California, C=US, SERIALNUMBER=4860621, OID.2.5.4.15=Private Organization, OID.1.3.6.1.4.1.311.60.2.1.2=Delaware, OID.1.3.6.1.4.1.311.60.2.1.3=US
- SHA-256: f6be38fbdcadc373e93f751d1286845f58b032690e32be8f64799380a295a79f

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
