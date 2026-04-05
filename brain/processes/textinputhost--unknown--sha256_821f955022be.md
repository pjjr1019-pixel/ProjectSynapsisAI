---
identity_status: resolved_high_confidence
identity_confidence: 96
source_confidence: 55
summary_confidence: 80
unresolved_reason: 
enrichment_attempts: 1
last_successful_enrichment: 2026-04-02T18:15:43.499Z
last_failed_enrichment: 
evidence_sources: 5
special_classifier: standard
evidence_fields_present: {"executable_path":true,"signing_status":true,"product_or_company":true,"file_version":true,"signer_name":true,"sha256":true}
---
# textinputhost

## AI Summary
Microsoftr Windowsr Operating System was identified with high confidence from local executable evidence; classification=standard, trusted_source_level=high.

## What it does
This identity was resolved using local executable evidence first, then trusted external references when available. Query used: 821f955022bebafc6bf10bb67440cd1f8bc80763c87e8aeca822cec5ddd9a94a CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US Microsoftr Windowsr Operating System TextInputHost.exe 2126.4801.10.0.

## Local Identity Evidence
- PID: 1476
- Parent PID: 1500
- Sample PIDs: 1476
- Image name: TextInputHost
- Executable path: C:\WINDOWS\SystemApps\MicrosoftWindows.Client.CBS_cw5n1h2txyewy\TextInputHost.exe
- Command line: "C:\WINDOWS\SystemApps\MicrosoftWindows.Client.CBS_cw5n1h2txyewy\TextInputHost.exe" -ServerName:InputApp.AppXk0k6mrh4r2q0ct33a9wgbez0x7v9cz5y.mca
- Username: PhilsPc\Pjjr1019
- CPU snapshot: 0.0%
- Memory snapshot: 23678976 bytes
- Company name: Microsoft Corporation
- Product name: Microsoftr Windowsr Operating System
- File version: 2126.4801.10.0
- Original filename: TextInputHost.exe
- Signing status: unknown
- Signer name: CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US
- SHA-256: 821f955022bebafc6bf10bb67440cd1f8bc80763c87e8aeca822cec5ddd9a94a

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

2. **Microsoft - AI, Cloud, Productivity, Computing, Gaming & Apps** (https://www.microsoft.com/en-us)
Explore Microsoft products and services and support for your home or business. Shop Microsoft 365, Copilot, Teams, Xbox, Windows, Azure, Surface and more.

3. **Unpacking the AAD Broker LocalState Cache - winternl** (https://winternl.com/aad-broker-cache/)
Intro The Azure AD Broker (AAD Broker) is a component of Entra ID that orchestrates Azure AD sign-in, device-bound primary refresh token (PRT) handling, and application token issuance exposed by Windows Runtime (WinRT) APIs. In this post, we'll map the broker's on-disk cache and show how to unpack its file formats.

4. **Hi, My Name is "CN=Microsoft Windows, O=Microsoft Corporation, L ...** (https://www.youtube.com/watch?v=ycEcGV-e6yk)
Hi, My Name is " CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US " SpecterOps 5.29K subscribers Subscribed

5. **Unable to install azure powershell using "install-module" command** (https://github.com/Azure/azure-powershell/issues/17144)
authenticode issuer 'CN=Microsoft Corporation, O=Microsoft Corporation, L=Redmond, S=Washington, C=US' of the previously - installed module 'Az.HealthcareApis' with version '1.3.1'. VERBOSE: Checking for possible command collisions for the module 'Az.HealthcareApis' commands.

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
- [Microsoft - AI, Cloud, Productivity, Computing, Gaming & Apps](https://www.microsoft.com/en-us) [high]
- [Unpacking the AAD Broker LocalState Cache - winternl](https://winternl.com/aad-broker-cache/) [low]
- [Hi, My Name is "CN=Microsoft Windows, O=Microsoft Corporation, L ...](https://www.youtube.com/watch?v=ycEcGV-e6yk) [low]
- [Unable to install azure powershell using "install-module" command](https://github.com/Azure/azure-powershell/issues/17144) [high]
