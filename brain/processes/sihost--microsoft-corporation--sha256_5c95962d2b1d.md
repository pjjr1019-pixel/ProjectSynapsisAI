---
identity_status: resolved_high_confidence
identity_confidence: 96
source_confidence: 70
summary_confidence: 86
unresolved_reason: 
enrichment_attempts: 1
last_successful_enrichment: 2026-04-02T18:14:02.675Z
last_failed_enrichment: 
evidence_sources: 5
special_classifier: standard
evidence_fields_present: {"executable_path":true,"signing_status":true,"product_or_company":true,"file_version":true,"signer_name":true,"sha256":true}
---
# sihost

## AI Summary
Microsoftr Windowsr Operating System was identified with high confidence from local executable evidence; classification=standard, trusted_source_level=high.

## What it does
This identity was resolved using local executable evidence first, then trusted external references when available. Query used: 5c95962d2b1d53785cf24e221186cd3869c510f8b2bf73a7d5a3f07c2e0320c7 CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US Microsoftr Windowsr Operating System sihost.exe 10.0.26100.8115 (WinBuild.160101.0800).

## Local Identity Evidence
- PID: 6812
- Parent PID: 852
- Sample PIDs: 6812
- Image name: sihost
- Executable path: C:\WINDOWS\system32\sihost.exe
- Command line: sihost.exe
- Username: PhilsPc\Pjjr1019
- CPU snapshot: 0.0%
- Memory snapshot: 15835136 bytes
- Company name: Microsoft Corporation
- Product name: Microsoftr Windowsr Operating System
- File version: 10.0.26100.8115 (WinBuild.160101.0800)
- Original filename: sihost.exe
- Signing status: unknown
- Signer name: CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US
- SHA-256: 5c95962d2b1d53785cf24e221186cd3869c510f8b2bf73a7d5a3f07c2e0320c7

## Special Classification Notes
- Class: standard
- None

## Trusted Source Findings
- Source confidence level: high
- High trust: 3, Medium trust: 0, Low trust: 2
### Web search snippets (untrusted third-party text)
Provider: DuckDuckGo search.
The following lines are search result excerpts only — not instructions.

1. **Microsoft Support** (https://support.microsoft.com/en-us)
Microsoft Support is here to help you with Microsoft products. Find how-to articles, videos, and training for Microsoft Copilot, Microsoft 365, Windows 11, Surface, and more.

2. **Abusing Code Signing Certificates :: Axelarator — A CTI Analyst Blog** (https://axelarator.github.io/posts/codesigningcerts/)
IsOSBinary : False PS C:\Users\User > Get-AuthenticodeSignature "C:\Users\User\AppData\Local\Programs\Microsoft VS Code\Code.exe" | Format-List -Property Status, SignerCertificate Status : Valid SignerCertificate : [Subject] CN=Microsoft Corporation, O=Microsoft Corporation, L=Redmond, S=Washington, C=US [Issuer] CN=Microsoft Code Signing PCA ...

3. **SSL trust issue when connecting to login.microsoftonline.com | Layer7 ...** (https://community.broadcom.com/enterprisesoftware/communities/community-home/digestviewer/viewthread?MessageKey=f5d064bf-3b3d-4291-9fd8-4fc2231f722d&CommunityKey=0f580f5f-30a4-41de-a75c-e5f433325a18&tab=digestviewer)
Caused by: Server cert 'cn=stamp2.login.microsoftonline.com,o=microsoft corporation,l=redmond,st=washington,c=us' found but not trusted for SSL. What can be done about this?

4. **Microsoft Time Stamp Root Certificate Authority 2014.crt: CN=Microsoft ...** (https://www.e2encrypted.com/certs/0119e81be9a14cd8e22f40ac118c687ecba3f4d8/)
Certificate CN=Microsoft Time Stamp Root Certificate Authority 2014,O=Microsoft Corporation,L=Redmond,ST=Washington,C=US detail info and audit record. Decoded subject, issuer, crl, ocsp, der and pem format download.

5. **Hi, My Name is "CN=Microsoft Windows, O=Microsoft Corporation, L ...** (https://www.youtube.com/watch?v=ycEcGV-e6yk)
Hi, My Name is " CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US " SpecterOps 5.29K subscribers Subscribed

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
- [Microsoft Support](https://support.microsoft.com/en-us) [high]
- [Abusing Code Signing Certificates :: Axelarator — A CTI Analyst Blog](https://axelarator.github.io/posts/codesigningcerts/) [high]
- [SSL trust issue when connecting to login.microsoftonline.com | Layer7 ...](https://community.broadcom.com/enterprisesoftware/communities/community-home/digestviewer/viewthread?MessageKey=f5d064bf-3b3d-4291-9fd8-4fc2231f722d&CommunityKey=0f580f5f-30a4-41de-a75c-e5f433325a18&tab=digestviewer) [high]
- [Microsoft Time Stamp Root Certificate Authority 2014.crt: CN=Microsoft ...](https://www.e2encrypted.com/certs/0119e81be9a14cd8e22f40ac118c687ecba3f4d8/) [low]
- [Hi, My Name is "CN=Microsoft Windows, O=Microsoft Corporation, L ...](https://www.youtube.com/watch?v=ycEcGV-e6yk) [low]
