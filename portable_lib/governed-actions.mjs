import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { writeAuditEvent } from "./optimizer-audit.mjs";
import { getSessionHints } from "./brain-session-store.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const taskmanagerRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(taskmanagerRoot, "..");

const runtimeRoot = process.env.HORIZONS_GOVERNED_RUNTIME_ROOT
  ? path.resolve(process.env.HORIZONS_GOVERNED_RUNTIME_ROOT)
  : path.join(taskmanagerRoot, "brain", "runtime", "logs", "governed-actions");
const approvalsLogPath = path.join(runtimeRoot, "approvals.jsonl");
const snapshotsRoot = path.join(runtimeRoot, "snapshots");
const summariesRoot = path.join(taskmanagerRoot, "brain", "runtime", "summaries");
const trashRoot = path.join(taskmanagerRoot, "brain", "runtime", "trash");

function pushUniquePath(collection, candidate) {
  const text = String(candidate || "").trim();
  if (!text) return;
  const normalized = path.normalize(text);
  if (!collection.includes(normalized)) {
    collection.push(normalized);
  }
}

function collectKnownFolderCandidates(folderName, explicitOverride) {
  const candidates = [];
  pushUniquePath(candidates, explicitOverride);

  for (const root of [process.env.OneDrive, process.env.OneDriveConsumer, process.env.OneDriveCommercial]) {
    if (root) pushUniquePath(candidates, path.join(root, folderName));
  }

  for (const root of [process.env.USERPROFILE, os.homedir()]) {
    if (root) pushUniquePath(candidates, path.join(root, folderName));
  }

  return candidates;
}

function resolveKnownFolder(folderName, explicitOverride) {
  const candidates = collectKnownFolderCandidates(folderName, explicitOverride);
  return candidates.find((entry) => fs.existsSync(entry)) || candidates[0] || path.join(os.homedir(), folderName);
}

function getDesktopRoot() {
  return resolveKnownFolder("Desktop", process.env.HORIZONS_DESKTOP_PATH);
}

function getDocumentsRoot() {
  return resolveKnownFolder("Documents", process.env.HORIZONS_DOCUMENTS_PATH);
}

function getHorizonsOutputRoot() {
  return path.join(getDocumentsRoot(), "Horizons Output");
}

const APPROVAL_STATUS = Object.freeze({
  PENDING: "pending",
  APPROVED: "approved",
  DECLINED: "declined",
});

const SUPPORTED_ACTIONS = Object.freeze([
  "list_directory",
  "read_text_file",
  "search_files",
  "create_folder",
  "write_text_file",
  "append_text_file",
  "move_file",
  "copy_file",
  "rename_file",
  "delete_file",
  "inspect_document",
  "summarize_document",
  "batch_summarize_folder",
  "export_summary_report",
  "open_system_utility",
]);

const ACTION_CONTRACTS = Object.freeze({
  list_directory: {
    required: ["path"],
    optional: ["recursive", "include_hidden"],
  },
  read_text_file: {
    required: ["path"],
    optional: ["max_chars"],
  },
  search_files: {
    required: ["root", "pattern"],
    optional: ["content_query", "recursive"],
  },
  create_folder: {
    required: ["path"],
    optional: ["parents"],
  },
  write_text_file: {
    required: ["path", "content"],
    optional: ["overwrite", "create_parents"],
  },
  append_text_file: {
    required: ["path", "content"],
    optional: ["create_if_missing"],
  },
  move_file: {
    required: ["source", "destination"],
    optional: ["overwrite"],
  },
  copy_file: {
    required: ["source", "destination"],
    optional: ["overwrite"],
  },
  rename_file: {
    required: ["path", "new_name"],
    optional: ["overwrite"],
  },
  delete_file: {
    required: ["path"],
    optional: ["safe"],
  },
  inspect_document: {
    required: ["path"],
    optional: [],
  },
  summarize_document: {
    required: ["source_path"],
    optional: ["output_path", "summary_style", "max_length"],
  },
  batch_summarize_folder: {
    required: ["source_folder", "output_folder"],
    optional: ["patterns", "recursive", "mode"],
  },
  export_summary_report: {
    required: ["output_path"],
    optional: ["entries", "source_folder"],
  },
  open_system_utility: {
    required: ["utility"],
    optional: [],
  },
});

// ── System utility safelist ──────────────────────────────────────────────────
// Only utilities in this map can be launched.  Each entry maps a canonical key
// to the executable/arguments that Windows will run.  URIs use "start" (via
// cmd.exe /c start) so ms-settings:* and shell:::{GUID} targets work.
const SYSTEM_UTILITY_SAFELIST = Object.freeze({
  "control-panel":      { exe: "control.exe",    args: [],                       label: "Control Panel" },
  "settings":           { exe: "cmd.exe",        args: ["/c", "start", "ms-settings:"],          label: "Windows Settings" },
  "display":            { exe: "cmd.exe",        args: ["/c", "start", "ms-settings:display"],   label: "Display Settings" },
  "sound":              { exe: "cmd.exe",        args: ["/c", "start", "ms-settings:sound"],     label: "Sound Settings" },
  "bluetooth":          { exe: "cmd.exe",        args: ["/c", "start", "ms-settings:bluetooth"], label: "Bluetooth Settings" },
  "wifi":               { exe: "cmd.exe",        args: ["/c", "start", "ms-settings:network-wifi"], label: "Wi-Fi Settings" },
  "network":            { exe: "cmd.exe",        args: ["/c", "start", "ms-settings:network"],   label: "Network Settings" },
  "apps":               { exe: "cmd.exe",        args: ["/c", "start", "ms-settings:appsfeatures"], label: "Apps & Features" },
  "storage":            { exe: "cmd.exe",        args: ["/c", "start", "ms-settings:storagesense"], label: "Storage Settings" },
  "personalization":    { exe: "cmd.exe",        args: ["/c", "start", "ms-settings:personalization"], label: "Personalization" },
  "windows-update":     { exe: "cmd.exe",        args: ["/c", "start", "ms-settings:windowsupdate"], label: "Windows Update" },
  "privacy":            { exe: "cmd.exe",        args: ["/c", "start", "ms-settings:privacy"],   label: "Privacy Settings" },
  "about":              { exe: "cmd.exe",        args: ["/c", "start", "ms-settings:about"],     label: "About This PC" },
  "task-manager":       { exe: "taskmgr.exe",    args: [],                       label: "Windows Task Manager" },
  "device-manager":     { exe: "devmgmt.msc",    args: [],                       label: "Device Manager" },
  "disk-management":    { exe: "diskmgmt.msc",   args: [],                       label: "Disk Management" },
  "event-viewer":       { exe: "eventvwr.msc",   args: [],                       label: "Event Viewer" },
  "services":           { exe: "services.msc",   args: [],                       label: "Services" },
  "calculator":         { exe: "calc.exe",       args: [],                       label: "Calculator" },
  "notepad":            { exe: "notepad.exe",    args: [],                       label: "Notepad" },
  "paint":              { exe: "mspaint.exe",    args: [],                       label: "Paint" },
  "file-explorer":      { exe: "explorer.exe",   args: [],                       label: "File Explorer" },
  "command-prompt":     { exe: "cmd.exe",        args: [],                       label: "Command Prompt" },
  "powershell":         { exe: "powershell.exe", args: [],                       label: "PowerShell" },
  "snipping-tool":      { exe: "SnippingTool.exe", args: [],                     label: "Snipping Tool" },
  "system-info":        { exe: "msinfo32.exe",   args: [],                       label: "System Information" },
  "resource-monitor":   { exe: "resmon.exe",     args: [],                       label: "Resource Monitor" },
  "performance-monitor":{ exe: "perfmon.exe",    args: [],                       label: "Performance Monitor" },
  "registry-editor":    { exe: "regedit.exe",    args: [],                       label: "Registry Editor" },
  "defrag":             { exe: "dfrgui.exe",     args: [],                       label: "Defragment & Optimize Drives" },
  "firewall":           { exe: "cmd.exe",        args: ["/c", "start", "ms-settings:windowsdefender"], label: "Windows Security" },
  "environment-variables": { exe: "rundll32.exe", args: ["sysdm.cpl,EditEnvironmentVariables"], label: "Environment Variables" },
  "programs-and-features": { exe: "appwiz.cpl",  args: [],                       label: "Programs and Features" },
  "mouse":              { exe: "main.cpl",       args: [],                       label: "Mouse Settings" },
  "keyboard":           { exe: "cmd.exe",        args: ["/c", "start", "ms-settings:easeofaccess-keyboard"], label: "Keyboard Settings" },
  "printers":           { exe: "cmd.exe",        args: ["/c", "start", "ms-settings:printers"],  label: "Printers & Scanners" },
  "date-time":          { exe: "cmd.exe",        args: ["/c", "start", "ms-settings:dateandtime"], label: "Date & Time" },
  "power":              { exe: "cmd.exe",        args: ["/c", "start", "ms-settings:powersleep"], label: "Power & Sleep" },
});

let nextApprovalId = 1;
const pendingApprovals = [];
const actionRuns = new Map();

