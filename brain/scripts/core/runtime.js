const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");
const { TOOL_DEFINITIONS, TOOL_ALIASES, PLAYBOOKS, getCategoryCounts } = require("../indexing/tool_catalog");

const PROTECTED_PROCESS_NAMES = [
  "system",
  "registry",
  "smss",
  "csrss",
  "wininit",
  "services",
  "lsass",
  "svchost",
  "dwm",
  "explorer",
  "winlogon",
  "fontdrvhost",
  "sihost",
  "ctfmon",
  "taskhostw",
  "startmenuexperiencehost",
  "shellexperiencehost",
  "searchhost",
  "searchindexer",
  "memory compression",
  "secure system",
  "system interrupts",
];

const PROTECTED_SERVICE_NAMES = [
  "eventlog",
  "plugplay",
  "rpcss",
  "dcomlaunch",
  "winmgmt",
  "lanmanserver",
  "lanmanworkstation",
  "schedule",
  "wuauserv",
  "trustedinstaller",
  "profsvc",
  "bits",
  "mpssvc",
  "windefend",
  "nlasvc",
  "samss",
];

const SECURITY_PROCESS_NAMES = ["msmpeng", "nisserv", "securityhealthservice", "securityhealthsystray"];
const TOOLING_PROCESS_NAMES = ["electron", "node", "npm", "cmd", "conhost", "powershell", "pwsh", "taskmgr"];

const WINDOWS_STARTUP_LOCATIONS = [
  path.join(os.homedir(), "AppData", "Roaming", "Microsoft", "Windows", "Start Menu", "Programs", "Startup"),
  path.join(process.env.ProgramData || "C:\\ProgramData", "Microsoft", "Windows", "Start Menu", "Programs", "Startup"),
];

const TEMP_PATHS = [
  process.env.TEMP,
  process.env.TMP,
  path.join(os.homedir(), "AppData", "Local", "Temp"),
  path.join(process.env.WINDIR || "C:\\Windows", "Temp"),
].filter(Boolean);

function nowIso() {
  return new Date().toISOString();
}

function isWindows() {
  return process.platform === "win32";
}

function normalizeText(value) {
  return String(value == null ? "" : value).trim();
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase();
}

function parseNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === "") return [];
  return [value];
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function makeResult(toolId, summary, data, options = {}) {
  return {
    ok: options.ok !== false,
    tool_id: toolId,
    summary,
    data,
    warnings: options.warnings || [],
    errors: options.errors || [],
    meta: {
      timestamp: nowIso(),
      source: options.source || "powershell",
      risk_level: options.risk_level || "low",
      dry_run: options.dry_run === true,
    },
  };
}

function makeBlocked(toolId, summary, reason, preview, options = {}) {
  return {
    ok: false,
    blocked: true,
    tool_id: toolId,
    summary,
    data: preview || {},
    warnings: options.warnings || [],
    errors: [reason],
    meta: {
      timestamp: nowIso(),
      source: options.source || "powershell",
      risk_level: options.risk_level || "high",
      dry_run: true,
    },
  };
}

function runCommand(file, args, options = {}) {
  const result = spawnSync(file, args, {
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: options.maxBuffer || 20 * 1024 * 1024,
  });
  return {
    ok: result.status === 0,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    status: result.status,
    error: result.error ? String(result.error.message || result.error) : "",
  };
}

function stringifyArgValue(value) {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (value == null) return "";
  return JSON.stringify(value);
}

function toExternalCliArgs(args = {}) {
  const out = [];
  for (const [key, value] of Object.entries(args)) {
    if (key === "_" || value == null || value === "") continue;
    const cliKey = `--${String(key).replace(/_/g, "-")}`;
    if (value === true) {
      out.push(cliKey);
      continue;
    }
    out.push(cliKey, stringifyArgValue(value));
  }
  return out;
}

function runExternalPackTool(packRelativeRunnerPath, externalToolId, args = {}) {
  const runnerPath = path.resolve(__dirname, "..", "_staging", ...packRelativeRunnerPath.split("/"));
  if (!fs.existsSync(runnerPath)) {
    return { ok: false, error: `External runner not found: ${runnerPath}` };
  }
  const cliArgs = [runnerPath, externalToolId, ...toExternalCliArgs(args)];
  const response = runCommand("node", cliArgs, { maxBuffer: 40 * 1024 * 1024 });
  if (!response.ok) {
    return { ok: false, error: response.stderr || response.error || `External tool ${externalToolId} failed.` };
  }
  const text = normalizeText(response.stdout);
  if (!text) return { ok: false, error: `External tool ${externalToolId} returned empty output.` };
  try {
    return JSON.parse(text);
  } catch (error) {
    return {
      ok: false,
      error: `External tool ${externalToolId} returned non-JSON output: ${error.message}`,
      raw: text.slice(0, 2000),
    };
  }
}

function runPowerShell(script) {
  const powershell = process.env.ComSpec && isWindows() ? "powershell.exe" : "powershell";
  return runCommand(powershell, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script]);
}

function jsonFromPowerShell(script) {
  const response = runPowerShell(script);
  if (!response.ok) {
    return { ok: false, error: response.stderr || response.error || "PowerShell command failed.", stdout: response.stdout };
  }
  const text = normalizeText(response.stdout);
  if (!text) return { ok: true, value: [] };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (error) {
    return { ok: false, error: `Failed to parse JSON: ${error.message}`, stdout: response.stdout };
  }
}

function getRegistryTools() {
  const registryPath = path.join(__dirname, "..", "registry", "tools_index.json");
  if (fs.existsSync(registryPath)) {
    try {
      const raw = fs.readFileSync(registryPath, "utf8");
      return JSON.parse(raw);
    } catch (error) {
      return TOOL_DEFINITIONS;
    }
  }
  return TOOL_DEFINITIONS;
}

function getRegistryAliases() {
  const aliasPath = path.join(__dirname, "..", "registry", "tool_aliases.json");
  if (fs.existsSync(aliasPath)) {
    try {
      return JSON.parse(fs.readFileSync(aliasPath, "utf8"));
    } catch (error) {
      return TOOL_ALIASES;
    }
  }
  return TOOL_ALIASES;
}

function getPlaybooks() {
  const playbookPath = path.join(__dirname, "..", "registry", "playbooks.json");
  if (fs.existsSync(playbookPath)) {
    try {
      return JSON.parse(fs.readFileSync(playbookPath, "utf8"));
    } catch (error) {
      return PLAYBOOKS;
    }
  }
  return PLAYBOOKS;
}

function getToolMap() {
  const tools = getRegistryTools();
  const map = new Map();
  for (const tool of tools) map.set(tool.id, tool);
  return map;
}

function parseArgValue(value) {
  if (value === undefined) return true;
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  if (/^-?\d+\.\d+$/.test(value)) return Number(value);
  if ((value.startsWith("[") && value.endsWith("]")) || (value.startsWith("{") && value.endsWith("}"))) {
    try {
      return JSON.parse(value);
    } catch (error) {
      return value;
    }
  }
  return value;
}

function parseCliArgs(argv) {
  const args = { _: [] };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const eqIndex = token.indexOf("=");
      if (eqIndex !== -1) {
        args[token.slice(2, eqIndex).replace(/-/g, "_")] = parseArgValue(token.slice(eqIndex + 1));
      } else {
        const next = argv[i + 1];
        if (next && !next.startsWith("--")) {
          args[token.slice(2).replace(/-/g, "_")] = parseArgValue(next);
          i += 1;
        } else {
          args[token.slice(2).replace(/-/g, "_")] = true;
        }
      }
    } else {
      args._.push(token);
    }
  }
  return args;
}

function isProtectedProcessName(name) {
  const normalized = normalizeLower(name);
  return PROTECTED_PROCESS_NAMES.includes(normalized);
}

function isProtectedServiceName(name) {
  const normalized = normalizeLower(name);
  return PROTECTED_SERVICE_NAMES.includes(normalized);
}

function isToolingProcessName(name) {
  const normalized = normalizeLower(name);
  return TOOLING_PROCESS_NAMES.includes(normalized);
}

function isSecurityProcessName(name) {
  const normalized = normalizeLower(name);
  return SECURITY_PROCESS_NAMES.includes(normalized);
}

function matchesIdleHeavy(row, minMemoryMb, maxCpuPct) {
  return parseNumber(row.memory_mb) >= minMemoryMb && parseNumber(row.cpu_pct) <= maxCpuPct;
}

function normalizeImageName(name) {
  const normalized = normalizeText(name);
  if (!normalized) return "";
  return normalized.toLowerCase().endsWith(".exe") ? normalized : `${normalized}.exe`;
}

