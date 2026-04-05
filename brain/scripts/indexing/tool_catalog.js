const CATEGORY_DEFAULTS = {
  process: {
    tags: ["process", "task-manager", "windows"],
    risk_level: "low",
    requires_confirmation: false,
    supports_dry_run: false,
    estimated_runtime: "low",
    platform: ["windows"],
    dependencies: ["node", "powershell"],
    side_effects: [],
    success_criteria: ["Tool returned structured output."],
    failure_modes: ["Windows process query unavailable.", "Permission denied.", "Target not found."],
  },
  system: {
    tags: ["system", "health", "windows"],
    risk_level: "low",
    requires_confirmation: false,
    supports_dry_run: false,
    estimated_runtime: "low",
    platform: ["windows"],
    dependencies: ["node", "powershell"],
    side_effects: [],
    success_criteria: ["Tool returned structured output."],
    failure_modes: ["Windows performance counters unavailable.", "Permission denied."],
  },
  services: {
    tags: ["service", "windows", "control"],
    risk_level: "low",
    requires_confirmation: false,
    supports_dry_run: true,
    estimated_runtime: "low",
    platform: ["windows"],
    dependencies: ["node", "powershell", "sc.exe"],
    side_effects: [],
    success_criteria: ["Tool returned structured output."],
    failure_modes: ["Service control unavailable.", "Permission denied.", "Service not found."],
  },
  startup: {
    tags: ["startup", "task-manager", "windows"],
    risk_level: "low",
    requires_confirmation: false,
    supports_dry_run: false,
    estimated_runtime: "low",
    platform: ["windows"],
    dependencies: ["node", "powershell", "schtasks"],
    side_effects: [],
    success_criteria: ["Tool returned structured output."],
    failure_modes: ["Startup query unavailable.", "Permission denied."],
  },
  network: {
    tags: ["network", "ports", "connections"],
    risk_level: "low",
    requires_confirmation: false,
    supports_dry_run: false,
    estimated_runtime: "low",
    platform: ["windows"],
    dependencies: ["node", "powershell", "netstat"],
    side_effects: [],
    success_criteria: ["Tool returned structured output."],
    failure_modes: ["Network inspection unavailable.", "Permission denied."],
  },
  cleanup: {
    tags: ["cleanup", "diagnostics", "windows"],
    risk_level: "low",
    requires_confirmation: false,
    supports_dry_run: false,
    estimated_runtime: "low",
    platform: ["windows"],
    dependencies: ["node", "powershell"],
    side_effects: [],
    success_criteria: ["Tool returned structured output."],
    failure_modes: ["File system inspection unavailable.", "Permission denied."],
  },
  policy: {
    tags: ["policy", "safety", "guardrails"],
    risk_level: "low",
    requires_confirmation: false,
    supports_dry_run: false,
    estimated_runtime: "low",
    platform: ["windows"],
    dependencies: ["node"],
    side_effects: [],
    success_criteria: ["Tool returned structured output."],
    failure_modes: ["Policy metadata unavailable."],
  },
  external: {
    tags: ["external", "integration", "staging"],
    risk_level: "low",
    requires_confirmation: false,
    supports_dry_run: false,
    estimated_runtime: "low",
    platform: ["windows"],
    dependencies: ["node"],
    side_effects: [],
    success_criteria: ["External staged runner returned structured output."],
    failure_modes: ["External staged runner unavailable.", "External tool failed."],
  },
};

const SHARED_INPUTS = {
  limit: { type: "number", default: 25 },
  query: { type: "string", default: "" },
  pid: { type: "number", default: null },
  name: { type: "string", default: "" },
  dry_run: { type: "boolean", default: true },
  approve: { type: "boolean", default: false },
  sort_by: { type: "string", default: "" },
  sort_dir: { type: "string", default: "desc" },
  min_age_minutes: { type: "number", default: 10 },
  min_memory_mb: { type: "number", default: 0 },
  min_cpu_pct: { type: "number", default: 0 },
  max_cpu_pct: { type: "number", default: 100 },
};

