---
identity_status: resolved_high_confidence
identity_confidence: 96
source_confidence: 70
summary_confidence: 86
unresolved_reason: 
enrichment_attempts: 1
last_successful_enrichment: 2026-04-02T18:12:03.884Z
last_failed_enrichment: 
evidence_sources: 5
special_classifier: standard
evidence_fields_present: {"executable_path":true,"signing_status":true,"product_or_company":true,"file_version":true,"signer_name":true,"sha256":true}
---
# runtimebroker

## AI Summary
Microsoftr Windowsr Operating System was identified with high confidence from local executable evidence; classification=standard, trusted_source_level=high.

## What it does
This identity was resolved using local executable evidence first, then trusted external references when available. Query used: 61fd42509c0235965e8a7c667ddb32ace00579501a25d399e3d3574b68518afb CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US Microsoftr Windowsr Operating System RuntimeBroker.exe 10.0.26100.8115 (WinBuild.160101.0800).

## Local Identity Evidence
- PID: 9184
- Parent PID: 1500
- Sample PIDs: 9428, 9184, 3156
- Image name: RuntimeBroker
- Executable path: C:\Windows\System32\RuntimeBroker.exe
- Command line: C:\Windows\System32\RuntimeBroker.exe -Embedding
- Username: PhilsPc\Pjjr1019
- CPU snapshot: 0.0%
- Memory snapshot: 11874304 bytes
- Company name: Microsoft Corporation
- Product name: Microsoftr Windowsr Operating System
- File version: 10.0.26100.8115 (WinBuild.160101.0800)
- Original filename: RuntimeBroker.exe
- Signing status: unknown
- Signer name: CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US
- SHA-256: 61fd42509c0235965e8a7c667ddb32ace00579501a25d399e3d3574b68518afb

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

2. **Update PowerShell execution policy code to trust the Windows and ...** (https://github.com/PowerShell/PowerShell/issues/24122)
PS C:> Get-LocalUser NoOne Do you want to run software from this untrusted publisher? File C:\Windows\system32\WindowsPowerShell\v1.0\Modules\Microsoft.PowerShell.LocalAccounts\1...0\LocalAccounts.format.ps1xml is published by CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US and is not trusted on your system . Only run

3. **Unpacking the AAD Broker LocalState Cache - SpecterOps** (https://specterops.io/blog/2025/11/03/unpacking-the-aad-broker-localstate-cache/)
Microsoft published AAD Broker and the publisher string used to calculate the package id is: CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US . This procedure is outlined in the Windows 8.1 Enterprise Device Management Protocol specification and implemented in the reference source for this post.

4. **Abusing Code Signing Certificates :: Axelarator — A CTI Analyst Blog** (https://axelarator.github.io/posts/codesigningcerts/)
Microsoft implements a form of code signing using Authenticode technology. So first, what is an authenticode digital signature? Simply put, it's a way to identify the publisher of the software. The software publisher signs the driver or driver package, tagging it with a digital certificate that verifies the identity of the publisher.

5. **Installer Packages - Red Canary Threat Report** (https://redcanary.com/threat-detection-report/techniques/installer-packages/)
Adversaries are packaging their fake installers with Microsoft's latest installer format, MSIX, to trick users into downloading malware.

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
- [Update PowerShell execution policy code to trust the Windows and ...](https://github.com/PowerShell/PowerShell/issues/24122) [high]
- [Unpacking the AAD Broker LocalState Cache - SpecterOps](https://specterops.io/blog/2025/11/03/unpacking-the-aad-broker-localstate-cache/) [low]
- [Abusing Code Signing Certificates :: Axelarator — A CTI Analyst Blog](https://axelarator.github.io/posts/codesigningcerts/) [high]
- [Installer Packages - Red Canary Threat Report](https://redcanary.com/threat-detection-report/techniques/installer-packages/) [low]
