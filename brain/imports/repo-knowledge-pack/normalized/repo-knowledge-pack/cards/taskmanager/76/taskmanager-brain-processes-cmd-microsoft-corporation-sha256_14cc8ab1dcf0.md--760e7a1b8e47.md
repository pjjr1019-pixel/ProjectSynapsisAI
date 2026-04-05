---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/processes/cmd--microsoft-corporation--sha256_14cc8ab1dcf0.md"
source_name: "cmd--microsoft-corporation--sha256_14cc8ab1dcf0.md"
top_level: "taskmanager"
surface: "source"
classification: "neutral"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 14
selected_rank: 4375
content_hash: "f2ce6b5a7f5995a990a078bbbb37328a85e15c18b269aa6b746a79b45cb55573"
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
  - "cmd"
  - "Local Identity Evidence"
  - "Low-Confidence / Conflicting Findings"
  - "Special Classification Notes"
  - "Trusted Source Findings"
  - "Verdict"
  - "What it does"
---

# taskmanager/brain/processes/cmd--microsoft-corporation--sha256_14cc8ab1dcf0.md

> Markdown doc; headings AI Summary / cmd / Local Identity Evidence

## Key Signals

- Source path: taskmanager/brain/processes/cmd--microsoft-corporation--sha256_14cc8ab1dcf0.md
- Surface: source
- Classification: neutral
- Kind: markdown
- Language: markdown
- Top level: taskmanager
- Score: 14
- Tags: brain, docs, markdown, md, neutral, source
- Headings: AI Summary | cmd | Local Identity Evidence | Low-Confidence / Conflicting Findings | Special Classification Notes | Trusted Source Findings

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, docs, markdown, md, neutral, source, taskmanager
- Source link target: taskmanager/brain/processes/cmd--microsoft-corporation--sha256_14cc8ab1dcf0.md

## Excerpt

~~~markdown
---
identity_status: resolved_medium_confidence
identity_confidence: 96
source_confidence: 0
summary_confidence: 58
unresolved_reason: 
enrichment_attempts: 1
last_successful_enrichment: 2026-04-02T12:29:19.637Z
last_failed_enrichment: 
evidence_sources: 0
special_classifier: standard
evidence_fields_present: {"executable_path":true,"signing_status":true,"product_or_company":true,"file_version":true,"signer_name":true,"sha256":true}
---
# cmd

## AI Summary
Microsoftr Windowsr Operating System was identified with medium confidence from local executable evidence; classification=standard, trusted_source_level=none.

## What it does
This identity was resolved using local executable evidence first, then trusted external references when available. Query used: 14cc8ab1dcf0d9f19e8fb82deb547cf8c462c56a0e43f7addc02641ab3c81651 CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US Microsoftr Windowsr Operating System Cmd.Exe.MUI 10.0.26100.1 (WinBuild.160101.0800).

## Local Identity Evidence
- PID: 8088
- Parent PID: 12116
- Sample PIDs: 8652, 15316, 8088, 4528, 7140
- Image name: cmd
- Executable path: C:\WINDOWS\system32\cmd.exe
- Command line: cmd.exe /d /s /c "npm run dev -- --host 127.0.0.1 --port 5180 --strictPort"
~~~