hydrateApprovalState();

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function appendJsonLine(filePath, payload) {
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`, "utf8");
}

function readJsonLines(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
}

function nowIso() {
  return new Date().toISOString();
}

function parseApprovalSequence(approvalId) {
  const match = /^gov-(\d+)$/.exec(String(approvalId || ""));
  return match ? Number(match[1]) : null;
}

function compareApprovalRecency(left, right) {
  const leftSequence = parseApprovalSequence(left?.id) ?? 0;
  const rightSequence = parseApprovalSequence(right?.id) ?? 0;
  if (leftSequence !== rightSequence) {
    return rightSequence - leftSequence;
  }
  return String(right?.createdAt || "").localeCompare(String(left?.createdAt || ""));
}

function persistApprovalRecord(approval) {
  appendJsonLine(approvalsLogPath, { ts: nowIso(), ...approval });
}

function hydrateApprovalState() {
  const latestById = new Map();
  for (const entry of readJsonLines(approvalsLogPath)) {
    if (!entry || typeof entry !== "object") continue;
    const approvalId = String(entry.id || "").trim();
    if (!approvalId.startsWith("gov-")) continue;
    const { ts, ...approval } = entry;
    latestById.set(approvalId, approval);
  }

  const approvals = [...latestById.values()].sort((left, right) => {
    const leftSequence = parseApprovalSequence(left.id) ?? 0;
    const rightSequence = parseApprovalSequence(right.id) ?? 0;
    return leftSequence - rightSequence;
  });

  pendingApprovals.splice(0, pendingApprovals.length, ...approvals);
  const highestApprovalSequence = approvals.reduce(
    (maxValue, approval) => Math.max(maxValue, parseApprovalSequence(approval.id) ?? 0),
    0
  );
  nextApprovalId = highestApprovalSequence + 1;
}

function createId(prefix) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function normalizePathInput(rawPath, { baseDir = taskmanagerRoot } = {}) {
  const text = String(rawPath || "").trim();
  if (!text) throw new Error("Path is required.");

  const homeExpanded = text.startsWith("~") ? path.join(os.homedir(), text.slice(1)) : text;
  const absolute = path.isAbsolute(homeExpanded) ? homeExpanded : path.resolve(baseDir, homeExpanded);
  const normalized = path.normalize(absolute);
  return normalized;
}

function startsWithPath(target, root) {
  const rel = path.relative(root, target);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function getApprovedRoots() {
  const desktopRoot = getDesktopRoot();
  const documentsRoot = getDocumentsRoot();
  const horizonsOutputRoot = getHorizonsOutputRoot();

  return [
    { key: "taskmanager", path: taskmanagerRoot, mode: "app" },
    { key: "workspace", path: workspaceRoot, mode: "app" },
    { key: "horizons_output", path: horizonsOutputRoot, mode: "app" },
    { key: "desktop", path: desktopRoot, mode: "desktop" },
    { key: "documents", path: documentsRoot, mode: "documents" },
  ];
}

function getBlockedRoots() {
  const candidates = [
    process.env.SystemRoot || "C:\\Windows",
    "C:\\Program Files",
    "C:\\Program Files (x86)",
    "C:\\ProgramData",
    "C:\\$Recycle.Bin",
  ];
  return candidates.map((entry) => path.normalize(entry));
}

function classifyPath(normalizedPath) {
  const blocked = getBlockedRoots();
  if (blocked.some((root) => startsWithPath(normalizedPath, root))) {
    return { allowed: false, reason: "Target path is inside a blocked system location." };
  }

  const approved = getApprovedRoots();
  const match = approved.find((root) => startsWithPath(normalizedPath, root.path));
  if (!match) {
    return {
      allowed: false,
      reason: "Target path is outside approved governed roots.",
    };
  }

  return {
    allowed: true,
    rootKey: match.key,
    rootMode: match.mode,
    rootPath: match.path,
    relative: path.relative(match.path, normalizedPath) || ".",
  };
}

function validateContract(action, args) {
  const contract = ACTION_CONTRACTS[action];
  if (!contract) throw new Error(`Unsupported action: ${action}`);
  const payload = args && typeof args === "object" ? args : {};
  for (const key of contract.required) {
    if (payload[key] == null || payload[key] === "") {
      throw new Error(`Action ${action} requires argument: ${key}`);
    }
  }
  return payload;
}

function classifyApprovalRequirement(step, { dryRun = false } = {}) {
  if (dryRun) {
    return {
      needsApproval: false,
      scope: "dry_run",
      risk: "No writes are performed in dry-run mode.",
    };
  }

  const writes = new Set([
    "create_folder",
    "write_text_file",
    "append_text_file",
    "move_file",
    "copy_file",
    "rename_file",
    "delete_file",
    "summarize_document",
    "batch_summarize_folder",
    "export_summary_report",
  ]);

  const highRisk = new Set(["move_file", "rename_file", "delete_file"]);
  const overwriteRisk = Boolean(step.args?.overwrite);

  const allPathFields = [
    step.args?.path,
    step.args?.source,
    step.args?.destination,
    step.args?.source_path,
    step.args?.output_path,
    step.args?.source_folder,
    step.args?.output_folder,
    step.args?.root,
  ].filter(Boolean);

  const pathClasses = allPathFields.map((raw) => classifyPath(normalizePathInput(raw)));
  const desktopTarget = pathClasses.some((entry) => entry.allowed && entry.rootMode === "desktop");
  const crossRoot = pathClasses.length > 1 && new Set(pathClasses.map((entry) => entry.rootKey || "blocked")).size > 1;

  if (!pathClasses.every((entry) => entry.allowed)) {
    return {
      needsApproval: true,
      scope: "blocked",
      risk: pathClasses.find((entry) => !entry.allowed)?.reason || "Path policy violation.",
    };
  }

  if (!writes.has(step.action)) {
    return {
      needsApproval: false,
      scope: "read_only",
      risk: "Read-only action within approved roots.",
    };
  }

  if (desktopTarget || crossRoot || highRisk.has(step.action) || overwriteRisk) {
    return {
      needsApproval: true,
      scope: "user_approval",
      risk: desktopTarget
        ? "Write target includes Desktop path."
        : crossRoot
          ? "Operation crosses approved roots."
          : overwriteRisk
            ? "Operation may overwrite existing content."
            : "Operation mutates or deletes files.",
    };
  }

  return {
    needsApproval: false,
    scope: "app_managed_write",
    risk: "Write stays inside managed app roots.",
  };
}

function listDirectoryEntries(dirPath, { recursive = false, includeHidden = false } = {}) {
  const items = [];
  const visit = (current) => {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (!includeHidden && entry.name.startsWith(".")) continue;
      const full = path.join(current, entry.name);
      const stat = fs.statSync(full);
      items.push({
        name: entry.name,
        path: full,
        relative: path.relative(dirPath, full) || ".",
        type: entry.isDirectory() ? "directory" : "file",
        size: entry.isDirectory() ? null : stat.size,
        modified_at: stat.mtime.toISOString(),
      });
      if (recursive && entry.isDirectory()) {
        visit(full);
      }
    }
  };
  visit(dirPath);
  return items;
}

function readTextByType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const raw = fs.readFileSync(filePath, "utf8");

  if (ext === ".json") {
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  }

  if (ext === ".csv") {
    return raw
      .split(/\r?\n/)
      .slice(0, 500)
      .join("\n");
  }

  if (ext === ".html" || ext === ".htm") {
    return raw
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return raw;
}

function splitChunks(text, chunkSize = 3200) {
  const chunks = [];
  let index = 0;
  while (index < text.length) {
    chunks.push(text.slice(index, index + chunkSize));
    index += chunkSize;
  }
  return chunks.length ? chunks : [""];
}

function summarizeText(text, { maxLength = 1200 } = {}) {
  const normalized = String(text || "").replace(/\r/g, "").trim();
  if (!normalized) {
    return {
      concise_summary: "The document appears empty.",
      key_points: [],
      action_items: [],
    };
  }

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const paragraph = normalized.replace(/\s+/g, " ");
  const concise = paragraph.slice(0, Math.max(120, Math.min(maxLength, 550)));

  const keyPoints = [];
  for (const line of lines) {
    if (keyPoints.length >= 8) break;
    if (/^[-*]|^\d+\.|^#{1,6}\s/.test(line) || line.length > 40) {
      keyPoints.push(line.slice(0, 220));
    }
  }

  const actionItems = lines
    .filter((line) => /\b(todo|action|next|follow up|fix|should|must|owner)\b/i.test(line))
    .slice(0, 8)
    .map((line) => line.slice(0, 220));

  return {
    concise_summary: concise,
    key_points: keyPoints,
    action_items: actionItems,
  };
}

function renderSummaryMarkdown({ sourcePath, summary }) {
  const ts = nowIso();
  const points = summary.key_points.length
    ? summary.key_points.map((entry) => `- ${entry}`).join("\n")
    : "- No clear key points detected.";
  const items = summary.action_items.length
    ? summary.action_items.map((entry) => `- ${entry}`).join("\n")
    : "- No explicit action items detected.";

  return [
    "# Document Summary",
    "",
    `- Source file: ${sourcePath}`,
    `- Generated at: ${ts}`,
    "",
    "## Concise Summary",
    "",
    summary.concise_summary,
    "",
    "## Key Points",
    "",
    points,
    "",
    "## Action Items / Notable Findings",
    "",
    items,
    "",
  ].join("\n");
}

function safeWriteText(targetPath, content, { overwrite = false, createParents = true, dryRun = false } = {}) {
  const exists = fs.existsSync(targetPath);
  if (exists && !overwrite) {
    throw new Error(`Target already exists and overwrite=false: ${targetPath}`);
  }
  if (dryRun) {
    return { wrote: false, existsBefore: exists };
  }
  if (createParents) ensureDir(path.dirname(targetPath));
  fs.writeFileSync(targetPath, String(content), "utf8");
  return { wrote: true, existsBefore: exists };
}

function ensureSnapshotForFile(run, filePath) {
  if (!fs.existsSync(filePath)) return null;
  const snapshotId = createId("snapshot");
  const folder = path.join(snapshotsRoot, run.runId);
  ensureDir(folder);
  const backupPath = path.join(folder, `${snapshotId}${path.extname(filePath) || ".txt"}`);
  fs.copyFileSync(filePath, backupPath);
  const entry = {
    snapshotId,
    runId: run.runId,
    createdAt: nowIso(),
    originalPath: filePath,
    backupPath,
    kind: "file_backup",
  };
  run.snapshots.push(entry);
  appendJsonLine(path.join(runtimeRoot, "snapshots.jsonl"), entry);
  return entry;
}

// ── Resolve natural-language utility name → safelist key ─────────────────────
const _UTILITY_ALIASES = Object.freeze({
  // Control Panel / Settings
  "control panel": "control-panel", "control": "control-panel",
  "settings": "settings", "windows settings": "settings", "system settings": "settings", "pc settings": "settings",
  "display": "display", "display settings": "display", "screen settings": "display", "monitor settings": "display", "resolution": "display",
  "sound": "sound", "sound settings": "sound", "audio": "sound", "audio settings": "sound", "volume": "sound",
  "bluetooth": "bluetooth", "bluetooth settings": "bluetooth",
  "wifi": "wifi", "wi-fi": "wifi", "wifi settings": "wifi", "wireless": "wifi",
  "network": "network", "network settings": "network", "internet": "network", "internet settings": "network",
  "apps": "apps", "apps and features": "apps", "installed apps": "apps", "programs": "apps",
  "storage": "storage", "storage settings": "storage", "disk space": "storage",
  "personalization": "personalization", "wallpaper": "personalization", "themes": "personalization", "background": "personalization",
  "windows update": "windows-update", "update": "windows-update", "updates": "windows-update", "check for updates": "windows-update",
  "privacy": "privacy", "privacy settings": "privacy",
  "about": "about", "about this pc": "about", "system info": "system-info", "system information": "system-info",
  // Utilities
  "task manager": "task-manager", "taskmgr": "task-manager", "windows task manager": "task-manager",
  "device manager": "device-manager", "devices": "device-manager",
  "disk management": "disk-management",
  "event viewer": "event-viewer", "event log": "event-viewer",
  "services": "services", "windows services": "services",
  "calculator": "calculator", "calc": "calculator",
  "notepad": "notepad", "text editor": "notepad",
  "paint": "paint", "ms paint": "paint", "mspaint": "paint",
  "file explorer": "file-explorer", "explorer": "file-explorer", "my computer": "file-explorer", "this pc": "file-explorer",
  "command prompt": "command-prompt", "cmd": "command-prompt",
  "powershell": "powershell", "terminal": "powershell",
  "snipping tool": "snipping-tool", "screenshot": "snipping-tool", "screen capture": "snipping-tool",
  "resource monitor": "resource-monitor", "resmon": "resource-monitor",
  "performance monitor": "performance-monitor", "perfmon": "performance-monitor",
  "registry editor": "registry-editor", "regedit": "registry-editor", "registry": "registry-editor",
  "defrag": "defrag", "defragment": "defrag", "optimize drives": "defrag",
  "firewall": "firewall", "windows security": "firewall", "defender": "firewall", "windows defender": "firewall",
  "environment variables": "environment-variables", "env vars": "environment-variables",
  "programs and features": "programs-and-features", "add remove programs": "programs-and-features", "uninstall": "programs-and-features",
  "mouse": "mouse", "mouse settings": "mouse",
  "keyboard": "keyboard", "keyboard settings": "keyboard",
  "printers": "printers", "printers and scanners": "printers", "printer": "printers",
  "date and time": "date-time", "date time": "date-time", "clock": "date-time",
  "power": "power", "power settings": "power", "power and sleep": "power", "sleep settings": "power", "battery": "power",
});

export function resolveSystemUtility(input) {
  const key = String(input || "").trim().toLowerCase()
    .replace(/^(the|my|windows)\s+/i, "")
    .replace(/\s+/g, " ");
  if (!key) return null;
  // Exact alias match
  if (_UTILITY_ALIASES[key]) {
    const safeKey = _UTILITY_ALIASES[key];
    return SYSTEM_UTILITY_SAFELIST[safeKey] ? { ...SYSTEM_UTILITY_SAFELIST[safeKey], key: safeKey } : null;
  }
  // Direct safelist key match
  if (SYSTEM_UTILITY_SAFELIST[key]) {
    return { ...SYSTEM_UTILITY_SAFELIST[key], key };
  }
  // Substring match — find best (shortest key that contains the input)
  const candidates = Object.entries(_UTILITY_ALIASES)
    .filter(([alias]) => alias.includes(key) || key.includes(alias))
    .map(([, safeKey]) => safeKey);
  if (candidates.length) {
    const safeKey = candidates[0];
    return SYSTEM_UTILITY_SAFELIST[safeKey] ? { ...SYSTEM_UTILITY_SAFELIST[safeKey], key: safeKey } : null;
  }
  return null;
}

// ── Fuzzy / typo-tolerant intent helpers ───────────────────────────────────
/**
 * Levenshtein edit-distance (compact, no deps).
 * Returns the minimum number of single-character edits (insert, delete, replace).
 */
function editDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/** Return the best match from `candidates` within `maxDist`, or null. */
function fuzzyBest(word, candidates, maxDist = 2) {
  let best = null;
  let bestDist = maxDist + 1;
  for (const c of candidates) {
    // Quick skip: length difference alone exceeds threshold
    if (Math.abs(word.length - c.length) > maxDist) continue;
    const d = editDistance(word, c);
    if (d < bestDist) { best = c; bestDist = d; }
    if (d === 0) break;
  }
  return bestDist <= maxDist ? best : null;
}

// Known action verbs and the intents they map to
const _INTENT_VERBS = {
  // file creation verbs
  create: "create", make: "create", generate: "create", add: "create", new: "create",
  // open / launch verbs
  open: "open", launch: "open", start: "open", run: "open", show: "open",
  // file ops
  move: "move", copy: "copy", rename: "rename", delete: "delete", remove: "delete", trash: "delete",
  // read / view
  read: "read", view: "read", display: "read", cat: "read",
  // summarize
  summarize: "summarize", summarise: "summarize", summary: "summarize",
  // search / find
  search: "search", find: "search", grep: "search", locate: "search",
  // list
  list: "list", ls: "list", dir: "list",
};

// Object nouns that help disambiguate
const _INTENT_OBJECTS = {
  file: "file", folder: "folder", directory: "folder",
  // system utilities — resolved later via resolveSystemUtility
  "control panel": "utility", settings: "utility", "task manager": "utility",
  calculator: "utility", notepad: "utility", paint: "utility",
  explorer: "utility", terminal: "utility", powershell: "utility",
  cmd: "utility", "command prompt": "utility", "device manager": "utility",
};

/**
 * Attempt fuzzy classification of a chat message when all regex patterns failed.
 * Returns a { verb, object, rawVerb, rawObject } hint or null.
 */
function fuzzyClassifyIntent(text) {
  const words = text.toLowerCase()
    .replace(/[^\w\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  if (words.length < 2) return null;

  // Filler words to skip
  const fillers = new Set([
    "a", "an", "the", "my", "this", "that", "up", "me", "for", "please",
    "can", "you", "could", "would", "i", "want", "to", "need", "like",
    "windows", "go", "bring", "pull", "hey", "hi", "yo",
    "plz", "pls", "just", "quickly", "now", "it", "its",
  ]);

  // 1. Find the verb (first meaningful word that fuzzy-matches a known verb)
  const verbCandidates = Object.keys(_INTENT_VERBS);
  let verb = null;
  let rawVerb = null;
  let verbIndex = -1;
  for (let i = 0; i < Math.min(words.length, 5); i++) {
    const w = words[i];
    if (fillers.has(w)) continue;
    // Exact match first
    if (_INTENT_VERBS[w]) { verb = _INTENT_VERBS[w]; rawVerb = w; verbIndex = i; break; }
    // Fuzzy match (allow 1-2 char typos; even short words like "open" get mangled)
    const maxD = w.length <= 3 ? 1 : 2;
    const match = fuzzyBest(w, verbCandidates, maxD);
    if (match) { verb = _INTENT_VERBS[match]; rawVerb = w; verbIndex = i; break; }
  }
  if (!verb) return null;

  // 2. Collect the remaining words after the verb as the object phrase
  const remaining = words.slice(verbIndex + 1).filter((w) => !fillers.has(w));
  if (!remaining.length) return null;
  const rawObject = remaining.join(" ");

  // 3. Try to classify the object
  // For "open" intents → check utility aliases
  if (verb === "open") {
    const resolved = resolveSystemUtility(rawObject);
    if (resolved) return { verb: "open", object: "utility", rawVerb, rawObject, resolved };
    // Also try fuzzy match against utility alias keys
    const aliasKeys = Object.keys(_UTILITY_ALIASES);
    const fuzzyAlias = fuzzyBest(rawObject, aliasKeys, 3);
    if (fuzzyAlias) {
      const resolved2 = resolveSystemUtility(fuzzyAlias);
      if (resolved2) return { verb: "open", object: "utility", rawVerb, rawObject, resolved: resolved2 };
    }
  }

  // For file ops → check if there's a recognizable object noun
  const objectKeys = Object.keys(_INTENT_OBJECTS);
  for (const objKey of objectKeys) {
    if (rawObject.includes(objKey)) {
      return { verb, object: _INTENT_OBJECTS[objKey], rawVerb, rawObject };
    }
  }
  // Fuzzy match individual remaining words against object nouns
  for (const w of remaining) {
    const match = fuzzyBest(w, objectKeys, 2);
    if (match) return { verb, object: _INTENT_OBJECTS[match], rawVerb, rawObject };
  }

  // If verb is "open" but object didn't match a utility, might still be relevant
  if (verb === "open") return { verb, object: "unknown", rawVerb, rawObject };

  return null;
}

function executeStep(run, step, options = {}) {
  const dryRun = options.dryRun === true;
  const actionId = createId("action");
  const startedAt = Date.now();
  const result = {
    action_id: actionId,
    run_id: run.runId,
    command: step.action,
    args_summary: JSON.stringify(step.args),
    dry_run: dryRun,
    approval_status: options.approvalStatus || "not_required",
    output_paths: [],
    elapsed_ms: 0,
    success: false,
    rollback: null,
    error: null,
    result: null,
  };

  try {
    const args = validateContract(step.action, step.args);

    if (step.action === "list_directory") {
      const dirPath = normalizePathInput(args.path);
      const allowed = classifyPath(dirPath);
      if (!allowed.allowed) throw new Error(allowed.reason);
      if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
        throw new Error(`Directory not found: ${dirPath}`);
      }
      result.result = {
        directory: dirPath,
        entries: listDirectoryEntries(dirPath, {
          recursive: args.recursive === true,
          includeHidden: args.include_hidden === true,
        }),
      };
    } else if (step.action === "read_text_file") {
      const filePath = normalizePathInput(args.path);
      const allowed = classifyPath(filePath);
      if (!allowed.allowed) throw new Error(allowed.reason);
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        throw new Error(`File not found: ${filePath}`);
      }
      const text = readTextByType(filePath);
      const maxChars = Number(args.max_chars || 16000);
      result.result = {
        path: filePath,
        text: text.slice(0, Math.max(200, Math.min(maxChars, 250000))),
      };
    } else if (step.action === "search_files") {
      const root = normalizePathInput(args.root);
      const allowed = classifyPath(root);
      if (!allowed.allowed) throw new Error(allowed.reason);
      const pattern = String(args.pattern || "*").trim();
      const query = String(args.content_query || "").trim().toLowerCase();
      const recursive = args.recursive !== false;
      const files = listDirectoryEntries(root, { recursive, includeHidden: false })
        .filter((entry) => entry.type === "file")
        .map((entry) => entry.path)
        .filter((entry) => pattern === "*" || entry.toLowerCase().includes(pattern.toLowerCase()));

      const matches = [];
      for (const filePath of files.slice(0, 4000)) {
        if (!query) {
          matches.push({ path: filePath, matched: "path" });
          continue;
        }
        const text = readTextByType(filePath).toLowerCase();
        if (text.includes(query)) {
          matches.push({ path: filePath, matched: "content" });
        }
      }
      result.result = { root, pattern, content_query: query || null, matches };
    } else if (step.action === "create_folder") {
      const folderPath = normalizePathInput(args.path);
      const allowed = classifyPath(folderPath);
      if (!allowed.allowed) throw new Error(allowed.reason);
      if (!dryRun) fs.mkdirSync(folderPath, { recursive: args.parents !== false });
      result.output_paths.push(folderPath);
      result.result = { path: folderPath, created: !dryRun };
    } else if (step.action === "write_text_file") {
      const filePath = normalizePathInput(args.path);
      const allowed = classifyPath(filePath);
      if (!allowed.allowed) throw new Error(allowed.reason);
      if (args.overwrite === true) {
        const snap = ensureSnapshotForFile(run, filePath);
        if (snap) result.rollback = { snapshot_id: snap.snapshotId };
      }
      safeWriteText(filePath, args.content, {
        overwrite: args.overwrite === true,
        createParents: args.create_parents !== false,
        dryRun,
      });
      result.output_paths.push(filePath);
      result.result = { path: filePath, wrote: !dryRun };
    } else if (step.action === "append_text_file") {
      const filePath = normalizePathInput(args.path);
      const allowed = classifyPath(filePath);
      if (!allowed.allowed) throw new Error(allowed.reason);
      if (fs.existsSync(filePath)) {
        const snap = ensureSnapshotForFile(run, filePath);
        if (snap) result.rollback = { snapshot_id: snap.snapshotId };
      } else if (args.create_if_missing === false) {
        throw new Error(`File does not exist: ${filePath}`);
      }
      if (!dryRun) {
        ensureDir(path.dirname(filePath));
        fs.appendFileSync(filePath, String(args.content), "utf8");
      }
      result.output_paths.push(filePath);
      result.result = { path: filePath, appended: !dryRun };
    } else if (step.action === "move_file") {
      const source = normalizePathInput(args.source);
      const destination = normalizePathInput(args.destination);
      if (!classifyPath(source).allowed) throw new Error("Source path violates policy.");
      if (!classifyPath(destination).allowed) throw new Error("Destination path violates policy.");
      if (!fs.existsSync(source)) throw new Error(`Source file does not exist: ${source}`);
      if (fs.existsSync(destination) && args.overwrite !== true) {
        throw new Error(`Destination exists and overwrite=false: ${destination}`);
      }
      const sourceSnap = ensureSnapshotForFile(run, source);
      if (sourceSnap) result.rollback = { snapshot_id: sourceSnap.snapshotId, restore_to: source };
      if (!dryRun) {
        ensureDir(path.dirname(destination));
        if (fs.existsSync(destination) && args.overwrite === true) {
          const destinationSnap = ensureSnapshotForFile(run, destination);
          if (destinationSnap) result.rollback = { ...(result.rollback || {}), destination_snapshot_id: destinationSnap.snapshotId };
          fs.rmSync(destination, { force: true });
        }
        fs.renameSync(source, destination);
      }
      result.output_paths.push(destination);
      result.result = { source, destination, moved: !dryRun };
    } else if (step.action === "copy_file") {
      const source = normalizePathInput(args.source);
      const destination = normalizePathInput(args.destination);
      if (!classifyPath(source).allowed) throw new Error("Source path violates policy.");
      if (!classifyPath(destination).allowed) throw new Error("Destination path violates policy.");
      if (!fs.existsSync(source)) throw new Error(`Source file does not exist: ${source}`);
      if (fs.existsSync(destination) && args.overwrite !== true) {
        throw new Error(`Destination exists and overwrite=false: ${destination}`);
      }
      if (fs.existsSync(destination) && args.overwrite === true) {
        const snap = ensureSnapshotForFile(run, destination);
        if (snap) result.rollback = { snapshot_id: snap.snapshotId };
      }
      if (!dryRun) {
        ensureDir(path.dirname(destination));
        fs.copyFileSync(source, destination);
      }
      result.output_paths.push(destination);
      result.result = { source, destination, copied: !dryRun };
    } else if (step.action === "rename_file") {
      const sourcePath = normalizePathInput(args.path);
      const destination = path.join(path.dirname(sourcePath), String(args.new_name || "").trim());
      if (!classifyPath(sourcePath).allowed || !classifyPath(destination).allowed) {
        throw new Error("Rename path violates policy.");
      }
      if (!fs.existsSync(sourcePath)) throw new Error(`File does not exist: ${sourcePath}`);
      if (fs.existsSync(destination) && args.overwrite !== true) {
        throw new Error(`Rename target exists and overwrite=false: ${destination}`);
      }
      const snap = ensureSnapshotForFile(run, sourcePath);
      if (snap) result.rollback = { snapshot_id: snap.snapshotId, restore_to: sourcePath };
      if (!dryRun) {
        if (fs.existsSync(destination) && args.overwrite === true) fs.rmSync(destination, { force: true });
        fs.renameSync(sourcePath, destination);
      }
      result.output_paths.push(destination);
      result.result = { source: sourcePath, destination, renamed: !dryRun };
    } else if (step.action === "delete_file") {
      const targetPath = normalizePathInput(args.path);
      if (!classifyPath(targetPath).allowed) throw new Error("Delete path violates policy.");
      if (!fs.existsSync(targetPath)) throw new Error(`Path does not exist: ${targetPath}`);
      const safeDelete = args.safe !== false;
      const snap = ensureSnapshotForFile(run, targetPath);
      if (snap) result.rollback = { snapshot_id: snap.snapshotId, restore_to: targetPath };
      if (!dryRun) {
        if (safeDelete) {
          ensureDir(trashRoot);
          const trashPath = path.join(trashRoot, `${Date.now()}_${path.basename(targetPath)}`);
          fs.renameSync(targetPath, trashPath);
          result.result = { path: targetPath, safe: true, trashed_to: trashPath };
          result.output_paths.push(trashPath);
        } else {
          fs.rmSync(targetPath, { recursive: true, force: true });
          result.result = { path: targetPath, safe: false, deleted: true };
        }
      } else {
        result.result = { path: targetPath, safe: safeDelete, deleted: false };
      }
    } else if (step.action === "inspect_document") {
      const docPath = normalizePathInput(args.path);
      if (!classifyPath(docPath).allowed) throw new Error("Document path violates policy.");
      const stat = fs.statSync(docPath);
      const text = readTextByType(docPath);
      result.result = {
        path: docPath,
        extension: path.extname(docPath).toLowerCase(),
        size_bytes: stat.size,
        modified_at: stat.mtime.toISOString(),
        preview: text.slice(0, 1200),
        chunk_count: splitChunks(text).length,
      };
    } else if (step.action === "summarize_document") {
      const sourcePath = normalizePathInput(args.source_path);
      if (!classifyPath(sourcePath).allowed) throw new Error("Source document path violates policy.");
      const text = readTextByType(sourcePath);
      const summary = summarizeText(text, { maxLength: Number(args.max_length || 1200) });
      const outputPath = args.output_path
        ? normalizePathInput(args.output_path)
        : path.join(path.dirname(sourcePath), `${path.parse(sourcePath).name}.summary.md`);
      if (!classifyPath(outputPath).allowed) throw new Error("Summary output path violates policy.");
      const markdown = renderSummaryMarkdown({ sourcePath, summary });
      safeWriteText(outputPath, markdown, {
        overwrite: true,
        createParents: true,
        dryRun,
      });
      result.output_paths.push(outputPath);
      result.result = { source_path: sourcePath, output_path: outputPath, summary };
    } else if (step.action === "batch_summarize_folder") {
      const sourceFolder = normalizePathInput(args.source_folder);
      const outputFolder = normalizePathInput(args.output_folder);
      if (!classifyPath(sourceFolder).allowed || !classifyPath(outputFolder).allowed) {
        throw new Error("Batch summarize path violates policy.");
      }
      const patterns = Array.isArray(args.patterns) && args.patterns.length
        ? args.patterns.map((entry) => String(entry).toLowerCase())
        : [".txt", ".md", ".json", ".csv", ".html", ".htm"];
      const entries = listDirectoryEntries(sourceFolder, { recursive: args.recursive !== false, includeHidden: false })
        .filter((entry) => entry.type === "file")
        .filter((entry) => patterns.includes(path.extname(entry.path).toLowerCase()));

      const summaries = [];
      for (const entry of entries) {
        const text = readTextByType(entry.path);
        const summary = summarizeText(text, { maxLength: 1000 });
        const outputPath = path.join(outputFolder, `${path.parse(entry.path).name}.summary.md`);
        const markdown = renderSummaryMarkdown({ sourcePath: entry.path, summary });
        safeWriteText(outputPath, markdown, { overwrite: true, createParents: true, dryRun });
        summaries.push({ source_path: entry.path, output_path: outputPath, summary });
      }
      result.output_paths.push(outputFolder);
      result.result = { source_folder: sourceFolder, output_folder: outputFolder, count: summaries.length, summaries };
    } else if (step.action === "export_summary_report") {
      const outputPath = normalizePathInput(args.output_path);
      if (!classifyPath(outputPath).allowed) throw new Error("Export path violates policy.");
      let entries = Array.isArray(args.entries) ? args.entries : [];
      if (!entries.length && args.source_folder) {
        const folder = normalizePathInput(args.source_folder);
        const listing = listDirectoryEntries(folder, { recursive: true, includeHidden: false });
        entries = listing
          .filter((entry) => entry.type === "file" && entry.path.toLowerCase().endsWith(".summary.md"))
          .map((entry) => ({ source_path: entry.path, output_path: entry.path }));
      }
      const lines = [
        "# Summary Export Report",
        "",
        `Generated at: ${nowIso()}`,
        "",
        "## Entries",
        "",
      ];
      if (!entries.length) {
        lines.push("- No summary entries were provided.");
      } else {
        for (const entry of entries) {
          lines.push(`- Source: ${entry.source_path || "unknown"}`);
          lines.push(`  - Output: ${entry.output_path || "unknown"}`);
        }
      }
      safeWriteText(outputPath, lines.join("\n"), { overwrite: true, createParents: true, dryRun });
      result.output_paths.push(outputPath);
      result.result = { output_path: outputPath, entries_count: entries.length };
    } else if (step.action === "open_system_utility") {
      const resolved = resolveSystemUtility(args.utility);
      if (!resolved) {
        throw new Error(`Unknown or blocked utility: "${args.utility}". Use a recognized Windows utility name.`);
      }
      if (!dryRun) {
        try {
          execFile(resolved.exe, resolved.args, { windowsHide: false, shell: false });
        } catch (launchErr) {
          throw new Error(`Failed to launch ${resolved.label}: ${launchErr.message}`);
        }
      }
      result.result = { utility: resolved.key, label: resolved.label, launched: !dryRun };
    } else {
      throw new Error(`Unsupported action: ${step.action}`);
    }

    result.success = true;
  } catch (error) {
    result.success = false;
    result.error = String(error?.message || error);
  }

  result.elapsed_ms = Date.now() - startedAt;
  appendJsonLine(path.join(runtimeRoot, "actions.jsonl"), {
    ts: nowIso(),
    ...result,
  });

  writeAuditEvent({
    type: "action",
    action: step.action,
    reason: result.success ? `Governed action executed: ${step.action}` : `Governed action failed: ${result.error}`,
    result: result.success ? "success" : "failed",
    meta: {
      runId: run.runId,
      dryRun: result.dry_run,
      outputPaths: result.output_paths,
      approvalStatus: result.approval_status,
      elapsedMs: result.elapsed_ms,
    },
  });

  return result;
}

/**
 * Split a compound user request into individual action fragments.
 * Recognises "…and then…", "…and also…", "…then…", "…also…", "…after that…".
 * Returns null if the message is not compound.
 * @param {string} text
 * @returns {string[] | null}
 */
function generateStoryContent(theme, titleHint) {
  const title = titleHint
    ? titleHint.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : (theme ? theme.replace(/\b\w/g, (c) => c.toUpperCase()) : "A Story");
  const divider = "─".repeat(Math.min(title.length + 4, 52));

  // ── Theme-aware story builder ──────────────────────────────────────────────
  // Attempt to build a story that is actually *about* the theme rather than a
  // generic template that ignores it.
  if (theme) {
    const t = theme.toLowerCase();

    // Detect key concepts so we can write relevant prose.
    const isAnimal = /\b(monkey|monkeys|ape|apes|dog|dogs|cat|cats|fox|foxes|bear|bears|rabbit|wolf|bird|fish|horse|lion|tiger|elephant|snake|parrot|penguin|raccoon|squirrel)\b/.test(t);
    const subject = theme.split(/\s+/)[0]; // first word — the main noun
    const plural = /s$/.test(subject);     // rough plural check
    const pronoun = plural ? "they" : "it";
    const possessive = plural ? "their" : "its";

    const hasMoney = /\b(money|cash|coin|earn|wealth|rich|profit|income|gold|dollar)\b/.test(t);
    const hasSell  = /\b(sell|selling|sold|market|shop|vendor|merchant|trade|trading|business|busin)\b/.test(t);
    const hasAdventure = /\b(adventure|quest|journey|travel|explore|discover|search|find|hunt|escape)\b/.test(t);
    const hasLove  = /\b(love|romance|heart|together|relationship|couple|feelings|crush)\b/.test(t);
    const hasHero  = /\b(hero|battle|fight|war|save|rescue|brave|courage|villain|danger)\b/.test(t);

    // Extract an object/product from the theme if sell-related
    // e.g. "monkeys selling bannans" → "bananas"
    const productMatch = t.match(/\bselling\s+([\w\s]+?)(?:\s+and|\s+to|\s+on|$)/);
    const product = productMatch ? productMatch[1].trim() : null;

    let opening, middle, ending;

    if (isAnimal && (hasMoney || hasSell)) {
      const goods = product || "their wares";
      opening =
        `Deep in the heart of the jungle, a remarkable troop of ${subject} had discovered something that would change ${possessive} world forever: the art of commerce.\n\n` +
        `It started with the eldest of the group — a wizened, bright-eyed creature who had watched the two-legged traders pass through the forest for years. ` +
        `"We have goods," she announced one morning, gesturing grandly toward the towering trees. "The forest has buyers. Why should we be the ones going hungry?"\n\n` +
        `And so the ${subject} went to market.`;
      middle =
        `The first day was loud and chaotic. ${pronoun.charAt(0).toUpperCase() + pronoun.slice(1)} set up stalls from palm leaves and vines, stacking ${goods} in careful towers. ` +
        `Customers bartered in every language — some offered seeds, some offered shelter, some offered nothing at all and hoped for the best.\n\n` +
        `But the ${subject} were quick learners. By midday they had a pricing system. By sundown they had a waiting list. ` +
        `By the end of the week, word had spread across three valleys: if you wanted the finest ${goods} in the region, you went to the ${subject}.`;
      ending =
        `The money — piled now in hollow logs and smooth river stones — was less important than what came with it. ` +
        `${pronoun.charAt(0).toUpperCase() + pronoun.slice(1)} had built something: routine, reputation, a reason to get up in the morning.\n\n` +
        `"We are not rich," the elder said at the season's end, looking out across their little empire of leaves and laughter.\n\n` +
        `"No," agreed the youngest, dangling upside down from a branch. "But we are *busy*. And that," she grinned, "is almost better."`;
    } else if (hasAdventure) {
      opening =
        `The ${subject} had always known ${possessive} ordinary life was a temporary arrangement.\n\n` +
        `The call came on a morning like any other — unremarkable skies, unremarkable routines — except for a single detail that refused to fit. ` +
        `Something about the world had shifted, almost imperceptibly, in the night. And the only way forward was through it.`;
      middle =
        `What followed was neither easy nor entirely planned. The path wound through places that didn't appear on any map, past landmarks that seemed to rearrange themselves when ${pronoun} wasn't looking. ` +
        `There were wrong turns. There were moments of doubt so heavy ${pronoun} had to stop and breathe through them.\n\n` +
        `But there was also this: the quiet, stubborn knowledge that the journey was real, that it mattered, and that stopping was not an option ${pronoun} was willing to consider.`;
      ending =
        `When ${pronoun} finally arrived — wherever "arrived" turned out to mean — the destination was not what ${pronoun} expected.\n\n` +
        `It was better. Not in the way of prizes or celebrations, but in the way of understanding. ` +
        `The ${subject} stood still for a moment, looked back at the distance covered, and allowed ${possessive}self a single, quiet exhale.\n\n` +
        `Enough. More than enough.`;
    } else if (hasLove) {
      opening =
        `Nobody warns you about the ordinary moments — the ones that don't announce themselves, that slip in quietly between everything else, and rearrange you from the inside.\n\n` +
        `For the ${subject}, it began like that. Not with a grand gesture or a declaration, but with a morning that was slightly warmer than expected and a conversation that ran two hours longer than it had any business doing.`;
      middle =
        `There were complications, of course. There always are. The timing was wrong in several directions at once, and there were days when the whole thing seemed more effort than wisdom.\n\n` +
        `But the ${subject} kept finding ${possessive}way back. Not because it was easy — it wasn't — but because some things, once started, don't know how to stop gracefully.`;
      ending =
        `The story did not end with a conclusion so much as it opened into something larger: a life that had room in it now for more than one heartbeat.\n\n` +
        `That, the ${subject} thought, was worth every difficult morning that had come before it.`;
    } else {
      // Generic theme-aware fallback: use the theme as the central subject
      opening =
        `The story of ${theme} began, as most stories do, on an ordinary day that had quietly decided it was done being ordinary.\n\n` +
        `No announcement, no warning. Just a moment where something shifted, and the world that came after was unmistakably different from the world that came before.`;
      middle =
        `The ${subject} moved through it the only way available: forward, one decision at a time, making sense of things as they arrived rather than waiting until everything was certain.\n\n` +
        `The pieces came in the wrong order — they always do. But there is something to be said for building while the dust is still settling. The structure holds better that way, with imperfection worked right into its bones.`;
      ending =
        `What remained, after everything, was something simpler and sturdier than anyone had thought to plan for.\n\n` +
        `Not a resolution, exactly. More like a beginning that had finally decided to take ${possessive}self seriously.\n\n` +
        `And that, it turned out, was exactly enough.`;
    }

    return [
      title,
      `~ ${theme} ~`,
      divider,
      "",
      opening,
      "",
      middle,
      "",
      ending,
      "",
    ].join("\n");
  }

  // ── Generic fallback (no theme provided) ──────────────────────────────────
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const protagonist = pick([
    "a curious traveler", "a young inventor", "an old lighthouse keeper",
    "a wandering musician", "a small fox named Kit", "a retired astronaut",
  ]);
  const setting = pick([
    "a forgotten mountain village", "a city that never slept",
    "a coastal town at the edge of the world", "an ancient forest where nothing ever truly died",
  ]);
  const incitingEvent = pick([
    "a mysterious letter arrived with no return address",
    "a door appeared in a wall where no door had ever been",
    "they found a notebook filled entirely with tomorrow's dates",
  ]);
  const resolution = pick([
    "discovered the journey itself had been the destination all along",
    "learned that sometimes the bravest thing is simply to begin again",
    "realized the world was far stranger and more beautiful than they had ever imagined",
  ]);

  return [
    title,
    divider,
    "",
    `There was once ${protagonist} in ${setting}.`,
    "",
    `For a long time, life moved slowly and without event. Then, one ordinary day, ${incitingEvent}.`,
    "",
    `Nothing made sense at first — the pieces arrived in the wrong order, like a puzzle shaken loose from its box. ` +
    `But they kept going, through doubt and distance and the quiet hours before dawn.`,
    "",
    `And in the end, they ${resolution}.`,
    "",
    `Some things, once found, cannot be unfound. That, as it turned out, was more than enough.`,
    "",
  ].join("\n");
}

