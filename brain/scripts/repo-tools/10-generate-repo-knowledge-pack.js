#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const {
  parseArgs,
  detectRepoRoot,
  loadConfig,
  classifyPath,
  isLikelyCode,
  isLikelyText,
  safeReadText,
  writeRepoFile,
  nowIso,
  extractImports,
  tokenize,
  groupBy,
  listAllEntries,
} = require("../lib/common");

const PACK_ID = "repo-knowledge-pack";
const IMPORT_ROOT_REL = path.posix.join("taskmanager", "brain", "imports", PACK_ID);
const RETRIEVAL_ROOT_REL = path.posix.join("taskmanager", "brain", "retrieval", "imports", PACK_ID);
const NORMALIZED_ROOT_REL = path.posix.join(IMPORT_ROOT_REL, "normalized", PACK_ID);
const INDEX_DOC_REL = path.posix.join(NORMALIZED_ROOT_REL, "INDEX.md");
const README_DOC_REL = path.posix.join(NORMALIZED_ROOT_REL, "README.md");
const RAW_FILES_REL = path.posix.join(IMPORT_ROOT_REL, "raw", PACK_ID, "files.jsonl");
const GENERIC_FOCUS_TASK = "scripts repo knowledge docs config brain retrieval manifest lookup summary tests source package";
const DEFAULT_MAX_CARDS = 5000;
const TEXT_READ_LIMIT = 12000;
const SNIPPET_LINE_LIMIT = 28;
const EXCLUDED_OUTPUT_PREFIXES = [
  "taskmanager/brain/imports/repo-knowledge-pack/",
  "taskmanager/brain/retrieval/imports/repo-knowledge-pack/",
];

function normalizeSlashes(value) {
  return String(value || "").replace(/\\/g, "/");
}

function isExcludedPath(relPath) {
  const rel = normalizeSlashes(relPath);
  if (!rel || rel === ".") return true;
  if (rel === ".ai_repo" || rel.startsWith(".ai_repo/")) return true;
  return EXCLUDED_OUTPUT_PREFIXES.some((prefix) => rel.startsWith(prefix));
}

