import fs from "node:fs";
import path from "node:path";
import { prepareUserQuery } from "./brain-query-normalize.mjs";
import { ensureDir, readJsonIfExists, writeJsonStable } from "./brain-build-utils.mjs";
import { getWorkflowRuntimeConfig } from "./workflow-runtime-config.mjs";
import { ensureWorkflowRuntimePaths, getWorkflowRuntimePaths } from "./workflow-runtime-paths.mjs";
import {
  buildWorkflowSignature,
  instantiateWorkflowSpec,
  normalizeWorkflowSpec,
} from "./workflow-spec.mjs";

function nowIso() {
  return new Date().toISOString();
}

function appendJsonLine(filePath, payload) {
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`, "utf8");
}

function tokenize(value) {
  return String(value ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function unique(items) {
  return [...new Set(items)];
}

function clamp01(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(1, num));
}

function average(values) {
  if (!Array.isArray(values) || !values.length) return 0;
  return values.reduce((sum, entry) => sum + Number(entry || 0), 0) / values.length;
}

function jaccardSimilarity(leftTokens, rightTokens) {
  const left = new Set(leftTokens);
  const right = new Set(rightTokens);
  if (!left.size && !right.size) return 1;
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) intersection += 1;
  }
  const union = new Set([...left, ...right]).size || 1;
  return intersection / union;
}

function buildSpecSearchTokens(spec) {
  return unique([
    ...tokenize(spec.title),
    ...tokenize(spec.intentLabel),
    ...spec.tags.flatMap((entry) => tokenize(entry)),
    ...spec.examplePrompts.flatMap((entry) => tokenize(entry)),
  ]);
}

function workflowStatusRank(status) {
  if (status === "trusted") return 4;
  if (status === "candidate") return 3;
  if (status === "disabled") return 2;
  if (status === "archived") return 1;
  return 0;
}

function loadSpecsFromDirectory(root, status) {
  if (!fs.existsSync(root)) return [];
  const files = fs.readdirSync(root, { withFileTypes: true });
  return files
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
    .flatMap((entry) => {
      const filePath = path.join(root, entry.name);
      try {
        const parsed = readJsonIfExists(filePath);
        if (!parsed) return [];
        const spec = normalizeWorkflowSpec({ ...parsed, status });
        return [{ spec, filePath }];
      } catch {
        return [];
      }
    });
}

export function loadWorkflowRegistry() {
  const paths = ensureWorkflowRuntimePaths();
  const entries = [
    ...loadSpecsFromDirectory(paths.trustedRoot, "trusted"),
    ...loadSpecsFromDirectory(paths.candidatesRoot, "candidate"),
    ...loadSpecsFromDirectory(paths.archiveRoot, "archived"),
  ];

  const byId = new Map();
  const bySignature = new Map();
  for (const entry of entries) {
    const existing = byId.get(entry.spec.id);
    if (!existing || workflowStatusRank(entry.spec.status) > workflowStatusRank(existing.spec.status)) {
      byId.set(entry.spec.id, entry);
    }
    bySignature.set(entry.spec.signatureHash || buildWorkflowSignature(entry.spec), entry);
  }

  return {
    paths,
    entries: [...byId.values()].sort((left, right) => {
      if (workflowStatusRank(left.spec.status) !== workflowStatusRank(right.spec.status)) {
        return workflowStatusRank(right.spec.status) - workflowStatusRank(left.spec.status);
      }
      if (right.spec.successCount !== left.spec.successCount) {
        return right.spec.successCount - left.spec.successCount;
      }
      return left.spec.id.localeCompare(right.spec.id);
    }),
    byId,
    bySignature,
  };
}

function computeRecencyBoost(spec) {
  const recent = Date.parse(spec.lastSuccessAt || "");
  if (!Number.isFinite(recent)) return 0;
  const ageDays = Math.max(0, (Date.now() - recent) / (1000 * 60 * 60 * 24));
  if (ageDays <= 3) return 0.08;
  if (ageDays <= 14) return 0.05;
  if (ageDays <= 30) return 0.025;
  return 0;
}

function computeSlotCompatibility(spec, requestSlotValues = {}) {
  const specSlots = Array.isArray(spec.slots) ? spec.slots : [];
  if (!specSlots.length && !Object.keys(requestSlotValues).length) return 0.08;
  if (!specSlots.length) return 0.02;

  let total = 0;
  let comparisons = 0;
  for (const slot of specSlots) {
    comparisons += 1;
    const requestValue = requestSlotValues[slot.name];
    if (requestValue == null) {
      total += slot.required ? 0 : 0.2;
      continue;
    }
    const example = slot.example;
    if (example == null) {
      total += 0.8;
      continue;
    }
    total += String(example).toLowerCase() === String(requestValue).toLowerCase() ? 1 : 0.45;
  }
  return comparisons ? total / comparisons : 0;
}

function scoreWorkflowMatch(spec, request) {
  if (spec.status === "disabled" || spec.status === "archived") {
    return { score: 0, breakdown: { excluded: true } };
  }

  const requestTokens = unique([
    ...tokenize(request.originalRequest),
    ...tokenize(request.normalizedRequest),
  ]);
  const specTokens = buildSpecSearchTokens(spec);
  const tokenSimilarity = jaccardSimilarity(requestTokens, specTokens);
  const promptSimilarity = Math.max(
    0,
    ...spec.examplePrompts.map((prompt) => jaccardSimilarity(requestTokens, tokenize(prompt)))
  );
  const intentSimilarity = request.intentLabel
    ? spec.intentLabel === request.intentLabel
      ? 1
      : tokenize(spec.intentLabel).some((token) => tokenize(request.intentLabel).includes(token))
        ? 0.55
        : 0
    : 0;
  const slotCompatibility = computeSlotCompatibility(spec, request.slotValues);
  const successWeight = clamp01(Math.log10(spec.successCount + 1) / 2);
  const trustedBonus = spec.status === "trusted" ? 0.1 : 0;
  const candidateBonus = spec.status === "candidate" ? 0.02 : 0;
  const confidenceWeight = clamp01(spec.confidence) * 0.12;
  const recencyBoost = computeRecencyBoost(spec);
  const score = clamp01(
    intentSimilarity * 0.34 +
      Math.max(tokenSimilarity, promptSimilarity) * 0.28 +
      promptSimilarity * 0.12 +
      slotCompatibility * 0.12 +
      successWeight * 0.1 +
      confidenceWeight +
      trustedBonus +
      candidateBonus +
      recencyBoost
  );

  return {
    score,
    breakdown: {
      intentSimilarity,
      tokenSimilarity,
      promptSimilarity,
      slotCompatibility,
      successWeight,
      confidenceWeight,
      trustedBonus,
      candidateBonus,
      recencyBoost,
    },
  };
}

export function findWorkflowMatches(requestInput, options = {}) {
  const config = getWorkflowRuntimeConfig(options.configOverrides);
  const registry = loadWorkflowRegistry();
  const prepared = prepareUserQuery(requestInput?.message || requestInput?.originalRequest || "");
  const request = {
    originalRequest: String(requestInput?.message || requestInput?.originalRequest || "").trim(),
    normalizedRequest: String(requestInput?.normalizedRequest || prepared.normalized || "").trim(),
    intentLabel: String(requestInput?.intentLabel || "").trim() || null,
    slotValues: requestInput?.slotValues && typeof requestInput.slotValues === "object" ? requestInput.slotValues : {},
  };

  const matches = registry.entries
    .map((entry) => {
      const scored = scoreWorkflowMatch(entry.spec, request);
      return {
        workflowId: entry.spec.id,
        status: entry.spec.status,
        title: entry.spec.title,
        score: scored.score,
        breakdown: scored.breakdown,
        spec: entry.spec,
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || right.spec.successCount - left.spec.successCount);

  const trusted = matches.filter((entry) => entry.status === "trusted");
  const candidates = matches.filter((entry) => entry.status === "candidate");
  const reusableTrusted = trusted.find((entry) => entry.score >= config.thresholds.trustedReuseScore) || null;
  const candidateHint = candidates.find((entry) => entry.score >= config.thresholds.candidateHintScore) || null;

  return {
    request,
    matches: matches.slice(0, options.limit || 10),
    reusableTrusted,
    candidateHint,
  };
}

function buildCatalogPayload(registry) {
  const workflows = registry.entries.map((entry) => ({
    id: entry.spec.id,
    title: entry.spec.title,
    status: entry.spec.status,
    intentLabel: entry.spec.intentLabel,
    successCount: entry.spec.successCount,
    failureCount: entry.spec.failureCount,
    confidence: entry.spec.confidence,
    lastSuccessAt: entry.spec.lastSuccessAt,
    lastFailureAt: entry.spec.lastFailureAt,
    tags: entry.spec.tags,
    signatureHash: entry.spec.signatureHash,
  }));
  return {
    updatedAt: nowIso(),
    counts: {
      trusted: workflows.filter((entry) => entry.status === "trusted").length,
      candidate: workflows.filter((entry) => entry.status === "candidate").length,
      archived: workflows.filter((entry) => entry.status === "archived").length,
      disabled: workflows.filter((entry) => entry.status === "disabled").length,
    },
    workflows,
  };
}

function removeExistingWorkflowFiles(paths, workflowId) {
  for (const root of [paths.trustedRoot, paths.candidatesRoot, paths.archiveRoot]) {
    const filePath = path.join(root, `${workflowId}.json`);
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true });
    }
  }
}

function resolveWorkflowFilePath(paths, spec) {
  if (spec.status === "trusted") return path.join(paths.trustedRoot, `${spec.id}.json`);
  if (spec.status === "archived" || spec.status === "disabled") return path.join(paths.archiveRoot, `${spec.id}.json`);
  return path.join(paths.candidatesRoot, `${spec.id}.json`);
}

function persistWorkflowSpec(specInput, options = {}) {
  const paths = ensureWorkflowRuntimePaths();
  const spec = normalizeWorkflowSpec({
    ...specInput,
    updatedAt: options.updatedAt || nowIso(),
  });
  removeExistingWorkflowFiles(paths, spec.id);
  const filePath = resolveWorkflowFilePath(paths, spec);
  writeJsonStable(filePath, spec);
  const registry = loadWorkflowRegistry();
  writeJsonStable(paths.catalogFile, buildCatalogPayload(registry));
  return { spec, filePath, paths };
}

function computeFailureRate(spec) {
  const attempts = spec.successCount + spec.failureCount;
  return attempts > 0 ? spec.failureCount / attempts : 0;
}

function computeNextConfidence(spec, { success = false, verified = false, verificationStrength = "none" } = {}) {
  const current = Number(spec.confidence) || 0.35;
  if (!success) return clamp01(current - 0.18);
  const verifiedBonus = verified ? (verificationStrength === "strong" ? 0.16 : 0.08) : 0.03;
  const successBonus = spec.successCount > 0 ? 0.04 : 0.12;
  return clamp01(current + verifiedBonus + successBonus);
}

function maybeTransitionWorkflowStatus(specInput, config, options = {}) {
  const spec = normalizeWorkflowSpec(specInput);
  const failureRate = computeFailureRate(spec);
  const previousStatus = spec.status;

  if (
    previousStatus === "candidate" &&
    config.flags.enableWorkflowPromotion &&
    options.success === true &&
    options.verified === true &&
    spec.successCount >= config.promotion.trustedSuccessCount &&
    failureRate <= config.promotion.maxFailureRate
  ) {
    return {
      ...spec,
      status: "trusted",
      notes: [...spec.notes, `Promoted to trusted after ${spec.successCount} verified successes.`].slice(-12),
    };
  }

  if (
    previousStatus === "trusted" &&
    options.success === false &&
    spec.failureCount >= config.promotion.demotionFailureCount &&
    failureRate >= config.promotion.demotionFailureRate
  ) {
    return {
      ...spec,
      status: "candidate",
      notes: [...spec.notes, `Demoted to candidate after repeated failures.`].slice(-12),
    };
  }

  return spec;
}

export function saveWorkflowSpec(specInput, options = {}) {
  return persistWorkflowSpec(specInput, options);
}

export function captureWorkflowExecution(executionInput, options = {}) {
  const config = getWorkflowRuntimeConfig(options.configOverrides);
  const registry = loadWorkflowRegistry();
  const candidateSpec = normalizeWorkflowSpec(executionInput.workflow);
  const existing =
    registry.byId.get(candidateSpec.id)?.spec ||
    registry.bySignature.get(candidateSpec.signatureHash)?.spec ||
    null;

  const base = existing
    ? normalizeWorkflowSpec({
        ...existing,
        examplePrompts: [...existing.examplePrompts, ...(candidateSpec.examplePrompts || [])],
        notes: [...existing.notes, ...(candidateSpec.notes || [])],
        tags: [...existing.tags, ...(candidateSpec.tags || [])],
      })
    : candidateSpec;

  const success = executionInput.success === true;
  const verified = executionInput.verified === true;
  const verificationStrength = executionInput.verificationStrength || "none";
  const timestamp = executionInput.at || nowIso();
  const next = normalizeWorkflowSpec({
    ...base,
    status: base.status || "candidate",
    source: base.source || executionInput.source || "model_planned",
    successCount: base.successCount + (success ? 1 : 0),
    failureCount: base.failureCount + (success ? 0 : 1),
    lastSuccessAt: success ? timestamp : base.lastSuccessAt,
    lastFailureAt: success ? base.lastFailureAt : timestamp,
    confidence: computeNextConfidence(base, { success, verified, verificationStrength }),
    reflection: {
      summary: String(executionInput?.reflection?.summary || base?.reflection?.summary || "").trim(),
      ambiguity: executionInput?.reflection?.ambiguity || base?.reflection?.ambiguity || [],
      improvements: executionInput?.reflection?.improvements || base?.reflection?.improvements || [],
      reusable: executionInput?.reflection?.reusable ?? base?.reflection?.reusable ?? true,
    },
    notes: [
      ...base.notes,
      ...(executionInput.note ? [String(executionInput.note)] : []),
      ...(executionInput?.reflection?.summary ? [String(executionInput.reflection.summary)] : []),
    ].slice(-12),
  });

  const transitioned = maybeTransitionWorkflowStatus(next, config, { success, verified });
  const saved = persistWorkflowSpec(transitioned);
  if (saved.spec.status !== (existing?.status || candidateSpec.status)) {
    appendJsonLine(saved.paths.promotionsLogFile, {
      at: timestamp,
      workflowId: saved.spec.id,
      fromStatus: existing?.status || candidateSpec.status || "candidate",
      toStatus: saved.spec.status,
      success,
      verified,
      verificationStrength,
    });
  }
  return {
    spec: saved.spec,
    filePath: saved.filePath,
    existed: Boolean(existing),
    transitioned: saved.spec.status !== (existing?.status || candidateSpec.status || "candidate"),
  };
}

export function instantiateReusableWorkflow(match, slotValues = {}) {
  if (!match?.spec) return null;
  return instantiateWorkflowSpec(match.spec, slotValues);
}

export function getWorkflowRegistrySummary() {
  const registry = loadWorkflowRegistry();
  const catalog = buildCatalogPayload(registry);
  return {
    ...catalog,
    flags: getWorkflowRuntimeConfig().flags,
  };
}

