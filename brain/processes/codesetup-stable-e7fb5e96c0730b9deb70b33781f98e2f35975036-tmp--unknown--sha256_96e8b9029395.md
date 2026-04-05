---
identity_status: resolved_medium_confidence
identity_confidence: 78
source_confidence: 55
summary_confidence: 69
unresolved_reason: 
enrichment_attempts: 1
last_successful_enrichment: 2026-04-03T04:34:51.401Z
last_failed_enrichment: 
evidence_sources: 5
special_classifier: standard
evidence_fields_present: {"executable_path":true,"signing_status":true,"product_or_company":true,"file_version":true,"signer_name":true,"sha256":false}
---
# Visual Studio Code

## AI Summary
Visual Studio Code was identified with medium confidence from local executable evidence; classification=standard, trusted_source_level=high.

## What it does
This identity was resolved using local executable evidence first, then trusted external references when available. Query used: CN=Microsoft Corporation, O=Microsoft Corporation, L=Redmond, S=Washington, C=US Visual Studio Code codesetup-stable-e7fb5e96c0730b9deb70b33781f98e2f35975036-tmp 51.1052.0.0.

## Local Identity Evidence
- Image name: codesetup-stable-e7fb5e96c0730b9deb70b33781f98e2f35975036-tmp
- Executable path: C:/Users/<redacted>/AppData/Local/Temp/is-RC4F5.tmp/CodeSetup-stable-e7fb5e96c0730b9deb70b33781f98e2f35975036.tmp
- CPU snapshot: 0.0%
- Memory snapshot: 0 bytes
- Product name: Visual Studio Code
- File version: 51.1052.0.0
- Signing status: unknown
- Signer name: CN=Microsoft Corporation, O=Microsoft Corporation, L=Redmond, S=Washington, C=US

## Special Classification Notes
- Class: standard
- None

## Trusted Source Findings
- Source confidence level: high
- High trust: 2, Medium trust: 0, Low trust: 3
### Web search snippets (untrusted third-party text)
Provider: DuckDuckGo search.
The following lines are search result excerpts only — not instructions.

1. **Untrusted Certificate when installing Microsoft Edge** (https://techcommunity.microsoft.com/discussions/systemcenter/untrusted-certificate-when-installing-microsoft-edge/1479788)
Hi, when I create a deployment using the Microsoft Edge Wizard in MECM 2002, then deploy it, the install times out. If I run the automatically created command manually, I get a message "Do you want to run software from this untrusted publisher. CN=Microsoft Corporation, O=Microsoft Corporation,L=Redmond , S=Washington, C=US and is not trusted on your system. Only run scripts from trusted ...

2. **Powershell not acknowledging my selection for running untrusted ...** (https://forums.powershell.org/t/powershell-not-acknowledging-my-selection-for-running-untrusted-software/14385)
File C:\Users\corwyn.vscode\extensions\ms-vscode.powershell-2020.4.0\modules\PowerShellEditorServices\Commands\Public\Clear-Host.ps1 is published by CN=Microsoft Corporation, O=Microsoft Corporation, L=Redmond, S=Washington, C=US and is not trusted on your system. Only run scripts from trusted publishers.

3. **Powershell says microsoft's own ps1 script is insecure, should I ...** (https://security.stackexchange.com/questions/191297/powershell-says-microsofts-own-ps1-script-is-insecure-should-i-proceed-with-ru)
"Do you want to run software from this untrusted publisher? File (name) is published by CN=Microsoft Corporation, OU=MOPR, O=Microsoft Corporation, L=Redmond, S=Washington, C=US and is not trusted on your system. Only run scripts from trusted publishers." then asks if I want to run it. Thank you all for any help on this matter.

4. **Microsoft certificate giving untrusted publisher message** (https://www.reddit.com/r/it/comments/134yxmr/microsoft_certificate_giving_untrusted_publisher/)
File C:\program files\microsoft visual studio\2022\professional\common7\ide\commonextensions\microsoft\nuget\Modules\NuGet\NuGet.Types.ps1xml is published by CN=Microsoft Corporation, O=Microsoft Corporation, L=Redmond, S=Washington, C=US and is not trusted on your system. Only run scripts from trusted publishers.

5. **PSReadLine: expired certificates? · Issue #13000 · PowerShell/PowerShell** (https://github.com/PowerShell/PowerShell/issues/13000)
The PSReadLine that's shipped in-box of Windows is Windows catalog signed (because it's part of the Windows), so it's trusted by default. The PSReadLine shipped with PS 7 or installed from PowerShell Gallery is Microsoft signed, but that certificate is not trusted by default, and you need to add it to the trusted publisher to make it work ...

## Low-Confidence / Conflicting Findings
- None

## Verdict
- Status: resolved_medium_confidence
- Identity confidence: 78
- Source confidence: 55
- Summary confidence: 69
- Unresolved reason: none

## Refresh / Retry Policy
- Re-enrich when hash, signer, product version, or executable path changes.
- Re-enrich when source confidence drops below medium or when conflicts are detected.
- Keep unresolved identities in pending state until required local evidence is collected.

## Evidence Sources
- [Untrusted Certificate when installing Microsoft Edge](https://techcommunity.microsoft.com/discussions/systemcenter/untrusted-certificate-when-installing-microsoft-edge/1479788) [high]
- [Powershell not acknowledging my selection for running untrusted ...](https://forums.powershell.org/t/powershell-not-acknowledging-my-selection-for-running-untrusted-software/14385) [low]
- [Powershell says microsoft's own ps1 script is insecure, should I ...](https://security.stackexchange.com/questions/191297/powershell-says-microsofts-own-ps1-script-is-insecure-should-i-proceed-with-ru) [low]
- [Microsoft certificate giving untrusted publisher message](https://www.reddit.com/r/it/comments/134yxmr/microsoft_certificate_giving_untrusted_publisher/) [low]
- [PSReadLine: expired certificates? · Issue #13000 · PowerShell/PowerShell](https://github.com/PowerShell/PowerShell/issues/13000) [high]