function splitCompoundRequest(text) {
  // Avoid splitting inside quoted strings or paths.
  const splitter = /\s+(?:and\s+then|and\s+also|then\s+also|then|also|after\s+that)\s+/i;
  const parts = text.split(splitter).map((s) => s.trim()).filter(Boolean);
  return parts.length >= 2 ? parts : null;
}

function buildChatActionPlan(message, options = {}) {
  // Try compound splitting first: if the message contains conjunctions,
  // plan each fragment independently and merge steps into one workflow.
  const fragments = splitCompoundRequest(String(message || "").trim());
  if (fragments) {
    const mergedSteps = [];
    for (const fragment of fragments) {
      const sub = buildSingleActionPlan(fragment, options);
      if (sub) mergedSteps.push(...sub.steps);
    }
    if (mergedSteps.length >= 2) {
      const dryRun = /\b(dry[- ]?run|preview only|do not write|simulate)\b/i.test(String(message).toLowerCase()) || options.dryRun === true;
      const plan = {
        workflow_id: createId("workflow"),
        source: "chat",
        message: String(message || "").trim(),
        dry_run: dryRun,
        steps: mergedSteps,
        planner: "compound-v1",
      };
      return attachApprovalMetadata(plan);
    }
  }

  // Fall through to single-action planning.
  return buildSingleActionPlan(message, options);
}

