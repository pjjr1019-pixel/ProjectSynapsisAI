import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  BRAIN_RUNTIME_BUILD_VERSION,
  BRAIN_RUNTIME_SCHEMA_VERSION,
  ensureDir,
  normalizeSlashes,
  readJsonIfExists,
  sha256File,
  stableStringify,
  writeJsonStable,
} from "./brain-build-utils.mjs";
import { getBrainRuntimePaths } from "./brain-runtime-layer.mjs";
import { parseYaml } from "./brain-yaml.mjs";

const PATHS = (() => {
  const brainRoot = getBrainRuntimePaths().brainRoot;
  const pipelineRoot = path.join(brainRoot, "pipeline");
  const researchRoot = path.join(pipelineRoot, "research");
  return {
    brainRoot,
    pipelineRoot,
    researchRoot,
    intakeRoot: path.join(researchRoot, "intake"),
    processedRoot: path.join(researchRoot, "processed"),
    failedRoot: path.join(researchRoot, "failed"),
    quarantineRoot: path.join(researchRoot, "quarantine"),
    ingestionConfig: path.join(pipelineRoot, "ingestion-config.yaml"),
    generatedEvalRoot: path.join(brainRoot, "evals", "generated"),
    updateReport: path.join(getBrainRuntimePaths().indexesRoot, "runtime-update-report.json"),
  };
})();

function sanitizeId(value, fallback = "research-report") {
  const clean = String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return clean || fallback;
}

function readIngestionConfig() {
  const raw = fs.existsSync(PATHS.ingestionConfig)
    ? fs.readFileSync(PATHS.ingestionConfig, "utf8")
    : "";
  return parseYaml(raw);
}

