import { compareStrings, uniqueSorted } from "./brain-build-utils.mjs";

export const SUPPORTED_SOURCE_TYPES = new Set([
  "canonical",
  "runtime",
  "web",
  "draft",
  "import",
  "memory",
]);
export const SUPPORTED_ARTIFACT_TYPES = new Set([
  "normalized-doc",
  "compact-facts",
  "semantic-map",
  "scenario-lookup",
  "response-priors",
  "prompt-pack",
  "retrieval-map",
  "summary-pack",
  "bm25",
  "runtime-manifest",
  "runtime-diagnostics",
  "brain-trace",
  "brain-eval-report",
  "brain-drift-report",
  "brain-contradiction-report",
  "context-pack",
  "dense-pilot-manifest",
  "runtime-update-report",
  "compacted-user-memory",
]);

const ALLOWED_IMPORT_LIBRARIES = new Set([
  "none",
  "megapack",
  "individual_packs",
  "knowledge_v1_v2",
  "repo_knowledge_pack",
  "all",
]);
const ALLOWED_RERANK_MODES = new Set(["off", "heuristic", "model"]);

function asStringArray(value) {
  if (!Array.isArray(value)) return [];
  return uniqueSorted(value.map((entry) => String(entry ?? "").trim()).filter(Boolean));
}

export function normalizeProfileDefinition(profileName, rawProfile = {}) {
  const importLibrary = ALLOWED_IMPORT_LIBRARIES.has(rawProfile.importLibrary)
    ? rawProfile.importLibrary
    : "none";
  const rerankMode = ALLOWED_RERANK_MODES.has(String(rawProfile.rerankMode ?? ""))
    ? String(rawProfile.rerankMode)
    : "off";
  const includeDomains = asStringArray(rawProfile.includeDomains);
  const allowedApps = asStringArray(rawProfile.allowedApps);
  const preferredArtifactTypes = asStringArray(rawProfile.preferredArtifactTypes);
  return {
    name: profileName,
    description: String(rawProfile.description ?? "").trim(),
    importLibrary,
    includeDomains,
    allowedApps,
    allowDraft: rawProfile.allowDraft === true,
    allowImports:
      rawProfile.allowImports === undefined
        ? importLibrary !== "none"
        : rawProfile.allowImports === true,
    allowMemory: rawProfile.allowMemory === true,
    minConfidence: Number(rawProfile.minConfidence ?? 0.5) || 0,
    preferredArtifactTypes:
      preferredArtifactTypes.length > 0
        ? preferredArtifactTypes
        : ["scenario", "compact-fact", "summary", "chunk"],
    summaryFirst: rawProfile.summaryFirst !== false,
    allowCompactFacts: rawProfile.allowCompactFacts !== false,
    allowSummaries: rawProfile.allowSummaries !== false,
    allowScenarioCompression: rawProfile.allowScenarioCompression !== false,
    includeSourceTypes: asStringArray(rawProfile.includeSourceTypes),
    importFamilies: asStringArray(rawProfile.importFamilies),
    canonicalBias: Math.max(0, Number(rawProfile.canonicalBias ?? 1.15) || 1.15),
    contextPackBudget: Math.max(200, Number(rawProfile.contextPackBudget ?? 1200) || 1200),
    contextPackStrategy:
      rawProfile.contextPackStrategy === "chunk-first" ? "chunk-first" : "summary-first",
    arbitrationPolicy: String(rawProfile.arbitrationPolicy ?? "default").trim() || "default",
    denseEnabled: rawProfile.denseEnabled === true,
    denseModel: String(rawProfile.denseModel ?? "").trim(),
    rrfK: Math.max(1, Number(rawProfile.rrfK ?? 60) || 60),
    queryExpansion: rawProfile.queryExpansion !== false,
    queryDecomposition: rawProfile.queryDecomposition !== false,
    rerankMode,
    freshnessBias: Math.max(0, Number(rawProfile.freshnessBias ?? 1) || 1),
  };
}

function validateScalarString(errors, value, fieldPath) {
  if (typeof value !== "string" || !value.trim()) {
    errors.push(`${fieldPath} must be a non-empty string`);
  }
}

function validateEnvelopeBase(payload, errors, fieldPath = "artifact") {
  validateScalarString(errors, payload?.artifactType, `${fieldPath}.artifactType`);
  validateScalarString(errors, payload?.schemaVersion, `${fieldPath}.schemaVersion`);
  validateScalarString(errors, payload?.buildVersion, `${fieldPath}.buildVersion`);
  validateScalarString(errors, payload?.builtAt, `${fieldPath}.builtAt`);
}

