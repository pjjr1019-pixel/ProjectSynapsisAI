
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const cp = require('child_process');

const registryPath = path.join(__dirname, '..', 'registry', 'tools_index.json');
const playbookPath = path.join(__dirname, '..', 'registry', 'playbooks.json');
const toolIndex = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const playbooks = JSON.parse(fs.readFileSync(playbookPath, 'utf8'));
const toolMap = Object.fromEntries(toolIndex.map(t => [t.id, t]));
const playbookMap = Object.fromEntries(playbooks.map(p => [p.id, p]));

const CRITICAL_PROCESS_NAMES = new Set([
  'system','system idle process','idle','registry','smss.exe','csrss.exe','wininit.exe','services.exe',
  'lsass.exe','winlogon.exe','fontdrvhost.exe','dwm.exe','svchost.exe','explorer.exe','spoolsv.exe',
  'init','systemd','launchd','kernel_task','loginwindow','sshd'
]);
const BACKGROUND_LIKE_PATTERNS = [
  /helper/i,/update/i,/updater/i,/service/i,/tray/i,/agent/i,/runtime/i,/watcher/i,/daemon/i,/host/i
];

function parseArgValue(value) {
  if (value === undefined) return true;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  if (/^-?\d+\.\d+$/.test(value)) return Number(value);
  if ((value.startsWith('[') && value.endsWith(']')) || (value.startsWith('{') && value.endsWith('}'))) {
    try { return JSON.parse(value); } catch (_) {}
  }
  return value;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2).replace(/-/g, '_');
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) args[key] = true;
      else { args[key] = parseArgValue(next); i += 1; }
    } else if (!args._) {
      args._ = [];
      args._.push(token);
    } else {
      args._.push(token);
    }
  }
  return args;
}

function resolvePathMaybe(p) {
  if (!p || typeof p !== 'string') return p;
  return path.resolve(process.cwd(), p);
}

function mkdirForFile(filePath) {
  fs.mkdirSync(path.dirname(resolvePathMaybe(filePath)), { recursive: true });
}

function hashText(text) {
  return crypto.createHash('sha256').update(String(text)).digest('hex');
}

function buildResult(tool, args, data, warnings = []) {
  return {
    ok: true,
    tool_id: tool.id,
    title: tool.title,
    category: tool.category,
    risk_level: tool.risk_level,
    requires_confirmation: tool.requires_confirmation,
    args,
    data,
    warnings
  };
}

function blockedResult(tool, args, reason, preview = null, warnings = []) {
  return {
    ok: false,
    blocked: true,
    tool_id: tool.id,
    title: tool.title,
    category: tool.category,
    risk_level: tool.risk_level,
    requires_confirmation: tool.requires_confirmation,
    args,
    reason,
    preview,
    warnings
  };
}

function runCommand(command, options = {}) {
  try {
    const result = cp.execSync(command, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: options.maxBuffer || 40 * 1024 * 1024
    });
    return { ok: true, stdout: result, stderr: '' };
  } catch (error) {
    return {
      ok: false,
      stdout: error.stdout ? String(error.stdout) : '',
      stderr: error.stderr ? String(error.stderr) : error.message
    };
  }
}