function resolveFileUri(uri) {
  if (!uri) return "";
  const raw = String(uri).trim();
  if (raw.startsWith("file:///")) {
    return raw.replace(/^file:\/\/\//i, "");
  }
  if (raw.startsWith("file://")) {
    return raw.replace(/^file:\/\//i, "");
  }
  return raw;
}

function moveFileSafe(sourcePath, targetPath) {
  ensureDir(path.dirname(targetPath));
  if (fs.existsSync(targetPath)) fs.rmSync(targetPath, { force: true });
  fs.renameSync(sourcePath, targetPath);
}

function listJsonFiles(root) {
  if (!fs.existsSync(root)) return [];
  const out = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      out.push(...listJsonFiles(fullPath));
      continue;
    }
    if (entry.name.toLowerCase().endsWith(".json")) out.push(fullPath);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function validateIntakeRecord(record) {
  const errors = [];
  const reportId = sanitizeId(record.reportId || record.batchId);
  if (!reportId) errors.push("reportId/batchId is required");
  if (!String(record.uri || record.rawSourcePath || "").trim()) {
    errors.push("uri or rawSourcePath is required");
  }
  if (!String(record.hash || "").trim()) errors.push("hash is required");
  if (!String(record.collector || record.generatedBy || "").trim()) {
    errors.push("collector/generatedBy is required");
  }
  if (!String(record.piiRisk || "").trim()) errors.push("piiRisk is required");
  return errors;
}

function normalizeIntakeRecord(record, intakePath) {
  const sourcePath =
    resolveFileUri(record.rawSourcePath || record.uri) ||
    normalizeSlashes(path.relative(PATHS.brainRoot, intakePath));
  const inferredApp = ["assistant", "financial", "work", "social", "life", "intel", "launcher"].includes(
    String(record.targetApp || "").trim()
  )
    ? String(record.targetApp).trim()
    : String(record.domain || "assistant").trim();
  return {
    reportId: sanitizeId(record.reportId || record.batchId),
    batchId: String(record.batchId || record.reportId || "").trim(),
    title: String(record.title || record.reportId || record.batchId || "Research report").trim(),
    uri: String(record.uri || "").trim(),
    rawSourcePath: sourcePath,
    hash: String(record.hash || "").trim(),
    collector: String(record.collector || record.generatedBy || "unknown").trim(),
    generatedBy: String(record.generatedBy || record.collector || "unknown").trim(),
    collectedAt: String(record.collectedAt || record.generatedAt || new Date().toISOString()).trim(),
    generatedAt: String(record.generatedAt || record.collectedAt || new Date().toISOString()).trim(),
    notes: String(record.notes || "").trim(),
    piiRisk: String(record.piiRisk || "unknown").trim(),
    targetApp: inferredApp,
    domain: String(record.domain || inferredApp || "assistant").trim(),
    trustTier: String(record.trustTier || "working").trim(),
    reviewStatus: String(record.reviewStatus || "pending").trim(),
    timeSensitive: record.timeSensitive === true,
    intakePath: normalizeSlashes(path.relative(PATHS.brainRoot, intakePath)),
  };
}

function resolveRawSourcePath(intake, intakePath) {
  const candidate = resolveFileUri(intake.rawSourcePath || intake.uri);
  if (!candidate) return intakePath;
  if (path.isAbsolute(candidate)) return candidate;
  const rel = candidate.replace(/^brain[\\/]/i, "");
  return path.join(PATHS.brainRoot, rel);
}

function extractTextFromFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const raw = fs.readFileSync(filePath, "utf8");
  if (ext === ".json") {
    return stableStringify(JSON.parse(raw));
  }
  return raw;
}

export function getResearchPipelinePaths() {
  return { ...PATHS };
}

export function listResearchIntakeRecords() {
  return listJsonFiles(PATHS.intakeRoot);
}

export function ingestResearchReport(inputPath) {
  const intakePath = inputPath || listResearchIntakeRecords()[0];
  if (!intakePath || !fs.existsSync(intakePath)) {
    throw new Error("No research intake record found.");
  }

  const config = readIngestionConfig();
  const rawRecord = JSON.parse(fs.readFileSync(intakePath, "utf8"));
  const errors = validateIntakeRecord(rawRecord);
  if (errors.length) {
    const target = path.join(PATHS.quarantineRoot, path.basename(intakePath));
    moveFileSafe(intakePath, target);
    throw new Error(`Research intake validation failed: ${errors.join("; ")}`);
  }

  const intake = normalizeIntakeRecord(rawRecord, intakePath);
  const rawSourcePath = resolveRawSourcePath(intake, intakePath);
  if (!fs.existsSync(rawSourcePath)) {
    const target = path.join(PATHS.failedRoot, path.basename(intakePath));
    moveFileSafe(intakePath, target);
    throw new Error(`Raw source not found: ${rawSourcePath}`);
  }

  const ext = path.extname(rawSourcePath).toLowerCase();
  const allowedExtensions = Array.isArray(config.allowedExtensions) ? config.allowedExtensions : [];
  if (allowedExtensions.length && !allowedExtensions.includes(ext)) {
    const target = path.join(PATHS.quarantineRoot, path.basename(intakePath));
    moveFileSafe(intakePath, target);
    throw new Error(`Extension ${ext} is not allowed by ingestion-config.yaml`);
  }
  const stat = fs.statSync(rawSourcePath);
  if (Number(config.maxFileBytes || 0) > 0 && stat.size > Number(config.maxFileBytes)) {
    const target = path.join(PATHS.quarantineRoot, path.basename(intakePath));
    moveFileSafe(intakePath, target);
    throw new Error(`Source file exceeds maxFileBytes (${stat.size} > ${config.maxFileBytes})`);
  }
  if (String(config.requireHash).toLowerCase() !== "false") {
    const currentHash = sha256File(rawSourcePath);
    if (currentHash !== intake.hash) {
      const target = path.join(PATHS.quarantineRoot, path.basename(intakePath));
      moveFileSafe(intakePath, target);
      throw new Error(`Source hash mismatch for ${rawSourcePath}`);
    }
  }

  const processedDir = path.join(PATHS.processedRoot, intake.reportId);
  ensureDir(processedDir);
  const copiedSource = path.join(processedDir, `raw${ext || ".txt"}`);
  fs.copyFileSync(rawSourcePath, copiedSource);
  const rawText = extractTextFromFile(rawSourcePath);
  fs.writeFileSync(path.join(processedDir, "raw.txt"), rawText, "utf8");
  writeJsonStable(path.join(processedDir, "metadata.json"), {
    artifactType: "research-metadata",
    schemaVersion: BRAIN_RUNTIME_SCHEMA_VERSION,
    buildVersion: BRAIN_RUNTIME_BUILD_VERSION,
    builtAt: new Date().toISOString(),
    ...intake,
    rawBytes: stat.size,
    rawExtension: ext,
    processedDir: normalizeSlashes(path.relative(PATHS.brainRoot, processedDir)),
  });
  moveFileSafe(intakePath, path.join(processedDir, "intake.json"));
  return {
    reportId: intake.reportId,
    processedDir,
    metadataPath: path.join(processedDir, "metadata.json"),
    rawTextPath: path.join(processedDir, "raw.txt"),
  };
}

function loadProcessedReport(reportId) {
  const processedDir = path.join(PATHS.processedRoot, sanitizeId(reportId));
  const metadata = readJsonIfExists(path.join(processedDir, "metadata.json"));
  const rawTextPath = path.join(processedDir, "raw.txt");
  if (!metadata || !fs.existsSync(rawTextPath)) {
    throw new Error(`Processed research report not found: ${reportId}`);
  }
  return {
    processedDir,
    metadata,
    rawText: fs.readFileSync(rawTextPath, "utf8"),
  };
}

function bulletLines(text) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").trim());
}

