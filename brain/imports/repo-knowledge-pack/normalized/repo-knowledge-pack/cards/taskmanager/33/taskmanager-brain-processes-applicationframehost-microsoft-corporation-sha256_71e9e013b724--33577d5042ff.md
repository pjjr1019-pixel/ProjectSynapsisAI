---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/processes/applicationframehost--microsoft-corporation--sha256_71e9e013b724.md"
source_name: "applicationframehost--microsoft-corporation--sha256_71e9e013b724.md"
top_level: "taskmanager"
surface: "source"
classification: "neutral"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 14
selected_rank: 4370
content_hash: "d04ea5aef9f110909ea94ad46f67f913b64862747b710e3987a93394bd1aa384"
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
  - "Microsoftr Windowsr Operating System"
  - "Special Classification Notes"
  - "Trusted Source Findings"
  - "Web search snippets (untrusted third-party text)"
  - "What it does"
---

# taskmanager/brain/processes/applicationframehost--microsoft-corporation--sha256_71e9e013b724.md

> Markdown doc; headings AI Summary / Local Identity Evidence / Low-Confidence / Conflicting Findings

## Key Signals

- Source path: taskmanager/brain/processes/applicationframehost--microsoft-corporation--sha256_71e9e013b724.md
- Surface: source
- Classification: neutral
- Kind: markdown
- Language: markdown
- Top level: taskmanager
- Score: 14
- Tags: brain, docs, markdown, md, neutral, source
- Headings: AI Summary | Local Identity Evidence | Low-Confidence / Conflicting Findings | Microsoftr Windowsr Operating System | Special Classification Notes | Trusted Source Findings

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, docs, markdown, md, neutral, source, taskmanager
- Source link target: taskmanager/brain/processes/applicationframehost--microsoft-corporation--sha256_71e9e013b724.md

## Excerpt

~~~markdown
---
identity_status: resolved_high_confidence
identity_confidence: 96
source_confidence: 55
summary_confidence: 80
unresolved_reason: 
enrichment_attempts: 1
last_successful_enrichment: 2026-04-02T07:52:58.644Z
last_failed_enrichment: 
evidence_sources: 5
special_classifier: standard
evidence_fields_present: {"executable_path":true,"signing_status":true,"product_or_company":true,"file_version":true,"signer_name":true,"sha256":true}
---
# Microsoftr Windowsr Operating System

## AI Summary
Microsoftr Windowsr Operating System was identified with high confidence from local executable evidence; classification=standard, trusted_source_level=high.

## What it does
This identity was resolved using local executable evidence first, then trusted external references when available. Query used: 71e9e013b724c0ea6b2d7d91151fd87ebc1179a0254d671c66415fe066b60907 CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US Microsoftr Windowsr Operating System ApplicationFrameHost.exe 10.0.26100.7309 (WinBuild.160101.0800).

## Local Identity Evidence
- PID: 11284
- Parent PID: 1428
- Sample PIDs: 11284
- Image name: ApplicationFrameHost
- Executable path: C:\WINDOWS\system32\ApplicationFrameHost.exe
- Command line: C:\WINDOWS\system32\ApplicationFrameHost.exe -Embedding
~~~