function runPowerShell(script) {
  return runCommand(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${script.replace(/"/g, '\\"')}"`);
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) return [value];
  return [];
}

function loadNameList(args, kind) {
  const direct = args[kind];
  const pathArg = args[`${kind}_path`];
  let items = [];
  if (Array.isArray(direct)) items = direct;
  else if (typeof direct === 'string' && direct.trim()) items = direct.split(',').map(s => s.trim()).filter(Boolean);
  else if (pathArg) {
    try {
      const raw = fs.readFileSync(resolvePathMaybe(pathArg), 'utf8');
      const parsed = JSON.parse(raw);
      items = Array.isArray(parsed) ? parsed : [];
    } catch (_) {}
  }
  return new Set(items.map(x => String(x).toLowerCase()));
}

function limitItems(items, limit) {
  const n = Number.isFinite(limit) ? limit : (typeof limit === 'number' ? limit : undefined);
  if (!n || n <= 0) return items;
  return items.slice(0, n);
}

function sortItems(items, sortBy, sortDir = 'desc') {
  const dir = String(sortDir).toLowerCase() === 'asc' ? 1 : -1;
  return items.slice().sort((a, b) => {
    const av = a[sortBy];
    const bv = b[sortBy];
    if (typeof av === 'string' || typeof bv === 'string') return String(av || '').localeCompare(String(bv || '')) * dir;
    return ((av || 0) - (bv || 0)) * dir;
  });
}

function parseElapsedToSeconds(value) {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  // dd-hh:mm:ss / hh:mm:ss / mm:ss
  let days = 0, rest = s;
  if (s.includes('-')) {
    const parts = s.split('-');
    days = Number(parts[0]) || 0;
    rest = parts.slice(1).join('-');
  }
  const chunks = rest.split(':').map(x => Number(x) || 0);
  let hh = 0, mm = 0, ss = 0;
  if (chunks.length === 3) [hh, mm, ss] = chunks;
  else if (chunks.length === 2) [mm, ss] = chunks;
  else if (chunks.length === 1) ss = chunks[0];
  return days * 86400 + hh * 3600 + mm * 60 + ss;
}

function guessCritical(name) {
  const n = String(name || '').toLowerCase();
  return CRITICAL_PROCESS_NAMES.has(n);
}

function backgroundLike(name) {
  const n = String(name || '');
  return BACKGROUND_LIKE_PATTERNS.some(re => re.test(n));
}

function normalizeProcessRows(rows) {
  return toArray(rows).map((row) => {
    const pid = Number(row.pid ?? row.PID ?? row.Id ?? row.ProcessId ?? row.processid ?? 0) || 0;
    const ppid = Number(row.ppid ?? row.PPID ?? row.ParentProcessId ?? row.parentprocessid ?? 0) || null;
    const name = String(row.name ?? row.Name ?? row.ProcessName ?? row.processname ?? row.COMM ?? row.command ?? row.Command ?? '').trim();
    const cpu_pct = Number(row.cpu_pct ?? row.CPU ?? row['%CPU'] ?? row.pcputime ?? 0) || 0;
    const mem_pct = Number(row.mem_pct ?? row['%MEM'] ?? 0) || 0;
    const ws_mb = Number(row.ws_mb ?? row.WSMB ?? row.working_set_mb ?? row.WorkingSetMB ?? row.workingSetMB ?? 0) || 0;
    const rss_kb = Number(row.rss_kb ?? row.RSS ?? row.rss ?? 0) || 0;
    const memory_mb = ws_mb || (rss_kb ? Number((rss_kb / 1024).toFixed(2)) : 0);
    const handles = Number(row.handles ?? row.Handles ?? row.HandleCount ?? 0) || 0;
    const threads = Number(row.threads ?? row.Threads ?? row.ThreadCount ?? 0) || 0;
    const state = String(row.state ?? row.State ?? '').trim();
    const elapsed_raw = row.elapsed ?? row.Elapsed ?? row.etime ?? row.ETIME ?? '';
    const elapsed_seconds = typeof elapsed_raw === 'number' ? elapsed_raw : parseElapsedToSeconds(elapsed_raw);
    return {
      pid,
      ppid,
      name,
      cpu_pct: Number(cpu_pct.toFixed ? cpu_pct.toFixed(2) : cpu_pct),
      mem_pct: Number(mem_pct.toFixed ? mem_pct.toFixed(2) : mem_pct),
      memory_mb: Number(memory_mb.toFixed ? memory_mb.toFixed(2) : memory_mb),
      rss_kb: Number(rss_kb || 0),
      handles,
      threads,
      state,
      elapsed_seconds,
      critical: guessCritical(name),
      raw: row
    };
  });
}

function getProcesses() {
  if (process.platform === 'win32') {
    const script = [
      "$rows = Get-Process | Select-Object Id, ProcessName, CPU, Handles, @{Name='Threads';Expression={$_.Threads.Count}}, @{Name='WSMB';Expression={[math]::Round($_.WS/1MB,2)}};",
      "if ($rows -eq $null) { '[]' } else { $rows | ConvertTo-Json -Depth 3 -Compress }"
    ].join(' ');
    const res = runPowerShell(script);
    if (!res.ok) return { ok: false, error: res.stderr || 'Failed to list processes.' };
    let rows = [];
    try { rows = JSON.parse(res.stdout || '[]'); } catch (e) { return { ok: false, error: 'Failed to parse process JSON.' }; }
    return { ok: true, items: normalizeProcessRows(rows) };
  }

  const res = runCommand("ps -eo pid=,ppid=,comm=,%cpu=,%mem=,rss=,etime=,state= --no-headers");
  if (!res.ok) return { ok: false, error: res.stderr || 'Failed to list processes.' };
  const rows = String(res.stdout || '').split(/\r?\n/).filter(Boolean).map(line => {
    const m = line.trim().match(/^(\d+)\s+(\d+)\s+(\S+)\s+([0-9.]+)\s+([0-9.]+)\s+(\d+)\s+(\S+)\s+(\S+)$/);
    if (!m) return null;
    return {
      pid: Number(m[1]),
      ppid: Number(m[2]),
      name: m[3],
      cpu_pct: Number(m[4]),
      mem_pct: Number(m[5]),
      rss_kb: Number(m[6]),
      elapsed: m[7],
      state: m[8]
    };
  }).filter(Boolean);
  return { ok: true, items: normalizeProcessRows(rows) };
}

function applyProcessFilters(items, args, defaults = {}) {
  let out = items.slice();
  const pid = Number(args.pid || defaults.pid || 0);
  if (pid) out = out.filter(p => p.pid === pid);
  const query = String(args.query || defaults.query || '').trim().toLowerCase();
  const nameFilterMode = args.name_filter_mode || defaults.nameFilterMode || 'contains';
  if (query) {
    if (nameFilterMode === 'exact') out = out.filter(p => p.name.toLowerCase() === query);
    else out = out.filter(p => p.name.toLowerCase().includes(query));
  }
  const minMemory = Number(args.min_memory_mb ?? defaults.min_memory_mb ?? 0);
  const maxMemory = Number(args.max_memory_mb ?? defaults.max_memory_mb ?? Infinity);
  const minCpu = Number(args.min_cpu_pct ?? defaults.min_cpu_pct ?? 0);
  const maxCpu = Number(args.max_cpu_pct ?? defaults.max_cpu_pct ?? Infinity);
  const minThreads = Number(args.min_threads ?? defaults.min_threads ?? 0);
  const minHandles = Number(args.min_handles ?? defaults.min_handles ?? 0);
  const minElapsed = Number(args.min_elapsed_seconds ?? defaults.min_elapsed_seconds ?? 0);
  if (minMemory > 0) out = out.filter(p => p.memory_mb >= minMemory);
  if (Number.isFinite(maxMemory)) out = out.filter(p => p.memory_mb <= maxMemory);
  if (minCpu > 0) out = out.filter(p => p.cpu_pct >= minCpu);
  if (Number.isFinite(maxCpu)) out = out.filter(p => p.cpu_pct <= maxCpu);
  if (minThreads > 0) out = out.filter(p => p.threads >= minThreads);
  if (minHandles > 0) out = out.filter(p => p.handles >= minHandles);
  if (minElapsed > 0) out = out.filter(p => (p.elapsed_seconds || 0) >= minElapsed);
  const criticalOnly = args.critical_only === true || defaults.criticalOnly === true;
  const nonCriticalOnly = args.non_critical_only === true || defaults.nonCriticalOnly === true;
  if (criticalOnly) out = out.filter(p => p.critical);
  if (nonCriticalOnly) out = out.filter(p => !p.critical);
  const backgroundReq = args.background_like === true || defaults.backgroundLike === true;
  if (backgroundReq) out = out.filter(p => backgroundLike(p.name));
  const sortBy = args.sort_by || defaults.sortBy;
  const sortDir = args.sort_dir || defaults.sortDir || 'desc';
  if (sortBy) out = sortItems(out, sortBy, sortDir);
  return out;
}

function pickFields(items, fields) {
  if (!Array.isArray(fields) || !fields.length) return items;
  return items.map(item => {
    const out = {};
    for (const f of fields) out[f] = item[f];
    return out;
  });
}

function summarizeProcesses(items) {
  const totalMemoryMb = items.reduce((n, p) => n + (p.memory_mb || 0), 0);
  const totalCpuPct = items.reduce((n, p) => n + (p.cpu_pct || 0), 0);
  const totalThreads = items.reduce((n, p) => n + (p.threads || 0), 0);
  const totalHandles = items.reduce((n, p) => n + (p.handles || 0), 0);
  const criticalCount = items.filter(p => p.critical).length;
  return {
    count: items.length,
    total_memory_mb: Number(totalMemoryMb.toFixed(2)),
    total_cpu_pct: Number(totalCpuPct.toFixed(2)),
    total_threads: totalThreads,
    total_handles: totalHandles,
    critical_count: criticalCount,
    unique_names: new Set(items.map(p => p.name.toLowerCase())).size
  };
}

function getServices() {
  if (process.platform === 'win32') {
    const script = [
      "$rows = Get-Service | Select-Object Name, DisplayName, Status, StartType;",
      "if ($rows -eq $null) { '[]' } else { $rows | ConvertTo-Json -Depth 3 -Compress }"
    ].join(' ');
    const res = runPowerShell(script);
    if (!res.ok) return { ok: false, error: res.stderr || 'Failed to list services.' };
    try {
      const rows = JSON.parse(res.stdout || '[]');
      return { ok: true, items: toArray(rows).map(r => ({
        name: String(r.Name || '').trim(),
        display_name: String(r.DisplayName || '').trim(),
        status: String(r.Status || '').trim().toLowerCase(),
        start_type: String(r.StartType || '').trim().toLowerCase()
      })) };
    } catch (_) { return { ok: false, error: 'Failed to parse service JSON.' }; }
  }

  const units = runCommand("systemctl list-units --type=service --all --no-legend --no-pager");
  const files = runCommand("systemctl list-unit-files --type=service --no-legend --no-pager");
  if (!units.ok && !files.ok) return { ok: false, error: (units.stderr || files.stderr || 'Failed to list services.') };
  const startTypes = {};
  if (files.ok) {
    String(files.stdout || '').split(/\r?\n/).filter(Boolean).forEach(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) startTypes[parts[0].replace(/\.service$/, '')] = parts[1].toLowerCase();
    });
  }
  const items = [];
  if (units.ok) {
    String(units.stdout || '').split(/\r?\n/).filter(Boolean).forEach(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 4) return;
      const unit = parts[0];
      const load = parts[1];
      const active = parts[2];
      const sub = parts[3];
      const name = unit.replace(/\.service$/, '');
      items.push({
        name,
        display_name: name,
        status: active.toLowerCase(),
        sub_status: sub.toLowerCase(),
        start_type: startTypes[name] || ''
      });
    });
  }
  return { ok: true, items };
}