const SHARED_OUTPUTS = {
  items: "array",
  summary: "string",
  warnings: "array",
  errors: "array",
  meta: "object",
};

function titleCaseFromId(id) {
  return String(id)
    .split("_")
    .map((part) => part ? part[0].toUpperCase() + part.slice(1) : part)
    .join(" ");
}

function makeTool(category, id, title, description, options = {}) {
  const defaults = CATEGORY_DEFAULTS[category] || {};
  const riskLevel = options.risk_level || defaults.risk_level || "low";
  const supportsDryRun = options.supports_dry_run ?? defaults.supports_dry_run ?? false;
  const requiresConfirmation = options.requires_confirmation ?? (riskLevel === "high" || riskLevel === "critical");
  return {
    id,
    title: title || titleCaseFromId(id),
    description: description || `${titleCaseFromId(id)} tool.`,
    category,
    tags: options.tags || defaults.tags || [category],
    intent_examples: options.intent_examples || [titleCaseFromId(id).toLowerCase()],
    avoid_if: options.avoid_if || (requiresConfirmation ? ["You do not have explicit approval for a mutation."] : []),
    inputs: options.inputs || SHARED_INPUTS,
    outputs: options.outputs || SHARED_OUTPUTS,
    side_effects: options.side_effects || defaults.side_effects || [],
    risk_level: riskLevel,
    requires_confirmation: requiresConfirmation,
    supports_dry_run: supportsDryRun,
    estimated_runtime: options.estimated_runtime || defaults.estimated_runtime || "low",
    platform: options.platform || defaults.platform || ["windows"],
    dependencies: options.dependencies || defaults.dependencies || ["node"],
    success_criteria: options.success_criteria || defaults.success_criteria || ["Tool returned structured output."],
    failure_modes: options.failure_modes || defaults.failure_modes || [],
    entrypoint: options.entrypoint || `${category}/${id}.js`,
    status: options.status || "ready",
    handler: options.handler || id,
  };
}

const PROCESS_TOOLS = [
  ["list_running_processes", "List running processes", "Collect normalized process rows with CPU, memory, PID, parent PID, and command metadata.", { inputs: { limit: { type: "number", default: 25 }, query: { type: "string", default: "" }, sort_by: { type: "string", default: "memory_mb" }, sort_dir: { type: "string", default: "desc" } } }],
  ["top_cpu_processes", "Top CPU processes", "Rank processes by CPU usage.", { inputs: { limit: { type: "number", default: 15 } } }],
  ["top_memory_processes", "Top memory processes", "Rank processes by working set memory.", { inputs: { limit: { type: "number", default: 15 } } }],
  ["process_details_by_pid", "Process details by PID", "Return merged process details for one PID.", { inputs: { pid: { type: "number", default: null } } }],
  ["process_details_by_name", "Process details by name", "Return merged process details for one exact process name.", { inputs: { name: { type: "string", default: "" } } }],
  ["process_tree_by_pid", "Process tree by PID", "Build a parent-child tree around one PID.", { inputs: { pid: { type: "number", default: null } } }],
  ["process_executable_path", "Process executable path", "Return the executable path for matching processes.", { inputs: { pid: { type: "number", default: null }, name: { type: "string", default: "" } } }],
  ["process_command_line", "Process command line", "Return command-line text when available.", { inputs: { pid: { type: "number", default: null }, name: { type: "string", default: "" } } }],
  ["process_count", "Process count", "Count running processes after filters are applied.", { inputs: { query: { type: "string", default: "" } } }],
  ["duplicate_process_names", "Duplicate process names", "Detect process names that appear more than once.", {}],
  ["long_running_processes", "Long-running processes", "Find processes that have been alive for a long time.", { inputs: { min_age_minutes: { type: "number", default: 30 } } }],
  ["likely_idle_heavy_processes", "Likely idle heavy processes", "Flag processes with high memory use and low CPU.", { inputs: { min_memory_mb: { type: "number", default: 250 }, max_cpu_pct: { type: "number", default: 1.5 } } }],
  ["process_risk_classification", "Process risk classification", "Classify candidate processes using protected and helper heuristics.", { inputs: { pid: { type: "number", default: null }, name: { type: "string", default: "" } } }],
  ["dry_run_kill_process_by_pid", "Dry-run kill process by PID", "Preview what would be killed for a PID.", { risk_level: "low", supports_dry_run: false, inputs: { pid: { type: "number", default: null } } }],
  ["kill_process_by_pid", "Kill process by PID", "Terminate a process by PID using a guarded action.", { risk_level: "high", supports_dry_run: true, inputs: { pid: { type: "number", default: null }, dry_run: { type: "boolean", default: true }, approve: { type: "boolean", default: false } }, dependencies: ["node", "powershell", "taskkill"] }],
  ["dry_run_kill_process_by_name", "Dry-run kill process by name", "Preview what would be killed for an exact process name.", { risk_level: "low", supports_dry_run: false, inputs: { name: { type: "string", default: "" } } }],
  ["kill_process_by_name", "Kill process by name", "Terminate processes by exact image name using a guarded action.", { risk_level: "high", supports_dry_run: true, inputs: { name: { type: "string", default: "" }, dry_run: { type: "boolean", default: true }, approve: { type: "boolean", default: false } }, dependencies: ["node", "powershell", "taskkill"] }],
];

