import type {
  ChatReplyClassifierCategory,
  ChatExecutionDiagnostics,
  GroundingSummary,
  PromptEvaluationCaseInput,
  PromptEvaluationCaseResult,
  PromptEvaluationCheck,
  PromptEvaluationCheckResult,
  PromptEvaluationComparison,
  PromptEvaluationGroundingExpectations,
  PromptEvaluationResponse,
  PromptEvaluationRoutingExpectations,
  PromptEvaluationRoutingReport
} from "@contracts";

const capitalize = (value: string): string =>
  value.length > 0 ? `${value.slice(0, 1).toUpperCase()}${value.slice(1)}` : value;

const normalizeQuery = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const containsNormalizedPhrase = (text: string, phrase: string): boolean => {
  const normalizedText = ` ${normalizeQuery(text)} `;
  const normalizedPhrase = normalizeQuery(phrase);
  if (!normalizedPhrase) {
    return false;
  }

  return normalizedText.includes(` ${normalizedPhrase} `);
};

const normalizeLine = (value: string): string => value.replace(/\s+/g, " ").trim();

const countBulletLines = (value: string): number =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^(?:[-*•]|\d+\.)\s+/.test(line)).length;

const countSentences = (value: string): number => {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return 0;
  }

  const matches = normalized.match(/[^.!?]+[.!?]+/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [];
  if (matches.length > 0) {
    const matchedLength = matches.join(" ").length;
    const remainder = normalized.slice(matchedLength).trim();
    return matches.length + (remainder.length > 0 ? 1 : 0);
  }

  return 1;
};

const cloneChecks = (checks: PromptEvaluationCheck[] | undefined): PromptEvaluationCheck[] =>
  (checks ?? []).map((check) => ({
    ...check,
    values: check.values ? [...check.values] : undefined
  }));

const defaultCheckCategory = (check: PromptEvaluationCheck): PromptEvaluationCheckResult["category"] =>
  check.category ??
  (check.kind === "bullet-count" ||
  check.kind === "sentence-count" ||
  check.kind === "line-prefixes"
    ? "format"
    : "content");

const cloneRoutingExpectations = (
  expectations: PromptEvaluationRoutingExpectations | undefined
): PromptEvaluationRoutingExpectations | undefined =>
  expectations
    ? {
        ...expectations,
        classifierCategories: expectations.classifierCategories
          ? { ...expectations.classifierCategories }
          : undefined
      }
    : undefined;

const cloneGroundingExpectations = (
  expectations: PromptEvaluationGroundingExpectations | undefined
): PromptEvaluationGroundingExpectations | undefined =>
  expectations
    ? {
        ...expectations
      }
    : undefined;

export const normalizePromptEvaluationCases = (
  cases: PromptEvaluationCaseInput[]
): PromptEvaluationCaseInput[] =>
  cases
    .map((entry, index) => ({
      id: entry.id?.trim() || `prompt-${index + 1}`,
      label: entry.label?.trim() || `${capitalize(entry.difficulty)} prompt`,
      difficulty: entry.difficulty,
      prompt: entry.prompt.trim(),
      reasoningProfile: entry.reasoningProfile,
      planningPolicy: entry.planningPolicy,
      checks: cloneChecks(entry.checks).map((check, checkIndex) => ({
        id: check.id?.trim() || `${entry.id?.trim() || `prompt-${index + 1}`}-check-${checkIndex + 1}`,
        kind: check.kind,
        description: check.description?.trim() || `Check ${checkIndex + 1}`,
        category: check.category,
        values: check.values?.map((value) => value.trim()).filter(Boolean),
        exact: check.exact,
        min: check.min,
        max: check.max
      })),
      sourceScopeHint: entry.sourceScopeHint,
      formatPolicy: entry.formatPolicy,
      replyPolicy: entry.replyPolicy ? { ...entry.replyPolicy } : undefined,
      routingExpectations: cloneRoutingExpectations(entry.routingExpectations),
      groundingExpectations: cloneGroundingExpectations(entry.groundingExpectations)
    }))
    .filter((entry) => entry.prompt.length > 0);

