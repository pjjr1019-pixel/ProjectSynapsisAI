---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/processes/dllhost--microsoft-corporation--sha256_d2e60fde36ca.md"
source_name: "dllhost--microsoft-corporation--sha256_d2e60fde36ca.md"
top_level: "taskmanager"
surface: "source"
classification: "neutral"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 14
selected_rank: 4385
content_hash: "a87bd99f8711a638cf3496194a66e487796693bd9ff96972a95e4c15f10cba9e"
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

# taskmanager/brain/processes/dllhost--microsoft-corporation--sha256_d2e60fde36ca.md

> Markdown doc; headings AI Summary / Local Identity Evidence / Low-Confidence / Conflicting Findings

## Key Signals

- Source path: taskmanager/brain/processes/dllhost--microsoft-corporation--sha256_d2e60fde36ca.md
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
- Source link target: taskmanager/brain/processes/dllhost--microsoft-corporation--sha256_d2e60fde36ca.md

## Excerpt

~~~markdown
---
identity_status: resolved_high_confidence
identity_confidence: 96
source_confidence: 55
summary_confidence: 80
unresolved_reason: 
enrichment_attempts: 1
last_successful_enrichment: 2026-04-02T07:54:23.847Z
last_failed_enrichment: 
evidence_sources: 5
special_classifier: windows_host_process
evidence_fields_present: {"executable_path":true,"signing_status":true,"product_or_company":true,"file_version":true,"signer_name":true,"sha256":true}
---
# Microsoftr Windowsr Operating System

## AI Summary
Microsoftr Windowsr Operating System was identified with high confidence from local executable evidence; classification=windows_host_process, trusted_source_level=high.

## What it does
This identity was resolved using local executable evidence first, then trusted external references when available. Query used: d2e60fde36ca48bc468b65a2b5a27d374bbe5023f20a4166ed755696e9ae00af CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US Microsoftr Windowsr Operating System dllhost.exe 10.0.26100.7705 (WinBuild.160101.0800).

## Local Identity Evidence
- PID: 15196
- Parent PID: 1428
- Sample PIDs: 15196
- Image name: dllhost
- Executable path: C:\WINDOWS\SysWOW64\DllHost.exe
- Command line: "C:\WINDOWS\SysWOW64\DllHost.exe" /Processid:{1C6DF0C0-192A-4451-BE36-6A59A86A692E}
~~~