const SYSTEM_TOOLS = [
  ["cpu_summary", "CPU summary", "Summarize CPU state, logical cores, and recent utilization.", { inputs: { sample_seconds: { type: "number", default: 1 } } }],
  ["memory_summary", "Memory summary", "Summarize physical and virtual memory state.", {}],
  ["disk_usage_summary", "Disk usage summary", "Summarize disk capacity and free space.", {}],
  ["uptime_summary", "Uptime summary", "Summarize boot time and elapsed uptime.", {}],
  ["machine_summary", "Machine summary", "Summarize host, OS, CPU, memory, and session data.", {}],
  ["os_version_summary", "OS version summary", "Summarize the OS version and build information.", {}],
  ["live_counter_snapshot", "Live counter snapshot", "Capture a current performance counter snapshot.", { inputs: { sample_seconds: { type: "number", default: 1 } } }],
  ["threshold_warning_report", "Threshold warning report", "Compare live system metrics against warning thresholds.", { inputs: { cpu_warn_pct: { type: "number", default: 75 }, memory_warn_pct: { type: "number", default: 80 }, disk_warn_pct: { type: "number", default: 85 } } }],
];

const SERVICE_TOOLS = [
  ["running_services", "Running services", "List running services with normalized metadata.", {}],
  ["stopped_services", "Stopped services", "List stopped services with normalized metadata.", {}],
  ["service_details_by_name", "Service details by name", "Return service metadata for one exact service name.", { inputs: { name: { type: "string", default: "" } } }],
  ["auto_start_services", "Auto-start services", "List services configured to start automatically.", {}],
  ["non_microsoft_services", "Non-Microsoft services", "List services whose binary paths look third-party or custom.", {}],
  ["service_control_preview", "Service control preview", "Preview a start, stop, or restart action for a service.", { risk_level: "low", supports_dry_run: false, inputs: { name: { type: "string", default: "" }, action: { type: "string", default: "stop" } } }],
  ["start_service_by_name", "Start service by name", "Start a service using guarded approval and dry-run support.", { risk_level: "high", supports_dry_run: true, inputs: { name: { type: "string", default: "" }, dry_run: { type: "boolean", default: true }, approve: { type: "boolean", default: false } } }],
  ["stop_service_by_name", "Stop service by name", "Stop a service using guarded approval and dry-run support.", { risk_level: "high", supports_dry_run: true, inputs: { name: { type: "string", default: "" }, dry_run: { type: "boolean", default: true }, approve: { type: "boolean", default: false } } }],
  ["restart_service_by_name", "Restart service by name", "Restart a service using guarded approval and dry-run support.", { risk_level: "high", supports_dry_run: true, inputs: { name: { type: "string", default: "" }, dry_run: { type: "boolean", default: true }, approve: { type: "boolean", default: false } } }],
];