function compareByNumeric(a, b, key, direction = "desc") {
  const dir = direction === "asc" ? 1 : -1;
  return (parseNumber(a[key]) - parseNumber(b[key])) * dir;
}

function collectProcessInventory() {
  if (!isWindows()) return { ok: false, error: "This pack is Windows-backed only." };
  const script = [
    "$processes = Get-Process | Select-Object Id, ProcessName, Handles, @{Name='Threads';Expression={$_.Threads.Count}}, @{Name='WorkingSetMB';Expression={[math]::Round($_.WS/1MB,2)}}, @{Name='PrivateMemoryMB';Expression={[math]::Round($_.PrivateMemorySize64/1MB,2)}}, @{Name='CpuSeconds';Expression={[math]::Round($_.CPU,2)}};",
    "$cim = Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, ExecutablePath, CommandLine, @{Name='CreatedAt';Expression={ try { [System.Management.ManagementDateTimeConverter]::ToDateTime($_.CreationDate).ToString('o') } catch { $null } }}, SessionId;",
    "$perf = Get-CimInstance Win32_PerfFormattedData_PerfProc_Process | Select-Object IDProcess, Name, PercentProcessorTime;",
    "[PSCustomObject]@{ processes = $processes; cim = $cim; perf = $perf } | ConvertTo-Json -Depth 6 -Compress",
  ].join(" ");
  const response = jsonFromPowerShell(script);
  if (!response.ok) return response;
  const payload = response.value || { processes: [], cim: [], perf: [] };
  const cimMap = new Map();
  const perfMap = new Map();
  for (const row of toArray(payload.cim)) cimMap.set(Number(row.ProcessId), row);
  for (const row of toArray(payload.perf)) {
    const pid = Number(row.IDProcess);
    if (!pid || pid <= 0) continue;
    perfMap.set(pid, row);
  }
  const items = toArray(payload.processes).map((row) => {
    const pid = Number(row.Id) || 0;
    const meta = cimMap.get(pid) || {};
    const perf = perfMap.get(pid) || {};
    return {
      pid,
      ppid: Number(meta.ParentProcessId) || null,
      name: normalizeText(row.ProcessName),
      cpu_pct: parseNumber(perf.PercentProcessorTime),
      cpu_seconds: parseNumber(row.CpuSeconds),
      handles: Number(row.Handles) || 0,
      threads: Number(row.Threads) || 0,
      memory_mb: parseNumber(row.WorkingSetMB),
      private_memory_mb: parseNumber(row.PrivateMemoryMB),
      executable_path: normalizeText(meta.ExecutablePath),
      command_line: normalizeText(meta.CommandLine),
      session_id: meta.SessionId == null ? null : Number(meta.SessionId),
      created_at: normalizeText(meta.CreatedAt),
      protected: isProtectedProcessName(row.ProcessName),
      security: isSecurityProcessName(row.ProcessName),
      tooling: isToolingProcessName(row.ProcessName),
    };
  });
  return { ok: true, items };
}

function collectServiceInventory() {
  if (!isWindows()) return { ok: false, error: "This pack is Windows-backed only." };
  const script = [
    "$services = Get-Service | Select-Object Name, DisplayName, @{Name='Status';Expression={$_.Status.ToString()}}, StartType;",
    "$cim = Get-CimInstance Win32_Service | Select-Object Name, StartMode, PathName, ProcessId, Description;",
    "[PSCustomObject]@{ services = $services; cim = $cim } | ConvertTo-Json -Depth 6 -Compress",
  ].join(" ");
  const response = jsonFromPowerShell(script);
  if (!response.ok) return response;
  const payload = response.value || { services: [], cim: [] };
  const cimMap = new Map();
  for (const row of toArray(payload.cim)) cimMap.set(normalizeLower(row.Name), row);
  const items = toArray(payload.services).map((row) => {
    const meta = cimMap.get(normalizeLower(row.Name)) || {};
    return {
      name: normalizeText(row.Name),
      display_name: normalizeText(row.DisplayName),
      status: normalizeLower(row.Status),
      start_type: normalizeText(row.StartType),
      start_mode: normalizeText(meta.StartMode),
      path_name: normalizeText(meta.PathName),
      process_id: Number(meta.ProcessId) || null,
      description: normalizeText(meta.Description),
      protected: isProtectedServiceName(row.Name),
    };
  });
  return { ok: true, items };
}

function collectStartupInventory() {
  if (!isWindows()) return { ok: false, error: "This pack is Windows-backed only." };
  const startupScript = [
    "$items = Get-CimInstance Win32_StartupCommand | Select-Object Name, Command, Location, User;",
    "$items | ConvertTo-Json -Depth 6 -Compress",
  ].join(" ");
  const registryScript = [
    "$paths = @('HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run','HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run','HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\RunOnce','HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\RunOnce');",
    "$rows = foreach ($path in $paths) { if (Test-Path $path) { $props = Get-ItemProperty $path; foreach ($prop in $props.PSObject.Properties) { if ($prop.Name -notmatch '^PS') { [PSCustomObject]@{ Hive = $path; Name = $prop.Name; Command = [string]$prop.Value } } } } };",
    "$rows | ConvertTo-Json -Depth 6 -Compress",
  ].join(" ");
  const folders = [];
  for (const startupPath of WINDOWS_STARTUP_LOCATIONS) {
    if (!fs.existsSync(startupPath)) continue;
    for (const entry of fs.readdirSync(startupPath, { withFileTypes: true })) {
      const entryPath = path.join(startupPath, entry.name);
      try {
        const stat = fs.statSync(entryPath);
        folders.push({
          name: entry.name,
          path: entryPath,
          location: startupPath,
          kind: entry.isDirectory() ? "directory" : "file",
          size_bytes: stat.size,
          modified_at: stat.mtime.toISOString(),
        });
      } catch (error) {
        folders.push({ name: entry.name, path: entryPath, location: startupPath, kind: "unknown" });
      }
    }
  }
  const startup = jsonFromPowerShell(startupScript);
  const registry = jsonFromPowerShell(registryScript);
  if (!startup.ok) return startup;
  if (!registry.ok) return registry;
  return {
    ok: true,
    items: {
      startup_commands: toArray(startup.value),
      registry_run_keys: toArray(registry.value),
      startup_folder_items: folders,
    },
  };
}

function collectTaskSummary() {
  if (!isWindows()) return { ok: false, error: "This pack is Windows-backed only." };
  const script = [
    "Get-ScheduledTask | Select-Object TaskName, TaskPath, State, Author, Description | ConvertTo-Json -Depth 6 -Compress",
  ].join(" ");
  return jsonFromPowerShell(script);
}

