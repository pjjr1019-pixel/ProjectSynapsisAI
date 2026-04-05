import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ensureManifestSchemaFile, normalizeScriptManifest } from "./manifest.mjs";
import { readJsonFile, writeJsonFile } from "./paths.mjs";

function hashValue(payload) {
  return crypto.createHash("sha1").update(JSON.stringify(payload)).digest("hex");
}

function safeReadJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function mapPolicyClass(tool) {
  const risk = String(tool?.risk_level || "low").toLowerCase();
  if (risk === "critical") return "destructive";
  if (risk === "high") return "system_sensitive";
  if (risk === "medium") return "state_modifying";
  return Array.isArray(tool?.side_effects) && tool.side_effects.length ? "local_safe" : "read_only_safe";
}

function detectScriptPath(paths, tool) {
  if (!tool?.entrypoint) return "";
  const abs = path.join(paths.scriptsRoot, String(tool.entrypoint));
  if (!fs.existsSync(abs)) return String(tool.entrypoint).replace(/\\/g, "/");
  return path.relative(paths.taskmanagerRoot, abs).replace(/\\/g, "/");
}

function listManifestFiles(root) {
  const out = [];
  if (!fs.existsSync(root)) return out;
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    for (const name of fs.readdirSync(current)) {
      const abs = path.join(current, name);
      const stat = fs.statSync(abs);
      if (stat.isDirectory()) {
        stack.push(abs);
        continue;
      }
      if (/\.manifest\.json$/i.test(name)) out.push(abs);
    }
  }
  return out;
}

export class ScriptIndexService {
  constructor({ paths }) {
    this.paths = paths;
    this.state = readJsonFile(paths.specialistStateFile, {
      version: 1,
      lastIndexHash: null,
      lastIndexedAt: null,
      manifestCount: 0,
      malformedManifestCount: 0,
      exactNameIndex: {},
      aliasIndex: {},
      categoryIndex: {},
      tagIndex: {},
      manifests: [],
    });
  }

  buildManifestFromTool(tool, aliasesByToolId) {
    const manifestInput = {
      id: tool.id,
      title: tool.title || tool.id,
      description: tool.description || "",
      aliases: aliasesByToolId[tool.id] || [],
      tags: Array.isArray(tool.tags) ? tool.tags : [],
      category: tool.category || "general",
      inputs: tool.inputs || {},
      outputs: tool.outputs || {},
      side_effects: Array.isArray(tool.side_effects) ? tool.side_effects : [],
      permissions_needed: Array.isArray(tool.dependencies) ? tool.dependencies : [],
      safe_to_autorun: tool.requires_confirmation !== true && String(tool.risk_level || "low") === "low",
      requires_confirmation: tool.requires_confirmation !== false,
      timeout_seconds: 30,
      platform: Array.isArray(tool.platform) ? tool.platform : ["windows"],
      path: detectScriptPath(this.paths, tool),
      version: "1.0.0",
      created_by: "registry-import",
      creation_source: "brain/scripts/registry/tools_index.json",
      last_verified: new Date().toISOString(),
      last_updated_time: new Date().toISOString(),
      argument_schema: tool.inputs || {},
      usage_examples: Array.isArray(tool.intent_examples) ? tool.intent_examples : [],
      safety_notes: Array.isArray(tool.avoid_if) ? tool.avoid_if : [],
      input_output_description: "",
      dependencies: Array.isArray(tool.dependencies) ? tool.dependencies : [],
      modifies_state: String(tool.risk_level || "low") === "medium" || String(tool.risk_level || "low") === "high" || String(tool.risk_level || "low") === "critical",
      read_only: !Array.isArray(tool.side_effects) || tool.side_effects.length === 0,
      reversible: tool.supports_dry_run === true,
      risk_level: tool.risk_level || "low",
      policy_class: mapPolicyClass(tool),
    };
    return normalizeScriptManifest(manifestInput, { path: manifestInput.path });
  }

