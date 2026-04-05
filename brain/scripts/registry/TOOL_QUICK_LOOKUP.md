# Tool Quick Lookup

Use `run-tool.js` for discovery and execution. Search the registry first, then run the tool by id.

## Fast Commands

- `node run-tool.js list_tools`
- `node run-tool.js registry_search --query "top memory"`
- `node run-tool.js top_memory_processes --limit 15`
- `node run-tool.js kill_process_by_pid --pid 1234 --approve true --dry_run false`

## Common Aliases

- show top ram apps -> top_memory_processes
- what is using cpu -> top_cpu_processes
- show startup apps -> list_startup_entries
- kill process 1234 -> kill_process_by_pid
- show listening ports -> list_listening_ports
- show running processes -> list_running_processes
- show process tree -> process_tree_by_pid
- show process command line -> process_command_line
- show process details -> process_details_by_pid
- show services -> running_services
- show stopped services -> stopped_services
- show auto start services -> auto_start_services
- show scheduled tasks -> scheduled_tasks_summary
- show network connections -> list_established_connections
- show network diagnostics -> local_network_diagnostics_summary
- show temp cleanup candidates -> temp_cleanup_candidates
- show diagnostics report -> generate_diagnostics_report
- show readiness report -> generate_machine_readiness_report
- show protected processes -> protected_processes
- show protected services -> protected_services

## Categories

### cleanup (6)
- temp_cleanup_candidates: Temp cleanup candidates
- stale_log_candidates: Stale log candidates
- generate_diagnostics_report: Generate diagnostics report
- generate_machine_readiness_report: Generate machine readiness report
- generate_process_health_snapshot: Generate process health snapshot
- before_after_optimization_snapshot: Before/after optimization snapshot

### network (5)
- list_listening_ports: List listening ports
- list_established_connections: List established connections
- process_port_mapping: Process-port mapping
- basic_network_activity_summary: Basic network activity summary
- local_network_diagnostics_summary: Local network diagnostics summary

### policy (4)
- protected_processes: Protected processes
- protected_services: Protected services
- process_action_policy: Process action policy
- service_action_policy: Service action policy

### process (17)
- list_running_processes: List running processes
- top_cpu_processes: Top CPU processes
- top_memory_processes: Top memory processes
- process_details_by_pid: Process details by PID
- process_details_by_name: Process details by name
- process_tree_by_pid: Process tree by PID
- process_executable_path: Process executable path
- process_command_line: Process command line
- process_count: Process count
- duplicate_process_names: Duplicate process names
- long_running_processes: Long-running processes
- likely_idle_heavy_processes: Likely idle heavy processes
- process_risk_classification: Process risk classification
- dry_run_kill_process_by_pid: Dry-run kill process by PID
- kill_process_by_pid: Kill process by PID
- dry_run_kill_process_by_name: Dry-run kill process by name
- kill_process_by_name: Kill process by name

### services (9)
- running_services: Running services
- stopped_services: Stopped services
- service_details_by_name: Service details by name
- auto_start_services: Auto-start services
- non_microsoft_services: Non-Microsoft services
- service_control_preview: Service control preview
- start_service_by_name: Start service by name
- stop_service_by_name: Stop service by name
- restart_service_by_name: Restart service by name

### startup (6)
- list_startup_entries: List startup entries
- startup_folder_items: Startup folder items
- registry_startup_items: Registry startup items
- scheduled_tasks_summary: Scheduled tasks summary
- suspicious_startup_candidates: Suspicious startup candidates
- duplicate_startup_candidates: Duplicate startup candidates

### system (8)
- cpu_summary: CPU summary
- memory_summary: Memory summary
- disk_usage_summary: Disk usage summary
- uptime_summary: Uptime summary
- machine_summary: Machine summary
- os_version_summary: OS version summary
- live_counter_snapshot: Live counter snapshot
- threshold_warning_report: Threshold warning report

