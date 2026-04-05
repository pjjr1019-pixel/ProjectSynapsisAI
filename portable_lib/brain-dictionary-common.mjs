import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureDir, normalizeSlashes } from "./brain-build-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const brainRoot = path.join(repoRoot, "brain");

export const WEBSTER_1913_CORPUS_ID = "webster-1913";
export const WEBSTER_1913_TITLE = "Webster's Revised Unabridged Dictionary (1913)";
export const WEBSTER_1913_SOURCE_URL = "https://www.gutenberg.org/cache/epub/29765/pg29765.txt";
export const WEBSTER_1913_PROJECT_URL = "https://www.gutenberg.org/ebooks/29765";

export function getWebster1913Paths() {
  const importsRoot = path.join(brainRoot, "imports", "dictionaries", WEBSTER_1913_CORPUS_ID);
  const entriesRoot = path.join(importsRoot, "entries");
  const sourceRoot = path.join(importsRoot, "source");
  const retrievalRoot = path.join(
    brainRoot,
    "retrieval",
    "indexes",
    "dictionary",
    WEBSTER_1913_CORPUS_ID
  );
  return {
    repoRoot,
    brainRoot,
    importsRoot,
    entriesRoot,
    sourceRoot,
    retrievalRoot,
    readmeFile: path.join(importsRoot, "README.md"),
    sourceTextFile: path.join(sourceRoot, "pg29765.txt"),
    sourceManifestFile: path.join(sourceRoot, "source-manifest.json"),
    corpusManifestFile: path.join(importsRoot, "corpus-manifest.json"),
    corpusStatsFile: path.join(importsRoot, "corpus-stats.json"),
    headwordMapFile: path.join(retrievalRoot, "headword-map.json"),
    aliasMapFile: path.join(retrievalRoot, "alias-map.json"),
    bm25File: path.join(retrievalRoot, "bm25.json"),
    statsFile: path.join(retrievalRoot, "stats.json"),
    entryManifestFile: path.join(retrievalRoot, "entry-manifest.json"),
    artifactManifestFile: path.join(retrievalRoot, "manifest.json"),
  };
}

export function ensureWebster1913Layout() {
  const paths = getWebster1913Paths();
  ensureDir(paths.importsRoot);
  ensureDir(paths.entriesRoot);
  ensureDir(paths.sourceRoot);
  ensureDir(paths.retrievalRoot);
  return paths;
}

export function normalizeDictionaryTerm(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’'`]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function compactDictionaryTerm(value) {
  return normalizeDictionaryTerm(value).replace(/\s+/g, "");
}

export function dictionaryLookupKeys(value) {
  const normalized = normalizeDictionaryTerm(value);
  const compact = compactDictionaryTerm(value);
  return [...new Set([normalized, compact].filter(Boolean))];
}

export function slugifyDictionaryTerm(value) {
  const normalized = normalizeDictionaryTerm(value);
  return normalized
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

export function entryShardNameForTerm(value) {
  const normalized = normalizeDictionaryTerm(value);
  const first = normalized.charAt(0);
  if (!first) return "other";
  if (/[a-z]/.test(first)) return first;
  if (/[0-9]/.test(first)) return "0-9";
  return "other";
}

export function relFromBrain(fullPath) {
  return normalizeSlashes(path.relative(brainRoot, fullPath));
}

export function readJsonlFile(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

