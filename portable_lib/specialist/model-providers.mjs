import { embedText } from "../brain-embeddings-local.mjs";

function clamp01(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9_\-\s]/g, " ")
    .split(/\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function lexicalScore(queryTokens, text) {
  if (!queryTokens.length) return 0;
  const lower = String(text || "").toLowerCase();
  let hits = 0;
  for (const token of queryTokens) {
    if (lower.includes(token)) hits += 1;
  }
  return hits / queryTokens.length;
}

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || !a.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    const left = Number(a[i] || 0);
    const right = Number(b[i] || 0);
    dot += left * right;
    na += left * left;
    nb += right * right;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom ? dot / denom : 0;
}

export function createDefaultEmbeddingProvider() {
  return {
    name: "local-embedding-adapter",
    async warm() {
      try {
        await embedText("warm specialist embedding model", {});
        return { ok: true };
      } catch (error) {
        return { ok: false, error: String(error?.message || error) };
      }
    },
    async embedText(text) {
      try {
        return await embedText(String(text || ""), {});
      } catch {
        const tokens = tokenize(text);
        const vector = new Array(64).fill(0);
        for (const token of tokens) {
          const h = token.split("").reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 64, 0);
          vector[h] += 1;
        }
        const max = Math.max(1, ...vector);
        return vector.map((x) => x / max);
      }
    },
    similarity(left, right) {
      return clamp01((cosineSimilarity(left, right) + 1) / 2);
    },
  };
}

export function createDefaultRerankerProvider() {
  return {
    name: "heuristic-reranker-adapter",
    async warm() {
      return { ok: true };
    },
    async rerank({ request, candidates }) {
      const tokens = tokenize(request);
      return (Array.isArray(candidates) ? candidates : [])
        .map((candidate, idx) => {
          const text = [candidate.title, candidate.description, ...(candidate.aliases || []), ...(candidate.tags || [])].join(" ");
          const lexical = lexicalScore(tokens, text);
          const base = clamp01(candidate.base_score);
          return {
            ...candidate,
            rerank_score: clamp01(base * 0.62 + lexical * 0.38 + Math.max(0, 0.03 - idx * 0.002)),
            rerank_lexical_score: lexical,
          };
        })
        .sort((a, b) => b.rerank_score - a.rerank_score);
    },
  };
}

export function createDefaultRouterModelProvider() {
  return {
    name: "tiny-rule-router-adapter",
    async warm() {
      return { ok: true };
    },
    async route({ request, candidates }) {
      const top = Array.isArray(candidates) ? candidates[0] : null;
      const second = Array.isArray(candidates) ? candidates[1] : null;
      if (!top) {
        return {
          selected_script_id: null,
          selected_script_path: null,
          confidence: 0.2,
          argument_map: {},
          reason: "No candidates available.",
          fallback_to_general_ai: true,
          fallback_to_code_specialist: false,
        };
      }

      const margin = Math.max(0, Number(top.rerank_score || top.base_score || 0) - Number(second?.rerank_score || second?.base_score || 0));
      const confidence = clamp01(Number(top.rerank_score || top.base_score || 0) * 0.84 + margin * 0.16);
      const argMap = {};
      const requestLower = String(request || "").toLowerCase();
      for (const [name, schema] of Object.entries(top.inputs || {})) {
        if (schema?.type === "number") {
          const m = requestLower.match(new RegExp(`${name}\\s*(?:=|to)?\\s*(\\d+)`, "i"));
          if (m) argMap[name] = Number(m[1]);
          else if (schema.default !== undefined) argMap[name] = schema.default;
        } else if (schema?.type === "boolean") {
          if (requestLower.includes(`no ${name}`) || requestLower.includes(`disable ${name}`)) argMap[name] = false;
          else if (requestLower.includes(name) || requestLower.includes(`enable ${name}`)) argMap[name] = true;
          else if (schema.default !== undefined) argMap[name] = schema.default;
        } else if (schema?.default !== undefined) {
          argMap[name] = schema.default;
        }
      }

      return {
        selected_script_id: top.id,
        selected_script_path: top.path,
        confidence,
        argument_map: argMap,
        reason: `Top ranked candidate '${top.id}' selected by tiny router.`,
        fallback_to_general_ai: confidence < 0.4,
        fallback_to_code_specialist: false,
      };
    },
  };
}

export function createDefaultCodeSpecialistProvider() {
  return {
    name: "code-specialist-fallback-adapter",
    async warm() {
      return { ok: true };
    },
    async propose({ request, candidates }) {
      return {
        action: "suggest_new_script",
        confidence: 0.6,
        reason: "No existing script met confidence threshold.",
        title: `New specialist script for: ${String(request || "").slice(0, 80)}`,
        based_on: Array.isArray(candidates) ? candidates.slice(0, 3).map((x) => x.id) : [],
        template: "// TODO: implement specialist script\nmodule.exports = {};\n",
      };
    },
  };
}