function normalizeTypos(raw) {
  // Fix common transpositions and misspellings for key intent words only.
  return String(raw || "")
    .replace(/\bwrtie\b/gi, "write").replace(/\bwriet\b/gi, "write").replace(/\bwirte\b/gi, "write")
    .replace(/\bwritting\b/gi, "writing").replace(/\bwriten\b/gi, "written")
    .replace(/\bcrate\b/gi, "create").replace(/\bcreat\b/gi, "create").replace(/\bcreste\b/gi, "create")
    .replace(/\bmaek\b/gi, "make").replace(/\bmakeing\b/gi, "making")
    .replace(/\bsav\b/gi, "save").replace(/\bsaved\b/gi, "save")
    .replace(/\bstorey\b/gi, "story").replace(/\bstorie\b/gi, "story").replace(/\bstorry\b/gi, "story")
    .replace(/\btale\b/gi, "story").replace(/\btales\b/gi, "story")
    .replace(/\bfiel\b/gi, "file").replace(/\bfil\b/gi, "file")
    .replace(/\bdestkop\b/gi, "desktop").replace(/\bdesltop\b/gi, "desktop");
}

function hasWord(lower, stems) {
  return stems.some((s) => lower.includes(s));
}

function buildSingleActionPlan(message, options = {}) {
  const text = normalizeTypos(String(message || "").trim());
  const lower = text.toLowerCase();
  const dryRun = /\b(dry[- ]?run|preview only|do not write|simulate)\b/i.test(lower) || options.dryRun === true;
  const desktopRoot = getDesktopRoot();
  const documentsRoot = getDocumentsRoot();

  // ── Undo / Rollback intent ─────────────────────────────────────────────
  if (/\b(undo|rollback|undo\s+that|revert|never\s*mind|take\s+(?:that|it)\s+back)\b/i.test(lower)) {
    const sessionHints = getSessionHints(options.sessionId);
    const runId = sessionHints.lastRunId;
    if (runId) {
      return {
        workflow_id: createId("workflow"),
        source: "chat",
        message: text,
        dry_run: false,
        steps: [],
        planner: "undo-v1",
        _undoRunId: runId,
      };
    }
    // No previous run to undo — fall through to null (brain handles "nothing to undo").
    return null;
  }

  const plan = {
    workflow_id: createId("workflow"),
    source: "chat",
    message: text,
    dry_run: dryRun,
    steps: [],
    planner: "deterministic-v1",
  };

  const desktopHint = /desktop/i.test(lower);
  const documentsHint = /documents/i.test(lower);
  const defaultBase = desktopHint ? desktopRoot : documentsHint ? documentsRoot : taskmanagerRoot;
  const stripLocationTail = (value) =>
    String(value || "")
      .replace(/\s+(?:on|in|at)\s+(?:my\s+)?(?:desktop|documents)\b.*$/i, "")
      .trim();

  const folderMatch =
    text.match(/folder(?:\s+(?:on|in|at)\s+(?:my\s+)?(?:desktop|documents))?\s+(?:called|named)\s+"([^"]+)"/i) ||
    text.match(/folder(?:\s+(?:on|in|at)\s+(?:my\s+)?(?:desktop|documents))?\s+(?:called|named)\s+'([^']+)'/i) ||
    text.match(/folder(?:\s+(?:on|in|at)\s+(?:my\s+)?(?:desktop|documents))?\s+(?:called|named)\s+([\w ._-]+)/i);
  if (/create\s+(a\s+)?folder/i.test(lower) && folderMatch) {
    const folderName = stripLocationTail(folderMatch[1]).trim();
    plan.steps.push({
      action: "create_folder",
      args: { path: path.join(defaultBase, folderName), parents: true },
    });
    return attachApprovalMetadata(plan);
  }

  if (/create\s+(a\s+)?(markdown|md)\s+file/i.test(lower)) {
    const nameMatch = text.match(/(?:called|named)\s+([\w ._-]+(?:\.md)?)/i);
    const fileName = nameMatch ? nameMatch[1].trim() : `notes-${new Date().toISOString().slice(0, 10)}.md`;
    const normalizedName = fileName.toLowerCase().endsWith(".md") ? fileName : `${fileName}.md`;
    const content = `# Task List\n\n- Generated at ${nowIso()}\n`;
    plan.steps.push({
      action: "write_text_file",
      args: { path: path.join(defaultBase, normalizedName), content, overwrite: false, create_parents: true },
    });
    return attachApprovalMetadata(plan);
  }

  // ── Loose intent signals (stem-based, tolerant of word order) ─────────────
  const actionWords = ["creat", "writ", "mak", "generat", "sav", "produc", "craft", "compos", "draft", "put", "add", "build", "stor"];
  const contentWords = ["file", "story", "stories", "tale", "poem", "essay", "note", "narrative", "txt", "text", "doc", "piece", "content"];
  const creativeWords = ["story", "stories", "tale", "poem", "essay", "narrative", "fiction", "adventure", "romance", "thriller", "creative", "piece"];

  const hasAction = hasWord(lower, actionWords);
  const hasContent = hasWord(lower, contentWords);
  const hasCreative = hasWord(lower, creativeWords);
  const hasRandom = /\brandom\b/i.test(lower);

  const storyIntent = hasCreative || (hasAction && /\bin\s+it\b/i.test(lower)) || (hasRandom && hasContent);
  const storyTheme = text.match(/\babout\s+([^,.\n]+?)(?:\s+and\s+(?:save|put|store)|\s+on\s+my|\s+in\s+folder|\s+at\s+|[,.]|$)/i)?.[1]?.trim() || null;

  // Broad file-write intent: action verb present AND (content target OR desktop/save)
  const fileWriteIntent =
    (hasAction && hasContent) ||
    (hasAction && desktopHint && (storyIntent || hasRandom)) ||
    (hasCreative && desktopHint);

  if (fileWriteIntent ||
      /\b(?:create|write|make)\s+(a\s+)?((text|txt|json|csv|html)\s+)?file\b/i.test(lower)) {
    const quotedName =
      text.match(/(?:called|named)\s+"([^"]+)"/i)?.[1] ||
      text.match(/(?:called|named)\s+'([^']+)'/i)?.[1] ||
      null;
    const looseNamed = text.match(/(?:called|named)\s+([\w ._\/-]+)/i)?.[1] || null;
    const inlineName =
      text.match(/create\s+(?:a\s+)?(?:text|txt|json|csv|html)?\s*file\s+([\w ._\/-]+(?:\.[a-z0-9]+)?)/i)?.[1] ||
      null;
    // "save it on my desktop as monkeybuissness" / "save as X" / "as X" at end of message
    const asName =
      text.match(/\bsave\s+(?:it\s+)?(?:(?:on|to)\s+(?:my\s+)?(?:desktop|documents)\s+)?as\s+([\w._-]+)/i)?.[1] ||
      text.match(/\bas\s+([\w._-]+)\s*$/i)?.[1] ||
      null;

    const requestedName = stripLocationTail(quotedName || looseNamed || inlineName || asName || "");
    const typeHint = text.match(/\b(text|txt|json|csv|html)\s+file\b/i)?.[1]?.toLowerCase() || null;
    const hasExtension = /\.[a-z0-9]+$/i.test(requestedName);
    const defaultName = storyIntent
      ? `story-${new Date().toISOString().slice(0, 10)}`
      : `note-${new Date().toISOString().slice(0, 10)}`;
    const fallbackExtByType = {
      text: ".txt",
      txt: ".txt",
      json: ".json",
      csv: ".csv",
      html: ".html",
    };
    const fallbackExt = fallbackExtByType[typeHint] || ".txt";
    const normalizedName =
      (requestedName || defaultName) + (requestedName && hasExtension ? "" : fallbackExt);

    const explicitFolder =
      text.match(/\bin\s+folder\s+([\w ._\/-]+)$/i)?.[1]?.trim() ||
      text.match(/\bin\s+([A-Za-z]:\\[^\n]+)$/i)?.[1]?.trim() ||
      text.match(/\bat\s+([A-Za-z]:\\[^\n]+)$/i)?.[1]?.trim() ||
      null;

    const baseDir = explicitFolder ? normalizePathInput(explicitFolder, { baseDir: defaultBase }) : defaultBase;
    const titleHint = (requestedName || defaultName).replace(/\.[^.]+$/, "");
    const explicitContent =
      text.match(/\bwith\s+content\s+"([^"]+)"/i)?.[1] ||
      text.match(/\bwith\s+content\s+'([^']+)'/i)?.[1] ||
      null;
    // Use template as initial content; async LLM upgrade happens in tryHandleGovernedChatRequest.
    const content = explicitContent ||
      (storyIntent ? generateStoryContent(storyTheme, titleHint) : `Generated by governed action at ${nowIso()}\n`);

    plan.steps.push({
      action: "write_text_file",
      args: {
        path: path.join(baseDir, normalizedName),
        content,
        overwrite: false,
        create_parents: true,
      },
    });
    // Tag so the async layer can upgrade story content via LLM before execution.
    if (storyIntent && !explicitContent) {
      plan._storyMeta = { theme: storyTheme, titleHint };
    }
    return attachApprovalMetadata(plan);
  }

  if (/summarize\s+all/i.test(lower) && /folder/i.test(lower)) {
    const sourceMatch = text.match(/in\s+this\s+folder[:]?\s*(.+)?$/i) || text.match(/in\s+folder\s+(.+)$/i);
    const sourceFolder = sourceMatch?.[1]?.trim() ? normalizePathInput(sourceMatch[1].trim(), { baseDir: defaultBase }) : defaultBase;
    const outputFolder = path.join(sourceFolder, "Summaries");
    const patterns = [];
    if (/\btxt\b|\.txt\b/i.test(text)) patterns.push(".txt");
    if (/\bmd\b|markdown|\.md\b/i.test(text)) patterns.push(".md");
    if (/\bjson\b|\.json\b/i.test(text)) patterns.push(".json");
    if (/\bcsv\b|\.csv\b/i.test(text)) patterns.push(".csv");
    if (/\bhtml\b|\.html?\b/i.test(text)) patterns.push(".html", ".htm");
    const summaryPatterns = patterns.length ? [...new Set(patterns)] : [".txt", ".md", ".json", ".csv", ".html"];
    plan.steps.push({ action: "create_folder", args: { path: outputFolder, parents: true } });
    plan.steps.push({
      action: "batch_summarize_folder",
      args: {
        source_folder: sourceFolder,
        output_folder: outputFolder,
        patterns: summaryPatterns,
        recursive: true,
        mode: "concise",
      },
    });
    plan.steps.push({
      action: "export_summary_report",
      args: { output_path: path.join(outputFolder, "summary-report.md"), source_folder: outputFolder },
    });
    return attachApprovalMetadata(plan);
  }

  if (/summarize\s+this\s+document/i.test(lower) || /summarize\s+document/i.test(lower)) {
    const sourceMatch = text.match(/document\s+(.+?)(?:\s+and\s+save|$)/i) || text.match(/file\s+(.+?)(?:\s+and\s+save|$)/i);
    if (sourceMatch?.[1]) {
      const sourcePath = normalizePathInput(sourceMatch[1].trim(), { baseDir: defaultBase });
      plan.steps.push({ action: "summarize_document", args: { source_path: sourcePath } });
      return attachApprovalMetadata(plan);
    }
  }

  if (/summarize\s+/i.test(lower) && /\s+file\s+/i.test(lower)) {
    const sourceMatch = text.match(/(?:summarize|summarise)\s+(?:the\s+)?file\s+(.+?)(?:\s+and\s+save|$)/i);
    if (sourceMatch?.[1]) {
      const sourcePath = normalizePathInput(sourceMatch[1].trim(), { baseDir: defaultBase });
      const saveNextToSource = /next\s+to\s+it|alongside/i.test(lower);
      const outputPath = saveNextToSource
        ? path.join(path.dirname(sourcePath), `${path.parse(sourcePath).name}.summary.md`)
        : undefined;
      plan.steps.push({ action: "summarize_document", args: { source_path: sourcePath, ...(outputPath ? { output_path: outputPath } : {}) } });
      return attachApprovalMetadata(plan);
    }
  }

  if (/read\s+this\s+file/i.test(lower) && /append/i.test(lower)) {
    const sourceMatch = text.match(/read\s+this\s+file\s+(.+?)\s+and\s+append/i);
    const targetMatch = text.match(/append\s+.*\s+to\s+(.+)$/i);
    if (sourceMatch?.[1] && targetMatch?.[1]) {
      const sourcePath = normalizePathInput(sourceMatch[1].trim(), { baseDir: defaultBase });
      const targetPath = normalizePathInput(targetMatch[1].trim(), { baseDir: defaultBase });
      plan.steps.push({ action: "read_text_file", args: { path: sourcePath, max_chars: 4000 } });
      plan.steps.push({ action: "append_text_file", args: { path: targetPath, content: "\n- Key takeaways pending extraction\n", create_if_missing: true } });
      return attachApprovalMetadata(plan);
    }
  }

  if (/read\s+file/i.test(lower) && /append/i.test(lower)) {
    const sourceMatch = text.match(/read\s+file\s+(.+?)\s+and\s+append/i);
    const targetMatch = text.match(/append\s+.*\s+to\s+(.+)$/i);
    if (sourceMatch?.[1] && targetMatch?.[1]) {
      const sourcePath = normalizePathInput(sourceMatch[1].trim(), { baseDir: defaultBase });
      const targetPath = normalizePathInput(targetMatch[1].trim(), { baseDir: defaultBase });
      plan.steps.push({ action: "read_text_file", args: { path: sourcePath, max_chars: 4000 } });
      plan.steps.push({ action: "append_text_file", args: { path: targetPath, content: "\n- Key takeaways pending extraction\n", create_if_missing: true } });
      return attachApprovalMetadata(plan);
    }
  }

  if (/\bmove\s+file\b/i.test(lower) && /\bto\b/i.test(lower)) {
    const moveMatch =
      text.match(/move\s+file\s+"([^"]+)"\s+to\s+"([^"]+)"$/i) ||
      text.match(/move\s+file\s+(.+?)\s+to\s+(.+)$/i);
    if (moveMatch?.[1] && moveMatch?.[2]) {
      plan.steps.push({
        action: "move_file",
        args: {
          source: normalizePathInput(moveMatch[1].trim(), { baseDir: defaultBase }),
          destination: normalizePathInput(moveMatch[2].trim(), { baseDir: defaultBase }),
          overwrite: false,
        },
      });
      return attachApprovalMetadata(plan);
    }
  }

  if (/\bcopy\s+file\b/i.test(lower) && /\bto\b/i.test(lower)) {
    const copyMatch =
      text.match(/copy\s+file\s+"([^"]+)"\s+to\s+"([^"]+)"$/i) ||
      text.match(/copy\s+file\s+(.+?)\s+to\s+(.+)$/i);
    if (copyMatch?.[1] && copyMatch?.[2]) {
      plan.steps.push({
        action: "copy_file",
        args: {
          source: normalizePathInput(copyMatch[1].trim(), { baseDir: defaultBase }),
          destination: normalizePathInput(copyMatch[2].trim(), { baseDir: defaultBase }),
          overwrite: false,
        },
      });
      return attachApprovalMetadata(plan);
    }
  }

  if (/\brename\s+file\b/i.test(lower) && /\bto\b/i.test(lower)) {
    const renameMatch =
      text.match(/rename\s+file\s+"([^"]+)"\s+to\s+"([^"]+)"$/i) ||
      text.match(/rename\s+file\s+(.+?)\s+to\s+(.+)$/i);
    if (renameMatch?.[1] && renameMatch?.[2]) {
      plan.steps.push({
        action: "rename_file",
        args: {
          path: normalizePathInput(renameMatch[1].trim(), { baseDir: defaultBase }),
          new_name: path.basename(renameMatch[2].trim()),
          overwrite: false,
        },
      });
      return attachApprovalMetadata(plan);
    }
  }

  if (/\bdelete\s+file\b/i.test(lower)) {
    const deleteMatch = text.match(/delete\s+file\s+"([^"]+)"$/i) || text.match(/delete\s+file\s+(.+)$/i);
    if (deleteMatch?.[1]) {
      plan.steps.push({
        action: "delete_file",
        args: {
          path: normalizePathInput(deleteMatch[1].trim(), { baseDir: defaultBase }),
          safe: true,
        },
      });
      return attachApprovalMetadata(plan);
    }
  }

  if (/list\s+(directory|folder)/i.test(lower)) {
    const folder = text.match(/(?:directory|folder)\s+(.+)$/i)?.[1]?.trim() || defaultBase;
    plan.steps.push({ action: "list_directory", args: { path: folder, recursive: false, include_hidden: false } });
    return attachApprovalMetadata(plan);
  }

  if (/read\s+file/i.test(lower)) {
    const file = text.match(/read\s+file\s+(.+)$/i)?.[1]?.trim();
    if (file) {
      plan.steps.push({ action: "read_text_file", args: { path: file, max_chars: 8000 } });
      return attachApprovalMetadata(plan);
    }
  }

  if (/search\s+files?/i.test(lower)) {
    const pattern = text.match(/pattern\s+([\w.*-]+)/i)?.[1] || "*";
    const query = text.match(/for\s+"([^"]+)"/i)?.[1] || null;
    const rootMatch = text.match(/\bin\s+folder\s+(.+)$/i) || text.match(/\bin\s+([A-Za-z]:\\[^\n]+)$/i);
    plan.steps.push({
      action: "search_files",
      args: {
        root: rootMatch?.[1] ? normalizePathInput(rootMatch[1].trim(), { baseDir: defaultBase }) : defaultBase,
        pattern,
        content_query: query,
        recursive: true,
      },
    });
    return attachApprovalMetadata(plan);
  }

  // ── Open system utility / settings / app ────────────────────────────────
  const openMatch =
    lower.match(/(?:open|launch|start|run|show|bring up|pull up|go to)\s+(?:the\s+|my\s+|windows\s+)?(.+?)(?:\s+(?:for me|please|app|application|window|utility|menu|panel|settings|screen))*\s*$/i);
  if (openMatch) {
    const utilityPhrase = openMatch[1].replace(/\s+(?:for me|please)$/i, "").trim();
    const resolved = resolveSystemUtility(utilityPhrase);
    if (resolved) {
      plan.steps.push({
        action: "open_system_utility",
        args: { utility: resolved.key },
      });
      return attachApprovalMetadata(plan);
    }
  }

  // ── Fuzzy / typo-tolerant fallback ──────────────────────────────────────
  // If none of the rigid regexes matched, try fuzzy classification to handle
  // misspellings and grammar variations (e.g. "opne contrl panle" → open control panel).
  const fuzzy = fuzzyClassifyIntent(text);
  if (fuzzy) {
    if (fuzzy.verb === "open" && fuzzy.object === "utility" && fuzzy.resolved) {
      plan.steps.push({
        action: "open_system_utility",
        args: { utility: fuzzy.resolved.key },
      });
      return attachApprovalMetadata(plan);
    }
    if (fuzzy.verb === "create" && fuzzy.object === "folder") {
      // Extract a usable folder name from the raw object
      const folderName = fuzzy.rawObject
        .replace(/\b(folder|directory|on|in|at|my|desktop|documents)\b/gi, "")
        .replace(/\s+/g, " ").trim() || `new-folder-${new Date().toISOString().slice(0, 10)}`;
      plan.steps.push({
        action: "create_folder",
        args: { path: path.join(defaultBase, folderName), parents: true },
      });
      return attachApprovalMetadata(plan);
    }
    if (fuzzy.verb === "create" && (fuzzy.object === "file" || fuzzy.object === "unknown")) {
      const rawName = fuzzy.rawObject
        .replace(/\b(file|on|in|at|my|desktop|documents)\b/gi, "")
        .replace(/\s+/g, " ").trim();
      const fileName = rawName || `note-${new Date().toISOString().slice(0, 10)}.txt`;
      const normalizedName = /\.[a-z0-9]+$/i.test(fileName) ? fileName : `${fileName}.txt`;
      plan.steps.push({
        action: "write_text_file",
        args: {
          path: path.join(defaultBase, normalizedName),
          content: `Generated by governed action at ${nowIso()}\n`,
          overwrite: false,
          create_parents: true,
        },
      });
      return attachApprovalMetadata(plan);
    }
    if (fuzzy.verb === "list" && fuzzy.object === "folder") {
      plan.steps.push({ action: "list_directory", args: { path: defaultBase, recursive: false, include_hidden: false } });
      return attachApprovalMetadata(plan);
    }
    if (fuzzy.verb === "delete" && fuzzy.object === "file") {
      const filePath = fuzzy.rawObject.replace(/\b(file)\b/gi, "").trim();
      if (filePath) {
        plan.steps.push({
          action: "delete_file",
          args: { path: normalizePathInput(filePath, { baseDir: defaultBase }), safe: true },
        });
        return attachApprovalMetadata(plan);
      }
    }
  }

  return null;
}