function sha256(text) {
  return crypto.createHash("sha256").update(String(text || ""), "utf8").digest("hex");
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueSorted(values) {
  return [...new Set(ensureArray(values).map((value) => String(value || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function safeJsonParse(text, fallback = null) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function flattenRepoMap(node, rows) {
  if (!node || typeof node !== "object") return;
  const rel = normalizeSlashes(node.path || "");
  if (rel && node.type === "file") {
    rows.push({
      rel,
      type: "file",
      name: node.name || path.basename(rel),
    });
  }
  for (const child of ensureArray(node.children)) {
    flattenRepoMap(child, rows);
  }
}

function parseManifestCsv(repoRoot) {
  const manifestPath = path.join(repoRoot, "REPO_FILE_MANIFEST.csv");
  if (!fs.existsSync(manifestPath)) return [];
  const text = fs.readFileSync(manifestPath, "utf8");
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length <= 1) return [];
  const rows = [];
  for (let index = 1; index < lines.length; index += 1) {
    const parts = lines[index].split(",");
    if (parts.length < 3) continue;
    const rel = normalizeSlashes(parts[0]);
    const type = parts[2] === "directory" ? "directory" : "file";
    if (type === "file") rows.push({ rel, type, name: parts[1] || path.basename(rel) });
  }
  return rows;
}

function loadInventory(repoRoot) {
  if (process.env.REPO_KNOWLEDGE_USE_REPO_MAP !== "1") {
    try {
      const live = listAllEntries(repoRoot, { skipPackFolder: false, skipOutputDir: false });
      const liveRows = live.entries.filter((entry) => entry.type === "file").map((entry) => ({ rel: normalizeSlashes(entry.rel), type: "file", name: entry.name }));
      if (liveRows.length > 0) return { rows: liveRows, source: "filesystem-scan-live" };
    } catch {
      // Fall back to snapshot inventory below.
    }
  }

  const repoMapPath = path.join(repoRoot, "REPO_MAP_FULL.json");
  if (fs.existsSync(repoMapPath)) {
    const tree = safeJsonParse(fs.readFileSync(repoMapPath, "utf8"), null);
    if (tree) {
      const rows = [];
      flattenRepoMap(tree, rows);
      return { rows, source: "REPO_MAP_FULL.json" };
    }
  }

  const csvRows = parseManifestCsv(repoRoot);
  if (csvRows.length > 0) return { rows: csvRows, source: "REPO_FILE_MANIFEST.csv" };

  const fallback = listAllEntries(repoRoot, { skipPackFolder: false, skipOutputDir: false });
  return {
    rows: fallback.entries.filter((entry) => entry.type === "file").map((entry) => ({ rel: normalizeSlashes(entry.rel), type: "file", name: entry.name })),
    source: "filesystem-scan-fallback",
  };
}

function parseBooleanArg(value) {
  if (value === true) return true;
  if (value === false || value === null || value === undefined) return false;
  const normalized = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "on", "incremental"].includes(normalized);
}

function readJsonlRecords(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, "utf8");
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => safeJsonParse(line, null))
    .filter(Boolean);
}

function loadPreviousPackState(repoRoot) {
  const rawPath = path.join(repoRoot, RAW_FILES_REL);
  const rawRecords = readJsonlRecords(rawPath).map((record) => ({
    ...record,
    path: normalizeSlashes(record.path),
    card_path: record.card_path ? normalizeSlashes(record.card_path) : null,
  }));
  const bySource = new Map();
  const byCardPath = new Map();
  for (const record of rawRecords) {
    if (record.path) bySource.set(record.path, record);
    if (record.card_path) byCardPath.set(record.card_path, record);
  }
  return { rawPath, rawRecords, bySource, byCardPath };
}

function fileStatSnapshot(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return {
      sizeBytes: stat.size,
      mtimeMs: Number.isFinite(stat.mtimeMs) ? Math.round(stat.mtimeMs) : Math.round(stat.mtime.getTime()),
    };
  } catch {
    return { sizeBytes: null, mtimeMs: null };
  }
}

function deleteFileIfExists(filePath) {
  if (!filePath) return false;
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

function canReuseCard(record, selected, previousRecord, cardRel) {
  if (!previousRecord || !previousRecord.selected_for_card) return false;
  if (normalizeSlashes(previousRecord.card_path || "") !== normalizeSlashes(cardRel)) return false;
  if (previousRecord.selected_rank !== selected.selectedRank) return false;
  if (previousRecord.score !== record.score) return false;
  if (previousRecord.surface !== record.surface) return false;
  if (previousRecord.kind !== record.kind) return false;
  if (previousRecord.top_level !== record.topLevel) return false;
  if (previousRecord.classification !== record.classification) return false;
  if (previousRecord.language !== record.language) return false;
  if (previousRecord.extension !== record.extension) return false;
  if (previousRecord.size_bytes === null || previousRecord.size_bytes === undefined) return false;
  if (previousRecord.source_mtime_ms === null || previousRecord.source_mtime_ms === undefined) return false;
  if (record.sizeBytes === null || record.sizeBytes === undefined) return false;
  if (record.mtimeMs === null || record.mtimeMs === undefined) return false;
  if (previousRecord.size_bytes !== record.sizeBytes) return false;
  if (previousRecord.source_mtime_ms !== record.mtimeMs) return false;
  if (JSON.stringify(previousRecord.tags || []) !== JSON.stringify(record.tags || [])) return false;
  return true;
}

function topLevelFor(relPath) {
  const rel = normalizeSlashes(relPath);
  if (!rel || rel === ".") return "_root";
  return rel.split("/")[0] || "_root";
}

function extensionFor(relPath) {
  return path.extname(String(relPath || "")).toLowerCase();
}

function languageForExtension(ext) {
  const map = {
    ".js": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".ts": "typescript",
    ".tsx": "typescriptreact",
    ".jsx": "javascriptreact",
    ".json": "json",
    ".jsonl": "json",
    ".md": "markdown",
    ".txt": "text",
    ".yml": "yaml",
    ".yaml": "yaml",
    ".xml": "xml",
    ".csv": "csv",
    ".html": "html",
    ".htm": "html",
    ".cmd": "bat",
    ".bat": "bat",
    ".ps1": "powershell",
    ".sh": "shell",
    ".py": "python",
  };
  return map[ext] || "text";
}

function classifySurface(relPath, classification, ext) {
  const rel = normalizeSlashes(relPath).toLowerCase();
  if (rel.startsWith("taskmanager/brain/scripts/")) return "brain-scripts";
  if (rel.startsWith("taskmanager/scripts/")) return "repo-scripts";
  if (rel.startsWith("scripts/")) return "repo-scripts";
  if (rel.startsWith("taskmanager/brain/core/")) return "brain-core";
  if (rel.startsWith("taskmanager/brain/retrieval/")) return "brain-retrieval";
  if (rel.startsWith("taskmanager/brain/imports/")) return "brain-imports";
  if (rel.startsWith("taskmanager/src/")) return "app-src";
  if (rel.startsWith("taskmanager/server/")) return "server";
  if (rel.startsWith("taskmanager/desktop/")) return "desktop";
  if (rel.startsWith("taskmanager/portable_lib/")) return "portable-lib";
  if (rel.startsWith("taskmanager/tests/")) return "tests";
  if (rel.startsWith("taskmanager/config/")) return "config";
  if (rel.startsWith("docs/")) return "docs";
  if (rel.startsWith("plans/")) return "plans";
  if (rel.startsWith("tools/")) return "tools";
  if (rel.startsWith("brain/")) return "brain";
  if (rel.startsWith("taskmanager/brain/runtime/")) return "runtime";
  if (classification === "generated") return "generated";
  if (classification === "low-value") return "low-value";
  if (ext === ".json" || ext === ".md" || ext === ".txt") return "source";
  return "other";
}

function isPrioritySurfacePath(relPath, surface) {
  const rel = normalizeSlashes(relPath).toLowerCase();
  const basename = path.basename(rel);
  if (rel.startsWith("taskmanager/brain/scripts/")) return true;
  if (rel.startsWith("taskmanager/brain/core/")) return true;
  if (rel.startsWith("taskmanager/brain/retrieval/")) return true;
  if (rel.startsWith("taskmanager/portable_lib/")) return true;
  if (rel.startsWith("taskmanager/src/")) return true;
  if (rel.startsWith("taskmanager/server/")) return true;
  if (rel.startsWith("taskmanager/desktop/")) return true;
  if (rel.startsWith("taskmanager/config/")) return true;
  if (rel.startsWith("taskmanager/tests/")) return true;
  if (rel.startsWith("taskmanager/scripts/")) return true;
  if (rel.startsWith("scripts/")) return true;
  if (rel.startsWith("docs/")) return true;
  if (rel.startsWith("plans/")) return true;
  if (rel.startsWith("tools/")) return true;
  if (rel.startsWith("lib/")) return true;
  if (rel.startsWith("repo_map_chunks/")) return true;
  if (rel.startsWith("taskmanager/brain/scripts/docs/")) return true;
  if (rel.startsWith("taskmanager/brain/scripts/repo-tools/")) return true;
  if (basename === "README.md" || basename === "INDEX.md" || basename === "package.json" || basename === "package-lock.json") return true;
  return surface === "brain-scripts" || surface === "repo-scripts" || surface === "brain-core" || surface === "brain-retrieval" || surface === "portable-lib" || surface === "app-src" || surface === "server" || surface === "desktop" || surface === "config" || surface === "tests" || surface === "docs" || surface === "plans" || surface === "tools";
}

function classifyKind(record) {
  const rel = normalizeSlashes(record.rel).toLowerCase();
  const ext = record.extension;
  if (rel.endsWith("/package.json") || rel === "package.json") return "package-json";
  if (ext === ".md") return "markdown";
  if (ext === ".jsonl") return "jsonl";
  if (ext === ".json") return "json";
  if (ext === ".cmd" || ext === ".bat") return "batch";
  if (ext === ".ps1") return "powershell";
  if (ext === ".sh") return "shell";
  if (ext === ".csv") return "csv";
  if (ext === ".txt") return "text";
  if (isLikelyCode(rel)) return "code";
  if (isLikelyText(rel, 1)) return "text";
  return "unknown";
}

function scoreForKnowledge(relPath, classification, surface, config) {
  let score = 0;
  const rel = normalizeSlashes(relPath).toLowerCase();
  const ext = extensionFor(rel);
  const tokens = tokenize(`${rel} ${surface} ${classification} ${GENERIC_FOCUS_TASK}`);

  for (const token of tokens) {
    if (token.length < 3) continue;
    if (rel.includes(token)) score += 2;
    if (path.basename(rel).includes(token)) score += 4;
  }

  score += scorePathBonus(rel, ext, classification, surface, config);
  return score;
}

function scorePathBonus(rel, ext, classification, surface, config) {
  let score = 0;
  const lower = normalizeSlashes(rel).toLowerCase();
  if (lower.startsWith("taskmanager/brain/scripts/")) score += 80;
  if (lower.startsWith("taskmanager/brain/core/")) score += 50;
  if (lower.startsWith("taskmanager/brain/retrieval/")) score += 48;
  if (lower.startsWith("taskmanager/brain/imports/")) score += 45;
  if (lower.startsWith("taskmanager/scripts/")) score += 48;
  if (lower.startsWith("scripts/")) score += 55;
  if (lower.startsWith("taskmanager/src/")) score += 34;
  if (lower.startsWith("taskmanager/server/")) score += 30;
  if (lower.startsWith("taskmanager/portable_lib/")) score += 36;
  if (lower.startsWith("taskmanager/desktop/")) score += 22;
  if (lower.startsWith("taskmanager/tests/")) score += 20;
  if (lower.startsWith("taskmanager/config/")) score += 18;
  if (lower.startsWith("docs/")) score += 24;
  if (lower.startsWith("plans/")) score += 20;
  if (lower.startsWith("brain/")) score += 12;
  if (lower.includes("readme")) score += 16;
  if (lower.includes("index")) score += 14;
  if (lower.includes("manifest")) score += 14;
  if (lower.includes("package.json")) score += 20;
  if (ext === ".md") score += 10;
  if (ext === ".json" || ext === ".jsonl") score += 8;
  if (ext === ".js" || ext === ".mjs" || ext === ".cjs" || ext === ".ts" || ext === ".tsx" || ext === ".jsx") score += 12;
  if (classification === "high-value") score += 20;
  if (classification === "docs") score += 8;
  if (classification === "generated") score -= 18;
  if (classification === "low-value") score -= 20;
  if (surface === "brain-scripts" || surface === "repo-scripts") score += 10;
  if (/node_modules|dist|build|coverage|\.cache|\.turbo|\.git|trash|test-artifacts|runtime/i.test(lower)) score -= 80;
  if (config && Array.isArray(config.highValuePrefixes) && config.highValuePrefixes.some((prefix) => lower.startsWith(String(prefix).toLowerCase()))) {
    score += 12;
  }
  if (config && Array.isArray(config.docPrefixes) && config.docPrefixes.some((prefix) => lower.startsWith(String(prefix).toLowerCase()))) {
    score += 10;
  }
  return score;
}

function buildTags(record) {
  const tags = new Set();
  tags.add(record.surface);
  tags.add(record.classification);
  tags.add(record.kind);
  tags.add(record.extension.replace(/^\./, "") || "no-ext");
  if (record.surface.includes("script") || record.kind === "code" || record.kind === "batch") tags.add("scripts");
  if (record.rel.toLowerCase().includes("brain")) tags.add("brain");
  if (record.rel.toLowerCase().includes("config")) tags.add("config");
  if (record.rel.toLowerCase().includes("index")) tags.add("index");
  if (record.rel.toLowerCase().includes("readme") || record.kind === "markdown") tags.add("docs");
  if (record.rel.toLowerCase().includes("test")) tags.add("tests");
  if (record.rel.toLowerCase().includes("manifest")) tags.add("manifest");
  if (record.rel.toLowerCase().includes("package.json")) tags.add("package-manifest");
  return [...tags].filter(Boolean).sort((a, b) => a.localeCompare(b));
}

function maybeReadPackageJson(content) {
  const parsed = safeJsonParse(content, null);
  if (!parsed || typeof parsed !== "object") return null;
  return parsed;
}

function extractHeadings(text) {
  const headings = [];
  for (const line of String(text || "").split(/\r?\n/)) {
    const match = line.match(/^#{1,6}\s+(.+?)\s*$/);
    if (match) headings.push(match[1].trim());
    if (headings.length >= 8) break;
  }
  return uniqueSorted(headings);
}

function extractExports(text) {
  const exports = new Set();
  const patterns = [
    /\bexport\s+(?:default\s+)?(?:function|class|const|let|var)?\s*([A-Za-z_$][\w$]*)?/g,
    /\bmodule\.exports\s*=\s*\{([^}]+)\}/g,
    /\bexports\.([A-Za-z_$][\w$]*)\s*=/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(String(text || ""))) !== null) {
      if (match[1]) exports.add(match[1].trim());
      if (match[2]) exports.add(match[2].trim());
      if (match[3]) exports.add(match[3].trim());
    }
  }
  return uniqueSorted([...exports]);
}

