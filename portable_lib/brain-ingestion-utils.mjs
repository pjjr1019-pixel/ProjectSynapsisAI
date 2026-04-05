import fs from "node:fs";
import path from "node:path";
import { ensureDir, normalizeSlashes, readJsonIfExists, sha256Text, writeJsonStable } from "./brain-build-utils.mjs";
import { getBrainRuntimePaths } from "./brain-runtime-layer.mjs";
import { parseYaml } from "./brain-yaml.mjs";
import {
  exactContentHash,
  fetchRobotsAllowance,
  isNearDuplicate,
  resolveLicensePolicy,
  scanForPii,
} from "./brain-compliance.mjs";
import { buildExternalProvenance } from "./brain-provenance.mjs";

export function getIngestionPaths() {
  const brainRoot = getBrainRuntimePaths().brainRoot;
  const pipelineRoot = path.join(brainRoot, "pipeline");
  return {
    brainRoot,
    pipelineRoot,
    configPath: path.join(pipelineRoot, "ingestion-config.yaml"),
    rawRoot: path.join(pipelineRoot, "raw"),
    cleanRoot: path.join(pipelineRoot, "clean"),
    stateRoot: path.join(pipelineRoot, "state"),
    quarantineRoot: path.join(pipelineRoot, "quarantine"),
    ingestionStatePath: path.join(pipelineRoot, "state", "ingestion-state.jsonl"),
    importsLiveRoot: path.join(brainRoot, "imports", "live"),
    importsBulkRoot: path.join(brainRoot, "imports", "bulk"),
  };
}

export function readIngestionConfig() {
  const paths = getIngestionPaths();
  if (!fs.existsSync(paths.configPath)) return {};
  return parseYaml(fs.readFileSync(paths.configPath, "utf8"));
}

export function ensureIngestionDirs() {
  const paths = getIngestionPaths();
  for (const dir of [
    paths.rawRoot,
    paths.cleanRoot,
    paths.stateRoot,
    paths.quarantineRoot,
    paths.importsLiveRoot,
    paths.importsBulkRoot,
  ]) {
    ensureDir(dir);
  }
  return paths;
}

export function loadIngestionState() {
  const { ingestionStatePath } = getIngestionPaths();
  if (!fs.existsSync(ingestionStatePath)) return [];
  return fs
    .readFileSync(ingestionStatePath, "utf8")
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

export function saveIngestionState(records) {
  const { ingestionStatePath } = ensureIngestionDirs();
  const next = [...(Array.isArray(records) ? records : [])]
    .sort((a, b) => String(a.sourceId || "").localeCompare(String(b.sourceId || "")))
    .map((row) => JSON.stringify(row))
    .join("\n");
  fs.writeFileSync(ingestionStatePath, `${next}${next ? "\n" : ""}`, "utf8");
}

export function upsertIngestionState(record) {
  const current = loadIngestionState();
  const next = current.filter((row) => row.sourceId !== record.sourceId);
  next.push(record);
  saveIngestionState(next);
  return record;
}

export async function fetchTextWithCache(url, opts = {}) {
  const stateKey = String(opts.stateKey || url);
  const previous = loadIngestionState().find((row) => row.sourceId === stateKey) || {};
  const headers = {
    "User-Agent": "HorizonsAI-Ingestion/1.0",
    Accept: "application/json, text/plain, application/xml, text/xml, */*",
    ...(opts.headers || {}),
  };
  if (previous.etag) headers["If-None-Match"] = previous.etag;
  if (previous.lastModified) headers["If-Modified-Since"] = previous.lastModified;
  const response = await fetch(url, { headers });
  if (response.status === 304) {
    return {
      changed: false,
      skipped: true,
      body: "",
      fetchedAt: new Date().toISOString(),
      etag: previous.etag || "",
      lastModified: previous.lastModified || "",
      contentType: previous.contentType || "",
      contentHash: previous.contentHash || "",
    };
  }
  if (!response.ok) {
    throw new Error(`Fetch failed for ${url}: HTTP ${response.status}`);
  }
  const body = await response.text();
  return {
    changed: true,
    skipped: false,
    body,
    fetchedAt: new Date().toISOString(),
    etag: response.headers.get("etag") || "",
    lastModified: response.headers.get("last-modified") || "",
    contentType: response.headers.get("content-type") || "",
    contentHash: exactContentHash(body),
  };
}

export function writeRawArtifact(sourceGroup, sourceId, payload) {
  const { rawRoot } = ensureIngestionDirs();
  const filePath = path.join(rawRoot, sourceGroup, `${sourceId}.json`);
  writeJsonStable(filePath, payload);
  return filePath;
}

export function writeCleanArtifact(sourceGroup, sourceId, payload) {
  const { cleanRoot } = ensureIngestionDirs();
  const filePath = path.join(cleanRoot, sourceGroup, `${sourceId}.json`);
  writeJsonStable(filePath, payload);
  return filePath;
}

export function quarantineArtifact(sourceGroup, sourceId, payload) {
  const { quarantineRoot } = ensureIngestionDirs();
  const filePath = path.join(quarantineRoot, sourceGroup, `${sourceId}.json`);
  writeJsonStable(filePath, payload);
  return filePath;
}

export function importDestinationFor(layer, domain, sourceId) {
  const paths = ensureIngestionDirs();
  const base = layer === "bulk" ? paths.importsBulkRoot : paths.importsLiveRoot;
  return path.join(base, domain, `${sourceId}.json`);
}

export function loadSiblingImportedDocs(layer, domain) {
  const base = layer === "bulk" ? ensureIngestionDirs().importsBulkRoot : ensureIngestionDirs().importsLiveRoot;
  const dir = path.join(base, domain);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => readJsonIfExists(path.join(dir, name)))
    .filter(Boolean);
}

