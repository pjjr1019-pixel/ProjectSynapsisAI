# Guarded Tool Pack v2 – Quick Lookup

Total tools: **114**

## Counts by category
- **cleanup**: 3
- **network**: 18
- **policy**: 11
- **processes**: 45
- **services**: 20
- **startup**: 10
- **system**: 7

## Counts by risk
- **critical**: 1
- **high**: 7
- **low**: 106

## High / critical tools
- `kill_process_by_pid` — Kill process by pid
- `kill_process_by_name` — Kill process by name
- `kill_process_tree_by_pid` — Kill process tree by pid
- `terminate_noncritical_by_query` — Terminate noncritical by query
- `start_service_by_name` — Start service by name
- `stop_service_by_name` — Stop service by name
- `restart_service_by_name` — Restart service by name
- `clear_temp_candidates` — Clear temp candidates

## Category index
### cleanup
- `clear_temp_candidates` — Clear temp candidates — risk: **high**
- `list_temp_candidates` — List temp candidates — risk: **low**
- `temp_candidates_older_than_days` — Temp candidates older than days — risk: **low**

### network
- `connection_count` — Connection count — risk: **low**
- `connections_established` — Established connections — risk: **low**
- `connections_time_wait` — TIME_WAIT connections — risk: **low**
- `find_connection_by_pid` — Find connection by pid — risk: **low**
- `find_connection_by_port` — Find connection by port — risk: **low**
- `find_connection_by_process` — Find connection by process — risk: **low**
- `list_listening_ports` — List listening ports — risk: **low**
- `list_tcp_connections` — List TCP connections — risk: **low**
- `list_udp_endpoints` — List UDP endpoints — risk: **low**
- `local_port_summary` — Local port summary — risk: **low**
- `network_csv_export` — Export network data to CSV — risk: **low**
- `network_json_export` — Export network data to JSON — risk: **low**
- `network_snapshot_compare` — Compare network snapshots — risk: **low**
- `network_snapshot_save` — Save network snapshot — risk: **low**
- `pid_connection_counts` — PID connection counts — risk: **low**
- `port_count` — Port count — risk: **low**
- `remote_address_summary` — Remote address summary — risk: **low**
- `suspicious_remote_ports` — Suspicious remote ports — risk: **low**

### policy
- `approval_requirements_report` — Approval requirements report — risk: **low**
- `critical_process_policy` — Critical process policy — risk: **low**
- `playbook_detail` — Playbook detail — risk: **low**
- `policy_export` — Policy export — risk: **low**
- `preflight_for_process_action` — Preflight for process action — risk: **low**
- `preflight_for_service_action` — Preflight for service action — risk: **low**
- `registry_search` — Registry search — risk: **low**
- `safe_mode_report` — Safe mode report — risk: **low**
- `tool_category_summary` — Tool category summary — risk: **low**
- `tool_detail` — Tool detail — risk: **low**
- `tool_risk_summary` — Tool risk summary — risk: **low**