function paragraphs(text) {
  return String(text ?? "")
    .split(/\r?\n\r?\n/)
    .map((block) => block.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function headingLines(text) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^#+\s+/.test(line))
    .map((line) => line.replace(/^#+\s+/, "").trim());
}

function writeJsonl(filePath, rows) {
  ensureDir(path.dirname(filePath));
  const body = rows.map((row) => JSON.stringify(row)).join("\n");
  fs.writeFileSync(filePath, body ? `${body}\n` : "", "utf8");
}

export function extractResearchArtifacts(reportId) {
  const { processedDir, metadata, rawText } = loadProcessedReport(reportId);
  const heads = headingLines(rawText);
  const bullets = bulletLines(rawText);
  const paras = paragraphs(rawText);
  const claims = (bullets.length ? bullets : paras.slice(1, 8)).map((text, index) => ({
    claimId: `${metadata.reportId}.claim.${index + 1}`,
    text,
    reportId: metadata.reportId,
    targetApp: metadata.targetApp,
    sourceHash: metadata.hash,
  }));
  const evidence = paras
    .filter((paragraph) => /\b(?:http|www\.|source|because|data|study|report|evidence)\b/i.test(paragraph))
    .slice(0, 8)
    .map((text, index) => ({
      evidenceId: `${metadata.reportId}.evidence.${index + 1}`,
      text,
      reportId: metadata.reportId,
    }));
  const assumptions = paras
    .filter((paragraph) => /\b(?:assume|likely|probably|estimate|unclear|unknown)\b/i.test(paragraph))
    .slice(0, 6)
    .map((text, index) => ({
      assumptionId: `${metadata.reportId}.assumption.${index + 1}`,
      text,
      reportId: metadata.reportId,
    }));
  const counterevidence = paras
    .filter((paragraph) => /\b(?:however|but|although|counter|risk|limitation|drawback)\b/i.test(paragraph))
    .slice(0, 6)
    .map((text, index) => ({
      counterId: `${metadata.reportId}.counter.${index + 1}`,
      text,
      reportId: metadata.reportId,
    }));
  const timeSensitive = {
    reportId: metadata.reportId,
    timeSensitive:
      metadata.timeSensitive === true ||
      /\b(?:today|current|recent|latest|this year|this quarter)\b/i.test(rawText),
    detectedHeadings: heads.filter((heading) => /\b(?:outlook|forecast|roadmap|next|timeline)\b/i.test(heading)),
  };
  const evalCases = {
    artifactType: "brain-eval-cases",
    schemaVersion: BRAIN_RUNTIME_SCHEMA_VERSION,
    cases: claims.slice(0, 4).map((claim, index) => ({
      caseId: `${metadata.reportId}_claim_${index + 1}`,
      query: claim.text.slice(0, 120),
      profile: `${metadata.targetApp}-default`,
      expected: {
        docIds: [`hz.auto.apps.${metadata.targetApp}.draft.research.${metadata.reportId}.src-md`],
        sourceTypes: ["draft"],
      },
    })),
  };

  writeJsonl(path.join(processedDir, "claims.jsonl"), claims);
  writeJsonl(path.join(processedDir, "evidence.jsonl"), evidence);
  writeJsonl(path.join(processedDir, "assumptions.jsonl"), assumptions);
  writeJsonl(path.join(processedDir, "counterevidence.jsonl"), counterevidence);
  writeJsonStable(path.join(processedDir, "time-sensitive.json"), timeSensitive);
  writeJsonStable(path.join(processedDir, "eval-cases.json"), evalCases);
  return {
    reportId: metadata.reportId,
    processedDir,
    counts: {
      claims: claims.length,
      evidence: evidence.length,
      assumptions: assumptions.length,
      counterevidence: counterevidence.length,
      evalCases: evalCases.cases.length,
    },
  };
}

function markdownList(rows, field = "text") {
  if (!rows.length) return "- none extracted";
  return rows.map((row) => `- ${String(row[field] || "").trim()}`).join("\n");
}

export function promoteResearchArtifacts(reportId, opts = {}) {
  const { processedDir, metadata } = loadProcessedReport(reportId);
  const claims = fs.existsSync(path.join(processedDir, "claims.jsonl"))
    ? fs
        .readFileSync(path.join(processedDir, "claims.jsonl"), "utf8")
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line))
    : [];
  const evidence = fs.existsSync(path.join(processedDir, "evidence.jsonl"))
    ? fs
        .readFileSync(path.join(processedDir, "evidence.jsonl"), "utf8")
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line))
    : [];
  const assumptions = fs.existsSync(path.join(processedDir, "assumptions.jsonl"))
    ? fs
        .readFileSync(path.join(processedDir, "assumptions.jsonl"), "utf8")
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line))
    : [];
  const counterevidence = fs.existsSync(path.join(processedDir, "counterevidence.jsonl"))
    ? fs
        .readFileSync(path.join(processedDir, "counterevidence.jsonl"), "utf8")
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line))
    : [];
  const timeSensitive = readJsonIfExists(path.join(processedDir, "time-sensitive.json")) || {
    timeSensitive: false,
  };
  const evalCases = readJsonIfExists(path.join(processedDir, "eval-cases.json")) || {
    artifactType: "brain-eval-cases",
    schemaVersion: BRAIN_RUNTIME_SCHEMA_VERSION,
    cases: [],
  };

  const targetApp = String(opts.targetApp || metadata.targetApp || "assistant").trim();
  const draftResearchRoot = path.join(PATHS.brainRoot, "apps", targetApp, "draft", "research");
  ensureDir(draftResearchRoot);

  const docId = `hz.auto.apps.${targetApp}.draft.research.${metadata.reportId}.src-md`;
  const docPath = path.join(draftResearchRoot, `${metadata.reportId}.md`);
  const frontMatter = [
    "---",
    `id: ${docId}`,
    `title: ${metadata.title}`,
    `app: ${targetApp}`,
    `domain: ${metadata.domain || targetApp}`,
    `reportId: ${metadata.reportId}`,
    `trustTier: ${metadata.trustTier}`,
    `reviewStatus: ${metadata.reviewStatus}`,
    `timeSensitive: ${timeSensitive.timeSensitive === true ? "true" : "false"}`,
    `aliases: [${JSON.stringify(metadata.title.toLowerCase())}, ${JSON.stringify(metadata.reportId)}]`,
    "---",
  ].join("\n");

  const body = [
    frontMatter,
    `# ${metadata.title}`,
    "",
    "## Summary",
    metadata.notes || "Promoted research digest generated from processed intake artifacts.",
    "",
    "## Key Claims",
    markdownList(claims),
    "",
    "## Evidence",
    markdownList(evidence),
    "",
    "## Assumptions",
    markdownList(assumptions),
    "",
    "## Counterevidence",
    markdownList(counterevidence),
    "",
    "## Freshness",
    timeSensitive.timeSensitive === true
      ? "- Time sensitive: yes"
      : "- Time sensitive: no explicit freshness signal detected",
    "",
    "## Provenance",
    `- reportId: ${metadata.reportId}`,
    `- collector: ${metadata.collector}`,
    `- generatedAt: ${metadata.generatedAt}`,
    `- sourceHash: ${metadata.hash}`,
    `- processedDir: ${normalizeSlashes(path.relative(PATHS.brainRoot, processedDir))}`,
  ].join("\n");

  fs.writeFileSync(docPath, `${body}\n`, "utf8");
  ensureDir(PATHS.generatedEvalRoot);
  writeJsonStable(path.join(PATHS.generatedEvalRoot, `${metadata.reportId}.json`), evalCases);
  return {
    reportId: metadata.reportId,
    docPath,
    docId,
    evalPath: path.join(PATHS.generatedEvalRoot, `${metadata.reportId}.json`),
  };
}