function extractSymbols(text) {
  const symbols = new Set();
  const patterns = [
    /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g,
    /\bclass\s+([A-Za-z_$][\w$]*)\b/g,
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\(|function\b|class\b)/g,
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\(/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(String(text || ""))) !== null) {
      if (match[1]) symbols.add(match[1].trim());
    }
  }
  return uniqueSorted([...symbols]);
}

function extractJsonKeys(text) {
  const parsed = safeJsonParse(text, null);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];
  return uniqueSorted(Object.keys(parsed).slice(0, 40));
}

function extractCliHints(text) {
  const hints = new Set();
  const stringText = String(text || "");
  if (/process\.argv/.test(stringText)) hints.add("process.argv");
  if (/parseArgs\(/.test(stringText)) hints.add("parseArgs");
  if (/spawnSync\(/.test(stringText)) hints.add("spawnSync");
  if (/execSync\(/.test(stringText)) hints.add("execSync");
  if (/yargs|commander|minimist/.test(stringText)) hints.add("cli-parser");
  const flags = stringText.match(/--[a-zA-Z0-9][a-zA-Z0-9_-]*/g) || [];
  for (const flag of flags.slice(0, 12)) hints.add(flag);
  return uniqueSorted([...hints]);
}

function extractPackageSummary(text) {
  const parsed = maybeReadPackageJson(text);
  if (!parsed) return null;
  const scripts = parsed.scripts && typeof parsed.scripts === "object" ? Object.keys(parsed.scripts) : [];
  const deps = [];
  for (const key of ["dependencies", "devDependencies", "peerDependencies"]) {
    if (parsed[key] && typeof parsed[key] === "object") {
      deps.push(...Object.keys(parsed[key]));
    }
  }
  return {
    name: typeof parsed.name === "string" ? parsed.name : null,
    scripts: uniqueSorted(scripts).slice(0, 20),
    dependencies: uniqueSorted(deps).slice(0, 20),
  };
}

function buildSummarySentence(record, signals) {
  const bits = [];
  if (record.surface === "brain-scripts" || record.surface === "repo-scripts") {
    bits.push("Script surface");
  } else if (record.kind === "markdown") {
    bits.push("Markdown doc");
  } else if (record.kind === "package-json") {
    bits.push("Package manifest");
  } else if (record.kind === "json") {
    bits.push("JSON data file");
  } else if (record.kind === "batch") {
    bits.push("Windows batch entrypoint");
  } else if (record.kind === "code") {
    bits.push("Code module");
  } else {
    bits.push("Text asset");
  }

  if (signals.imports.length > 0) bits.push(`imports ${signals.imports.slice(0, 4).join(", ")}`);
  if (signals.exports.length > 0) bits.push(`exports ${signals.exports.slice(0, 4).join(", ")}`);
  if (signals.headings.length > 0) bits.push(`headings ${signals.headings.slice(0, 3).join(" / ")}`);
  if (signals.jsonKeys.length > 0) bits.push(`keys ${signals.jsonKeys.slice(0, 6).join(", ")}`);
  if (signals.packageSummary && signals.packageSummary.scripts.length > 0) bits.push(`scripts ${signals.packageSummary.scripts.slice(0, 6).join(", ")}`);
  return bits.join("; ");
}

function buildExcerpt(text) {
  const lines = String(text || "").split(/\r?\n/);
  const excerpt = lines.slice(0, SNIPPET_LINE_LIMIT).join("\n").trimEnd();
  return excerpt.length > TEXT_READ_LIMIT ? excerpt.slice(0, TEXT_READ_LIMIT) : excerpt;
}

function relativeCardPathFor(record) {
  const rel = normalizeSlashes(record.rel);
  const hash = sha256(rel).slice(0, 12);
  const top = sanitizeSegment(record.topLevel || "_root");
  const shard = hash.slice(0, 2);
  const slug = sanitizeSegment(rel).slice(0, 90) || sanitizeSegment(path.basename(rel));
  return path.posix.join(NORMALIZED_ROOT_REL, "cards", top, shard, `${slug}--${hash}.md`);
}

function sanitizeSegment(value) {
  return String(value || "")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 120);
}

function yamlScalar(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(String(value));
}

function renderFrontMatter(record, signals, excerptHash) {
  const lines = [];
  lines.push("---");
  lines.push("schema_version: 1");
  lines.push(`pack_id: ${yamlScalar(PACK_ID)}`);
  lines.push(`card_type: ${yamlScalar("file-summary")}`);
  lines.push(`source_path: ${yamlScalar(record.rel)}`);
  lines.push(`source_name: ${yamlScalar(path.basename(record.rel))}`);
  lines.push(`top_level: ${yamlScalar(record.topLevel)}`);
  lines.push(`surface: ${yamlScalar(record.surface)}`);
  lines.push(`classification: ${yamlScalar(record.classification)}`);
  lines.push(`kind: ${yamlScalar(record.kind)}`);
  lines.push(`language: ${yamlScalar(record.language)}`);
  lines.push(`extension: ${yamlScalar(record.extension)}`);
  lines.push(`score: ${record.score}`);
  lines.push(`selected_rank: ${record.selectedRank || 0}`);
  lines.push(`content_hash: ${yamlScalar(excerptHash)}`);
  lines.push(`generated_at: ${yamlScalar(record.generatedAt)}`);
  lines.push("tags:");
  for (const tag of record.tags) lines.push(`  - ${yamlScalar(tag)}`);
  if (signals.imports.length > 0) {
    lines.push("imports:");
    for (const item of signals.imports.slice(0, 10)) lines.push(`  - ${yamlScalar(item)}`);
  }
  if (signals.exports.length > 0) {
    lines.push("exports:");
    for (const item of signals.exports.slice(0, 10)) lines.push(`  - ${yamlScalar(item)}`);
  }
  if (signals.headings.length > 0) {
    lines.push("headings:");
    for (const item of signals.headings.slice(0, 10)) lines.push(`  - ${yamlScalar(item)}`);
  }
  if (signals.jsonKeys.length > 0) {
    lines.push("json_keys:");
    for (const item of signals.jsonKeys.slice(0, 15)) lines.push(`  - ${yamlScalar(item)}`);
  }
  if (signals.packageSummary) {
    if (signals.packageSummary.name) lines.push(`package_name: ${yamlScalar(signals.packageSummary.name)}`);
    if (signals.packageSummary.scripts.length > 0) {
      lines.push("package_scripts:");
      for (const item of signals.packageSummary.scripts.slice(0, 15)) lines.push(`  - ${yamlScalar(item)}`);
    }
    if (signals.packageSummary.dependencies.length > 0) {
      lines.push("package_dependencies:");
      for (const item of signals.packageSummary.dependencies.slice(0, 15)) lines.push(`  - ${yamlScalar(item)}`);
    }
  }
  lines.push("---");
  return lines.join("\n");
}

function buildCardMarkdown(record, signals, excerpt) {
  const summary = buildSummarySentence(record, signals);
  const sourceLink = record.cardPath
    ? path.relative(path.dirname(record.cardPathAbs), path.join(record.repoRoot, record.rel)).split(path.sep).join("/")
    : record.rel;
  const lines = [];
  lines.push(renderFrontMatter(record, signals, sha256(excerpt)));
  lines.push("");
  lines.push(`# ${record.rel}`);
  lines.push("");
  lines.push(`> ${summary || "Repository knowledge card."}`);
  lines.push("");
  lines.push("## Key Signals");
  lines.push("");
  lines.push(`- Source path: ${record.rel}`);
  lines.push(`- Surface: ${record.surface}`);
  lines.push(`- Classification: ${record.classification}`);
  lines.push(`- Kind: ${record.kind}`);
  lines.push(`- Language: ${record.language}`);
  lines.push(`- Top level: ${record.topLevel}`);
  lines.push(`- Score: ${record.score}`);
  lines.push(`- Tags: ${record.tags.join(", ")}`);
  if (signals.imports.length > 0) lines.push(`- Imports: ${signals.imports.slice(0, 6).join(", ")}`);
  if (signals.exports.length > 0) lines.push(`- Exports: ${signals.exports.slice(0, 6).join(", ")}`);
  if (signals.headings.length > 0) lines.push(`- Headings: ${signals.headings.slice(0, 6).join(" | ")}`);
  if (signals.jsonKeys.length > 0) lines.push(`- JSON keys: ${signals.jsonKeys.slice(0, 10).join(", ")}`);
  if (signals.packageSummary && signals.packageSummary.scripts.length > 0) lines.push(`- Package scripts: ${signals.packageSummary.scripts.slice(0, 10).join(", ")}`);
  lines.push("");
  lines.push("## Lookup Notes");
  lines.push("");
  lines.push(`- Use the card path in lookup.json to jump directly to this summary.`);
  lines.push(`- Open the source from this card with the repository-relative path.`);
  lines.push(`- Primary lookup terms: ${uniqueSorted([record.surface, record.kind, record.topLevel, ...record.tags]).slice(0, 12).join(", ")}`);
  if (sourceLink) lines.push(`- Source link target: ${sourceLink}`);
  lines.push("");
  lines.push("## Excerpt");
  lines.push("");
  lines.push(`~~~${record.language === "text" ? "" : record.language}`);
  lines.push(excerpt || "(no readable excerpt available)");
  lines.push("~~~");
  return lines.join("\n");
}

function buildTopLevelSummary(summaryDocRel, topLevel, records, selectedRecords) {
  const lines = [];
  const bySurface = groupBy(records, (record) => record.surface);
  const byKind = groupBy(records, (record) => record.kind);
  lines.push(`# Top-Level Summary: ${topLevel}`);
  lines.push("");
  lines.push(`- Total files: ${records.length}`);
  lines.push(`- Selected cards: ${selectedRecords.length}`);
  lines.push(`- Source score range: ${records.length > 0 ? `${Math.min(...records.map((record) => record.score))} to ${Math.max(...records.map((record) => record.score))}` : "0 to 0"}`);
  lines.push("");
  lines.push("## Surfaces");
  lines.push("");
  for (const [surface, rows] of [...bySurface.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])).slice(0, 12)) {
    lines.push(`- ${surface}: ${rows.length}`);
  }
  lines.push("");
  lines.push("## Kinds");
  lines.push("");
  for (const [kind, rows] of [...byKind.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])).slice(0, 12)) {
    lines.push(`- ${kind}: ${rows.length}`);
  }
  lines.push("");
  lines.push("## Top Cards");
  lines.push("");
  for (const record of selectedRecords.slice(0, 12)) {
    lines.push(`- [${record.rel}](${path.posix.relative(path.posix.dirname(summaryDocRel), record.cardPath)})`);
  }
  return lines.join("\n");
}