export const buildPromptEvaluationRoutingReport = (
  diagnostics: ChatExecutionDiagnostics | undefined
): PromptEvaluationRoutingReport => ({
  reasoningProfile: diagnostics?.reasoningProfile ?? "chat",
  planningPolicy: diagnostics?.planningPolicy ?? null,
  routeFamily: diagnostics?.routeFamily ?? "none",
  routeMode: diagnostics?.routeDecision?.mode ?? null,
  routeConfidence: diagnostics?.routeConfidence ?? null,
  rawRouteFamily: diagnostics?.rawRouteFamily ?? "none",
  rawRouteConfidence: diagnostics?.rawRouteConfidence ?? null,
  awarenessUsed: diagnostics?.awarenessUsed ?? false,
  deterministicAwareness: diagnostics?.deterministicAwareness ?? false,
  genericWritingPromptSuppressed: diagnostics?.genericWritingPromptSuppressed ?? false,
  codingMode: diagnostics?.routeDecision?.codingMode ?? false,
  highQualityMode: diagnostics?.routeDecision?.highQualityMode ?? false,
  selectedTaskSkillIds: diagnostics?.routeDecision?.selectedTaskSkillIds ?? [],
  sourceScope: diagnostics?.sourceScope ?? null,
  replyPolicy: diagnostics?.replyPolicy ?? null,
  policyDiagnostics: diagnostics?.policyDiagnostics ?? null,
  cleanupBypassed: diagnostics?.cleanupBypassed ?? false,
  routingSuppressionReason: diagnostics?.routingSuppressionReason ?? null,
  retrievedSourceSummary: diagnostics?.retrievedSourceSummary ?? null,
  reasoningMode: diagnostics?.reasoningMode ?? null
});

export const countPromptEvaluationAssertions = (entry: PromptEvaluationCaseInput): number => {
  const routingExpectations = entry.routingExpectations ?? {};
  const profileExpectationCount =
    (routingExpectations.reasoningProfile !== undefined ? 1 : 0) +
    (routingExpectations.planningPolicy !== undefined ? 1 : 0);
  const classifierExpectationCount = Object.values(
    routingExpectations.classifierCategories ?? {}
  ).filter((value) => value !== undefined).length;
  const routingExpectationCount =
    Object.entries(routingExpectations).filter(
      ([key, value]) =>
        key !== "classifierCategories" &&
        key !== "reasoningProfile" &&
        key !== "planningPolicy" &&
        value !== undefined
    ).length + classifierExpectationCount;
  const groundingExpectationCount = Object.values(entry.groundingExpectations ?? {}).filter(
    (value) => value !== undefined
  ).length;
  return (
    (entry.checks?.length ?? 0) +
    routingExpectationCount +
    profileExpectationCount +
    groundingExpectationCount +
    (entry.sourceScopeHint ? 1 : 0) +
    (entry.formatPolicy ? 1 : 0)
  );
};

