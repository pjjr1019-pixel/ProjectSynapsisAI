# TOOL QUICK LOOKUP

Total tools: **140**

## repo
- `registry_search` — Search the tool index by query words.
- `list_source_files` — List source-like files in the repo.
- `list_test_files` — List test/spec files.
- `list_docs_files` — List markdown/text documentation files.
- `list_config_files` — List config-like files.
- `list_asset_files` — List asset-like files.
- `list_build_artifacts` — List build output and generated artifact files.
- `count_source_files` — Count source-like files.
- `count_test_files` — Count test/spec files.
- `repo_file_inventory` — Summarize files in the repo.
- `repo_extension_breakdown` — Count files by extension.
- `largest_source_files` — Show the largest source files.
- `newest_source_files` — Show most recently modified source files.
- `oldest_source_files` — Show oldest source files.
- `likely_entrypoints` — Find likely runnable entrypoint files.
- `likely_root_configs` — Find important config files near the repo root.
- `empty_files` — Find zero-byte or blank text files.
- `empty_directories` — Find empty directories.
- `duplicate_filenames` — Find repeated filenames across folders.
- `duplicate_file_content` — Find exact duplicate file contents by hash.
- `repo_tree_preview` — Generate a compact repo tree preview.
- `repo_size_summary` — Summarize repo size, files, and directories.
- `deep_folder_summary` — Summarize each top folder by file mix and size.
- `folder_role_guess` — Guess likely role of each top-level folder.
- `canonical_candidates` — Find files that look like canonical source-of-truth files.
- `generated_file_candidates` — Find files that appear to be generated.
- `minified_file_candidates` — Find files that look minified or bundled.
- `symlink_inventory` — List symlinks in the repo.
- `hidden_file_inventory` — List hidden files and folders.
- `stale_files` — Find files older than a threshold.

## code
- `extract_imports_js_ts` — Extract JS/TS ES module imports.
- `extract_exports_js_ts` — Extract JS/TS exports.
- `extract_requires_js` — Extract CommonJS require() calls.
- `extract_py_imports` — Extract Python import statements.
- `extract_functions_js_ts` — Extract JS/TS function names.
- `extract_functions_py` — Extract Python function names.
- `extract_classes_js_ts` — Extract JS/TS class names.
- `extract_classes_py` — Extract Python class names.
- `extract_todos` — Extract TODO lines from text files.
- `extract_fixmes` — Extract FIXME lines from text files.
- `extract_notes` — Extract NOTE lines from text files.
- `extract_comments_summary` — Summarize comment-heavy files.
- `file_symbol_summary` — Summarize symbols in a single file.
- `folder_symbol_summary` — Summarize symbols in files under a folder.
- `project_symbol_inventory` — Build a compact inventory of project symbols.
- `import_graph_js_ts` — Build a JS/TS local import graph.
- `import_graph_py` — Build a Python local import graph.
- `unresolved_local_imports_js_ts` — Find local JS/TS imports that do not resolve.
- `unresolved_local_imports_py` — Find likely unresolved Python local imports.
- `circular_import_hints_js_ts` — Find simple circular dependency hints in JS/TS graph.
- `orphan_module_candidates_js_ts` — Find JS/TS files with no inbound local imports.
- `orphan_module_candidates_py` — Find Python files with no inbound local imports.
- `unused_export_hints_js_ts` — Find exported JS/TS symbols with no obvious local references.
- `side_effect_file_candidates` — Find files that likely execute code on import.
- `risky_script_candidates` — Find code that deletes, kills, shells out, or force-writes.
- `hardcoded_path_candidates` — Find likely hardcoded absolute paths.
- `env_var_usage_scan` — Find environment variable access sites.
- `console_log_scan` — Find console logging statements.
- `debug_statement_scan_py` — Find pdb/breakpoint/debugger statements.
- `long_line_scan` — Find files with lines longer than a threshold.
- `very_large_file_scan` — Find very large text/source files.
- `mixed_language_folder_scan` — Find folders mixing many code languages.
- `duplicate_code_blocks` — Find repeated normalized code lines across files.
- `repeated_string_literals` — Find repeated string literals across code files.
- `json_schema_like_keys` — Find files with schema-ish key patterns.
- `route_file_candidates` — Find files that likely define routes/endpoints.
- `api_endpoint_string_scan` — Find HTTP path strings and URLs in source files.
- `cli_script_candidates` — Find files that look like CLI entrypoints.
- `test_file_targets` — Guess production files each test might target.
- `helper_utility_candidates` — Find files likely acting as utility/helper modules.
- `all_code_summary` — Summarize major code file types and symbols.