function applyServiceFilters(items, args, defaults = {}) {
  let out = items.slice();
  const query = String(args.query || defaults.query || '').trim().toLowerCase();
  const mode = args.name_filter_mode || defaults.nameFilterMode || 'contains';
  if (query) {
    out = out.filter(s => {
      const hay = `${s.name} ${s.display_name}`.toLowerCase();
      return mode === 'exact' ? (s.name.toLowerCase() === query || s.display_name.toLowerCase() === query) : hay.includes(query);
    });
  }
  const status = String(args.status || defaults.status || '').toLowerCase();
  if (status) out = out.filter(s => s.status === status);
  const startType = String(args.start_type || defaults.startType || '').toLowerCase();
  if (startType) out = out.filter(s => (s.start_type || '').includes(startType));
  return out;
}

function getStartupEntries() {
  if (process.platform === 'win32') {
    const script = [
      "$rows = Get-CimInstance Win32_StartupCommand | Select-Object Name, Command, Location, User;",
      "if ($rows -eq $null) { '[]' } else { $rows | ConvertTo-Json -Depth 3 -Compress }"
    ].join(' ');
    const res = runPowerShell(script);
    if (!res.ok) return { ok: false, error: res.stderr || 'Failed to list startup entries.' };
    try {
      const rows = JSON.parse(res.stdout || '[]');
      return { ok: true, items: toArray(rows).map(r => ({
        name: String(r.Name || '').trim(),
        command: String(r.Command || '').trim(),
        location: String(r.Location || '').trim(),
        user: String(r.User || '').trim()
      })) };
    } catch (_) { return { ok: false, error: 'Failed to parse startup JSON.' }; }
  }

  const locations = [
    path.join(os.homedir(), '.config', 'autostart'),
    '/etc/xdg/autostart'
  ];
  const items = [];
  for (const loc of locations) {
    if (!fs.existsSync(loc)) continue;
    for (const name of fs.readdirSync(loc)) {
      const p = path.join(loc, name);
      if (!fs.statSync(p).isFile()) continue;
      const text = fs.readFileSync(p, 'utf8');
      const execLine = (text.match(/^Exec=(.*)$/m) || [null, ''])[1] || '';
      items.push({ name, command: execLine.trim(), location: loc, user: loc.includes(os.homedir()) ? os.userInfo().username : 'system' });
    }
  }
  return { ok: true, items };
}

function applyStartupFilters(items, args, defaults = {}) {
  let out = items.slice();
  const query = String(args.query || defaults.query || '').trim().toLowerCase();
  const queryField = String(args.query_field || defaults.queryField || '').toLowerCase();
  if (query) {
    out = out.filter(x => {
      const hay = queryField === 'command' ? x.command.toLowerCase() : `${x.name} ${x.command}`.toLowerCase();
      return hay.includes(query);
    });
  }
  return out;
}

function parseAddressPort(value) {
  const s = String(value || '').trim();
  if (!s) return { address: '', port: null };
  const idx = s.lastIndexOf(':');
  if (idx <= 0) return { address: s, port: null };
  const address = s.slice(0, idx).replace(/^\[|\]$/g, '');
  const port = Number(s.slice(idx + 1)) || null;
  return { address, port };
}

function getConnections() {
  if (process.platform === 'win32') {
    const res = runCommand('netstat -ano');
    if (!res.ok) return { ok: false, error: res.stderr || 'Failed to list network connections.' };
    const items = [];
    String(res.stdout || '').split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || /^(Proto|Active)/i.test(trimmed)) return;
      const parts = trimmed.split(/\s+/);
      if (parts.length < 4) return;
      const proto = parts[0].toLowerCase();
      if (proto === 'tcp' && parts.length >= 5) {
        const local = parseAddressPort(parts[1]);
        const remote = parseAddressPort(parts[2]);
        items.push({
          proto,
          local_address: local.address,
          local_port: local.port,
          remote_address: remote.address,
          remote_port: remote.port,
          state: parts[3],
          pid: Number(parts[4]) || null,
          process_name: ''
        });
      } else if (proto === 'udp' && parts.length >= 4) {
        const local = parseAddressPort(parts[1]);
        items.push({
          proto,
          local_address: local.address,
          local_port: local.port,
          remote_address: '',
          remote_port: null,
          state: 'NONE',
          pid: Number(parts[3]) || null,
          process_name: ''
        });
      }
    });
    return { ok: true, items };
  }

  const res = runCommand('ss -tunapH');
  if (!res.ok) return { ok: false, error: res.stderr || 'Failed to list network connections.' };
  const items = [];
  String(res.stdout || '').split(/\r?\n/).filter(Boolean).forEach(line => {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 5) return;
    const proto = String(parts[0]).toLowerCase();
    const state = parts[1];
    const local = parseAddressPort(parts[4] || '');
    const remote = parseAddressPort(parts[5] || '');
    const extra = parts.slice(6).join(' ');
    const pidMatch = extra.match(/pid=(\d+)/);
    const nameMatch = extra.match(/"([^"]+)"/);
    items.push({
      proto,
      local_address: local.address,
      local_port: local.port,
      remote_address: remote.address,
      remote_port: remote.port,
      state,
      pid: pidMatch ? Number(pidMatch[1]) : null,
      process_name: nameMatch ? nameMatch[1] : ''
    });
  });
  return { ok: true, items };
}

