---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/processes/conhost--microsoft-corporation--sha256_804c132aa005.md"
source_name: "conhost--microsoft-corporation--sha256_804c132aa005.md"
top_level: "taskmanager"
surface: "source"
classification: "neutral"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 14
selected_rank: 4380
content_hash: "78dc12d818b52bd033544706c597504118793049e024a74ae863f3d918885b0e"
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
  - "conhost"
  - "Local Identity Evidence"
  - "Low-Confidence / Conflicting Findings"
  - "Special Classification Notes"
  - "Trusted Source Findings"
  - "Verdict"
  - "What it does"
---

# taskmanager/brain/processes/conhost--microsoft-corporation--sha256_804c132aa005.md

> Markdown doc; headings AI Summary / conhost / Local Identity Evidence

## Key Signals

- Source path: taskmanager/brain/processes/conhost--microsoft-corporation--sha256_804c132aa005.md
- Surface: source
- Classification: neutral
- Kind: markdown
- Language: markdown
- Top level: taskmanager
- Score: 14
- Tags: brain, docs, markdown, md, neutral, source
- Headings: AI Summary | conhost | Local Identity Evidence | Low-Confidence / Conflicting Findings | Special Classification Notes | Trusted Source Findings

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, docs, markdown, md, neutral, source, taskmanager
- Source link target: taskmanager/brain/processes/conhost--microsoft-corporation--sha256_804c132aa005.md

## Excerpt

~~~markdown
---
identity_status: resolved_medium_confidence
identity_confidence: 96
source_confidence: 0
summary_confidence: 58
unresolved_reason: 
enrichment_attempts: 1
last_successful_enrichment: 2026-04-02T12:56:02.220Z
last_failed_enrichment: 
evidence_sources: 0
special_classifier: windows_host_process
evidence_fields_present: {"executable_path":true,"signing_status":true,"product_or_company":true,"file_version":true,"signer_name":true,"sha256":true}
---
# conhost

## AI Summary
Microsoftr Windowsr Operating System was identified with medium confidence from local executable evidence; classification=windows_host_process, trusted_source_level=none.

## What it does
This identity was resolved using local executable evidence first, then trusted external references when available. Query used: 804c132aa005c2e90649ad2a9e5bc274b0cdfe07a45a17a6367f6d4ff85a64c7 CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US Microsoftr Windowsr Operating System CONHOST.EXE.MUI 10.0.26100.1 (WinBuild.160101.0800).

## Local Identity Evidence
- PID: 3252
- Parent PID: 18756
- Sample PIDs: 9328, 9152, 9768, 18304, 17524, 15984, 3252, 1388, 1216, 3684, 6468, 6300, 5344
- Image name: conhost
- Executable path: C:\WINDOWS\system32\conhost.exe
- Command line: \??\C:\WINDOWS\system32\conhost.exe 0x4
~~~