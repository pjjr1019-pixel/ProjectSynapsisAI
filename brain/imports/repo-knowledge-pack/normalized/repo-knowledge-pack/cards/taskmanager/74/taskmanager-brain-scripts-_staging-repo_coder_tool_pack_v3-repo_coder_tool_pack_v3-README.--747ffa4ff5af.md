---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/_staging/repo_coder_tool_pack_v3/repo_coder_tool_pack_v3/README.md"
source_name: "README.md"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 124
selected_rank: 11
content_hash: "3bdb5fc50f64919c074f03482f28c959d71f2d607435b6aadb0f5b3e535041e4"
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
  - "Design"
  - "Example commands"
  - "Fast-start files"
  - "Repo / Coder-AI Tool Pack v3"
---

# taskmanager/brain/scripts/_staging/repo_coder_tool_pack_v3/repo_coder_tool_pack_v3/README.md

> Script surface; headings Categories / Design / Example commands

## Key Signals

- Source path: taskmanager/brain/scripts/_staging/repo_coder_tool_pack_v3/repo_coder_tool_pack_v3/README.md
- Surface: brain-scripts
- Classification: neutral
- Kind: markdown
- Language: markdown
- Top level: taskmanager
- Score: 124
- Tags: brain, brain-scripts, docs, markdown, md, neutral, scripts
- Headings: Categories | Design | Example commands | Fast-start files | Repo / Coder-AI Tool Pack v3

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, docs, markdown, md, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/_staging/repo_coder_tool_pack_v3/repo_coder_tool_pack_v3/README.md

## Excerpt

~~~markdown
# Repo / Coder-AI Tool Pack v3

This pack contains **140 tiny Node.js tools** aimed at helping a weaker orchestrator or coder AI map, summarize, and reason about a codebase without wasting tokens.

## Fast-start files
- `registry/tools_index.json`
- `registry/tool_aliases.json`
- `registry/playbooks.json`
- `registry/TOOL_QUICK_LOOKUP.md`
- `run-tool.js`

## Example commands

```bash
node run-tool.js registry_search --query "entrypoint"
node run-tool.js generate_low_token_pack --path .
node run-tool.js generate_context_pack --path . --output context-pack.json
node run-tool.js likely_entrypoints --path .
node run-tool.js repo_extension_breakdown --path .
node run-tool.js import_graph_js_ts --path .
node run-tool.js package_dependency_summary --path .
node run-tool.js generate_cleanup_candidates_report --path .
node run-tool.js generate_coder_handoff --path .
```

## Categories
- repo
- code
~~~