  loadRegistryData() {
    ensureManifestSchemaFile(this.paths.scriptManifestSchemaFile);
    const tools = safeReadJson(this.paths.toolsIndexFile, []);
    const aliasMap = safeReadJson(this.paths.toolAliasesFile, {});
    const aliasesByToolId = {};
    for (const [phrase, toolId] of Object.entries(aliasMap || {})) {
      const key = String(toolId || "").trim();
      if (!key) continue;
      if (!aliasesByToolId[key]) aliasesByToolId[key] = [];
      aliasesByToolId[key].push(String(phrase).trim());
    }
    return { tools, aliasesByToolId };
  }

  buildIndexes(manifests) {
    const exactNameIndex = {};
    const aliasIndex = {};
    const categoryIndex = {};
    const tagIndex = {};

    for (const manifest of manifests) {
      exactNameIndex[String(manifest.id).toLowerCase()] = manifest.id;
      exactNameIndex[String(manifest.title).toLowerCase()] = manifest.id;
      for (const alias of manifest.aliases || []) {
        aliasIndex[String(alias).toLowerCase()] = manifest.id;
      }
      if (!categoryIndex[manifest.category]) categoryIndex[manifest.category] = [];
      categoryIndex[manifest.category].push(manifest.id);
      for (const tag of manifest.tags || []) {
        if (!tagIndex[tag]) tagIndex[tag] = [];
        tagIndex[tag].push(manifest.id);
      }
    }

    return {
      exactNameIndex,
      aliasIndex,
      categoryIndex,
      tagIndex,
    };
  }

  build() {
    const { tools, aliasesByToolId } = this.loadRegistryData();
    const manifestFingerprint = listManifestFiles(this.paths.newSkillsRoot).map((manifestFile) => {
      const stat = fs.statSync(manifestFile);
      return {
        file: path.relative(this.paths.taskmanagerRoot, manifestFile).replace(/\\/g, "/"),
        mtimeMs: stat.mtimeMs,
        size: stat.size,
      };
    });
    const sourceHash = hashValue({ tools, aliasesByToolId, manifestFingerprint });
    if (this.state.lastIndexHash === sourceHash && Array.isArray(this.state.manifests) && this.state.manifests.length) {
      return {
        changed: false,
        malformedManifestCount: this.state.malformedManifestCount || 0,
        manifestCount: this.state.manifestCount || this.state.manifests.length,
      };
    }

    const manifests = [];
    let malformed = 0;
    for (const tool of tools) {
      const { manifest, validation } = this.buildManifestFromTool(tool, aliasesByToolId);
      if (!validation.valid) malformed += 1;
      manifests.push(manifest);
    }

    for (const manifestFile of listManifestFiles(this.paths.newSkillsRoot)) {
      const rawManifest = safeReadJson(manifestFile, null);
      const rel = path.relative(this.paths.taskmanagerRoot, manifestFile).replace(/\\/g, "/");
      const { manifest, validation } = normalizeScriptManifest(rawManifest || {}, {
        path: rel,
        createdBy: "specialist",
        creationSource: "new-skills-manifest",
      });
      if (!validation.valid) malformed += 1;
      manifests.push(manifest);
    }

    const indexes = this.buildIndexes(manifests);
    this.state = {
      version: 1,
      lastIndexHash: sourceHash,
      lastIndexedAt: new Date().toISOString(),
      manifestCount: manifests.length,
      malformedManifestCount: malformed,
      manifests,
      ...indexes,
    };

    writeJsonFile(this.paths.specialistStateFile, this.state);
    writeJsonFile(this.paths.scriptManifestIndexFile, {
      generatedAt: this.state.lastIndexedAt,
      count: manifests.length,
      malformedManifestCount: malformed,
      manifests,
    });

    return {
      changed: true,
      manifestCount: manifests.length,
      malformedManifestCount: malformed,
    };
  }

  getManifests() {
    return Array.isArray(this.state.manifests) ? this.state.manifests : [];
  }

  getState() {
    return this.state;
  }
}