function applyNetworkFilters(items, args, defaults = {}) {
  let out = items.slice();
  const proto = String(args.proto || defaults.proto || '').toLowerCase();
  if (proto) out = out.filter(x => x.proto === proto);
  const state = String(args.state || defaults.state || '').toUpperCase();
  if (state) out = out.filter(x => String(x.state || '').toUpperCase() === state);
  const pid = Number(args.pid || defaults.pid || 0);
  if (pid) out = out.filter(x => x.pid === pid);
  const port = Number(args.port || args.local_port || defaults.port || 0);
  if (port) out = out.filter(x => x.local_port === port || x.remote_port === port);
  const query = String(args.query || defaults.query || '').toLowerCase();
  const qf = String(args.query_field || defaults.queryField || '').toLowerCase();
  if (query) {
    out = out.filter(x => {
      const hay = qf === 'process_name' ? String(x.process_name || '').toLowerCase() :
        `${x.local_address}:${x.local_port} ${x.remote_address}:${x.remote_port} ${x.process_name}`.toLowerCase();
      return hay.includes(query);
    });
  }
  const listeningOnly = args.listening_only === true || defaults.listeningOnly === true;
  if (listeningOnly) out = out.filter(x => ['LISTEN', 'LISTENING'].includes(String(x.state || '').toUpperCase()) || (x.proto === 'udp' && x.local_port));
  const suspiciousRemotePorts = args.suspicious_remote_ports === true || defaults.suspiciousRemotePorts === true;
  if (suspiciousRemotePorts) out = out.filter(x => x.remote_port && (x.remote_port >= 40000 || [4444,5555,6667,1337].includes(x.remote_port)));
  return out;
}

function systemInfo(kind) {
  const cpus = os.cpus() || [];
  const totalmem = os.totalmem();
  const freemem = os.freemem();
  const base = {
    platform: process.platform,
    release: os.release(),
    arch: os.arch(),
    hostname: os.hostname(),
    uptime_seconds: os.uptime(),
    temp_dir: os.tmpdir()
  };
  if (kind === 'memory') return { ...base, total_mb: Number((totalmem/1024/1024).toFixed(2)), free_mb: Number((freemem/1024/1024).toFixed(2)), used_mb: Number(((totalmem-freemem)/1024/1024).toFixed(2)) };
  if (kind === 'cpu') return { ...base, cpu_count: cpus.length, cpu_model: cpus[0] ? cpus[0].model : '', loadavg: os.loadavg().map(x => Number(x.toFixed(2))) };
  if (kind === 'uptime') return { ...base, uptime_seconds: os.uptime() };
  if (kind === 'hostname') return { ...base };
  if (kind === 'os') return { ...base };
  if (kind === 'tempdir') {
    let exists = false, itemCount = null;
    try {
      exists = fs.existsSync(os.tmpdir());
      itemCount = exists ? fs.readdirSync(os.tmpdir()).length : null;
    } catch (_) {}
    return { ...base, exists, item_count: itemCount };
  }
  return {
    ...base,
    cpu_count: cpus.length,
    cpu_model: cpus[0] ? cpus[0].model : '',
    total_mb: Number((totalmem/1024/1024).toFixed(2)),
    free_mb: Number((freemem/1024/1024).toFixed(2)),
    used_mb: Number(((totalmem-freemem)/1024/1024).toFixed(2)),
    loadavg: os.loadavg().map(x => Number(x.toFixed(2)))
  };
}

function walkFiles(root, opts = {}) {
  const out = [];
  const maxDepth = Number.isFinite(opts.maxDepth) ? opts.maxDepth : Infinity;
  const now = Date.now();
  function visit(current, depth) {
    let names = [];
    try { names = fs.readdirSync(current); } catch (_) { return; }
    for (const name of names) {
      const full = path.join(current, name);
      let st;
      try { st = fs.statSync(full); } catch (_) { continue; }
      if (st.isDirectory()) {
        if (depth < maxDepth) visit(full, depth + 1);
      } else if (st.isFile()) {
        out.push({
          path: full,
          name,
          size: st.size,
          age_days: Number(((now - st.mtimeMs) / 86400000).toFixed(2)),
          mtime_ms: st.mtimeMs
        });
      }
    }
  }
  visit(root, 1);
  return out;
}

function listTempCandidates(args, defaults) {
  const root = resolvePathMaybe(args.path || defaults.path || os.tmpdir());
  let items = walkFiles(root, { maxDepth: Number(args.max_depth ?? defaults.maxDepth ?? 5) });
  const minAgeDays = Number(args.min_age_days ?? defaults.min_age_days ?? defaults.min_age_days ?? 0);
  if (minAgeDays > 0) items = items.filter(x => x.age_days >= minAgeDays);
  items = sortItems(items, args.sort_by || defaults.sortBy || 'mtime_ms', args.sort_dir || defaults.sortDir || 'asc');
  return { root, count: items.length, items: limitItems(items, args.limit || defaults.limit || 200) };
}

function ensureApproved(tool, args, preview, warnings = []) {
  if (tool.requires_confirmation && args.approve !== true) {
    return blockedResult(tool, args, 'This tool requires --approve true before it will perform changes.', preview, warnings);
  }
  return null;
}

function namesFromTargets(targets) {
  return targets.map(t => String(t.name || '')).filter(Boolean);
}

function anyCriticalTargets(targets) {
  return targets.some(t => guessCritical(t.name));
}

function writeJsonMaybe(outputPath, data) {
  if (!outputPath) return null;
  mkdirForFile(outputPath);
  fs.writeFileSync(resolvePathMaybe(outputPath), JSON.stringify(data, null, 2), 'utf8');
  return resolvePathMaybe(outputPath);
}

