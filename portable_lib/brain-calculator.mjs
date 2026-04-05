/**
 * Safe arithmetic via expr-eval (no eval of arbitrary JS).
 *
 * Symbolic: + − × ÷ * / ^ %, parentheses, unicode operators, letter x between digits,
 * thousands commas, sqrt / √, comparisons, expr-eval (sin, cos, log, pi, e, …).
 *
 * Natural language (rewritten to expressions): "add 10 to 30", "subtract 5 from 20",
 * "multiply 3 by 4", "divide 100 by 5", "sum of 2 and 3", "20 percent of 50", "50% of 200", etc.
 */
import { Parser } from "expr-eval";

const parser = new Parser();
const MAX_LEN = 800;

/**
 * Unicode / typed operators → ASCII; thousands commas; letter x between digits → *.
 */
function normalizeMathWords(s) {
  let t = String(s ?? "")
    .normalize("NFKC")
    .replace(/\u2212|\u2013|\u2014/g, "-")
    .replace(/[\u00d7\u2715\u2a09\u2a2f\u22c7]/g, "*")
    .replace(/\u00f7|÷/g, "/");

  t = t.replace(/\u221a\s*\(([^)]+)\)/g, "sqrt($1)");
  t = t.replace(/\u221a\s*(\d+(?:\.\d+)?)/g, "sqrt($1)");

  t = t
    .replace(/×/g, "*")
    .replace(/\u22c5|\u00b7/g, "*")
    .replace(/\uff0a/g, "*")
    .replace(/\bplus\b/gi, "+")
    .replace(/\bminus\b/gi, "-")
    .replace(/\bmultiplied by\b|\btimes\b/gi, "*")
    .replace(/\bdivided by\b|\bover\b/gi, "/");

  t = t.replace(/(?<=\d)\s*[xX]\s*(?=\d)/g, "*");

  t = t.replace(/\b(\d+(?:\.\d+)?)\s*%\s+of\s+(\d+(?:\.\d+)?)\b/gi, "($1/100)*$2");

  t = stripThousandsCommas(t);

  return t;
}

/**
 * Turn short English math phrases into parenthesized expressions (order matters).
 */
function rewriteNaturalLanguageArithmetic(s) {
  let t = String(s).trim();

  t = t.replace(/\bsubtract\s+(\d+(?:\.\d+)?)\s+from\s+(\d+(?:\.\d+)?)\b/gi, "($2-$1)");
  t = t.replace(/\badd\s+(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)\b/gi, "($1+$2)");
  t = t.replace(/\bmultiply\s+(\d+(?:\.\d+)?)\s+by\s+(\d+(?:\.\d+)?)\b/gi, "($1*$2)");
  t = t.replace(/\bdivide\s+(\d+(?:\.\d+)?)\s+by\s+(\d+(?:\.\d+)?)\b/gi, "($1/$2)");

  t = t.replace(/\b(\d+(?:\.\d+)?)\s+increased\s+by\s+(\d+(?:\.\d+)?)\b/gi, "($1+$2)");
  t = t.replace(/\bdecrease\s+(\d+(?:\.\d+)?)\s+by\s+(\d+(?:\.\d+)?)\b/gi, "($1-$2)");
  t = t.replace(/\b(\d+(?:\.\d+)?)\s+decreased\s+by\s+(\d+(?:\.\d+)?)\b/gi, "($1-$2)");

  t = t.replace(/\bsum\s+of\s+(\d+(?:\.\d+)?)\s+and\s+(\d+(?:\.\d+)?)\b/gi, "($1+$2)");
  t = t.replace(/\bdifference\s+between\s+(\d+(?:\.\d+)?)\s+and\s+(\d+(?:\.\d+)?)\b/gi, "($1-$2)");
  t = t.replace(/\bproduct\s+of\s+(\d+(?:\.\d+)?)\s+and\s+(\d+(?:\.\d+)?)\b/gi, "($1*$2)");
  t = t.replace(/\bquotient\s+of\s+(\d+(?:\.\d+)?)\s+and\s+(\d+(?:\.\d+)?)\b/gi, "($1/$2)");
  t = t.replace(/\baverage\s+of\s+(\d+(?:\.\d+)?)\s+and\s+(\d+(?:\.\d+)?)\b/gi, "(($1+$2)/2)");

  t = t.replace(/\b(\d+(?:\.\d+)?)\s+percent\s+of\s+(\d+(?:\.\d+)?)\b/gi, "($1/100)*$2");

  return t;
}