## text
- `keyword_search` — Search text files for a keyword.
- `regex_search` — Search text files with a regex.
- `phrase_frequency` — Count exact phrase occurrences.
- `top_words` — Show common words across text files.
- `top_identifiers` — Show common code-style identifiers.
- `heading_inventory_md` — Extract markdown headings.
- `markdown_link_inventory` — Extract links from markdown.
- `readme_inventory` — List README-like files and brief contents.
- `changelog_inventory` — List changelog/history files.
- `license_inventory` — List license-related files.
- `package_json_summary` — Summarize package.json files.
- `tsconfig_summary` — Summarize tsconfig files.
- `pyproject_summary` — Summarize pyproject.toml files.
- `env_example_summary` — Summarize .env.example-style files.
- `csv_file_summary` — Summarize CSV headers and row counts.
- `json_file_summary` — Summarize JSON object keys and shape hints.
- `yaml_file_summary` — Summarize YAML keys loosely.
- `line_count_summary` — Summarize line counts by file.
- `doc_comment_inventory` — Extract docblocks and doc comments.
- `markdown_todo_summary` — Summarize TODO items in markdown files.
- `text_file_preview` — Preview the first and last lines of a text file.

## context
- `generate_file_brief` — Create a compact brief for one file.
- `generate_folder_brief` — Create a compact brief for one folder.
- `generate_repo_brief` — Create a compact repo brief.
- `generate_context_pack` — Create a compact JSON context pack for the repo.
- `generate_low_token_pack` — Create a very small summary pack for weak coding AIs.
- `generate_tooling_manifest` — Create a manifest of scripts, configs, and tooling.
- `generate_entrypoint_pack` — Create a pack focused on entrypoints and boot flow.
- `generate_dependency_pack` — Create a compact dependency/context report.
- `generate_docs_pack` — Create a docs-focused context report.
- `generate_test_pack` — Create a test-focused context report.
- `generate_cleanup_candidates_report` — Report duplicates, empties, and generated files.
- `generate_portability_report` — Report portability blockers and external assumptions.
- `generate_script_registry_template` — Create a starter registry template for scripts.
- `generate_coder_handoff` — Create a handoff summary for another coding AI.
- `generate_runtime_surface_map` — Map likely runtime surfaces and services.
- `generate_feature_guess_map` — Guess major features by folder and file names.
- `generate_path_alias_report` — Summarize path aliases and import shortcuts.
- `generate_machine_context_index` — Create a machine-friendly index with compact facts.

## deps
- `package_name_inventory` — List package names from package.json files.
- `package_dependency_summary` — Summarize dependencies from package.json files.
- `package_dev_dependency_summary` — Summarize devDependencies from package.json files.
- `workspace_package_scan` — Find workspace/monorepo package.json files.
- `npm_script_inventory` — List npm scripts and where they appear.
- `ts_path_alias_inventory` — List paths/baseUrl aliases from tsconfig files.
- `python_requirements_inventory` — List Python dependency files and entries.
- `dockerfile_inventory` — List Dockerfiles and key base images.
- `ci_file_inventory` — List CI workflow files and quick hints.
- `env_file_inventory` — List .env-like files without exposing secrets.
- `gitignore_summary` — Summarize .gitignore patterns.
- `lockfile_inventory` — List lockfiles and package managers in use.
- `import_alias_candidates` — Find import alias syntax usage in source files.
- `version_string_inventory` — Find version-like strings in config files.
- `port_number_inventory` — Find likely port numbers in source/config files.

## git
- `git_status_summary` — Summarize git working tree status.
- `git_branch_summary` — Show current branch and upstream info.
- `git_recent_commit_summary` — Show recent commit headlines.
- `git_changed_files_summary` — Show changed files according to git.
- `git_untracked_files_summary` — Show untracked files according to git.

## quality
- `filename_case_breakdown` — Break down file naming styles.
- `suspicious_filename_scan` — Find odd, temporary, backup, or conflict filenames.
- `duplicate_basename_by_extension` — Find same basename with multiple extensions.
- `shallow_duplicate_folder_names` — Find repeated folder names across the tree.
- `folder_depth_stats` — Summarize folder depth and nesting.
- `file_age_buckets` — Bucket files by modified age.
- `line_length_percentiles` — Estimate line length percentiles across text files.
- `import_density_scan` — Find files with many imports.
- `comment_density_scan` — Find files with unusually high or low comment density.
- `test_gap_hints` — Find source folders with few visible tests.