function collectNetworkInventory() {
  if (!isWindows()) return { ok: false, error: "This pack is Windows-backed only." };
  const netstat = runCommand("netstat.exe", ["-ano"]);
  if (!netstat.ok) return { ok: false, error: netstat.stderr || netstat.error || "netstat failed." };
  const processes = collectProcessInventory();
  const pidToName = new Map();
  if (processes.ok) {
    for (const row of processes.items) pidToName.set(Number(row.pid), row.name);
  }
  const rows = [];
  for (const line of String(netstat.stdout || "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || /^Proto/i.test(trimmed) || /^Active/i.test(trimmed)) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length < 4) continue;
    const proto = parts[0].toLowerCase();
    if (proto === "tcp" && parts.length >= 5) {
      const [localAddress, localPort] = splitAddressPort(parts[1]);
      const [remoteAddress, remotePort] = splitAddressPort(parts[2]);
      const pid = Number(parts[4]) || null;
      rows.push({
        proto,
        local_address: localAddress,
        local_port: localPort,
        remote_address: remoteAddress,
        remote_port: remotePort,
        state: parts[3],
        pid,
        process_name: pidToName.get(pid) || "",
      });
    } else if (proto === "udp" && parts.length >= 4) {
      const [localAddress, localPort] = splitAddressPort(parts[1]);
      const pid = Number(parts[3]) || null;
      rows.push({
        proto,
        local_address: localAddress,
        local_port: localPort,
        remote_address: "",
        remote_port: null,
        state: "NONE",
        pid,
        process_name: pidToName.get(pid) || "",
      });
    }
  }
  return { ok: true, items: rows };
}

function collectSystemInventory(sampleSeconds = 1) {
  if (!isWindows()) return { ok: false, error: "This pack is Windows-backed only." };
  const counterScript = [
    `$cpu = (Get-Counter '\\Processor(_Total)\\% Processor Time' -SampleInterval ${Math.max(1, Number(sampleSeconds) || 1)} -MaxSamples 1).CounterSamples[0].CookedValue;`,
    `$mem = (Get-Counter '\\Memory\\Available MBytes' -SampleInterval ${Math.max(1, Number(sampleSeconds) || 1)} -MaxSamples 1).CounterSamples[0].CookedValue;`,
    `$disk = $null; try { $disk = (Get-Counter '\\PhysicalDisk(_Total)\\Disk Bytes/sec' -SampleInterval ${Math.max(1, Number(sampleSeconds) || 1)} -MaxSamples 1).CounterSamples[0].CookedValue } catch {};`,
    "[PSCustomObject]@{ cpu = [math]::Round($cpu,2); available_memory_mb = [math]::Round($mem,2); disk_bytes_per_sec = if ($disk -ne $null) { [math]::Round($disk,2) } else { $null } } | ConvertTo-Json -Depth 6 -Compress",
  ].join(" ");
  const osScript = [
    "$os = Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, BuildNumber, LastBootUpTime, TotalVisibleMemorySize, FreePhysicalMemory, SerialNumber, CSName;",
    "$cpu = Get-CimInstance Win32_Processor | Select-Object Name, NumberOfCores, NumberOfLogicalProcessors;",
    "$disks = Get-CimInstance Win32_LogicalDisk -Filter \"DriveType=3\" | Select-Object DeviceID, Size, FreeSpace, VolumeName;",
    "[PSCustomObject]@{ os = $os; cpu = $cpu; disks = $disks; user = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name; sampleSeconds = ${sampleSeconds} } | ConvertTo-Json -Depth 6 -Compress",
  ].join(" ");
  const counters = jsonFromPowerShell(counterScript);
  const osInfo = jsonFromPowerShell(osScript);
  if (!counters.ok) return counters;
  if (!osInfo.ok) return osInfo;
  return { ok: true, items: { counters: counters.value, os: osInfo.value } };
}

function splitAddressPort(value) {
  const text = normalizeText(value);
  if (!text) return ["", null];
  const cleaned = text.replace(/^\[|\]$/g, "");
  const index = cleaned.lastIndexOf(":");
  if (index === -1) return [cleaned, null];
  const address = cleaned.slice(0, index);
  const port = Number(cleaned.slice(index + 1)) || null;
  return [address, port];
}

function collectTempCandidates() {
  const candidates = [];
  for (const tempPath of TEMP_PATHS) {
    if (!fs.existsSync(tempPath)) continue;
    try {
      for (const entry of fs.readdirSync(tempPath, { withFileTypes: true })) {
        const entryPath = path.join(tempPath, entry.name);
        const stat = fs.statSync(entryPath);
        const ageMinutes = (Date.now() - stat.mtimeMs) / 60000;
        if (ageMinutes >= 30 || stat.size >= 10 * 1024 * 1024) {
          candidates.push({
            name: entry.name,
            path: entryPath,
            kind: entry.isDirectory() ? "directory" : "file",
            size_bytes: stat.size,
            age_minutes: Number(ageMinutes.toFixed(1)),
          });
        }
      }
    } catch (error) {
      candidates.push({ path: tempPath, error: error.message });
    }
  }
  return candidates;
}

function collectLogCandidates() {
  const roots = unique([
    ...TEMP_PATHS,
    path.join(os.homedir(), "AppData", "Local", "Logs"),
    path.join(os.homedir(), "AppData", "Roaming", "Logs"),
    path.join(process.env.ProgramData || "C:\\ProgramData", "Logs"),
  ]);
  const candidates = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    try {
      const entries = fs.readdirSync(root, { withFileTypes: true });
      for (const entry of entries) {
        const entryPath = path.join(root, entry.name);
        const stat = fs.statSync(entryPath);
        const isLog = /\.(log|txt|trace|dmp|etl)$/i.test(entry.name) || /log/i.test(entry.name);
        const ageDays = (Date.now() - stat.mtimeMs) / 86400000;
        if (isLog && ageDays >= 7) {
          candidates.push({
            name: entry.name,
            path: entryPath,
            kind: entry.isDirectory() ? "directory" : "file",
            size_bytes: stat.size,
            age_days: Number(ageDays.toFixed(1)),
          });
        }
      }
    } catch (error) {
      candidates.push({ path: root, error: error.message });
    }
  }
  return candidates;
}

function collectProcessActionsContext() {
  const inventory = collectProcessInventory();
  if (!inventory.ok) return inventory;
  const rows = inventory.items.map((row) => ({
    pid: row.pid,
    name: row.name,
    protected: row.protected,
    security: row.security,
    tooling: row.tooling,
    cpu_pct: row.cpu_pct,
    memory_mb: row.memory_mb,
    executable_path: row.executable_path,
    command_line: row.command_line,
  }));
  return { ok: true, items: rows };
}

function processRiskClassification(payload) {
  const name = normalizeText(payload.name || payload.ProcessName || payload.processName);
  const pid = payload.pid == null ? null : Number(payload.pid);
  const protectedProcess = isProtectedProcessName(name);
  const security = isSecurityProcessName(name);
  const tooling = isToolingProcessName(name);
  const reasons = [];
  if (protectedProcess) reasons.push("Windows core process");
  if (security) reasons.push("Security software");
  if (tooling) reasons.push("Developer/runtime process");
  if (pid != null && Number.isFinite(pid) && pid > 0) reasons.push(`PID ${pid}`);
  const risk = protectedProcess || security ? "critical" : tooling ? "medium" : "low";
  return {
    risk,
    name,
    pid,
    reasons,
    recommended_actions: protectedProcess ? ["do_not_terminate"] : ["preview", "inspect", "approve_only_if_needed"],
    protected: protectedProcess,
    security,
    tooling,
  };
}

function classNameFromService(service) {
  return service.display_name || service.name || "Unknown service";
}

function normalizeServiceMode(mode) {
  return normalizeLower(mode).replace(/[^a-z]/g, "");
}

function serviceRiskClassification(service, action) {
  const name = normalizeText(service?.name || service?.Name);
  const protectedService = isProtectedServiceName(name);
  const reasons = [];
  if (protectedService) reasons.push("Protected Windows service");
  if (action === "restart") reasons.push("Restart can disrupt dependent processes");
  if (action === "stop") reasons.push("Stop can disrupt system behavior");
  return {
    protected: protectedService,
    risk: protectedService ? "critical" : "high",
    reasons,
    recommended_actions: protectedService ? ["do_not_modify"] : ["preview", "approve_only_if_needed"],
  };
}

function buildProcessList(args = {}) {
  const inventory = collectProcessInventory();
  if (!inventory.ok) return inventory;
  let items = inventory.items.slice();
  const query = normalizeLower(args.query || "");
  if (query) {
    items = items.filter((row) => normalizeLower(row.name).includes(query) || normalizeLower(row.command_line).includes(query));
  }
  const pid = args.pid == null ? null : Number(args.pid);
  if (pid) items = items.filter((row) => row.pid === pid);
  const name = normalizeLower(args.name || "");
  if (name) items = items.filter((row) => normalizeLower(row.name) === name);
  const minAge = Number(args.min_age_minutes || 0);
  if (minAge > 0) {
    items = items.filter((row) => ageMinutes(row.created_at) >= minAge);
  }
  const minMemory = Number(args.min_memory_mb || 0);
  if (minMemory > 0) items = items.filter((row) => row.memory_mb >= minMemory);
  const maxCpu = Number(args.max_cpu_pct || 100);
  if (Number.isFinite(maxCpu)) items = items.filter((row) => row.cpu_pct <= maxCpu);
  if (args.critical_only === true) items = items.filter((row) => row.protected);
  if (args.non_critical_only === true) items = items.filter((row) => !row.protected);
  if (args.background_like === true) items = items.filter((row) => row.memory_mb >= 100 && row.cpu_pct <= 2);
  const sortBy = normalizeLower(args.sort_by || "memory_mb");
  const sortDir = normalizeLower(args.sort_dir || "desc");
  items.sort((a, b) => compareByNumeric(a, b, sortBy, sortDir));
  const limit = Number(args.limit || 25);
  if (limit > 0) items = items.slice(0, limit);
  return { ok: true, items };
}

function ageMinutes(createdAt) {
  if (!createdAt) return 0;
  const time = Date.parse(createdAt);
  if (!Number.isFinite(time)) return 0;
  return (Date.now() - time) / 60000;
}

