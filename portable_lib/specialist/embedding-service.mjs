import crypto from "node:crypto";
import { readJsonFile, writeJsonFile } from "./paths.mjs";

function hashText(value) {
  return crypto.createHash("sha1").update(String(value || "")).digest("hex");
}

export class ScriptEmbeddingService {
  constructor({ paths, embeddingProvider }) {
    this.paths = paths;
    this.embeddingProvider = embeddingProvider;
    this.cache = readJsonFile(paths.embeddingsCacheFile, {
      version: 1,
      updatedAt: null,
      vectors: {},
      queryVectors: {},
    });
  }

  async warm() {
    return this.embeddingProvider.warm();
  }

  async embedScripts(scriptManifests) {
    const vectors = this.cache.vectors || {};
    let changed = 0;
    for (const manifest of scriptManifests) {
      const text = [
        manifest.id,
        manifest.title,
        manifest.description,
        manifest.category,
        ...(manifest.aliases || []),
        ...(manifest.tags || []),
        JSON.stringify(manifest.inputs || {}),
      ].join("\n");
      const digest = hashText(text);
      const prev = vectors[manifest.id];
      if (prev?.digest === digest && Array.isArray(prev?.vector)) continue;
      const vector = await this.embeddingProvider.embedText(text);
      vectors[manifest.id] = {
        digest,
        vector,
        updatedAt: new Date().toISOString(),
      };
      changed += 1;
    }
    this.cache.vectors = vectors;
    this.cache.updatedAt = new Date().toISOString();
    if (changed) writeJsonFile(this.paths.embeddingsCacheFile, this.cache);
    return { changed, total: scriptManifests.length };
  }

  async embedQuery(query) {
    const key = hashText(query);
    const queryVectors = this.cache.queryVectors || {};
    const hit = queryVectors[key];
    if (hit?.vector) return hit.vector;
    const vector = await this.embeddingProvider.embedText(query);
    queryVectors[key] = {
      vector,
      updatedAt: new Date().toISOString(),
    };
    const keys = Object.keys(queryVectors);
    if (keys.length > 80) {
      keys.sort((a, b) => (queryVectors[b].updatedAt || "").localeCompare(queryVectors[a].updatedAt || ""));
      for (const stale of keys.slice(80)) delete queryVectors[stale];
    }
    this.cache.queryVectors = queryVectors;
    writeJsonFile(this.paths.embeddingsCacheFile, this.cache);
    return vector;
  }

  getScriptVector(scriptId) {
    const vectors = this.cache.vectors || {};
    return vectors[scriptId]?.vector || null;
  }
}
