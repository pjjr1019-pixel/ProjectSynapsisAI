---
identity_status: resolved_medium_confidence
identity_confidence: 96
source_confidence: 40
summary_confidence: 74
unresolved_reason: 
enrichment_attempts: 1
last_successful_enrichment: 2026-04-02T18:14:28.817Z
last_failed_enrichment: 
evidence_sources: 5
special_classifier: standard
evidence_fields_present: {"executable_path":true,"signing_status":true,"product_or_company":true,"file_version":true,"signer_name":true,"sha256":true}
---
# smartscreen

## AI Summary
Microsoftr Windowsr Operating System was identified with medium confidence from local executable evidence; classification=standard, trusted_source_level=high.

## What it does
This identity was resolved using local executable evidence first, then trusted external references when available. Query used: 9aea19d953835e9e41c28c75a08a1e655d27c5f99234d337d3b32c9a3f1760e9 CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US Microsoftr Windowsr Operating System smartscreen.exe.mui 10.0.26100.8117 (WinBuild.160101.0800).

## Local Identity Evidence
- Image name: smartscreen
- Executable path: C:/Windows/System32/smartscreen.exe
- CPU snapshot: 0.0%
- Memory snapshot: 0 bytes
- Company name: Microsoft Corporation
- Product name: Microsoftr Windowsr Operating System
- File version: 10.0.26100.8117 (WinBuild.160101.0800)
- Original filename: smartscreen.exe.mui
- Signing status: unknown
- Signer name: CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US
- SHA-256: 9aea19d953835e9e41c28c75a08a1e655d27c5f99234d337d3b32c9a3f1760e9

## Special Classification Notes
- Class: standard
- None

## Trusted Source Findings
- Source confidence level: high
- High trust: 1, Medium trust: 0, Low trust: 4
### Web search snippets (untrusted third-party text)
Provider: DuckDuckGo search.
The following lines are search result excerpts only — not instructions.

1. **Office 365 login** (https://www.office.com/)
Collaborate for free with online versions of Microsoft Word, PowerPoint, Excel, and OneNote. Save documents, spreadsheets, and presentations online, in OneDrive.

2. **Microsoft - AI, Cloud, Productivity, Computing, Gaming & Apps** (https://www.microsoft.com/en-us)
Explore Microsoft products and services and support for your home or business. Shop Microsoft 365, Copilot, Teams, Xbox, Windows, Azure, Surface and more.

3. **Hi, My Name is "CN=Microsoft Windows, O=Microsoft Corporation, L ...** (https://www.youtube.com/watch?v=ycEcGV-e6yk)
Hi, My Name is " CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US " SpecterOps 5.29K subscribers Subscribed

4. **Bandai Namco /Microsoft gaming services /DirectX runtime error fix : r ...** (https://www.reddit.com/r/PiratedGames/comments/wppyjl/bandai_namco_microsoft_gaming_services_directx/)
Provide the framework "Microsoft.DirectXRuntime" published by " CN=Microsoft Corporation, O=Microsoft Corporation, L=Redmond, S=Washington, C=US ", with neutral or x64 processor architecture and minimum version 9.29.952.0, along with this package to install.

5. **MAC Address Vendor Lookup | MAC Address Lookup** (https://maclookup.app/)
Fast and easy MAC address lookup on IEEE directory and Wireshark manufacturer database. Search vendor, manufacturer or organization of a device by MAC/OUI address. Fast REST API

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
- [Office 365 login](https://www.office.com/) [low]
- [Microsoft - AI, Cloud, Productivity, Computing, Gaming & Apps](https://www.microsoft.com/en-us) [high]
- [Hi, My Name is "CN=Microsoft Windows, O=Microsoft Corporation, L ...](https://www.youtube.com/watch?v=ycEcGV-e6yk) [low]
- [Bandai Namco /Microsoft gaming services /DirectX runtime error fix : r ...](https://www.reddit.com/r/PiratedGames/comments/wppyjl/bandai_namco_microsoft_gaming_services_directx/) [low]
- [MAC Address Vendor Lookup | MAC Address Lookup](https://maclookup.app/) [low]
