import { inspectProfileArtifacts } from "./brain-ir-build.mjs";
import { getProfileConfig } from "./brain-retrieval.mjs";
import { loadNormalizedDoc } from "./brain-runtime-layer.mjs";

export function explainDoc(docId) {
  const doc = loadNormalizedDoc(docId);
  if (!doc) return null;
  return {
    docId,
    app: doc.app,
    domain: doc.domain,
    title: doc.title,
    moduleIds: doc.moduleIds || [],
    sourceType: doc.provenance?.sourceType || "canonical",
    status: doc.status,
    confidence: doc.confidence,
    path: doc.path,
    facts: (doc.facts || []).slice(0, 5).map((fact) => ({
      factId: fact.factId,
      text: fact.text,
      charStart: fact.charStart,
      charEnd: fact.charEnd,
    })),
    aliases: (doc.aliases || []).slice(0, 10),
    rules: (doc.rules || []).slice(0, 5),
    headings: (doc.headings || []).slice(0, 8),
    summary: doc.summary,
    provenance: doc.provenance,
  };
}

export function explainProfile(profileName) {
  const profile = getProfileConfig(profileName);
  const artifacts = inspectProfileArtifacts(profileName);
  if (!artifacts) return null;
  return {
    profile,
    retrievalMap: {
      counts: artifacts.retrievalMap.counts,
      includeDomains: artifacts.retrievalMap.includeDomains,
      allowedApps: artifacts.retrievalMap.allowedApps,
      sourceTypes: artifacts.retrievalMap.sourceTypes,
      preferredArtifactTypes: artifacts.retrievalMap.preferredArtifactTypes,
      summaryFirst: artifacts.retrievalMap.summaryFirst,
      allowCompactFacts: artifacts.retrievalMap.allowCompactFacts,
      allowSummaries: artifacts.retrievalMap.allowSummaries,
      sampleDocIds: artifacts.retrievalMap.allowedDocIds.slice(0, 12),
      sampleChunkIds: artifacts.retrievalMap.allowedChunkIds.slice(0, 12),
    },
    summaryPack: {
      counts: artifacts.summaryPack.counts,
      sampleDocs: artifacts.summaryPack.docs.slice(0, 5).map((doc) => ({
        docId: doc.docId,
        title: doc.title,
        sourceType: doc.sourceType,
      })),
    },
    scenarioMap: {
      counts: artifacts.scenarioMap.counts,
      sampleRows: artifacts.scenarioMap.entries.slice(0, 8).map((entry) => ({
        rowId: entry.rowId,
        trigger: entry.trigger,
        priority: entry.priority,
      })),
    },
    bm25: {
      counts: artifacts.bm25.counts,
      chunkCount: artifacts.bm25.chunkOrder?.length || 0,
    },
  };
}

export function formatHumanTrace(trace) {
  if (!trace) return "No trace available.";
  const lines = [];
  lines.push(`Profile: ${trace.profileId || trace.profileName || "unknown"}`);
  lines.push(`Normalized query: ${trace.queryNormalized || ""}`);
  lines.push(`Stage matched: ${trace.stageMatched || "none"}`);
  lines.push(`Winning artifact: ${trace.winningArtifactType || "none"}`);
  lines.push(`Winning source: ${trace.winningSourceType || "none"}`);
  if (trace.winningDocIds?.length) lines.push(`Doc ids: ${trace.winningDocIds.join(", ")}`);
  if (trace.winningChunkIds?.length) lines.push(`Chunk ids: ${trace.winningChunkIds.join(", ")}`);
  if (trace.expansionsUsed?.expandedTerms?.length) {
    lines.push(`Expanded terms: ${trace.expansionsUsed.expandedTerms.join(", ")}`);
  }
  const decompose = (trace.stages || []).find((stage) => stage.stage === "query_decompose");
  if (decompose?.subqueries?.length) {
    lines.push(`Decomposed subqueries: ${decompose.subqueries.join(" | ")}`);
  }
  const expand = (trace.stages || []).find((stage) => stage.stage === "query_expand");
  if (expand?.hypothetical) {
    lines.push(`HyDE variant: ${expand.hypothetical}`);
  }
  if (trace.finalContextAssembly) {
    lines.push(
      `Context pack: ${trace.finalContextAssembly.packId} (${trace.finalContextAssembly.usedTokens}/${trace.finalContextAssembly.budget} tokens)`
    );
  }
  const hybrid = (trace.stages || []).find((stage) => stage.stage === "hybrid_retrieval");
  if (hybrid?.topCandidates?.length) {
    lines.push("Hybrid top candidates:");
    for (const candidate of hybrid.topCandidates.slice(0, 3)) {
      lines.push(
        `- ${candidate.chunkId} via ${candidate.primaryLane} [${(candidate.laneHits || []).join(", ")}] rrf=${Number(candidate.rrfScoreNormalized || 0).toFixed(3)}`
      );
    }
  }
  if (Array.isArray(trace.stages) && trace.stages.length) {
    lines.push("Stages:");
    for (const stage of trace.stages) {
      lines.push(`- ${stage.stage}`);
    }
  }
  return lines.join("\n");
}