const buildSkippedCheckResults = (entry: PromptEvaluationCaseInput): PromptEvaluationCheckResult[] => {
  const textChecks = (entry.checks ?? []).map((check) => ({
    id: check.id,
    description: check.description,
    passed: false,
    detail: "Skipped because the prompt returned an error.",
    category: defaultCheckCategory(check)
  }));

  const routingExpectations = entry.routingExpectations ?? {};
  const routingChecks: PromptEvaluationCheckResult[] = [];

  if (routingExpectations.routeFamily !== undefined) {
    routingChecks.push({
      id: `${entry.id}-route-family`,
      description: `Expected route family ${routingExpectations.routeFamily}.`,
      passed: false,
      detail: "Skipped because the prompt returned an error.",
      category: "routing"
    });
  }
  if (routingExpectations.routeMode !== undefined) {
    routingChecks.push({
      id: `${entry.id}-route-mode`,
      description: `Expected route mode ${routingExpectations.routeMode}.`,
      passed: false,
      detail: "Skipped because the prompt returned an error.",
      category: "routing"
    });
  }
  if (routingExpectations.awarenessUsed !== undefined) {
    routingChecks.push({
      id: `${entry.id}-awareness-used`,
      description: `Expected awareness used = ${routingExpectations.awarenessUsed ? "yes" : "no"}.`,
      passed: false,
      detail: "Skipped because the prompt returned an error.",
      category: "routing"
    });
  }
  if (routingExpectations.deterministicAwareness !== undefined) {
    routingChecks.push({
      id: `${entry.id}-deterministic-awareness`,
      description: `Expected deterministic awareness = ${routingExpectations.deterministicAwareness ? "yes" : "no"}.`,
      passed: false,
      detail: "Skipped because the prompt returned an error.",
      category: "routing"
    });
  }
  if (routingExpectations.genericWritingPromptSuppressed !== undefined) {
    routingChecks.push({
      id: `${entry.id}-generic-writing-suppressed`,
      description: `Expected generic writing suppression = ${routingExpectations.genericWritingPromptSuppressed ? "yes" : "no"}.`,
      passed: false,
      detail: "Skipped because the prompt returned an error.",
      category: "routing"
    });
  }
  if (routingExpectations.codingMode !== undefined) {
    routingChecks.push({
      id: `${entry.id}-coding-mode`,
      description: `Expected coding mode = ${routingExpectations.codingMode ? "yes" : "no"}.`,
      passed: false,
      detail: "Skipped because the prompt returned an error.",
      category: "routing"
    });
  }
  if (routingExpectations.highQualityMode !== undefined) {
    routingChecks.push({
      id: `${entry.id}-high-quality-mode`,
      description: `Expected high quality mode = ${routingExpectations.highQualityMode ? "yes" : "no"}.`,
      passed: false,
      detail: "Skipped because the prompt returned an error.",
      category: "routing"
    });
  }
  if (routingExpectations.selectedTaskSkillIds !== undefined) {
    routingChecks.push({
      id: `${entry.id}-task-skills`,
      description: `Expected task skills ${routingExpectations.selectedTaskSkillIds.join(", ")}.`,
      passed: false,
      detail: "Skipped because the prompt returned an error.",
      category: "routing"
    });
  }
  if (routingExpectations.reasoningProfile !== undefined) {
    routingChecks.push({
      id: `${entry.id}-reasoning-profile`,
      description: `Expected reasoning profile ${routingExpectations.reasoningProfile}.`,
      passed: false,
      detail: "Skipped because the prompt returned an error.",
      category: "routing"
    });
  }
  if (routingExpectations.planningPolicy !== undefined) {
    routingChecks.push({
      id: `${entry.id}-planning-policy`,
      description: `Expected planning policy ${routingExpectations.planningPolicy}.`,
      passed: false,
      detail: "Skipped because the prompt returned an error.",
      category: "routing"
    });
  }
  for (const [category, expected] of Object.entries(
    routingExpectations.classifierCategories ?? {}
  ) as Array<[ChatReplyClassifierCategory, boolean | undefined]>) {
    if (expected === undefined) {
      continue;
    }
    routingChecks.push({
      id: `${entry.id}-classifier-${category}`,
      description: `Expected classifier ${category} = ${expected ? "yes" : "no"}.`,
      passed: false,
      detail: "Skipped because the prompt returned an error.",
      category: "routing"
    });
  }
  if (entry.sourceScopeHint !== undefined) {
    routingChecks.push({
      id: `${entry.id}-source-scope`,
      description: `Expected source scope ${entry.sourceScopeHint}.`,
      passed: false,
      detail: "Skipped because the prompt returned an error.",
      category: "source-scope"
    });
  }
  if (entry.formatPolicy !== undefined) {
    routingChecks.push({
      id: `${entry.id}-format-policy`,
      description: `Expected format policy ${entry.formatPolicy}.`,
      passed: false,
      detail: "Skipped because the prompt returned an error.",
      category: "format"
    });
  }

  const groundingExpectations = entry.groundingExpectations ?? {};
  const groundingChecks: PromptEvaluationCheckResult[] = [];

  if (groundingExpectations.minGroundedClaims !== undefined) {
    groundingChecks.push({
      id: `${entry.id}-grounded-claims`,
      description: `Expected at least ${groundingExpectations.minGroundedClaims} grounded claims.`,
      passed: false,
      detail: "Skipped because the prompt returned an error.",
      category: "grounding"
    });
  }
  if (groundingExpectations.maxUnsupportedClaims !== undefined) {
    groundingChecks.push({
      id: `${entry.id}-unsupported-claims`,
      description: `Expected unsupported claims <= ${groundingExpectations.maxUnsupportedClaims}.`,
      passed: false,
      detail: "Skipped because the prompt returned an error.",
      category: "unsupported-claim"
    });
  }
  if (groundingExpectations.maxConflictedClaims !== undefined) {
    groundingChecks.push({
      id: `${entry.id}-conflicted-claims`,
      description: `Expected conflicted claims <= ${groundingExpectations.maxConflictedClaims}.`,
      passed: false,
      detail: "Skipped because the prompt returned an error.",
      category: "grounding"
    });
  }
  if (groundingExpectations.minCitationCoverage !== undefined) {
    groundingChecks.push({
      id: `${entry.id}-citation-coverage`,
      description: `Expected citation coverage >= ${Math.round(groundingExpectations.minCitationCoverage * 100)}%.`,
      passed: false,
      detail: "Skipped because the prompt returned an error.",
      category: "grounding"
    });
  }

  return [...textChecks, ...routingChecks, ...groundingChecks];
};

