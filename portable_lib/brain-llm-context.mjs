/**
 * Optional top-BM25 snippets for local LLM grounding when there is no confident
 * user-facing retrieval hit — not shown to the user as "the answer", only as model context.
 */
import process from "node:process";
import { resolveProfileContextArtifacts } from "./brain-retrieval.mjs";
import { loadTextForBm25Chunk, rankedBm25Scores } from "./brain-retrieval-bm25.mjs";

const DEFAULT_MAX_CHUNKS = Number(process.env.LOCAL_LLM_CONTEXT_CHUNKS) || 6;
const DEFAULT_MAX_CHARS = Number(process.env.LOCAL_LLM_CONTEXT_MAX_CHARS) || 8000;

/**
 * @param {string} normalizedQuery
 * @param {string[]} extraTerms
 * @param {'default' | 'full'} scope
 * @param {{ maxChunks?: number, maxChars?: number }} [opts]
 * @returns {string}
 */
export function gatherTopBrainSnippetsForLlm(
  normalizedQuery,
  extraTerms,
  scope,
  opts = {}
) {
  const maxChunks = opts.maxChunks ?? DEFAULT_MAX_CHUNKS;
  const maxChars = opts.maxChars ?? DEFAULT_MAX_CHARS;
  const lines = [];
  let total = 0;
  if (opts.profileName) {
    const routed = resolveProfileContextArtifacts(normalizedQuery, opts.profileName, {
      factLimit: 3,
      summaryLimit: 3,
    });
    for (const fact of routed.compactFacts || []) {
      const line = `[fact:${fact.docId}] ${fact.fact}`;
      if (total + line.length > maxChars) break;
      lines.push(line);
      total += line.length + 1;
    }
    for (const summary of routed.summaries || []) {
      const line = `[summary:${summary.docId}] ${summary.summary}`;
      if (total + line.length > maxChars) break;
      lines.push(line);
      total += line.length + 1;
    }
  }

  const ranked = rankedBm25Scores(normalizedQuery, extraTerms, {
    scope,
    profileName: opts.profileName,
  });
  if (!ranked?.ranked?.length && !lines.length) return "";

  for (const row of (ranked?.ranked || []).slice(0, maxChunks)) {
    const raw = loadTextForBm25Chunk({ chunkId: row.chunkId });
    if (!raw) continue;
    const snippet = String(raw)
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1200);
    if (snippet.length < 24) continue;
    const line = `[${row.chunkId}]\n${snippet}`;
    if (total + line.length > maxChars) break;
    lines.push(line);
    total += line.length + 4;
  }
  if (!lines.length) return "";

  return `Reference excerpts from the Horizons knowledge index (loosely ranked by relevance; use only if helpful, do not quote chunk ids):\n\n${lines.join(
    "\n\n---\n\n"
  )}`;
}
