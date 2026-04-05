import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawn } from "node:child_process";
import process from "node:process";

import {
  firstParagraph,
  normalizeSlashes,
  sentenceFragments,
} from "./brain-build-utils.mjs";
import { completeLocalLlm, getLocalLlmConfig } from "./brain-local-llm.mjs";
import { extractFrontMatter, parseYaml } from "./brain-yaml.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const brainRoot = path.join(repoRoot, "brain");
const userBrainFilesManifestPath = path.join(repoRoot, ".horizons-user-brain-files.json");

const DEFAULT_FILE_PREVIEW_CHARS = 48_000;
const MAX_FULL_FILE_CHARS = 220_000;
const MAX_SUMMARY_SOURCE_CHARS = 16_000;
const MAX_SUMMARY_SOURCE_FILES = 6;
const MAX_SUMMARY_WALK_DEPTH = 2;
const RECENT_WINDOW_MS = 1000 * 60 * 60 * 72;
const DEFAULT_SEARCH_LIMIT = 2000;
const MAX_SEARCH_LIMIT = 5000;
const MAX_CONTENT_SEARCH_BYTES = 512_000;
const SEARCH_EXCERPT_RADIUS = 110;
const BRAIN_SEARCH_CACHE_TTL_MS = 60_000;

const MARKDOWN_EXTENSIONS = new Set([".md", ".markdown"]);
const JSON_EXTENSIONS = new Set([".json", ".jsonl"]);
const YAML_EXTENSIONS = new Set([".yaml", ".yml"]);
const TEXT_EXTENSIONS = new Set([
  ".txt",
  ".log",
  ".csv",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".css",
  ".scss",
  ".html",
  ".xml",
  ".sql",
  ".sh",
  ".bat",
  ".cmd",
  ".ps1",
]);

const ROOT_DIRECTORY_PRIORITY = new Map([
  ["00-live", 0],
  ["apps", 1],
  ["core", 2],
  ["governance", 3],
  ["ops", 4],
  ["pipeline", 5],
  ["prompts", 6],
  ["registry", 7],
  ["SCHEMAS", 8],
  ["launcher", 9],
  ["imports", 10],
  ["evals", 11],
  ["runtime", 20],
  ["retrieval", 21],
  ["review", 22],
  ["memory", 23],
  ["_import", 24],
  ["_meta", 25],
]);

const ROOT_FILE_PRIORITY = new Map([
  ["00-LIVE-START-HERE.md", 0],
  ["README.md", 1],
  ["INDEX.md", 2],
  ["MANIFEST.yaml", 3],
  ["BRAIN_STAGING_RUNBOOK.md", 4],
]);

const DIRECTORY_DESCRIPTIONS = {
  "": "The root of the Horizons brain. Start with 00-live for fresh news and relevant runtime data, then move into authored areas when you need canonical product knowledge.",
  "00-live": "Human-first landing zone for the freshest news, promoted web learning, and live runtime digests.",
  apps: "Per-surface knowledge, prompts, drafts, and build output for each Horizons area.",
  core: "Shared product grounding, runtime contracts, and system-wide brain content.",
  governance: "Policies, rules, and operational guardrails for the assistant and its workflows.",
  ops: "Runbooks, deployment notes, and operational procedures.",
  pipeline: "Ingestion, research, and processing pipeline materials.",
  prompts: "Prompt assets and reusable assistant instructions.",
  registry: "Registry data that maps apps, modules, and source relationships.",
  SCHEMAS: "Schemas that validate normalized runtime and ingestion artifacts.",
  launcher: "Launcher-specific knowledge and supporting artifacts.",
  imports: "Imported knowledge packs and source materials.",
  evals: "Evaluation cases and reports for runtime quality checks.",
  runtime: "Live runtime state, logs, sessions, and learning artifacts produced by the system.",
  retrieval: "Search indexes, manifests, embeddings, and retrieval build outputs.",
  review: "Review-oriented logs and archived chat-turn artifacts.",
  memory: "Session snapshots and other memory-oriented runtime artifacts.",
};

let gitChangeCache = {
  expiresAt: 0,
  snapshot: {
    files: new Map(),
    folders: new Map(),
  },
};

let brainSearchCache = {
  builtAt: 0,
  docs: null,
};

let brainSearchResultsCache = {
  builtAt: 0,
  results: new Map(),
};

function invalidateBrainBrowserCaches() {
  gitChangeCache = {
    expiresAt: 0,
    snapshot: buildEmptyGitSnapshot(),
  };
  brainSearchCache = {
    builtAt: 0,
    docs: null,
  };
  brainSearchResultsCache = {
    builtAt: 0,
    results: new Map(),
  };
}

function normalizeRelativePath(value = "") {
  const raw = normalizeSlashes(String(value ?? "").trim()).replace(/^\/+/, "");
  if (!raw || raw === ".") return "";
  return raw.replace(/\/+$/, "");
}

export function resolveBrainBrowserPath(requestedPath = "") {
  const relativePath = normalizeRelativePath(requestedPath);
  if (relativePath.includes("\0")) {
    throw new Error("Invalid path");
  }
  const fullPath = path.resolve(brainRoot, relativePath || ".");
  const resolvedRoot = path.resolve(brainRoot);
  if (fullPath !== resolvedRoot && !fullPath.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error("Requested path must stay inside brain/");
  }
  return {
    fullPath,
    relativePath: normalizeRelativePath(path.relative(resolvedRoot, fullPath)),
  };
}

function readUserBrainFilesManifest() {
  if (!fs.existsSync(userBrainFilesManifestPath)) {
    return {
      v: 1,
      files: {},
    };
  }
  try {
    const raw = fs.readFileSync(userBrainFilesManifestPath, "utf8");
    const parsed = JSON.parse(raw);
    return {
      v: 1,
      files: parsed && typeof parsed.files === "object" && parsed.files ? parsed.files : {},
    };
  } catch {
    return {
      v: 1,
      files: {},
    };
  }
}