const evaluateClassifierCategoryExpectations = (
  entry: PromptEvaluationCaseInput,
  routing: PromptEvaluationRoutingReport
): PromptEvaluationCheckResult[] =>
  (Object.entries(entry.routingExpectations?.classifierCategories ?? {}) as Array<
    [ChatReplyClassifierCategory, boolean | undefined]
  >)
    .filter(([, expected]) => expected !== undefined)
    .map(([category, expected]) => {
      const actual = routing.policyDiagnostics?.classifier.categories[category] ?? false;
      return {
        id: `${entry.id}-classifier-${category}`,
        description: `Expected classifier ${category} = ${expected ? "yes" : "no"}.`,
        passed: actual === expected,
        detail: `Actual classifier ${category}: ${actual ? "yes" : "no"}.`,
        category: "routing"
      };
    });

const evaluatePromptCheck = (reply: string, check: PromptEvaluationCheck): PromptEvaluationCheckResult => {
  const normalizedValues = (check.values ?? []).map((value) => value.trim()).filter(Boolean);

  switch (check.kind) {
    case "includes-all": {
      const matched = normalizedValues.filter((value) => containsNormalizedPhrase(reply, value));
      const passed = matched.length === normalizedValues.length;
      return {
        id: check.id,
        description: check.description,
        passed,
        category: defaultCheckCategory(check),
        detail: passed
          ? `Found all ${normalizedValues.length} required phrases.`
          : `Found ${matched.length}/${normalizedValues.length} required phrases.`
      };
    }
    case "includes-any": {
      const matched = normalizedValues.find((value) => containsNormalizedPhrase(reply, value)) ?? null;
      return {
        id: check.id,
        description: check.description,
        passed: matched !== null,
        category: defaultCheckCategory(check),
        detail: matched ? `Matched phrase: ${matched}.` : "No allowed phrase was found."
      };
    }
    case "excludes-all": {
      const blocked = normalizedValues.filter((value) => containsNormalizedPhrase(reply, value));
      return {
        id: check.id,
        description: check.description,
        passed: blocked.length === 0,
        category: defaultCheckCategory(check),
        detail:
          blocked.length === 0
            ? "No blocked phrases found."
            : `Blocked phrases found: ${blocked.join(", ")}.`
      };
    }
    case "bullet-count": {
      const bulletCount = countBulletLines(reply);
      const min = check.exact ?? check.min ?? 0;
      const max = check.exact ?? check.max ?? Number.POSITIVE_INFINITY;
      const passed = bulletCount >= min && bulletCount <= max;
      const expectedLabel =
        check.exact != null
          ? `exactly ${check.exact}`
          : `${check.min ?? 0}${check.max != null ? ` to ${check.max}` : "+"}`;
      return {
        id: check.id,
        description: check.description,
        passed,
        category: defaultCheckCategory(check),
        detail: `Found ${bulletCount} bullets. Expected ${expectedLabel}.`
      };
    }
    case "sentence-count": {
      const sentenceCount = countSentences(reply);
      const min = check.exact ?? check.min ?? 0;
      const max = check.exact ?? check.max ?? Number.POSITIVE_INFINITY;
      const passed = sentenceCount >= min && sentenceCount <= max;
      const expectedLabel =
        check.exact != null
          ? `exactly ${check.exact}`
          : `${check.min ?? 0}${check.max != null ? ` to ${check.max}` : "+"}`;
      return {
        id: check.id,
        description: check.description,
        passed,
        category: defaultCheckCategory(check),
        detail: `Found ${sentenceCount} sentences. Expected ${expectedLabel}.`
      };
    }
    case "line-prefixes": {
      const lines = reply
        .split(/\r?\n/)
        .map((line) => normalizeLine(line))
        .filter(Boolean);
      const matched = normalizedValues.filter((value, index) => lines[index]?.startsWith(value));
      const passed = matched.length === normalizedValues.length;
      return {
        id: check.id,
        description: check.description,
        passed,
        category: defaultCheckCategory(check),
        detail: passed
          ? `Matched all ${normalizedValues.length} line prefixes in order.`
          : `Matched ${matched.length}/${normalizedValues.length} line prefixes in order.`
      };
    }
  }
};