### processes
- `background_process_candidates` — Background process candidates — risk: **low**
- `critical_process_matches` — Critical process matches — risk: **low**
- `duplicate_process_names` — Duplicate process names — risk: **low**
- `find_process_by_name` — Find process by name — risk: **low**
- `find_process_by_pid` — Find process by pid — risk: **low**
- `find_processes_by_query` — Find processes by query — risk: **low**
- `group_processes_by_name` — Group processes by name — risk: **low**
- `kill_process_by_name` — Kill process by name — risk: **high**
- `kill_process_by_pid` — Kill process by pid — risk: **high**
- `kill_process_tree_by_pid` — Kill process tree by pid — risk: **high**
- `list_processes` — List processes — risk: **low**
- `long_running_processes` — Long-running processes — risk: **low**
- `pid_name_pairs` — PID name pairs — risk: **low**
- `process_count` — Process count — risk: **low**
- `process_csv_export` — Export processes to CSV — risk: **low**
- `process_json_export` — Export processes to JSON — risk: **low**
- `process_name_frequency` — Process name frequency — risk: **low**
- `process_names` — Process names — risk: **low**
- `process_parent_pairs` — Parent-child pid pairs — risk: **low**
- `process_snapshot_compare` — Compare process snapshots — risk: **low**
- `process_snapshot_hash` — Process snapshot hash — risk: **low**
- `process_snapshot_save` — Save process snapshot — risk: **low**
- `process_stats_totals` — Process stats totals — risk: **low**
- `process_summary` — Process summary — risk: **low**
- `process_tree_guess` — Process tree guess — risk: **low**
- `processes_limit_preview` — Process limit preview — risk: **low**
- `processes_matching_allowlist` — Processes matching allowlist — risk: **low**
- `processes_matching_blocklist` — Processes matching blocklist — risk: **low**
- `processes_not_in_allowlist` — Processes not in allowlist — risk: **low**
- `processes_over_cpu_pct` — Processes over CPU threshold — risk: **low**
- `processes_over_memory_mb` — Processes over memory threshold — risk: **low**
- `processes_sorted_by_name` — Processes sorted by name — risk: **low**
- `processes_sorted_by_pid` — Processes sorted by pid — risk: **low**
- `processes_sorted_by_ppid` — Processes sorted by parent pid — risk: **low**
- `processes_with_many_handles` — Processes with many handles — risk: **low**
- `processes_with_many_threads` — Processes with many threads — risk: **low**
- `small_cpu_processes` — Small-CPU processes — risk: **low**
- `small_memory_processes` — Small-memory processes — risk: **low**
- `terminate_noncritical_by_query` — Terminate noncritical by query — risk: **critical**
- `top_cpu_processes` — Top CPU processes — risk: **low**
- `top_elapsed_processes` — Top elapsed-time processes — risk: **low**
- `top_handles_processes` — Top handle count processes — risk: **low**
- `top_memory_processes` — Top memory processes — risk: **low**
- `top_threads_processes` — Top thread count processes — risk: **low**
- `user_process_candidates` — User process candidates — risk: **low**

### services
- `auto_start_services` — Auto-start services — risk: **low**
- `disabled_services` — Disabled services — risk: **low**
- `find_service_by_name` — Find service by name — risk: **low**
- `find_service_by_query` — Find service by query — risk: **low**
- `list_services` — List services — risk: **low**
- `manual_start_services` — Manual-start services — risk: **low**
- `restart_service_by_name` — Restart service by name — risk: **high**
- `running_services` — Running services — risk: **low**
- `service_count` — Service count — risk: **low**
- `service_csv_export` — Export services to CSV — risk: **low**
- `service_json_export` — Export services to JSON — risk: **low**
- `service_names` — Service names — risk: **low**
- `service_start_type_summary` — Service start-type summary — risk: **low**
- `service_status_summary` — Service status summary — risk: **low**
- `services_matching_allowlist` — Services matching allowlist — risk: **low**
- `services_matching_blocklist` — Services matching blocklist — risk: **low**
- `services_not_in_allowlist` — Services not in allowlist — risk: **low**
- `start_service_by_name` — Start service by name — risk: **high**
- `stop_service_by_name` — Stop service by name — risk: **high**
- `stopped_services` — Stopped services — risk: **low**

### startup
- `find_startup_entry` — Find startup entry — risk: **low**
- `list_startup_entries` — List startup entries — risk: **low**
- `startup_by_user` — Startup by user — risk: **low**
- `startup_command_search` — Startup command search — risk: **low**
- `startup_csv_export` — Export startup entries to CSV — risk: **low**
- `startup_duplicates` — Startup duplicates — risk: **low**
- `startup_entry_count` — Startup entry count — risk: **low**
- `startup_json_export` — Export startup entries to JSON — risk: **low**
- `startup_locations` — Startup locations — risk: **low**
- `startup_name_summary` — Startup name summary — risk: **low**

### system
- `cpu_summary` — CPU summary — risk: **low**
- `hostname_info` — Hostname info — risk: **low**
- `memory_summary` — Memory summary — risk: **low**
- `os_info` — OS info — risk: **low**
- `system_summary` — System summary — risk: **low**
- `temp_directory_info` — Temp directory info — risk: **low**
- `uptime_info` — Uptime info — risk: **low**
