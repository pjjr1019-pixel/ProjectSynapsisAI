import fs from "node:fs";
import path from "node:path";
import {
  BRAIN_RUNTIME_BUILD_VERSION,
  BRAIN_RUNTIME_SCHEMA_VERSION,
  ensureDir,
  readJsonIfExists,
  writeJsonStable,
} from "./brain-build-utils.mjs";
import { traceBrainMatch } from "./brain-chat-reply.mjs";
import { densePilotReady } from "./brain-retrieval-dense-lancedb.mjs";
import { getBrainRuntimePaths, loadRuntimeManifest } from "./brain-runtime-layer.mjs";

const PATHS = getBrainRuntimePaths();
const EVAL_CASES_PATH = path.join(PATHS.brainRoot, "evals", "retrieval-eval-cases.json");
const GENERATED_EVALS_ROOT = PATHS.generatedEvalsRoot;

function loadCasesFromFile(filePath) {
  const raw = readJsonIfExists(filePath);
  return Array.isArray(raw?.cases) ? raw.cases : [];
}

function loadEvalCases() {
  const cases = [];
  cases.push(...loadCasesFromFile(EVAL_CASES_PATH));
  if (fs.existsSync(GENERATED_EVALS_ROOT)) {
    const files = fs
      .readdirSync(GENERATED_EVALS_ROOT)
      .filter((name) => name.endsWith(".json"))
      .sort((a, b) => a.localeCompare(b));
    for (const name of files) {
      cases.push(...loadCasesFromFile(path.join(GENERATED_EVALS_ROOT, name)));
    }
  }
  const deduped = new Map();
  for (const caseDef of cases) {
    deduped.set(String(caseDef.caseId || `${caseDef.profile}:${caseDef.query}`), caseDef);
  }
  return [...deduped.values()];
}

function normalizeExpectArray(value) {
  return Array.isArray(value) ? value.map((entry) => String(entry)).filter(Boolean) : [];
}

function entryRelevance(caseDef, entry) {
  const expectedDocIds = normalizeExpectArray(caseDef.expected?.docIds);
  const expectedChunkIds = normalizeExpectArray(caseDef.expected?.chunkIds);
  const expectedArtifactTypes = normalizeExpectArray(caseDef.expected?.artifactTypes);
  const expectedSourceTypes = normalizeExpectArray(caseDef.expected?.sourceTypes);
  const docHit =
    !expectedDocIds.length || expectedDocIds.some((docId) => (entry.docIds || []).includes(docId));
  const chunkHit =
    !expectedChunkIds.length ||
    expectedChunkIds.some((chunkId) => (entry.chunkIds || []).includes(chunkId));
  const artifactHit =
    !expectedArtifactTypes.length || expectedArtifactTypes.includes(entry.artifactType);
  const sourceHit =
    !expectedSourceTypes.length || expectedSourceTypes.includes(entry.sourceType);
  return docHit && chunkHit && artifactHit && sourceHit ? 1 : 0;
}

function rankingHits(caseDef, ranking, k) {
  return ranking.slice(0, k).some((entry) => entryRelevance(caseDef, entry) > 0);
}

function reciprocalRank(caseDef, ranking) {
  for (let i = 0; i < ranking.length; i += 1) {
    if (entryRelevance(caseDef, ranking[i]) > 0) return 1 / (i + 1);
  }
  return 0;
}

function discountedCumulativeGain(caseDef, ranking, k) {
  let score = 0;
  for (let i = 0; i < Math.min(k, ranking.length); i += 1) {
    const rel = entryRelevance(caseDef, ranking[i]);
    if (!rel) continue;
    score += rel / Math.log2(i + 2);
  }
  return score;
}

function normalizedDiscountedCumulativeGain(caseDef, ranking, k) {
  const dcg = discountedCumulativeGain(caseDef, ranking, k);
  const ideal = k > 0 ? 1 : 0;
  return ideal > 0 ? dcg / ideal : 0;
}

function hasForbiddenHit(caseDef, ranking) {
  const forbiddenDocIds = normalizeExpectArray(caseDef.forbidden?.docIds);
  const forbiddenChunkIds = normalizeExpectArray(caseDef.forbidden?.chunkIds);
  const forbiddenSourceTypes = normalizeExpectArray(caseDef.forbidden?.sourceTypes);
  return ranking.some((entry) => {
    if (forbiddenDocIds.some((docId) => (entry.docIds || []).includes(docId))) return true;
    if (forbiddenChunkIds.some((chunkId) => (entry.chunkIds || []).includes(chunkId))) return true;
    if (forbiddenSourceTypes.includes(entry.sourceType)) return true;
    return false;
  });
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function summarizeFailures(results) {
  const clusters = {};
  for (const result of results) {
    for (const failure of result.failures || []) {
      clusters[failure] = (clusters[failure] || 0) + 1;
    }
  }
  return Object.entries(clusters)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([code, count]) => ({ code, count }));
}