function writeUserBrainFilesManifest(manifest) {
  fs.writeFileSync(userBrainFilesManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function getUserBrainFileRecord(relativePath) {
  const manifest = readUserBrainFilesManifest();
  const key = normalizeRelativePath(relativePath);
  if (!key) return null;
  return manifest.files[key] && typeof manifest.files[key] === "object" ? manifest.files[key] : null;
}

function isUserCreatedBrainFile(relativePath) {
  return !!getUserBrainFileRecord(relativePath);
}

function registerUserBrainFile(relativePath) {
  const manifest = readUserBrainFilesManifest();
  const key = normalizeRelativePath(relativePath);
  manifest.files[key] = {
    createdAt: new Date().toISOString(),
    createdBy: "brain-browser",
  };
  writeUserBrainFilesManifest(manifest);
}

function unregisterUserBrainFile(relativePath) {
  const manifest = readUserBrainFilesManifest();
  const key = normalizeRelativePath(relativePath);
  delete manifest.files[key];
  writeUserBrainFilesManifest(manifest);
}

function ensureEditableUserBrainFile(relativePath) {
  if (!isUserCreatedBrainFile(relativePath)) {
    throw new Error("Only files created in the Brain Browser can be edited or removed.");
  }
}

function normalizeUserFileName(value = "") {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    throw new Error("File name is required.");
  }
  if (/[\\/]/.test(trimmed) || trimmed === "." || trimmed === "..") {
    throw new Error("Choose a file name only, not a nested path.");
  }
  if (/[<>:"|?*\u0000]/.test(trimmed)) {
    throw new Error("That file name contains unsupported characters.");
  }
  return path.extname(trimmed) ? trimmed : `${trimmed}.md`;
}

function starterContentForBrainFile(fileName) {
  const baseName = path.basename(fileName, path.extname(fileName)).replace(/[_-]+/g, " ").trim() || "New note";
  const title = baseName
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".json") {
    return '{\n  "title": ""\n}\n';
  }
  if (ext === ".yaml" || ext === ".yml") {
    return `title: ${title}\n`;
  }
  if (ext === ".txt") {
    return `${title}\n`;
  }
  return `# ${title}\n\n`;
}

function classifyBrainVisibility(relativePath) {
  const rel = normalizeRelativePath(relativePath);
  if (!rel) return "curated";
  const lower = rel.toLowerCase();
  if (lower === "runtime" || lower.startsWith("runtime/")) return "runtime";
  if (lower === "review" || lower.startsWith("review/")) return "runtime";
  if (lower === "memory" || lower.startsWith("memory/")) return "runtime";
  if (lower === "_import" || lower.startsWith("_import/")) return "generated";
  if (lower === "_meta" || lower.startsWith("_meta/")) return "generated";
  if (lower === "retrieval" || lower.startsWith("retrieval/")) return "generated";
  if (lower.startsWith("evals/generated")) return "generated";
  if (lower.includes("/knowledge/build") || lower.includes("/scenarios/build")) return "generated";
  if (lower.startsWith("launcher/knowledge/build")) return "generated";
  return "curated";
}

function shouldIncludeVisibility(visibility, includeRuntimeGenerated) {
  return includeRuntimeGenerated || visibility === "curated";
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function detectFormat(relativePath) {
  const ext = path.extname(relativePath).toLowerCase();
  if (MARKDOWN_EXTENSIONS.has(ext)) return "markdown";
  if (JSON_EXTENSIONS.has(ext)) return "json";
  if (YAML_EXTENSIONS.has(ext)) return "yaml";
  if (TEXT_EXTENSIONS.has(ext)) return "text";
  return "code";
}

function isRecentIso(modifiedAt) {
  const time = new Date(modifiedAt).getTime();
  return Number.isFinite(time) && Date.now() - time <= RECENT_WINDOW_MS;
}

function changePriority(changeType) {
  if (changeType === "new") return 2;
  if (changeType === "modified") return 1;
  return 0;
}

function buildEmptyGitSnapshot() {
  return {
    files: new Map(),
    folders: new Map(),
  };
}

function parseGitStatusChangeType(status) {
  const raw = String(status ?? "").trim();
  if (!raw) return null;
  if (raw === "??" || raw.includes("A")) return "new";
  if (raw.includes("M") || raw.includes("R") || raw.includes("C") || raw.includes("T") || raw.includes("U")) {
    return "modified";
  }
  if (raw.includes("D")) return "deleted";
  return null;
}

function addFolderAggregate(snapshot, folderPath, changeType) {
  const key = normalizeRelativePath(folderPath);
  const current = snapshot.folders.get(key) || { newCount: 0, modifiedCount: 0 };
  if (changeType === "new") current.newCount += 1;
  else if (changeType === "modified") current.modifiedCount += 1;
  snapshot.folders.set(key, current);
}

function getGitChangeSnapshot() {
  if (gitChangeCache.expiresAt > Date.now()) {
    return gitChangeCache.snapshot;
  }

  const snapshot = buildEmptyGitSnapshot();
  try {
    const raw = execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all", "--", "brain"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    for (const line of String(raw || "").split(/\r?\n/)) {
      if (!line.trim()) continue;
      const status = line.slice(0, 2);
      let filePath = line.slice(3).trim();
      if (!filePath) continue;
      if (filePath.includes(" -> ")) {
        const parts = filePath.split(" -> ");
        filePath = parts[parts.length - 1]?.trim() || "";
      }
      const normalized = normalizeSlashes(filePath);
      if (!normalized.startsWith("brain/")) continue;
      const relativePath = normalizeRelativePath(normalized.slice("brain/".length));
      const changeType = parseGitStatusChangeType(status);
      if (!relativePath || !changeType || changeType === "deleted") continue;
      snapshot.files.set(relativePath, {
        changeType,
        rawStatus: status,
      });
      let currentFolder = normalizeRelativePath(path.posix.dirname(relativePath));
      if (currentFolder === ".") currentFolder = "";
      while (true) {
        addFolderAggregate(snapshot, currentFolder, changeType);
        if (!currentFolder) break;
        const nextFolder = normalizeRelativePath(path.posix.dirname(currentFolder));
        if (nextFolder === currentFolder) break;
        currentFolder = nextFolder === "." ? "" : nextFolder;
      }
    }
  } catch {
    /* git status is best-effort only */
  }

  gitChangeCache = {
    expiresAt: Date.now() + 4000,
    snapshot,
  };
  return snapshot;
}

function isProbablyBinary(buffer) {
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
  if (!sample.length) return false;
  let suspicious = 0;
  for (const byte of sample) {
    if (byte === 0) return true;
    if (byte < 7 || (byte > 14 && byte < 32)) suspicious += 1;
  }
  return suspicious / sample.length > 0.1;
}

function safeReadUtf8(fullPath) {
  const buffer = fs.readFileSync(fullPath);
  if (isProbablyBinary(buffer)) {
    return { binary: true, text: "" };
  }
  return {
    binary: false,
    text: buffer.toString("utf8").replace(/\r\n/g, "\n"),
  };
}

function listImmediateChildren(fullPath) {
  if (!fs.existsSync(fullPath)) return [];
  return fs.readdirSync(fullPath, { withFileTypes: true }).map((entry) => {
    const entryPath = path.join(fullPath, entry.name);
    const stat = fs.statSync(entryPath);
    return {
      name: entry.name,
      fullPath: entryPath,
      kind: entry.isDirectory() ? "directory" : "file",
      size: stat.size,
      modifiedAt: stat.mtime.toISOString(),
    };
  });
}

function describeDirectory(relativePath) {
  const rel = normalizeRelativePath(relativePath);
  if (Object.prototype.hasOwnProperty.call(DIRECTORY_DESCRIPTIONS, rel)) {
    return DIRECTORY_DESCRIPTIONS[rel];
  }
  const parts = rel.split("/");
  if (parts[0] === "apps" && parts.length === 2) {
    return `${parts[1]} app knowledge, prompts, drafts, and build artifacts.`;
  }
  if (parts[0] === "apps" && parts[2] === "draft") {
    return `Draft knowledge and in-progress content for the ${parts[1]} surface.`;
  }
  if (parts[0] === "apps" && parts[2] === "knowledge") {
    return `Structured knowledge sources and generated artifacts for the ${parts[1]} surface.`;
  }
  if (parts[0] === "runtime" && parts[1] === "learning") {
    return "Idle-learning crawl inputs, promoted docs, processed captures, and queue state.";
  }
  if (parts[0] === "runtime" && parts[1] === "learning" && parts[2] === "promoted") {
    return "Promoted web-learned content. Start with digests for human-readable summaries, then open the newest dated folder for raw promoted notes.";
  }
  if (parts[0] === "runtime" && parts[1] === "learning" && parts[2] === "promoted" && parts[3] === "digests") {
    return "Daily human-readable news and learning digests. Newest digest files should be your first stop for fresh crawl output.";
  }
  if (parts[0] === "runtime" && parts[1] === "learning" && parts[2] === "manifests") {
    return "Per-cycle crawl and promotion manifests. Useful when you need exact counts, run-by-run auditability, or rollback context.";
  }
  if (parts[0] === "runtime" && parts[1] === "logs") {
    return "Operational logs captured by the runtime while chat, learning, and review flows run.";
  }
  if (parts[0] === "runtime" && parts[1] === "logs" && parts[2] === "digests") {
    return "Human-readable runtime summaries derived from raw logs. Start here before opening raw operational logs.";
  }
  return "Folder inside the Horizons brain.";
}

function filePriority(name) {
  const direct = ROOT_FILE_PRIORITY.get(name);
  if (direct != null) return direct;
  const lower = name.toLowerCase();
  if (lower.startsWith("readme")) return 0;
  if (lower.startsWith("index")) return 1;
  if (lower.startsWith("manifest")) return 2;
  if (lower.includes("runbook")) return 3;
  if (lower.includes("glossary")) return 4;
  if (MARKDOWN_EXTENSIONS.has(path.extname(lower))) return 5;
  if (YAML_EXTENSIONS.has(path.extname(lower))) return 6;
  if (JSON_EXTENSIONS.has(path.extname(lower))) return 7;
  return 20;
}

function directoryPriorityForParent(parentPath, name) {
  const parent = normalizeRelativePath(parentPath);
  if (!parent) {
    return ROOT_DIRECTORY_PRIORITY.get(name) ?? null;
  }
  if (parent === "runtime") {
    if (name === "learning") return 0;
    if (name === "logs") return 1;
    if (name === "sessions") return 2;
    if (name === "settings") return 3;
  }
  if (parent === "runtime/learning") {
    if (name === "promoted") return 0;
    if (name === "manifests") return 1;
    if (name === "state") return 2;
    if (name === "processed") return 3;
    if (name === "queue") return 4;
    if (name === "raw") return 5;
    if (name === "quarantine") return 6;
  }
  if (parent === "runtime/learning/promoted") {
    if (name === "digests") return 0;
    if (/^\d{4}-\d{2}-\d{2}$/.test(name)) return 1;
  }
  if (parent === "runtime/logs") {
    if (name === "digests") return 0;
    if (name === "fetch") return 1;
    if (name === "jobs") return 2;
    if (name === "chat-turns") return 3;
    if (name === "learned-qa") return 4;
  }
  return null;
}

function specialDateSort(parentPath, left, right) {
  const parent = normalizeRelativePath(parentPath);
  const leftIsDate = /^\d{4}-\d{2}-\d{2}$/.test(left.name);
  const rightIsDate = /^\d{4}-\d{2}-\d{2}$/.test(right.name);
  if (parent === "runtime/learning/promoted" && leftIsDate && rightIsDate) {
    return right.name.localeCompare(left.name);
  }
  const leftDigest = left.name.match(/(\d{4}-\d{2}-\d{2})/);
  const rightDigest = right.name.match(/(\d{4}-\d{2}-\d{2})/);
  if (
    (parent === "runtime/learning/promoted/digests" || parent === "runtime/logs/digests") &&
    leftDigest &&
    rightDigest
  ) {
    return rightDigest[1].localeCompare(leftDigest[1]) || left.name.localeCompare(right.name);
  }
  return 0;
}

function sortNodes(parentPath, left, right) {
  if (left.kind !== right.kind) {
    return left.kind === "directory" ? -1 : 1;
  }
  if (left.kind === "directory") {
    const leftPriority = directoryPriorityForParent(parentPath, left.name);
    const rightPriority = directoryPriorityForParent(parentPath, right.name);
    if (leftPriority != null || rightPriority != null) {
      const normalizedLeft = leftPriority ?? 999;
      const normalizedRight = rightPriority ?? 999;
      if (normalizedLeft !== normalizedRight) return normalizedLeft - normalizedRight;
    }
  }
  const specialDateDelta = specialDateSort(parentPath, left, right);
  if (specialDateDelta !== 0) return specialDateDelta;
  if (!normalizeRelativePath(parentPath) && left.kind === "directory") {
    const leftPriority = ROOT_DIRECTORY_PRIORITY.get(left.name) ?? 999;
    const rightPriority = ROOT_DIRECTORY_PRIORITY.get(right.name) ?? 999;
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;
  }
  const changeDelta = changePriority(right.changeType) - changePriority(left.changeType);
  if (changeDelta !== 0) return changeDelta;
  if ((left.changeScope === "self") !== (right.changeScope === "self")) {
    return left.changeScope === "self" ? -1 : 1;
  }
  if (left.recent !== right.recent) return left.recent ? -1 : 1;
  if (left.kind === "file") {
    const leftPriority = filePriority(left.name);
    const rightPriority = filePriority(right.name);
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;
  }
  return left.name.localeCompare(right.name);
}

function deriveChangeMetadata(relativePath, kind, changeSnapshot, modifiedAt) {
  const fileRecord = changeSnapshot.files.get(relativePath);
  if (kind === "file" && fileRecord) {
    return {
      changeType: fileRecord.changeType,
      changeScope: "self",
      changeSummary: fileRecord.changeType === "new" ? "New file" : "Modified file",
    };
  }
  const folderRecord = changeSnapshot.folders.get(relativePath);
  const recent = isRecentIso(modifiedAt);
  if (kind === "directory" && folderRecord) {
    const changeType = folderRecord.newCount > 0 ? "new" : "modified";
    const parts = [];
    if (folderRecord.newCount > 0) parts.push(`${folderRecord.newCount} new`);
    if (folderRecord.modifiedCount > 0) parts.push(`${folderRecord.modifiedCount} updated`);
    return {
      changeType,
      changeScope: "child",
      changeSummary: parts.length ? `Contains ${parts.join(", ")} item${parts.length === 1 ? "" : "s"}` : "Contains changes",
    };
  }
  if (recent) {
    return {
      changeType: null,
      changeScope: null,
      changeSummary: "Updated recently",
    };
  }
  return {
    changeType: null,
    changeScope: null,
    changeSummary: "",
  };
}

function buildNode(relativePath, entry, changeSnapshot, options = {}) {
  const includeDirectoryChildCount = options.includeDirectoryChildCount !== false;
  const childRelativePath = normalizeRelativePath(path.join(relativePath, entry.name));
  const visibility = classifyBrainVisibility(childRelativePath);
  const changeMeta = deriveChangeMetadata(childRelativePath, entry.kind, changeSnapshot, entry.modifiedAt);
  const payload = {
    path: childRelativePath,
    name: entry.name,
    kind: entry.kind,
    visibility,
    modifiedAt: entry.modifiedAt,
    recent: isRecentIso(entry.modifiedAt),
    changeType: changeMeta.changeType,
    changeScope: changeMeta.changeScope,
    changeSummary: changeMeta.changeSummary,
  };
  if (entry.kind === "directory") {
    if (includeDirectoryChildCount) {
      payload.childCount = fs.existsSync(entry.fullPath)
        ? fs.readdirSync(entry.fullPath, { withFileTypes: true }).length
        : 0;
    }
    payload.description = describeDirectory(childRelativePath);
  } else {
    payload.size = entry.size;
    payload.format = detectFormat(childRelativePath);
  }
  return payload;
}

function normalizeParentPath(relativePath) {
  const parentPath = normalizeRelativePath(path.dirname(relativePath));
  return parentPath === "." ? "" : parentPath;
}

function normalizeSearchComparable(value = "") {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[_./\\-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSearchTokens(value = "") {
  return [...new Set(normalizeSearchComparable(value).split(" ").filter((token) => token.length >= 3))];
}

function buildSearchExcerpt(text, matchIndex, queryLength) {
  const normalizedText = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!normalizedText) return "";
  const safeIndex = typeof matchIndex === "number" && matchIndex >= 0 ? matchIndex : 0;
  const start = Math.max(0, safeIndex - SEARCH_EXCERPT_RADIUS);
  const end = Math.min(normalizedText.length, safeIndex + queryLength + SEARCH_EXCERPT_RADIUS);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < normalizedText.length ? "..." : "";
  return `${prefix}${normalizedText.slice(start, end).trim()}${suffix}`;
}

function detectTextMatch(text, queryLower) {
  const sourceText = String(text ?? "");
  if (!sourceText) return null;
  const matchIndex = sourceText.toLowerCase().indexOf(queryLower);
  if (matchIndex < 0) return null;
  return {
    matchIndex,
    excerpt: buildSearchExcerpt(sourceText, matchIndex, queryLower.length),
  };
}

function detectLooseTextMatch(text, queryLower, comparableQuery) {
  const directMatch = detectTextMatch(text, queryLower);
  if (directMatch) return directMatch;
  const sourceText = String(text ?? "");
  if (!sourceText || !comparableQuery) return null;
  const comparableText = normalizeSearchComparable(sourceText);
  if (!comparableText) return null;
  if (comparableText.includes(comparableQuery)) {
    return {
      matchIndex: 0,
      excerpt: sourceText,
      tokenHits: comparableQuery.split(" ").filter(Boolean).length,
    };
  }
  return null;
}

function detectTokenMatch(text, queryTokens) {
  const sourceText = String(text ?? "");
  if (!sourceText || !Array.isArray(queryTokens) || !queryTokens.length) return null;
  const comparableText = normalizeSearchComparable(sourceText);
  if (!comparableText) return null;
  let tokenHits = 0;
  for (const token of queryTokens) {
    if (comparableText.includes(token)) tokenHits += 1;
  }
  const minimumHits = queryTokens.length >= 3 ? 2 : 1;
  if (tokenHits < minimumHits) return null;
  return {
    matchIndex: 0,
    excerpt: sourceText,
    tokenHits,
  };
}

function detectIndexedTextMatch(rawText, lowerText, comparableText, queryLower, comparableQuery, queryTokens, queryTokenCount) {
  if (!rawText) return null;
  const directIndex = lowerText.indexOf(queryLower);
  if (directIndex >= 0) {
    return {
      matchIndex: directIndex,
      excerpt: buildSearchExcerpt(rawText, directIndex, queryLower.length),
    };
  }
  if (comparableQuery && comparableText && comparableText.includes(comparableQuery)) {
    return {
      matchIndex: 0,
      excerpt: rawText,
      tokenHits: queryTokenCount,
    };
  }
  if (!Array.isArray(queryTokens) || !queryTokens.length || !comparableText) return null;
  let tokenHits = 0;
  for (const token of queryTokens) {
    if (comparableText.includes(token)) tokenHits += 1;
  }
  const minimumHits = queryTokens.length >= 3 ? 2 : 1;
  if (tokenHits < minimumHits) return null;
  return {
    matchIndex: 0,
    excerpt: rawText,
    tokenHits,
  };
}

function buildBrainSearchCorpus() {
  const changeSnapshot = getGitChangeSnapshot();
  const pending = [{ fullPath: brainRoot, relativePath: "" }];
  const docs = [];

  while (pending.length) {
    const current = pending.pop();
    const entries = listImmediateChildren(current.fullPath);
    for (const entry of entries) {
      const node = buildNode(current.relativePath, entry, changeSnapshot, {
        includeDirectoryChildCount: false,
      });
      docs.push({
        node,
        visibility: node.visibility,
        nameLower: node.name.toLowerCase(),
        pathLower: node.path.toLowerCase(),
        nameComparable: normalizeSearchComparable(node.name),
        pathComparable: normalizeSearchComparable(node.path),
        descriptionComparable: normalizeSearchComparable(node.description || ""),
      });

      if (entry.kind === "directory") {
        pending.push({
          fullPath: entry.fullPath,
          relativePath: node.path,
        });
      }
    }
  }

  return docs;
}

function getBrainSearchCorpus() {
  if (brainSearchCache.docs && Date.now() - brainSearchCache.builtAt <= BRAIN_SEARCH_CACHE_TTL_MS) {
    return brainSearchCache.docs;
  }
  const docs = buildBrainSearchCorpus();
  brainSearchCache = {
    builtAt: Date.now(),
    docs,
  };
  return docs;
}

function searchResultCacheKey(relativePath, includeRuntimeGenerated, query, limit) {
  return `${includeRuntimeGenerated ? "all" : "curated"}|${relativePath || "__root__"}|${limit}|${query.toLowerCase()}`;
}

function buildSearchResult(doc, queryLower, comparableQuery, queryTokens, queryTokenCount) {
  const { node } = doc;
  const pathMatch = detectIndexedTextMatch(
    node.path,
    doc.pathLower,
    doc.pathComparable,
    queryLower,
    comparableQuery,
    queryTokens,
    queryTokenCount
  );
  const nameMatch = detectIndexedTextMatch(
    node.name,
    doc.nameLower,
    doc.nameComparable,
    queryLower,
    comparableQuery,
    queryTokens,
    queryTokenCount
  );
  const descriptionMatch = detectIndexedTextMatch(
    node.description,
    String(node.description || "").toLowerCase(),
    doc.descriptionComparable,
    queryLower,
    comparableQuery,
    queryTokens,
    queryTokenCount
  );

  let score = 0;
  let matchScope = "";
  let excerpt = "";

  if (nameMatch) {
    if (doc.nameLower === queryLower || doc.nameComparable === comparableQuery) score = 140;
    else if (doc.nameLower.startsWith(queryLower) || doc.nameComparable.startsWith(comparableQuery)) score = 130;
    else score = 112 + Math.min(Number(nameMatch.tokenHits || 0), 6);
    matchScope = "name";
    excerpt = node.path;
  } else if (pathMatch) {
    score =
      doc.pathLower === queryLower || doc.pathComparable === comparableQuery
        ? 115
        : 102 + Math.min(Number(pathMatch.tokenHits || 0), 6);
    matchScope = "path";
    excerpt = node.path;
  } else if (descriptionMatch) {
    score = 80 + Math.min(Number(descriptionMatch.tokenHits || 0), 4);
    matchScope = "description";
    excerpt = descriptionMatch.excerpt;
  }

  if (!score) return null;

  return {
    ...node,
    parentPath: normalizeParentPath(node.path),
    matchScope,
    excerpt,
    score,
  };
}

function sortSearchResults(left, right) {
  if (left.score !== right.score) return right.score - left.score;
  if (left.kind !== right.kind) return left.kind === "directory" ? -1 : 1;
  const leftPath = String(left.path || "");
  const rightPath = String(right.path || "");
  return leftPath.localeCompare(rightPath);
}

function pickKeyFiles(relativePath, entries, includeRuntimeGenerated) {
  const files = entries
    .filter((entry) => entry.kind === "file")
    .map((entry) => buildNode(relativePath, entry, getGitChangeSnapshot()))
    .filter((entry) => shouldIncludeVisibility(entry.visibility, includeRuntimeGenerated))
    .sort((left, right) => sortNodes(relativePath, left, right));
  return files.slice(0, 6).map((entry) => ({
    path: entry.path,
    name: entry.name,
    format: entry.format,
    visibility: entry.visibility,
    recent: entry.recent,
    changeType: entry.changeType,
    changeScope: entry.changeScope,
  }));
}

export function getBrainBrowserTree(options = {}) {
  const includeRuntimeGenerated = options.includeRuntimeGenerated === true;
  const { fullPath, relativePath } = resolveBrainBrowserPath(options.path || "");
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Path not found: ${relativePath || "brain"}`);
  }
  const stat = fs.statSync(fullPath);
  if (!stat.isDirectory()) {
    throw new Error(`Path is not a directory: ${relativePath || "brain"}`);
  }

  const entries = listImmediateChildren(fullPath);
  const changeSnapshot = getGitChangeSnapshot();
  const nodes = entries
    .map((entry) => buildNode(relativePath, entry, changeSnapshot))
    .filter((node) => shouldIncludeVisibility(node.visibility, includeRuntimeGenerated))
    .sort((left, right) => sortNodes(relativePath, left, right));
  const currentRecent = isRecentIso(stat.mtime.toISOString());
  const folderChangeMeta = deriveChangeMetadata(relativePath, "directory", changeSnapshot, stat.mtime.toISOString());
  const featuredChanges = nodes
    .filter((node) => node.changeType || node.recent)
    .sort((left, right) => {
      const changeDelta = changePriority(right.changeType) - changePriority(left.changeType);
      if (changeDelta !== 0) return changeDelta;
      if ((left.changeScope === "self") !== (right.changeScope === "self")) {
        return left.changeScope === "self" ? -1 : 1;
      }
      return String(right.modifiedAt).localeCompare(String(left.modifiedAt));
    })
    .slice(0, 6)
    .map((node) => ({
      path: node.path,
      name: node.name,
      kind: node.kind,
      changeType: node.changeType,
      changeScope: node.changeScope,
      recent: node.recent,
      changeSummary: node.changeSummary,
      modifiedAt: node.modifiedAt,
    }));

  return {
    current: {
      path: relativePath,
      name: relativePath ? path.basename(relativePath) : "brain",
      kind: "directory",
      visibility: classifyBrainVisibility(relativePath),
      modifiedAt: stat.mtime.toISOString(),
      recent: currentRecent,
      changeType: folderChangeMeta.changeType,
      changeScope: folderChangeMeta.changeScope,
      changeSummary: folderChangeMeta.changeSummary,
      folderCount: entries.filter((entry) => entry.kind === "directory").length,
      fileCount: entries.filter((entry) => entry.kind === "file").length,
      childCount: entries.length,
      description: describeDirectory(relativePath),
      keyFiles: pickKeyFiles(relativePath, entries, includeRuntimeGenerated),
      featuredChanges,
    },
    nodes,
  };
}

export function searchBrainBrowser(options = {}) {
  const includeRuntimeGenerated = options.includeRuntimeGenerated === true;
  const query = String(options.query || "").trim();
  const limit = Math.max(
    1,
    Math.min(Number(options.limit) || DEFAULT_SEARCH_LIMIT, MAX_SEARCH_LIMIT)
  );

  if (!query) {
    return {
      query: "",
      total: 0,
      truncated: false,
      results: [],
    };
  }

  const { fullPath, relativePath } = resolveBrainBrowserPath(options.path || "");
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Path not found: ${relativePath || "brain"}`);
  }
  const stat = fs.statSync(fullPath);
  if (!stat.isDirectory()) {
    throw new Error(`Path is not a directory: ${relativePath || "brain"}`);
  }

  const queryLower = query.toLowerCase();
  const comparableQuery = normalizeSearchComparable(query);
  const queryTokens = buildSearchTokens(query);
  const queryTokenCount = comparableQuery ? comparableQuery.split(" ").filter(Boolean).length : 0;
  const cacheKey = searchResultCacheKey(relativePath, includeRuntimeGenerated, query, limit);
  const cached = brainSearchResultsCache.results.get(cacheKey);
  if (cached && Date.now() - cached.builtAt <= BRAIN_SEARCH_CACHE_TTL_MS) {
    return cached.payload;
  }
  const docs = getBrainSearchCorpus();
  const matches = [];

  for (const doc of docs) {
    if (!shouldIncludeVisibility(doc.visibility, includeRuntimeGenerated)) continue;
    if (
      relativePath &&
      doc.node.path !== relativePath &&
      !doc.node.path.startsWith(`${relativePath}/`)
    ) {
      continue;
    }
    const match = buildSearchResult(doc, queryLower, comparableQuery, queryTokens, queryTokenCount);
    if (match) matches.push(match);
  }

  matches.sort(sortSearchResults);
  const total = matches.length;
  const payload = {
    query,
    total,
    truncated: total > limit,
    results: matches.slice(0, limit).map(({ score, ...entry }) => entry),
  };
  brainSearchResultsCache.builtAt = Date.now();
  brainSearchResultsCache.results.set(cacheKey, {
    builtAt: Date.now(),
    payload,
  });
  return payload;
}

