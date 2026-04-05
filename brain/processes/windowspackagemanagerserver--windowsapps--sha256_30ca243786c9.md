---
identity_status: resolved_high_confidence
identity_confidence: 96
source_confidence: 55
summary_confidence: 80
unresolved_reason: 
enrichment_attempts: 1
last_successful_enrichment: 2026-04-02T19:00:06.483Z
last_failed_enrichment: 
evidence_sources: 5
special_classifier: standard
evidence_fields_present: {"executable_path":true,"signing_status":true,"product_or_company":true,"file_version":true,"signer_name":true,"sha256":true}
---
# windowspackagemanagerserver

## AI Summary
Microsoft Desktop App Installer was identified with high confidence from local executable evidence; classification=standard, trusted_source_level=high.

## What it does
This identity was resolved using local executable evidence first, then trusted external references when available. Query used: 30ca243786c9c614e2fba858e151fbb805d946ac4c57e0f00ed58fe9276c7d1a CN=Microsoft Corporation, O=Microsoft Corporation, L=Redmond, S=Washington, C=US Microsoft Desktop App Installer WindowsPackageManagerServer.exe 1.28.220.00000.

## Local Identity Evidence
- PID: 18804
- Parent PID: 1500
- Sample PIDs: 18804
- Image name: WindowsPackageManagerServer
- Executable path: C:\Program Files\WindowsApps\Microsoft.DesktopAppInstaller_1.28.220.0_x64__8wekyb3d8bbwe\WindowsPackageManagerServer.exe
- Command line: "C:\Program Files\WindowsApps\Microsoft.DesktopAppInstaller_1.28.220.0_x64__8wekyb3d8bbwe\WindowsPackageManagerServer.exe" -Embedding
- Username: PhilsPc\Pjjr1019
- CPU snapshot: 0.0%
- Memory snapshot: 4202496 bytes
- Company name: Microsoft Corporation
- Product name: Microsoft Desktop App Installer
- File version: 1.28.220.00000
- Original filename: WindowsPackageManagerServer.exe
- Signing status: unknown
- Signer name: CN=Microsoft Corporation, O=Microsoft Corporation, L=Redmond, S=Washington, C=US
- SHA-256: 30ca243786c9c614e2fba858e151fbb805d946ac4c57e0f00ed58fe9276c7d1a

## Special Classification Notes
- Class: standard
- None

## Trusted Source Findings
- Source confidence level: high
- High trust: 2, Medium trust: 0, Low trust: 3
### Web search snippets (untrusted third-party text)
Provider: DuckDuckGo search.
The following lines are search result excerpts only — not instructions.

1. **Bandai Namco /Microsoft gaming services /DirectX runtime error fix : r ...** (https://www.reddit.com/r/PiratedGames/comments/wppyjl/bandai_namco_microsoft_gaming_services_directx/)
Provide the framework " Microsoft .DirectXRuntime" published by " CN=Microsoft Corporation, O=Microsoft Corporation, L=Redmond, S=Washington, C=US ", with neutral or x64 processor architecture and minimum version 9.29.952.0, along with this package to install.

2. **Solved: Microsoft Update Secure Server CA 2.1 not trusted ...** (https://community.fortinet.com/t5/Support-Forum/Microsoft-Update-Secure-Server-CA-2-1-not-trusted-in-Fortgate-or/m-p/295174)
depth=1 C = US, ST = Washington, L = Redmond, O = Microsoft Corporation, CN = Microsoft Update Secure Server CA 2.1 verify error:num=20:unable to get local issuer certificate

3. **PDF Troubleshoot List of Root Certificates Required for the Secure ... - Cisco** (https://www.cisco.com/c/en/us/support/docs/security/amp-endpoints/216943-list-of-root-certificates-required-for-a.pdf)
The information in this document was created from the devices in a specific lab environment. All of the devices used in this document started with a cleared (default) configuration. If your network is live, ensure that you understand the potential impact of any command.

4. **Update PowerShell execution policy code to trust the Windows and ...** (https://github.com/PowerShell/PowerShell/issues/24122)
PS C:> Get-LocalUser NoOne Do you want to run software from this untrusted publisher? File C:\Windows\system32\WindowsPowerShell\v1.0\Modules\Microsoft.PowerShell.LocalAccounts\1...0\LocalAccounts.format.ps1xml is published by CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US and is not trusted on your system. Only run

5. **GitHub - gabriel-vanca/VCLibs: Desktop Bridge C++ Runtime Framework ...** (https://github.com/gabriel-vanca/VCLibs)
Provide the framework " Microsoft .VCLibs.140.00.UWPDesktop" published by " CN=Microsoft Corporation, O=Microsoft Corporation, L=Redmond, S=Washington, C=US ", with neutral or x64 processor architecture and minimum version 14.0.30035.0, along with this package to install.

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
- [Bandai Namco /Microsoft gaming services /DirectX runtime error fix : r ...](https://www.reddit.com/r/PiratedGames/comments/wppyjl/bandai_namco_microsoft_gaming_services_directx/) [low]
- [Solved: Microsoft Update Secure Server CA 2.1 not trusted ...](https://community.fortinet.com/t5/Support-Forum/Microsoft-Update-Secure-Server-CA-2-1-not-trusted-in-Fortgate-or/m-p/295174) [low]
- [PDF Troubleshoot List of Root Certificates Required for the Secure ... - Cisco](https://www.cisco.com/c/en/us/support/docs/security/amp-endpoints/216943-list-of-root-certificates-required-for-a.pdf) [low]
- [Update PowerShell execution policy code to trust the Windows and ...](https://github.com/PowerShell/PowerShell/issues/24122) [high]
- [GitHub - gabriel-vanca/VCLibs: Desktop Bridge C++ Runtime Framework ...](https://github.com/gabriel-vanca/VCLibs) [high]
