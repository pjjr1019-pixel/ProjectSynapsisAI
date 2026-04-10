import type {
  ExecutionRequest,
  GovernanceDecision,
  PolicyRule,
  RiskClass
} from "../contracts";

const RISK_WEIGHT: Record<RiskClass, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
};

const toRiskClass = (candidate: string | undefined): RiskClass | null => {
  switch (candidate) {
    case "low":
    case "medium":
    case "high":
    case "critical":
      return candidate;
    default:
      return null;
  }
};

const normalizeCommand = (request: ExecutionRequest): string =>
  [request.command, ...(request.args ?? [])]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeMetadataString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim().toLowerCase() : null;

const isRegexMatch = (pattern: string, input: string): boolean => {
  try {
    return new RegExp(pattern, "i").test(input);
  } catch {
    return false;
  }
};

export const compareRiskClass = (left: RiskClass, right: RiskClass): number =>
  RISK_WEIGHT[left] - RISK_WEIGHT[right];

export const maxRiskClass = (left: RiskClass, right: RiskClass): RiskClass =>
  compareRiskClass(left, right) >= 0 ? left : right;

export const destructiveCommandPatterns: RegExp[] = [
  /\bremove-item\b/i,
  /\brm\b/i,
  /\bdel(?:ete)?\b/i,
  /\berase\b/i,
  /\bformat\b/i,
  /\breg\s+delete\b/i,
  /\btaskkill\b/i,
  /\bstop-process\b/i,
  /\bshutdown\b/i,
  /\brestart-computer\b/i
];

const highRiskPatterns: RegExp[] = [
  /\btaskkill\b/i,
  /\bstop-process\b/i,
  /\breg\b/i,
  /\bsc\b/i,
  /\bshutdown\b/i
];

const criticalRiskPatterns: RegExp[] = [
  /\bformat\b/i,
  /\breg\s+delete\b/i,
  /\bremove-item\b[^-]*-recurse/i,
  /\bdel\b.*\\windows\\/i
];

export const isDestructiveCommand = (command: string): boolean =>
  destructiveCommandPatterns.some((pattern) => pattern.test(command));

const destructiveActionKinds = new Set([
  "close-app",
  "terminate-process",
  "delete-file",
  "delete-folder",
  "start-service",
  "stop-service",
  "restart-service",
  "set-registry-value",
  "delete-registry-value",
  "uninstall-app"
]);

const criticalActionKinds = new Set(["delete-folder", "delete-registry-value"]);

const inferRiskClassFromMetadata = (request: ExecutionRequest): RiskClass => {
  const actionKind = normalizeMetadataString(request.actionKind) ?? normalizeMetadataString(request.metadata?.actionKind);
  const targetKind = normalizeMetadataString(request.targetKind) ?? normalizeMetadataString(request.metadata?.targetKind);
  const scope = normalizeMetadataString(request.scope) ?? normalizeMetadataString(request.metadata?.scope);
  const sandboxed = request.sandboxed ?? Boolean(request.metadata?.sandboxed);

  if (actionKind && criticalActionKinds.has(actionKind)) {
    return "critical";
  }
  if (actionKind && destructiveActionKinds.has(actionKind)) {
    return "high";
  }
  if (targetKind && ["service-name", "registry-key", "registry-value", "process-id", "process-name"].includes(targetKind)) {
    return "high";
  }
  if (scope && ["system", "process"].includes(scope)) {
    return sandboxed ? "high" : "critical";
  }
  return "low";
};

export const inferRiskClassFromCommand = (command: string): RiskClass => {
  if (criticalRiskPatterns.some((pattern) => pattern.test(command))) {
    return "critical";
  }
  if (highRiskPatterns.some((pattern) => pattern.test(command))) {
    return "high";
  }
  if (/\bcopy-item\b|\bmove-item\b|\bwritefile\b|\bset-itemproperty\b/i.test(command)) {
    return "medium";
  }
  return "low";
};