function deriveStructuredMetadata(relativePath, text) {
  const format = detectFormat(relativePath);
  const metadata = {
    format,
    headings: [],
    topLevelKeys: [],
    frontMatter: {},
  };

  if (format === "markdown") {
    const { frontMatter, body } = extractFrontMatter(text);
    metadata.frontMatter = frontMatter;
    metadata.headings = body
      .split("\n")
      .map((line) => line.match(/^#{1,6}\s+(.*)$/)?.[1]?.trim() || "")
      .filter(Boolean)
      .slice(0, 10);
    return metadata;
  }

  if (format === "json") {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        metadata.topLevelKeys = Object.keys(parsed).slice(0, 12);
      }
    } catch {
      /* ignore */
    }
    return metadata;
  }

  if (format === "yaml") {
    try {
      const parsed = parseYaml(text);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        metadata.topLevelKeys = Object.keys(parsed).slice(0, 12);
      }
    } catch {
      /* ignore */
    }
  }
  return metadata;
}

export function readBrainBrowserFile(options = {}) {
  const includeFull = options.full === true;
  const { fullPath, relativePath } = resolveBrainBrowserPath(options.path || "");
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Path not found: ${relativePath || "brain"}`);
  }
  const stat = fs.statSync(fullPath);
  if (!stat.isFile()) {
    throw new Error(`Path is not a file: ${relativePath || "brain"}`);
  }

  const { binary, text } = safeReadUtf8(fullPath);
  const format = binary ? "binary" : detectFormat(relativePath);
  const charLimit = includeFull ? MAX_FULL_FILE_CHARS : DEFAULT_FILE_PREVIEW_CHARS;
  const content = binary ? "" : text.slice(0, charLimit);
  const userCreated = isUserCreatedBrainFile(relativePath);
  const metadata = {
    size: stat.size,
    sizeLabel: formatBytes(stat.size),
    modifiedAt: stat.mtime.toISOString(),
    lineCount: binary ? 0 : text.split("\n").length,
    charCount: binary ? 0 : text.length,
    visibility: classifyBrainVisibility(relativePath),
    userCreated,
    editable: userCreated,
    deletable: userCreated,
    recent: isRecentIso(stat.mtime.toISOString()),
    ...deriveChangeMetadata(relativePath, "file", getGitChangeSnapshot(), stat.mtime.toISOString()),
    ...deriveStructuredMetadata(relativePath, text),
  };

  return {
    path: relativePath,
    name: path.basename(relativePath),
    format,
    truncated: !binary && text.length > charLimit,
    content,
    metadata,
  };
}

function launchDetached(command, args) {
  const child = spawn(command, args, {
    cwd: repoRoot,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
}

export function openBrainBrowserFileInEditor(options = {}) {
  const { fullPath, relativePath } = resolveBrainBrowserPath(options.path || "");
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Path not found: ${relativePath || "brain"}`);
  }
  const stat = fs.statSync(fullPath);
  if (!stat.isFile()) {
    throw new Error(`Path is not a file: ${relativePath || "brain"}`);
  }

  if (process.platform === "win32") {
    launchDetached("cmd.exe", ["/c", "start", "", fullPath]);
  } else if (process.platform === "darwin") {
    launchDetached("open", [fullPath]);
  } else {
    launchDetached("xdg-open", [fullPath]);
  }

  return {
    path: relativePath,
    opened: true,
    method: "default-app",
  };
}