const evaluateRoutingExpectations = (
  entry: PromptEvaluationCaseInput,
  routing: PromptEvaluationRoutingReport
): PromptEvaluationCheckResult[] => {
  const expectations = entry.routingExpectations ?? {};
  const results: PromptEvaluationCheckResult[] = [];

  if (expectations.routeFamily !== undefined) {
    results.push({
      id: `${entry.id}-route-family`,
      description: `Expected route family ${expectations.routeFamily}.`,
      passed: routing.routeFamily === expectations.routeFamily,
      detail: `Actual route family: ${routing.routeFamily}.`,
      category: "routing"
    });
  }
  if (expectations.routeMode !== undefined) {
    results.push({
      id: `${entry.id}-route-mode`,
      description: `Expected route mode ${expectations.routeMode}.`,
      passed: routing.routeMode === expectations.routeMode,
      detail: `Actual route mode: ${routing.routeMode ?? "none"}.`,
      category: "routing"
    });
  }
  if (expectations.awarenessUsed !== undefined) {
    results.push({
      id: `${entry.id}-awareness-used`,
      description: `Expected awareness used = ${expectations.awarenessUsed ? "yes" : "no"}.`,
      passed: routing.awarenessUsed === expectations.awarenessUsed,
      detail: `Actual awareness used: ${routing.awarenessUsed ? "yes" : "no"}.`,
      category: "routing"
    });
  }
  if (expectations.deterministicAwareness !== undefined) {
    results.push({
      id: `${entry.id}-deterministic-awareness`,
      description: `Expected deterministic awareness = ${expectations.deterministicAwareness ? "yes" : "no"}.`,
      passed: routing.deterministicAwareness === expectations.deterministicAwareness,
      detail: `Actual deterministic awareness: ${routing.deterministicAwareness ? "yes" : "no"}.`,
      category: "routing"
    });
  }
  if (expectations.genericWritingPromptSuppressed !== undefined) {
    results.push({
      id: `${entry.id}-generic-writing-suppressed`,
      description: `Expected generic writing suppression = ${expectations.genericWritingPromptSuppressed ? "yes" : "no"}.`,
      passed: routing.genericWritingPromptSuppressed === expectations.genericWritingPromptSuppressed,
      detail: `Actual generic writing suppression: ${routing.genericWritingPromptSuppressed ? "yes" : "no"}.`,
      category: "routing"
    });
  }
  if (expectations.codingMode !== undefined) {
    results.push({
      id: `${entry.id}-coding-mode`,
      description: `Expected coding mode = ${expectations.codingMode ? "yes" : "no"}.`,
      passed: routing.codingMode === expectations.codingMode,
      detail: `Actual coding mode: ${routing.codingMode ? "yes" : "no"}.`,
      category: "routing"
    });
  }
  if (expectations.highQualityMode !== undefined) {
    results.push({
      id: `${entry.id}-high-quality-mode`,
      description: `Expected high quality mode = ${expectations.highQualityMode ? "yes" : "no"}.`,
      passed: routing.highQualityMode === expectations.highQualityMode,
      detail: `Actual high quality mode: ${routing.highQualityMode ? "yes" : "no"}.`,
      category: "routing"
    });
  }
  if (expectations.selectedTaskSkillIds !== undefined) {
    const expected = expectations.selectedTaskSkillIds.join("|");
    const actual = routing.selectedTaskSkillIds.join("|");
    results.push({
      id: `${entry.id}-task-skills`,
      description: `Expected task skills ${expectations.selectedTaskSkillIds.join(", ")}.`,
      passed: expected === actual,
      detail: `Actual task skills: ${routing.selectedTaskSkillIds.join(", ") || "none"}.`,
      category: "routing"
    });
  }
  if (expectations.reasoningProfile !== undefined) {
    results.push({
      id: `${entry.id}-reasoning-profile`,
      description: `Expected reasoning profile ${expectations.reasoningProfile}.`,
      passed: routing.reasoningProfile === expectations.reasoningProfile,
      detail: `Actual reasoning profile: ${routing.reasoningProfile}.`,
      category: "routing"
    });
  }
  if (expectations.planningPolicy !== undefined) {
    results.push({
      id: `${entry.id}-planning-policy`,
      description: `Expected planning policy ${expectations.planningPolicy}.`,
      passed: routing.planningPolicy === expectations.planningPolicy,
      detail: `Actual planning policy: ${routing.planningPolicy ?? "none"}.`,
      category: "routing"
    });
  }
  results.push(...evaluateClassifierCategoryExpectations(entry, routing));
  if (entry.sourceScopeHint !== undefined) {
    results.push({
      id: `${entry.id}-source-scope`,
      description: `Expected source scope ${entry.sourceScopeHint}.`,
      passed: routing.sourceScope === entry.sourceScopeHint,
      detail: `Actual source scope: ${routing.sourceScope ?? "none"}.`,
      category: "source-scope"
    });
  }
  if (entry.formatPolicy !== undefined) {
    results.push({
      id: `${entry.id}-format-policy`,
      description: `Expected format policy ${entry.formatPolicy}.`,
      passed: routing.replyPolicy?.formatPolicy === entry.formatPolicy,
      detail: `Actual format policy: ${routing.replyPolicy?.formatPolicy ?? "none"}.`,
      category: "format"
    });
  }

  return results;
};

