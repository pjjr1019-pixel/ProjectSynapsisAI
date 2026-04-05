import { prepareUserQuery } from "../../../portable_lib/brain-query-normalize.mjs";
import { tryMathReply } from "../../../portable_lib/brain-calculator.mjs";
import { lookupScenarioMatch } from "../../../portable_lib/brain-scenario-lookup.mjs";
import { lookupScenarioFuzzy } from "../../../portable_lib/brain-scenario-fuzzy.mjs";
import { decomposeQuery } from "../../../portable_lib/brain-query-decompose.mjs";

function classifyIntent(normalized, display) {
  const text = `${normalized} ${display}`.trim().toLowerCase();
  if (!text) return { intent: "empty", confidence: 1, params: {} };
  if (/^\s*(hi|hello|hey|help|support)\b/.test(text)) return { intent: "greeting", confidence: 0.98, params: {} };
  if (/\b(help|what can you do|commands|how do i)\b/.test(text)) return { intent: "help", confidence: 0.95, params: {} };
  if (/\b(cpu|memory|ram|gpu|hotspot|hot spots?|resource pressure|high[-\s]?cpu|high[-\s]?memory)\b/.test(text)) {
    return { intent: "analysis", confidence: 0.9, params: { focus: "hotspot" } };
  }
  if (/\b(compare|difference|vs|versus|between)\b/.test(text)) return { intent: "compare", confidence: 0.82, params: {} };
  if (/\b(show|list|find|open|run|launch|start)\b/.test(text)) return { intent: "task", confidence: 0.74, params: {} };
  return { intent: "query", confidence: 0.55, params: {} };
}

export function parseBrainIntent(rawQuery, opts = {}) {
  const display = String(rawQuery ?? "").trim();
  const prepared = prepareUserQuery(display, { profileName: opts.profileName });
  const mathReply = tryMathReply(display);
  const scenario = lookupScenarioMatch(prepared.normalized || display, { profileName: opts.profileName })
    || (prepared.normalized ? { reply: lookupScenarioFuzzy(prepared.normalized), explain: { source: "fuzzy" } } : null);
  const complex = decomposeQuery(prepared.normalized || display, { enabled: true });
  const classification = classifyIntent(prepared.normalized || display, display);
  const hotspotQuery = classification.params?.focus === "hotspot";

  let intent = classification.intent;
  let confidence = classification.confidence;
  const params = {
    profileName: opts.profileName || null,
    normalized: prepared.normalized,
    display: prepared.display,
    expansion: prepared.expandedTerms || [],
    scenarioReply: scenario?.reply || null,
    mathReply,
    decomposition: complex,
  };

  if (mathReply) {
    intent = "calculator";
    confidence = 0.99;
    params.mathReply = mathReply;
  } else if (hotspotQuery) {
    intent = "analysis";
    confidence = Math.max(confidence, classification.confidence);
  } else if (scenario?.reply) {
    intent = "scenario";
    confidence = Math.max(confidence, 0.9);
    params.scenario = scenario;
  } else if (complex.strategy !== "skip" && complex.subqueries.length > 1) {
    intent = "compound-query";
    confidence = Math.max(confidence, 0.78);
  }

  return {
    intent,
    confidence: Math.max(0, Math.min(1, confidence)),
    params,
    rawQuery: display,
  };
}

export function describeIntent(parsed) {
  if (!parsed) return "unknown";
  return `${parsed.intent} (${Math.round((parsed.confidence || 0) * 100)}%)`;
}