function buildSurfaceSummary(summaryDocRel, surface, records, selectedRecords) {
  const lines = [];
  const topLevels = groupBy(records, (record) => record.topLevel);
  lines.push(`# Surface Summary: ${surface}`);
  lines.push("");
  lines.push(`- Total files: ${records.length}`);
  lines.push(`- Selected cards: ${selectedRecords.length}`);
  lines.push("");
  lines.push("## Top Levels");
  lines.push("");
  for (const [topLevel, rows] of [...topLevels.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])).slice(0, 12)) {
    lines.push(`- ${topLevel}: ${rows.length}`);
  }
  lines.push("");
  lines.push("## Top Cards");
  lines.push("");
  for (const record of selectedRecords.slice(0, 12)) {
    lines.push(`- [${record.rel}](${path.posix.relative(path.posix.dirname(summaryDocRel), record.cardPath)})`);
  }
  return lines.join("\n");
}

function buildIndexMarkdown(indexDocRel, manifest, topLevelDocs, surfaceDocs, selectedRecords) {
  const lines = [];
  lines.push(`# ${PACK_ID}`);
  lines.push("");
  lines.push(`Generated: ${manifest.generated_at}`);
  lines.push(`Repo root: ${manifest.repo_root}`);
  lines.push(`Inventory source: ${manifest.inventory_source}`);
  lines.push(`Total files scanned: ${manifest.totals.scanned_files}`);
  lines.push(`Card files written: ${manifest.totals.cards_written}`);
  lines.push("");
  lines.push("## Start Here");
  lines.push("");
  lines.push(`- [README](README.md)`);
  lines.push(`- [Top-level summaries](summaries/top-level/)`);
  lines.push(`- [Surface summaries](summaries/surfaces/)`);
  lines.push(`- [Lookup manifest](../../manifests/lookup.json)`);
  lines.push("");
  lines.push("## High-Signal Cards");
  lines.push("");
  for (const record of selectedRecords.slice(0, 25)) {
    lines.push(`- [${record.source_path}](${path.posix.relative(path.posix.dirname(indexDocRel), record.card_path)})`);
  }
  lines.push("");
  lines.push("## Summaries");
  lines.push("");
  lines.push("### Top-Level");
  for (const [topLevel, relPath] of Object.entries(topLevelDocs).sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`- [${topLevel}](${path.posix.relative(path.posix.dirname(indexDocRel), normalizeSlashes(relPath))})`);
  }
  lines.push("");
  lines.push("### Surfaces");
  for (const [surface, relPath] of Object.entries(surfaceDocs).sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`- [${surface}](${path.posix.relative(path.posix.dirname(indexDocRel), normalizeSlashes(relPath))})`);
  }
  return lines.join("\n");
}