const STARTUP_TOOLS = [
  ["list_startup_entries", "List startup entries", "List startup commands from Windows startup metadata.", {}],
  ["startup_folder_items", "Startup folder items", "List items in user and common startup folders.", {}],
  ["registry_startup_items", "Registry startup items", "List Run and RunOnce registry startup entries.", {}],
  ["scheduled_tasks_summary", "Scheduled tasks summary", "Summarize scheduled tasks and their state.", {}],
  ["suspicious_startup_candidates", "Suspicious startup candidates", "Flag startup items that look path-based or script-based.", {}],
  ["duplicate_startup_candidates", "Duplicate startup candidates", "Detect startup names and commands that appear multiple times.", {}],
];

const NETWORK_TOOLS = [
  ["list_listening_ports", "List listening ports", "List listening TCP ports and UDP endpoints.", {}],
  ["list_established_connections", "List established connections", "List established TCP connections.", {}],
  ["process_port_mapping", "Process-port mapping", "Map processes to their listening ports and connections.", {}],
  ["basic_network_activity_summary", "Basic network activity summary", "Summarize port, connection, and remote peer activity.", {}],
  ["local_network_diagnostics_summary", "Local network diagnostics summary", "Summarize local adapter and IP configuration.", {}],
];

const CLEANUP_TOOLS = [
  ["temp_cleanup_candidates", "Temp cleanup candidates", "List candidate temp files and directories for cleanup review.", {}],
  ["stale_log_candidates", "Stale log candidates", "List old log files and likely stale log artifacts.", {}],
  ["generate_diagnostics_report", "Generate diagnostics report", "Build a combined Task Manager style diagnostics report.", {}],
  ["generate_machine_readiness_report", "Generate machine readiness report", "Build a local AI readiness and command availability report.", {}],
  ["generate_process_health_snapshot", "Generate process health snapshot", "Build a focused process health snapshot.", {}],
  ["before_after_optimization_snapshot", "Before/after optimization snapshot", "Compare two snapshot payloads for resource changes.", { inputs: { before_path: { type: "string", default: "" }, after_path: { type: "string", default: "" } } }],
];

const POLICY_TOOLS = [
  ["protected_processes", "Protected processes", "Return the protected process allowlist used by the pack.", {}],
  ["protected_services", "Protected services", "Return the protected service allowlist used by the pack.", {}],
  ["process_action_policy", "Process action policy", "Classify a process or process name against kill safety rules.", { inputs: { pid: { type: "number", default: null }, name: { type: "string", default: "" }, action: { type: "string", default: "end" } } }],
  ["service_action_policy", "Service action policy", "Classify a service or service name against control safety rules.", { inputs: { name: { type: "string", default: "" }, action: { type: "string", default: "stop" } } }],
];

