---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/processes/cmd--microsoft-corporation--sha256_f682aadda9de.md"
source_name: "cmd--microsoft-corporation--sha256_f682aadda9de.md"
top_level: "taskmanager"
surface: "source"
classification: "neutral"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 14
selected_rank: 4376
content_hash: "091e5dc185076090a7cc9caf8a332e58df8cb73b10e078abe607994723ea3c60"
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

# taskmanager/brain/processes/cmd--microsoft-corporation--sha256_f682aadda9de.md

> Markdown doc; headings AI Summary / Local Identity Evidence / Low-Confidence / Conflicting Findings

## Key Signals

- Source path: taskmanager/brain/processes/cmd--microsoft-corporation--sha256_f682aadda9de.md
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
- Source link target: taskmanager/brain/processes/cmd--microsoft-corporation--sha256_f682aadda9de.md

## Excerpt

~~~markdown
---
identity_status: resolved_high_confidence
identity_confidence: 96
source_confidence: 70
summary_confidence: 86
unresolved_reason: 
enrichment_attempts: 1
last_successful_enrichment: 2026-04-02T07:53:25.328Z
last_failed_enrichment: 
evidence_sources: 5
special_classifier: standard
evidence_fields_present: {"executable_path":true,"signing_status":true,"product_or_company":true,"file_version":true,"signer_name":true,"sha256":true}
---
# Microsoftr Windowsr Operating System

## AI Summary
Microsoftr Windowsr Operating System was identified with high confidence from local executable evidence; classification=standard, trusted_source_level=high.

## What it does
This identity was resolved using local executable evidence first, then trusted external references when available. Query used: f682aadda9deb654885ae17909380a25f7cb1a43ac0934ac425ee8de4924c7f3 CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US Microsoftr Windowsr Operating System Cmd.Exe.MUI 10.0.26100.1 (WinBuild.160101.0800).

## Local Identity Evidence
- PID: 11944
- Parent PID: 9896
- Sample PIDs: 11944, 14212, 17164, 2296, 6216, 10424
- Image name: cmd
- Executable path: C:\WINDOWS\system32\cmd.exe
- Command line: cmd.exe /d /s /c "npm run dev -- --host 127.0.0.1 --port 5180 --strictPort"
~~~