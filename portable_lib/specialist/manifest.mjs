import fs from "node:fs";
import path from "node:path";
import { classifyPolicyFromManifest } from "./contracts.mjs";

export function getScriptManifestSchema() {
  return {
    type: "object",
    required: [
      "id",
      "title",
      "description",
      "category",
      "inputs",
      "outputs",
      "side_effects",
      "safe_to_autorun",
      "requires_confirmation",
      "platform",
      "path",
      "version",
      "last_verified",
    ],
  };
}

export function validateScriptManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== "object") {
    return { valid: false, errors: ["Manifest is not an object."] };
  }
  for (const key of getScriptManifestSchema().required) {
    if (manifest[key] === undefined || manifest[key] === null || manifest[key] === "") {
      errors.push(`Missing required field: ${key}`);
    }
  }
  if (!Array.isArray(manifest.aliases)) errors.push("aliases must be an array.");
  if (!Array.isArray(manifest.tags)) errors.push("tags must be an array.");
  if (!Array.isArray(manifest.side_effects)) errors.push("side_effects must be an array.");
  if (!Array.isArray(manifest.permissions_needed)) errors.push("permissions_needed must be an array.");
  if (!Array.isArray(manifest.platform)) errors.push("platform must be an array.");
  if (typeof manifest.inputs !== "object" || Array.isArray(manifest.inputs)) errors.push("inputs must be an object.");
  if (typeof manifest.outputs !== "object" || Array.isArray(manifest.outputs)) errors.push("outputs must be an object.");
  return { valid: errors.length === 0, errors };
}

export function normalizeScriptManifest(manifest, opts = {}) {
  const nowIso = new Date().toISOString();
  const normalized = {
    id: String(manifest?.id || "").trim(),
    title: String(manifest?.title || manifest?.id || "").trim(),
    description: String(manifest?.description || "").trim(),
    aliases: Array.isArray(manifest?.aliases) ? manifest.aliases.map((x) => String(x).trim()).filter(Boolean) : [],
    tags: Array.isArray(manifest?.tags) ? manifest.tags.map((x) => String(x).trim()).filter(Boolean) : [],
    category: String(manifest?.category || "general").trim(),
    inputs: manifest?.inputs && typeof manifest.inputs === "object" ? manifest.inputs : {},
    outputs: manifest?.outputs && typeof manifest.outputs === "object" ? manifest.outputs : {},
    side_effects: Array.isArray(manifest?.side_effects) ? manifest.side_effects : [],
    permissions_needed: Array.isArray(manifest?.permissions_needed) ? manifest.permissions_needed : [],
    safe_to_autorun: manifest?.safe_to_autorun === true,
    requires_confirmation: manifest?.requires_confirmation !== false,
    timeout_seconds: Number.isFinite(Number(manifest?.timeout_seconds)) ? Math.max(1, Number(manifest.timeout_seconds)) : 30,
    platform: Array.isArray(manifest?.platform) && manifest.platform.length ? manifest.platform : ["windows"],
    path: String(manifest?.path || opts.path || "").replace(/\\/g, "/"),
    version: String(manifest?.version || "1.0.0"),
    created_by: String(manifest?.created_by || opts.createdBy || "system"),
    creation_source: String(manifest?.creation_source || opts.creationSource || "generated-registry"),
    last_verified: String(manifest?.last_verified || nowIso),
    last_updated_time: String(manifest?.last_updated_time || nowIso),
    argument_schema: manifest?.argument_schema && typeof manifest.argument_schema === "object" ? manifest.argument_schema : {},
    usage_examples: Array.isArray(manifest?.usage_examples) ? manifest.usage_examples : [],
    safety_notes: Array.isArray(manifest?.safety_notes) ? manifest.safety_notes : [],
    input_output_description: String(manifest?.input_output_description || "").trim(),
    dependencies: Array.isArray(manifest?.dependencies) ? manifest.dependencies : [],
    modifies_state: manifest?.modifies_state === true,
    read_only: manifest?.read_only === true,
    reversible: manifest?.reversible === true,
    risk_level: String(manifest?.risk_level || "low"),
    policy_class: String(manifest?.policy_class || classifyPolicyFromManifest(manifest)),
  };

  const validation = validateScriptManifest(normalized);
  return {
    manifest: normalized,
    validation,
  };
}

export function ensureManifestSchemaFile(schemaFile) {
  fs.mkdirSync(path.dirname(schemaFile), { recursive: true });
  if (!fs.existsSync(schemaFile)) {
    fs.writeFileSync(schemaFile, `${JSON.stringify(getScriptManifestSchema(), null, 2)}\n`, "utf8");
  }
}