function detectChangedPaths() {
  const result = spawnSync(
    "git",
    ["status", "--porcelain", "--untracked-files=all", "--", "brain", "scripts", "package.json"],
    {
      cwd: path.join(PATHS.brainRoot, ".."),
      encoding: "utf8",
    }
  );
  if (result.status !== 0) return [];
  return String(result.stdout || "")
    .split(/\r?\n/)
    .map((line) => line.slice(3).trim())
    .filter(Boolean)
    .map((rel) => normalizeSlashes(rel));
}

function profilesForChangedPaths(paths) {
  const allProfiles = [
    "repo-knowledge-pack",
    "assistant-default",
    "financial-default",
    "work-default",
    "social-default",
    "life-default",
    "intel-default",
    "launcher-default",
    "dev-all-drafts",
  ];
  const selected = new Set();
  for (const rel of paths) {
    if (/^brain\/imports\/repo-knowledge-pack\//.test(rel)) selected.add("repo-knowledge-pack");
    if (/^brain\/apps\/assistant\//.test(rel)) selected.add("assistant-default");
    else if (/^brain\/apps\/financial\//.test(rel)) selected.add("financial-default");
    else if (/^brain\/apps\/work\//.test(rel)) selected.add("work-default");
    else if (/^brain\/apps\/social\//.test(rel)) selected.add("social-default");
    else if (/^brain\/apps\/life\//.test(rel)) selected.add("life-default");
    else if (/^brain\/apps\/intel\//.test(rel)) selected.add("intel-default");
    else if (/^brain\/launcher\//.test(rel)) selected.add("launcher-default");
    else if (/^brain\/(core|governance|ops|pipeline|imports|memory)\//.test(rel)) {
      for (const profile of allProfiles) selected.add(profile);
    }
  }
  return selected.size ? [...selected] : ["repo-knowledge-pack"];
}

function runNodeScript(scriptPath, args = []) {
  const result = spawnSync("node", [scriptPath, ...args], {
    cwd: path.join(PATHS.brainRoot, ".."),
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`${path.basename(scriptPath)} failed with exit code ${result.status}`);
  }
}

export function updateBrainRuntime(opts = {}) {
  const changedPaths = Array.isArray(opts.changedPaths) && opts.changedPaths.length
    ? opts.changedPaths
    : detectChangedPaths();
  const profiles = Array.isArray(opts.profiles) && opts.profiles.length
    ? opts.profiles
    : profilesForChangedPaths(changedPaths);

  runNodeScript("scripts/build-brain-ir.mjs", []);
  if (opts.buildDensePilot === true || String(process.env.HORIZONS_BRAIN_DENSE_PILOT ?? "") === "1") {
    runNodeScript("scripts/build-embedding-store.mjs", []);
  }
  for (const profile of profiles) {
    runNodeScript("scripts/run-brain-evals.mjs", ["--profile", profile]);
  }

  const report = {
    artifactType: "runtime-update-report",
    schemaVersion: BRAIN_RUNTIME_SCHEMA_VERSION,
    buildVersion: BRAIN_RUNTIME_BUILD_VERSION,
    builtAt: new Date().toISOString(),
    changedPaths,
    profiles,
  };
  writeJsonStable(PATHS.updateReport, report);
  return report;
}
