import fs from "node:fs";
import path from "node:path";
import { getRepoRoot } from "./brain-retrieval.mjs";
import { normalizeSlashes } from "./brain-build-utils.mjs";
import { parseYaml } from "./brain-yaml.mjs";

const brainRoot = path.join(getRepoRoot(), "brain");

/** @type {Map<string, { mtime: number, data: any }>} */
const yamlCache = new Map();

function readYamlCached(filePath) {
  const st = fs.statSync(filePath);
  const hit = yamlCache.get(filePath);
  if (hit && hit.mtime === st.mtimeMs) return hit.data;
  const data = parseYaml(fs.readFileSync(filePath, "utf8"));
  yamlCache.set(filePath, { mtime: st.mtimeMs, data });
  return data;
}

export function getBrainRoot() {
  return brainRoot;
}

export function loadBrainManifestConfig() {
  return readYamlCached(path.join(brainRoot, "MANIFEST.yaml"));
}

export function loadAppRegistryConfig() {
  return readYamlCached(path.join(brainRoot, "registry", "apps.yaml"));
}

export function loadModuleRegistryConfig() {
  return readYamlCached(path.join(brainRoot, "registry", "modules.yaml"));
}

export function clearRegistryConfigCache() {
  yamlCache.clear();
}

function escapeRegExp(value) {
  return String(value).replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

export function globToRegExp(glob) {
  let src = normalizeSlashes(String(glob ?? "").trim());
  src = src.replace(/^\.\//, "");
  while (src.startsWith("../")) src = src.slice(3);
  let out = "^";
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    const next = src[i + 1];
    if (ch === "*" && next === "*") {
      out += ".*";
      i += 1;
      continue;
    }
    if (ch === "*") {
      out += "[^/]*";
      continue;
    }
    out += escapeRegExp(ch);
  }
  out += "$";
  return new RegExp(out);
}

export function registryPatternMatches(brainRelativePath, loadPattern) {
  const target = normalizeSlashes(brainRelativePath).replace(/^\/+/, "");
  const rx = globToRegExp(loadPattern);
  return rx.test(target);
}

export function resolveModuleIdsForBrainPath(brainRelativePath) {
  const modules = loadModuleRegistryConfig()?.modules || {};
  const hits = [];
  for (const [moduleId, mod] of Object.entries(modules)) {
    const loads = Array.isArray(mod?.loads) ? mod.loads : [];
    if (loads.some((pattern) => registryPatternMatches(brainRelativePath, pattern))) {
      hits.push(moduleId);
    }
  }
  return hits.sort((a, b) => a.localeCompare(b));
}