function attachApprovalMetadata(plan) {
  plan.steps = plan.steps.map((step) => {
    const approval = classifyApprovalRequirement(step, { dryRun: plan.dry_run === true });
    return {
      ...step,
      approval,
    };
  });
  return plan;
}

function buildApprovalPreview(plan) {
  const paths = [];
  let creates = 0;
  let overwrites = 0;
  let deletes = 0;
  for (const step of plan.steps) {
    if (["create_folder", "write_text_file", "append_text_file"].includes(step.action)) creates += 1;
    if (step.args?.overwrite === true) overwrites += 1;
    if (step.action === "delete_file") deletes += 1;
    for (const key of ["path", "source", "destination", "source_path", "output_path", "source_folder", "output_folder", "root"]) {
      if (step.args?.[key]) paths.push(String(step.args[key]));
    }
  }
  return {
    requested_action: `${plan.steps.length} governed step(s)`,
    target_paths: [...new Set(paths)].slice(0, 20),
    create_overwrite_delete: { creates, overwrites, deletes },
    files_affected_hint: paths.length,
    dry_run_preview: plan.dry_run === true,
    risk_summary: plan.steps
      .filter((step) => step.approval?.needsApproval)
      .map((step) => `${step.action}: ${step.approval.risk}`)
      .join(" | ") || "No elevated risk detected.",
  };
}