function csvEscape(value) {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(items) {
  const rows = toArray(items);
  const keys = Array.from(rows.reduce((set, row) => {
    Object.keys(row || {}).forEach(k => set.add(k));
    return set;
  }, new Set()));
  const lines = [keys.map(csvEscape).join(',')];
  for (const row of rows) lines.push(keys.map(k => csvEscape(row[k])).join(','));
  return lines.join('\n');
}

function normalizeSnapshotItems(items, keyFields) {
  return items.map(item => {
    const key = keyFields.map(k => String(item[k] ?? '')).join('|');
    return { key, ...item };
  });
}

function compareSnapshots(leftItems, rightItems, keyFields) {
  const left = normalizeSnapshotItems(leftItems, keyFields);
  const right = normalizeSnapshotItems(rightItems, keyFields);
  const leftMap = new Map(left.map(x => [x.key, x]));
  const rightMap = new Map(right.map(x => [x.key, x]));
  const added = right.filter(x => !leftMap.has(x.key));
  const removed = left.filter(x => !rightMap.has(x.key));
  const sharedKeys = [...leftMap.keys()].filter(k => rightMap.has(k));
  const changed = [];
  for (const key of sharedKeys) {
    const a = leftMap.get(key);
    const b = rightMap.get(key);
    if (JSON.stringify(a) !== JSON.stringify(b)) changed.push({ key, before: a, after: b });
  }
  return { added, removed, changed };
}

function handleProcessQuery(tool, args) {
  const got = getProcesses();
  if (!got.ok) return blockedResult(tool, args, got.error);
  let items = applyProcessFilters(got.items, args, tool.defaults || {});
  const fields = args.fields || tool.defaults.fieldSubset;
  if (tool.defaults.countOnly) return buildResult(tool, args, { count: items.length });
  if (tool.defaults.namesOnly) return buildResult(tool, args, { count: items.length, items: limitItems([...new Set(items.map(x => x.name))], args.limit || 500) });
  items = pickFields(items, fields);
  return buildResult(tool, args, { count: items.length, items: limitItems(items, args.limit || tool.defaults.limit || 200), summary: summarizeProcesses(applyProcessFilters(got.items, args, tool.defaults || {})) });
}

function handleProcessNameFrequency(tool, args) {
  const got = getProcesses();
  if (!got.ok) return blockedResult(tool, args, got.error);
  const items = applyProcessFilters(got.items, args, tool.defaults || {});
  const counts = {};
  for (const p of items) counts[p.name] = (counts[p.name] || 0) + 1;
  let rows = Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count || a.name.localeCompare(b.name));
  if (tool.defaults.duplicatesOnly) rows = rows.filter(r => r.count > 1);
  return buildResult(tool, args, { count: rows.length, items: limitItems(rows, args.limit || 200) });
}

function handleProcessGroup(tool, args) {
  const got = getProcesses();
  if (!got.ok) return blockedResult(tool, args, got.error);
  const items = applyProcessFilters(got.items, args, tool.defaults || {});
  const groups = {};
  for (const p of items) {
    groups[p.name] = groups[p.name] || { name: p.name, count: 0, pids: [], total_memory_mb: 0, total_cpu_pct: 0 };
    groups[p.name].count += 1;
    groups[p.name].pids.push(p.pid);
    groups[p.name].total_memory_mb += p.memory_mb || 0;
    groups[p.name].total_cpu_pct += p.cpu_pct || 0;
  }
  const rows = Object.values(groups).map(g => ({...g, total_memory_mb: Number(g.total_memory_mb.toFixed(2)), total_cpu_pct: Number(g.total_cpu_pct.toFixed(2))}))
    .sort((a,b) => b.count - a.count || a.name.localeCompare(b.name));
  return buildResult(tool, args, { count: rows.length, items: limitItems(rows, args.limit || 200) });
}

function handleProcessSummary(tool, args) {
  const got = getProcesses();
  if (!got.ok) return blockedResult(tool, args, got.error);
  const items = applyProcessFilters(got.items, args, tool.defaults || {});
  const summary = summarizeProcesses(items);
  if (tool.defaults.totalsOnly) return buildResult(tool, args, summary);
  return buildResult(tool, args, { summary, top_memory: limitItems(sortItems(items, 'memory_mb', 'desc'), 10), top_cpu: limitItems(sortItems(items, 'cpu_pct', 'desc'), 10) });
}

function handleProcessSnapshotSave(tool, args) {
  const got = getProcesses();
  if (!got.ok) return blockedResult(tool, args, got.error);
  const items = applyProcessFilters(got.items, args, tool.defaults || {});
  const payload = { meta: { tool_id: tool.id, created_at: new Date().toISOString(), host: os.hostname() }, items };
  const output = writeJsonMaybe(args.output_path || `./process_snapshot_${Date.now()}.json`, payload);
  return buildResult(tool, args, { output_path: output, count: items.length, hash: hashText(JSON.stringify(items)) });
}

function readSnapshot(filePath) {
  const raw = fs.readFileSync(resolvePathMaybe(filePath), 'utf8');
  return JSON.parse(raw);
}

function handleProcessSnapshotCompare(tool, args) {
  const left = readSnapshot(args.left);
  const right = readSnapshot(args.right);
  const diff = compareSnapshots(left.items || [], right.items || [], ['pid','name']);
  return buildResult(tool, args, {
    left: resolvePathMaybe(args.left),
    right: resolvePathMaybe(args.right),
    added_count: diff.added.length,
    removed_count: diff.removed.length,
    changed_count: diff.changed.length,
    added: limitItems(diff.added, args.limit || 100),
    removed: limitItems(diff.removed, args.limit || 100),
    changed: limitItems(diff.changed, args.limit || 50)
  });
}

function handleProcessSnapshotHash(tool, args) {
  const got = getProcesses();
  if (!got.ok) return blockedResult(tool, args, got.error);
  const items = applyProcessFilters(got.items, args, tool.defaults || {});
  return buildResult(tool, args, { count: items.length, hash: hashText(JSON.stringify(items)) });
}

function handleProcessExport(tool, args) {
  const got = getProcesses();
  if (!got.ok) return blockedResult(tool, args, got.error);
  const items = applyProcessFilters(got.items, args, tool.defaults || {});
  const format = String(args.format || tool.defaults.format || 'csv').toLowerCase();
  const outputPath = args.output_path || `./process_export_${Date.now()}.${format === 'json' ? 'json' : 'csv'}`;
  mkdirForFile(outputPath);
  if (format === 'json') fs.writeFileSync(resolvePathMaybe(outputPath), JSON.stringify(items, null, 2), 'utf8');
  else fs.writeFileSync(resolvePathMaybe(outputPath), toCsv(items), 'utf8');
  return buildResult(tool, args, { output_path: resolvePathMaybe(outputPath), count: items.length, format });
}

function handleProcessPolicyMatch(tool, args) {
  const got = getProcesses();
  if (!got.ok) return blockedResult(tool, args, got.error);
  const items = got.items;
  const allowlist = loadNameList(args, 'allowlist');
  const blocklist = loadNameList(args, 'blocklist');
  const mode = tool.defaults.mode || 'allowlist';
  let rows = [];
  if (mode === 'allowlist') rows = items.filter(p => allowlist.has(p.name.toLowerCase()));
  else if (mode === 'blocklist') rows = items.filter(p => blocklist.has(p.name.toLowerCase()));
  else rows = items.filter(p => allowlist.size && !allowlist.has(p.name.toLowerCase()));
  return buildResult(tool, args, { count: rows.length, items: limitItems(rows, args.limit || 200), mode });
}

function killCommandForTargets(targets, tree) {
  if (process.platform === 'win32') {
    if (targets.length === 1 && targets[0].pid) return `taskkill /PID ${targets[0].pid} ${tree ? '/T ' : ''}/F`;
    if (targets.length && targets[0].name) return `taskkill /IM "${targets[0].name}" ${tree ? '/T ' : ''}/F`;
  } else {
    if (targets.length === 1 && targets[0].pid) return `kill -TERM ${targets[0].pid}`;
    if (targets.length && targets[0].name) return `pkill -f "${targets[0].name.replace(/"/g,'\\"')}"`;
  }
  return '';
}