export function createBrainBrowserFile(options = {}) {
  const parentPath = normalizeRelativePath(options.parentPath || "");
  const parent = resolveBrainBrowserPath(parentPath);
  if (!fs.existsSync(parent.fullPath) || !fs.statSync(parent.fullPath).isDirectory()) {
    throw new Error(`Parent folder not found: ${parent.relativePath || "brain"}`);
  }
  if (classifyBrainVisibility(parent.relativePath) !== "curated") {
    throw new Error("New files can only be created in curated brain folders.");
  }

  const fileName = normalizeUserFileName(options.name || "");
  const createdRelativePath = normalizeRelativePath(path.posix.join(parent.relativePath, fileName));
  const created = resolveBrainBrowserPath(createdRelativePath);
  if (fs.existsSync(created.fullPath)) {
    throw new Error(`File already exists: ${created.relativePath}`);
  }

  const initialContent =
    typeof options.content === "string" && options.content.length > 0
      ? options.content.replace(/\r\n/g, "\n")
      : starterContentForBrainFile(fileName);

  fs.writeFileSync(created.fullPath, initialContent, "utf8");
  registerUserBrainFile(created.relativePath);
  invalidateBrainBrowserCaches();
  return {
    created: true,
    parentPath: parent.relativePath,
    ...readBrainBrowserFile({
      path: created.relativePath,
      full: true,
    }),
  };
}

