---
identity_status: resolved_medium_confidence
identity_confidence: 96
source_confidence: 40
summary_confidence: 74
unresolved_reason: 
enrichment_attempts: 25
last_successful_enrichment: 2026-04-04T07:57:30.373Z
last_failed_enrichment: 
evidence_sources: 5
special_classifier: standard
evidence_fields_present: {"executable_path":true,"signing_status":true,"product_or_company":true,"file_version":true,"signer_name":true,"sha256":true}
---
# DuckDuckGo

## AI Summary
DuckDuckGo was identified with medium confidence from local executable evidence; classification=standard, trusted_source_level=high.

## What it does
This identity was resolved using local executable evidence first, then trusted external references when available. Query used: f8c9963d86a9161e804a0d21965bd48da4485fb3af3c1d983bf37c5389cfdf62 CN="Duck Duck Go, Inc.", OU=Engineering, O="Duck Duck Go, Inc.", L=Paoli, S=Pennsylvania, C=US, SERIALNUMBER=5019303, OID.2.5.4.15=Private Organization, OID.1.3.6.1.4.1.311.60.2.1.2=Delaware, OID.1.3.6.1.4.1.311.60.2.1.3=US DuckDuckGo DuckDuckGo.dll 0.151.

## Local Identity Evidence
- Image name: duckduckgo
- Executable path: C:/Program Files/WindowsApps/DuckDuckGo.DesktopBrowser_0.151.4.0_x64__ya2fgkz3nks94/WindowsBrowser/DuckDuckGo.exe
- CPU snapshot: 0.0%
- Memory snapshot: 0 bytes
- Company name: DuckDuckGo
- Product name: DuckDuckGo
- File version: 0.151.4.0
- Original filename: DuckDuckGo.dll
- Signing status: unknown
- Signer name: CN="Duck Duck Go, Inc.", OU=Engineering, O="Duck Duck Go, Inc.", L=Paoli, S=Pennsylvania, C=US, SERIALNUMBER=5019303, OID.2.5.4.15=Private Organization, OID.1.3.6.1.4.1.311.60.2.1.2=Delaware, OID.1.3.6.1.4.1.311.60.2.1....
- SHA-256: f8c9963d86a9161e804a0d21965bd48da4485fb3af3c1d983bf37c5389cfdf62

## Special Classification Notes
- Class: standard
- None

## Trusted Source Findings
- Source confidence level: high
- High trust: 1, Medium trust: 0, Low trust: 4
### Web search snippets (untrusted third-party text)
Provider: DuckDuckGo search.
The following lines are search result excerpts only — not instructions.

1. **DuckDuckGo - Protection. Privacy. Peace of mind.** (https://duckduckgo.com/)
What is DuckDuckGo ? At DuckDuckGo , we believe the best way to protect your personal information from hackers, scammers, and privacy-invasive companies is to stop it from being collected at all. That's why millions of people choose DuckDuckGo over Chrome and other browsers to search and browse online.

2. **DuckDuckGo, Duck.ai (optional) - Free download and install on Windows ...** (https://apps.microsoft.com/detail/9n74nhxch1n6)
At DuckDuckGo , we believe the best way to protect your personal information from hackers, scammers, and privacy-invasive companies is to stop it from being collected at all. That's why millions of people choose DuckDuckGo over Chrome and other browsers to search and browse online. Our built-in search engine is like Google but never tracks your searches. Our browsing protections, such as ad ...

3. ***.duckduckgo.com - SSL-Tools** (https://ssl-tools.net/subjects/650d48e11e8e583e46987a8b55f0b0032c33505b)
C=US ST=Pennsylvania L=Paoli O= Duck Duck Go, Inc. CN =*. duckduckgo .com Fingerprints: 35c87b6ae627da3af20c7c4e2102e45eb74f6b3fc307562c0833b1d3e207e2005e6fc5d3fd3324ee

4. **Automated Malware Analysis Report for DuckDuckGo.exe - Joe Sandbox** (https://www.joesandbox.com/analysis/1869154/0/html)
⊘ No network behavior found Statistics CPU Usage 0 2 4 6 s 0 20 40 60 80 100 • DuckDuckGo .exe

5. **DuckDuckGo - Wikipedia** (https://en.wikipedia.org/wiki/DuckDuckGo)
DuckDuckGo is an American software company focused on online privacy whose flagship product is a search engine named DuckDuckGo . Founded by Gabriel Weinberg in 2008, its later products include browser extensions [9] and a custom DuckDuckGo web browser. [10] Headquartered in Paoli, Pennsylvania, DuckDuckGo is a privately held company with about 200 employees. [11] The company's name is a ...

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
- [DuckDuckGo - Protection. Privacy. Peace of mind.](https://duckduckgo.com/) [low]
- [DuckDuckGo, Duck.ai (optional) - Free download and install on Windows ...](https://apps.microsoft.com/detail/9n74nhxch1n6) [high]
- [*.duckduckgo.com - SSL-Tools](https://ssl-tools.net/subjects/650d48e11e8e583e46987a8b55f0b0032c33505b) [low]
- [Automated Malware Analysis Report for DuckDuckGo.exe - Joe Sandbox](https://www.joesandbox.com/analysis/1869154/0/html) [low]
- [DuckDuckGo - Wikipedia](https://en.wikipedia.org/wiki/DuckDuckGo) [low]