const EXTERNAL_TOOLS = [
  ["guarded_list_processes_ext", "Guarded list processes (external)", "Run staged guarded pack tool `list_processes` through the integrated bridge.", { handler: "guarded_list_processes_ext", entrypoint: "external/guarded_list_processes_ext.js", inputs: { limit: { type: "number", default: 25 }, query: { type: "string", default: "" }, sort_by: { type: "string", default: "cpu_pct" }, sort_dir: { type: "string", default: "desc" } } }],
  ["guarded_list_listening_ports_ext", "Guarded listening ports (external)", "Run staged guarded pack tool `list_listening_ports` through the integrated bridge.", { handler: "guarded_list_listening_ports_ext", entrypoint: "external/guarded_list_listening_ports_ext.js", inputs: { limit: { type: "number", default: 25 }, query: { type: "string", default: "" } } }],
  ["guarded_list_services_ext", "Guarded list services (external)", "Run staged guarded pack tool `list_services` through the integrated bridge.", { handler: "guarded_list_services_ext", entrypoint: "external/guarded_list_services_ext.js", inputs: { limit: { type: "number", default: 25 }, query: { type: "string", default: "" } } }],
  ["repo_registry_search_ext", "Repo registry search (external)", "Run staged repo coder pack tool `registry_search` through the integrated bridge.", { handler: "repo_registry_search_ext", entrypoint: "external/repo_registry_search_ext.js", inputs: { query: { type: "string", default: "" }, limit: { type: "number", default: 10 } } }],
  ["repo_likely_entrypoints_ext", "Repo likely entrypoints (external)", "Run staged repo coder pack tool `likely_entrypoints` through the integrated bridge.", { handler: "repo_likely_entrypoints_ext", entrypoint: "external/repo_likely_entrypoints_ext.js", inputs: { path: { type: "string", default: "." }, limit: { type: "number", default: 15 } } }],
  ["repo_generate_low_token_pack_ext", "Repo low-token pack (external)", "Run staged repo coder pack tool `generate_low_token_pack` through the integrated bridge.", { handler: "repo_generate_low_token_pack_ext", entrypoint: "external/repo_generate_low_token_pack_ext.js", inputs: { path: { type: "string", default: "." }, output: { type: "string", default: "" } } }],
];

const TOOL_ROWS = {
  process: PROCESS_TOOLS,
  system: SYSTEM_TOOLS,
  services: SERVICE_TOOLS,
  startup: STARTUP_TOOLS,
  network: NETWORK_TOOLS,
  cleanup: CLEANUP_TOOLS,
  policy: POLICY_TOOLS,
  external: EXTERNAL_TOOLS,
};

function buildTools() {
  const items = [];
  for (const [category, rows] of Object.entries(TOOL_ROWS)) {
    for (const row of rows) {
      const [id, title, description, options = {}] = row;
      items.push(makeTool(category, id, title, description, options));
    }
  }
  return items;
}

const TOOL_DEFINITIONS = buildTools();

const TOOL_ALIASES = {
  "show top ram apps": "top_memory_processes",
  "what is using cpu": "top_cpu_processes",
  "show startup apps": "list_startup_entries",
  "kill process 1234": "kill_process_by_pid",
  "show listening ports": "list_listening_ports",
  "show running processes": "list_running_processes",
  "show process tree": "process_tree_by_pid",
  "show process command line": "process_command_line",
  "show process details": "process_details_by_pid",
  "show services": "running_services",
  "show stopped services": "stopped_services",
  "show auto start services": "auto_start_services",
  "show scheduled tasks": "scheduled_tasks_summary",
  "show network connections": "list_established_connections",
  "show network diagnostics": "local_network_diagnostics_summary",
  "show temp cleanup candidates": "temp_cleanup_candidates",
  "show diagnostics report": "generate_diagnostics_report",
  "show readiness report": "generate_machine_readiness_report",
  "show protected processes": "protected_processes",
  "show protected services": "protected_services",
  "external repo registry search": "repo_registry_search_ext",
  "external likely entrypoints": "repo_likely_entrypoints_ext",
  "external list processes": "guarded_list_processes_ext",
};