const evaluateGroundingExpectations = (
  entry: PromptEvaluationCaseInput,
  groundingSummary: GroundingSummary | null | undefined
): PromptEvaluationCheckResult[] => {
  const expectations = entry.groundingExpectations ?? {};
  const results: PromptEvaluationCheckResult[] = [];
  const missingGrounding = groundingSummary == null;

  if (expectations.minGroundedClaims !== undefined) {
    results.push({
      id: `${entry.id}-grounded-claims`,
      description: `Expected at least ${expectations.minGroundedClaims} grounded claims.`,
      passed:
        !missingGrounding &&
        groundingSummary.groundedClaimCount >= expectations.minGroundedClaims,
      category: "grounding",
      detail: missingGrounding
        ? "No grounding summary was available."
        : `Actual grounded claims: ${groundingSummary.groundedClaimCount}.`
    });
  }
  if (expectations.maxUnsupportedClaims !== undefined) {
    results.push({
      id: `${entry.id}-unsupported-claims`,
      description: `Expected unsupported claims <= ${expectations.maxUnsupportedClaims}.`,
      passed:
        !missingGrounding &&
        groundingSummary.unsupportedClaimCount <= expectations.maxUnsupportedClaims,
      category: "unsupported-claim",
      detail: missingGrounding
        ? "No grounding summary was available."
        : `Actual unsupported claims: ${groundingSummary.unsupportedClaimCount}.`
    });
  }
  if (expectations.maxConflictedClaims !== undefined) {
    results.push({
      id: `${entry.id}-conflicted-claims`,
      description: `Expected conflicted claims <= ${expectations.maxConflictedClaims}.`,
      passed:
        !missingGrounding &&
        groundingSummary.conflictedClaimCount <= expectations.maxConflictedClaims,
      category: "grounding",
      detail: missingGrounding
        ? "No grounding summary was available."
        : `Actual conflicted claims: ${groundingSummary.conflictedClaimCount}.`
    });
  }
  if (expectations.minCitationCoverage !== undefined) {
    results.push({
      id: `${entry.id}-citation-coverage`,
      description: `Expected citation coverage >= ${Math.round(expectations.minCitationCoverage * 100)}%.`,
      passed:
        !missingGrounding &&
        groundingSummary.citationCoverage >= expectations.minCitationCoverage,
      category: "grounding",
      detail: missingGrounding
        ? "No grounding summary was available."
        : `Actual citation coverage: ${Math.round(groundingSummary.citationCoverage * 100)}%.`
    });
  }

  return results;
};

