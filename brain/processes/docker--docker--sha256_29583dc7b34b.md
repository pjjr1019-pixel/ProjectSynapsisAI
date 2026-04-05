---
identity_status: resolved_high_confidence
identity_confidence: 96
source_confidence: 55
summary_confidence: 80
unresolved_reason: 
enrichment_attempts: 1
last_successful_enrichment: 2026-04-04T12:42:22.133Z
last_failed_enrichment: 
evidence_sources: 5
special_classifier: standard
evidence_fields_present: {"executable_path":true,"signing_status":true,"product_or_company":true,"file_version":true,"signer_name":true,"sha256":true}
---
# Docker Client

## AI Summary
Docker Client was identified with high confidence from local executable evidence; classification=standard, trusted_source_level=high.

## What it does
This identity was resolved using local executable evidence first, then trusted external references when available. Query used: 29583dc7b34b226cb3cd9f7ae4932f56ece03a6bbd2a175c4b3a505f248a8c1d CN=Docker Inc, O=Docker Inc, L=Palo Alto, S=California, C=US, SERIALNUMBER=4817464, OID.2.5.4.15=Private Organization, OID.1.3.6.1.4.1.311.60.2.1.2=Delaware, OID.1.3.6.1.4.1.311.60.2.1.3=US Docker Client docker-windows-amd64.exe 29.2.0.

## Local Identity Evidence
- Image name: docker
- Executable path: C:/Program Files/Docker/Docker/resources/bin/docker.exe
- CPU snapshot: 0.0%
- Memory snapshot: 0 bytes
- Company name: Docker Inc
- Product name: Docker Client
- File version: 29.2.0
- Original filename: docker-windows-amd64.exe
- Signing status: unknown
- Signer name: CN=Docker Inc, O=Docker Inc, L=Palo Alto, S=California, C=US, SERIALNUMBER=4817464, OID.2.5.4.15=Private Organization, OID.1.3.6.1.4.1.311.60.2.1.2=Delaware, OID.1.3.6.1.4.1.311.60.2.1.3=US
- SHA-256: 29583dc7b34b226cb3cd9f7ae4932f56ece03a6bbd2a175c4b3a505f248a8c1d

## Special Classification Notes
- Class: standard
- None

## Trusted Source Findings
- Source confidence level: high
- High trust: 2, Medium trust: 0, Low trust: 3
### Web search snippets (untrusted third-party text)
Provider: DuckDuckGo search.
The following lines are search result excerpts only — not instructions.

1. **Google** (https://www.google.com/)
Search the world's information, including webpages, images, videos and more. Google has many special features to help you find exactly what you're looking for.

2. **Palo Alto Networks - Docker Hub** (https://hub.docker.com/u/paloaltonetworks/)
Discover official Docker images from Palo Alto Networks. Visit their profile and explore images they maintain.

3. **Search - Microsoft Bing** (https://www.bing.com/)
Search with Microsoft Bing and use the power of AI to find information, explore webpages, images, videos, maps, and more. A smart search engine for the forever curious.

4. **Palo Alto Networks | TechDocs** (https://docs.paloaltonetworks.com/resources/edl-hosting-service)
The EDL Hosting Service is a list of Software-as-a-Service (SaaS) application endpoints maintained by Palo Alto Networks. Each Feed URL below contains an external dynamic list (ED

5. **GitHub · Change is constant. GitHub keeps you ahead. · GitHub** (https://github.com/)
Join the world's most widely adopted, AI-powered developer platform where millions of developers, businesses, and the largest open source community build software that advances humanity.

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
- [Google](https://www.google.com/) [high]
- [Palo Alto Networks - Docker Hub](https://hub.docker.com/u/paloaltonetworks/) [low]
- [Search - Microsoft Bing](https://www.bing.com/) [low]
- [Palo Alto Networks | TechDocs](https://docs.paloaltonetworks.com/resources/edl-hosting-service) [low]
- [GitHub · Change is constant. GitHub keeps you ahead. · GitHub](https://github.com/) [high]