const PLAYBOOKS = [
  {
    id: "process_triage",
    title: "Process triage",
    description: "Inspect hotspots, classify risk, and decide whether a process should be left alone or killed.",
    steps: [
      "Run top_cpu_processes and top_memory_processes.",
      "Run process_details_by_pid or process_details_by_name for the suspicious target.",
      "Run process_action_policy and dry_run_kill_process_by_pid if the target is eligible.",
    ],
    tools: ["top_cpu_processes", "top_memory_processes", "process_details_by_pid", "process_action_policy", "dry_run_kill_process_by_pid"],
  },
  {
    id: "local_ai_readiness_scan",
    title: "Local AI readiness scan",
    description: "Collect the current system posture for local AI work.",
    steps: [
      "Run machine_summary, cpu_summary, memory_summary, and disk_usage_summary.",
      "Run process_health_snapshot and basic_network_activity_summary.",
      "Run generate_machine_readiness_report for a compact summary.",
    ],
    tools: ["machine_summary", "cpu_summary", "memory_summary", "disk_usage_summary", "generate_process_health_snapshot", "basic_network_activity_summary", "generate_machine_readiness_report"],
  },
  {
    id: "safe_performance_inspection",
    title: "Safe performance inspection",
    description: "Inspect performance without changing system state.",
    steps: [
      "Run system summary tools.",
      "Inspect top_cpu_processes and top_memory_processes.",
      "Use threshold_warning_report to flag pressure.",
    ],
    tools: ["cpu_summary", "memory_summary", "disk_usage_summary", "top_cpu_processes", "top_memory_processes", "threshold_warning_report"],
  },
  {
    id: "startup_audit",
    title: "Startup audit",
    description: "Review startup paths, registry entries, and scheduled tasks.",
    steps: [
      "Run list_startup_entries, startup_folder_items, and registry_startup_items.",
      "Run scheduled_tasks_summary.",
      "Inspect suspicious_startup_candidates and duplicate_startup_candidates.",
    ],
    tools: ["list_startup_entries", "startup_folder_items", "registry_startup_items", "scheduled_tasks_summary", "suspicious_startup_candidates", "duplicate_startup_candidates"],
  },
  {
    id: "network_audit",
    title: "Network audit",
    description: "Check listening ports, established connections, and process mappings.",
    steps: [
      "Run list_listening_ports and list_established_connections.",
      "Use process_port_mapping for the suspicious PID.",
      "Run basic_network_activity_summary and local_network_diagnostics_summary.",
    ],
    tools: ["list_listening_ports", "list_established_connections", "process_port_mapping", "basic_network_activity_summary", "local_network_diagnostics_summary"],
  },
  {
    id: "diagnostics_bundle_generation",
    title: "Diagnostics bundle generation",
    description: "Collect a compact bundle for escalation or handoff.",
    steps: [
      "Run generate_diagnostics_report.",
      "Run generate_machine_readiness_report.",
      "Run generate_process_health_snapshot.",
    ],
    tools: ["generate_diagnostics_report", "generate_machine_readiness_report", "generate_process_health_snapshot"],
  },
  {
    id: "before_after_optimization_snapshot",
    title: "Before/after optimization snapshot",
    description: "Compare two snapshots to quantify resource change.",
    steps: [
      "Capture a baseline snapshot.",
      "Capture a follow-up snapshot after the change.",
      "Run before_after_optimization_snapshot to compare them.",
    ],
    tools: ["before_after_optimization_snapshot"],
  },
  {
    id: "guarded_process_termination_flow",
    title: "Guarded process termination flow",
    description: "Validate a target, preview impact, and only then terminate if explicitly approved.",
    steps: [
      "Run process_action_policy.",
      "Run dry_run_kill_process_by_pid or dry_run_kill_process_by_name.",
      "Run the matching kill tool with dry_run false and approve true only if the preview is acceptable.",
    ],
    tools: ["process_action_policy", "dry_run_kill_process_by_pid", "kill_process_by_pid", "dry_run_kill_process_by_name", "kill_process_by_name"],
  },
];

function getCategoryCounts() {
  const counts = {};
  for (const tool of TOOL_DEFINITIONS) {
    counts[tool.category] = (counts[tool.category] || 0) + 1;
  }
  return counts;
}

module.exports = {
  CATEGORY_DEFAULTS,
  SHARED_INPUTS,
  SHARED_OUTPUTS,
  TOOL_DEFINITIONS,
  TOOL_ALIASES,
  PLAYBOOKS,
  TOOL_ROWS,
  makeTool,
  getCategoryCounts,
};