function buildProcessTree(pid) {
  const inventory = collectProcessInventory();
  if (!inventory.ok) return inventory;
  const byPid = new Map();
  for (const row of inventory.items) byPid.set(row.pid, { ...row, children: [] });
  for (const row of byPid.values()) {
    if (row.ppid && byPid.has(row.ppid)) byPid.get(row.ppid).children.push(row.pid);
  }
  const root = byPid.get(Number(pid));
  if (!root) return { ok: false, error: `PID ${pid} not found.` };
  function project(node, depth = 0) {
    return {
      pid: node.pid,
      ppid: node.ppid,
      name: node.name,
      cpu_pct: node.cpu_pct,
      memory_mb: node.memory_mb,
      depth,
      children: node.children.map((childPid) => project(byPid.get(childPid), depth + 1)),
    };
  }
  return { ok: true, items: project(root) };
}

function buildServiceList(args = {}) {
  const inventory = collectServiceInventory();
  if (!inventory.ok) return inventory;
  let items = inventory.items.slice();
  const query = normalizeLower(args.query || "");
  if (query) {
    items = items.filter((row) => normalizeLower(row.name).includes(query) || normalizeLower(row.display_name).includes(query));
  }
  const name = normalizeLower(args.name || "");
  if (name) items = items.filter((row) => normalizeLower(row.name) === name || normalizeLower(row.display_name) === name);
  const status = normalizeLower(args.status || "");
  if (status) items = items.filter((row) => normalizeLower(row.status) === status);
  const startType = normalizeLower(args.start_type || "");
  if (startType) items = items.filter((row) => normalizeLower(row.start_type).includes(startType) || normalizeLower(row.start_mode).includes(startType));
  const limit = Number(args.limit || 25);
  if (limit > 0) items = items.slice(0, limit);
  return { ok: true, items };
}

function buildStartupList(args = {}) {
  const inventory = collectStartupInventory();
  if (!inventory.ok) return inventory;
  const items = [];
  for (const row of inventory.items.startup_commands) {
    items.push({ type: "startup_command", name: row.Name || row.name, command: row.Command || row.command, location: row.Location || row.location, user: row.User || row.user });
  }
  for (const row of inventory.items.registry_run_keys) {
    items.push({ type: "registry_run", hive: row.Hive || row.hive, name: row.Name || row.name, command: row.Command || row.command });
  }
  for (const row of inventory.items.startup_folder_items) {
    items.push({ type: "startup_folder", name: row.name, path: row.path, location: row.location, kind: row.kind, size_bytes: row.size_bytes, modified_at: row.modified_at });
  }
  let filtered = items;
  const query = normalizeLower(args.query || "");
  if (query) filtered = filtered.filter((row) => normalizeLower(JSON.stringify(row)).includes(query));
  const limit = Number(args.limit || 25);
  if (limit > 0) filtered = filtered.slice(0, limit);
  return { ok: true, items: filtered };
}

function buildNetworkList(args = {}) {
  const inventory = collectNetworkInventory();
  if (!inventory.ok) return inventory;
  let items = inventory.items.slice();
  const proto = normalizeLower(args.proto || "");
  if (proto) items = items.filter((row) => row.proto === proto);
  const state = normalizeLower(args.state || "");
  if (state) items = items.filter((row) => normalizeLower(row.state) === state);
  const pid = args.pid == null ? null : Number(args.pid);
  if (pid) items = items.filter((row) => row.pid === pid);
  const port = args.port == null ? null : Number(args.port);
  if (port) items = items.filter((row) => row.local_port === port || row.remote_port === port);
  const query = normalizeLower(args.query || "");
  if (query) items = items.filter((row) => normalizeLower(JSON.stringify(row)).includes(query));
  const limit = Number(args.limit || 40);
  if (limit > 0) items = items.slice(0, limit);
  return { ok: true, items };
}

function buildListeningPorts(args = {}) {
  const inventory = collectNetworkInventory();
  if (!inventory.ok) return inventory;
  let items = inventory.items.filter((row) => row.state === "LISTENING" || row.proto === "udp");
  const limit = Number(args.limit || 50);
  if (limit > 0) items = items.slice(0, limit);
  return { ok: true, items };
}

function buildEstablishedConnections(args = {}) {
  const inventory = collectNetworkInventory();
  if (!inventory.ok) return inventory;
  let items = inventory.items.filter((row) => row.state === "ESTABLISHED");
  const limit = Number(args.limit || 50);
  if (limit > 0) items = items.slice(0, limit);
  return { ok: true, items };
}

function buildProcessPortMapping(args = {}) {
  const inventory = collectNetworkInventory();
  if (!inventory.ok) return inventory;
  const map = new Map();
  for (const row of inventory.items) {
    const key = row.pid || 0;
    if (!map.has(key)) {
      map.set(key, { pid: row.pid, process_name: row.process_name, listening_ports: [], established_connections: 0, udp_endpoints: 0 });
    }
    const entry = map.get(key);
    if (row.proto === "udp") entry.udp_endpoints += 1;
    else if (row.state === "LISTENING") entry.listening_ports.push(row.local_port);
    else if (row.state === "ESTABLISHED") entry.established_connections += 1;
  }
  let items = [...map.values()].filter((row) => row.pid);
  items.sort((a, b) => (b.established_connections + b.listening_ports.length) - (a.established_connections + a.listening_ports.length));
  const limit = Number(args.limit || 25);
  if (limit > 0) items = items.slice(0, limit);
  return { ok: true, items };
}

function buildNetworkSummary() {
  const inventory = collectNetworkInventory();
  if (!inventory.ok) return inventory;
  const listening = inventory.items.filter((row) => row.state === "LISTENING" || row.proto === "udp");
  const established = inventory.items.filter((row) => row.state === "ESTABLISHED");
  const remotePeers = unique(established.map((row) => row.remote_address).filter(Boolean));
  return {
    ok: true,
    items: {
      listening_ports: listening.length,
      established_connections: established.length,
      unique_remote_peers: remotePeers.length,
      sample_remote_peers: remotePeers.slice(0, 20),
      top_processes: buildProcessPortMapping({ limit: 10 }).items || [],
    },
  };
}

function buildLocalNetworkDiagnostics() {
  if (!isWindows()) return { ok: false, error: "This pack is Windows-backed only." };
  const script = [
    "Get-NetIPConfiguration | Select-Object InterfaceAlias, IPv4Address, IPv4DefaultGateway, DNSServer | ConvertTo-Json -Depth 6 -Compress",
  ].join(" ");
  const response = jsonFromPowerShell(script);
  if (!response.ok) return response;
  return { ok: true, items: toArray(response.value) };
}

function buildCpuSummary(sampleSeconds = 1) {
  const inventory = collectSystemInventory(sampleSeconds);
  if (!inventory.ok) return inventory;
  const counters = inventory.items.counters || {};
  const osInfo = inventory.items.os || {};
  const cpu = toArray(osInfo.cpu)[0] || {};
  return {
    ok: true,
    items: {
      current_cpu_pct: parseNumber(counters.cpu),
      logical_processors: Number(cpu.NumberOfLogicalProcessors) || null,
      physical_cores: Number(cpu.NumberOfCores) || null,
      cpu_name: normalizeText(cpu.Name),
      available_memory_mb: parseNumber(counters.available_memory_mb),
      disk_bytes_per_sec: counters.disk_bytes_per_sec == null ? null : parseNumber(counters.disk_bytes_per_sec),
    },
  };
}

function buildMemorySummary() {
  const inventory = collectSystemInventory(1);
  if (!inventory.ok) return inventory;
  const osInfo = inventory.items.os || {};
  const os = toArray(osInfo.os)[0] || {};
  const totalMb = parseNumber(os.TotalVisibleMemorySize) / 1024;
  const freeMb = parseNumber(os.FreePhysicalMemory) / 1024;
  return {
    ok: true,
    items: {
      total_memory_mb: Number(totalMb.toFixed(2)),
      free_memory_mb: Number(freeMb.toFixed(2)),
      used_memory_mb: Number((totalMb - freeMb).toFixed(2)),
      available_memory_mb: parseNumber(inventory.items.counters.available_memory_mb),
    },
  };
}

function buildDiskSummary() {
  const inventory = collectSystemInventory(1);
  if (!inventory.ok) return inventory;
  const disks = toArray(inventory.items.os.disks);
  const items = disks.map((disk) => {
    const size = parseNumber(disk.Size);
    const free = parseNumber(disk.FreeSpace);
    return {
      device_id: normalizeText(disk.DeviceID),
      volume_name: normalizeText(disk.VolumeName),
      size_gb: size ? Number((size / 1073741824).toFixed(2)) : null,
      free_gb: size ? Number((free / 1073741824).toFixed(2)) : null,
      used_percent: size ? Number((((size - free) / size) * 100).toFixed(1)) : null,
    };
  });
  return { ok: true, items };
}