export function updateBrainBrowserFile(options = {}) {
  const { fullPath, relativePath } = resolveBrainBrowserPath(options.path || "");
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Path not found: ${relativePath || "brain"}`);
  }
  const stat = fs.statSync(fullPath);
  if (!stat.isFile()) {
    throw new Error(`Path is not a file: ${relativePath || "brain"}`);
  }
  ensureEditableUserBrainFile(relativePath);
  if (typeof options.content !== "string") {
    throw new Error("Updated file content is required.");
  }

  fs.writeFileSync(fullPath, options.content.replace(/\r\n/g, "\n"), "utf8");
  invalidateBrainBrowserCaches();
  return {
    updated: true,
    ...readBrainBrowserFile({
      path: relativePath,
      full: true,
    }),
  };
}

export function deleteBrainBrowserFile(options = {}) {
  const { fullPath, relativePath } = resolveBrainBrowserPath(options.path || "");
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Path not found: ${relativePath || "brain"}`);
  }
  const stat = fs.statSync(fullPath);
  if (!stat.isFile()) {
    throw new Error(`Path is not a file: ${relativePath || "brain"}`);
  }
  ensureEditableUserBrainFile(relativePath);

  fs.unlinkSync(fullPath);
  unregisterUserBrainFile(relativePath);
  invalidateBrainBrowserCaches();
  return {
    deleted: true,
    path: relativePath,
    parentPath: normalizeRelativePath(path.dirname(relativePath)),
  };
}

