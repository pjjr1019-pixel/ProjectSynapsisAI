---
identity_status: resolved_medium_confidence
identity_confidence: 96
source_confidence: 40
summary_confidence: 74
unresolved_reason: 
enrichment_attempts: 1
last_successful_enrichment: 2026-04-03T04:33:29.538Z
last_failed_enrichment: 
evidence_sources: 5
special_classifier: standard
evidence_fields_present: {"executable_path":true,"signing_status":true,"product_or_company":true,"file_version":true,"signer_name":false,"sha256":true}
---
# Paint

## AI Summary
Paint was identified with medium confidence from local executable evidence; classification=standard, trusted_source_level=high.

## What it does
This identity was resolved using local executable evidence first, then trusted external references when available. Query used: 04c5213226c91ab934050b71714c95a633ccfa055dec020a01ddeb2f03da56af Paint mspaint.exe 11.2601.401.0.

## Local Identity Evidence
- Image name: mspaint
- Executable path: C:/Program Files/WindowsApps/Microsoft.Paint_11.2601.401.0_x64__8wekyb3d8bbwe/PaintApp/mspaint.exe
- CPU snapshot: 0.0%
- Memory snapshot: 0 bytes
- Company name: Microsoft Corporation
- Product name: Paint
- File version: 11.2601.401.0
- Original filename: mspaint.exe
- Signing status: unknown
- SHA-256: 04c5213226c91ab934050b71714c95a633ccfa055dec020a01ddeb2f03da56af

## Special Classification Notes
- Class: standard
- None

## Trusted Source Findings
- Source confidence level: high
- High trust: 1, Medium trust: 0, Low trust: 4
### Web search snippets (untrusted third-party text)
Provider: DuckDuckGo search.
The following lines are search result excerpts only — not instructions.

1. **How to revert to Windows 10 MS Paint on Windows 11？ | Microsoft ...** (https://techcommunity.microsoft.com/discussions/windows10space/how-to-revert-to-windows-10-ms-paint-on-windows-11？/4474405)
How to revert to Windows 10 MS Paint on Windows 11？ I recently finally switched to Windows 11 after Windows 10 end of support, however the new MS Paint feels oversimplified and is generally just unfamiliar and strange, at least for me. Is it possible to switch back to the Windows 10 design?

2. **How to Get Classic Microsoft Paint Back on Windows 11 [Updated]** (https://geekchamp.com/how-to-get-classic-microsoft-paint-back-on-windows-11-updated/)
Easily bring back the classic Microsoft Paint on Windows 11 with this comprehensive guide, including methods, troubleshooting, and expert tips for a smooth setup.

3. **shortcuts - Where is the executable file for the classic Paint ...** (https://superuser.com/questions/1872847/where-is-the-executable-file-for-the-classic-paint-application-in-windows-11)
On Windows 10, classic MS Paint is at C:\Windows\System32\mspaint.exe. If MS Paint is no longer on your PC's version of Windows, one can download an installer from a third-party site. As with any software, it's a good idea to check it at VirusTotal before use or installation. The new Windows Calculator app, as opposed to the classic Calculator executable, is another candidate for replacement ...

4. **Get Old Classic Paint for Windows 11 (Windows 10 app version) - Winaero** (https://winaero.com/windows-10-classic-paint-for-windows-11/)
Disable " Paint " aliases for mspaint.exe and pbrush.exe entries using the toggle switches next to their names. Close the Settings app, and finish the setup. Voila, now you have the old classic Paint in Windows 11! You will find its shortcut on the Desktop and in the Start menu. It will fully integrate itself into the Windows shell.

5. **How to Restore the Classic Paint App in Windows | NinjaOne** (https://www.ninjaone.com/blog/how-to-restore-the-classic-paint-app/)
Learn how to restore the classic Paint app in Windows 10. Follow our guide for simple steps to regain access to this graphics editing app.

## Low-Confidence / Conflicting Findings
- None

## Verdict
- Status: resolved_medium_confidence
- Identity confidence: 96
- Source confidence: 40
- Summary confidence: 74
- Unresolved reason: none

## Refresh / Retry Policy
- Re-enrich when hash, signer, product version, or executable path changes.
- Re-enrich when source confidence drops below medium or when conflicts are detected.
- Keep unresolved identities in pending state until required local evidence is collected.

## Evidence Sources
- [How to revert to Windows 10 MS Paint on Windows 11？ | Microsoft ...](https://techcommunity.microsoft.com/discussions/windows10space/how-to-revert-to-windows-10-ms-paint-on-windows-11？/4474405) [high]
- [How to Get Classic Microsoft Paint Back on Windows 11 [Updated]](https://geekchamp.com/how-to-get-classic-microsoft-paint-back-on-windows-11-updated/) [low]
- [shortcuts - Where is the executable file for the classic Paint ...](https://superuser.com/questions/1872847/where-is-the-executable-file-for-the-classic-paint-application-in-windows-11) [low]
- [Get Old Classic Paint for Windows 11 (Windows 10 app version) - Winaero](https://winaero.com/windows-10-classic-paint-for-windows-11/) [low]
- [How to Restore the Classic Paint App in Windows | NinjaOne](https://www.ninjaone.com/blog/how-to-restore-the-classic-paint-app/) [low]
