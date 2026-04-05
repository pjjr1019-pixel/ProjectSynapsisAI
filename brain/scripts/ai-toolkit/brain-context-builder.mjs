import { rankHybridChunks } from "../../../portable_lib/brain-retrieval-hybrid.mjs";
import { gatherTopBrainSnippetsForLlm } from "../../../portable_lib/brain-llm-context.mjs";
import { prepareUserQuery } from "../../../portable_lib/brain-query-normalize.mjs";
import { createBrainMemoryCache } from "./brain-memory-cache.mjs";

const cache = createBrainMemoryCache({ namespace: "context-builder" });

function estimateTokens(text) {
  return Math.max(1, Math.ceil(String(text ?? "").trim().split(/\s+/).filter(Boolean).length * 1.35));
}

function buildSourceLabel(kind, value) {
  return `${kind}:${value}`;
}

export async function buildBrainContext({ query, taskType = null, maxTokens = 1200, profileName = "repo-knowledge-pack" } = {}) {
  const prepared = prepareUserQuery(String(query ?? ""), { profileName });
  const cacheKey = `${profileName}:${taskType || "general"}:${prepared.normalized}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const maxChars = Math.max(800, Math.min(12_000, maxTokens * 4));
  const extraTerms = [taskType, ...(prepared.expandedTerms || [])].filter(Boolean);
  let ranked = null;
  try {
    ranked = await rankHybridChunks(prepared.normalized, extraTerms, { profileName, topK: 6, scope: "default" });
  } catch {
    ranked = null;
  }

  const snippets = gatherTopBrainSnippetsForLlm(prepared.normalized, extraTerms, "default", {
    profileName,
    maxChars,
    maxChunks: 6,
  });

  const sources = [];
  const sections = [];
  sections.push(`Query: ${prepared.display || query || ""}`);
  sections.push(`Normalized: ${prepared.normalized || ""}`);
  if (taskType) sections.push(`Task type: ${taskType}`);

  if (ranked?.ranked?.length) {
    sections.push("Ranked sources:");
    for (const row of ranked.ranked.slice(0, 6)) {
      sources.push(buildSourceLabel("chunk", row.chunkId));
      sections.push(`- ${row.chunkId} (${Math.round((row.rrfScoreNormalized || row.score || 0) * 1000) / 10}%)`);
    }
  }

  if (snippets) {
    sections.push("Brain snippets:");
    sections.push(snippets);
    sources.push(buildSourceLabel("snippets", profileName));
  }

  const context = sections.join("\n\n").trim();
  const result = {
    context,
    sources,
    tokenCount: estimateTokens(context),
    taskType,
    profileName,
    query: prepared.display || String(query ?? ""),
  };

  cache.set(cacheKey, result, 10 * 60 * 1000);
  return result;
}

export function buildCachedBrainContext(input) {
  return cache.get(`${String(input?.profileName || "repo-knowledge-pack")}:${String(input?.taskType || "general")}:${prepareUserQuery(String(input?.query || "")).normalized}`)
    || null;
}