function sanitizeList(values, limit = 6) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))].slice(0, limit);
}

function extractJsonObject(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return null;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const target = fenced?.[1]?.trim() || raw;
  const start = target.indexOf("{");
  const end = target.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) return null;
  try {
    return JSON.parse(target.slice(start, end + 1));
  } catch {
    return null;
  }
}

function siblingCandidatePaths(relativePath) {
  const parentRelativePath = normalizeRelativePath(path.dirname(relativePath));
  const parentFullPath = resolveBrainBrowserPath(parentRelativePath).fullPath;
  if (!fs.existsSync(parentFullPath) || !fs.statSync(parentFullPath).isDirectory()) {
    return [];
  }
  return pickKeyFiles(parentRelativePath, listImmediateChildren(parentFullPath), true)
    .map((entry) => entry.path)
    .filter((entryPath) => entryPath !== relativePath)
    .slice(0, 6);
}

function buildFallbackFileSummary(file) {
  const text = String(file.content ?? "");
  const frontMatterKeys = Object.keys(file.metadata.frontMatter || {}).slice(0, 8);
  const summarySource =
    firstParagraph(text) ||
    sentenceFragments(text, 2).join(" ") ||
    `${file.name} is a ${file.format} file inside the Horizons brain.`;

  const highlights = sanitizeList(
    [
      file.metadata.changeSummary || "",
      file.metadata.headings?.length ? `Headings: ${file.metadata.headings.slice(0, 3).join(", ")}` : "",
      file.metadata.topLevelKeys?.length
        ? `Top-level keys: ${file.metadata.topLevelKeys.slice(0, 5).join(", ")}`
        : "",
      frontMatterKeys.length ? `Front matter keys: ${frontMatterKeys.join(", ")}` : "",
      `Format: ${file.format}`,
      `Size: ${file.metadata.sizeLabel}`,
      file.truncated ? "The file preview is truncated in the browser." : "",
    ],
    6
  );

  return {
    title: file.name,
    summary: summarySource,
    highlights,
    relatedPaths: siblingCandidatePaths(file.path),
    sourcePaths: [file.path],
  };
}

