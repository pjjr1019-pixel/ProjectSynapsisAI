import path from "node:path";
import {
  BRAIN_RUNTIME_BUILD_VERSION,
  BRAIN_RUNTIME_SCHEMA_VERSION,
  readJsonIfExists,
  writeJsonStable,
} from "./brain-build-utils.mjs";
import { normalizeProfileDefinition } from "./brain-ir-contracts.mjs";
import { loadProfiles } from "./brain-retrieval.mjs";
import {
  getBrainRuntimePaths,
  loadAllNormalizedDocs,
  loadPreviousRuntimeManifest,
  loadProfileRetrievalMap,
  loadRuntimeCompactFacts,
  loadRuntimeManifest,
} from "./brain-runtime-layer.mjs";

function issue(severity, code, message, extra = {}) {
  return { severity, code, message, ...extra };
}

function meaningKey(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[`*_#>\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function docFamilyKey(doc) {
  return String(doc?.path || "")
    .replace(/\\/g, "/")
    .replace(/\.[^.]+$/, "")
    .toLowerCase();
}

function detectAliasCollisions(docs) {
  const byAlias = new Map();
  for (const doc of docs) {
    for (const alias of doc.aliases || []) {
      const key = meaningKey(alias.alias);
      if (!key) continue;
      if (!byAlias.has(key)) byAlias.set(key, []);
      byAlias.get(key).push({
        docId: doc.docId,
        path: doc.path,
        sourceType: doc.provenance?.sourceType,
        canonical: alias.canonical,
      });
    }
  }
  const issues = [];
  for (const [alias, rows] of byAlias.entries()) {
    const canonicals = [...new Set(rows.map((row) => row.canonical))];
    const families = [...new Set(rows.map((row) => docFamilyKey(row)))];
    if (canonicals.length > 1 && families.length > 1) {
      issues.push(
        issue("medium", "alias_collision", `Alias "${alias}" resolves to multiple canonicals.`, {
          affectedDocs: rows.map((row) => row.docId),
        })
      );
    }
  }
  return issues;
}

function detectDuplicateEntities(docs) {
  const seen = new Map();
  const issues = [];
  for (const doc of docs) {
    for (const entity of doc.entities || []) {
      const key = String(entity.entityId || "").trim();
      if (!key) continue;
      if (seen.has(key)) {
        issues.push(
          issue("medium", "duplicate_entity_id", `Entity id ${key} appears more than once.`, {
            affectedDocs: [seen.get(key), doc.docId],
          })
        );
      } else {
        seen.set(key, doc.docId);
      }
    }
  }
  return issues;
}

function detectDuplicateMeaning(docs) {
  const seen = new Map();
  const issues = [];
  for (const doc of docs) {
    const key = meaningKey(doc.summary?.short || doc.summary?.medium || "");
    if (!key || key.length < 32) continue;
    if (!seen.has(key)) {
      seen.set(key, doc);
      continue;
    }
    const first = seen.get(key);
    if (first.docId !== doc.docId) {
      issues.push(
        issue(
          "low",
          "duplicate_meaning",
          `Docs ${first.docId} and ${doc.docId} have near-identical summaries under different ids.`,
          {
            affectedDocs: [first.docId, doc.docId],
          }
        )
      );
    }
  }
  return issues;
}

function detectCanonicalImportConflicts(docs) {
  const canonicalDocs = docs.filter((doc) => doc.provenance?.sourceType === "canonical");
  const importDocs = docs.filter((doc) => doc.provenance?.sourceType === "import");
  const issues = [];
  for (const canonical of canonicalDocs) {
    const canonicalKey = meaningKey(`${canonical.title} ${canonical.summary?.short || ""}`);
    for (const imported of importDocs) {
      const importedKey = meaningKey(`${imported.title} ${imported.summary?.short || ""}`);
      if (!canonicalKey || !importedKey) continue;
      if (canonicalKey === importedKey || canonical.title.toLowerCase() === imported.title.toLowerCase()) {
        issues.push(
          issue(
            "medium",
            "canonical_import_conflict",
            `Canonical doc ${canonical.docId} overlaps imported doc ${imported.docId}.`,
            {
              affectedDocs: [canonical.docId, imported.docId],
            }
          )
        );
      }
    }
  }
  return issues;
}

function detectStaleArtifacts(docs) {
  const issues = [];
  const compactFacts = loadRuntimeCompactFacts();
  const byDocId = new Map(docs.map((doc) => [doc.docId, doc]));
  for (const fact of compactFacts?.facts || []) {
    const doc = byDocId.get(fact.docId);
    if (!doc) {
      issues.push(
        issue("high", "orphaned_artifact", `Compact fact ${fact.factId} points to missing doc ${fact.docId}.`, {
          affectedArtifacts: [fact.factId],
          affectedDocs: [fact.docId],
        })
      );
      continue;
    }
    if (doc.provenance?.hash && fact.provenance?.hash && doc.provenance.hash !== fact.provenance.hash) {
      issues.push(
        issue("high", "stale_compact_fact", `Compact fact ${fact.factId} is stale against ${fact.docId}.`, {
          affectedArtifacts: [fact.factId],
          affectedDocs: [fact.docId],
        })
      );
    }
  }
  return issues;
}

function detectStaleLiveImports(docs) {
  const now = Date.now();
  const issues = [];
  for (const doc of docs) {
    const provenance = doc?.provenance || {};
    if (String(provenance.sourceType || "") !== "import") continue;
    if (String(provenance.importLayer || "") !== "live") continue;
    const freshnessRaw = provenance.freshness || provenance.fetchedAt || "";
    const freshnessTime =
      typeof freshnessRaw === "number"
        ? freshnessRaw
        : freshnessRaw
          ? Date.parse(String(freshnessRaw))
          : Number.NaN;
    if (!Number.isFinite(freshnessTime)) continue;
    const ttlHours = Math.max(1, Number(provenance.ttlHours || 168) || 168);
    const ageHours = (now - freshnessTime) / (1000 * 60 * 60);
    if (ageHours <= ttlHours) continue;
    issues.push(
      issue(
        ageHours > ttlHours * 2 ? "medium" : "low",
        "stale_live_import",
        `Live import ${doc.docId} is older than its freshness window.`,
        {
          affectedDocs: [doc.docId],
          ageHours: Math.round(ageHours),
          ttlHours,
        }
      )
    );
  }
  return issues;
}

function detectProfileLeakage(docs) {
  const issues = [];
  const rawProfiles = loadProfiles();
  for (const [profileName, rawProfile] of Object.entries(rawProfiles.profiles || {})) {
    const profile = normalizeProfileDefinition(profileName, rawProfile);
    const retrievalMap = loadProfileRetrievalMap(profileName);
    if (!retrievalMap) continue;
    for (const docId of retrievalMap.allowedDocIds || []) {
      const doc = docs.find((row) => row.docId === docId);
      if (!doc) continue;
      const sourceType = doc.provenance?.sourceType;
      if (sourceType === "draft" && !profile.allowDraft) {
        issues.push(
          issue("high", "profile_leakage", `Profile ${profileName} exposes draft doc ${docId}.`, {
            affectedDocs: [docId],
            affectedProfiles: [profileName],
          })
        );
      }
      if (sourceType === "memory" && !profile.allowMemory) {
        issues.push(
          issue("high", "profile_leakage", `Profile ${profileName} exposes memory doc ${docId}.`, {
            affectedDocs: [docId],
            affectedProfiles: [profileName],
          })
        );
      }
      if (sourceType === "import" && !profile.allowImports) {
        issues.push(
          issue("high", "profile_leakage", `Profile ${profileName} exposes import doc ${docId}.`, {
            affectedDocs: [docId],
            affectedProfiles: [profileName],
          })
        );
      }
    }
  }
  return issues;
}

function detectManifestDrift() {
  const current = loadRuntimeManifest();
  const previous = loadPreviousRuntimeManifest();
  const issues = [];
  if (!current) {
    issues.push(issue("high", "missing_runtime_manifest", "runtime-manifest.json is missing."));
    return issues;
  }
  if (!previous) return issues;
  const changedPaths = [];
  for (const [rel, hash] of Object.entries(current.sourceHashes || {})) {
    if ((previous.sourceHashes || {})[rel] && previous.sourceHashes[rel] !== hash) {
      changedPaths.push(rel);
    }
  }
  if (changedPaths.length) {
    issues.push(
      issue("low", "since_last_build_changes", "Source hashes changed since the previous build snapshot.", {
        affectedArtifacts: ["runtime-manifest"],
        changedPaths: changedPaths.slice(0, 20),
      })
    );
  }
  return issues;
}

function detectEvalRegression() {
  const root = getBrainRuntimePaths().evalsRoot;
  const latest = readJsonIfExists(path.join(root, "latest-report.json"));
  const previous = readJsonIfExists(path.join(root, "previous-report.json"));
  const issues = [];
  if (!latest) return issues;
  if (latest.metrics?.deterministicRepeatability < 1) {
    issues.push(
      issue(
        "medium",
        "ranking_instability",
        "Latest eval report shows non-deterministic ranking across repeats.",
        { affectedArtifacts: ["brain-eval-report"] }
      )
    );
  }
  if (previous && latest.metrics?.hitAt1 < previous.metrics?.hitAt1) {
    issues.push(
      issue("medium", "retrieval_regression", "Latest eval hit@1 regressed compared to previous report.", {
        affectedArtifacts: ["brain-eval-report"],
      })
    );
  }
  return issues;
}

export function detectBrainDrift(opts = {}) {
  const docs = loadAllNormalizedDocs();
  const issues = [
    ...detectAliasCollisions(docs),
    ...detectDuplicateEntities(docs),
    ...detectDuplicateMeaning(docs),
    ...detectCanonicalImportConflicts(docs),
    ...detectStaleArtifacts(docs),
    ...detectStaleLiveImports(docs),
    ...detectProfileLeakage(docs),
    ...detectManifestDrift(),
    ...detectEvalRegression(),
  ];
  const filtered = opts.profileName
    ? issues.filter((row) => !row.affectedProfiles || row.affectedProfiles.includes(opts.profileName))
    : issues;
  const report = {
    artifactType: "brain-drift-report",
    schemaVersion: BRAIN_RUNTIME_SCHEMA_VERSION,
    buildVersion: BRAIN_RUNTIME_BUILD_VERSION,
    builtAt: new Date().toISOString(),
    counts: {
      issueCount: filtered.length,
      high: filtered.filter((row) => row.severity === "high").length,
      medium: filtered.filter((row) => row.severity === "medium").length,
      low: filtered.filter((row) => row.severity === "low").length,
    },
    profile: opts.profileName || null,
    issues: filtered,
    suggestedRepairs: filtered.slice(0, 10).map((row) => {
      if (row.code === "stale_compact_fact") return "Run build-brain-ir to rebuild derived artifacts.";
      if (row.code === "profile_leakage") return "Tighten retrieval/profiles.json or rebuild retrieval maps.";
      if (row.code === "alias_collision") return "Review aliases in canonical docs and keep one canonical meaning per alias.";
      if (row.code === "retrieval_regression") return "Inspect latest eval cases and compare winning traces to the previous report.";
      return `Inspect ${row.code} and trace the affected docs/artifacts.`;
    }),
  };
  const outputPath =
    opts.outputPath || path.join(getBrainRuntimePaths().indexesRoot, "drift-report.json");
  writeJsonStable(outputPath, report);
  return report;
}
