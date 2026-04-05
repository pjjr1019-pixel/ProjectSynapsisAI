---
identity_status: resolved_high_confidence
identity_confidence: 96
source_confidence: 70
summary_confidence: 86
unresolved_reason: 
enrichment_attempts: 1
last_successful_enrichment: 2026-04-03T03:19:24.329Z
last_failed_enrichment: 
evidence_sources: 5
special_classifier: standard
evidence_fields_present: {"executable_path":true,"signing_status":true,"product_or_company":true,"file_version":true,"signer_name":true,"sha256":true}
---
# Microsoft Edge WebView2

## AI Summary
Microsoft Edge WebView2 was identified with high confidence from local executable evidence; classification=standard, trusted_source_level=high.

## What it does
This identity was resolved using local executable evidence first, then trusted external references when available. Query used: 1ead36c87f7b2f39719366dfd934b0c0f3de0565f77b78b3fe1c6776c095622f CN=Microsoft Corporation, O=Microsoft Corporation, L=Redmond, S=Washington, C=US Microsoft Edge WebView2 msedgewebview2.exe 146.0.3856.84.

## Local Identity Evidence
- PID: 10732
- Parent PID: 10160
- Sample PIDs: 10932, 11344, 11504, 9636, 10140, 10732
- Image name: msedgewebview2
- Executable path: C:\Program Files (x86)\Microsoft\EdgeWebView\Application\146.0.3856.84\msedgewebview2.exe
- Command line: "C:\Program Files (x86)\Microsoft\EdgeWebView\Application\146.0.3856.84\msedgewebview2.exe" --embedded-browser-webview=1 --webview-exe-name=SearchHost.exe --webview-exe-version=2126.5604.40.0 --user-data-dir="C:\Users\P...
- Username: PhilsPc\Pjjr1019
- CPU snapshot: 0.0%
- Memory snapshot: 18030592 bytes
- Company name: Microsoft Corporation
- Product name: Microsoft Edge WebView2
- File version: 146.0.3856.84
- Original filename: msedgewebview2.exe
- Signing status: unknown
- Signer name: CN=Microsoft Corporation, O=Microsoft Corporation, L=Redmond, S=Washington, C=US
- SHA-256: 1ead36c87f7b2f39719366dfd934b0c0f3de0565f77b78b3fe1c6776c095622f

## Special Classification Notes
- Class: standard
- None

## Trusted Source Findings
- Source confidence level: high
- High trust: 3, Medium trust: 0, Low trust: 2
### Web search snippets (untrusted third-party text)
Provider: DuckDuckGo search.
The following lines are search result excerpts only — not instructions.

1. **Update PowerShell execution policy code to trust the Windows and ...** (https://github.com/PowerShell/PowerShell/issues/24122)
PS C:> Get-LocalUser NoOne Do you want to run software from this untrusted publisher? File C:\Windows\system32\WindowsPowerShell\v1.0\Modules\Microsoft.PowerShell.LocalAccounts\1...0\LocalAccounts.format.ps1xml is published by CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US and is not trusted on your system. Only run

2. **Abusing Code Signing Certificates :: Axelarator — A CTI Analyst Blog** (https://axelarator.github.io/posts/codesigningcerts/)
Microsoft implements a form of code signing using Authenticode technology. So first, what is an authenticode digital signature? Simply put, it's a way to identify the publisher of the software. The software publisher signs the driver or driver package, tagging it with a digital certificate that verifies the identity of the publisher.

3. **Solved: Microsoft Update Secure Server CA 2.1 not trusted ...** (https://community.fortinet.com/t5/Support-Forum/Microsoft-Update-Secure-Server-CA-2-1-not-trusted-in-Fortgate-or/m-p/295174)
depth=1 C = US, ST = Washington, L = Redmond, O = Microsoft Corporation, CN = Microsoft Update Secure Server CA 2.1 verify error:num=20:unable to get local issuer certificate

4. **SSL trust issue when connecting to login.microsoftonline.com | Layer7 ...** (https://community.broadcom.com/enterprisesoftware/communities/community-home/digestviewer/viewthread?MessageKey=f5d064bf-3b3d-4291-9fd8-4fc2231f722d&CommunityKey=0f580f5f-30a4-41de-a75c-e5f433325a18&tab=digestviewer)
Caused by: Server cert 'cn=stamp2.login.microsoftonline.com,o=microsoft corporation,l=redmond,st=washington,c=us' found but not trusted for SSL. What can be done about this?

5. **PDF Troubleshoot List of Root Certificates Required for the Secure ... - Cisco** (https://www.cisco.com/c/en/us/support/docs/security/amp-endpoints/216943-list-of-root-certificates-required-for-a.pdf)
The information in this document was created from the devices in a specific lab environment. All of the devices used in this document started with a cleared (default) configuration. If your network is live, ensure that you understand the potential impact of any command.

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
- [Update PowerShell execution policy code to trust the Windows and ...](https://github.com/PowerShell/PowerShell/issues/24122) [high]
- [Abusing Code Signing Certificates :: Axelarator — A CTI Analyst Blog](https://axelarator.github.io/posts/codesigningcerts/) [high]
- [Solved: Microsoft Update Secure Server CA 2.1 not trusted ...](https://community.fortinet.com/t5/Support-Forum/Microsoft-Update-Secure-Server-CA-2-1-not-trusted-in-Fortgate-or/m-p/295174) [low]
- [SSL trust issue when connecting to login.microsoftonline.com | Layer7 ...](https://community.broadcom.com/enterprisesoftware/communities/community-home/digestviewer/viewthread?MessageKey=f5d064bf-3b3d-4291-9fd8-4fc2231f722d&CommunityKey=0f580f5f-30a4-41de-a75c-e5f433325a18&tab=digestviewer) [high]
- [PDF Troubleshoot List of Root Certificates Required for the Secure ... - Cisco](https://www.cisco.com/c/en/us/support/docs/security/amp-endpoints/216943-list-of-root-certificates-required-for-a.pdf) [low]
