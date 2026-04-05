import fs from "node:fs";
import path from "node:path";
import {
  BRAIN_RUNTIME_BUILD_VERSION,
  BRAIN_RUNTIME_SCHEMA_VERSION,
  ensureDir,
  normalizeSlashes,
  sha256Text,
  writeJsonStable,
} from "./brain-build-utils.mjs";
import { prepareUserQuery } from "./brain-query-normalize.mjs";
import { loadTextForBm25Chunk, rankedBm25Scores } from "./brain-retrieval-bm25.mjs";
import { getProfileConfig } from "./brain-retrieval.mjs";
import {
  getBrainRuntimePaths,
  loadNormalizedDoc,
  lookupCompactFacts,
  lookupSummaryMatches,
} from "./brain-runtime-layer.mjs";
import { lookupScenarioCandidates } from "./brain-scenario-lookup.mjs";

function estimateTokens(text) {
  const words = String(text ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return Math.max(1, Math.ceil(words.length * 1.35));
}

function compactProvenance(docId, chunkIds = [], pathRefs = [], sourceType = "canonical") {
  return {
    docId,
    chunkIds: chunkIds.filter(Boolean),
    pathRefs: pathRefs.filter(Boolean).map((value) => normalizeSlashes(value)),
    sourceType,
  };
}

function makePackItem(kind, text, opts = {}) {
  const packText = String(text ?? "").trim();
  return {
    kind,
    title: String(opts.title ?? "").trim(),
    text: packText,
    tokens: estimateTokens(packText),
    score: Number(opts.score ?? 0),
    provenance: compactProvenance(
      opts.docId || "",
      opts.chunkIds || [],
      opts.pathRefs || [],
      opts.sourceType || "canonical"
    ),
  };
}

function pushUnderBudget(items, candidate, state) {
  if (!candidate?.text) return;
  if (state.usedTokens + candidate.tokens > state.budget) return;
  items.push(candidate);
  state.usedTokens += candidate.tokens;
}

function buildPackText(items) {
  return items
    .map((item) => {
      const header = item.title ? `[${item.kind}] ${item.title}` : `[${item.kind}]`;
      return `${header}\n${item.text}`;
    })
    .join("\n\n---\n\n");
}

export function buildContextPack(query, profileName = "repo-knowledge-pack", opts = {}) {
  const profile = getProfileConfig(profileName);
  const budget = Math.max(
    120,
    Math.floor(opts.budget ?? profile.contextPackBudget ?? 1200)
  );
  const prepared =
    typeof query === "string"
      ? prepareUserQuery(query, { profileName })
      : query && typeof query === "object" && typeof query.normalized === "string"
        ? query
        : prepareUserQuery(String(query ?? ""), { profileName });

  const normalized = prepared.normalized || "";
  const summaryFirst =
    opts.mode === "chunk-first"
      ? false
      : opts.mode === "summary-first"
        ? true
        : profile.contextPackStrategy !== "chunk-first" && profile.summaryFirst !== false;

  const compactFacts =
    opts.compactFacts || (profile.allowCompactFacts !== false
      ? lookupCompactFacts(normalized, profileName, { limit: 6 })
      : []);
  const summaries =
    opts.summaries || (profile.allowSummaries !== false
      ? lookupSummaryMatches(normalized, profileName, { limit: 6 })
      : []);
  const scenarioCandidates =
    opts.scenarioCandidates || lookupScenarioCandidates(normalized, { profileName, limit: 3 });
  const rankedChunks =
    opts.rankedChunks ||
    rankedBm25Scores(normalized, opts.extraTerms || [], { profileName, scope: opts.scope || "default" })
      ?.ranked
      ?.slice(0, 6) ||
    [];

  const glossaryTerms = [];
  for (const summary of summaries.slice(0, 3)) {
    const doc = loadNormalizedDoc(summary.docId);
    for (const entity of doc?.entities || []) {
      if (glossaryTerms.length >= 3) break;
      glossaryTerms.push(
        makePackItem("glossary", `${entity.name} (${entity.kind})`, {
          title: doc?.title || summary.docId,
          docId: summary.docId,
          sourceType: summary.sourceType,
          pathRefs: [doc?.path || summary?.provenance?.path || ""],
          score: summary.score,
        })
      );
    }
  }

  const items = [];
  const state = { usedTokens: 0, budget };

  const scenarioItem = scenarioCandidates[0]
    ? makePackItem("scenario-hint", scenarioCandidates[0].reply, {
        title: scenarioCandidates[0].trigger,
        docId: scenarioCandidates[0].docId || scenarioCandidates[0].rowId || "",
        sourceType: scenarioCandidates[0].sourceType || "canonical",
        pathRefs: scenarioCandidates[0].path ? [scenarioCandidates[0].path] : [],
        score: scenarioCandidates[0].score,
      })
    : null;
  pushUnderBudget(items, scenarioItem, state);

  const factItems = compactFacts.map((fact) =>
    makePackItem("fact", fact.fact, {
      title: fact.docId,
      docId: fact.docId,
      sourceType: fact.sourceType,
      pathRefs: [fact.path],
      score: fact.score,
    })
  );
  const summaryItems = summaries.map((summary) =>
    makePackItem("summary", summary.summary, {
      title: summary.title || summary.docId,
      docId: summary.docId,
      sourceType: summary.sourceType,
      chunkIds: summary.supportingChunkIds || [],
      pathRefs: [summary?.provenance?.path || ""],
      score: summary.score,
    })
  );
  const chunkItems = rankedChunks.map((row) => {
    const raw = loadTextForBm25Chunk({ chunkId: row.chunkId }) || "";
    return makePackItem("chunk", raw.replace(/\s+/g, " ").trim().slice(0, 900), {
      title: row.chunkId,
      chunkIds: [row.chunkId],
      score: row.score,
    });
  });

  const orderedGroups = summaryFirst
    ? [factItems, summaryItems, glossaryTerms, chunkItems]
    : [chunkItems, factItems, summaryItems, glossaryTerms];

  for (const group of orderedGroups) {
    for (const item of group) {
      pushUnderBudget(items, item, state);
    }
  }

  const text = buildPackText(items);
  const packId = `ctx.${sha256Text(`${profileName}:${normalized}:${budget}:${text}`).slice(0, 16)}`;
  const pack = {
    artifactType: "context-pack",
    schemaVersion: BRAIN_RUNTIME_SCHEMA_VERSION,
    buildVersion: BRAIN_RUNTIME_BUILD_VERSION,
    builtAt: new Date().toISOString(),
    packId,
    profileId: profileName,
    query: {
      raw: prepared.display || String(query ?? "").trim(),
      normalized,
      expandedTerms: prepared.expandedTerms || [],
    },
    budget,
    usedTokens: state.usedTokens,
    summaryFirst,
    items,
    text,
  };

  if (opts.persist !== false) {
    const target = path.join(getBrainRuntimePaths().contextPacksRoot, `${packId}.json`);
    ensureDir(path.dirname(target));
    writeJsonStable(target, pack);
  }

  return pack;
}

export function inspectContextPack(packId) {
  const filePath = path.join(getBrainRuntimePaths().contextPacksRoot, `${packId}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}