export function validateNormalizedDoc(doc) {
  const errors = [];
  validateScalarString(errors, doc?.docId, "doc.docId");
  validateScalarString(errors, doc?.app, "doc.app");
  validateScalarString(errors, doc?.domain, "doc.domain");
  validateScalarString(errors, doc?.path, "doc.path");
  validateScalarString(errors, doc?.title, "doc.title");
  if (!SUPPORTED_SOURCE_TYPES.has(String(doc?.provenance?.sourceType ?? ""))) {
    errors.push(`doc.provenance.sourceType must be one of ${[...SUPPORTED_SOURCE_TYPES].join(", ")}`);
  }
  if (!Array.isArray(doc?.moduleIds)) errors.push("doc.moduleIds must be an array");
  if (!Array.isArray(doc?.headings)) errors.push("doc.headings must be an array");
  if (!Array.isArray(doc?.facts)) errors.push("doc.facts must be an array");
  if (!Array.isArray(doc?.entities)) errors.push("doc.entities must be an array");
  if (!Array.isArray(doc?.relations)) errors.push("doc.relations must be an array");
  if (!Array.isArray(doc?.aliases)) errors.push("doc.aliases must be an array");
  if (!Array.isArray(doc?.rules)) errors.push("doc.rules must be an array");
  if (!Array.isArray(doc?.scenarios)) errors.push("doc.scenarios must be an array");
  if (!doc?.summary || typeof doc.summary !== "object") errors.push("doc.summary must be an object");
  if (!doc?.provenance || typeof doc.provenance !== "object") {
    errors.push("doc.provenance must be an object");
  } else {
    validateScalarString(errors, doc.provenance.hash, "doc.provenance.hash");
    if (!Array.isArray(doc.provenance.charRanges)) {
      errors.push("doc.provenance.charRanges must be an array");
    }
    const externalLike =
      String(doc.provenance.sourceType || "") === "import" ||
      String(doc.provenance.sourceType || "") === "web";
    if (externalLike) {
      if (doc.provenance.sourceUrl !== undefined && typeof doc.provenance.sourceUrl !== "string") {
        errors.push("doc.provenance.sourceUrl must be a string when present");
      }
      if (
        doc.provenance.sourceDomain !== undefined &&
        typeof doc.provenance.sourceDomain !== "string"
      ) {
        errors.push("doc.provenance.sourceDomain must be a string when present");
      }
      if (doc.provenance.license !== undefined && typeof doc.provenance.license !== "string") {
        errors.push("doc.provenance.license must be a string when present");
      }
      if (
        doc.provenance.licenseRisk !== undefined &&
        typeof doc.provenance.licenseRisk !== "string"
      ) {
        errors.push("doc.provenance.licenseRisk must be a string when present");
      }
      if (
        doc.provenance.retrievalSafe !== undefined &&
        typeof doc.provenance.retrievalSafe !== "boolean"
      ) {
        errors.push("doc.provenance.retrievalSafe must be a boolean when present");
      }
      if (
        doc.provenance.trainingSafe !== undefined &&
        typeof doc.provenance.trainingSafe !== "boolean"
      ) {
        errors.push("doc.provenance.trainingSafe must be a boolean when present");
      }
      if (doc.provenance.piiScan !== undefined && typeof doc.provenance.piiScan !== "string") {
        errors.push("doc.provenance.piiScan must be a string when present");
      }
      if (
        doc.provenance.importLayer !== undefined &&
        typeof doc.provenance.importLayer !== "string"
      ) {
        errors.push("doc.provenance.importLayer must be a string when present");
      }
      if (doc.provenance.freshness !== undefined) {
        const ok =
          typeof doc.provenance.freshness === "string" ||
          typeof doc.provenance.freshness === "number";
        if (!ok) errors.push("doc.provenance.freshness must be a string or number when present");
      }
    }
  }
  return errors;
}

export function validateArtifactEnvelope(payload, expectedType) {
  const errors = [];
  validateEnvelopeBase(payload, errors);
  if (expectedType && payload?.artifactType !== expectedType) {
    errors.push(`artifact.artifactType must be ${expectedType}`);
  }
  if (!payload?.counts || typeof payload.counts !== "object") {
    errors.push("artifact.counts must be an object");
  }
  return errors;
}

export function sortExplainStages(stages) {
  const preferredOrder = [
    "normalize",
    "scenario",
    "compact-fact",
    "summary",
    "bm25",
    "chunk",
    "llm-context",
  ];
  return [...(Array.isArray(stages) ? stages : [])].sort((a, b) => {
    const ai = preferredOrder.indexOf(String(a?.stage ?? ""));
    const bi = preferredOrder.indexOf(String(b?.stage ?? ""));
    if (ai !== bi) return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
    return compareStrings(a?.stage, b?.stage);
  });
}
