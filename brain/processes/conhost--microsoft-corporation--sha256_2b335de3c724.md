---
identity_status: resolved_medium_confidence
identity_confidence: 96
source_confidence: 40
summary_confidence: 74
unresolved_reason: 
enrichment_attempts: 1
last_successful_enrichment: 2026-04-03T04:35:23.779Z
last_failed_enrichment: 
evidence_sources: 5
special_classifier: windows_host_process
evidence_fields_present: {"executable_path":true,"signing_status":true,"product_or_company":true,"file_version":true,"signer_name":true,"sha256":true}
---
# Microsoftr Windowsr Operating System

## AI Summary
Microsoftr Windowsr Operating System was identified with medium confidence from local executable evidence; classification=windows_host_process, trusted_source_level=high.

## What it does
This identity was resolved using local executable evidence first, then trusted external references when available. Query used: 804c132aa005c2e90649ad2a9e5bc274b0cdfe07a45a17a6367f6d4ff85a64c7 CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US Microsoftr Windowsr Operating System CONHOST.EXE.MUI 10.0.26100.1 (WinBuild.160101.0800).

## Local Identity Evidence
- Image name: conhost
- Executable path: C:/WINDOWS/system32/conhost.exe
- CPU snapshot: 0.0%
- Memory snapshot: 0 bytes
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
- Command line context unavailable.

## Trusted Source Findings
- Source confidence level: high
- High trust: 1, Medium trust: 0, Low trust: 4
### Web search snippets (untrusted third-party text)
Provider: DuckDuckGo search.
The following lines are search result excerpts only — not instructions.

1. **Microsoft - AI, Cloud, Productivity, Computing, Gaming & Apps** (https://www.microsoft.com/en-us)
Explore Microsoft products and services and support for your home or business. Shop Microsoft 365, Copilot, Teams, Xbox, Windows, Azure, Surface and more.

2. **Unpacking the AAD Broker LocalState Cache - SpecterOps** (https://specterops.io/blog/2025/11/03/unpacking-the-aad-broker-localstate-cache/)
Microsoft published AAD Broker and the publisher string used to calculate the package id is: CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US . This procedure is outlined in the Windows 8.1 Enterprise Device Management Protocol specification and implemented in the reference source for this post.

3. **Unpacking the AAD Broker LocalState Cache - winternl** (https://winternl.com/aad-broker-cache/)
Intro The Azure AD Broker (AAD Broker) is a component of Entra ID that orchestrates Azure AD sign-in, device-bound primary refresh token (PRT) handling, and application token issuance exposed by Windows Runtime (WinRT) APIs. In this post, we'll map the broker's on-disk cache and show how to unpack its file formats.

4. **Hi, My Name is "CN=Microsoft Windows, O=Microsoft Corporation, L ...** (https://www.youtube.com/watch?v=ycEcGV-e6yk)
Hi, My Name is " CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US " SpecterOps 5.29K subscribers Subscribed

5. **MicRooCerAut_2010-06-23.crt: CN=Microsoft Root ... - E2Encrypted** (https://www.e2encrypted.com/certs/3b1efd3a66ea28b16697394703a72ca340a05bd5/)
Certificate CN=Microsoft Root Certificate Authority 2010,O=Microsoft Corporation,L=Redmond,ST=Washington,C=US detail info and audit record. Decoded subject, issuer, crl, ocsp, der and pem format download.

## Low-Confidence / Conflicting Findings
- None

## Verdict
- Status: resolved_medium_confidence
- Identity confidence: 96
- Source confidence: 40
- Summary confidence: 74
- Unresolved reason: none

## Refresh / Retry Policy
- Re-enrich when hash, signer, product version, or executable path changes.
- Re-enrich when source confidence drops below medium or when conflicts are detected.
- Keep unresolved identities in pending state until required local evidence is collected.

## Evidence Sources
- [Microsoft - AI, Cloud, Productivity, Computing, Gaming & Apps](https://www.microsoft.com/en-us) [high]
- [Unpacking the AAD Broker LocalState Cache - SpecterOps](https://specterops.io/blog/2025/11/03/unpacking-the-aad-broker-localstate-cache/) [low]
- [Unpacking the AAD Broker LocalState Cache - winternl](https://winternl.com/aad-broker-cache/) [low]
- [Hi, My Name is "CN=Microsoft Windows, O=Microsoft Corporation, L ...](https://www.youtube.com/watch?v=ycEcGV-e6yk) [low]
- [MicRooCerAut_2010-06-23.crt: CN=Microsoft Root ... - E2Encrypted](https://www.e2encrypted.com/certs/3b1efd3a66ea28b16697394703a72ca340a05bd5/) [low]
