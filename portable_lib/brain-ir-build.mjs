import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  BRAIN_RUNTIME_BUILD_VERSION,
  BRAIN_RUNTIME_SCHEMA_VERSION,
  compareStrings,
  ensureDir,
  firstParagraph,
  normalizeSlashes,
  relPath,
  sentenceFragments,
  sha256File,
  sha256Text,
  uniqueSorted,
  writeJsonStable,
} from "./brain-build-utils.mjs";
import {
  normalizeProfileDefinition,
  validateArtifactEnvelope,
  validateNormalizedDoc,
} from "./brain-ir-contracts.mjs";
import {
  getBrainRoot,
  loadAppRegistryConfig,
  loadBrainManifestConfig,
  loadModuleRegistryConfig,
  resolveModuleIdsForBrainPath,
} from "./brain-registry-loader.mjs";
import {
  clearBrainRetrievalCache,
  loadChunksJsonl,
  loadChunkText,
  loadProfiles,
} from "./brain-retrieval.mjs";
import { tokenizeForRetrieval } from "./brain-text-tokens.mjs";
import { extractFrontMatter } from "./brain-yaml.mjs";
import { generateRuntimeDigestDocs } from "./brain-runtime-digests.mjs";
import { migrateLegacyBrainRuntimeData } from "./brain-runtime-hub.mjs";

const brainRoot = getBrainRoot();
const retrievalIndexesRoot = path.join(brainRoot, "retrieval", "indexes");
const legacyChunksPath = path.join(retrievalIndexesRoot, "chunks.jsonl");
const legacyAssistantBuildRoot = path.join(brainRoot, "apps", "assistant", "knowledge", "build");
const assistantScenariosRoot = path.join(
  brainRoot,
  "apps",
  "assistant",
  "knowledge",
  "scenarios"
);

const SURFACE_IDS = new Set(["assistant", "financial", "work", "social", "life", "intel", "launcher"]);
const TARGET_EXTENSIONS = new Set([".md", ".json"]);
const DEFAULT_DISCOVERY_ROOTS = [
  "core",
  "governance",
  "ops",
  "apps",
  "launcher",
  "imports/base-knowledge/_catalog",
  "imports/repo-knowledge-pack",
  "imports/live",
  "imports/bulk",
  "memory/user",
  "runtime/sessions/snapshots",
  "runtime/logs/digests",
  "runtime/learning/promoted",
  "prompts/library",
];

/**
 * Resolve the active discovery roots for brain IR builds.
 * Priority (highest first):
 *   1. HORIZONS_BRAIN_DISCOVERY_ROOTS env var — comma-separated list (replaces defaults)
 *   2. manifest.config.discoveryRoots array (replaces defaults)
 *   3. DEFAULT_DISCOVERY_ROOTS + optional HORIZONS_BRAIN_EXTRA_DISCOVERY_ROOTS appended
 */
function resolveDiscoveryRoots(manifestConfig) {
  const envOverride = String(process.env.HORIZONS_BRAIN_DISCOVERY_ROOTS || "").trim();
  if (envOverride) {
    return envOverride.split(",").map((s) => s.trim()).filter(Boolean);
  }

  const configRoots = Array.isArray(manifestConfig?.discoveryRoots)
    ? manifestConfig.discoveryRoots.filter((r) => typeof r === "string" && r.trim())
    : null;
  if (configRoots && configRoots.length > 0) {
    return configRoots;
  }

  const extras = String(process.env.HORIZONS_BRAIN_EXTRA_DISCOVERY_ROOTS || "").trim();
  if (extras) {
    const extraList = extras.split(",").map((s) => s.trim()).filter(Boolean);
    return [...DEFAULT_DISCOVERY_ROOTS, ...extraList];
  }

  return DEFAULT_DISCOVERY_ROOTS;
}

