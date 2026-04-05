import path from "node:path";
import { ensureDir, writeJsonStable } from "./brain-build-utils.mjs";
import { loadAllNormalizedDocs, getBrainRuntimePaths } from "./brain-runtime-layer.mjs";
import { tokenizeForRetrieval } from "./brain-text-tokens.mjs";

const NEGATION_RE = /\b(?:no|not|never|cannot|can't|disable|disabled|block|blocked|deny|denied|without)\b/i;
const POSITIVE_RE = /\b(?:allow|allowed|enable|enabled|supports?|include|includes|can|must|always)\b/i;

function overlapRatio(a, b) {
  const left = new Set(tokenizeForRetrieval(a));
  const right = new Set(tokenizeForRetrieval(b));
  if (!left.size || !right.size) return 0;
  let hits = 0;
  for (const token of left) {
    if (right.has(token)) hits += 1;
  }
  return hits / Math.max(left.size, right.size);
}

export function classifyPotentialContradiction(leftText, rightText) {
  const overlap = overlapRatio(leftText, rightText);
  const leftNeg = NEGATION_RE.test(String(leftText ?? ""));
  const rightNeg = NEGATION_RE.test(String(rightText ?? ""));
  const leftPos = POSITIVE_RE.test(String(leftText ?? ""));
  const rightPos = POSITIVE_RE.test(String(rightText ?? ""));
  if (overlap >= 0.92) {
    return { label: "duplicate", confidence: overlap };
  }
  if (overlap >= 0.45 && leftNeg !== rightNeg && (leftPos || rightPos || leftNeg || rightNeg)) {
    return { label: "contradiction", confidence: Math.min(0.99, 0.55 + overlap / 2) };
  }
  if (overlap >= 0.45) {
    return { label: "support", confidence: Math.min(0.95, 0.5 + overlap / 2) };
  }
  return { label: "neutral", confidence: Math.max(0, overlap) };
}

function candidatePairs(docs) {
  const pairs = [];
  for (let i = 0; i < docs.length; i += 1) {
    for (let j = i + 1; j < docs.length; j += 1) {
      const left = docs[i];
      const right = docs[j];
      if (left.domain !== right.domain && left.app !== right.app) continue;
      const leftText = `${left.summary?.summary || ""} ${(left.facts || []).map((fact) => fact.text).join(" ")}`.trim();
      const rightText = `${right.summary?.summary || ""} ${(right.facts || []).map((fact) => fact.text).join(" ")}`.trim();
      const overlap = overlapRatio(leftText, rightText);
      if (overlap < 0.3) continue;
      pairs.push({ left, right, leftText, rightText, overlap });
    }
  }
  return pairs;
}

export function detectBrainContradictions(opts = {}) {
  const docs = loadAllNormalizedDocs();
  const findings = [];
  for (const pair of candidatePairs(docs)) {
    const verdict = classifyPotentialContradiction(pair.leftText, pair.rightText);
    if (verdict.label === "neutral") continue;
    findings.push({
      type: verdict.label,
      confidence: verdict.confidence,
      overlap: pair.overlap,
      left: {
        docId: pair.left.docId,
        title: pair.left.title,
        path: pair.left.path,
        sourceType: pair.left.provenance?.sourceType || "canonical",
      },
      right: {
        docId: pair.right.docId,
        title: pair.right.title,
        path: pair.right.path,
        sourceType: pair.right.provenance?.sourceType || "canonical",
      },
      excerpts: {
        left: pair.leftText.slice(0, 240),
        right: pair.rightText.slice(0, 240),
      },
    });
  }
  findings.sort((a, b) => b.confidence - a.confidence || a.left.docId.localeCompare(b.left.docId));
  const report = {
    artifactType: "brain-contradiction-report",
    schemaVersion: "1.0",
    builtAt: new Date().toISOString(),
    counts: {
      total: findings.length,
      contradictions: findings.filter((finding) => finding.type === "contradiction").length,
      duplicates: findings.filter((finding) => finding.type === "duplicate").length,
      supports: findings.filter((finding) => finding.type === "support").length,
    },
    findings,
  };

  const outputPath =
    opts.outputPath || path.join(getBrainRuntimePaths().indexesRoot, "contradiction-report.json");
  ensureDir(path.dirname(outputPath));
  writeJsonStable(outputPath, report);
  return report;
}
