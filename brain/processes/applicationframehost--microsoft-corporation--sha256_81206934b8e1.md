---
identity_status: resolved_high_confidence
identity_confidence: 96
source_confidence: 85
summary_confidence: 92
unresolved_reason: 
enrichment_attempts: 1
last_successful_enrichment: 2026-04-04T14:30:16.784Z
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
- PID: 15504
- Parent PID: 1508
- Sample PIDs: 15504
- Image name: ApplicationFrameHost
- Executable path: C:\WINDOWS\system32\ApplicationFrameHost.exe
- Command line: C:\WINDOWS\system32\ApplicationFrameHost.exe -Embedding
- Username: PhilsPc\Pjjr1019
- CPU snapshot: 0.0%
- Memory snapshot: 4198400 bytes
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
- High trust: 4, Medium trust: 0, Low trust: 1
### Web search snippets (untrusted third-party text)
Provider: DuckDuckGo search.
The following lines are search result excerpts only — not instructions.

1. **Microsoft Support** (https://support.microsoft.com/en-us)
Microsoft Support is here to help you with Microsoft products. Find how-to articles, videos, and training for Microsoft Copilot, Microsoft 365, Windows 11, Surface, and more.

2. **wextract.exe | Win32 Cabinet Self-Extractor | STRONTIC** (https://strontic.github.io/xcyclopedia/library/wextract.exe-B9CC7E24DB7DE2E75678761B1D8BAC3E.html)
Issuer: CN=Microsoft Windows Production PCA 2011, O=Microsoft Corporation, L=Redmond, S=Washington, C=US Subject: CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US File Metadata Original Filename: WEXTRACT.EXE .MUI Product Name: Internet Explorer Company Name: Microsoft Corporation

3. **Office 365 login** (https://www.office.com/)
Collaborate for free with online versions of Microsoft Word, PowerPoint, Excel, and OneNote. Save documents, spreadsheets, and presentations online, in OneDrive.

4. **Microsoft - AI, Cloud, Productivity, Computing, Gaming & Apps** (https://www.microsoft.com/en-us)
Explore Microsoft products and services and support for your home or business. Shop Microsoft 365, Copilot, Teams, Xbox, Windows, Azure, Surface and more.

5. **Microsoft account | Sign In or Create Your Account Today - Microsoft** (https://account.microsoft.com/account)
Get access to free online versions of Outlook, Word, Excel, and PowerPoint.

## Low-Confidence / Conflicting Findings
- None

## Verdict
- Status: resolved_high_confidence
- Identity confidence: 96
- Source confidence: 85
- Summary confidence: 92
- Unresolved reason: none

## Refresh / Retry Policy
- Re-enrich when hash, signer, product version, or executable path changes.
- Re-enrich when source confidence drops below medium or when conflicts are detected.
- Keep unresolved identities in pending state until required local evidence is collected.

## Evidence Sources
- [Microsoft Support](https://support.microsoft.com/en-us) [high]
- [wextract.exe | Win32 Cabinet Self-Extractor | STRONTIC](https://strontic.github.io/xcyclopedia/library/wextract.exe-B9CC7E24DB7DE2E75678761B1D8BAC3E.html) [high]
- [Office 365 login](https://www.office.com/) [low]
- [Microsoft - AI, Cloud, Productivity, Computing, Gaming & Apps](https://www.microsoft.com/en-us) [high]
- [Microsoft account | Sign In or Create Your Account Today - Microsoft](https://account.microsoft.com/account) [high]
