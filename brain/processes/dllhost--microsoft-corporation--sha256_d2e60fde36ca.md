---
identity_status: resolved_high_confidence
identity_confidence: 96
source_confidence: 55
summary_confidence: 80
unresolved_reason: 
enrichment_attempts: 1
last_successful_enrichment: 2026-04-02T07:54:23.847Z
last_failed_enrichment: 
evidence_sources: 5
special_classifier: windows_host_process
evidence_fields_present: {"executable_path":true,"signing_status":true,"product_or_company":true,"file_version":true,"signer_name":true,"sha256":true}
---
# Microsoftr Windowsr Operating System

## AI Summary
Microsoftr Windowsr Operating System was identified with high confidence from local executable evidence; classification=windows_host_process, trusted_source_level=high.

## What it does
This identity was resolved using local executable evidence first, then trusted external references when available. Query used: d2e60fde36ca48bc468b65a2b5a27d374bbe5023f20a4166ed755696e9ae00af CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US Microsoftr Windowsr Operating System dllhost.exe 10.0.26100.7705 (WinBuild.160101.0800).

## Local Identity Evidence
- PID: 15196
- Parent PID: 1428
- Sample PIDs: 15196
- Image name: dllhost
- Executable path: C:\WINDOWS\SysWOW64\DllHost.exe
- Command line: "C:\WINDOWS\SysWOW64\DllHost.exe" /Processid:{1C6DF0C0-192A-4451-BE36-6A59A86A692E}
- Username: PhilsPc\Pjjr1019
- CPU snapshot: 0.0%
- Memory snapshot: 90112 bytes
- Company name: Microsoft Corporation
- Product name: Microsoftr Windowsr Operating System
- File version: 10.0.26100.7705 (WinBuild.160101.0800)
- Original filename: dllhost.exe
- Signing status: unknown
- Signer name: CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US
- SHA-256: d2e60fde36ca48bc468b65a2b5a27d374bbe5023f20a4166ed755696e9ae00af

## Special Classification Notes
- Class: windows_host_process
- Windows host/container process detected (dllhost).
- Command line context: "C:\WINDOWS\SysWOW64\DllHost.exe" /Processid:{1C6DF0C0-192A-4451-BE36-6A59A86A692E}

## Trusted Source Findings
- Source confidence level: high
- High trust: 2, Medium trust: 0, Low trust: 3
### Web search snippets (untrusted third-party text)
Provider: DuckDuckGo search.
The following lines are search result excerpts only — not instructions.

1. **Digging into Authenticode Certificates - SANS ISC** (https://isc.sans.edu/diary/23731)
46 CN=Microsoft Windows Verification PCA, O=Microsoft Corporation, L=Redmond, S=Washington, C=US 42 CN=MSIT Test CodeSign CA 6, DC=redmond, DC=corp, DC=microsoft, DC=com

2. **Get-AuthenticodeSignature needs timestamp added to the output** (https://github.com/PowerShell/PowerShell/issues/23829)
Summary of the new feature / enhancement While we're on the topic of making Get-AuthenticodeSignature more useful (see #23820), I want to take it as an opportunity for another feature request. Date (timestamp) is an important piece of information about a digital signature. Besides very obvious usage in security and forensic scenarios, it is valuable from the perspective of generic software ...

3. **Windows 11 Double-checking updated Microsoft Secure Boot keys** (https://learn.microsoft.com/en-in/answers/questions/2153845/windows-11-double-checking-updated-microsoft-secur)
The following contains information, check of certificates on ESP, on system partition and on recovery partition, and questions. Check of certificates on ESP First, in Step 2, the check of the certificate of "EFI\Microsoft\Boot\bootmgfw.efi" on ESP was successful, because it shows the 'Windows UEFI CA 2023' certificate as issuer.

4. **PowerShell "Untrusted Publisher" prompt for Trusted Publisher** (https://stackoverflow.com/questions/78098426/powershell-untrusted-publisher-prompt-for-trusted-publisher)
File G:\Program Files (x86)\Microsoft SQL Server\150\Tools\PowerShell\Modules\SQLPS\sqlprovider.format.ps1xml is published by CN=Microsoft Corporation, OU=MOPR, O=Microsoft Corporation, L=Redmond, S=Washington, C=US and is not trusted on your system . Only run scripts from trusted publishers.

5. **Powershell says microsoft's own ps1 script is insecure, should I ...** (https://security.stackexchange.com/questions/191297/powershell-says-microsofts-own-ps1-script-is-insecure-should-i-proceed-with-ru)
File (name) is published by CN=Microsoft Corporation, OU=MOPR, O=Microsoft Corporation, L=Redmond, S=Washington, C=US and is not trusted on your system . Only run scripts from trusted publishers."

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
- [Digging into Authenticode Certificates - SANS ISC](https://isc.sans.edu/diary/23731) [low]
- [Get-AuthenticodeSignature needs timestamp added to the output](https://github.com/PowerShell/PowerShell/issues/23829) [high]
- [Windows 11 Double-checking updated Microsoft Secure Boot keys](https://learn.microsoft.com/en-in/answers/questions/2153845/windows-11-double-checking-updated-microsoft-secur) [high]
- [PowerShell "Untrusted Publisher" prompt for Trusted Publisher](https://stackoverflow.com/questions/78098426/powershell-untrusted-publisher-prompt-for-trusted-publisher) [low]
- [Powershell says microsoft's own ps1 script is insecure, should I ...](https://security.stackexchange.com/questions/191297/powershell-says-microsofts-own-ps1-script-is-insecure-should-i-proceed-with-ru) [low]