function walkFolderSampleFiles(fullPath, relativePath, includeRuntimeGenerated, depth = 0, out = []) {
  if (depth > MAX_SUMMARY_WALK_DEPTH || out.length >= MAX_SUMMARY_SOURCE_FILES) return out;
  const changeSnapshot = getGitChangeSnapshot();
  const entries = listImmediateChildren(fullPath).sort((left, right) =>
    sortNodes(
      relativePath,
      buildNode(relativePath, left, changeSnapshot),
      buildNode(relativePath, right, changeSnapshot)
    )
  );
  for (const entry of entries) {
    const childRelativePath = normalizeRelativePath(path.join(relativePath, entry.name));
    const visibility = classifyBrainVisibility(childRelativePath);
    if (!shouldIncludeVisibility(visibility, includeRuntimeGenerated)) continue;
    if (entry.kind === "directory") {
      walkFolderSampleFiles(entry.fullPath, childRelativePath, includeRuntimeGenerated, depth + 1, out);
      if (out.length >= MAX_SUMMARY_SOURCE_FILES) break;
      continue;
    }
    const { binary, text } = safeReadUtf8(entry.fullPath);
    if (binary) continue;
    const excerpt = text.slice(0, 2400).trim();
    if (!excerpt) continue;
    out.push({
      path: childRelativePath,
      excerpt,
      format: detectFormat(childRelativePath),
    });
    if (out.length >= MAX_SUMMARY_SOURCE_FILES) break;
  }
  return out;
}

function buildFallbackFolderSummary(treePayload, includeRuntimeGenerated) {
  const { current, nodes } = treePayload;
  const visibleChildren = nodes.slice(0, 8).map((node) => node.name);
  const description = current.description || "Folder inside the Horizons brain.";
  const highlights = sanitizeList(
    [
      current.changeSummary || "",
      `Folders: ${current.folderCount}`,
      `Files: ${current.fileCount}`,
      current.keyFiles?.length
        ? `Key files: ${current.keyFiles.slice(0, 4).map((entry) => entry.name).join(", ")}`
        : "",
      visibleChildren.length ? `Visible children: ${visibleChildren.join(", ")}` : "",
      current.featuredChanges?.length
        ? `Fresh signals: ${current.featuredChanges.slice(0, 3).map((entry) => entry.name).join(", ")}`
        : "",
      includeRuntimeGenerated ? "Runtime and generated folders are included." : "Curated view is active.",
    ],
    6
  );

  return {
    title: current.path ? current.name : "brain",
    summary: description,
    highlights,
    relatedPaths: sanitizeList(
      [
        ...(current.keyFiles || []).map((entry) => entry.path),
        ...nodes.filter((node) => node.kind === "directory").slice(0, 4).map((node) => node.path),
      ],
      6
    ),
    sourcePaths: [current.path],
  };
}

