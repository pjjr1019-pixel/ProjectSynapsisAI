import fs from "node:fs";
import path from "node:path";
import { ensureDir, writeJsonStable } from "./brain-build-utils.mjs";
import { tokenizeForRetrieval } from "./brain-text-tokens.mjs";
import { ensureBrainRuntimeHub, getBrainRuntimeHubPaths, migrateLegacyBrainRuntimeData } from "./brain-runtime-hub.mjs";

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function topTermsFromMessages(entries, limit = 8) {
  const counts = new Map();
  for (const entry of entries) {
    const terms = tokenizeForRetrieval(String(entry.userMessage || ""));
    for (const term of terms) {
      counts.set(term, (counts.get(term) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([term, count]) => ({ term, count }));
}

function writeMarkdown(filePath, text) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, text, "utf8");
}

function buildChatTurnDigest(day, entries) {
  const draftSourceCounts = new Map();
  const models = new Map();
  let localLlmTurns = 0;
  let errors = 0;
  for (const entry of entries) {
    const draftSource = String(entry.draftSource || "unknown");
    draftSourceCounts.set(draftSource, (draftSourceCounts.get(draftSource) || 0) + 1);
    const model = String(entry.model || "").trim();
    if (model) models.set(model, (models.get(model) || 0) + 1);
    if (entry.localLlm === true) localLlmTurns += 1;
    if (entry.error) errors += 1;
  }
  const topTerms = topTermsFromMessages(entries);
  const topDraftSources = [...draftSourceCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 6)
    .map(([name, count]) => `- ${name}: ${count}`)
    .join("\n");
  const topModels = [...models.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 4)
    .map(([name, count]) => `- ${name}: ${count}`)
    .join("\n");
  const topTopics = topTerms.length
    ? topTerms.map(({ term, count }) => `- ${term}: ${count}`).join("\n")
    : "- none";
  return [
    "---",
    `id: hz.runtime.logs.chat-turns.${day}`,
    `title: "Runtime chat log digest ${day}"`,
    "domain: runtime",
    "app: assistant",
    "kind: log-digest",
    "status: canonical",
    "confidence: 0.76",
    `reviewedAt: "${new Date().toISOString()}"`,
    "---",
    "",
    `# Runtime Chat Log Digest ${day}`,
    "",
    "## Overview",
    "",
    `- Turns logged: ${entries.length}`,
    `- Local AI turns: ${localLlmTurns}`,
    `- Logged errors: ${errors}`,
    "",
    "## Draft sources",
    "",
    topDraftSources || "- none",
    "",
    "## Common topics",
    "",
    topTopics,
    "",
    "## Models",
    "",
    topModels || "- none",
    "",
    "## Safety",
    "",
    "This digest is derived from runtime logs and excludes raw chat bodies beyond brief aggregate topic counts.",
    "",
  ].join("\n");
}

function buildLearningDigest(day, manifests) {
  const promoted = manifests.reduce((sum, row) => sum + (Number(row.promotionCount) || 0), 0);
  const queued = manifests.reduce((sum, row) => sum + (Number(row.discoveredCount) || 0), 0);
  const sources = [];
  for (const row of manifests) {
    for (const url of row.seedUrls || []) {
      if (!sources.includes(url)) sources.push(url);
      if (sources.length >= 6) break;
    }
    if (sources.length >= 6) break;
  }
  return [
    "---",
    `id: hz.web.learning.digest.${day}`,
    `title: "Idle learning digest ${day}"`,
    "domain: web",
    "app: assistant",
    "kind: learning-digest",
    "status: canonical",
    "confidence: 0.7",
    `reviewedAt: "${new Date().toISOString()}"`,
    "---",
    "",
    `# Idle Learning Digest ${day}`,
    "",
    "## Overview",
    "",
    `- Learning cycles: ${manifests.length}`,
    `- Promoted documents: ${promoted}`,
    `- Discovered URLs: ${queued}`,
    "",
    "## Seed sources",
    "",
    sources.length ? sources.map((url) => `- ${url}`).join("\n") : "- none",
    "",
    "## Safety",
    "",
    "This digest summarizes promoted web knowledge and keeps raw fetched content out of default retrieval.",
    "",
  ].join("\n");
}

export function generateRuntimeDigestDocs() {
  migrateLegacyBrainRuntimeData();
  const paths = ensureBrainRuntimeHub();
  const written = [];

  for (const file of fs.existsSync(paths.chatTurnsRoot) ? fs.readdirSync(paths.chatTurnsRoot) : []) {
    if (!file.endsWith(".jsonl")) continue;
    const day = file.replace(/\.jsonl$/i, "");
    const entries = readJsonl(path.join(paths.chatTurnsRoot, file));
    if (!entries.length) continue;
    const outPath = path.join(paths.digestRoot, `chat-turns-${day}.md`);
    writeMarkdown(outPath, buildChatTurnDigest(day, entries));
    written.push(outPath);
  }

  const manifestRowsByDay = new Map();
  for (const file of fs.existsSync(paths.manifestsRoot) ? fs.readdirSync(paths.manifestsRoot) : []) {
    if (!file.endsWith(".json")) continue;
    try {
      const row = JSON.parse(fs.readFileSync(path.join(paths.manifestsRoot, file), "utf8"));
      const day = String(row.finishedAt || row.startedAt || "").slice(0, 10);
      if (!day) continue;
      if (!manifestRowsByDay.has(day)) manifestRowsByDay.set(day, []);
      manifestRowsByDay.get(day).push(row);
    } catch {
      /* ignore bad manifests */
    }
  }
  const learningDigestRoot = path.join(paths.promotedRoot, "digests");
  ensureDir(learningDigestRoot);
  for (const [day, manifests] of manifestRowsByDay.entries()) {
    if (!manifests.length) continue;
    const outPath = path.join(learningDigestRoot, `learning-${day}.md`);
    writeMarkdown(outPath, buildLearningDigest(day, manifests));
    written.push(outPath);
  }

  const manifestPath = path.join(paths.digestRoot, "runtime-digests-manifest.json");
  writeJsonStable(manifestPath, {
    artifactType: "runtime-digests-manifest",
    builtAt: new Date().toISOString(),
    counts: { docCount: written.length },
    files: written.map((filePath) => path.relative(paths.runtimeRoot, filePath).replace(/\\/g, "/")),
  });

  return {
    written,
    manifestPath,
  };
}