function suggestedTuningTargets(failureClusters) {
  return failureClusters.map((cluster) => {
    if (cluster.code === "miss@5") {
      return "Increase alias coverage or semantic expansion for the failing profile.";
    }
    if (cluster.code === "forbidden_hit") {
      return "Tighten profile gating or arbitration source-type priority to avoid leakage.";
    }
    if (cluster.code === "latency_budget") {
      return "Reduce stage fan-out or disable pilot reranking for latency-sensitive paths.";
    }
    if (cluster.code === "repeatability") {
      return "Audit candidate tie-breaks and ranking sort order for deterministic selection.";
    }
    return `Inspect failures tagged ${cluster.code} and compare trace outputs across repeats.`;
  });
}

function baselineMetrics(results) {
  return {
    hitAt1: average(results.map((result) => result.metrics.hitAt1)),
    hitAt3: average(results.map((result) => result.metrics.hitAt3)),
    hitAt5: average(results.map((result) => result.metrics.hitAt5)),
    mrr: average(results.map((result) => result.metrics.reciprocalRank)),
    ndcgAt5: average(results.map((result) => result.metrics.ndcgAt5)),
    ndcgAt10: average(results.map((result) => result.metrics.ndcgAt10)),
    scenarioAccuracy: average(
      results
        .map((result) => result.metrics.scenarioAccuracy)
        .filter((value) => value !== null)
    ),
    summaryFirstAccuracy: average(results.map((result) => result.metrics.summaryFirstAccuracy)),
    fullChunkFallbackRate: average(results.map((result) => result.metrics.fullChunkFallback)),
    deterministicRepeatability: average(results.map((result) => result.metrics.repeatability)),
    endToEndLatencyMs: average(results.map((result) => result.metrics.endToEndLatencyMs)),
  };
}

function compareToBaseline(report, baselinePath, threshold) {
  const baseline = readJsonIfExists(baselinePath);
  if (!baseline?.metrics) return [];
  const metrics = ["hitAt5", "mrr", "ndcgAt5", "ndcgAt10"];
  const regressions = [];
  for (const metric of metrics) {
    const previous = Number(baseline.metrics[metric]);
    const current = Number(report.metrics[metric]);
    if (!Number.isFinite(previous) || !Number.isFinite(current)) continue;
    const drop = previous - current;
    if (drop > threshold) {
      regressions.push({ metric, baseline: previous, current, drop });
    }
  }
  return regressions;
}