export function buildExternalDoc(input = {}) {
  const licensePolicy = resolveLicensePolicy(input.license);
  const pii = scanForPii(`${input.title || ""}\n${input.body || ""}\n${(input.facts || []).join("\n")}`);
  const provenance = buildExternalProvenance({
    ...input,
    license: input.license || licensePolicy.license,
    licenseRisk: input.licenseRisk || licensePolicy.risk,
    retrievalSafe:
      input.retrievalSafe === undefined ? licensePolicy.retrievalSafe : input.retrievalSafe,
    trainingSafe:
      input.trainingSafe === undefined ? licensePolicy.trainingSafe : input.trainingSafe,
    piiScan: input.piiScan || pii.status,
  });
  return {
    documentType: "external-source",
    title: String(input.title || "").trim(),
    summary: String(input.summary || "").trim(),
    body: String(input.body || "").trim(),
    app: String(input.app || input.domain || "assistant").trim(),
    domain: String(input.domain || input.app || "assistant").trim(),
    category: String(input.category || "external").trim(),
    tags: Array.isArray(input.tags) ? input.tags.map((entry) => String(entry)).filter(Boolean) : [],
    confidence: Number(input.confidence ?? 0.72) || 0.72,
    freshness: input.freshness ?? provenance.freshness,
    facts: Array.isArray(input.facts) ? input.facts.map((entry) => String(entry)).filter(Boolean) : [],
    provenance,
  };
}

export async function complianceGateForSource(input = {}) {
  const sourceUrl = String(input.sourceUrl || "").trim();
  if (input.kind === "rss" && sourceUrl) {
    const parsed = new URL(sourceUrl);
    const robots = await fetchRobotsAllowance(`${parsed.protocol}//${parsed.host}`, parsed.pathname || "/");
    if (!robots.allowed) {
      return { ok: false, reason: robots.reason || "robots_blocked" };
    }
  }
  const licensePolicy = resolveLicensePolicy(input.license);
  if (licensePolicy.risk === "red") {
    return { ok: false, reason: "license_blocked" };
  }
  const pii = scanForPii(`${input.title || ""}\n${input.body || ""}`);
  if (pii.status !== "clean") {
    return { ok: false, reason: "pii_flagged", pii };
  }
  return { ok: true, pii, licensePolicy };
}

export function promoteImportedDoc(doc) {
  const layer = String(doc?.provenance?.importLayer || "live");
  const domain = String(doc?.domain || doc?.app || "assistant");
  const sourceId =
    String(doc?.provenance?.contentHash || "").slice(0, 16) ||
    sha256Text(`${doc?.title || ""}\n${doc?.body || ""}`).slice(0, 16);
  const targetPath = importDestinationFor(layer, domain, sourceId);
  writeJsonStable(targetPath, doc);
  return targetPath;
}

export function isDuplicateAgainstImports(doc, opts = {}) {
  const siblings = loadSiblingImportedDocs(
    String(doc?.provenance?.importLayer || "live"),
    String(doc?.domain || doc?.app || "assistant")
  );
  for (const sibling of siblings) {
    if (String(sibling?.provenance?.contentHash || "") === String(doc?.provenance?.contentHash || "")) {
      return { duplicate: true, reason: "exact_hash", doc: sibling };
    }
    if (
      isNearDuplicate(
        `${sibling?.title || ""}\n${sibling?.summary || ""}\n${sibling?.body || ""}`,
        `${doc?.title || ""}\n${doc?.summary || ""}\n${doc?.body || ""}`,
        opts.threshold ?? 0.92
      )
    ) {
      return { duplicate: true, reason: "near_duplicate", doc: sibling };
    }
  }
  return { duplicate: false, reason: "" };
}

export function recordFetchedState(sourceId, fetchResult, extra = {}) {
  return upsertIngestionState({
    sourceId,
    fetchedAt: fetchResult.fetchedAt,
    etag: fetchResult.etag || "",
    lastModified: fetchResult.lastModified || "",
    contentType: fetchResult.contentType || "",
    contentHash: fetchResult.contentHash || "",
    ...extra,
  });
}

export function slugifySourceId(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function relBrainPath(fullPath) {
  return normalizeSlashes(path.relative(getBrainRuntimePaths().brainRoot, fullPath));
}