function handleProcessKill(tool, args) {
  const got = getProcesses();
  if (!got.ok) return blockedResult(tool, args, got.error);
  let targets = [];
  const defaults = tool.defaults || {};
  if ((defaults.matchMode || '') === 'name') {
    const query = String(args.query || '').trim().toLowerCase();
    targets = got.items.filter(p => query && p.name.toLowerCase().includes(query));
  } else if (args.pid) {
    const pid = Number(args.pid);
    targets = got.items.filter(p => p.pid === pid);
  } else if (args.query) {
    const q = String(args.query).trim().toLowerCase();
    targets = got.items.filter(p => p.name.toLowerCase().includes(q));
  }
  if (defaults.nonCriticalRequired) targets = targets.filter(t => !t.critical);
  const preview = { target_count: targets.length, targets: limitItems(targets, args.limit || 50) };
  if (!targets.length) return blockedResult(tool, args, 'No matching process targets found.', preview);
  if (anyCriticalTargets(targets)) return blockedResult(tool, args, 'Critical/system process matched. Built-in policy blocked the kill request.', preview);
  const preBlocked = ensureApproved(tool, args, preview);
  if (preBlocked) return preBlocked;
  if (args.dry_run !== false) return buildResult(tool, args, { dry_run: true, command_preview: killCommandForTargets([targets[0]], defaults.tree === true), ...preview }, ['Dry-run mode is active. Pass --dry_run false together with --approve true to execute.']);
  const command = killCommandForTargets([targets[0]], defaults.tree === true);
  const res = runCommand(command);
  if (!res.ok) return blockedResult(tool, args, res.stderr || 'Kill command failed.', preview);
  return buildResult(tool, args, { executed: true, command, target_count: targets.length, targets: limitItems(targets, 20) });
}

function handleServiceQuery(tool, args) {
  const got = getServices();
  if (!got.ok) return blockedResult(tool, args, got.error);
  const items = applyServiceFilters(got.items, args, tool.defaults || {});
  if (tool.defaults.countOnly) return buildResult(tool, args, { count: items.length });
  if (tool.defaults.namesOnly) return buildResult(tool, args, { count: items.length, items: limitItems(items.map(s => s.name), args.limit || 500) });
  return buildResult(tool, args, { count: items.length, items: limitItems(items, args.limit || 200) });
}

function handleServiceSummary(tool, args) {
  const got = getServices();
  if (!got.ok) return blockedResult(tool, args, got.error);
  const items = applyServiceFilters(got.items, args, tool.defaults || {});
  const by = tool.defaults.by === 'startType' ? 'start_type' : 'status';
  const counts = {};
  for (const s of items) counts[s[by] || '(unknown)'] = (counts[s[by] || '(unknown)'] || 0) + 1;
  const rows = Object.entries(counts).map(([key, count]) => ({ key, count })).sort((a,b) => b.count - a.count || a.key.localeCompare(b.key));
  return buildResult(tool, args, { count: items.length, group_by: by, items: rows });
}

function handleServicePolicyMatch(tool, args) {
  const got = getServices();
  if (!got.ok) return blockedResult(tool, args, got.error);
  const allowlist = loadNameList(args, 'allowlist');
  const blocklist = loadNameList(args, 'blocklist');
  const mode = tool.defaults.mode || 'allowlist';
  let rows = [];
  if (mode === 'allowlist') rows = got.items.filter(s => allowlist.has(s.name.toLowerCase()));
  else if (mode === 'blocklist') rows = got.items.filter(s => blocklist.has(s.name.toLowerCase()));
  else rows = got.items.filter(s => allowlist.size && !allowlist.has(s.name.toLowerCase()));
  return buildResult(tool, args, { count: rows.length, items: limitItems(rows, args.limit || 200), mode });
}

function handleServiceChange(tool, args) {
  const got = getServices();
  if (!got.ok) return blockedResult(tool, args, got.error);
  const query = String(args.query || args.name || '').trim().toLowerCase();
  const targets = got.items.filter(s => query && (s.name.toLowerCase().includes(query) || s.display_name.toLowerCase().includes(query)));
  const preview = { target_count: targets.length, targets: limitItems(targets, 50), verb: tool.defaults.verb };
  if (!targets.length) return blockedResult(tool, args, 'No matching service targets found.', preview);
  const preBlocked = ensureApproved(tool, args, preview);
  if (preBlocked) return preBlocked;
  if (args.dry_run !== false) return buildResult(tool, args, { dry_run: true, ...preview }, ['Dry-run mode is active. Pass --dry_run false together with --approve true to execute.']);
  const target = targets[0];
  let command = '';
  if (process.platform === 'win32') {
    if (tool.defaults.verb === 'start') command = `powershell -NoProfile -Command "Start-Service -Name '${target.name}'"`;
    if (tool.defaults.verb === 'stop') command = `powershell -NoProfile -Command "Stop-Service -Name '${target.name}' -Force"`;
    if (tool.defaults.verb === 'restart') command = `powershell -NoProfile -Command "Restart-Service -Name '${target.name}' -Force"`;
  } else {
    if (tool.defaults.verb === 'start') command = `systemctl start ${target.name}.service`;
    if (tool.defaults.verb === 'stop') command = `systemctl stop ${target.name}.service`;
    if (tool.defaults.verb === 'restart') command = `systemctl restart ${target.name}.service`;
  }
  const res = runCommand(command);
  if (!res.ok) return blockedResult(tool, args, res.stderr || 'Service command failed.', preview);
  return buildResult(tool, args, { executed: true, command, ...preview });
}

function handleServiceExport(tool, args) {
  const got = getServices();
  if (!got.ok) return blockedResult(tool, args, got.error);
  const items = applyServiceFilters(got.items, args, tool.defaults || {});
  const format = String(args.format || tool.defaults.format || 'csv').toLowerCase();
  const outputPath = args.output_path || `./service_export_${Date.now()}.${format === 'json' ? 'json' : 'csv'}`;
  mkdirForFile(outputPath);
  if (format === 'json') fs.writeFileSync(resolvePathMaybe(outputPath), JSON.stringify(items, null, 2), 'utf8');
  else fs.writeFileSync(resolvePathMaybe(outputPath), toCsv(items), 'utf8');
  return buildResult(tool, args, { output_path: resolvePathMaybe(outputPath), count: items.length, format });
}

function handleStartupQuery(tool, args) {
  const got = getStartupEntries();
  if (!got.ok) return blockedResult(tool, args, got.error);
  const items = applyStartupFilters(got.items, args, tool.defaults || {});
  if (tool.defaults.countOnly) return buildResult(tool, args, { count: items.length });
  return buildResult(tool, args, { count: items.length, items: limitItems(items, args.limit || 200) });
}

