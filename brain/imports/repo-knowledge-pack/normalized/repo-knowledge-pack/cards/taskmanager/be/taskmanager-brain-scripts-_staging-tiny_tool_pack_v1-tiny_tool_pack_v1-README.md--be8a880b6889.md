---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/_staging/tiny_tool_pack_v1/tiny_tool_pack_v1/README.md"
source_name: "README.md"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 122
selected_rank: 24
content_hash: "a70b3af0307abfdb2d074246427ef3404c3a1732be36f5a15aedf81630d933a2"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "docs"
  - "markdown"
  - "md"
  - "neutral"
  - "scripts"
headings:
  - "Categories"
  - "Design notes"
  - "Quick examples"
  - "Registry fields"
  - "Suggested AI usage pattern"
  - "Tiny Tool Pack v1"
  - "What is included"
---

# taskmanager/brain/scripts/_staging/tiny_tool_pack_v1/tiny_tool_pack_v1/README.md

> Script surface; headings Categories / Design notes / Quick examples

## Key Signals

- Source path: taskmanager/brain/scripts/_staging/tiny_tool_pack_v1/tiny_tool_pack_v1/README.md
- Surface: brain-scripts
- Classification: neutral
- Kind: markdown
- Language: markdown
- Top level: taskmanager
- Score: 122
- Tags: brain, brain-scripts, docs, markdown, md, neutral, scripts
- Headings: Categories | Design notes | Quick examples | Registry fields | Suggested AI usage pattern | Tiny Tool Pack v1

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, docs, markdown, md, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/_staging/tiny_tool_pack_v1/tiny_tool_pack_v1/README.md

## Excerpt

~~~markdown
# Tiny Tool Pack v1

This starter pack contains **128 tiny Node.js scripts** plus a machine-readable registry so a lower-level orchestrator can find tools quickly instead of reading raw code.

## What is included

- `scripts/` — 128 tiny wrappers, one tool per file
- `shared/core.js` — shared runner and operation handlers
- `registry/tools_index.json` — full tool index with metadata
- `registry/tool_aliases.json` — alias map for rough intent matching
- `registry/tool_categories.json` — category to tool IDs
- `registry/playbooks.json` — starter multi-step flows
- `run-tool.js` — run any tool by ID

## Quick examples

```bash
node run-tool.js registry_search --query "count lines"
node run-tool.js list_files --path . --recursive true
node run-tool.js extension_heatmap --path .
node run-tool.js count_lines --path README.md
node run-tool.js json_file_summary --path package.json
node run-tool.js csv_sample_rows --path data.csv --limit 5
node run-tool.js create_backup_copy --path notes.txt --dry_run true
```

You can also run the direct wrapper:
~~~