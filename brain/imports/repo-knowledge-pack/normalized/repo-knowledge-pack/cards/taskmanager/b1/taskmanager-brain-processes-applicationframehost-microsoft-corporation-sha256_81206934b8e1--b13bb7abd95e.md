---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/processes/applicationframehost--microsoft-corporation--sha256_81206934b8e1.md"
source_name: "applicationframehost--microsoft-corporation--sha256_81206934b8e1.md"
top_level: "taskmanager"
surface: "source"
classification: "neutral"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 14
selected_rank: 4371
content_hash: "25969618370e2f6aa136e4fcf048cdd2ad3489b1648bb08ca56122d5e72b9ce9"
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
  - "applicationframehost"
  - "Local Identity Evidence"
  - "Low-Confidence / Conflicting Findings"
  - "Special Classification Notes"
  - "Trusted Source Findings"
  - "Verdict"
  - "What it does"
---

# taskmanager/brain/processes/applicationframehost--microsoft-corporation--sha256_81206934b8e1.md

> Markdown doc; headings AI Summary / applicationframehost / Local Identity Evidence

## Key Signals

- Source path: taskmanager/brain/processes/applicationframehost--microsoft-corporation--sha256_81206934b8e1.md
- Surface: source
- Classification: neutral
- Kind: markdown
- Language: markdown
- Top level: taskmanager
- Score: 14
- Tags: brain, docs, markdown, md, neutral, source
- Headings: AI Summary | applicationframehost | Local Identity Evidence | Low-Confidence / Conflicting Findings | Special Classification Notes | Trusted Source Findings

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, docs, markdown, md, neutral, source, taskmanager
- Source link target: taskmanager/brain/processes/applicationframehost--microsoft-corporation--sha256_81206934b8e1.md

## Excerpt

~~~markdown
---
identity_status: resolved_medium_confidence
identity_confidence: 96
source_confidence: 0
summary_confidence: 58
unresolved_reason: 
enrichment_attempts: 1
last_successful_enrichment: 2026-04-02T12:28:37.259Z
last_failed_enrichment: 
evidence_sources: 0
special_classifier: standard
evidence_fields_present: {"executable_path":true,"signing_status":true,"product_or_company":true,"file_version":true,"signer_name":true,"sha256":true}
---
# applicationframehost

## AI Summary
Microsoftr Windowsr Operating System was identified with medium confidence from local executable evidence; classification=standard, trusted_source_level=none.

## What it does
This identity was resolved using local executable evidence first, then trusted external references when available. Query used: 81206934b8e11c992ba406fb634999bb3ce3ad29d747a8e58fe19c5ddf2a23d0 CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US Microsoftr Windowsr Operating System ApplicationFrameHost.exe 10.0.26100.8115 (WinBuild.160101.0800).

## Local Identity Evidence
- PID: 15924
- Parent PID: 1500
- Sample PIDs: 15924
- Image name: ApplicationFrameHost
- Executable path: C:\WINDOWS\system32\ApplicationFrameHost.exe
- Command line: C:\WINDOWS\system32\ApplicationFrameHost.exe -Embedding
~~~