function handleStartupSummary(tool, args) {
  const got = getStartupEntries();
  if (!got.ok) return blockedResult(tool, args, got.error);
  const items = applyStartupFilters(got.items, args, tool.defaults || {});
  const key = tool.defaults.by || 'location';
  const counts = {};
  for (const x of items) counts[x[key] || '(unknown)'] = (counts[x[key] || '(unknown)'] || 0) + 1;
  const rows = Object.entries(counts).map(([key, count]) => ({ key, count })).sort((a,b) => b.count - a.count || a.key.localeCompare(b.key));
  return buildResult(tool, args, { count: items.length, group_by: key, items: rows });
}

function handleStartupDuplicates(tool, args) {
  const got = getStartupEntries();
  if (!got.ok) return blockedResult(tool, args, got.error);
  const items = applyStartupFilters(got.items, args, tool.defaults || {});
  const counts = {};
  for (const x of items) counts[x.name] = (counts[x.name] || 0) + 1;
  const rows = Object.entries(counts).map(([name, count]) => ({ name, count })).filter(x => x.count > 1).sort((a,b) => b.count - a.count || a.name.localeCompare(b.name));
  return buildResult(tool, args, { count: rows.length, items: rows });
}

function handleStartupExport(tool, args) {
  const got = getStartupEntries();
  if (!got.ok) return blockedResult(tool, args, got.error);
  const items = applyStartupFilters(got.items, args, tool.defaults || {});
  const format = String(args.format || tool.defaults.format || 'csv').toLowerCase();
  const outputPath = args.output_path || `./startup_export_${Date.now()}.${format === 'json' ? 'json' : 'csv'}`;
  mkdirForFile(outputPath);
  if (format === 'json') fs.writeFileSync(resolvePathMaybe(outputPath), JSON.stringify(items, null, 2), 'utf8');
  else fs.writeFileSync(resolvePathMaybe(outputPath), toCsv(items), 'utf8');
  return buildResult(tool, args, { output_path: resolvePathMaybe(outputPath), count: items.length, format });
}

function handleNetworkQuery(tool, args) {
  const got = getConnections();
  if (!got.ok) return blockedResult(tool, args, got.error);
  const items = applyNetworkFilters(got.items, args, tool.defaults || {});
  if (tool.defaults.countOnly) return buildResult(tool, args, { count: items.length });
  return buildResult(tool, args, { count: items.length, items: limitItems(items, args.limit || 200) });
}

function handleNetworkSummary(tool, args) {
  const got = getConnections();
  if (!got.ok) return blockedResult(tool, args, got.error);
  const items = applyNetworkFilters(got.items, args, tool.defaults || {});
  if (tool.defaults.by === 'local_port') {
    const unique = new Set(items.map(x => x.local_port).filter(Boolean));
    if (tool.id === 'port_count') return buildResult(tool, args, { count: unique.size, items: [...unique].sort((a,b)=>a-b).map(port => ({ local_port: port })) });
  }
  const key = tool.defaults.by || 'local_port';
  const counts = {};
  for (const x of items) counts[String(x[key] ?? '(none)')] = (counts[String(x[key] ?? '(none)')] || 0) + 1;
  const rows = Object.entries(counts).map(([key, count]) => ({ key, count })).sort((a,b) => b.count - a.count);
  return buildResult(tool, args, { count: items.length, group_by: key, items: rows });
}

function handleNetworkSnapshotSave(tool, args) {
  const got = getConnections();
  if (!got.ok) return blockedResult(tool, args, got.error);
  const items = applyNetworkFilters(got.items, args, tool.defaults || {});
  const payload = { meta: { tool_id: tool.id, created_at: new Date().toISOString(), host: os.hostname() }, items };
  const output = writeJsonMaybe(args.output_path || `./network_snapshot_${Date.now()}.json`, payload);
  return buildResult(tool, args, { output_path: output, count: items.length, hash: hashText(JSON.stringify(items)) });
}

function handleNetworkSnapshotCompare(tool, args) {
  const left = readSnapshot(args.left);
  const right = readSnapshot(args.right);
  const diff = compareSnapshots(left.items || [], right.items || [], ['proto','local_address','local_port','remote_address','remote_port','pid']);
  return buildResult(tool, args, {
    left: resolvePathMaybe(args.left),
    right: resolvePathMaybe(args.right),
    added_count: diff.added.length,
    removed_count: diff.removed.length,
    changed_count: diff.changed.length,
    added: limitItems(diff.added, args.limit || 100),
    removed: limitItems(diff.removed, args.limit || 100),
    changed: limitItems(diff.changed, args.limit || 50)
  });
}

function handleNetworkExport(tool, args) {
  const got = getConnections();
  if (!got.ok) return blockedResult(tool, args, got.error);
  const items = applyNetworkFilters(got.items, args, tool.defaults || {});
  const format = String(args.format || tool.defaults.format || 'csv').toLowerCase();
  const outputPath = args.output_path || `./network_export_${Date.now()}.${format === 'json' ? 'json' : 'csv'}`;
  mkdirForFile(outputPath);
  if (format === 'json') fs.writeFileSync(resolvePathMaybe(outputPath), JSON.stringify(items, null, 2), 'utf8');
  else fs.writeFileSync(resolvePathMaybe(outputPath), toCsv(items), 'utf8');
  return buildResult(tool, args, { output_path: resolvePathMaybe(outputPath), count: items.length, format });
}

function handleSystemInfo(tool, args) {
  return buildResult(tool, args, systemInfo(tool.defaults.kind || 'summary'));
}

function handleTempQuery(tool, args) {
  return buildResult(tool, args, listTempCandidates(args, tool.defaults || {}));
}

function handleTempDelete(tool, args) {
  const data = listTempCandidates(args, tool.defaults || {});
  const preview = { root: data.root, target_count: data.count, targets: data.items };
  const preBlocked = ensureApproved(tool, args, preview);
  if (preBlocked) return preBlocked;
  if (args.dry_run !== false) return buildResult(tool, args, { dry_run: true, ...preview }, ['Dry-run mode is active. Pass --dry_run false together with --approve true to execute.']);
  let deleted = [];
  let failed = [];
  const maxItems = Number(args.max_items || 200);
  for (const item of data.items.slice(0, maxItems)) {
    try { fs.unlinkSync(item.path); deleted.push(item.path); } catch (e) { failed.push({ path: item.path, error: e.message }); }
  }
  return buildResult(tool, args, { deleted_count: deleted.length, failed_count: failed.length, deleted: limitItems(deleted, 100), failed: limitItems(failed, 50) });
}

