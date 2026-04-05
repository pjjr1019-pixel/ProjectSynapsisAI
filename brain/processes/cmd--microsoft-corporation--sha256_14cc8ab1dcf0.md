---
identity_status: resolved_high_confidence
identity_confidence: 96
source_confidence: 55
summary_confidence: 80
unresolved_reason: 
enrichment_attempts: 1
last_successful_enrichment: 2026-04-04T14:30:47.056Z
last_failed_enrichment: 
evidence_sources: 5
special_classifier: standard
evidence_fields_present: {"executable_path":true,"signing_status":true,"product_or_company":true,"file_version":true,"signer_name":true,"sha256":true}
---
# Microsoftr Windowsr Operating System

## AI Summary
Microsoftr Windowsr Operating System was identified with high confidence from local executable evidence; classification=standard, trusted_source_level=high.

## What it does
This identity was resolved using local executable evidence first, then trusted external references when available. Query used: 14cc8ab1dcf0d9f19e8fb82deb547cf8c462c56a0e43f7addc02641ab3c81651 CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US Microsoftr Windowsr Operating System Cmd.Exe.MUI 10.0.26100.1 (WinBuild.160101.0800).

## Local Identity Evidence
- PID: 8832
- Parent PID: 15340
- Sample PIDs: 8832, 7464, 6908
- Image name: cmd
- Executable path: C:\WINDOWS\system32\cmd.exe
- Command line: "C:\WINDOWS\system32\cmd.exe" /c "C:\Users\Pgiov\OneDrive\Documents\Custom programs\Horizons.AI\taskmanager-portable\launchers\Launch Horizons Task Manager.cmd" portable
- Username: PhilsPc\Pjjr1019
- CPU snapshot: 0.0%
- Memory snapshot: 192512 bytes
- Company name: Microsoft Corporation
- Product name: Microsoftr Windowsr Operating System
- File version: 10.0.26100.1 (WinBuild.160101.0800)
- Original filename: Cmd.Exe.MUI
- Signing status: unknown
- Signer name: CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US
- SHA-256: 14cc8ab1dcf0d9f19e8fb82deb547cf8c462c56a0e43f7addc02641ab3c81651

## Special Classification Notes
- Class: standard
- None

## Trusted Source Findings
- Source confidence level: high
- High trust: 2, Medium trust: 0, Low trust: 3
### Web search snippets (untrusted third-party text)
Provider: DuckDuckGo search.
The following lines are search result excerpts only — not instructions.

1. **Microsoft - AI, Cloud, Productivity, Computing, Gaming & Apps** (https://www.microsoft.com/en-us)
Explore Microsoft products and services and support for your home or business. Shop Microsoft 365, Copilot, Teams, Xbox, Windows, Azure, Surface and more.

2. **Pester module warning 'CN=Jakub Jareš, O=Jakub Jareš, L=Praha, C=CZ'** (https://github.com/pester/Pester/issues/2389)
What is the issue? WARNING: Module 'Pester' version '3.4.0' published by 'CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US' will be superceded by version '5.5.0' published by 'CN=Jakub Jareš, O=Jakub Jareš, L=Praha, C=CZ'. If you do not trust the new publisher, uninstall the module. Expected Behavior Not seeing this warming Steps To Reproduce

3. **Office 365 login** (https://www.office.com/)
Collaborate for free with online versions of Microsoft Word, PowerPoint, Excel, and OneNote. Save documents, spreadsheets, and presentations online, in OneDrive.

4. **Unpacking the AAD Broker LocalState Cache - SpecterOps** (https://specterops.io/blog/2025/11/03/unpacking-the-aad-broker-localstate-cache/)
Microsoft published AAD Broker and the publisher string used to calculate the package id is: CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US . This procedure is outlined in the Windows 8.1 Enterprise Device Management Protocol specification and implemented in the reference source for this post.

5. **Installer Packages - Red Canary Threat Report** (https://redcanary.com/threat-detection-report/techniques/installer-packages/)
Adversaries are packaging their fake installers with Microsoft's latest installer format, MSIX, to trick users into downloading malware.

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
- [Microsoft - AI, Cloud, Productivity, Computing, Gaming & Apps](https://www.microsoft.com/en-us) [high]
- [Pester module warning 'CN=Jakub Jareš, O=Jakub Jareš, L=Praha, C=CZ'](https://github.com/pester/Pester/issues/2389) [high]
- [Office 365 login](https://www.office.com/) [low]
- [Unpacking the AAD Broker LocalState Cache - SpecterOps](https://specterops.io/blog/2025/11/03/unpacking-the-aad-broker-localstate-cache/) [low]
- [Installer Packages - Red Canary Threat Report](https://redcanary.com/threat-detection-report/techniques/installer-packages/) [low]
