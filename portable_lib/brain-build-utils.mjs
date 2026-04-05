import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const BRAIN_RUNTIME_BUILD_VERSION = "brain-ir-runtime-v1";
export const BRAIN_RUNTIME_SCHEMA_VERSION = "1.0";

export function sha256Text(text) {
  return crypto.createHash("sha256").update(String(text ?? ""), "utf8").digest("hex");
}

export function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function stableClone(value) {
  if (Array.isArray(value)) return value.map(stableClone);
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const key of Object.keys(value).sort()) {
    out[key] = stableClone(value[key]);
  }
  return out;
}

export function stableStringify(value) {
  return JSON.stringify(stableClone(value), null, 2);
}

export function writeJsonStable(filePath, value) {
  ensureDir(path.dirname(filePath));
  const next = `${stableStringify(value)}\n`;
  const prev = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
  if (prev === next) return { changed: false, bytes: Buffer.byteLength(next, "utf8") };
  fs.writeFileSync(filePath, next, "utf8");
  return { changed: true, bytes: Buffer.byteLength(next, "utf8") };
}

export function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function normalizeSlashes(value) {
  return String(value ?? "").replace(/\\/g, "/");
}

export function relPath(fromRoot, fullPath) {
  return normalizeSlashes(path.relative(fromRoot, fullPath));
}

export function deriveSlugFromPath(rel) {
  return normalizeSlashes(rel)
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9/.-]+/g, "-")
    .replace(/[\\/]+/g, ".")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export function compareStrings(a, b) {
  return String(a ?? "").localeCompare(String(b ?? ""));
}

export function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean).map((v) => String(v)))].sort(compareStrings);
}

export function sentenceFragments(text, limit = 6) {
  return String(text ?? "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, limit);
}

export function firstParagraph(text) {
  const blocks = String(text ?? "")
    .split(/\r?\n\r?\n/)
    .map((block) => block.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  for (const block of blocks) {
    if (block.startsWith("#")) continue;
    if (block.startsWith("```")) continue;
    return block;
  }
  return blocks[0] || "";
}