const matchesRule = (
  rule: PolicyRule,
  request: ExecutionRequest,
  command: string,
  effectiveRiskClass: RiskClass,
  destructive: boolean
): boolean => {
  if (typeof rule.destructive === "boolean" && rule.destructive !== destructive) {
    return false;
  }
  if (rule.commandRegex && !isRegexMatch(rule.commandRegex, command)) {
    return false;
  }
  if (rule.commandIncludes && rule.commandIncludes.length > 0) {
    const normalized = command.toLowerCase();
    const allFound = rule.commandIncludes.every((needle) =>
      normalized.includes(needle.toLowerCase())
    );
    if (!allFound) {
      return false;
    }
  }
  if (rule.actionKinds && rule.actionKinds.length > 0) {
    const actionKind = normalizeMetadataString(request.actionKind) ?? normalizeMetadataString(request.metadata?.actionKind);
    if (!actionKind || !rule.actionKinds.some((candidate) => candidate.toLowerCase() === actionKind)) {
      return false;
    }
  }
  if (rule.targetKinds && rule.targetKinds.length > 0) {
    const targetKind = normalizeMetadataString(request.targetKind) ?? normalizeMetadataString(request.metadata?.targetKind);
    if (!targetKind || !rule.targetKinds.some((candidate) => candidate.toLowerCase() === targetKind)) {
      return false;
    }
  }
  if (rule.scopes && rule.scopes.length > 0) {
    const scope = normalizeMetadataString(request.scope) ?? normalizeMetadataString(request.metadata?.scope);
    if (!scope || !rule.scopes.some((candidate) => candidate.toLowerCase() === scope)) {
      return false;
    }
  }
  if (rule.minRiskClass) {
    const minRisk = toRiskClass(rule.minRiskClass) ?? "low";
    if (compareRiskClass(effectiveRiskClass, minRisk) < 0) {
      return false;
    }
  }
  return true;
};

export const defaultPolicyRules: PolicyRule[] = [
  {
    id: "deny-critical-system-destruction",
    description: "Hard block direct OS destructive commands.",
    commandRegex: "(format\\s+\\w:|reg\\s+delete\\s+hklm|del\\s+/f\\s+/q\\s+c:\\\\windows)",
    outcome: "deny",
    reason: "Command matches critical destructive policy deny-list."
  },
  {
    id: "require-approval-destructive",
    description: "Any destructive mutation requires explicit signed approval.",
    destructive: true,
    outcome: "require-approval",
    reason: "Destructive commands are approval gated."
  },
  {
    id: "require-approval-high-risk",
    description: "High-risk execution requires explicit signed approval.",
    minRiskClass: "high",
    outcome: "require-approval",
    reason: "High-risk commands are approval gated."
  },
  {
    id: "allow-default",
    description: "Allow non-destructive and non-blocked commands.",
    outcome: "allow",
    reason: "No blocking or approval rule matched."
  }
];

export const evaluateGovernancePolicy = (
  request: ExecutionRequest,
  rules: PolicyRule[] = defaultPolicyRules
): GovernanceDecision => {
  const normalizedCommand = normalizeCommand(request);
  const inferredRisk = inferRiskClassFromCommand(normalizedCommand);
  const metadataRisk = inferRiskClassFromMetadata(request);
  const effectiveRiskClass = maxRiskClass(maxRiskClass(request.riskClass, inferredRisk), metadataRisk);
  const actionKind = normalizeMetadataString(request.actionKind) ?? normalizeMetadataString(request.metadata?.actionKind);
  const targetKind = normalizeMetadataString(request.targetKind) ?? normalizeMetadataString(request.metadata?.targetKind);
  const destructive =
    Boolean(request.destructive) ||
    isDestructiveCommand(normalizedCommand) ||
    Boolean(actionKind && destructiveActionKinds.has(actionKind)) ||
    Boolean(targetKind && ["service-name", "registry-key", "registry-value", "process-id", "process-name"].includes(targetKind));

  for (const rule of rules) {
    if (!matchesRule(rule, request, normalizedCommand, effectiveRiskClass, destructive)) {
      continue;
    }

    return {
      outcome: rule.outcome,
      destructive,
      riskClass: effectiveRiskClass,
      approvalRequired: rule.outcome === "require-approval",
      matchedRuleId: rule.id,
      reasons: [
        rule.reason,
        `Command: ${normalizedCommand}`,
        `Risk class: ${effectiveRiskClass}`,
        destructive ? "Destructive: yes" : "Destructive: no"
      ]
    };
  }

  return {
    outcome: "allow",
    destructive,
    riskClass: effectiveRiskClass,
    approvalRequired: false,
    matchedRuleId: null,
    reasons: [
      "No policy rules matched. Allowing by default.",
      `Command: ${normalizedCommand}`,
      `Risk class: ${effectiveRiskClass}`
    ]
  };
};