function buildReadmeMarkdown(manifest) {
  return [
    `# ${PACK_ID}`,
    "",
    "Whole-repo lookup pack for fast local AI navigation.",
    "",
    `- Generated: ${manifest.generated_at}`,
    `- Build mode: ${manifest.build_mode}`,
    `- Total scanned files: ${manifest.totals.scanned_files}`,
    `- Card files written: ${manifest.totals.cards_written}`,
    `- Cards reused: ${manifest.totals.cards_reused}`,
    `- Cards rewritten: ${manifest.totals.cards_rewritten}`,
    `- Cards deleted: ${manifest.totals.cards_deleted}`,
    `- Incremental refresh: npm run brain:repo-knowledge-pack:update`,
    `- Retrieval profile: ${manifest.retrieval_profile}`,
    "",
    "Open [INDEX.md](INDEX.md) for the full entry point.",
  ].join("\n");
}

function buildRetrievalOverview(manifest) {
  return [
    "# Repo Knowledge Pack Overview",
    "",
    "Lookup pack generated from the whole repository with script-heavy surfaces prioritized.",
    "",
    `- Pack id: ${PACK_ID}`,
    `- Profile: ${manifest.retrieval_profile}`,
    `- Build mode: ${manifest.build_mode}`,
    `- Scanned files: ${manifest.totals.scanned_files}`,
    `- Cards written: ${manifest.totals.cards_written}`,
    `- Cards reused: ${manifest.totals.cards_reused}`,
    "",
    `- Main index: [normalized/repo-knowledge-pack/INDEX.md](../../../imports/repo-knowledge-pack/normalized/${PACK_ID}/INDEX.md)`,
    `- Lookup manifest: [lookup.json](../../../imports/repo-knowledge-pack/manifests/lookup.json)`,
    `- Raw file map: [files.jsonl](../../../imports/repo-knowledge-pack/raw/${PACK_ID}/files.jsonl)`,
  ].join("\n");
}

