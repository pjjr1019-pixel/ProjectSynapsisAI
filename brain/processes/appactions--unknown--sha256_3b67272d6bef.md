---
identity_status: resolved_high_confidence
identity_confidence: 96
source_confidence: 55
summary_confidence: 80
unresolved_reason: 
enrichment_attempts: 1
last_successful_enrichment: 2026-04-04T11:44:45.601Z
last_failed_enrichment: 
evidence_sources: 5
special_classifier: standard
evidence_fields_present: {"executable_path":true,"signing_status":true,"product_or_company":true,"file_version":true,"signer_name":true,"sha256":true}
---
# Microsoftr Windowsr Operating System

## AI Summary
Microsoftr Windowsr Operating System was identified with high confidence from local executable evidence; classification=standard, trusted_source_level=high.

## What it does
This identity was resolved using local executable evidence first, then trusted external references when available. Query used: 3b67272d6befd65a41065b82c67a0ffdfa28ff1b652d2290ce68803b675d7825 CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US Microsoftr Windowsr Operating System AppActions.exe 10.0.26100.8115.

## Local Identity Evidence
- Image name: appactions
- Executable path: C:/WINDOWS/SystemApps/MicrosoftWindows.Client.CBS_cw5n1h2txyewy/AppActions.exe
- CPU snapshot: 0.0%
- Memory snapshot: 0 bytes
- Company name: Microsoft Corporation
- Product name: Microsoftr Windowsr Operating System
- File version: 10.0.26100.8115
- Original filename: AppActions.exe
- Signing status: unknown
- Signer name: CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US
- SHA-256: 3b67272d6befd65a41065b82c67a0ffdfa28ff1b652d2290ce68803b675d7825

## Special Classification Notes
- Class: standard
- None

## Trusted Source Findings
- Source confidence level: high
- High trust: 2, Medium trust: 0, Low trust: 3
### Web search snippets (untrusted third-party text)
Provider: DuckDuckGo search.
The following lines are search result excerpts only — not instructions.

1. **Unpacking the AAD Broker LocalState Cache - SpecterOps** (https://specterops.io/blog/2025/11/03/unpacking-the-aad-broker-localstate-cache/)
Microsoft published AAD Broker and the publisher string used to calculate the package id is: CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US . This procedure is outlined in the Windows 8.1 Enterprise Device Management Protocol specification and implemented in the reference source for this post.

2. **Update PowerShell execution policy code to trust the Windows and ...** (https://github.com/PowerShell/PowerShell/issues/24122)
File C:\Windows\system32\WindowsPowerShell\v1.0\Modules\Microsoft.PowerShell.LocalAccounts\1...0\LocalAccounts.format.ps1xml is published by CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US and is not trusted on your system . Only run scripts from trusted publishers.

3. **Microsoft - AI, Cloud, Productivity, Computing, Gaming & Apps** (https://www.microsoft.com/en-us)
Explore Microsoft products and services and support for your home or business. Shop Microsoft 365, Copilot, Teams, Xbox, Windows, Azure, Surface and more.

4. **MicRooCerAut_2010-06-23.crt: CN=Microsoft Root ... - E2Encrypted** (https://www.e2encrypted.com/certs/3b1efd3a66ea28b16697394703a72ca340a05bd5/)
Certificate CN=Microsoft Root Certificate Authority 2010,O=Microsoft Corporation,L=Redmond,ST=Washington,C=US detail info and audit record. Decoded subject, issuer, crl, ocsp, der and pem format download.

5. **FYI: Windows Server 2022 does not have Root certificate** (https://community.letsencrypt.org/t/fyi-windows-server-2022-does-not-have-root-certificate/157208)
At the time I'm writing this, Microsoft Windows Server 2022 has not been released and is only available in "Preview". Having said that I've installed the "Preview" and experienced errors when connecting to resources that use my LE certificate. Found the relevant certificate does not reside in the "Trusted Root CA Store" and wanted to bring this to the community's attention. The following ...

## Low-Confidence / Conflicting Findings
- None

## Verdict
- Status: resolved_high_confidence
- Identity confidence: 96
- Source confidence: 55
- Summary confidence: 80
- Unresolved reason: none

## Refresh / Retry Policy
- Re-enrich when hash, signer, product version, or executable path changes.
- Re-enrich when source confidence drops below medium or when conflicts are detected.
- Keep unresolved identities in pending state until required local evidence is collected.

## Evidence Sources
- [Unpacking the AAD Broker LocalState Cache - SpecterOps](https://specterops.io/blog/2025/11/03/unpacking-the-aad-broker-localstate-cache/) [low]
- [Update PowerShell execution policy code to trust the Windows and ...](https://github.com/PowerShell/PowerShell/issues/24122) [high]
- [Microsoft - AI, Cloud, Productivity, Computing, Gaming & Apps](https://www.microsoft.com/en-us) [high]
- [MicRooCerAut_2010-06-23.crt: CN=Microsoft Root ... - E2Encrypted](https://www.e2encrypted.com/certs/3b1efd3a66ea28b16697394703a72ca340a05bd5/) [low]
- [FYI: Windows Server 2022 does not have Root certificate](https://community.letsencrypt.org/t/fyi-windows-server-2022-does-not-have-root-certificate/157208) [low]
