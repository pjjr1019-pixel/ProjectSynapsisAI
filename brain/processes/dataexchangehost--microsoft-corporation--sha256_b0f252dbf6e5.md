---
identity_status: resolved_high_confidence
identity_confidence: 96
source_confidence: 70
summary_confidence: 86
unresolved_reason: 
enrichment_attempts: 1
last_successful_enrichment: 2026-04-04T11:06:04.808Z
last_failed_enrichment: 
evidence_sources: 5
special_classifier: standard
evidence_fields_present: {"executable_path":true,"signing_status":true,"product_or_company":true,"file_version":true,"signer_name":true,"sha256":true}
---
# Microsoftr Windowsr Operating System

## AI Summary
Microsoftr Windowsr Operating System was identified with high confidence from local executable evidence; classification=standard, trusted_source_level=high.

## What it does
This identity was resolved using local executable evidence first, then trusted external references when available. Query used: b0f252dbf6e535a6c290d8938614e52326cd4cb080b065b4ddc37f9589e90313 CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US Microsoftr Windowsr Operating System DataExchangeHost.exe.mui 10.0.26100.8117 (WinBuild.160101.0800).

## Local Identity Evidence
- PID: 2508
- Parent PID: 1500
- Sample PIDs: 2508
- Image name: DataExchangeHost
- Executable path: C:\Windows\System32\DataExchangeHost.exe
- Command line: C:\Windows\System32\DataExchangeHost.exe -Embedding
- Username: PhilsPc\Pjjr1019
- CPU snapshot: 0.0%
- Memory snapshot: 4395008 bytes
- Company name: Microsoft Corporation
- Product name: Microsoftr Windowsr Operating System
- File version: 10.0.26100.8117 (WinBuild.160101.0800)
- Original filename: DataExchangeHost.exe.mui
- Signing status: unknown
- Signer name: CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US
- SHA-256: b0f252dbf6e535a6c290d8938614e52326cd4cb080b065b4ddc37f9589e90313

## Special Classification Notes
- Class: standard
- None

## Trusted Source Findings
- Source confidence level: high
- High trust: 3, Medium trust: 0, Low trust: 2
### Web search snippets (untrusted third-party text)
Provider: DuckDuckGo search.
The following lines are search result excerpts only — not instructions.

1. **Office 365 login** (https://www.office.com/)
Collaborate for free with online versions of Microsoft Word, PowerPoint, Excel, and OneNote. Save documents, spreadsheets, and presentations online, in OneDrive.

2. **Microsoft - AI, Cloud, Productivity, Computing, Gaming & Apps** (https://www.microsoft.com/en-us)
Explore Microsoft products and services and support for your home or business. Shop Microsoft 365, Copilot, Teams, Xbox, Windows, Azure, Surface and more.

3. **Hi, My Name is "CN=Microsoft Windows, O=Microsoft Corporation, L ...** (https://www.youtube.com/watch?v=ycEcGV-e6yk)
Hi, My Name is " CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US " SpecterOps 5.29K subscribers Subscribed

4. **Update PowerShell execution policy code to trust the Windows and ...** (https://github.com/PowerShell/PowerShell/issues/24122)
PS C:> Get-LocalUser NoOne Do you want to run software from this untrusted publisher? File C:\Windows\system32\WindowsPowerShell\v1.0\Modules\Microsoft.PowerShell.LocalAccounts\1...0\LocalAccounts.format.ps1xml is published by CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US and is not trusted on your system . Only run

5. **Abusing Code Signing Certificates :: Axelarator — A CTI Analyst Blog** (https://axelarator.github.io/posts/codesigningcerts/)
IsOSBinary : False PS C:\Users\User > Get-AuthenticodeSignature "C:\Users\User\AppData\Local\Programs\Microsoft VS Code\Code.exe" | Format-List -Property Status, SignerCertificate Status : Valid SignerCertificate : [Subject] CN=Microsoft Corporation, O=Microsoft Corporation, L=Redmond, S=Washington, C=US [Issuer] CN=Microsoft Code Signing PCA ...

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
- [Office 365 login](https://www.office.com/) [low]
- [Microsoft - AI, Cloud, Productivity, Computing, Gaming & Apps](https://www.microsoft.com/en-us) [high]
- [Hi, My Name is "CN=Microsoft Windows, O=Microsoft Corporation, L ...](https://www.youtube.com/watch?v=ycEcGV-e6yk) [low]
- [Update PowerShell execution policy code to trust the Windows and ...](https://github.com/PowerShell/PowerShell/issues/24122) [high]
- [Abusing Code Signing Certificates :: Axelarator — A CTI Analyst Blog](https://axelarator.github.io/posts/codesigningcerts/) [high]