export const evaluatePromptEvaluationCase = (
  entry: PromptEvaluationCaseInput,
  reply: string,
  routing: PromptEvaluationRoutingReport,
  status: PromptEvaluationCaseResult["status"],
  groundingSummary: GroundingSummary | null | undefined
): Pick<PromptEvaluationCaseResult, "checkResults" | "qualityStatus"> => {
  const totalAssertions = countPromptEvaluationAssertions(entry);
  if (status === "error") {
    return {
      checkResults: buildSkippedCheckResults(entry),
      qualityStatus: "needs-review"
    };
  }

  const checkResults = [
    ...(entry.checks ?? []).map((check) => evaluatePromptCheck(reply, check)),
    ...evaluateRoutingExpectations(entry, routing),
    ...evaluateGroundingExpectations(entry, groundingSummary)
  ];

  if (totalAssertions === 0) {
    return {
      checkResults,
      qualityStatus: "needs-review"
    };
  }

  return {
    checkResults,
    qualityStatus: checkResults.some((check) => !check.passed) ? "needs-review" : "passed"
  };
};

export const buildPromptEvaluationComparison = (
  current: PromptEvaluationResponse,
  previous: PromptEvaluationResponse | null
): PromptEvaluationComparison | null => {
  if (!previous) {
    return null;
  }

  const previousCases = new Map(previous.cases.map((entry) => [entry.id, entry]));
  const currentCaseIds = new Set(current.cases.map((entry) => entry.id));

  return {
    previousGeneratedAt: previous.generatedAt,
    previousReportFileName: previous.reportFileName,
    previousReportPath: previous.reportPath,
    summaryDelta: {
      total: current.summary.total - previous.summary.total,
      successCount: current.summary.successCount - previous.summary.successCount,
      errorCount: current.summary.errorCount - previous.summary.errorCount,
      qualityPassCount: current.summary.qualityPassCount - previous.summary.qualityPassCount,
      qualityNeedsReviewCount:
        current.summary.qualityNeedsReviewCount - previous.summary.qualityNeedsReviewCount
    },
    cases: current.cases.map((entry) => {
      const previousEntry = previousCases.get(entry.id) ?? null;
      const qualityChange =
        previousEntry === null
          ? "new"
          : previousEntry.qualityStatus === entry.qualityStatus
            ? "unchanged"
            : previousEntry.qualityStatus === "needs-review" && entry.qualityStatus === "passed"
              ? "improved"
              : "regressed";

      return {
        caseId: entry.id,
        label: entry.label,
        previousLabel: previousEntry?.label ?? null,
        qualityChange,
        durationDeltaMs: previousEntry ? entry.durationMs - previousEntry.durationMs : null,
        previousRouteFamily: previousEntry?.routing.routeFamily ?? null,
        currentRouteFamily: entry.routing.routeFamily,
        routeChanged:
          previousEntry !== null && previousEntry.routing.routeFamily !== entry.routing.routeFamily,
        replyChanged: previousEntry !== null ? previousEntry.reply !== entry.reply : false
      };
    }),
    removedCases: previous.cases
      .filter((entry) => !currentCaseIds.has(entry.id))
      .map((entry) => ({
        caseId: entry.id,
        label: entry.label
      }))
  };
};