function buildUptimeSummary() {
  const inventory = collectSystemInventory(1);
  if (!inventory.ok) return inventory;
  const os = toArray(inventory.items.os.os)[0] || {};
  const boot = os.LastBootUpTime ? new Date(os.LastBootUpTime) : null;
  const elapsedMs = boot ? Date.now() - boot.getTime() : null;
  return {
    ok: true,
    items: {
      boot_time: boot ? boot.toISOString() : null,
      uptime_hours: elapsedMs == null ? null : Number((elapsedMs / 3600000).toFixed(2)),
      uptime_days: elapsedMs == null ? null : Number((elapsedMs / 86400000).toFixed(2)),
      current_user: normalizeText(inventory.items.os.user),
    },
  };
}

function buildMachineSummary() {
  const system = collectSystemInventory(1);
  const cpu = buildCpuSummary(1);
  const memory = buildMemorySummary();
  const disks = buildDiskSummary();
  if (!system.ok || !cpu.ok || !memory.ok || !disks.ok) return system;
  const os = toArray(system.items.os.os)[0] || {};
  return {
    ok: true,
    items: {
      hostname: normalizeText(os.CSName || os.ComputerName),
      os_name: normalizeText(os.Caption),
      os_version: normalizeText(os.Version),
      build_number: normalizeText(os.BuildNumber),
      user: normalizeText(system.items.os.user),
      cpu: cpu.items,
      memory: memory.items,
      disks: disks.items,
      counters: system.items.counters,
    },
  };
}

function buildOsVersionSummary() {
  const inventory = collectSystemInventory(1);
  if (!inventory.ok) return inventory;
  const os = toArray(inventory.items.os.os)[0] || {};
  return {
    ok: true,
    items: {
      caption: normalizeText(os.Caption),
      version: normalizeText(os.Version),
      build_number: normalizeText(os.BuildNumber),
      serial_number: normalizeText(os.SerialNumber),
      machine_name: normalizeText(os.CSName),
    },
  };
}

function buildLiveCounterSnapshot(args = {}) {
  return buildCpuSummary(Number(args.sample_seconds || 1));
}

function buildThresholdWarningReport(args = {}) {
  const machine = buildMachineSummary();
  if (!machine.ok) return machine;
  const warnings = [];
  const cpu = parseNumber(machine.items.cpu.current_cpu_pct);
  const memory = parseNumber(machine.items.memory.used_memory_mb);
  const totalMemory = parseNumber(machine.items.memory.total_memory_mb);
  const memoryPct = totalMemory > 0 ? (memory / totalMemory) * 100 : 0;
  const disks = machine.items.disks || [];
  const warnCpu = Number(args.cpu_warn_pct || 75);
  const warnMemory = Number(args.memory_warn_pct || 80);
  const warnDisk = Number(args.disk_warn_pct || 85);
  if (cpu >= warnCpu) warnings.push(`CPU is at ${cpu.toFixed(1)}%, above ${warnCpu}%`);
  if (memoryPct >= warnMemory) warnings.push(`Memory is at ${memoryPct.toFixed(1)}%, above ${warnMemory}%`);
  for (const disk of disks) {
    if (disk.used_percent != null && disk.used_percent >= warnDisk) {
      warnings.push(`${disk.device_id || "Disk"} is at ${disk.used_percent}% used, above ${warnDisk}%`);
    }
  }
  return {
    ok: true,
    items: {
      warnings,
      cpu_pct: cpu,
      memory_pct: Number(memoryPct.toFixed(1)),
      disk_count: disks.length,
    },
  };
}

function buildServiceSummary(args = {}) {
  const inventory = collectServiceInventory();
  if (!inventory.ok) return inventory;
  const status = normalizeLower(args.status || "");
  let items = inventory.items.slice();
  if (status) items = items.filter((row) => normalizeLower(row.status) === status);
  const startType = normalizeLower(args.start_type || "");
  if (startType) items = items.filter((row) => normalizeLower(row.start_type).includes(startType) || normalizeLower(row.start_mode).includes(startType));
  const query = normalizeLower(args.query || "");
  if (query) items = items.filter((row) => normalizeLower(`${row.name} ${row.display_name} ${row.path_name}`).includes(query));
  const limit = Number(args.limit || 25);
  if (limit > 0) items = items.slice(0, limit);
  return { ok: true, items };
}

function buildServiceDetails(name) {
  const inventory = collectServiceInventory();
  if (!inventory.ok) return inventory;
  const normalized = normalizeLower(name);
  const items = inventory.items.filter((row) => normalizeLower(row.name) === normalized || normalizeLower(row.display_name) === normalized);
  if (!items.length) return { ok: false, error: `Service ${name} not found.` };
  return { ok: true, items };
}

function buildNonMicrosoftServices() {
  const inventory = collectServiceInventory();
  if (!inventory.ok) return inventory;
  const items = inventory.items.filter((row) => {
    const pathName = normalizeLower(row.path_name);
    if (!pathName) return false;
    return !pathName.includes("\\windows\\") && !pathName.includes("\\microsoft\\") && !pathName.includes("system32");
  });
  return { ok: true, items };
}

function serviceControlPreview(name, action) {
  const details = buildServiceDetails(name);
  if (!details.ok) return details;
  const service = details.items[0];
  const classification = serviceRiskClassification(service, action);
  return {
    ok: true,
    items: {
      service,
      action,
      allowed: !classification.protected,
      classification,
      preview_command: `${action} ${service.name}`,
    },
  };
}

function performServiceControl(name, action, args = {}) {
  const preview = serviceControlPreview(name, action);
  if (!preview.ok) return preview;
  const service = preview.items.service;
  const dryRun = args.dry_run !== false;
  const approve = args.approve === true;
  const classification = preview.items.classification;
  if (classification.protected) {
    return makeBlocked(args.tool_id || action, `${action} service`, `Service ${service.name} is protected.`, preview.items, { risk_level: "critical" });
  }
  if (dryRun) {
    return makeResult(args.tool_id || action, `Previewed ${action} for ${service.name}.`, preview.items, { dry_run: true, risk_level: "high" });
  }
  if (!approve) {
    return makeBlocked(args.tool_id || action, `${action} service`, "Explicit approval is required for service control.", preview.items, { risk_level: "high" });
  }
  const commandMap = {
    start: ["Start-Service", service.name],
    stop: ["Stop-Service", service.name],
    restart: ["Restart-Service", service.name],
  };
  const command = commandMap[action];
  if (!command) return { ok: false, error: `Unsupported action ${action}.` };
  const script = `${command[0]} -Name '${command[1].replace(/'/g, "''")}' -ErrorAction Stop; 'ok'`;
  const response = runPowerShell(script);
  if (!response.ok) return makeResult(args.tool_id || action, `Failed to ${action} ${service.name}.`, preview.items, { ok: false, risk_level: "high", errors: [response.stderr || response.error || "Service control failed."] });
  return makeResult(args.tool_id || action, `${action[0].toUpperCase() + action.slice(1)}ed ${service.name}.`, { service, action, response: response.stdout.trim() }, { risk_level: "high" });
}

function buildProcessKillPreview(target, mode) {
  const inventory = collectProcessActionsContext();
  if (!inventory.ok) return inventory;
  const isPid = mode === "pid";
  const matches = inventory.items.filter((row) => isPid ? row.pid === Number(target) : normalizeLower(row.name) === normalizeLower(target));
  const risk = matches.some((row) => row.protected) ? "critical" : matches.some((row) => row.security || row.tooling) ? "high" : "high";
  return {
    ok: true,
    items: {
      target,
      mode,
      matches,
      risk,
      blocked: matches.some((row) => row.protected),
      preview_command: isPid ? `taskkill /PID ${target} /T /F` : `taskkill /IM ${normalizeImageName(target)} /T /F`,
    },
  };
}

function performProcessKill(toolId, target, mode, args = {}) {
  const preview = buildProcessKillPreview(target, mode);
  if (!preview.ok) return preview;
  const dryRun = args.dry_run !== false;
  const approve = args.approve === true;
  if (preview.items.blocked) {
    return makeBlocked(toolId, `Kill ${mode}`, "Protected processes cannot be terminated by this tool.", preview.items, { risk_level: "critical" });
  }
  if (dryRun) {
    return makeResult(toolId, `Previewed kill for ${mode} target ${target}.`, preview.items, { dry_run: true, risk_level: "high" });
  }
  if (!approve) {
    return makeBlocked(toolId, `Kill ${mode}`, "Explicit approval is required before terminating a process.", preview.items, { risk_level: "high" });
  }
  const commandArgs = mode === "pid" ? ["/PID", String(target), "/T", "/F"] : ["/IM", normalizeImageName(target), "/T", "/F"];
  const response = runCommand("taskkill.exe", commandArgs);
  if (!response.ok) {
    return makeResult(toolId, `Failed to terminate ${target}.`, preview.items, { ok: false, risk_level: "high", errors: [response.stderr || response.error || "taskkill failed."], dry_run: false });
  }
  return makeResult(toolId, `Terminated ${target}.`, { preview: preview.items, taskkill: response.stdout.trim() }, { risk_level: "high", dry_run: false });
}

