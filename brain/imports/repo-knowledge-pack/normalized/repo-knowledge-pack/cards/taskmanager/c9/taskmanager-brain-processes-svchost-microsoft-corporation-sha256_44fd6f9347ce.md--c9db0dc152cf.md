---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/processes/svchost--microsoft-corporation--sha256_44fd6f9347ce.md"
source_name: "svchost--microsoft-corporation--sha256_44fd6f9347ce.md"
top_level: "taskmanager"
surface: "source"
classification: "neutral"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 14
selected_rank: 4416
content_hash: "170b40012a28c40998397a60395e1d5829afb634f16d6e14444d331d60230601"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "docs"
  - "markdown"
  - "md"
  - "neutral"
  - "source"
headings:
  - "AI Summary"
  - "Local Identity Evidence"
  - "Low-Confidence / Conflicting Findings"
  - "Special Classification Notes"
  - "svchost"
  - "Trusted Source Findings"
  - "Web search snippets (untrusted third-party text)"
  - "What it does"
---

# taskmanager/brain/processes/svchost--microsoft-corporation--sha256_44fd6f9347ce.md

> Markdown doc; headings AI Summary / Local Identity Evidence / Low-Confidence / Conflicting Findings

## Key Signals

- Source path: taskmanager/brain/processes/svchost--microsoft-corporation--sha256_44fd6f9347ce.md
- Surface: source
- Classification: neutral
- Kind: markdown
- Language: markdown
- Top level: taskmanager
- Score: 14
- Tags: brain, docs, markdown, md, neutral, source
- Headings: AI Summary | Local Identity Evidence | Low-Confidence / Conflicting Findings | Special Classification Notes | svchost | Trusted Source Findings

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, docs, markdown, md, neutral, source, taskmanager
- Source link target: taskmanager/brain/processes/svchost--microsoft-corporation--sha256_44fd6f9347ce.md

## Excerpt

~~~markdown
---
identity_status: resolved_high_confidence
identity_confidence: 96
source_confidence: 55
summary_confidence: 80
unresolved_reason: 
enrichment_attempts: 1
last_successful_enrichment: 2026-04-02T05:13:59.370Z
last_failed_enrichment: 
evidence_sources: 5
special_classifier: service_host
evidence_fields_present: {"executable_path":true,"signing_status":true,"product_or_company":true,"file_version":true,"signer_name":true,"sha256":true}
---
# svchost

## AI Summary
Microsoftr Windowsr Operating System was identified with high confidence from local executable evidence; classification=service_host, trusted_source_level=high.

## What it does
This identity was resolved using local executable evidence first, then trusted external references when available. Query used: 44fd6f9347ceed5798a25c47167f335ef085ae4648a81f775dd4bdc6240d8189 CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US Microsoftr Windowsr Operating System svchost.exe.mui 10.0.26100.1 (WinBuild.160101.0800) CDPUserSvc_4148e OneSyncSvc_4148e PimIndexMaintenanceSvc_4148e UnistoreSvc_4148e UserData.

## Local Identity Evidence
- PID: 5832
- Parent PID: 1260
- Sample PIDs: 6068, 5832, 7824, 17936, 12208, 8788
- Image name: svchost
- Executable path: C:\WINDOWS\system32\svchost.exe
- Command line: C:\WINDOWS\system32\svchost.exe -k UnistackSvcGroup
~~~