const FRONTMATTER_TITLE_RE = /^#\s+(.+)$/m;
const BULLET_RE = /^(?:[-*]|\d+\.)\s+(.+)$/;
const RULE_HINT_RE = /\b(?:must|should|never|always|do not|don't|cannot|can't|required|avoid)\b/i;
const MD_LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;
const HEADING_RE = /^(#{1,6})\s+(.+)$/;
const LINE_SPLIT_RE = /\r?\n/;

function walkFiles(fullDir) {
  if (!fs.existsSync(fullDir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(fullDir, { withFileTypes: true })) {
    const full = path.join(fullDir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "build") continue;
      out.push(...walkFiles(full));
      continue;
    }
    if (!TARGET_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
    out.push(full);
  }
  return out;
}

function resetGeneratedDir(fullDir) {
  const root = normalizeSlashes(brainRoot);
  const target = normalizeSlashes(fullDir);
  if (!target.startsWith(root)) {
    throw new Error(`Refusing to reset non-brain path: ${fullDir}`);
  }
  fs.rmSync(fullDir, { recursive: true, force: true });
  ensureDir(fullDir);
}

function shouldNormalizeFile(brainRelativePath) {
  const rel = normalizeSlashes(brainRelativePath);
  if (rel.includes("/_template/")) return false;
  if (rel.startsWith("core/")) return true;
  if (rel.startsWith("governance/")) return true;
  if (rel.startsWith("ops/")) return true;
  if (rel.startsWith("prompts/library/")) return true;
  if (rel.startsWith("imports/base-knowledge/_catalog/")) return true;
  if (rel.startsWith("imports/repo-knowledge-pack/normalized/")) return true;
  if (rel.startsWith("imports/repo-knowledge-pack/retrieval/")) return true;
  if (rel.startsWith("imports/live/")) return true;
  if (rel.startsWith("imports/bulk/")) return true;
  if (rel.startsWith("memory/user/")) return true;
  if (rel.startsWith("runtime/sessions/snapshots/")) return true;
  if (rel.startsWith("runtime/logs/digests/")) return true;
  if (rel.startsWith("runtime/learning/promoted/")) return true;
  if (rel.startsWith("apps/") && rel.includes("/canonical/")) return true;
  if (rel.startsWith("apps/") && rel.includes("/draft/")) return true;
  if (rel === "apps/assistant/knowledge/synonyms.json") return true;
  if (rel.startsWith("apps/assistant/knowledge/modules/")) return true;
  if (rel === "apps/assistant/knowledge/scenarios/manifest.json") return true;
  if (rel.startsWith("launcher/") && rel.includes("/canonical/")) return true;
  if (rel.startsWith("launcher/") && rel.includes("/draft/")) return true;
  return false;
}

function discoverCanonicalSourceFiles(discoveryRoots) {
  const roots = Array.isArray(discoveryRoots) && discoveryRoots.length
    ? discoveryRoots
    : DEFAULT_DISCOVERY_ROOTS;
  const out = [];
  for (const rel of roots) {
    out.push(...walkFiles(path.join(brainRoot, rel)));
  }
  return out
    .filter((filePath) => shouldNormalizeFile(relPath(brainRoot, filePath)))
    .sort((a, b) => a.localeCompare(b));
}

function inferSourceType(brainRelativePath) {
  const rel = normalizeSlashes(brainRelativePath);
  if (rel.startsWith("runtime/learning/promoted/")) return "web";
  if (rel.startsWith("runtime/")) return "runtime";
  if (rel.startsWith("imports/")) return "import";
  if (rel.startsWith("memory/")) return "memory";
  if (rel.includes("/draft/")) return "draft";
  return "canonical";
}

function inferDomain(brainRelativePath, frontMatter = {}) {
  if (frontMatter.domain) return String(frontMatter.domain);
  const rel = normalizeSlashes(brainRelativePath);
  if (rel.startsWith("apps/")) return rel.split("/")[1] || "assistant";
  if (rel.startsWith("launcher/")) return "launcher";
  if (rel.startsWith("core/")) return "core";
  if (rel.startsWith("governance/")) return "governance";
  if (rel.startsWith("ops/")) return "ops";
  if (rel.startsWith("imports/")) return "pipeline";
  if (rel.startsWith("memory/")) return "memory";
  if (rel.startsWith("runtime/learning/promoted/")) return "web";
  if (rel.startsWith("runtime/")) return "runtime";
  if (rel.startsWith("prompts/")) return "prompt";
  return "core";
}

function inferApp(brainRelativePath, frontMatter = {}) {
  if (frontMatter.app) return String(frontMatter.app);
  const rel = normalizeSlashes(brainRelativePath);
  if (rel.startsWith("apps/")) return rel.split("/")[1] || "assistant";
  if (rel.startsWith("launcher/")) return "launcher";
  if (rel.startsWith("memory/")) return "memory";
  return "core";
}

function inferDocId(brainRelativePath, frontMatter = {}) {
  if (frontMatter.id) return String(frontMatter.id);
  const rel = normalizeSlashes(brainRelativePath)
    .replace(/\.([^.]+)$/, ".src-$1")
    .replace(/[^a-zA-Z0-9/._-]+/g, "-");
  return `hz.auto.${rel.replace(/[/.]+/g, ".").toLowerCase()}`;
}

function inferTitle(brainRelativePath, frontMatter, bodyOrText) {
  if (frontMatter.title) return String(frontMatter.title);
  const heading = String(bodyOrText ?? "").match(FRONTMATTER_TITLE_RE)?.[1];
  if (heading) return heading.trim();
  return path.basename(brainRelativePath).replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
}

function textCharRange(text, needle, fromIndex = 0) {
  const idx = String(text).indexOf(String(needle), fromIndex);
  if (idx < 0) return { start: 0, end: 0 };
  return { start: idx, end: idx + String(needle).length };
}

function parseMarkdownHeadings(body, docId) {
  const lines = String(body ?? "").split(LINE_SPLIT_RE);
  let offset = 0;
  const headings = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const match = line.match(HEADING_RE);
    if (match) {
      headings.push({
        headingId: `${docId}.heading.${headings.length + 1}`,
        level: match[1].length,
        text: match[2].trim(),
        line: i + 1,
        charStart: offset,
        charEnd: offset + line.length,
      });
    }
    offset += line.length + 1;
  }
  return headings;
}

function extractBulletFacts(body, docId) {
  const lines = String(body ?? "").split(LINE_SPLIT_RE);
  let offset = 0;
  const facts = [];
  for (const line of lines) {
    const match = line.match(BULLET_RE);
    if (match) {
      facts.push({
        factId: `${docId}.fact.${facts.length + 1}`,
        text: match[1].trim(),
        kind: "bullet",
        charStart: offset,
        charEnd: offset + line.length,
        tokens: tokenizeForRetrieval(match[1].trim()),
      });
    }
    offset += line.length + 1;
  }
  return facts;
}

function extractRules(body, docId) {
  const rules = [];
  for (const sentence of sentenceFragments(body, 24)) {
    if (!RULE_HINT_RE.test(sentence)) continue;
    rules.push({
      ruleId: `${docId}.rule.${rules.length + 1}`,
      text: sentence,
      tokens: tokenizeForRetrieval(sentence),
    });
  }
  return rules;
}

function extractRelations(body, docId, currentPath) {
  const relations = [];
  let match;
  while ((match = MD_LINK_RE.exec(String(body ?? "")))) {
    const target = String(match[2] ?? "").trim();
    if (!target || /^https?:\/\//i.test(target)) continue;
    relations.push({
      relationId: `${docId}.relation.${relations.length + 1}`,
      type: "references",
      sourceDocId: docId,
      targetPath: normalizeSlashes(path.join(path.dirname(currentPath), target)),
      label: String(match[1] ?? "").trim(),
    });
  }
  return relations;
}

const GENERIC_AUTO_ALIAS_TERMS = new Set(["readme", "manifest", "index"]);
const STRUCTURED_SOURCE_ALIAS_RE = /\bsrc(?:[\s.-]+)(md|markdown|json|jsonl|yaml|yml|txt)\b/;

function normalizeAliasText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^\w\s.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function shouldKeepAutoAlias(alias, brainRelativePath) {
  const normalized = normalizeAliasText(alias);
  if (!normalized) return false;
  if (GENERIC_AUTO_ALIAS_TERMS.has(normalized)) return false;
  if (STRUCTURED_SOURCE_ALIAS_RE.test(normalized)) return false;

  const basename = normalizeAliasText(path.basename(brainRelativePath).replace(/\.[^.]+$/, ""));
  if (basename && GENERIC_AUTO_ALIAS_TERMS.has(basename) && normalized.includes(basename)) {
    return false;
  }
  return true;
}

function extractAliases(docId, title, frontMatter = {}, brainRelativePath) {
  const explicitAliases = new Set();
  const autoAliases = new Set();
  const explicit = frontMatter.aliases;
  if (Array.isArray(explicit)) {
    for (const value of explicit) explicitAliases.add(normalizeAliasText(value));
  } else if (typeof explicit === "string" && explicit.trim()) {
    explicitAliases.add(normalizeAliasText(explicit));
  }
  const base = normalizeAliasText(title);
  if (base && shouldKeepAutoAlias(base, brainRelativePath)) autoAliases.add(base);
  const slug = path
    .basename(brainRelativePath)
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim();
  const normalizedSlug = normalizeAliasText(slug);
  if (normalizedSlug && shouldKeepAutoAlias(normalizedSlug, brainRelativePath)) {
    autoAliases.add(normalizedSlug);
  }
  const idTail = String(docId).split(".").slice(-2).join(" ").toLowerCase();
  const normalizedIdTail = normalizeAliasText(idTail);
  if (normalizedIdTail && shouldKeepAutoAlias(normalizedIdTail, brainRelativePath)) {
    autoAliases.add(normalizedIdTail);
  }
  const aliases = [...explicitAliases, ...autoAliases].filter(Boolean);
  return aliases.sort(compareStrings).map((alias, index) => ({
    aliasId: `${docId}.alias.${index + 1}`,
    alias,
    canonical: title.toLowerCase(),
  }));
}

function extractEntities(docId, title, headings, frontMatter = {}) {
  const entities = [];
  const pushEntity = (name, kind) => {
    const clean = String(name ?? "").trim();
    if (!clean) return;
    entities.push({
      entityId: `${docId}.entity.${entities.length + 1}`,
      name: clean,
      kind,
      tokens: tokenizeForRetrieval(clean),
    });
  };
  pushEntity(title, "document");
  for (const tag of Array.isArray(frontMatter.tags) ? frontMatter.tags : []) {
    pushEntity(tag, "tag");
  }
  for (const heading of headings.slice(0, 6)) {
    pushEntity(heading.text, "heading");
  }
  return entities;
}

function buildSummary(title, body, bulletFacts) {
  const paragraph = firstParagraph(body) || title;
  const short = paragraph.slice(0, 240);
  const medium = sentenceFragments(paragraph, 3).join(" ").slice(0, 640);
  return {
    short,
    medium: medium || short,
    bullets: bulletFacts.slice(0, 3).map((fact) => fact.text),
    tokens: tokenizeForRetrieval(`${title} ${short} ${medium}`),
  };
}

function parseDocumentFile(filePath) {
  const brainRelativePath = relPath(brainRoot, filePath);
  const sourceType = inferSourceType(brainRelativePath);
  const ext = path.extname(filePath).toLowerCase();
  const raw = fs.readFileSync(filePath, "utf8");
  let frontMatter = {};
  let body = raw;
  let structured = null;
  if (ext === ".md") {
    const parsed = extractFrontMatter(raw);
    frontMatter = parsed.frontMatter || {};
    body = parsed.body || "";
  } else if (ext === ".json") {
    try {
      structured = JSON.parse(raw);
    } catch (_error) {
      structured = null;
    }
    body = raw;
  }
  if (structured?.documentType === "external-source") {
    const docFrontMatter = structured;
    const docId = inferDocId(brainRelativePath, docFrontMatter);
    const title =
      String(docFrontMatter.title || "").trim() ||
      inferTitle(brainRelativePath, docFrontMatter, raw);
    const app = inferApp(brainRelativePath, docFrontMatter);
    const domain = inferDomain(brainRelativePath, docFrontMatter);
    const moduleIds = resolveModuleIdsForBrainPath(brainRelativePath);
    const contentBody = String(docFrontMatter.body || "").trim();
    const contentSummary =
      String(docFrontMatter.summary || "").trim() || firstParagraph(contentBody) || title;
    const explicitFacts = Array.isArray(docFrontMatter.facts)
      ? docFrontMatter.facts.map((entry) => String(entry ?? "").trim()).filter(Boolean)
      : [];
    const facts = [];
    const pushFact = (text, kind) => {
      if (!text) return;
      const range = textCharRange(raw, text);
      facts.push({
        factId: `${docId}.fact.${facts.length + 1}`,
        text,
        kind,
        charStart: range.start,
        charEnd: range.end,
        tokens: tokenizeForRetrieval(text),
      });
    };
    pushFact(contentSummary, "summary");
    for (const fact of explicitFacts.slice(0, 10)) pushFact(fact, "bullet");
    return {
      docId,
      app,
      domain,
      moduleIds,
      path: normalizeSlashes(brainRelativePath),
      title,
      status:
        typeof docFrontMatter.status === "string" && docFrontMatter.status.trim()
          ? docFrontMatter.status.trim()
          : "draft",
      confidence: Number(docFrontMatter.confidence ?? 0.72) || 0.72,
      headings: [],
      facts,
      entities: extractEntities(docId, title, [], docFrontMatter),
      relations: [],
      aliases: extractAliases(docId, title, docFrontMatter, brainRelativePath),
      rules: extractRules(contentBody, docId),
      scenarios: [],
      summary: {
        short: contentSummary.slice(0, 240),
        medium: (String(docFrontMatter.summary || "").trim() || contentBody || contentSummary).slice(0, 640),
        bullets: explicitFacts.slice(0, 3),
        tokens: tokenizeForRetrieval(`${title} ${contentSummary} ${contentBody}`),
      },
      provenance: {
        sourceType,
        hash:
          String(docFrontMatter?.provenance?.hash || "").trim() ||
          String(docFrontMatter?.provenance?.contentHash || "").trim() ||
          sha256File(filePath),
        charRanges: [{ start: 0, end: raw.length }],
        sourceUrl: String(docFrontMatter?.provenance?.sourceUrl || "").trim(),
        sourceDomain: String(docFrontMatter?.provenance?.sourceDomain || "").trim(),
        fetchedAt: String(docFrontMatter?.provenance?.fetchedAt || "").trim(),
        contentHash: String(docFrontMatter?.provenance?.contentHash || "").trim(),
        license: String(docFrontMatter?.provenance?.license || "").trim(),
        licenseRisk: String(docFrontMatter?.provenance?.licenseRisk || "").trim(),
        retrievalSafe: docFrontMatter?.provenance?.retrievalSafe !== false,
        trainingSafe: docFrontMatter?.provenance?.trainingSafe === true,
        piiScan: String(docFrontMatter?.provenance?.piiScan || "").trim(),
        importLayer: String(docFrontMatter?.provenance?.importLayer || "").trim(),
        freshness:
          docFrontMatter?.provenance?.freshness ??
          docFrontMatter?.freshness ??
          String(docFrontMatter?.provenance?.fetchedAt || "").trim(),
        ttlHours: Number(docFrontMatter?.provenance?.ttlHours || 0) || undefined,
        tool: String(docFrontMatter?.provenance?.tool || "").trim(),
        script: String(docFrontMatter?.provenance?.script || "").trim(),
        version: String(docFrontMatter?.provenance?.version || "").trim(),
      },
    };
  }
  const docId = inferDocId(brainRelativePath, frontMatter);
  const title = inferTitle(brainRelativePath, frontMatter, body);
  const app = inferApp(brainRelativePath, frontMatter);
  const domain = inferDomain(brainRelativePath, frontMatter);
  const moduleIds = resolveModuleIdsForBrainPath(brainRelativePath);
  const headings = ext === ".md" ? parseMarkdownHeadings(body, docId) : [];
  const bulletFacts = ext === ".md" ? extractBulletFacts(body, docId) : [];
  const firstFactText =
    ext === ".md"
      ? firstParagraph(body)
      : structured && typeof structured === "object"
        ? `Structured JSON keys: ${Object.keys(structured).slice(0, 12).join(", ")}`
        : raw.slice(0, 200);
  const facts = [];
  if (firstFactText) {
    const range = textCharRange(body || raw, firstFactText);
    facts.push({
      factId: `${docId}.fact.${facts.length + 1}`,
      text: firstFactText,
      kind: "summary",
      charStart: range.start,
      charEnd: range.end,
      tokens: tokenizeForRetrieval(firstFactText),
    });
  }
  for (const fact of bulletFacts) facts.push(fact);
  const rules = ext === ".md" ? extractRules(body, docId) : [];
  const aliases = extractAliases(docId, title, frontMatter, brainRelativePath);
  const entities = extractEntities(docId, title, headings, frontMatter);
  const relations = ext === ".md" ? extractRelations(body, docId, brainRelativePath) : [];
  const summary = buildSummary(title, body || raw, bulletFacts);
  const status =
    typeof frontMatter.status === "string" && frontMatter.status.trim()
      ? frontMatter.status.trim()
      : sourceType === "draft" || sourceType === "import"
        ? "draft"
        : "canonical";
  const confidence =
    Number(frontMatter.confidence ?? (sourceType === "import" ? 0.65 : 0.8)) || 0.8;
  return {
    docId,
    app,
    domain,
    moduleIds,
    path: normalizeSlashes(brainRelativePath),
    title,
    status,
    confidence,
    headings,
    facts,
    entities,
    relations,
    aliases,
    rules,
    scenarios: [],
    summary,
    provenance: {
      sourceType,
      hash: sha256File(filePath),
      charRanges: [{ start: 0, end: raw.length }],
    },
  };
}

function promotedSnapshotDate(brainRelativePath) {
  const rel = normalizeSlashes(brainRelativePath);
  const match = rel.match(/^runtime\/learning\/promoted\/(\d{4}-\d{2}-\d{2})\//);
  return match ? match[1] : "";
}

function isPromotedWebDoc(doc) {
  const rel = normalizeSlashes(doc?.path || "");
  return doc?.provenance?.sourceType === "web" && rel.startsWith("runtime/learning/promoted/");
}

function shouldPreferPromotedWebDuplicate(existingDoc, nextDoc) {
  const existingDate = promotedSnapshotDate(existingDoc.path);
  const nextDate = promotedSnapshotDate(nextDoc.path);
  if (existingDate && nextDate && existingDate !== nextDate) {
    return nextDate > existingDate;
  }
  return normalizeSlashes(nextDoc.path).localeCompare(normalizeSlashes(existingDoc.path)) > 0;
}

function dedupeNormalizedDocs(normalizedDocs) {
  const deduped = [];
  const docIndexById = new Map();
  const warnings = [];
  for (const doc of normalizedDocs) {
    const existingIndex = docIndexById.get(doc.docId);
    if (existingIndex === undefined) {
      docIndexById.set(doc.docId, deduped.length);
      deduped.push(doc);
      continue;
    }
    const existingDoc = deduped[existingIndex];
    if (!isPromotedWebDoc(existingDoc) || !isPromotedWebDoc(doc)) {
      deduped.push(doc);
      continue;
    }
    const preferNext = shouldPreferPromotedWebDuplicate(existingDoc, doc);
    const kept = preferNext ? doc : existingDoc;
    const dropped = preferNext ? existingDoc : doc;
    deduped[existingIndex] = kept;
    warnings.push(
      `deduped promoted web docId ${doc.docId}: kept ${kept.path}, dropped ${dropped.path}`
    );
  }
  return {
    docs: deduped.sort((left, right) => left.path.localeCompare(right.path)),
    warnings,
  };
}

function isImportAnchorDoc(doc) {
  const rel = normalizeSlashes(doc?.path || "");
  return (
    doc?.domain === "pipeline" &&
    String(doc?.docId || "").startsWith("hz.pipeline.imports.") &&
    rel.startsWith("imports/base-knowledge/_catalog/")
  );
}

function isImportAnchorChunk(chunk) {
  return (
    String(chunk?.docId || "").startsWith("hz.pipeline.imports.") &&
    normalizeSlashes(chunk?.path || "").startsWith("imports/base-knowledge/_catalog/")
  );
}

function readLegacyChunksForSync() {
  if (!fs.existsSync(legacyChunksPath)) return [];
  return fs.readFileSync(legacyChunksPath, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

function buildLegacyImportAnchorChunk(doc) {
  const fullPath = path.join(brainRoot, doc.path);
  const raw = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf8") : "";
  return {
    chunkId: `hz.chunk.${doc.docId}.0`,
    docId: doc.docId,
    path: doc.path,
    heading: doc.title,
    charStart: 0,
    charEnd: raw.length,
    domain: doc.domain,
    app: doc.app,
    status: doc.status,
    confidence: doc.confidence,
    provenance: {
      sourceType: doc.provenance?.sourceType || "import",
      sourceId: `brain/${doc.path}`,
      ingestedAt: new Date().toISOString(),
      verifiedBy: "pack-import",
    },
  };
}

function syncLegacyImportAnchorChunks(normalizedDocs) {
  const existingChunks = readLegacyChunksForSync();
  const preservedChunks = existingChunks.filter((chunk) => !isImportAnchorChunk(chunk));
  const importAnchorChunks = normalizedDocs
    .filter((doc) => isImportAnchorDoc(doc))
    .sort((left, right) => left.docId.localeCompare(right.docId))
    .map((doc) => buildLegacyImportAnchorChunk(doc));
  const mergedChunks = [...preservedChunks, ...importAnchorChunks];
  const lines = mergedChunks.map((chunk) => JSON.stringify(chunk)).join("\n");
  fs.writeFileSync(legacyChunksPath, lines ? `${lines}\n` : "", "utf8");
}

function walkScenarioSources(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkScenarioSources(full));
    else if (entry.name.endsWith(".jsonl")) out.push(full);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function loadScenarioRows() {
  const files = walkScenarioSources(path.join(assistantScenariosRoot, "sources"));
  const rows = [];
  for (const file of files) {
    const brainRelativePath = relPath(brainRoot, file);
    const lines = fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      let row;
      try {
        row = JSON.parse(raw);
      } catch (_error) {
        continue;
      }
      const triggers = Array.isArray(row.triggers)
        ? row.triggers.map((trigger) => String(trigger).trim().toLowerCase()).filter(Boolean)
        : [];
      if (!row.id || !row.response || !triggers.length) continue;
      rows.push({
        scenarioId: String(row.id),
        rowId: String(row.id),
        app: "assistant",
        domain: "assistant",
        priority: Number(row.priority) || 0,
        triggers,
        excludeWhen: Array.isArray(row.excludeWhen)
          ? row.excludeWhen.map((entry) => String(entry).trim().toLowerCase()).filter(Boolean)
          : [],
        response: String(row.response).trim(),
        path: normalizeSlashes(brainRelativePath),
        sourceType: "canonical",
        hash: sha256Text(raw),
      });
    }
  }
  return rows;
}

function loadLegacySynonyms() {
  const file = path.join(brainRoot, "apps", "assistant", "knowledge", "synonyms.json");
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function importFamilyForDoc(docId, brainRelativePath) {
  const doc = String(docId || "");
  const rel = normalizeSlashes(brainRelativePath || "");
  if (!rel.startsWith("imports/")) return null;
  if (rel.startsWith("imports/live/")) return "live";
  if (rel.startsWith("imports/bulk/")) return "bulk";
  if (rel.startsWith("imports/repo-knowledge-pack/")) return "repo_knowledge_pack";
  if (doc === "hz.pipeline.imports.megapack-all-recommended") return "megapack";
  if (doc === "hz.pipeline.imports.knowledge-pack-v1" || doc === "hz.pipeline.imports.knowledge-pack-v2") {
    return "knowledge_v1_v2";
  }
  return "individual_packs";
}

function profileAllowsSource(profile, item) {
  if (!profile.includeDomains.includes(String(item.domain))) return false;
  if (profile.allowedApps.length && !profile.allowedApps.includes(String(item.app))) return false;
  if ((Number(item.confidence) || 0) < profile.minConfidence) return false;
  const sourceType = String(item.sourceType || item.provenance?.sourceType || "");
  if (profile.includeSourceTypes.length && !profile.includeSourceTypes.includes(sourceType)) return false;
  if (sourceType === "memory" && !profile.allowMemory) return false;
  if (sourceType === "draft" && !profile.allowDraft) return false;
  if (sourceType === "import") {
    if (!profile.allowImports) return false;
    const family = item.importFamily || importFamilyForDoc(item.docId, item.path);
    if (profile.importFamilies.length && family && !profile.importFamilies.includes(family)) return false;
    if (family === "live" || family === "bulk") {
      return profile.importFamilies.includes(family);
    }
    if (profile.importLibrary === "none") return false;
    if (profile.importLibrary === "megapack") return family === "megapack";
    if (profile.importLibrary === "individual_packs") return family === "individual_packs";
    if (profile.importLibrary === "knowledge_v1_v2") return family === "knowledge_v1_v2";
    if (profile.importLibrary === "repo_knowledge_pack") return family === "repo_knowledge_pack";
  }
  return true;
}

function buildSemanticMap(normalizedDocs, scenarioRows) {
  const aliasToCanonical = {};
  const synonymToCanonical = {};
  const termToDocIds = {};
  const docTerms = {};
  for (const doc of normalizedDocs) {
    const canonical = doc.title.toLowerCase();
    const terms = new Set(
      tokenizeForRetrieval(`${doc.title} ${doc.summary.short} ${doc.summary.medium}`)
    );
    for (const alias of doc.aliases) {
      if (!aliasToCanonical[alias.alias]) aliasToCanonical[alias.alias] = [];
      aliasToCanonical[alias.alias].push(canonical);
      terms.add(alias.alias);
    }
    for (const term of terms) {
      if (!termToDocIds[term]) termToDocIds[term] = [];
      termToDocIds[term].push(doc.docId);
    }
    docTerms[doc.docId] = [...terms].sort(compareStrings);
  }
  for (const [key, value] of Object.entries(loadLegacySynonyms())) {
    const alias = String(key).toLowerCase().trim();
    const canonical = String(value).toLowerCase().trim();
    if (!alias || !canonical) continue;
    if (!synonymToCanonical[alias]) synonymToCanonical[alias] = [];
    synonymToCanonical[alias].push(canonical);
  }
  for (const row of scenarioRows) {
    for (const trigger of row.triggers) {
      const terms = tokenizeForRetrieval(trigger);
      for (const term of terms) {
        if (!termToDocIds[term]) termToDocIds[term] = [];
        termToDocIds[term].push(row.rowId);
      }
    }
  }
  return {
    artifactType: "semantic-map",
    schemaVersion: BRAIN_RUNTIME_SCHEMA_VERSION,
    buildVersion: BRAIN_RUNTIME_BUILD_VERSION,
    builtAt: new Date().toISOString(),
    counts: {
      aliasCount: Object.keys(aliasToCanonical).length,
      synonymCount: Object.keys(synonymToCanonical).length,
      termCount: Object.keys(termToDocIds).length,
    },
    aliasToCanonical: Object.fromEntries(
      Object.entries(aliasToCanonical).map(([key, value]) => [key, uniqueSorted(value)])
    ),
    synonymToCanonical: Object.fromEntries(
      Object.entries(synonymToCanonical).map(([key, value]) => [key, uniqueSorted(value)])
    ),
    termToDocIds: Object.fromEntries(
      Object.entries(termToDocIds).map(([key, value]) => [key, uniqueSorted(value)])
    ),
    docTerms,
  };
}

function buildCompactFacts(normalizedDocs) {
  const facts = [];
  for (const doc of normalizedDocs) {
    for (const fact of doc.facts.slice(0, 8)) {
      facts.push({
        factId: fact.factId,
        docId: doc.docId,
        app: doc.app,
        domain: doc.domain,
        sourceType: doc.provenance.sourceType,
        path: doc.path,
        fact: fact.text,
        summary: doc.summary.short,
        tokens: uniqueSorted(
          tokenizeForRetrieval(`${doc.title} ${fact.text} ${doc.summary.short}`).slice(0, 24)
        ),
        provenance: {
          sourceType: doc.provenance.sourceType,
          hash: doc.provenance.hash,
          charStart: fact.charStart,
          charEnd: fact.charEnd,
        },
      });
    }
  }
  return {
    artifactType: "compact-facts",
    schemaVersion: BRAIN_RUNTIME_SCHEMA_VERSION,
    buildVersion: BRAIN_RUNTIME_BUILD_VERSION,
    builtAt: new Date().toISOString(),
    counts: { factCount: facts.length },
    facts,
  };
}

function buildScenarioLookup(scenarioRows) {
  const entries = [];
  const responseByRowId = {};
  const excludeByRowId = {};
  const aliasToRowIds = {};
  for (const row of scenarioRows) {
    responseByRowId[row.rowId] = row.response;
    if (row.excludeWhen.length) excludeByRowId[row.rowId] = row.excludeWhen;
    for (const trigger of row.triggers) {
      entries.push({
        trigger,
        rowId: row.rowId,
        priority: row.priority,
        app: row.app,
        domain: row.domain,
      });
      const triggerTerms = tokenizeForRetrieval(trigger);
      for (const term of triggerTerms) {
        if (!aliasToRowIds[term]) aliasToRowIds[term] = [];
        aliasToRowIds[term].push(row.rowId);
      }
    }
  }
  entries.sort((a, b) => {
    const lenDiff = b.trigger.length - a.trigger.length;
    if (lenDiff !== 0) return lenDiff;
    const prioDiff = b.priority - a.priority;
    if (prioDiff !== 0) return prioDiff;
    return compareStrings(a.rowId, b.rowId);
  });
  return {
    artifactType: "scenario-lookup",
    schemaVersion: BRAIN_RUNTIME_SCHEMA_VERSION,
    buildVersion: BRAIN_RUNTIME_BUILD_VERSION,
    builtAt: new Date().toISOString(),
    counts: { entryCount: entries.length, rowCount: scenarioRows.length },
    entries,
    responseByRowId,
    excludeByRowId,
    aliasToRowIds: Object.fromEntries(
      Object.entries(aliasToRowIds).map(([key, value]) => [key, uniqueSorted(value)])
    ),
  };
}

function buildResponsePriors(normalizedDocs, scenarioRows) {
  return {
    artifactType: "response-priors",
    schemaVersion: BRAIN_RUNTIME_SCHEMA_VERSION,
    buildVersion: BRAIN_RUNTIME_BUILD_VERSION,
    builtAt: new Date().toISOString(),
    counts: { docs: normalizedDocs.length, scenarios: scenarioRows.length },
    domainWeights: Object.fromEntries(
      uniqueSorted(normalizedDocs.map((doc) => doc.domain)).map((domain) => [
        domain,
        normalizedDocs.filter((doc) => doc.domain === domain).length,
      ])
    ),
    topScenarioRows: scenarioRows
      .slice()
      .sort((a, b) => b.priority - a.priority || compareStrings(a.rowId, b.rowId))
      .slice(0, 48)
      .map((row) => ({
        rowId: row.rowId,
        priority: row.priority,
        app: row.app,
        domain: row.domain,
      })),
  };
}

function buildPromptPack(normalizedDocs) {
  const docs = normalizedDocs.map((doc) => ({
    docId: doc.docId,
    app: doc.app,
    domain: doc.domain,
    sourceType: doc.provenance.sourceType,
    title: doc.title,
    summary: doc.summary.short,
    facts: doc.facts.slice(0, 2).map((fact) => fact.text),
  }));
  return {
    artifactType: "prompt-pack",
    schemaVersion: BRAIN_RUNTIME_SCHEMA_VERSION,
    buildVersion: BRAIN_RUNTIME_BUILD_VERSION,
    builtAt: new Date().toISOString(),
    counts: { docCount: docs.length },
    docs,
  };
}

function buildProfileSummaryPack(profileName, normalizedDocs, retrievalMap) {
  const docs = normalizedDocs
    .filter((doc) => retrievalMap.allowedDocIds.includes(doc.docId))
    .map((doc) => ({
      docId: doc.docId,
      app: doc.app,
      domain: doc.domain,
      sourceType: doc.provenance.sourceType,
      title: doc.title,
      summary: doc.summary.short,
      detail: doc.summary.medium,
      tokens: doc.summary.tokens,
      supportingChunkIds: retrievalMap.chunkIdsByDocId[doc.docId] || [],
      provenance: {
        path: doc.path,
        hash: doc.provenance.hash,
      },
    }))
    .sort((a, b) => compareStrings(a.docId, b.docId));
  return {
    artifactType: "summary-pack",
    schemaVersion: BRAIN_RUNTIME_SCHEMA_VERSION,
    buildVersion: BRAIN_RUNTIME_BUILD_VERSION,
    builtAt: new Date().toISOString(),
    profile: profileName,
    counts: { docCount: docs.length },
    docs,
  };
}

function buildBm25Payload(profileName, chunks) {
  const chunkOrder = [];
  const chunkConfidences = [];
  const tfs = [];
  const df = {};
  const inverted = {};
  for (const chunk of chunks) {
    const text = loadChunkText(chunk);
    if (!text || text.length < 10) continue;
    const idx = chunkOrder.length;
    chunkOrder.push(chunk.chunkId);
    chunkConfidences.push(Number(chunk.confidence) || 0.5);
    const terms = tokenizeForRetrieval(text.slice(0, 120_000));
    const tf = {};
    for (const term of terms) {
      tf[term] = (tf[term] || 0) + 1;
    }
    tfs.push(tf);
    for (const term of Object.keys(tf)) {
      df[term] = (df[term] || 0) + 1;
      if (!inverted[term]) inverted[term] = [];
      inverted[term].push(idx);
    }
  }
  const N = chunkOrder.length;
  let totalDocLength = 0;
  for (const tf of tfs) {
    totalDocLength += Object.values(tf).reduce((sum, value) => sum + Number(value || 0), 0) || 1;
  }
  const avgdl = N ? totalDocLength / N : 1;
  return {
    artifactType: "bm25",
    schemaVersion: BRAIN_RUNTIME_SCHEMA_VERSION,
    buildVersion: BRAIN_RUNTIME_BUILD_VERSION,
    builtAt: new Date().toISOString(),
    profile: profileName,
    counts: { chunkCount: chunkOrder.length, termCount: Object.keys(df).length },
    version: 1,
    N,
    avgdl,
    chunkOrder,
    chunkConfidences,
    df,
    inverted,
    tfs,
  };
}

function buildProfileArtifacts(
  profileName,
  normalizedDocs,
  compactFacts,
  semanticMap,
  scenarioLookup,
  chunks
) {
  const profiles = loadProfiles();
  const rawProfile = profiles?.profiles?.[profileName];
  const profile = normalizeProfileDefinition(profileName, rawProfile);
  const allowedDocs = normalizedDocs.filter((doc) =>
    profileAllowsSource(profile, {
      ...doc,
      sourceType: doc.provenance.sourceType,
      importFamily: importFamilyForDoc(doc.docId, doc.path),
    })
  );
  const allowedDocIds = allowedDocs.map((doc) => doc.docId);
  const chunkIdsByDocId = {};
  const allowedChunks = [];
  for (const chunk of chunks) {
    const sourceType = String(chunk?.provenance?.sourceType || inferSourceType(chunk.path));
    const chunkItem = {
      ...chunk,
      sourceType,
      importFamily: importFamilyForDoc(chunk.docId, chunk.path),
    };
    if (!profileAllowsSource(profile, chunkItem)) continue;
    allowedChunks.push(chunk);
    if (!chunkIdsByDocId[chunk.docId]) chunkIdsByDocId[chunk.docId] = [];
    chunkIdsByDocId[chunk.docId].push(chunk.chunkId);
  }
  const compactFactIds = compactFacts.facts
    .filter((fact) =>
      profileAllowsSource(profile, {
        ...fact,
        docId: fact.docId,
        sourceType: fact.sourceType,
        confidence: 1,
        importFamily: importFamilyForDoc(fact.docId, fact.path),
      })
    )
    .map((fact) => fact.factId);
  const allowedSemanticTerms = uniqueSorted(
    Object.keys(semanticMap.termToDocIds || {}).filter((term) =>
      semanticMap.termToDocIds[term].some((docId) => allowedDocIds.includes(docId))
    )
  );
  const scenarioRowIds = uniqueSorted(
    (scenarioLookup.entries || [])
      .filter((entry) =>
        profileAllowsSource(profile, {
          app: entry.app,
          domain: entry.domain,
          confidence: 1,
          sourceType: "canonical",
        })
      )
      .map((entry) => entry.rowId)
  );
  const retrievalMap = {
    artifactType: "retrieval-map",
    schemaVersion: BRAIN_RUNTIME_SCHEMA_VERSION,
    buildVersion: BRAIN_RUNTIME_BUILD_VERSION,
    builtAt: new Date().toISOString(),
    profile: profileName,
    counts: {
      docCount: allowedDocIds.length,
      chunkCount: allowedChunks.length,
      compactFactCount: compactFactIds.length,
      scenarioCount: scenarioRowIds.length,
      semanticTermCount: allowedSemanticTerms.length,
    },
    includeDomains: profile.includeDomains,
    allowedApps: profile.allowedApps,
    sourceTypes: uniqueSorted(allowedDocs.map((doc) => doc.provenance.sourceType)),
    allowedDocIds,
    allowedChunkIds: allowedChunks.map((chunk) => chunk.chunkId),
    chunkIdsByDocId,
    compactFactIds,
    allowedSemanticTerms,
    scenarioRowIds,
    preferredArtifactTypes: profile.preferredArtifactTypes,
    summaryFirst: profile.summaryFirst,
    allowCompactFacts: profile.allowCompactFacts,
    allowSummaries: profile.allowSummaries,
  };
  const summaryPack = buildProfileSummaryPack(profileName, normalizedDocs, retrievalMap);
  const scenarioMap = {
    artifactType: "scenario-lookup",
    schemaVersion: BRAIN_RUNTIME_SCHEMA_VERSION,
    buildVersion: BRAIN_RUNTIME_BUILD_VERSION,
    builtAt: new Date().toISOString(),
    profile: profileName,
    counts: { rowCount: scenarioRowIds.length },
    rowIds: scenarioRowIds,
    entries: (scenarioLookup.entries || []).filter((entry) => scenarioRowIds.includes(entry.rowId)),
    responseByRowId: Object.fromEntries(
      Object.entries(scenarioLookup.responseByRowId || {}).filter(([rowId]) => scenarioRowIds.includes(rowId))
    ),
    excludeByRowId: Object.fromEntries(
      Object.entries(scenarioLookup.excludeByRowId || {}).filter(([rowId]) => scenarioRowIds.includes(rowId))
    ),
  };
  const bm25 = buildBm25Payload(profileName, allowedChunks);
  return {
    profile,
    retrievalMap,
    summaryPack,
    scenarioMap,
    bm25,
  };
}

function bucketDocsByOwner(normalizedDocs) {
  const buckets = new Map();
  for (const doc of normalizedDocs) {
    const owner = SURFACE_IDS.has(doc.app) ? doc.app : "__global__";
    if (!buckets.has(owner)) buckets.set(owner, []);
    buckets.get(owner).push(doc);
  }
  return buckets;
}

function buildPerOwnerArtifacts(owner, docs, scenarioRows, semanticMap, compactFacts, responsePriors, promptPack) {
  const ownerFacts = compactFacts.facts.filter((fact) => fact.app === owner);
  const ownerEntries = (scenarioRows || []).filter((row) => row.app === owner);
  const ownerTerms = Object.fromEntries(
    Object.entries(semanticMap.termToDocIds || {}).filter(([, docIds]) =>
      docIds.some((docId) => docs.some((doc) => doc.docId === docId))
    )
  );
  return {
    normalized: {
      entities: docs.flatMap((doc) => doc.entities),
      relations: docs.flatMap((doc) => doc.relations),
      rules: docs.flatMap((doc) => doc.rules),
      glossary: docs.flatMap((doc) => doc.aliases),
      scenarios: ownerEntries,
      aliases: docs.flatMap((doc) => doc.aliases),
      summaries: docs.map((doc) => ({
        docId: doc.docId,
        title: doc.title,
        summary: doc.summary.short,
        detail: doc.summary.medium,
      })),
    },
    compressed: {
      compactFacts: {
        ...compactFacts,
        counts: { factCount: ownerFacts.length },
        facts: ownerFacts,
      },
      semanticMap: {
        ...semanticMap,
        counts: { termCount: Object.keys(ownerTerms).length },
        termToDocIds: ownerTerms,
      },
      scenarioLookup: {
        artifactType: "scenario-lookup",
        schemaVersion: BRAIN_RUNTIME_SCHEMA_VERSION,
        buildVersion: BRAIN_RUNTIME_BUILD_VERSION,
        builtAt: new Date().toISOString(),
        counts: { rowCount: ownerEntries.length },
        entries: ownerEntries,
      },
      responsePriors,
      promptPack: {
        ...promptPack,
        docs: promptPack.docs.filter((doc) => doc.app === owner),
        counts: { docCount: promptPack.docs.filter((doc) => doc.app === owner).length },
      },
    },
  };
}

function writeOwnerArtifacts(owner, docs, artifacts) {
  const ownerRoot =
    owner === "launcher"
      ? path.join(brainRoot, "launcher", "knowledge", "build")
      : owner === "__global__"
        ? path.join(retrievalIndexesRoot, "normalized")
        : path.join(brainRoot, "apps", owner, "knowledge", "build");
  const normalizedRoot = owner === "__global__" ? ownerRoot : path.join(ownerRoot, "normalized");
  const compressedRoot = path.join(ownerRoot, "compressed");
  ensureDir(path.join(normalizedRoot, "docs"));
  for (const doc of docs) {
    writeJsonStable(path.join(normalizedRoot, "docs", `${doc.docId}.json`), doc);
  }
  if (owner !== "__global__") {
    writeJsonStable(path.join(normalizedRoot, "entities.json"), artifacts.normalized.entities);
    writeJsonStable(path.join(normalizedRoot, "relations.json"), artifacts.normalized.relations);
    writeJsonStable(path.join(normalizedRoot, "rules.json"), artifacts.normalized.rules);
    writeJsonStable(path.join(normalizedRoot, "glossary.json"), artifacts.normalized.glossary);
    writeJsonStable(path.join(normalizedRoot, "scenarios.json"), artifacts.normalized.scenarios);
    writeJsonStable(path.join(normalizedRoot, "aliases.json"), artifacts.normalized.aliases);
    writeJsonStable(path.join(normalizedRoot, "summaries.json"), artifacts.normalized.summaries);
    ensureDir(compressedRoot);
    writeJsonStable(path.join(compressedRoot, "compact-facts.json"), artifacts.compressed.compactFacts);
    writeJsonStable(path.join(compressedRoot, "semantic-map.json"), artifacts.compressed.semanticMap);
    writeJsonStable(path.join(compressedRoot, "scenario-lookup.json"), artifacts.compressed.scenarioLookup);
    writeJsonStable(path.join(compressedRoot, "response-priors.json"), artifacts.compressed.responsePriors);
    writeJsonStable(path.join(compressedRoot, "prompt-pack.json"), artifacts.compressed.promptPack);
  }
}

function buildDiagnostics(normalizedDocs, scenarioRows, profileArtifacts, baseWarnings = []) {
  const warnings = [...baseWarnings];
  const errors = [];
  const docIds = new Set();
  for (const doc of normalizedDocs) {
    const docErrors = validateNormalizedDoc(doc);
    for (const error of docErrors) errors.push(error);
    if (docIds.has(doc.docId)) errors.push(`duplicate docId: ${doc.docId}`);
    docIds.add(doc.docId);
  }
  const chunkIds = new Set();
  for (const chunk of loadChunksJsonl()) {
    if (chunkIds.has(chunk.chunkId)) errors.push(`duplicate chunkId: ${chunk.chunkId}`);
    chunkIds.add(chunk.chunkId);
    const full = path.join(brainRoot, chunk.path);
    if (!fs.existsSync(full)) errors.push(`missing chunk file: ${chunk.path}`);
  }
  for (const row of scenarioRows) {
    if (!row.triggers.length) warnings.push(`scenario ${row.rowId} has no triggers`);
  }
  for (const artifact of Object.values(profileArtifacts)) {
    errors.push(...validateArtifactEnvelope(artifact.retrievalMap, "retrieval-map"));
    errors.push(...validateArtifactEnvelope(artifact.summaryPack, "summary-pack"));
    errors.push(...validateArtifactEnvelope(artifact.scenarioMap, "scenario-lookup"));
    errors.push(...validateArtifactEnvelope(artifact.bm25, "bm25"));
    if (!artifact.profile.allowDraft) {
      const leakedDraft = artifact.retrievalMap.allowedDocIds.find((docId) =>
        normalizedDocs.some(
          (doc) => doc.docId === docId && doc.provenance.sourceType === "draft"
        )
      );
      if (leakedDraft) errors.push(`draft exposure in profile ${artifact.profile.name}: ${leakedDraft}`);
    }
    if (!artifact.profile.allowMemory) {
      const leakedMemory = artifact.retrievalMap.allowedDocIds.find((docId) =>
        normalizedDocs.some(
          (doc) => doc.docId === docId && doc.provenance.sourceType === "memory"
        )
      );
      if (leakedMemory) errors.push(`memory contamination in profile ${artifact.profile.name}: ${leakedMemory}`);
    }
  }
  return {
    artifactType: "runtime-diagnostics",
    schemaVersion: BRAIN_RUNTIME_SCHEMA_VERSION,
    buildVersion: BRAIN_RUNTIME_BUILD_VERSION,
    builtAt: new Date().toISOString(),
    counts: {
      docCount: normalizedDocs.length,
      scenarioCount: scenarioRows.length,
      errorCount: errors.length,
      warningCount: warnings.length,
    },
    warnings,
    errors,
  };
}

export function buildBrainIrRuntime(opts = {}) {
  const logger = opts.logger || console;
  migrateLegacyBrainRuntimeData();
  generateRuntimeDigestDocs();
  const manifest = loadBrainManifestConfig();
  const appRegistry = loadAppRegistryConfig();
  const moduleRegistry = loadModuleRegistryConfig();
  const allProfiles = loadProfiles();
  const profileNames =
    Array.isArray(opts.profileNames) && opts.profileNames.length
      ? opts.profileNames
      : Object.keys(allProfiles.profiles || {});
  const discoveryRoots = resolveDiscoveryRoots(manifest?.config || manifest);
  const sourceFiles = discoverCanonicalSourceFiles(discoveryRoots);
  const rawNormalizedDocs = sourceFiles.map((filePath) => parseDocumentFile(filePath));
  const dedupedDocs = dedupeNormalizedDocs(rawNormalizedDocs);
  const normalizedDocs = dedupedDocs.docs;
  syncLegacyImportAnchorChunks(normalizedDocs);
  clearBrainRetrievalCache();
  const scenarioRows = loadScenarioRows();
  const semanticMap = buildSemanticMap(normalizedDocs, scenarioRows);
  const compactFacts = buildCompactFacts(normalizedDocs);
  const scenarioLookup = buildScenarioLookup(scenarioRows);
  const responsePriors = buildResponsePriors(normalizedDocs, scenarioRows);
  const promptPack = buildPromptPack(normalizedDocs);
  const chunks = loadChunksJsonl();

  resetGeneratedDir(path.join(retrievalIndexesRoot, "normalized"));
  resetGeneratedDir(path.join(retrievalIndexesRoot, "profiles"));
  for (const owner of SURFACE_IDS) {
    const ownerRoot =
      owner === "launcher"
        ? path.join(brainRoot, "launcher", "knowledge", "build")
        : path.join(brainRoot, "apps", owner, "knowledge", "build");
    resetGeneratedDir(path.join(ownerRoot, "normalized"));
    resetGeneratedDir(path.join(ownerRoot, "compressed"));
  }

  const profileArtifacts = {};
  for (const profileName of profileNames) {
    profileArtifacts[profileName] = buildProfileArtifacts(
      profileName,
      normalizedDocs,
      compactFacts,
      semanticMap,
      scenarioLookup,
      chunks
    );
  }
  const diagnostics = buildDiagnostics(
    normalizedDocs,
    scenarioRows,
    profileArtifacts,
    dedupedDocs.warnings
  );

  ensureDir(path.join(retrievalIndexesRoot, "normalized", "docs"));
  for (const doc of normalizedDocs) {
    writeJsonStable(path.join(retrievalIndexesRoot, "normalized", "docs", `${doc.docId}.json`), doc);
  }
  writeJsonStable(path.join(retrievalIndexesRoot, "aliases.json"), {
    artifactType: "aliases",
    schemaVersion: BRAIN_RUNTIME_SCHEMA_VERSION,
    buildVersion: BRAIN_RUNTIME_BUILD_VERSION,
    builtAt: new Date().toISOString(),
    counts: { aliasCount: normalizedDocs.reduce((sum, doc) => sum + doc.aliases.length, 0) },
    aliases: normalizedDocs.flatMap((doc) =>
      doc.aliases.map((alias) => ({
        ...alias,
        docId: doc.docId,
        app: doc.app,
        domain: doc.domain,
      }))
    ),
  });
  writeJsonStable(path.join(retrievalIndexesRoot, "synonyms.json"), {
    artifactType: "synonyms",
    schemaVersion: BRAIN_RUNTIME_SCHEMA_VERSION,
    buildVersion: BRAIN_RUNTIME_BUILD_VERSION,
    builtAt: new Date().toISOString(),
    counts: { synonymCount: Object.keys(loadLegacySynonyms()).length },
    synonyms: loadLegacySynonyms(),
  });
  writeJsonStable(path.join(retrievalIndexesRoot, "semantic-map.json"), semanticMap);
  writeJsonStable(path.join(retrievalIndexesRoot, "compact-facts.json"), compactFacts);
  writeJsonStable(path.join(retrievalIndexesRoot, "scenario-lookup.json"), scenarioLookup);
  writeJsonStable(path.join(retrievalIndexesRoot, "response-priors.json"), responsePriors);
  writeJsonStable(path.join(retrievalIndexesRoot, "prompt-pack.json"), promptPack);

  for (const [profileName, artifact] of Object.entries(profileArtifacts)) {
    const profileDir = path.join(retrievalIndexesRoot, "profiles", profileName);
    ensureDir(profileDir);
    writeJsonStable(path.join(profileDir, "retrieval-map.json"), artifact.retrievalMap);
    writeJsonStable(path.join(profileDir, "summary-pack.json"), artifact.summaryPack);
    writeJsonStable(path.join(profileDir, "scenario-map.json"), artifact.scenarioMap);
    writeJsonStable(path.join(profileDir, "bm25.json"), artifact.bm25);
    if (profileName === "repo-knowledge-pack") {
      writeJsonStable(path.join(legacyAssistantBuildRoot, "retrieval-bm25.json"), artifact.bm25);
    }
    if (profileName === "dev-all-drafts") {
      writeJsonStable(path.join(legacyAssistantBuildRoot, "retrieval-bm25-full.json"), artifact.bm25);
    }
  }

  writeJsonStable(path.join(assistantScenariosRoot, "build", "scenario-index.json"), scenarioLookup);
  writeJsonStable(path.join(retrievalIndexesRoot, "runtime-diagnostics.json"), diagnostics);

  const buckets = bucketDocsByOwner(normalizedDocs);
  for (const [owner, docs] of buckets.entries()) {
    const artifacts = buildPerOwnerArtifacts(
      owner,
      docs,
      scenarioRows,
      semanticMap,
      compactFacts,
      responsePriors,
      promptPack
    );
    writeOwnerArtifacts(owner, docs, artifacts);
  }

  const runtimeManifest = {
    artifactType: "runtime-manifest",
    schemaVersion: BRAIN_RUNTIME_SCHEMA_VERSION,
    buildVersion: BRAIN_RUNTIME_BUILD_VERSION,
    builtAt: new Date().toISOString(),
    counts: {
      docs: normalizedDocs.length,
      scenarios: scenarioRows.length,
      profiles: profileNames.length,
      sourceFiles: sourceFiles.length,
      chunks: chunks.length,
    },
    registry: {
      manifestVersion: manifest?.schemaVersion || null,
      appRegistryVersion: appRegistry?.version || null,
      moduleRegistryVersion: moduleRegistry?.version || null,
      profileVersion: allProfiles?.version || null,
    },
    sourceHashes: Object.fromEntries(
      sourceFiles.map((filePath) => [relPath(brainRoot, filePath), sha256File(filePath)])
    ),
    scenarioSourceHashes: Object.fromEntries(
      walkScenarioSources(path.join(assistantScenariosRoot, "sources")).map((filePath) => [
        relPath(brainRoot, filePath),
        sha256File(filePath),
      ])
    ),
    profiles: profileNames,
    diagnostics: {
      warnings: diagnostics.warnings.length,
      errors: diagnostics.errors.length,
    },
  };
  const runtimeManifestPath = path.join(retrievalIndexesRoot, "runtime-manifest.json");
  const previousRuntimeManifestPath = path.join(retrievalIndexesRoot, "runtime-manifest.previous.json");
  if (fs.existsSync(runtimeManifestPath)) {
    fs.copyFileSync(runtimeManifestPath, previousRuntimeManifestPath);
  }
  writeJsonStable(runtimeManifestPath, runtimeManifest);

  logger?.error?.(
    `[brain-ir] built ${normalizedDocs.length} normalized docs, ${scenarioRows.length} scenarios, ${profileNames.length} profiles`
  );

  return {
    normalizedDocs,
    scenarioRows,
    profileArtifacts,
    diagnostics,
    runtimeManifest,
  };
}

export function validateBrainIrRuntime() {
  const diagnosticsPath = path.join(retrievalIndexesRoot, "runtime-diagnostics.json");
  if (!fs.existsSync(diagnosticsPath)) {
    return {
      ok: false,
      errors: ["runtime diagnostics missing; run build-brain-ir first"],
      warnings: [],
    };
  }
  const diagnostics = JSON.parse(fs.readFileSync(diagnosticsPath, "utf8"));
  return {
    ok: !diagnostics.errors?.length,
    errors: diagnostics.errors || [],
    warnings: diagnostics.warnings || [],
    counts: diagnostics.counts || {},
  };
}

export function inspectNormalizedDoc(docId) {
  const file = path.join(retrievalIndexesRoot, "normalized", "docs", `${docId}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function inspectProfileArtifacts(profileName) {
  const profileDir = path.join(retrievalIndexesRoot, "profiles", profileName);
  if (!fs.existsSync(profileDir)) return null;
  return {
    retrievalMap: JSON.parse(fs.readFileSync(path.join(profileDir, "retrieval-map.json"), "utf8")),
    summaryPack: JSON.parse(fs.readFileSync(path.join(profileDir, "summary-pack.json"), "utf8")),
    scenarioMap: JSON.parse(fs.readFileSync(path.join(profileDir, "scenario-map.json"), "utf8")),
    bm25: JSON.parse(fs.readFileSync(path.join(profileDir, "bm25.json"), "utf8")),
  };
}
