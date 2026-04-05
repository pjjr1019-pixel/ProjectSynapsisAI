---
identity_status: resolved_high_confidence
identity_confidence: 96
source_confidence: 55
summary_confidence: 80
unresolved_reason: 
enrichment_attempts: 1
last_successful_enrichment: 2026-04-02T18:15:18.377Z
last_failed_enrichment: 
evidence_sources: 5
special_classifier: standard
evidence_fields_present: {"executable_path":true,"signing_status":true,"product_or_company":true,"file_version":true,"signer_name":true,"sha256":true}
---
# systemsettings

## AI Summary
Microsoftr Windowsr Operating System was identified with high confidence from local executable evidence; classification=standard, trusted_source_level=high.

## What it does
This identity was resolved using local executable evidence first, then trusted external references when available. Query used: b2b56b4ee89402fbc3385e080a4551fd2c8643c9bc884b9b2a747678933745e4 CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US Microsoftr Windowsr Operating System SystemSettings.exe.mui 10.0.26100.8117 (WinBuild.160101.0800).

## Local Identity Evidence
- PID: 5152
- Parent PID: 1500
- Sample PIDs: 5152
- Image name: SystemSettings
- Executable path: C:\Windows\ImmersiveControlPanel\SystemSettings.exe
- Command line: "C:\Windows\ImmersiveControlPanel\SystemSettings.exe" -ServerName:microsoft.windows.immersivecontrolpanel
- Username: PhilsPc\Pjjr1019
- CPU snapshot: 0.0%
- Memory snapshot: 212992 bytes
- Company name: Microsoft Corporation
- Product name: Microsoftr Windowsr Operating System
- File version: 10.0.26100.8117 (WinBuild.160101.0800)
- Original filename: SystemSettings.exe.mui
- Signing status: unknown
- Signer name: CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US
- SHA-256: b2b56b4ee89402fbc3385e080a4551fd2c8643c9bc884b9b2a747678933745e4

## Special Classification Notes
- Class: standard
- None

## Trusted Source Findings
- Source confidence level: high
- High trust: 2, Medium trust: 0, Low trust: 3
### Web search snippets (untrusted third-party text)
Provider: DuckDuckGo search.
The following lines are search result excerpts only — not instructions.

1. **Windows 11 Andriod installing WSA powerShell 0x80073CF3 Error** (https://learn.microsoft.com/en-us/answers/questions/617012/windows-11-andriod-installing-wsa-powershell-0x800)
published by " CN=Microsoft Corporation, O=Microsoft Corporation, L=Redmond, S=Washington, C=US ", with neutral or x64 processor architecture and minimum version 2.62108.18004.0, along with this package to install.

2. **Update PowerShell execution policy code to trust the Windows and ...** (https://github.com/PowerShell/PowerShell/issues/24122)
File C:\Windows\system32\WindowsPowerShell\v1.0\Modules\Microsoft.PowerShell.LocalAccounts\1...0\LocalAccounts.format.ps1xml is published by CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US and is not trusted on your system . Only run scripts from trusted publishers.

3. **How to install MSIX package with dependencies in Sandbox?** (https://stackoverflow.com/questions/78921413/how-to-install-msix-package-with-dependencies-in-sandbox)
Provide the framework "Microsoft.VCLibs.140.00.UWPDesktop" published by " CN=Microsoft Corporation, O=Microsoft Corporation, L=Redmond, S=Washington, C=US ", with neutral or x64 processor architecture and minimum version 14.0.30704.0, along with this package to install.

4. **UEFI Secure Boot bypass - binarly.io** (https://www.binarly.io/advisories/brly-dva-2025-001)
An attacker can exploit this vulnerability to bypass Secure Boot, allowing them to execute untrusted code during the boot process. This enables an attacker to run malicious UEFI bootkits before the operating system is fully initialized. Once deployed, these malicious components can compromise the integrity of the operating system , gain elevated privileges, or facilitate further attacks ...

5. **System Settings crash when trying to see what ... - Windows 11 Forum** (https://www.elevenforum.com/t/system-settings-crash-when-trying-to-see-what-optional-updates-there-are.2752/)
This tutorial will show you how to reset and re-register the Settings app for your account in Windows 10 and Windows 11. Microsoft designed Settings to be beautiful, easy to use and inclusive of all your Microsoft experiences in Windows 10/11. Settings has left-handed navigation that persists...

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
- [Windows 11 Andriod installing WSA powerShell 0x80073CF3 Error](https://learn.microsoft.com/en-us/answers/questions/617012/windows-11-andriod-installing-wsa-powershell-0x800) [high]
- [Update PowerShell execution policy code to trust the Windows and ...](https://github.com/PowerShell/PowerShell/issues/24122) [high]
- [How to install MSIX package with dependencies in Sandbox?](https://stackoverflow.com/questions/78921413/how-to-install-msix-package-with-dependencies-in-sandbox) [low]
- [UEFI Secure Boot bypass - binarly.io](https://www.binarly.io/advisories/brly-dva-2025-001) [low]
- [System Settings crash when trying to see what ... - Windows 11 Forum](https://www.elevenforum.com/t/system-settings-crash-when-trying-to-see-what-optional-updates-there-are.2752/) [low]
