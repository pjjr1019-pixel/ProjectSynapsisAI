/**
 * Append-only learned Q&A (JSONL) for chat turns saved when Local LLM succeeds.
 * Read during non-LLM draft before BM25. Env: HORIZONS_LEARNED_QA=0 disables writes only.
 */
import fs from "node:fs";
import path from "node:path";
import { Buffer } from "node:buffer";
import process from "node:process";
import { tokenizeForRetrieval } from "./brain-text-tokens.mjs";
import { ensureBrainRuntimeHub, migrateLegacyBrainRuntimeData } from "./brain-runtime-hub.mjs";

const FILE_NAME = "learned-qa.jsonl";
/** @type {{ mtime: number, records: object[] } | null} */
let cache = null;

const JACCARD_MIN = 0.82;
const MIN_ANSWER_CHARS = 24;
const MAX_ANSWER_CHARS = 12000;
const MAX_DISPLAY_CHARS = 8000;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_LINE_BYTES = 512 * 1024;
const POLISHED_REQUEST_PATTERNS = [
  /\bpolished version of your request\b/i,
  /\brephrased version of your request\b/i,
];

function filePath() {
  migrateLegacyBrainRuntimeData();
  return ensureBrainRuntimeHub().learnedQaFile;
}

export function isLearnedQaWriteEnabled() {
  const v = String(process.env.HORIZONS_LEARNED_QA ?? "").toLowerCase();
  return !["0", "false", "off", "no"].includes(v);
}

function invalidateCache() {
  cache = null;
}

function loadRecords() {
  const p = filePath();
  if (!fs.existsSync(p)) {
    return [];
  }
  const st = fs.statSync(p);
  if (cache && cache.mtime === st.mtimeMs) return cache.records;
  const raw = fs.readFileSync(p, "utf8");
  const records = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      records.push(JSON.parse(line));
    } catch {
      /* skip bad line */
    }
  }
  cache = { mtime: st.mtimeMs, records };
  return records;
}

function jaccard(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter += 1;
  return inter / (A.size + B.size - inter);
}

function normalizeLoose(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isReusableLearnedQaAnswer(answer, normalizedQuestion = "") {
  const text = String(answer ?? "").trim();
  if (text.length < MIN_ANSWER_CHARS || text.length > MAX_ANSWER_CHARS) return false;
  if (POLISHED_REQUEST_PATTERNS.some((pattern) => pattern.test(text))) return false;

  const normalizedAnswer = normalizeLoose(text);
  const normalizedPrompt = normalizeLoose(normalizedQuestion);
  if (
    normalizedPrompt &&
    normalizedAnswer.includes(normalizedPrompt) &&
    /^(certainly|sure|here(?:'s| is)|of course|absolutely)\b/i.test(text)
  ) {
    return false;
  }
  return true;
}

/**
 * @param {string} normalized — from prepareUserQuery
 * @returns {string | null} raw answer text to wrap, or null
 */
export function findLearnedAnswer(normalized) {
  const q = String(normalized ?? "").trim().toLowerCase();
  if (q.length < 2) return null;
  const records = loadRecords();
  if (!records.length) return null;

  const qTokens = tokenizeForRetrieval(q);

  let bestAnswer = /** @type {string | null} */ (null);
  let bestScore = 0;

  for (let i = records.length - 1; i >= 0; i--) {
    const r = records[i];
    const norm = String(r.normalizedQuestion ?? "").trim().toLowerCase();
    if (!norm) continue;
    if (norm === q) {
      const ans = String(r.answer ?? "").trim();
      return isReusableLearnedQaAnswer(ans, norm) ? ans : null;
    }
  }

  for (let i = records.length - 1; i >= 0; i--) {
    const r = records[i];
    const norm = String(r.normalizedQuestion ?? "").trim().toLowerCase();
    if (!norm) continue;
    const ans = String(r.answer ?? "").trim();
    if (!isReusableLearnedQaAnswer(ans, norm)) continue;
    const t = tokenizeForRetrieval(norm);
    const score = jaccard(qTokens, t);
    if (score > bestScore) {
      bestScore = score;
      bestAnswer = ans;
    }
  }

  if (bestAnswer && bestScore >= JACCARD_MIN) return bestAnswer;
  return null;
}

/**
 * @param {string} answer
 * @returns {string}
 */
export function formatLearnedReply(answer) {
  const text = String(answer ?? "").replace(/\s+/g, " ").trim();
  const slice = text.slice(0, 2000);
  return `From a previous answer:\n\n${slice}${text.length > 2000 ? "…" : ""}`;
}

/**
 * @param {{
 *   normalized: string,
 *   display: string,
 *   answer: string,
 *   model?: string,
 * }} row
 */
export function appendLearnedQa(row) {
  if (!isLearnedQaWriteEnabled()) return;
  const answer = String(row.answer ?? "").trim();
  const normalized = String(row.normalized ?? "").trim().toLowerCase();
  if (normalized.length < 2) return;
  if (!isReusableLearnedQaAnswer(answer, normalized)) return;

  const p = filePath();
  const dir = path.dirname(p);
  fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(p) && fs.statSync(p).size > MAX_FILE_BYTES) {
    console.warn("[brain-learned-qa] file size cap reached — not appending");
    return;
  }

  const payload = {
    normalizedQuestion: normalized,
    displayQuestion: String(row.display ?? "").slice(0, MAX_DISPLAY_CHARS),
    answer: answer.slice(0, MAX_ANSWER_CHARS),
    storedAt: new Date().toISOString(),
    model: row.model ? String(row.model).slice(0, 200) : undefined,
  };

  const line = `${JSON.stringify(payload)}\n`;
  if (Buffer.byteLength(line, "utf8") > MAX_LINE_BYTES) return;

  fs.appendFileSync(p, line, "utf8");
  invalidateCache();
}
