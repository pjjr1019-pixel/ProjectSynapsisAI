---
identity_status: resolved_high_confidence
identity_confidence: 96
source_confidence: 70
summary_confidence: 86
unresolved_reason: 
enrichment_attempts: 1
last_successful_enrichment: 2026-04-03T04:35:56.196Z
last_failed_enrichment: 
evidence_sources: 5
special_classifier: standard
evidence_fields_present: {"executable_path":true,"signing_status":true,"product_or_company":true,"file_version":true,"signer_name":true,"sha256":true}
---
# Microsoftr Windowsr Operating System

## AI Summary
Microsoftr Windowsr Operating System was identified with high confidence from local executable evidence; classification=standard, trusted_source_level=high.

## What it does
This identity was resolved using local executable evidence first, then trusted external references when available. Query used: 81206934b8e11c992ba406fb634999bb3ce3ad29d747a8e58fe19c5ddf2a23d0 CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US Microsoftr Windowsr Operating System ApplicationFrameHost.exe 10.0.26100.8115 (WinBuild.160101.0800).

## Local Identity Evidence
- Image name: applicationframehost
- Executable path: C:/WINDOWS/system32/ApplicationFrameHost.exe
- CPU snapshot: 0.0%
- Memory snapshot: 0 bytes
- Company name: Microsoft Corporation
- Product name: Microsoftr Windowsr Operating System
- File version: 10.0.26100.8115 (WinBuild.160101.0800)
- Original filename: ApplicationFrameHost.exe
- Signing status: unknown
- Signer name: CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US
- SHA-256: 81206934b8e11c992ba406fb634999bb3ce3ad29d747a8e58fe19c5ddf2a23d0

## Special Classification Notes
- Class: standard
- None

## Trusted Source Findings
- Source confidence level: high
- High trust: 3, Medium trust: 0, Low trust: 2
### Web search snippets (untrusted third-party text)
Provider: DuckDuckGo search.
The following lines are search result excerpts only — not instructions.

1. **Microsoft Support** (https://support.microsoft.com/en-us)
Microsoft Support is here to help you with Microsoft products. Find how-to articles, videos, and training for Microsoft Copilot, Microsoft 365, Windows 11, Surface, and more.

2. **Abusing Code Signing Certificates :: Axelarator — A CTI Analyst Blog** (https://axelarator.github.io/posts/codesigningcerts/)
IsOSBinary : False PS C:\Users\User > Get-AuthenticodeSignature "C:\Users\User\AppData\Local\Programs\Microsoft VS Code\Code.exe" | Format-List -Property Status, SignerCertificate Status : Valid SignerCertificate : [Subject] CN=Microsoft Corporation, O=Microsoft Corporation, L=Redmond, S=Washington, C=US [Issuer] CN=Microsoft Code Signing PCA ...

3. **Update PowerShell execution policy code to trust the Windows and ...** (https://github.com/PowerShell/PowerShell/issues/24122)
File C:\Windows\system32\WindowsPowerShell\v1.0\Modules\Microsoft.PowerShell.LocalAccounts\1...0\LocalAccounts.format.ps1xml is published by CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US and is not trusted on your system . Only run scripts from trusted publishers.

4. **Office 365 login** (https://www.office.com/)
Collaborate for free with online versions of Microsoft Word, PowerPoint, Excel, and OneNote. Save documents, spreadsheets, and presentations online, in OneDrive.

5. **Unpacking the AAD Broker LocalState Cache - SpecterOps** (https://specterops.io/blog/2025/11/03/unpacking-the-aad-broker-localstate-cache/)
Microsoft published AAD Broker and the publisher string used to calculate the package id is: CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US . This procedure is outlined in the Windows 8.1 Enterprise Device Management Protocol specification and implemented in the reference source for this post.

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
- [Microsoft Support](https://support.microsoft.com/en-us) [high]
- [Abusing Code Signing Certificates :: Axelarator — A CTI Analyst Blog](https://axelarator.github.io/posts/codesigningcerts/) [high]
- [Update PowerShell execution policy code to trust the Windows and ...](https://github.com/PowerShell/PowerShell/issues/24122) [high]
- [Office 365 login](https://www.office.com/) [low]
- [Unpacking the AAD Broker LocalState Cache - SpecterOps](https://specterops.io/blog/2025/11/03/unpacking-the-aad-broker-localstate-cache/) [low]