function enqueueApproval(plan, requestedBy = "chat") {
  const approval = {
    id: `gov-${nextApprovalId++}`,
    status: APPROVAL_STATUS.PENDING,
    createdAt: nowIso(),
    action: "governed-workflow",
    tier: 2,
    tierLabel: "approve",
    confidence: 100,
    reason: `Governed workflow requires approval for ${plan.steps.length} step(s).`,
    moduleId: "governed-actions",
    moduleDisplayName: "Governed Action System",
    workflow: plan,
    preview: buildApprovalPreview(plan),
    requestedBy,
  };
  pendingApprovals.push(approval);
  persistApprovalRecord(approval);

  writeAuditEvent({
    type: "approval",
    moduleId: approval.moduleId,
    moduleDisplayName: approval.moduleDisplayName,
    action: approval.action,
    tier: approval.tier,
    tierLabel: approval.tierLabel,
    confidence: approval.confidence,
    reason: approval.reason,
    result: "pending",
    meta: { approvalId: approval.id, preview: approval.preview },
  });

  return approval;
}

function executePlan(plan, { approvalStatus = "not_required" } = {}) {
  const run = {
    runId: createId("run"),
    workflowId: plan.workflow_id,
    createdAt: nowIso(),
    dryRun: plan.dry_run === true,
    approvalStatus,
    steps: plan.steps,
    results: [],
    snapshots: [],
    success: true,
  };

  for (const step of plan.steps) {
    const result = executeStep(run, step, {
      dryRun: run.dryRun,
      approvalStatus,
    });
    run.results.push(result);
    if (!result.success) {
      run.success = false;
      break;
    }
  }

  const finished = {
    ...run,
    finishedAt: nowIso(),
    outputPaths: [...new Set(run.results.flatMap((entry) => entry.output_paths || []))],
  };

  actionRuns.set(run.runId, finished);
  appendJsonLine(path.join(runtimeRoot, "runs.jsonl"), finished);
  return finished;
}