function buildServicePolicy(args = {}) {
  const name = normalizeText(args.name || "");
  const action = normalizeLower(args.action || "stop");
  const inventory = collectServiceInventory();
  if (!inventory.ok) return inventory;
  const service = inventory.items.find((row) => normalizeLower(row.name) === normalizeLower(name) || normalizeLower(row.display_name) === normalizeLower(name));
  if (!service) return { ok: false, error: `Service ${name} not found.` };
  const classification = serviceRiskClassification(service, action);
  return { ok: true, items: { service, action, classification, allowed: !classification.protected } };
}

function buildProcessPolicy(args = {}) {
  const inventory = collectProcessActionsContext();
  if (!inventory.ok) return inventory;
  const pid = args.pid == null ? null : Number(args.pid);
  const name = normalizeText(args.name || "");
  const action = normalizeLower(args.action || "end");
  const row = inventory.items.find((item) => (pid && item.pid === pid) || (name && normalizeLower(item.name) === normalizeLower(name)));
  if (!row) return { ok: false, error: pid ? `PID ${pid} not found.` : `Process ${name} not found.` };
  const reasons = [];
  if (row.protected) reasons.push("Protected Windows process");
  if (row.security) reasons.push("Security software");
  if (row.tooling) reasons.push("Developer/runtime process");
  if (action === "end" && row.protected) reasons.push("Termination blocked for protected processes");
  if (action === "end" && row.security) reasons.push("Termination usually risky for security software");
  return {
    ok: true,
    items: {
      process: row,
      action,
      classification: row.protected ? "critical" : row.security ? "high" : row.tooling ? "medium" : "low",
      reasons,
      allowed: !row.protected,
      preview_command: pid ? `taskkill /PID ${pid} /T /F` : `taskkill /IM ${normalizeImageName(name)} /T /F`,
    },
  };
}

function buildProcessDetailsByPid(pid) {
  const inventory = collectProcessInventory();
  if (!inventory.ok) return inventory;
  const row = inventory.items.find((item) => item.pid === Number(pid));
  if (!row) return { ok: false, error: `PID ${pid} not found.` };
  return { ok: true, items: [row] };
}

function buildProcessDetailsByName(name) {
  const inventory = collectProcessInventory();
  if (!inventory.ok) return inventory;
  const normalized = normalizeLower(name);
  const items = inventory.items.filter((row) => normalizeLower(row.name) === normalized);
  if (!items.length) return { ok: false, error: `Process ${name} not found.` };
  return { ok: true, items };
}

function buildProcessExecutablePath(args = {}) {
  const result = args.pid != null ? buildProcessDetailsByPid(args.pid) : buildProcessDetailsByName(args.name || "");
  if (!result.ok) return result;
  return { ok: true, items: result.items.map((row) => ({ pid: row.pid, name: row.name, executable_path: row.executable_path })) };
}

function buildProcessCommandLine(args = {}) {
  const result = args.pid != null ? buildProcessDetailsByPid(args.pid) : buildProcessDetailsByName(args.name || "");
  if (!result.ok) return result;
  return { ok: true, items: result.items.map((row) => ({ pid: row.pid, name: row.name, command_line: row.command_line })) };
}

