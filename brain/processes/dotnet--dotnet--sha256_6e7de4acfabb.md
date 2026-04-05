---
identity_status: resolved_high_confidence
identity_confidence: 96
source_confidence: 70
summary_confidence: 86
unresolved_reason: 
enrichment_attempts: 1
last_successful_enrichment: 2026-04-03T04:33:47.913Z
last_failed_enrichment: 
evidence_sources: 5
special_classifier: standard
evidence_fields_present: {"executable_path":true,"signing_status":true,"product_or_company":true,"file_version":true,"signer_name":true,"sha256":true}
---
# .NET

## AI Summary
.NET was identified with high confidence from local executable evidence; classification=standard, trusted_source_level=high.

## What it does
This identity was resolved using local executable evidence first, then trusted external references when available. Query used: 6e7de4acfabb52c2f2ac5d57dd3a4b10c65e04df0b19cd7ab4b1af4addd653d7 CN=.NET, O=Microsoft Corporation, L=Redmond, S=Washington, C=US .NET .NET Host 10,0,426,12010 @Commit: 80d3e14f5e08b4888f464e3cd0d0b2445b63ec46.

## Local Identity Evidence
- Image name: dotnet
- Executable path: C:/Program Files/dotnet/dotnet.exe
- CPU snapshot: 0.0%
- Memory snapshot: 0 bytes
- Company name: Microsoft Corporation
- Product name: .NET
- File version: 10,0,426,12010 @Commit: 80d3e14f5e08b4888f464e3cd0d0b2445b63ec46
- Original filename: .NET Host
- Signing status: unknown
- Signer name: CN=.NET, O=Microsoft Corporation, L=Redmond, S=Washington, C=US
- SHA-256: 6e7de4acfabb52c2f2ac5d57dd3a4b10c65e04df0b19cd7ab4b1af4addd653d7

## Special Classification Notes
- Class: standard
- None

## Trusted Source Findings
- Source confidence level: high
- High trust: 3, Medium trust: 0, Low trust: 2
### Web search snippets (untrusted third-party text)
Provider: DuckDuckGo search.
The following lines are search result excerpts only — not instructions.

1. **Gmail** (https://mail.google.com/)
Gmail is email that's intuitive, efficient, and useful. 15 GB of storage, less spam, and mobile access.

2. **Search - Microsoft Bing** (https://www.bing.com/)
Search with Microsoft Bing and use the power of AI to find information, explore webpages, images, videos, maps, and more. A smart search engine for the forever curious.

3. **Get AuthenticodeSignatureInformation of file - Stack Overflow** (https://stackoverflow.com/questions/31168926/get-authenticodesignatureinformation-of-file)
Issuer : CN=Microsoft Windows Production PCA 2011, O=Microsoft Corporation, L=Redmond, S=Washington, C=US Thumbprint : B2732A60F9D0E554F756D87E7446A20F216B4F73

4. **Mismatched Certificate and File Hash on pwsh.exe #20481** (https://github.com/PowerShell/PowerShell/issues/20481)
Prerequisites Write a descriptive title. Make sure you are able to repro it on the latest released version Search the existing issues. Refer to the FAQ. Refer to Differences between Windows PowerSh...

5. **Microsoft - AI, Cloud, Productivity, Computing, Gaming & Apps** (https://www.microsoft.com/en-us)
Explore Microsoft products and services and support for your home or business. Shop Microsoft 365, Copilot, Teams, Xbox, Windows, Azure, Surface and more.

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
- [Gmail](https://mail.google.com/) [high]
- [Search - Microsoft Bing](https://www.bing.com/) [low]
- [Get AuthenticodeSignatureInformation of file - Stack Overflow](https://stackoverflow.com/questions/31168926/get-authenticodesignatureinformation-of-file) [low]
- [Mismatched Certificate and File Hash on pwsh.exe #20481](https://github.com/PowerShell/PowerShell/issues/20481) [high]
- [Microsoft - AI, Cloud, Productivity, Computing, Gaming & Apps](https://www.microsoft.com/en-us) [high]