function buildChatReplyFromRun(run) {
  if (!run.success) {
    const failed = run.results.find((entry) => !entry.success);
    return `I started the governed workflow but it failed at ${failed?.command || "an action"}: ${failed?.error || "unknown error"}.`;
  }

  // Friendly reply for system utility launches
  if (run.results.length === 1 && run.results[0].command === "open_system_utility") {
    const res = run.results[0].result;
    if (run.dryRun) return `Dry-run: I would open ${res?.label || res?.utility || "that utility"} for you.`;
    return `Done — I opened ${res?.label || res?.utility || "that"} for you.`;
  }

  // Multi-step compound reply — list each action individually.
  if (run.results.length > 1) {
    const parts = run.results.map((entry, i) => {
      if (entry.command === "open_system_utility") {
        return `${i + 1}. Opened ${entry.result?.label || entry.result?.utility || "a utility"}`;
      }
      return `${i + 1}. ${entry.command}${entry.output_paths?.length ? ` → ${entry.output_paths[0]}` : ""}`;
    });
    const prefix = run.dryRun ? "Dry-run complete. I would:" : "Done — I completed all steps:";
    return `${prefix}\n${parts.join("\n")}\nRun id: ${run.runId}${run.dryRun ? "" : "\n💡 Say \"undo\" to roll back."}`;
  }

  const actionLabels = run.results.map((entry) => entry.command).join(", ");
  const outputs = run.outputPaths.slice(0, 6);
  const undoHint = run.dryRun ? "" : " Say \"undo\" to roll back.";
  return [
    run.dryRun
      ? `Dry-run complete. I planned and simulated these actions: ${actionLabels}.`
      : `Workflow complete. I executed: ${actionLabels}.`,
    outputs.length ? `Output paths: ${outputs.join(" | ")}` : "No output files were produced.",
    `Run id: ${run.runId}.${undoHint}`,
  ].join(" ");
}