function buildRetrievalLookup(manifest) {
  return [
    "# Repo Knowledge Pack Lookup",
    "",
    "Use the JSON lookup first, then open the card path.",
    "",
    "## Fast path",
    "",
    `1. Search [lookup.json](../../../imports/repo-knowledge-pack/manifests/lookup.json) for the source path or basename.`,
    `2. Open the card path under [normalized/repo-knowledge-pack/cards/](../../../imports/repo-knowledge-pack/normalized/${PACK_ID}/cards/).`,
    `3. If the file is not carded, inspect [files.jsonl](../../../imports/repo-knowledge-pack/raw/${PACK_ID}/files.jsonl) and the top-level summary docs.`,
    "",
    "## Retrieval Notes",
    "",
    "- Script surfaces are intentionally over-weighted.",
    "- Generated/vendor/runtime trees remain in the raw manifest but are de-prioritized for cards.",
    "- Run `npm run brain:repo-knowledge-pack:update` to refresh unchanged cards after normal edits.",
    `- Retrieval profile: ${manifest.retrieval_profile}`,
  ].join("\n");
}

function buildRetrievalScriptsSummary(manifest, surfaceDocs) {
  const scriptsDocs = Object.entries(surfaceDocs)
    .filter(([surface]) => surface.includes("script"))
    .map(([surface, relPath]) => `- [${surface}](${path.posix.relative(RETRIEVAL_ROOT_REL, normalizeSlashes(relPath))})`);
  return [
    "# Scripts Summary",
    "",
    "Script-related surfaces and the best lookup path for each.",
    "",
    ...scriptsDocs,
    "",
    `Cards written: ${manifest.totals.cards_written}`,
  ].join("\n");
}

function buildRetrievalTopLevels(manifest, topLevelDocs) {
  return [
    "# Top-Level Summary",
    "",
    "Top-level file counts and summary documents.",
    "",
    ...Object.entries(topLevelDocs).sort((a, b) => a[0].localeCompare(b[0])).map(([topLevel, relPath]) => `- [${topLevel}](${path.posix.relative(RETRIEVAL_ROOT_REL, normalizeSlashes(relPath))})`),
    "",
    `Total files: ${manifest.totals.scanned_files}`,
  ].join("\n");
}

function buildRetrievalNextSteps() {
  return [
    "# Next Steps",
    "",
    "1. Run `npm run brain:repo-knowledge-pack:update` after normal edits or `npm run brain:repo-knowledge-pack` for a full refresh.",
    "2. Use the `repo-knowledge-pack` retrieval profile for repo-wide lookups.",
    "3. Open the top-level summary and then jump to the relevant card paths.",
  ].join("\n");
}

function writeOutput(repoRoot, relativePath, content) {
  const absolutePath = writeRepoFile(repoRoot, relativePath, content);
  return { absolutePath, checksum: sha256(content), relativePath: normalizeSlashes(relativePath) };
}

