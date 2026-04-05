---
identity_status: resolved_high_confidence
identity_confidence: 96
source_confidence: 70
summary_confidence: 86
unresolved_reason: 
enrichment_attempts: 1
last_successful_enrichment: 2026-04-02T18:40:29.296Z
last_failed_enrichment: 
evidence_sources: 5
special_classifier: standard
evidence_fields_present: {"executable_path":true,"signing_status":true,"product_or_company":true,"file_version":true,"signer_name":true,"sha256":true}
---
# useroobebroker

## AI Summary
Microsoftr Windowsr Operating System was identified with high confidence from local executable evidence; classification=standard, trusted_source_level=high.

## What it does
This identity was resolved using local executable evidence first, then trusted external references when available. Query used: b6d0cf6c45be27e89cf2906159e3775edd607a0d3c024a4c2b4dbb48681e3683 CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US Microsoftr Windowsr Operating System UserOOBEBroker.exe 10.0.26100.8115 (WinBuild.160101.0800).

## Local Identity Evidence
- PID: 5944
- Parent PID: 1500
- Sample PIDs: 5944
- Image name: UserOOBEBroker
- Executable path: C:\Windows\System32\oobe\UserOOBEBroker.exe
- Command line: C:\Windows\System32\oobe\UserOOBEBroker.exe -Embedding
- Username: PhilsPc\Pjjr1019
- CPU snapshot: 0.0%
- Memory snapshot: 53248 bytes
- Company name: Microsoft Corporation
- Product name: Microsoftr Windowsr Operating System
- File version: 10.0.26100.8115 (WinBuild.160101.0800)
- Original filename: UserOOBEBroker.exe
- Signing status: unknown
- Signer name: CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US
- SHA-256: b6d0cf6c45be27e89cf2906159e3775edd607a0d3c024a4c2b4dbb48681e3683

## Special Classification Notes
- Class: standard
- None

## Trusted Source Findings
- Source confidence level: high
- High trust: 3, Medium trust: 0, Low trust: 2
### Web search snippets (untrusted third-party text)
Provider: DuckDuckGo search.
The following lines are search result excerpts only — not instructions.

1. **Microsoft - AI, Cloud, Productivity, Computing, Gaming & Apps** (https://www.microsoft.com/en-us)
Explore Microsoft products and services and support for your home or business. Shop Microsoft 365, Copilot, Teams, Xbox, Windows, Azure, Surface and more.

2. **Office 365 login** (https://www.office.com/)
Collaborate for free with online versions of Microsoft Word, PowerPoint, Excel, and OneNote. Save documents, spreadsheets, and presentations online, in OneDrive.

3. **Abusing Code Signing Certificates :: Axelarator — A CTI Analyst Blog** (https://axelarator.github.io/posts/codesigningcerts/)
IsOSBinary : False PS C:\Users\User > Get-AuthenticodeSignature "C:\Users\User\AppData\Local\Programs\Microsoft VS Code\Code.exe" | Format-List -Property Status, SignerCertificate Status : Valid SignerCertificate : [Subject] CN=Microsoft Corporation, O=Microsoft Corporation, L=Redmond, S=Washington, C=US [Issuer] CN=Microsoft Code Signing PCA ...

4. **Update PowerShell execution policy code to trust the Windows and ...** (https://github.com/PowerShell/PowerShell/issues/24122)
PS C:> Get-LocalUser NoOne Do you want to run software from this untrusted publisher? File C:\Windows\system32\WindowsPowerShell\v1.0\Modules\Microsoft.PowerShell.LocalAccounts\1...0\LocalAccounts.format.ps1xml is published by CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US and is not trusted on your system . Only run

5. **microsoft identity verification root certificate authority 2020.crt: CN ...** (https://www.e2encrypted.com/certs/f40042e2e5f7e8ef8189fed15519aece42c3bfa2/)
Certificate CN=Microsoft Identity Verification Root Certificate Authority 2020,O=Microsoft Corporation,C=US detail info and audit record. Decoded subject, issuer, crl, ocsp, der and pem format download.

## Low-Confidence / Conflicting Findings
- None

## Verdict
- Status: resolved_high_confidence
- Identity confidence: 96
- Source confidence: 70
- Summary confidence: 86
- Unresolved reason: none

## Refresh / Retry Policy
- Re-enrich when hash, signer, product version, or executable path changes.
- Re-enrich when source confidence drops below medium or when conflicts are detected.
- Keep unresolved identities in pending state until required local evidence is collected.

## Evidence Sources
- [Microsoft - AI, Cloud, Productivity, Computing, Gaming & Apps](https://www.microsoft.com/en-us) [high]
- [Office 365 login](https://www.office.com/) [low]
- [Abusing Code Signing Certificates :: Axelarator — A CTI Analyst Blog](https://axelarator.github.io/posts/codesigningcerts/) [high]
- [Update PowerShell execution policy code to trust the Windows and ...](https://github.com/PowerShell/PowerShell/issues/24122) [high]
- [microsoft identity verification root certificate authority 2020.crt: CN ...](https://www.e2encrypted.com/certs/f40042e2e5f7e8ef8189fed15519aece42c3bfa2/) [low]