function buildDuplicateProcessNames() {
  const inventory = collectProcessInventory();
  if (!inventory.ok) return inventory;
  const groups = new Map();
  for (const row of inventory.items) {
    const key = normalizeLower(row.name);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  const items = [...groups.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([name, rows]) => ({ name, count: rows.length, pids: rows.map((row) => row.pid) }));
  return { ok: true, items };
}

function buildLongRunningProcesses(args = {}) {
  const inventory = collectProcessInventory();
  if (!inventory.ok) return inventory;
  const minAge = Number(args.min_age_minutes || 30);
  const items = inventory.items.filter((row) => ageMinutes(row.created_at) >= minAge);
  return { ok: true, items };
}

function buildLikelyIdleHeavyProcesses(args = {}) {
  const inventory = collectProcessInventory();
  if (!inventory.ok) return inventory;
  const minMemoryMb = Number(args.min_memory_mb || 250);
  const maxCpuPct = Number(args.max_cpu_pct || 1.5);
  const items = inventory.items.filter((row) => matchesIdleHeavy(row, minMemoryMb, maxCpuPct));
  return { ok: true, items };
}

function buildListRunningProcesses(args = {}) {
  return buildProcessList(args);
}

function buildTopCpuProcesses(args = {}) {
  return buildProcessList({ ...args, sort_by: "cpu_pct", sort_dir: "desc" });
}

function buildTopMemoryProcesses(args = {}) {
  return buildProcessList({ ...args, sort_by: "memory_mb", sort_dir: "desc" });
}

function buildProcessCount(args = {}) {
  const result = buildProcessList({ ...args, limit: 0 });
  if (!result.ok) return result;
  return { ok: true, items: { count: result.items.length } };
}

function buildDryRunKillProcessByPid(args = {}) {
  return buildProcessKillPreview(args.pid, "pid");
}

function buildDryRunKillProcessByName(args = {}) {
  return buildProcessKillPreview(args.name, "name");
}

function buildKillProcessByPid(args = {}) {
  return performProcessKill("kill_process_by_pid", args.pid, "pid", { ...args, tool_id: "kill_process_by_pid" });
}

function buildKillProcessByName(args = {}) {
  return performProcessKill("kill_process_by_name", args.name, "name", { ...args, tool_id: "kill_process_by_name" });
}

function buildProcessActionPolicy(args = {}) {
  return buildProcessPolicy(args);
}

function buildServiceActionPolicy(args = {}) {
  return buildServicePolicy(args);
}

function buildProtectedProcesses() {
  return {
    ok: true,
    items: {
      protected_process_names: PROTECTED_PROCESS_NAMES,
      security_process_names: SECURITY_PROCESS_NAMES,
      tooling_process_names: TOOLING_PROCESS_NAMES,
    },
  };
}

function buildProtectedServices() {
  return {
    ok: true,
    items: {
      protected_service_names: PROTECTED_SERVICE_NAMES,
    },
  };
}

function buildProcessHealthSnapshot() {
  const processes = buildTopMemoryProcesses({ limit: 10 });
  const cpu = buildCpuSummary(1);
  const memory = buildMemorySummary();
  const network = buildNetworkSummary();
  if (!processes.ok || !cpu.ok || !memory.ok || !network.ok) return processes;
  return {
    ok: true,
    items: {
      top_processes: processes.items,
      cpu: cpu.items,
      memory: memory.items,
      network: network.items,
    },
  };
}

function compareSnapshots(before, after) {
  const beforeCpu = parseNumber(before?.cpu?.current_cpu_pct || before?.cpu_pct || 0);
  const afterCpu = parseNumber(after?.cpu?.current_cpu_pct || after?.cpu_pct || 0);
  const beforeMemory = parseNumber(before?.memory?.used_memory_mb || before?.memory_mb || 0);
  const afterMemory = parseNumber(after?.memory?.used_memory_mb || after?.memory_mb || 0);
  return {
    cpu_delta_pct: Number((afterCpu - beforeCpu).toFixed(2)),
    memory_delta_mb: Number((afterMemory - beforeMemory).toFixed(2)),
    before,
    after,
  };
}

function readSnapshotInput(value) {
  if (!value) return null;
  const text = normalizeText(value);
  if (!text) return null;
  if (fs.existsSync(text)) {
    try {
      return JSON.parse(fs.readFileSync(text, "utf8"));
    } catch (error) {
      return { error: error.message, path: text };
    }
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    return { error: error.message, value: text };
  }
}

function buildBeforeAfterSnapshot(args = {}) {
  const before = readSnapshotInput(args.before_path || args.before || "");
  const after = readSnapshotInput(args.after_path || args.after || "");
  if (!before || !after) {
    return {
      ok: false,
      error: "Both before and after snapshots are required.",
      items: { before, after },
    };
  }
  return { ok: true, items: compareSnapshots(before, after) };
}

function buildDiagnosticsReport() {
  const machine = buildMachineSummary();
  const processes = buildTopMemoryProcesses({ limit: 10 });
  const services = buildServiceSummary({ limit: 10 });
  const network = buildNetworkSummary();
  const startup = buildStartupList({ limit: 10 });
  if (!machine.ok || !processes.ok || !services.ok || !network.ok || !startup.ok) return machine;
  return {
    ok: true,
    items: {
      machine: machine.items,
      top_processes: processes.items,
      top_services: services.items,
      network: network.items,
      startup: startup.items,
    },
  };
}

function buildMachineReadinessReport() {
  const checks = [
    "powershell.exe",
    "tasklist.exe",
    "taskkill.exe",
    "sc.exe",
    "schtasks.exe",
    "netstat.exe",
  ].map((command) => {
    const response = runCommand("where.exe", [command]);
    return {
      command,
      available: response.ok,
      output: normalizeText(response.stdout || response.stderr),
    };
  });
  const admin = (() => {
    try {
      const script = "[bool]([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator) | ConvertTo-Json -Compress";
      const result = jsonFromPowerShell(script);
      return result.ok ? Boolean(result.value) : null;
    } catch (error) {
      return null;
    }
  })();
  return {
    ok: true,
    items: {
      platform: process.platform,
      is_windows: isWindows(),
      admin,
      command_checks: checks,
      default_temp_paths: TEMP_PATHS,
      startup_locations: WINDOWS_STARTUP_LOCATIONS,
    },
  };
}

function buildRegistryStartupItems() {
  const inventory = collectStartupInventory();
  if (!inventory.ok) return inventory;
  return { ok: true, items: inventory.items.registry_run_keys };
}

function buildStartupFolderItems() {
  const inventory = collectStartupInventory();
  if (!inventory.ok) return inventory;
  return { ok: true, items: inventory.items.startup_folder_items };
}

function buildSuspiciousStartupCandidates() {
  const inventory = collectStartupInventory();
  if (!inventory.ok) return inventory;
  const all = [
    ...toArray(inventory.items.startup_commands).map((row) => ({ type: "startup_command", name: row.Name || row.name, command: row.Command || row.command, location: row.Location || row.location })),
    ...toArray(inventory.items.registry_run_keys).map((row) => ({ type: "registry_run", name: row.Name || row.name, command: row.Command || row.command, hive: row.Hive || row.hive })),
  ];
  const suspicious = all.filter((row) => {
    const text = normalizeLower(JSON.stringify(row));
    return ["\\temp\\", "/temp/", "powershell", "wscript", "cscript", "mshta", "cmd.exe", "curl", "bitsadmin", "appdata\\local\\temp"].some((needle) => text.includes(needle));
  });
  return { ok: true, items: suspicious };
}

function buildDuplicateStartupCandidates() {
  const inventory = collectStartupInventory();
  if (!inventory.ok) return inventory;
  const all = [
    ...toArray(inventory.items.startup_commands).map((row) => ({ name: normalizeText(row.Name || row.name), command: normalizeText(row.Command || row.command), type: "startup_command" })),
    ...toArray(inventory.items.registry_run_keys).map((row) => ({ name: normalizeText(row.Name || row.name), command: normalizeText(row.Command || row.command), type: "registry_run" })),
  ];
  const byName = new Map();
  const byCommand = new Map();
  for (const row of all) {
    const nameKey = normalizeLower(row.name);
    const commandKey = normalizeLower(row.command);
    if (!byName.has(nameKey)) byName.set(nameKey, []);
    if (!byCommand.has(commandKey)) byCommand.set(commandKey, []);
    byName.get(nameKey).push(row);
    byCommand.get(commandKey).push(row);
  }
  const items = [];
  for (const [name, rows] of byName.entries()) {
    if (rows.length > 1) items.push({ kind: "name", value: name, count: rows.length, entries: rows });
  }
  for (const [command, rows] of byCommand.entries()) {
    if (command && rows.length > 1) items.push({ kind: "command", value: command, count: rows.length, entries: rows });
  }
  return { ok: true, items };
}

function buildServiceListWithPreset(status) {
  return buildServiceSummary({ status });
}

function buildRunningServices() {
  return buildServiceListWithPreset("running");
}

function buildStoppedServices() {
  return buildServiceListWithPreset("stopped");
}

function buildAutoStartServices() {
  return buildServiceSummary({ start_type: "auto" });
}

function buildServiceDetailsByName(args = {}) {
  return buildServiceDetails(args.name || "");
}

function buildServiceControlPreview(args = {}) {
  return serviceControlPreview(args.name || "", normalizeLower(args.action || "stop"));
}

function buildStartServiceByName(args = {}) {
  return performServiceControl(args.name || "", "start", { ...args, tool_id: "start_service_by_name" });
}

function buildStopServiceByName(args = {}) {
  return performServiceControl(args.name || "", "stop", { ...args, tool_id: "stop_service_by_name" });
}

function buildRestartServiceByName(args = {}) {
  return performServiceControl(args.name || "", "restart", { ...args, tool_id: "restart_service_by_name" });
}

function buildListListeningPorts(args = {}) {
  return buildListeningPorts(args);
}

function buildListEstablishedConnections(args = {}) {
  return buildEstablishedConnections(args);
}

function buildBasicNetworkActivitySummary() {
  return buildNetworkSummary();
}

function buildLocalNetworkDiagnosticsSummary() {
  return buildLocalNetworkDiagnostics();
}

function buildProcessPortMappingSummary(args = {}) {
  return buildProcessPortMapping(args);
}

function buildTempCleanupCandidates() {
  return { ok: true, items: collectTempCandidates() };
}

function buildStaleLogCandidates() {
  return { ok: true, items: collectLogCandidates() };
}

function buildGenerateProcessHealthSnapshot() {
  return buildProcessHealthSnapshot();
}

function buildGenerateDiagnosticsReport() {
  return buildDiagnosticsReport();
}

function buildGenerateMachineReadinessReport() {
  return buildMachineReadinessReport();
}

function buildRegistrySearch(query) {
  const needle = normalizeLower(query);
  const tools = getRegistryTools();
  const aliases = getRegistryAliases();
  const aliasHits = [];
  for (const [phrase, toolId] of Object.entries(aliases)) {
    if (normalizeLower(phrase).includes(needle)) aliasHits.push({ phrase, tool_id: toolId });
  }
  const toolsMatches = tools.filter((tool) => {
    const hay = [tool.id, tool.title, tool.description, ...(tool.tags || []), ...(tool.intent_examples || []), ...(tool.avoid_if || [])].join(" ").toLowerCase();
    return hay.includes(needle);
  });
  return { ok: true, items: { query, alias_hits: aliasHits.slice(0, 20), tools: toolsMatches.slice(0, 25) } };
}

function buildGuardedListProcessesExt(args) {
  return runExternalPackTool("guarded_tool_pack_v2/guarded_tool_pack_v2/run-tool.js", "list_processes", args);
}

function buildGuardedListListeningPortsExt(args) {
  return runExternalPackTool("guarded_tool_pack_v2/guarded_tool_pack_v2/run-tool.js", "list_listening_ports", args);
}

function buildGuardedListServicesExt(args) {
  return runExternalPackTool("guarded_tool_pack_v2/guarded_tool_pack_v2/run-tool.js", "list_services", args);
}

function buildRepoRegistrySearchExt(args) {
  return runExternalPackTool("repo_coder_tool_pack_v3/repo_coder_tool_pack_v3/run-tool.js", "registry_search", args);
}

function buildRepoLikelyEntrypointsExt(args) {
  return runExternalPackTool("repo_coder_tool_pack_v3/repo_coder_tool_pack_v3/run-tool.js", "likely_entrypoints", args);
}

function buildRepoGenerateLowTokenPackExt(args) {
  return runExternalPackTool("repo_coder_tool_pack_v3/repo_coder_tool_pack_v3/run-tool.js", "generate_low_token_pack", args);
}

function listTools(args = {}) {
  const tools = getRegistryTools();
  const category = normalizeLower(args.category || "");
  let items = tools;
  if (category) items = items.filter((tool) => normalizeLower(tool.category) === category);
  const risk = normalizeLower(args.risk_level || "");
  if (risk) items = items.filter((tool) => normalizeLower(tool.risk_level) === risk);
  const limit = Number(args.limit || 0);
  if (limit > 0) items = items.slice(0, limit);
  return { ok: true, items };
}

function getToolInfo(toolId) {
  const toolMap = getToolMap();
  const tool = toolMap.get(toolId);
  if (!tool) return { ok: false, error: `Tool ${toolId} not found.` };
  return { ok: true, items: tool };
}

function resolveToolId(toolId) {
  const toolMap = getToolMap();
  if (toolMap.has(toolId)) return toolId;
  const aliases = getRegistryAliases();
  const resolved = aliases[normalizeLower(toolId)];
  return resolved || toolId;
}

const TOOL_HANDLERS = {
  list_running_processes: buildListRunningProcesses,
  top_cpu_processes: buildTopCpuProcesses,
  top_memory_processes: buildTopMemoryProcesses,
  process_details_by_pid: (args) => buildProcessDetailsByPid(args.pid),
  process_details_by_name: (args) => buildProcessDetailsByName(args.name),
  process_tree_by_pid: (args) => buildProcessTree(args.pid),
  process_executable_path: buildProcessExecutablePath,
  process_command_line: buildProcessCommandLine,
  process_count: buildProcessCount,
  duplicate_process_names: buildDuplicateProcessNames,
  long_running_processes: buildLongRunningProcesses,
  likely_idle_heavy_processes: buildLikelyIdleHeavyProcesses,
  process_risk_classification: buildProcessActionPolicy,
  dry_run_kill_process_by_pid: buildDryRunKillProcessByPid,
  kill_process_by_pid: buildKillProcessByPid,
  dry_run_kill_process_by_name: buildDryRunKillProcessByName,
  kill_process_by_name: buildKillProcessByName,
  cpu_summary: buildCpuSummary,
  memory_summary: buildMemorySummary,
  disk_usage_summary: buildDiskSummary,
  uptime_summary: buildUptimeSummary,
  machine_summary: buildMachineSummary,
  os_version_summary: buildOsVersionSummary,
  live_counter_snapshot: buildLiveCounterSnapshot,
  threshold_warning_report: buildThresholdWarningReport,
  running_services: buildRunningServices,
  stopped_services: buildStoppedServices,
  service_details_by_name: buildServiceDetailsByName,
  auto_start_services: buildAutoStartServices,
  non_microsoft_services: buildNonMicrosoftServices,
  service_control_preview: buildServiceControlPreview,
  start_service_by_name: buildStartServiceByName,
  stop_service_by_name: buildStopServiceByName,
  restart_service_by_name: buildRestartServiceByName,
  list_startup_entries: buildStartupList,
  startup_folder_items: buildStartupFolderItems,
  registry_startup_items: buildRegistryStartupItems,
  scheduled_tasks_summary: () => collectTaskSummary(),
  suspicious_startup_candidates: buildSuspiciousStartupCandidates,
  duplicate_startup_candidates: buildDuplicateStartupCandidates,
  list_listening_ports: buildListListeningPorts,
  list_established_connections: buildListEstablishedConnections,
  process_port_mapping: buildProcessPortMappingSummary,
  basic_network_activity_summary: buildBasicNetworkActivitySummary,
  local_network_diagnostics_summary: buildLocalNetworkDiagnosticsSummary,
  temp_cleanup_candidates: buildTempCleanupCandidates,
  stale_log_candidates: buildStaleLogCandidates,
  generate_diagnostics_report: buildGenerateDiagnosticsReport,
  generate_machine_readiness_report: buildGenerateMachineReadinessReport,
  generate_process_health_snapshot: buildGenerateProcessHealthSnapshot,
  before_after_optimization_snapshot: buildBeforeAfterSnapshot,
  protected_processes: buildProtectedProcesses,
  protected_services: buildProtectedServices,
  process_action_policy: buildProcessActionPolicy,
  service_action_policy: buildServiceActionPolicy,
  guarded_list_processes_ext: buildGuardedListProcessesExt,
  guarded_list_listening_ports_ext: buildGuardedListListeningPortsExt,
  guarded_list_services_ext: buildGuardedListServicesExt,
  repo_registry_search_ext: buildRepoRegistrySearchExt,
  repo_likely_entrypoints_ext: buildRepoLikelyEntrypointsExt,
  repo_generate_low_token_pack_ext: buildRepoGenerateLowTokenPackExt,
};

function normalizeToolResult(toolId, result, toolMeta, args) {
  if (result == null) {
    return makeResult(toolId, "No data returned.", null, { ok: false, risk_level: toolMeta.risk_level });
  }
  if (result.ok === false && result.blocked) return result;
  if (result.ok === false) {
    return {
      ok: false,
      tool_id: toolId,
      summary: result.summary || `Tool ${toolId} failed.`,
      data: result.data || null,
      warnings: result.warnings || [],
      errors: result.errors || [result.error || "Tool failed."],
      meta: {
        timestamp: nowIso(),
        source: result.meta?.source || "powershell",
        risk_level: toolMeta.risk_level,
        dry_run: result.meta?.dry_run === true,
      },
    };
  }
  if (result.tool_id) return result;
  return makeResult(toolId, result.summary || `${toolId} completed.`, result.items !== undefined ? result.items : result.data, {
    warnings: result.warnings || [],
    source: result.meta?.source || "powershell",
    risk_level: result.meta?.risk_level || toolMeta.risk_level,
    dry_run: result.meta?.dry_run === true || args.dry_run === true,
  });
}

function gateTool(toolMeta, args) {
  const highRisk = ["high", "critical"].includes(normalizeLower(toolMeta.risk_level));
  const mediumRisk = normalizeLower(toolMeta.risk_level) === "medium";
  const dryRun = args.dry_run !== false;
  if (toolMeta.supports_dry_run && dryRun && (highRisk || mediumRisk || toolMeta.requires_confirmation)) {
    return { dry_run: true };
  }
  if ((highRisk || toolMeta.requires_confirmation) && !args.approve) {
    return makeBlocked(toolMeta.id, toolMeta.title, "Explicit approval is required for this action.", { tool_id: toolMeta.id, dry_run: true, requested_args: args }, { risk_level: toolMeta.risk_level });
  }
  return { dry_run: false };
}

function runTool(toolId, args = {}) {
  const toolMap = getToolMap();
  const resolved = resolveToolId(toolId);
  const toolMeta = toolMap.get(resolved);
  if (!toolMeta) {
    return {
      ok: false,
      tool_id: toolId,
      summary: `Tool ${toolId} was not found.`,
      data: null,
      warnings: [],
      errors: ["Unknown tool id."],
      meta: { timestamp: nowIso(), source: "registry", risk_level: "low", dry_run: true },
    };
  }
  const handler = TOOL_HANDLERS[toolMeta.id];
  if (!handler) {
    return {
      ok: false,
      tool_id: toolMeta.id,
      summary: `Tool ${toolMeta.id} has no handler.`,
      data: null,
      warnings: [],
      errors: ["No handler registered."],
      meta: { timestamp: nowIso(), source: "registry", risk_level: toolMeta.risk_level, dry_run: true },
    };
  }
  const gate = gateTool(toolMeta, args);
  if (gate.blocked) return gate;
  const rawResult = handler(args);
  const normalized = normalizeToolResult(toolMeta.id, rawResult, toolMeta, args);
  if (gate.dry_run && toolMeta.supports_dry_run) {
    return makeResult(toolMeta.id, `Dry run preview for ${toolMeta.title}.`, normalized.data || normalized.items || null, {
      warnings: normalized.warnings || [],
      source: normalized.meta?.source || "powershell",
      risk_level: toolMeta.risk_level,
      dry_run: true,
    });
  }
  return normalized;
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function main(argv = process.argv) {
  const args = parseCliArgs(argv);
  const command = normalizeText(args._[0] || "");
  if (!command || command === "help" || command === "--help" || command === "-h") {
    return printJson({
      ok: true,
      summary: "Task Manager brain scripts runner.",
      usage: [
        "node run-tool.js list_tools",
        "node run-tool.js registry_search --query \"top memory\"",
        "node run-tool.js top_memory_processes --limit 15",
        "node run-tool.js kill_process_by_pid --pid 1234 --approve true --dry_run false",
      ],
      categories: getCategoryCounts(),
    });
  }
  if (command === "list_tools") {
    return printJson(listTools(args));
  }
  if (command === "registry_search") {
    return printJson(buildRegistrySearch(args.query || ""));
  }
  if (command === "tool_info") {
    return printJson(getToolInfo(args.id || args.tool_id || ""));
  }
  if (command === "playbooks") {
    return printJson({ ok: true, items: getPlaybooks() });
  }
  const result = runTool(command, args);
  return printJson(result);
}

module.exports = {
  PROTECTED_PROCESS_NAMES,
  PROTECTED_SERVICE_NAMES,
  SECURITY_PROCESS_NAMES,
  TOOLING_PROCESS_NAMES,
  runTool,
  main,
  listTools,
  getToolInfo,
  buildRegistrySearch,
  getRegistryTools,
  getRegistryAliases,
  getPlaybooks,
  getCategoryCounts,
  parseCliArgs,
};
