---
identity_status: resolved_high_confidence
identity_confidence: 96
source_confidence: 70
summary_confidence: 86
unresolved_reason: 
enrichment_attempts: 1
last_successful_enrichment: 2026-04-04T12:54:41.978Z
last_failed_enrichment: 
evidence_sources: 5
special_classifier: windows_host_process
evidence_fields_present: {"executable_path":true,"signing_status":true,"product_or_company":true,"file_version":true,"signer_name":true,"sha256":true}
---
# Microsoftr Windowsr Operating System

## AI Summary
Microsoftr Windowsr Operating System was identified with high confidence from local executable evidence; classification=windows_host_process, trusted_source_level=high.

## What it does
This identity was resolved using local executable evidence first, then trusted external references when available. Query used: 804c132aa005c2e90649ad2a9e5bc274b0cdfe07a45a17a6367f6d4ff85a64c7 CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US Microsoftr Windowsr Operating System CONHOST.EXE.MUI 10.0.26100.1 (WinBuild.160101.0800).

## Local Identity Evidence
- PID: 14460
- Parent PID: 10312
- Sample PIDs: 12916, 11376, 14540, 14460, 3484, 944, 4888
- Image name: conhost
- Executable path: C:\WINDOWS\system32\conhost.exe
- Command line: \??\C:\WINDOWS\system32\conhost.exe 0x4
- Username: PhilsPc\Pjjr1019
- CPU snapshot: 0.0%
- Memory snapshot: 9981952 bytes
- Company name: Microsoft Corporation
- Product name: Microsoftr Windowsr Operating System
- File version: 10.0.26100.1 (WinBuild.160101.0800)
- Original filename: CONHOST.EXE.MUI
- Signing status: unknown
- Signer name: CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US
- SHA-256: 804c132aa005c2e90649ad2a9e5bc274b0cdfe07a45a17a6367f6d4ff85a64c7

## Special Classification Notes
- Class: windows_host_process
- Windows host/container process detected (conhost).
- Command line context: \??\C:\WINDOWS\system32\conhost.exe 0x4

## Trusted Source Findings
- Source confidence level: high
- High trust: 3, Medium trust: 0, Low trust: 2
### Web search snippets (untrusted third-party text)
Provider: DuckDuckGo search.
The following lines are search result excerpts only — not instructions.

1. **MS owned DLLs failing WDAC policy - Microsoft Q&A** (https://learn.microsoft.com/en-us/answers/questions/513501/ms-owned-dlls-failing-wdac-policy)
CN=Microsoft Windows Production PCA 2011, O=Microsoft Corporation, L=Redmond, S=Washington, C=US I looked at allowmicrosoft.xml makes use of well known values so I can't readily check why this is occurring.

2. **microsoft identity verification root certificate authority 2020.crt: CN ...** (https://www.e2encrypted.com/certs/f40042e2e5f7e8ef8189fed15519aece42c3bfa2/)
Certificate CN=Microsoft Identity Verification Root Certificate Authority 2020,O=Microsoft Corporation,C=US detail info and audit record. Decoded subject, issuer, crl, ocsp, der and pem format download.

3. **Update PowerShell execution policy code to trust the Windows and ...** (https://github.com/PowerShell/PowerShell/issues/24122)
File C:\Windows\system32\WindowsPowerShell\v1.0\Modules\Microsoft.PowerShell.LocalAccounts\1...0\LocalAccounts.format.ps1xml is published by CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US and is not trusted on your system . Only run scripts from trusted publishers.

4. **wextract.exe | Win32 Cabinet Self-Extractor | STRONTIC** (https://strontic.github.io/xcyclopedia/library/wextract.exe-B9CC7E24DB7DE2E75678761B1D8BAC3E.html)
Issuer: CN=Microsoft Windows Production PCA 2011, O=Microsoft Corporation, L=Redmond, S=Washington, C=US Subject: CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US File Metadata Original Filename: WEXTRACT.EXE .MUI Product Name: Internet Explorer Company Name: Microsoft Corporation

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
- [MS owned DLLs failing WDAC policy - Microsoft Q&A](https://learn.microsoft.com/en-us/answers/questions/513501/ms-owned-dlls-failing-wdac-policy) [high]
- [microsoft identity verification root certificate authority 2020.crt: CN ...](https://www.e2encrypted.com/certs/f40042e2e5f7e8ef8189fed15519aece42c3bfa2/) [low]
- [Update PowerShell execution policy code to trust the Windows and ...](https://github.com/PowerShell/PowerShell/issues/24122) [high]
- [wextract.exe | Win32 Cabinet Self-Extractor | STRONTIC](https://strontic.github.io/xcyclopedia/library/wextract.exe-B9CC7E24DB7DE2E75678761B1D8BAC3E.html) [high]
- [Unpacking the AAD Broker LocalState Cache - SpecterOps](https://specterops.io/blog/2025/11/03/unpacking-the-aad-broker-localstate-cache/) [low]