/** US-style 1,234,567 — remove commas between digits (not European 1,5 decimals). */
function stripThousandsCommas(s) {
  let t = s;
  let prev;
  let guard = 0;
  do {
    prev = t;
    t = t.replace(/(\d),(\d{3})\b/g, "$1$2");
    guard++;
  } while (t !== prev && guard < 20);
  return t;
}

function stripLeadingPhrases(s) {
  let t = s.trim().replace(/\?$/u, "").trim();
  t = t.replace(/^please\s+/iu, "").trim();
  t = t.replace(
    /^(what('s|s)?\s+is|what is|calculate|compute|how much is|how much|eval|evaluate|solve|find)\s+/iu,
    ""
  );
  t = t.replace(/^(the answer is|equals?|=)\s*/iu, "").trim();
  return t;
}

/**
 * Strip trailing "=" (incomplete equality) so "1=1=" becomes "1=1".
 * Turn single "=" into "==" for comparisons (expr-eval); leaves "<=", ">=", "==" and "!=" intact.
 */
function stripTrailingEquals(s) {
  return String(s).replace(/=\s*$/u, "").trim();
}

function normalizeSingleEquals(s) {
  return String(s).replace(/(?<![<>=!])=(?!=)/g, "==");
}

function looksLikeArithmeticExpression(s) {
  if (s.length < 2 || s.length > MAX_LEN) return false;
  if (!/\d/.test(s)) return false;
  const hasOpOrParen = /[+\-*/^%=]/.test(s) || /[()]/.test(s);
  if (!hasOpOrParen) return false;
  const letters = (s.match(/[a-zA-Z]/g) || []).length;
  if (letters > 48) return false;
  return true;
}

function formatNumber(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return String(n);
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n);
  const r = Math.round(n * 1e12) / 1e12;
  return String(r);
}

function formatValue(v) {
  if (typeof v === "boolean") return v ? "**true**" : "**false**";
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return `**${formatNumber(v)}**`;
}

/**
 * @param {string} display — user-facing text (same line as chat input)
 * @returns {string | null}
 */
export function tryMathReply(display) {
  const raw = String(display ?? "").trim();
  if (!raw || raw.length > MAX_LEN) return null;

  let expr = rewriteNaturalLanguageArithmetic(raw);
  expr = normalizeMathWords(expr);
  expr = stripLeadingPhrases(expr);
  expr = expr.replace(/\s+(please|thanks)\.?$/iu, "").trim();
  expr = expr.replace(/\s+[.!]$/u, "").trim();
  expr = stripTrailingEquals(expr);
  expr = normalizeSingleEquals(expr);

  if (!looksLikeArithmeticExpression(expr)) return null;

  try {
    const v = parser.evaluate(expr);
    const out = formatValue(v);
    if (out == null) return null;
    const showExpr = expr.length > 80 ? `${expr.slice(0, 77)}…` : expr;
    const sep = typeof v === "boolean" ? "→" : "=";
    return `${showExpr} ${sep} ${out}`;
  } catch {
    const retry = rewriteNaturalLanguageArithmetic(raw);
    let t2 = normalizeMathWords(retry);
    t2 = stripLeadingPhrases(t2);
    t2 = stripTrailingEquals(t2);
    t2 = normalizeSingleEquals(t2);
    if (looksLikeArithmeticExpression(t2)) {
      try {
        const v = parser.evaluate(t2);
        const out = formatValue(v);
        if (out != null) {
          const showExpr = t2.length > 80 ? `${t2.slice(0, 77)}…` : t2;
          const sep = typeof v === "boolean" ? "→" : "=";
          return `${showExpr} ${sep} ${out}`;
        }
      } catch {
        /* fall through */
      }
    }
    const chunks = raw.match(/[\d.,+\-*/^%\s=()Ee]+/g);
    if (!chunks) return null;
    const sorted = [...chunks].sort((a, b) => b.trim().length - a.trim().length);
    for (const c of sorted) {
      let t = rewriteNaturalLanguageArithmetic(c);
      t = normalizeMathWords(t).trim();
      t = stripTrailingEquals(t);
      t = normalizeSingleEquals(t);
      if (!looksLikeArithmeticExpression(t)) continue;
      try {
        const v = parser.evaluate(t);
        const out = formatValue(v);
        if (out == null) continue;
        const showExpr = t.length > 80 ? `${t.slice(0, 77)}…` : t;
        const sep = typeof v === "boolean" ? "→" : "=";
        return `${showExpr} ${sep} ${out}`;
      } catch {
        /* try next chunk */
      }
    }
    return null;
  }
}
