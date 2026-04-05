### Candidate: brain/scripts/_staging/repo_coder_tool_pack_v3/
- **Why Dead**: Staged tool pack, only referenced via the external tool bridge in core/runtime.js for optional diagnostics (registry_search, likely_entrypoints, generate_low_token_pack). Not required by any core code, config, or test. No direct imports or runtime dependencies.
- **Verification**: Searched all code, configs, and docs for imports, requires, dynamic loads, and references. Only found as an optional external bridge, not as a core dependency. No live code or test depends on it for baseline operation.
- **Action**: Removed entire directory (loss of optional diagnostics only).
### Candidate: brain/scripts/_staging/guarded_tool_pack_v2/
- **Why Dead**: Staged tool pack, only referenced via the external tool bridge in core/runtime.js for optional diagnostics (list_processes, list_listening_ports, list_services). Not required by any core code, config, or test. No direct imports or runtime dependencies.
- **Verification**: Searched all code, configs, and docs for imports, requires, dynamic loads, and references. Only found as an optional external bridge, not as a core dependency. No live code or test depends on it for baseline operation.
- **Action**: Removed entire directory (loss of optional diagnostics only).
# CLEANUP_AUDIT.md

This file tracks all dead file and dead code candidates, with proof and action taken.

## Format
- **Candidate**: [file or code block]
- **Why Dead**: [reason]
- **Verification**: [how it was checked]
- **Action**: [removed/kept, with reason]

---

## Audit Log

*Repo-wide inventory and initial dead code search in progress...*

---

### Candidate: brain/scripts/_staging/tiny_tool_pack_v1/
- **Why Dead**: Staged tool pack, not referenced by any active runtime, repo-tools, core, config, or test code. Only mentioned in integration scripts and documentation as an optional, isolated import for review. Explicitly excluded from product commit boundaries and not required for any workflow.
- **Verification**: Searched all code, configs, and docs for imports, requires, dynamic loads, and references. Only found in integration scripts and boundary docs as a staged/optional pack. No live code or test depends on it.
- **Action**: Removed entire directory.
