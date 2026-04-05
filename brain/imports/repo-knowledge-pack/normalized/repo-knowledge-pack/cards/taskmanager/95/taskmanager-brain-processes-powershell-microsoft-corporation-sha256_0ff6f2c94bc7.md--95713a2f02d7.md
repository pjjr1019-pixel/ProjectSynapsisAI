---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/processes/powershell--microsoft-corporation--sha256_0ff6f2c94bc7.md"
source_name: "powershell--microsoft-corporation--sha256_0ff6f2c94bc7.md"
top_level: "taskmanager"
surface: "source"
classification: "neutral"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 14
selected_rank: 4403
content_hash: "fb355cfaa029cd5a2d1f282dc1b2c13d4a02fb8b43f85972c01bc1ccbeccbd56"
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
  - "powershell"
  - "Special Classification Notes"
  - "Trusted Source Findings"
  - "Verdict"
  - "What it does"
---

# taskmanager/brain/processes/powershell--microsoft-corporation--sha256_0ff6f2c94bc7.md

> Markdown doc; headings AI Summary / Local Identity Evidence / Low-Confidence / Conflicting Findings

## Key Signals

- Source path: taskmanager/brain/processes/powershell--microsoft-corporation--sha256_0ff6f2c94bc7.md
- Surface: source
- Classification: neutral
- Kind: markdown
- Language: markdown
- Top level: taskmanager
- Score: 14
- Tags: brain, docs, markdown, md, neutral, source
- Headings: AI Summary | Local Identity Evidence | Low-Confidence / Conflicting Findings | powershell | Special Classification Notes | Trusted Source Findings

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, docs, markdown, md, neutral, source, taskmanager
- Source link target: taskmanager/brain/processes/powershell--microsoft-corporation--sha256_0ff6f2c94bc7.md

## Excerpt

~~~markdown
---
identity_status: resolved_medium_confidence
identity_confidence: 96
source_confidence: 0
summary_confidence: 58
unresolved_reason: 
enrichment_attempts: 1
last_successful_enrichment: 2026-04-02T05:36:11.034Z
last_failed_enrichment: 
evidence_sources: 0
special_classifier: standard
evidence_fields_present: {"executable_path":true,"signing_status":true,"product_or_company":true,"file_version":true,"signer_name":true,"sha256":true}
---
# powershell

## AI Summary
Microsoftr Windowsr Operating System was identified with medium confidence from local executable evidence; classification=standard, trusted_source_level=none.

## What it does
This identity was resolved using local executable evidence first, then trusted external references when available. Query used: 0ff6f2c94bc7e2833a5f7e16de1622e5dba70396f31c7d5f56381870317e8c46 CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US Microsoftr Windowsr Operating System PowerShell.EXE.MUI 10.0.26100.5074 (WinBuild.160101.0800).

## Local Identity Evidence
- PID: 13152
- Parent PID: 15120
- Sample PIDs: 18948, 18988, 17140, 17600, 19304, 19884, 19056, 19128, 12244, 13152, 10456, 11676, 16048, 16416, 14832, 14992
- Image name: powershell
- Executable path: C:\WINDOWS\System32\WindowsPowerShell\v1.0\powershell.exe
- CPU snapshot: 0.0%
~~~