export async function runBrainEvals(opts = {}) {
  const selectedCase = opts.caseId ? String(opts.caseId) : "";
  const selectedProfile = opts.profileName ? String(opts.profileName) : "";
  const comparePilot = opts.comparePilot !== false && densePilotReady();
  const cases = loadEvalCases().filter((caseDef) => {
    if (selectedCase && caseDef.caseId !== selectedCase) return false;
    if (selectedProfile && caseDef.profile !== selectedProfile) return false;
    return true;
  });

  const results = [];
  for (const caseDef of cases) {
    const repeats = Math.max(1, Math.floor(opts.repeats ?? 3));
    const traces = [];
    const latencies = [];
    for (let i = 0; i < repeats; i += 1) {
      const t0 = Date.now();
      const trace = await traceBrainMatch(caseDef.query, caseDef.profile, {
        fullBrainContext: caseDef.fullBrainContext === true,
        densePilot: opts.densePilot === true,
        retrievalRerank: opts.retrievalRerank === true,
      });
      traces.push(trace);
      latencies.push(Date.now() - t0);
    }
    const base = traces[0];
    const ranking = Array.isArray(base.candidateRankings) ? base.candidateRankings : [];
    const failures = [];
    if (!rankingHits(caseDef, ranking, 1)) failures.push("miss@1");
    if (!rankingHits(caseDef, ranking, 3)) failures.push("miss@3");
    if (!rankingHits(caseDef, ranking, 5)) failures.push("miss@5");
    if (hasForbiddenHit(caseDef, ranking)) failures.push("forbidden_hit");
    if (
      caseDef.expected?.artifactTypes?.includes("scenario") &&
      base.winningArtifactType !== "scenario"
    ) {
      failures.push("scenario_accuracy");
    }
    if (
      base.winningSourceType &&
      normalizeExpectArray(caseDef.expected?.sourceTypes).length &&
      !normalizeExpectArray(caseDef.expected?.sourceTypes).includes(base.winningSourceType)
    ) {
      failures.push("wrong_source_type");
    }
    const repeatability =
      new Set(
        traces.map((trace) =>
          JSON.stringify(
            (trace.candidateRankings || []).slice(0, 5).map((entry) => ({
              candidateId: entry.candidateId,
              score: entry.score,
            }))
          )
        )
      ).size === 1;
    if (!repeatability) failures.push("repeatability");
    if (caseDef.latencyMs && Math.max(...latencies) > caseDef.latencyMs) failures.push("latency_budget");

    let pilotComparison = null;
    if (comparePilot) {
      const denseTrace = await traceBrainMatch(caseDef.query, caseDef.profile, {
        fullBrainContext: caseDef.fullBrainContext === true,
        densePilot: true,
        retrievalRerank: opts.retrievalRerank === true,
      });
      const denseRanking = Array.isArray(denseTrace.candidateRankings) ? denseTrace.candidateRankings : [];
      pilotComparison = {
        baseline: {
          hitAt5: rankingHits(caseDef, ranking, 5) ? 1 : 0,
          mrr: reciprocalRank(caseDef, ranking),
          ndcgAt5: normalizedDiscountedCumulativeGain(caseDef, ranking, 5),
        },
        densePilot: {
          hitAt5: rankingHits(caseDef, denseRanking, 5) ? 1 : 0,
          mrr: reciprocalRank(caseDef, denseRanking),
          ndcgAt5: normalizedDiscountedCumulativeGain(caseDef, denseRanking, 5),
          topCandidate: denseRanking[0]?.candidateId || "",
        },
      };
      pilotComparison.delta = {
        hitAt5: pilotComparison.densePilot.hitAt5 - pilotComparison.baseline.hitAt5,
        mrr: pilotComparison.densePilot.mrr - pilotComparison.baseline.mrr,
        ndcgAt5: pilotComparison.densePilot.ndcgAt5 - pilotComparison.baseline.ndcgAt5,
      };
    }

    results.push({
      caseId: caseDef.caseId,
      query: caseDef.query,
      profile: caseDef.profile,
      pass: failures.length === 0,
      failures,
      metrics: {
        hitAt1: rankingHits(caseDef, ranking, 1) ? 1 : 0,
        hitAt3: rankingHits(caseDef, ranking, 3) ? 1 : 0,
        hitAt5: rankingHits(caseDef, ranking, 5) ? 1 : 0,
        reciprocalRank: reciprocalRank(caseDef, ranking),
        ndcgAt5: normalizedDiscountedCumulativeGain(caseDef, ranking, 5),
        ndcgAt10: normalizedDiscountedCumulativeGain(caseDef, ranking, 10),
        scenarioAccuracy:
          caseDef.expected?.artifactTypes?.includes("scenario")
            ? base.winningArtifactType === "scenario"
              ? 1
              : 0
            : null,
        summaryFirstAccuracy:
          base.finalContextAssembly?.itemKinds?.[0] === "fact" ||
          base.finalContextAssembly?.itemKinds?.[0] === "summary"
            ? 1
            : 0,
        fullChunkFallback: base.finalContextAssembly?.itemKinds?.includes("chunk") ? 1 : 0,
        endToEndLatencyMs: average(latencies),
        stageLatencyMs: base.stageLatencyMs || {},
        repeatability: repeatability ? 1 : 0,
      },
      pilotComparison,
      trace: base,
    });
  }

  const report = {
    artifactType: "brain-eval-report",
    schemaVersion: BRAIN_RUNTIME_SCHEMA_VERSION,
    buildVersion: BRAIN_RUNTIME_BUILD_VERSION,
    builtAt: new Date().toISOString(),
    runtimeBuiltAt: loadRuntimeManifest()?.builtAt || null,
    counts: {
      caseCount: results.length,
      passCount: results.filter((result) => result.pass).length,
      failCount: results.filter((result) => !result.pass).length,
    },
    metrics: baselineMetrics(results),
    failureClusters: summarizeFailures(results),
    suggestedTuningTargets: [],
    comparisons: {
      densePilotReady: comparePilot,
      densePilotDelta: comparePilot
        ? {
            hitAt5: average(results.map((result) => result.pilotComparison?.delta?.hitAt5 || 0)),
            mrr: average(results.map((result) => result.pilotComparison?.delta?.mrr || 0)),
            ndcgAt5: average(results.map((result) => result.pilotComparison?.delta?.ndcgAt5 || 0)),
          }
        : null,
    },
    regressions: [],
    results,
  };
  report.suggestedTuningTargets = suggestedTuningTargets(report.failureClusters);

  const outputPath =
    opts.outputPath || path.join(getBrainRuntimePaths().evalsRoot, "latest-report.json");
  ensureDir(path.dirname(outputPath));
  ensureDir(getBrainRuntimePaths().evalHistoryRoot);
  const previousPath = path.join(path.dirname(outputPath), "previous-report.json");
  if (fs.existsSync(outputPath)) {
    fs.copyFileSync(outputPath, previousPath);
  }
  const regressionThreshold = Math.max(0, Number(opts.regressionThreshold ?? 0.02));
  const baselinePath = opts.baselinePath || previousPath;
  report.regressions = compareToBaseline(report, baselinePath, regressionThreshold);
  writeJsonStable(outputPath, report);
  const historyStamp = report.builtAt.replace(/[:.]/g, "-");
  writeJsonStable(
    path.join(getBrainRuntimePaths().evalHistoryRoot, `${historyStamp}-report.json`),
    report
  );
  return report;
}
