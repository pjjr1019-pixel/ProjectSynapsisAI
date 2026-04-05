---
identity_status: resolved_medium_confidence
identity_confidence: 78
source_confidence: 70
summary_confidence: 75
unresolved_reason: 
enrichment_attempts: 1
last_successful_enrichment: 2026-04-03T04:35:07.791Z
last_failed_enrichment: 
evidence_sources: 5
special_classifier: standard
evidence_fields_present: {"executable_path":true,"signing_status":true,"product_or_company":true,"file_version":true,"signer_name":true,"sha256":false}
---
# Visual Studio Code

## AI Summary
Visual Studio Code was identified with medium confidence from local executable evidence; classification=standard, trusted_source_level=high.

## What it does
This identity was resolved using local executable evidence first, then trusted external references when available. Query used: CN=Microsoft Corporation, O=Microsoft Corporation, L=Redmond, S=Washington, C=US Visual Studio Code codesetup-stable-e7fb5e96c0730b9deb70b33781f98e2f35975036 1.114.0.

## Local Identity Evidence
- Image name: codesetup-stable-e7fb5e96c0730b9deb70b33781f98e2f35975036
- Executable path: C:/Users/<redacted>/AppData/Local/Temp/vscode-stable-user-x64/CodeSetup-stable-e7fb5e96c0730b9deb70b33781f98e2f35975036.exe
- CPU snapshot: 0.0%
- Memory snapshot: 0 bytes
- Product name: Visual Studio Code
- File version: 1.114.0
- Signing status: unknown
- Signer name: CN=Microsoft Corporation, O=Microsoft Corporation, L=Redmond, S=Washington, C=US

## Special Classification Notes
- Class: standard
- None

## Trusted Source Findings
- Source confidence level: high
- High trust: 3, Medium trust: 0, Low trust: 2
### Web search snippets (untrusted third-party text)
Provider: DuckDuckGo search.
The following lines are search result excerpts only — not instructions.

1. **Untrusted Certificate when installing Microsoft Edge** (https://techcommunity.microsoft.com/discussions/systemcenter/untrusted-certificate-when-installing-microsoft-edge/1479788)
Hi, when I create a deployment using the Microsoft Edge Wizard in MECM 2002, then deploy it, the install times out. If I run the automatically created command manually, I get a message "Do you want to run software from this untrusted publisher. CN=Microsoft Corporation, O=Microsoft Corporation,L=Redmond , S=Washington, C=US and is not trusted on your system. Only run scripts from trusted ...

2. **Bandai Namco /Microsoft gaming services /DirectX runtime error fix : r ...** (https://www.reddit.com/r/PiratedGames/comments/wppyjl/bandai_namco_microsoft_gaming_services_directx/)
Provide the framework "Microsoft.DirectXRuntime" published by " CN=Microsoft Corporation, O=Microsoft Corporation, L=Redmond, S=Washington, C=US ", with neutral or x64 processor architecture and minimum version 9.29.952.0, along with this package to install.

3. **PowerShell "Untrusted Publisher" prompt for Trusted Publisher** (https://stackoverflow.com/questions/78098426/powershell-untrusted-publisher-prompt-for-trusted-publisher)
File G:\Program Files (x86)\Microsoft SQL Server\150\Tools\PowerShell\Modules\SQLPS\sqlprovider.format.ps1xml is published by CN=Microsoft Corporation, OU=MOPR, O=Microsoft Corporation, L=Redmond, S=Washington, C=US and is not trusted on your system. Only run scripts from trusted publishers.

4. **SSL trust issue when connecting to login.microsoftonline.com | Layer7 ...** (https://community.broadcom.com/enterprisesoftware/communities/community-home/digestviewer/viewthread?MessageKey=f5d064bf-3b3d-4291-9fd8-4fc2231f722d&CommunityKey=0f580f5f-30a4-41de-a75c-e5f433325a18&tab=digestviewer)
Caused by: Server cert 'cn=stamp2.login.microsoftonline.com,o=microsoft corporation,l=redmond,st=washington,c=us' found but not trusted for SSL. What can be done about this?

5. **Mismatched Certificate and File Hash on pwsh.exe #20481** (https://github.com/PowerShell/PowerShell/issues/20481)
[Issuer] CN = Microsoft Code Signing PCA 2011, O = Microsoft Corporation, L = Redmond, S = Washington, C = US [Serial Number] 330000034D4E91A61A28B0788F00000000034D [Not Before] 17/03/2023 4: 43: 28 AM [Not After] 15/03/2024 4: 43: 28 AM [Thumbprint] 6E78B3DCE2998F6C2457C3E54DA90A01034916AE

## Low-Confidence / Conflicting Findings
- None

## Verdict
- Status: resolved_medium_confidence
- Identity confidence: 78
- Source confidence: 70
- Summary confidence: 75
- Unresolved reason: none

## Refresh / Retry Policy
- Re-enrich when hash, signer, product version, or executable path changes.
- Re-enrich when source confidence drops below medium or when conflicts are detected.
- Keep unresolved identities in pending state until required local evidence is collected.

## Evidence Sources
- [Untrusted Certificate when installing Microsoft Edge](https://techcommunity.microsoft.com/discussions/systemcenter/untrusted-certificate-when-installing-microsoft-edge/1479788) [high]
- [Bandai Namco /Microsoft gaming services /DirectX runtime error fix : r ...](https://www.reddit.com/r/PiratedGames/comments/wppyjl/bandai_namco_microsoft_gaming_services_directx/) [low]
- [PowerShell "Untrusted Publisher" prompt for Trusted Publisher](https://stackoverflow.com/questions/78098426/powershell-untrusted-publisher-prompt-for-trusted-publisher) [low]
- [SSL trust issue when connecting to login.microsoftonline.com | Layer7 ...](https://community.broadcom.com/enterprisesoftware/communities/community-home/digestviewer/viewthread?MessageKey=f5d064bf-3b3d-4291-9fd8-4fc2231f722d&CommunityKey=0f580f5f-30a4-41de-a75c-e5f433325a18&tab=digestviewer) [high]
- [Mismatched Certificate and File Hash on pwsh.exe #20481](https://github.com/PowerShell/PowerShell/issues/20481) [high]