function main() {
  const args = parseArgs(process.argv);
  const repoRoot = detectRepoRoot(args);
  const config = loadConfig();
  const maxCards = Math.max(100, Number(args["max-cards"] || args.maxCards || DEFAULT_MAX_CARDS) || DEFAULT_MAX_CARDS);
  const generatedAt = nowIso();
  const incremental = parseBooleanArg(args.incremental) || String(args.mode || "").trim().toLowerCase() === "incremental";
  const previousPackState = incremental ? loadPreviousPackState(repoRoot) : null;

  const inventoryData = loadInventory(repoRoot);
  const inventory = inventoryData.rows.filter((entry) => entry.type === "file" && !isExcludedPath(entry.rel));
  const records = inventory.map((entry) => {
    const rel = normalizeSlashes(entry.rel);
    const relAbs = path.join(repoRoot, rel);
    const stat = fileStatSnapshot(relAbs);
    const extension = extensionFor(rel);
    const classification = classifyPath(rel, config);
    const surface = classifySurface(rel, classification, extension);
    const kind = classifyKind({ rel, extension });
    const language = languageForExtension(extension);
    const topLevel = topLevelFor(rel);
    const score = scoreForKnowledge(rel, classification, surface, config);
    const tags = buildTags({ rel, extension, classification, surface, kind });
    const cardCandidate = isLikelyText(rel, 1);
    const forceCard = isPrioritySurfacePath(rel, surface);
    return {
      rel,
      name: path.basename(rel),
      extension,
      classification,
      surface,
      kind,
      language,
      topLevel,
      score,
      tags,
      cardCandidate,
      forceCard,
      repoRoot,
      generatedAt,
      sizeBytes: stat.sizeBytes,
      mtimeMs: stat.mtimeMs,
    };
  });

  const priorityCards = [...records]
    .filter((record) => record.cardCandidate && record.forceCard)
    .sort((a, b) => b.score - a.score || a.rel.localeCompare(b.rel))
  const remainingCards = [...records]
    .filter((record) => record.cardCandidate && !record.forceCard)
    .sort((a, b) => b.score - a.score || a.rel.localeCompare(b.rel));

  const selectedCards = [...priorityCards, ...remainingCards]
    .slice(0, maxCards)
    .map((record, index) => ({ ...record, selectedRank: index + 1 }));

  const selectedByPath = new Map(selectedCards.map((record) => [record.rel, record]));
  const currentSelectedPaths = new Set(selectedCards.map((record) => record.rel));

  let reusedCards = 0;
  let rewrittenCards = 0;
  let deletedCards = 0;

  if (previousPackState) {
    for (const previousRecord of previousPackState.rawRecords) {
      if (!previousRecord.selected_for_card) continue;
      const previousSource = normalizeSlashes(previousRecord.path);
      if (currentSelectedPaths.has(previousSource)) continue;
      const previousCardPath = normalizeSlashes(previousRecord.card_path || "");
      if (!previousCardPath) continue;
      if (deleteFileIfExists(path.join(repoRoot, previousCardPath))) deletedCards += 1;
    }
  }

  const rawRecords = [];
  const cardWrites = [];
  const cardRecords = [];
  const byTopLevel = new Map();
  const bySurface = new Map();

  for (const record of records) {
    const selected = selectedByPath.get(record.rel) || null;
    const relAbs = path.join(repoRoot, record.rel);
    const cardRel = selected ? relativeCardPathFor(selected) : null;

    const rawRecord = {
      path: record.rel,
      name: record.name,
      top_level: record.topLevel,
      surface: record.surface,
      kind: record.kind,
      language: record.language,
      extension: record.extension,
      classification: record.classification,
      score: record.score,
      tags: record.tags,
      size_bytes: record.sizeBytes,
      source_mtime_ms: record.mtimeMs,
      selected_for_card: Boolean(selected),
      card_path: cardRel,
      selected_rank: selected ? selected.selectedRank : null,
      card_checksum_sha256: null,
    };
    rawRecords.push(rawRecord);

    if (selected) {
      const previousRecord = previousPackState?.bySource.get(record.rel) || null;
      const cardAbs = path.join(repoRoot, cardRel);
      const canReuse = incremental && canReuseCard(record, selected, previousRecord, cardRel) && fs.existsSync(cardAbs);

      let cardChecksum = null;
      let cardWritten = false;
      if (canReuse) {
        reusedCards += 1;
        cardChecksum = previousRecord && typeof previousRecord.card_checksum_sha256 === "string" && previousRecord.card_checksum_sha256
          ? previousRecord.card_checksum_sha256
          : sha256(fs.readFileSync(cardAbs, "utf8"));
      } else {
        const text = safeReadText(relAbs, TEXT_READ_LIMIT);
        const signals = {
          imports: uniqueSorted(extractImports(text)),
          exports: extractExports(text),
          headings: extractHeadings(text),
          jsonKeys: extractJsonKeys(text),
          cliHints: extractCliHints(text),
          packageSummary: record.name === "package.json" ? extractPackageSummary(text) : null,
        };
        const excerpt = buildExcerpt(text);
        const cardContent = buildCardMarkdown({ ...selected, cardPathAbs: cardAbs }, signals, excerpt);
        writeRepoFile(repoRoot, cardRel, cardContent);
        rewrittenCards += 1;
        cardWritten = true;
        cardChecksum = sha256(cardContent);
      }

      rawRecord.card_checksum_sha256 = cardChecksum;
      const cardRecord = {
        source_path: record.rel,
        card_path: normalizeSlashes(cardRel),
        card_checksum_sha256: cardChecksum,
        score: record.score,
        surface: record.surface,
        kind: record.kind,
        top_level: record.topLevel,
        tags: record.tags,
      };
      cardRecords.push(cardRecord);
      cardWrites.push({ ...cardRecord, selected_rank: selected.selectedRank, reused: canReuse, written: cardWritten });
    }

    if (!byTopLevel.has(record.topLevel)) byTopLevel.set(record.topLevel, []);
    byTopLevel.get(record.topLevel).push({ ...record, selected: Boolean(selected), cardPath: cardRel });

    if (!bySurface.has(record.surface)) bySurface.set(record.surface, []);
    bySurface.get(record.surface).push({ ...record, selected: Boolean(selected), cardPath: cardRel });
  }

  const packRoot = path.join(repoRoot, "taskmanager", "brain", "imports", PACK_ID);
  const retrievalRoot = path.join(repoRoot, "taskmanager", "brain", "retrieval", "imports", PACK_ID);
  const manifestDir = path.join(packRoot, "manifests");
  const rawDir = path.join(packRoot, "raw", PACK_ID);
  const normalizedRoot = path.join(packRoot, "normalized", PACK_ID);
  const cardsDir = path.join(normalizedRoot, "cards");
  const summariesDir = path.join(normalizedRoot, "summaries");
  const topLevelSummaryDir = path.join(summariesDir, "top-level");
  const surfaceSummaryDir = path.join(summariesDir, "surfaces");
  const retrievalRelativeRoot = path.relative(repoRoot, retrievalRoot).split(path.sep).join("/");

  const topLevelDocs = {};
  const surfaceDocs = {};

  const topLevelGroups = [...byTopLevel.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [topLevel, rows] of topLevelGroups) {
    const sortedRows = [...rows].sort((a, b) => b.score - a.score || a.rel.localeCompare(b.rel));
    const selectedRows = sortedRows.filter((row) => row.selected).sort((a, b) => a.selectedRank - b.selectedRank);
    const summaryRel = path.posix.join(IMPORT_ROOT_REL, "normalized", PACK_ID, "summaries", "top-level", `${sanitizeSegment(topLevel)}.md`);
    const summaryAbs = writeRepoFile(repoRoot, summaryRel, buildTopLevelSummary(summaryRel, topLevel, sortedRows, selectedRows));
    topLevelDocs[topLevel] = normalizeSlashes(path.relative(repoRoot, summaryAbs));
  }

  const surfaceGroups = [...bySurface.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [surface, rows] of surfaceGroups) {
    const sortedRows = [...rows].sort((a, b) => b.score - a.score || a.rel.localeCompare(b.rel));
    const selectedRows = sortedRows.filter((row) => row.selected).sort((a, b) => a.selectedRank - b.selectedRank);
    const summaryRel = path.posix.join(IMPORT_ROOT_REL, "normalized", PACK_ID, "summaries", "surfaces", `${sanitizeSegment(surface)}.md`);
    const summaryAbs = writeRepoFile(repoRoot, summaryRel, buildSurfaceSummary(summaryRel, surface, sortedRows, selectedRows));
    surfaceDocs[surface] = normalizeSlashes(path.relative(repoRoot, summaryAbs));
  }

  const lookup = {
    module_id: PACK_ID,
    generated_at: generatedAt,
    by_source_path: Object.fromEntries(cardRecords.map((record) => [record.source_path, {
      card_path: record.card_path,
      score: record.score,
      surface: record.surface,
      kind: record.kind,
      top_level: record.top_level,
      tags: record.tags,
    }])),
    by_basename: Object.fromEntries([...groupBy(cardRecords, (record) => path.basename(record.source_path)).entries()].map(([basename, rows]) => [basename, rows.map((row) => row.source_path)])),
    by_top_level: Object.fromEntries([...groupBy(cardRecords, (record) => record.top_level).entries()].map(([topLevel, rows]) => [topLevel, rows.map((row) => row.source_path)])),
    by_surface: Object.fromEntries([...groupBy(cardRecords, (record) => record.surface).entries()].map(([surface, rows]) => [surface, rows.map((row) => row.source_path)])),
    by_tag: Object.fromEntries([...groupBy(cardRecords.flatMap((record) => record.tags.map((tag) => ({ tag, source_path: record.source_path }))), (item) => item.tag).entries()].map(([tag, rows]) => [tag, rows.map((row) => row.source_path)])),
    surface_summary_paths: surfaceDocs,
    top_level_summary_paths: topLevelDocs,
    card_count: cardRecords.length,
  };

  const manifest = {
    module_id: PACK_ID,
    generated_at: generatedAt,
    repo_root: normalizeSlashes(repoRoot),
    inventory_source: inventoryData.source,
    retrieval_profile: "repo-knowledge-pack",
    build_mode: incremental ? "incremental" : "full",
    totals: {
      scanned_files: records.length,
      card_candidates: records.filter((record) => record.cardCandidate).length,
      cards_written: cardRecords.length,
      cards_reused: reusedCards,
      cards_rewritten: rewrittenCards,
      cards_deleted: deletedCards,
      selected_scripts: cardRecords.filter((record) => record.surface.includes("script")).length,
      selected_docs: cardRecords.filter((record) => record.surface === "docs" || record.kind === "markdown").length,
      selected_configs: cardRecords.filter((record) => record.surface === "config").length,
    },
    thresholds: {
      max_cards: maxCards,
      minimum_card_score: 0,
    },
    output_paths: {
      pack_root: normalizeSlashes(path.relative(repoRoot, packRoot)),
      raw_dir: normalizeSlashes(path.relative(repoRoot, rawDir)),
      normalized_root: normalizeSlashes(path.relative(repoRoot, normalizedRoot)),
      manifest_dir: normalizeSlashes(path.relative(repoRoot, manifestDir)),
      retrieval_root: normalizeSlashes(path.relative(repoRoot, retrievalRoot)),
    },
    notes: [
      "Repository-wide lookup pack with script-heavy surfaces prioritized.",
      "Generated/vendor/runtime output is retained in the raw manifest but de-prioritized for cards.",
      incremental ? "Incremental builds reuse unchanged cards and remove stale selected cards." : "Full builds rewrite the selected-card set.",
      "Use the lookup manifest first, then open the card path, then open the source file if you need the full implementation.",
    ],
  };

  writeOutput(repoRoot, path.posix.join(IMPORT_ROOT_REL, "manifests", "import-manifest.json"), JSON.stringify(manifest, null, 2));
  writeOutput(repoRoot, path.posix.join(IMPORT_ROOT_REL, "manifests", "lookup.json"), JSON.stringify(lookup, null, 2));
  writeOutput(repoRoot, path.posix.join(IMPORT_ROOT_REL, "manifests", "checksums.json"), JSON.stringify({
    module_id: PACK_ID,
    generated_at: generatedAt,
    build_mode: incremental ? "incremental" : "full",
    cards_reused: reusedCards,
    cards_rewritten: rewrittenCards,
    cards_deleted: deletedCards,
    checksums: cardWrites.slice(0, 50),
  }, null, 2));
  writeOutput(repoRoot, RAW_FILES_REL, rawRecords.map((record) => JSON.stringify(record)).join("\n"));
  writeOutput(repoRoot, INDEX_DOC_REL, buildIndexMarkdown(INDEX_DOC_REL, manifest, topLevelDocs, surfaceDocs, cardRecords.sort((a, b) => b.score - a.score || a.source_path.localeCompare(b.source_path))));
  writeOutput(repoRoot, README_DOC_REL, buildReadmeMarkdown(manifest));

  const retrievalDocs = [
    [path.posix.join(RETRIEVAL_ROOT_REL, "OVERVIEW.md"), buildRetrievalOverview(manifest)],
    [path.posix.join(RETRIEVAL_ROOT_REL, "LOOKUP.md"), buildRetrievalLookup(manifest)],
    [path.posix.join(RETRIEVAL_ROOT_REL, "SCRIPTS_SUMMARY.md"), buildRetrievalScriptsSummary(manifest, surfaceDocs)],
    [path.posix.join(RETRIEVAL_ROOT_REL, "TOP_LEVELS.md"), buildRetrievalTopLevels(manifest, topLevelDocs)],
    [path.posix.join(RETRIEVAL_ROOT_REL, "NEXT_STEPS.md"), buildRetrievalNextSteps()],
  ];
  for (const [relativePath, content] of retrievalDocs) {
    writeOutput(repoRoot, relativePath, content);
  }

  const stats = {
    ok: true,
    module_id: PACK_ID,
    generated_at: generatedAt,
    build_mode: incremental ? "incremental" : "full",
    scanned_files: records.length,
    cards_written: cardRecords.length,
    cards_reused: reusedCards,
    cards_rewritten: rewrittenCards,
    cards_deleted: deletedCards,
    top_levels: topLevelGroups.length,
    surfaces: surfaceGroups.length,
    retrieval_root: retrievalRelativeRoot,
    manifest: normalizeSlashes(path.relative(repoRoot, path.join(repoRoot, "taskmanager", "brain", "imports", PACK_ID, "manifests", "import-manifest.json"))),
  };

  process.stdout.write(`${JSON.stringify(stats, null, 2)}\n`);
}

if (require.main === module) {
  main();
}

module.exports = { main };