# Tool Quick Lookup

Use `node run-tool.js registry_search --query "your phrase"` first.

## files
- `list_files` — List files in a directory.
- `list_directories` — List subdirectories in a directory.
- `count_files` — Count files in a directory.
- `count_directories` — Count subdirectories in a directory.
- `tree_preview` — Show a compact tree preview of a directory.
- `largest_files` — List the largest files in a directory.
- `newest_files` — List the newest modified files in a directory.
- `oldest_files` — List the oldest modified files in a directory.
- `files_by_extension` — List files with a specific extension.
- `extension_breakdown` — Count files by extension in a directory.
- `empty_directories` — Find empty directories.
- `zero_byte_files` — Find zero-byte files.
- `duplicate_filenames` — Find duplicate basenames across a directory.
- `path_exists` — Check whether a path exists and what type it is.
- `file_sizes` — List files and their sizes.
- `recent_files` — List files modified within the last N days.
- `hidden_files` — Find dotfiles and hidden-looking files.
- `long_paths` — Find paths longer than a threshold.
- `shallow_inventory` — Summarize only the top level of a directory.
- `file_name_search` — Find files whose names include a search string.

## paths
- `path_parts` — Break a path into useful parts.
- `normalize_path` — Normalize a path string.
- `relative_path` — Compute a relative path from one path to another.
- `absolute_path` — Resolve a path to an absolute path.
- `common_path_prefix` — Find the common directory prefix across paths.
- `path_depth` — Measure the depth of a path.
- `parent_path` — Get the parent directory of a path.
- `path_compare` — Compare two paths after normalization.
- `join_paths` — Join path segments into one path.
- `sanitize_filename` — Make a string safer to use as a filename.
- `file_extension` — Return extension details for a path.
- `basename_dirname` — Return basename and dirname for a path.

## text
- `count_lines` — Count lines in a text file.
- `count_words` — Count words in a text file.
- `count_chars` — Count characters in a text file.
- `count_blank_lines` — Count blank lines in a text file.
- `count_comment_lines` — Count common comment lines in a code or text file.
- `extract_todos` — Extract lines containing TODO.
- `extract_fixmes` — Extract lines containing FIXME.
- `extract_headings` — Extract markdown or plain headings.
- `extract_markdown_links` — Extract markdown links from a file.
- `extract_urls` — Extract URLs from a text file.
- `extract_emails` — Extract email-like strings from a text file.
- `extract_numbers` — Extract numbers from a text file.
- `top_words` — Return the most common words in a text file.
- `unique_words` — Return unique word counts and a sample.
- `longest_lines` — Show the longest lines in a file.
- `line_length_stats` — Compute line length statistics for a file.
- `first_n_lines` — Show the first N lines in a file.
- `last_n_lines` — Show the last N lines in a file.
- `grep_literal` — Find lines containing an exact literal substring.
- `grep_regex` — Find lines matching a regex pattern.
- `extract_import_lines` — Extract lines that look like import/include statements.
- `extract_export_lines` — Extract lines that look like export statements.
- `extract_function_names` — Extract common function names from code-like text.
- `extract_class_names` — Extract common class names from code-like text.
- `extract_env_keys` — Extract .env-style variable keys from a text file.
- `extract_json_like_keys` — Extract JSON-like keys from plain text.

## repo
- `package_json_files` — Find package.json files in a directory tree.
- `tsconfig_files` — Find tsconfig files.
- `pyproject_files` — Find pyproject.toml files.
- `requirements_files` — Find Python requirements files.
- `docker_files` — Find Docker-related files.
- `readme_files` — Find README-style files.
- `test_file_candidates` — Find likely test files.
- `source_file_candidates` — Find common source files.
- `entrypoint_candidates` — Find likely application entrypoints.
- `extension_heatmap` — Count files by extension for repo-like trees.
- `folder_file_counts` — Count files per directory.
- `folder_size_estimate` — Estimate total bytes per top-level folder.
- `import_summary_js` — Summarize JS/TS import usage under a folder.
- `import_summary_py` — Summarize Python import usage under a folder.
- `dependency_mentions` — Find common dependency names mentioned across text files.
- `package_json_scripts` — Extract scripts sections from package.json files.
- `env_example_files` — Find environment example files.
- `config_file_candidates` — Find likely config files.
- `route_file_candidates` — Find likely route or router files.
- `service_file_candidates` — Find likely service files.
- `component_file_candidates` — Find likely UI component files.
- `duplicate_basename_report` — Find duplicate basenames in a repo tree.

## json
- `json_keys_top_level` — List top-level keys of a JSON file.
- `json_key_paths` — List nested JSON key paths.
- `json_value_types` — Summarize top-level JSON value types.
- `json_array_lengths` — List JSON arrays and their lengths.
- `json_schema_guess` — Produce a lightweight schema guess for JSON.
- `json_pretty_print` — Pretty-print JSON to stdout or a file.
- `json_minify` — Minify JSON to stdout or a file.
- `json_sort_keys` — Sort JSON object keys.
- `json_key_search` — Find JSON key paths matching a search string.
- `json_value_search` — Find JSON values matching a literal string.
- `json_file_summary` — Create a compact summary of a JSON file.
- `json_numeric_fields` — List JSON key paths that contain numeric values.
- `json_boolean_fields` — List JSON key paths that contain boolean values.
- `json_null_fields` — List JSON key paths with null values.
- `json_string_length_stats` — Compute string length stats inside JSON.
- `json_object_count` — Count nested objects and arrays in JSON.

## csv
- `csv_header` — Read the header row of a CSV file.
- `csv_row_count` — Count data rows in a CSV file.
- `csv_column_count` — Count columns in a CSV file.
- `csv_column_names` — List CSV column names.
- `csv_sample_rows` — Show a sample of CSV rows.
- `csv_null_like_counts` — Count null-like cells per column.
- `csv_unique_count_for_column` — Count unique values for a selected CSV column.
- `csv_numeric_columns` — Guess which CSV columns are mostly numeric.

## safe_write
- `create_backup_copy` — Create a backup copy of a file.
- `write_text_file` — Write text content to a file.
- `append_text_file` — Append text content to a file.
- `prepend_text_file` — Prepend text content to a file.
- `replace_literal_in_file` — Replace a literal substring in a file.
- `normalize_line_endings` — Normalize line endings to LF or CRLF.
- `trim_trailing_whitespace` — Trim trailing whitespace from each line.
- `ensure_final_newline` — Ensure a file ends with a newline.
- `sort_lines` — Sort lines in a text file.
- `dedupe_lines` — Remove duplicate lines while preserving first occurrence order.
- `split_file_by_lines` — Split a text file into chunks by line count.
- `merge_text_files` — Merge text files into one output file.

## system
- `cwd_info` — Return current working directory information.
- `env_var_names` — List environment variable names.
- `node_runtime_info` — Return Node runtime and platform info.
- `disk_usage_estimate` — Estimate total bytes under a directory.
- `folder_snapshot` — Create a JSON snapshot of file metadata in a folder.
- `compare_folder_snapshots` — Compare two folder snapshot JSON files.
- `timestamp_now` — Return current timestamp values.
- `hash_file_sha256` — Compute SHA256 hash of a file.
- `hash_text_sha256` — Compute SHA256 hash of a string.
- `file_mtime_info` — Return modification time details for a file.
- `permission_probe_readonly` — Probe basic read/write access on a path without changing it.
- `registry_search` — Search the tool index by keyword, tag, or alias.