function buildSummaryPrompt({ mode, path: relativePath, treePayload, filePayload, samples, relatedCandidates }) {
  if (mode === "file") {
    const file = filePayload;
    const contextLines = [
      `Selected path: ${file.path}`,
      `Format: ${file.format}`,
      `Visibility: ${file.metadata.visibility}`,
      file.metadata.headings?.length ? `Headings: ${file.metadata.headings.join(" | ")}` : "",
      file.metadata.topLevelKeys?.length ? `Top-level keys: ${file.metadata.topLevelKeys.join(", ")}` : "",
      Object.keys(file.metadata.frontMatter || {}).length
        ? `Front matter keys: ${Object.keys(file.metadata.frontMatter).join(", ")}`
        : "",
      "",
      "File content preview:",
      String(file.content || "").slice(0, MAX_SUMMARY_SOURCE_CHARS),
      "",
      relatedCandidates.length ? `Related path candidates: ${relatedCandidates.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    return {
      userMessage:
        'Return strict JSON with keys "title", "summary", "highlights", and "relatedPaths". Make the file human-readable, explain what it is for, surface the most important ideas, and only use related paths from the provided candidates.',
      extraContext: contextLines,
    };
  }

  const folder = treePayload.current;
  const sampleText = samples
    .map((sample) => `Path: ${sample.path}\nFormat: ${sample.format}\nExcerpt:\n${sample.excerpt}`)
    .join("\n\n---\n\n")
    .slice(0, MAX_SUMMARY_SOURCE_CHARS);
  const contextLines = [
    `Selected folder: ${relativePath || "brain"}`,
    `Description: ${folder.description || "Folder inside the Horizons brain."}`,
    `Visible children: ${(treePayload.nodes || []).slice(0, 14).map((node) => node.name).join(", ")}`,
    folder.keyFiles?.length ? `Key files: ${folder.keyFiles.map((entry) => entry.path).join(", ")}` : "",
    relatedCandidates.length ? `Related path candidates: ${relatedCandidates.join(", ")}` : "",
    "",
    "Sample file excerpts from this folder:",
    sampleText || "No readable sample files were available.",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    userMessage:
      'Return strict JSON with keys "title", "summary", "highlights", and "relatedPaths". Explain what this folder is for, which files matter first, and how a human should navigate it. Only use related paths from the provided candidates.',
    extraContext: contextLines,
  };
}

async function summarizeWithLocalAi(payload, fallback, relatedCandidates, allowLocalAi) {
  if (allowLocalAi === false) {
    return {
      ...fallback,
      usedLocalAi: false,
    };
  }

  const config = getLocalLlmConfig();
  if (!config) {
    return {
      ...fallback,
      usedLocalAi: false,
      notice: "Local AI is not configured on the chat server, so this summary uses a built-in fallback.",
    };
  }

  try {
    const raw = await completeLocalLlm(payload.userMessage, payload.extraContext, config);
    const parsed = extractJsonObject(raw);
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Local AI returned non-JSON browser summary");
    }
    return {
      title: String(parsed.title || fallback.title).trim() || fallback.title,
      summary: String(parsed.summary || fallback.summary).trim() || fallback.summary,
      highlights: sanitizeList(parsed.highlights, 6).length
        ? sanitizeList(parsed.highlights, 6)
        : fallback.highlights,
      relatedPaths: sanitizeList(parsed.relatedPaths, 6)
        .filter((value) => relatedCandidates.includes(value))
        .slice(0, 6),
      sourcePaths: fallback.sourcePaths,
      usedLocalAi: true,
    };
  } catch (error) {
    return {
      ...fallback,
      usedLocalAi: false,
      notice: `Local AI summary failed, so this view is using a built-in fallback: ${String(error?.message || error)}`,
    };
  }
}

export async function summarizeBrainBrowserSelection(options = {}) {
  const includeRuntimeGenerated = options.includeRuntimeGenerated === true;
  const { fullPath, relativePath } = resolveBrainBrowserPath(options.path || "");
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Path not found: ${relativePath || "brain"}`);
  }
  const stat = fs.statSync(fullPath);

  if (stat.isFile()) {
    const file = readBrainBrowserFile({ path: relativePath, full: false });
    const fallback = buildFallbackFileSummary(file);
    const relatedCandidates = sanitizeList(fallback.relatedPaths, 6);
    const aiSummary = await summarizeWithLocalAi(
      buildSummaryPrompt({
        mode: "file",
        path: relativePath,
        filePayload: file,
        relatedCandidates,
      }),
      {
        ...fallback,
        mode: "file",
        path: relativePath,
      },
      relatedCandidates,
      options.allowLocalAi
    );
    return {
      path: relativePath,
      mode: "file",
      title: aiSummary.title,
      summary: aiSummary.summary,
      highlights: aiSummary.highlights,
      relatedPaths: aiSummary.relatedPaths.length ? aiSummary.relatedPaths : relatedCandidates,
      sourcePaths: aiSummary.sourcePaths,
      usedLocalAi: aiSummary.usedLocalAi,
      notice: aiSummary.notice,
    };
  }

  if (!stat.isDirectory()) {
    throw new Error(`Unsupported path type: ${relativePath || "brain"}`);
  }

  const treePayload = getBrainBrowserTree({
    path: relativePath,
    includeRuntimeGenerated,
  });
  const samples = walkFolderSampleFiles(fullPath, relativePath, includeRuntimeGenerated).map((sample) => ({
    ...sample,
    excerpt: sample.excerpt.slice(0, 2600),
  }));
  const fallback = buildFallbackFolderSummary(treePayload, includeRuntimeGenerated);
  const relatedCandidates = sanitizeList(
    [
      ...fallback.relatedPaths,
      ...samples.map((sample) => sample.path),
    ],
    6
  );
  const aiSummary = await summarizeWithLocalAi(
    buildSummaryPrompt({
      mode: "folder",
      path: relativePath,
      treePayload,
      samples,
      relatedCandidates,
    }),
    {
      ...fallback,
      mode: "folder",
      path: relativePath,
      sourcePaths: sanitizeList([relativePath, ...samples.map((sample) => sample.path)], 8),
    },
    relatedCandidates,
    options.allowLocalAi
  );
  return {
    path: relativePath,
    mode: "folder",
    title: aiSummary.title,
    summary: aiSummary.summary,
    highlights: aiSummary.highlights,
    relatedPaths: aiSummary.relatedPaths.length ? aiSummary.relatedPaths : relatedCandidates,
    sourcePaths: aiSummary.sourcePaths,
    usedLocalAi: aiSummary.usedLocalAi,
    notice: aiSummary.notice,
  };
}
