---
identity_status: resolved_high_confidence
identity_confidence: 96
source_confidence: 55
summary_confidence: 80
unresolved_reason: 
enrichment_attempts: 1
last_successful_enrichment: 2026-04-02T18:14:52.426Z
last_failed_enrichment: 
evidence_sources: 5
special_classifier: standard
evidence_fields_present: {"executable_path":true,"signing_status":true,"product_or_company":true,"file_version":true,"signer_name":true,"sha256":true}
---
# startmenuexperiencehost

## AI Summary
Microsoftr Windowsr Operating System was identified with high confidence from local executable evidence; classification=standard, trusted_source_level=high.

## What it does
This identity was resolved using local executable evidence first, then trusted external references when available. Query used: 3e2891abfd72b318185ebb3ba83c5ac0ab18b1269799b6d1a45922d57696f63b CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US Microsoftr Windowsr Operating System startmenuexperiencehost.exe 10.0.26100.8115 (WinBuild.160101.0800).

## Local Identity Evidence
- PID: 10168
- Parent PID: 1500
- Sample PIDs: 10168
- Image name: StartMenuExperienceHost
- Executable path: C:\Windows\SystemApps\Microsoft.Windows.StartMenuExperienceHost_cw5n1h2txyewy\StartMenuExperienceHost.exe
- Command line: "C:\Windows\SystemApps\Microsoft.Windows.StartMenuExperienceHost_cw5n1h2txyewy\StartMenuExperienceHost.exe" -ServerName:FullTrustApp.AppXykjsye98af63ez2annt9djke8trg8stn.mca
- Username: PhilsPc\Pjjr1019
- CPU snapshot: 0.0%
- Memory snapshot: 12558336 bytes
- Company name: Microsoft Corporation
- Product name: Microsoftr Windowsr Operating System
- File version: 10.0.26100.8115 (WinBuild.160101.0800)
- Original filename: startmenuexperiencehost.exe
- Signing status: unknown
- Signer name: CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US
- SHA-256: 3e2891abfd72b318185ebb3ba83c5ac0ab18b1269799b6d1a45922d57696f63b

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

2. **Office 365 login** (https://www.office.com/)
Collaborate for free with online versions of Microsoft Word, PowerPoint, Excel, and OneNote. Save documents, spreadsheets, and presentations online, in OneDrive.

3. **Unpacking the AAD Broker LocalState Cache - SpecterOps** (https://specterops.io/blog/2025/11/03/unpacking-the-aad-broker-localstate-cache/)
Microsoft published AAD Broker and the publisher string used to calculate the package id is: CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US . This procedure is outlined in the Windows 8.1 Enterprise Device Management Protocol specification and implemented in the reference source for this post.

4. **Hi, My Name is "CN=Microsoft Windows, O=Microsoft Corporation, L ...** (https://www.youtube.com/watch?v=ycEcGV-e6yk)
Hi, My Name is " CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US " SpecterOps 5.29K subscribers Subscribed

5. **Abusing Code Signing Certificates :: Axelarator — A CTI Analyst Blog** (https://axelarator.github.io/posts/codesigningcerts/)
Microsoft implements a form of code signing using Authenticode technology. So first, what is an authenticode digital signature? Simply put, it's a way to identify the publisher of the software. The software publisher signs the driver or driver package, tagging it with a digital certificate that verifies the identity of the publisher.

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
- [Office 365 login](https://www.office.com/) [low]
- [Unpacking the AAD Broker LocalState Cache - SpecterOps](https://specterops.io/blog/2025/11/03/unpacking-the-aad-broker-localstate-cache/) [low]
- [Hi, My Name is "CN=Microsoft Windows, O=Microsoft Corporation, L ...](https://www.youtube.com/watch?v=ycEcGV-e6yk) [low]
- [Abusing Code Signing Certificates :: Axelarator — A CTI Analyst Blog](https://axelarator.github.io/posts/codesigningcerts/) [high]