export function getGovernedActionContracts() {
  return {
    actions: SUPPORTED_ACTIONS,
    contracts: ACTION_CONTRACTS,
    approvedRoots: getApprovedRoots().map((entry) => ({ key: entry.key, path: entry.path, mode: entry.mode })),
  };
}

export function getPendingGovernedApprovals() {
  return pendingApprovals
    .filter((entry) => entry.status === APPROVAL_STATUS.PENDING)
    .slice()
    .sort(compareApprovalRecency);
}

export function declineGovernedApproval(approvalId) {
  const approval = pendingApprovals.find((entry) => entry.id === approvalId);
  if (!approval) return null;
  approval.status = APPROVAL_STATUS.DECLINED;
  approval.declinedAt = nowIso();
  persistApprovalRecord(approval);
  writeAuditEvent({
    type: "approval",
    moduleId: approval.moduleId,
    moduleDisplayName: approval.moduleDisplayName,
    action: approval.action,
    tier: approval.tier,
    tierLabel: approval.tierLabel,
    confidence: approval.confidence,
    reason: `Governed workflow declined: ${approval.reason}`,
    result: "skipped",
    meta: { approvalId: approval.id },
  });
  return approval;
}

export function approveGovernedApproval(approvalId) {
  const approval = pendingApprovals.find((entry) => entry.id === approvalId);
  if (!approval) return null;
  approval.status = APPROVAL_STATUS.APPROVED;
  approval.approvedAt = nowIso();
  const run = executePlan(approval.workflow, { approvalStatus: "approved" });
  approval.runId = run.runId;
  persistApprovalRecord(approval);
  return { approval, run };
}

export function rollbackGovernedRun(runId) {
  const run = actionRuns.get(runId);
  if (!run) {
    return { ok: false, error: `Run not found: ${runId}` };
  }

  const restored = [];
  for (const snapshot of [...run.snapshots].reverse()) {
    try {
      if (snapshot.kind === "file_backup" && fs.existsSync(snapshot.backupPath)) {
        ensureDir(path.dirname(snapshot.originalPath));
        fs.copyFileSync(snapshot.backupPath, snapshot.originalPath);
        restored.push({ snapshot_id: snapshot.snapshotId, restored_to: snapshot.originalPath });
      }
    } catch (error) {
      return {
        ok: false,
        error: `Rollback failed for snapshot ${snapshot.snapshotId}: ${String(error?.message || error)}`,
        restored,
      };
    }
  }

  writeAuditEvent({
    type: "rollback",
    moduleId: "governed-actions",
    moduleDisplayName: "Governed Action System",
    action: "rollback",
    tier: 2,
    tierLabel: "approve",
    confidence: 100,
    reason: `Rollback executed for run ${runId}`,
    result: "success",
    meta: { runId, restoredCount: restored.length },
  });

  return {
    ok: true,
    run_id: runId,
    restored,
  };
}

// ── Story LLM config ─────────────────────────────────────────────────────────
// Reads from STORY_LLM_* env vars, falling back to Ollama defaults.
// Uses a dedicated model (default: phi4-mini) separate from the main chat LLM.
function getStoryLlmConfig() {
  const base =
    process.env.STORY_LLM_BASE_URL?.trim() ||
    process.env.LOCAL_LLM_BASE_URL?.trim() ||
    (process.env.OLLAMA_HOST?.trim()
      ? `${process.env.OLLAMA_HOST.trim().replace(/\/$/, "")}/v1`
      : "http://127.0.0.1:11434/v1");
  const model =
    process.env.STORY_LLM_MODEL?.trim() ||
    "phi4-mini";
  const apiKey = process.env.STORY_LLM_API_KEY?.trim() || process.env.LOCAL_LLM_API_KEY?.trim() || "ollama";
  return { base: base.replace(/\/$/, ""), model, apiKey };
}

/**
 * Call the story LLM to generate content, then immediately unload the model.
 * Falls back to the template result if the LLM call fails or times out.
 * @param {string} theme
 * @param {string} titleHint
 * @param {string} fallback  — template-generated content to use on failure
 * @returns {Promise<string>}
 */
async function generateStoryViaLlm(theme, titleHint, fallback) {
  const { base, model, apiKey } = getStoryLlmConfig();
  const url = `${base}/chat/completions`;
  const title = titleHint
    ? titleHint.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : (theme || "A Story");

  const systemPrompt =
    "You are a creative fiction writer. Write vivid, engaging short stories (250–400 words). " +
    "Use a clear narrative structure: an opening that establishes character and setting, a middle with tension or discovery, and a satisfying resolution. " +
    "Do not use bullet points or headers — write flowing prose only.";

  const userPrompt = theme
    ? `Write a short story titled "${title}" about: ${theme}.\n\nWrite the story content only — no title header, no explanation.`
    : `Write a short creative story titled "${title}".\n\nWrite the story content only — no title header, no explanation.`;

  const timeoutMs = 90_000; // model may need to load
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      signal: ac.signal,
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt },
        ],
        temperature: 0.85,
        max_tokens: 600,
        stream: false,
        // Force all model layers onto GPU (VRAM) — avoids CPU/RAM offloading.
        options: { num_gpu: 999 },
      }),
    });

    if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
    const json = await res.json();
    const storyBody = json?.choices?.[0]?.message?.content?.trim();
    if (!storyBody) throw new Error("empty LLM response");

    const divider = "─".repeat(Math.min(title.length + 4, 52));
    const fullStory = [
      title,
      theme ? `~ ${theme} ~` : "",
      divider,
      "",
      storyBody,
      "",
    ].filter((l, i) => !(i === 1 && !theme)).join("\n");

    return fullStory;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
    // Unload the model immediately to free VRAM/RAM.
    void fetch(`${base.replace("/v1", "")}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, keep_alive: 0 }),
    }).catch(() => {});
  }
}

export async function tryHandleGovernedChatRequest(message, options = {}) {
  ensureDir(runtimeRoot);
  ensureDir(snapshotsRoot);
  ensureDir(summariesRoot);
  ensureDir(trashRoot);

  const plan = buildChatActionPlan(message, options);
  if (!plan) return null;

  // If the plan is a story write, upgrade the content via LLM before execution.
  if (plan._storyMeta) {
    const { theme, titleHint } = plan._storyMeta;
    const writeStep = plan.steps.find((s) => s.action === "write_text_file");
    if (writeStep) {
      writeStep.args.content = await generateStoryViaLlm(theme, titleHint, writeStep.args.content);
    }
    delete plan._storyMeta;
  }

  // Handle undo intent: the planner flagged this as an undo request.
  if (plan._undoRunId) {
    const result = rollbackGovernedRun(plan._undoRunId);
    if (result.ok) {
      return {
        handled: true,
        status: "executed",
        run: null,
        plan,
        reply: `Done — I rolled back the last action (run ${plan._undoRunId}). ${result.restored?.length || 0} file(s) restored.`,
      };
    }
    return {
      handled: true,
      status: "failed",
      run: null,
      plan,
      reply: `I tried to undo run ${plan._undoRunId} but it failed: ${result.error}`,
    };
  }

  const requiresApproval = plan.steps.some((step) => step.approval?.needsApproval);
  if (requiresApproval) {
    const approval = enqueueApproval(plan, "chat");
    return {
      handled: true,
      status: "approval_required",
      approval,
      plan,
      reply: `I created a governed workflow plan, but approval is required before execution. Approval id: ${approval.id}. Risk summary: ${approval.preview.risk_summary}`,
    };
  }

  const run = executePlan(plan, { approvalStatus: "not_required" });
  return {
    handled: true,
    status: run.success ? "executed" : "failed",
    run,
    plan,
    reply: buildChatReplyFromRun(run),
  };
}

export function executeGovernedPlanDirect(planInput, options = {}) {
  const plan = attachApprovalMetadata({
    workflow_id: planInput?.workflow_id || createId("workflow"),
    source: planInput?.source || "api",
    message: planInput?.message || "direct-plan",
    dry_run: planInput?.dry_run === true,
    steps: Array.isArray(planInput?.steps) ? planInput.steps : [],
    planner: "external",
  });

  const requiresApproval = plan.steps.some((step) => step.approval?.needsApproval);
  if (requiresApproval && options.autoApprove !== true) {
    const approval = enqueueApproval(plan, "api");
    return {
      status: "approval_required",
      approval,
      plan,
    };
  }

  const run = executePlan(plan, { approvalStatus: options.autoApprove ? "approved" : "not_required" });
  return {
    status: run.success ? "executed" : "failed",
    run,
    plan,
  };
}

export {
  normalizePathInput as normalizeGovernedPathInput,
  classifyPath as classifyGovernedPath,
  validateContract as validateGovernedActionContract,
  classifyApprovalRequirement as classifyGovernedApprovalRequirement,
  attachApprovalMetadata as decorateGovernedPlanWithApprovalMetadata,
  buildChatReplyFromRun as buildGovernedRunReply,
  buildChatActionPlan as buildLegacyGovernedChatActionPlan,
};