function handleRegistrySearch(tool, args) {
  const q = String(args.query || '').trim().toLowerCase();
  let rows = toolIndex.slice();
  if (q) rows = rows.filter(t => {
    const hay = [t.id, t.title, t.description, ...(t.tags || []), ...(t.intent_examples || [])].join(' ').toLowerCase();
    return hay.includes(q);
  });
  return buildResult(tool, args, { count: rows.length, items: limitItems(rows, args.limit || 100) });
}

function handleToolDetail(tool, args) {
  const id = String(args.id || args.query || '').trim();
  const item = toolMap[id];
  if (!item) return blockedResult(tool, args, 'Tool id not found in registry.');
  return buildResult(tool, args, item);
}

function handlePlaybookDetail(tool, args) {
  const id = String(args.id || args.query || '').trim();
  const item = playbookMap[id];
  if (!item) return blockedResult(tool, args, 'Playbook id not found.');
  return buildResult(tool, args, item);
}

function handleReportToolSummary(tool, args) {
  const mode = tool.defaults.mode || 'risk';
  if (mode === 'risk') {
    const counts = {};
    for (const t of toolIndex) counts[t.risk_level] = (counts[t.risk_level] || 0) + 1;
    return buildResult(tool, args, { mode, counts });
  }
  if (mode === 'category') {
    const counts = {};
    for (const t of toolIndex) counts[t.category] = (counts[t.category] || 0) + 1;
    return buildResult(tool, args, { mode, counts });
  }
  if (mode === 'approval') {
    const rows = toolIndex.filter(t => t.requires_confirmation || ['high','critical'].includes(t.risk_level))
      .map(t => ({ id: t.id, title: t.title, risk_level: t.risk_level, requires_confirmation: t.requires_confirmation }));
    return buildResult(tool, args, { mode, count: rows.length, items: rows });
  }
  if (mode === 'safe') {
    const rows = toolIndex.filter(t => t.risk_level === 'low' && !t.requires_confirmation)
      .map(t => ({ id: t.id, category: t.category, title: t.title }));
    return buildResult(tool, args, { mode, count: rows.length, items: rows });
  }
  return buildResult(tool, args, { mode });
}

function handleReportPolicy(tool, args) {
  const mode = tool.defaults.mode || 'critical_processes';
  if (mode === 'critical_processes') {
    return buildResult(tool, args, { critical_process_names: [...CRITICAL_PROCESS_NAMES].sort(), note: 'Critical process matches are blocked for kill actions by default.' });
  }
  if (mode === 'export') {
    return buildResult(tool, args, {
      critical_process_names: [...CRITICAL_PROCESS_NAMES].sort(),
      high_risk_tools: toolIndex.filter(t => ['high','critical'].includes(t.risk_level)).map(t => t.id),
      requires_confirmation: toolIndex.filter(t => t.requires_confirmation).map(t => t.id),
      dry_run_default_for_mutations: true
    });
  }
  return buildResult(tool, args, { mode });
}

function handlePreflightAction(tool, args) {
  const scope = tool.defaults.scope || 'process';
  const warnings = [];
  if (scope === 'process') {
    const query = String(args.query || '').trim();
    if (!query && !args.pid) warnings.push('No query or pid provided.');
    if (args.approve !== true) warnings.push('Process-changing tools require --approve true.');
    if (args.dry_run !== false) warnings.push('Dry-run is active by default for process-changing tools.');
    return buildResult(tool, args, { scope, warnings, policy_blockers: warnings.length }, warnings);
  }
  if (scope === 'service') {
    const query = String(args.query || '').trim();
    if (!query) warnings.push('No service name/query provided.');
    if (args.approve !== true) warnings.push('Service-changing tools require --approve true.');
    if (args.dry_run !== false) warnings.push('Dry-run is active by default for service-changing tools.');
    return buildResult(tool, args, { scope, warnings, policy_blockers: warnings.length }, warnings);
  }
  return buildResult(tool, args, { scope, warnings });
}

const handlers = {
  process_query: handleProcessQuery,
  process_name_frequency: handleProcessNameFrequency,
  process_group: handleProcessGroup,
  process_summary: handleProcessSummary,
  process_snapshot_save: handleProcessSnapshotSave,
  process_snapshot_compare: handleProcessSnapshotCompare,
  process_snapshot_hash: handleProcessSnapshotHash,
  process_export: handleProcessExport,
  process_policy_match: handleProcessPolicyMatch,
  process_kill: handleProcessKill,
  service_query: handleServiceQuery,
  service_summary: handleServiceSummary,
  service_policy_match: handleServicePolicyMatch,
  service_change: handleServiceChange,
  service_export: handleServiceExport,
  startup_query: handleStartupQuery,
  startup_summary: handleStartupSummary,
  startup_duplicates: handleStartupDuplicates,
  startup_export: handleStartupExport,
  network_query: handleNetworkQuery,
  network_summary: handleNetworkSummary,
  network_snapshot_save: handleNetworkSnapshotSave,
  network_snapshot_compare: handleNetworkSnapshotCompare,
  network_export: handleNetworkExport,
  system_info: handleSystemInfo,
  temp_query: handleTempQuery,
  temp_delete: handleTempDelete,
  registry_search: handleRegistrySearch,
  tool_detail: handleToolDetail,
  playbook_detail: handlePlaybookDetail,
  report_tool_summary: handleReportToolSummary,
  report_policy: handleReportPolicy,
  preflight_action: handlePreflightAction
};

function executeToolById(toolId, args) {
  const tool = toolMap[toolId];
  if (!tool) return { ok: false, error: `Unknown tool id: ${toolId}` };
  const handler = handlers[tool.handler];
  if (!handler) return { ok: false, error: `No handler for ${tool.handler}` };
  try {
    return handler(tool, args || {});
  } catch (error) {
    return { ok: false, tool_id: toolId, error: error.message, stack: error.stack };
  }
}

function printJson(obj) {
  process.stdout.write(JSON.stringify(obj, null, 2) + '\n');
}

function usage() {
  const lines = [];
  lines.push('Usage: node run-tool.js <tool_id> [--key value]');
  lines.push('Example: node run-tool.js top_cpu_processes --limit 15');
  lines.push('Example: node run-tool.js kill_process_by_pid --pid 1234 --approve true --dry_run false');
  lines.push('Example: node run-tool.js registry_search --query service');
  return lines.join('\n');
}

function runToolByCli() {
  const argv = process.argv.slice(2);
  const toolId = argv[0];
  if (!toolId || toolId === '--help' || toolId === 'help') {
    process.stdout.write(usage() + '\n');
    return;
  }
  const args = parseArgs(argv.slice(1));
  const result = executeToolById(toolId, args);
  printJson(result);
}

function runToolScript(toolId) {
  const args = parseArgs(process.argv.slice(2));
  const result = executeToolById(toolId, args);
  printJson(result);
}

module.exports = {
  runToolByCli,
  runToolScript,
  executeToolById
};
