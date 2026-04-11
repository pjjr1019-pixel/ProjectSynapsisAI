import { access, stat } from "node:fs/promises";
import * as path from "node:path";
import type {
  DesktopActionResult,
  FileAwarenessSummary,
  MachineAwarenessSnapshot,
  ScreenAwarenessSnapshot,
  WorkflowExecutionResult
} from "@contracts";
import type { GovernedTaskPlanResult, GovernedTaskVerification } from "./types";

const summarize = (parts: Array<string | null | undefined>): string =>
  parts.filter((value): value is string => Boolean(value)).join(" | ") || "Verification unavailable.";

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const containsAny = (value: string, needles: string[]): boolean =>
  needles.some((needle) => value.includes(needle));

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const findMatchingService = (
  services: MachineAwarenessSnapshot["serviceSnapshot"]["services"],
  target: string
): MachineAwarenessSnapshot["serviceSnapshot"]["services"][number] | null => {
  const normalizedTarget = normalize(target);
  const exact = services.find(
    (service) =>
      normalize(service.serviceName) === normalizedTarget || normalize(service.displayName) === normalizedTarget
  );
  if (exact) {
    return exact;
  }

  const partial = services.find((service) => {
    const haystack = `${service.serviceName} ${service.displayName}`;
    return normalize(haystack).includes(normalizedTarget) || normalizedTarget.includes(normalize(haystack));
  });
  return partial ?? null;
};

const verifyServiceState = (kind: string, state: string): boolean => {
  const normalizedState = normalize(state);
  if (kind === "start-service" || kind === "restart-service") {
    return containsAny(normalizedState, ["running", "started", "start"]);
  }
  if (kind === "stop-service") {
    return containsAny(normalizedState, ["stopped", "stop", "disabled"]);
  }
  return normalizedState.length > 0;
};

const verifyDesktopActionFileMutation = async (
  route: GovernedTaskPlanResult,
  result: DesktopActionResult
): Promise<GovernedTaskVerification> => {
  const target = result.target;
  const destination = typeof result.output === "object" && result.output !== null
    ? (result.output as Record<string, unknown>).destination
    : null;

  if (route.actionType === "desktop-file-mutation" || route.actionType === "desktop-action") {
    if (result.kind === "create-file" || result.kind === "create-folder") {
      const exists = await fileExists(target);
      return {
        passed: exists && result.status !== "failed" && result.status !== "blocked" && result.status !== "denied",
        score: exists ? 1 : 0,
        reasons: exists ? ["Target path now exists."] : [`Target path missing after execution: ${target}`],
        evidence: [target],
        observed_state: { exists },
        expected_state_summary: `Target ${result.kind} should exist at ${target}.`
      };
    }

    if (result.kind === "rename-item" || result.kind === "move-item") {
      const destinationPath = typeof destination === "string" ? destination : null;
      const sourceExists = await fileExists(target);
      const destinationExists = destinationPath ? await fileExists(destinationPath) : false;
      const passed = !sourceExists && destinationExists;
      return {
        passed,
        score: passed ? 1 : 0,
        reasons: passed
          ? ["Source removed and destination exists."]
          : [`Rename/move verification failed for ${target}${destinationPath ? ` -> ${destinationPath}` : ""}`],
        evidence: [target, destinationPath ?? ""].filter(Boolean),
        observed_state: { sourceExists, destinationExists, destinationPath },
        expected_state_summary: `Source should be moved/renamed to ${destinationPath ?? "<destination>"}.`
      };
    }

    if (result.kind === "delete-file" || result.kind === "delete-folder") {
      const exists = await fileExists(target);
      return {
        passed: !exists,
        score: exists ? 0 : 1,
        reasons: exists ? [`Target still exists after delete: ${target}`] : ["Delete verification passed."],
        evidence: [target],
        observed_state: { exists },
        expected_state_summary: `Target ${target} should no longer exist.`
      };
    }
  }

  return {
    passed: result.status !== "failed" && result.status !== "blocked" && result.status !== "denied",
    score: result.status === "executed" || result.status === "simulated" ? 1 : 0,
    reasons:
      result.status === "executed" || result.status === "simulated"
        ? ["Desktop action completed."]
        : [result.error ?? result.summary],
    evidence: [result.summary],
    observed_state: result,
    expected_state_summary: `Desktop action ${result.kind} should complete successfully.`
  };
};

const verifyDesktopActionProcess = async (
  route: GovernedTaskPlanResult,
  result: DesktopActionResult,
  machineAwarenessAfter: MachineAwarenessSnapshot | null
): Promise<GovernedTaskVerification> => {
  const processName = result.kind === "terminate-process" ? result.target : null;
  if (!machineAwarenessAfter || !processName) {
    return {
      passed: result.status !== "failed" && result.status !== "blocked" && result.status !== "denied",
      score: result.status === "executed" || result.status === "simulated" ? 1 : 0.5,
      reasons: ["Process-state verification unavailable; using execution result only."],
      evidence: [result.summary],
      observed_state: result,
      expected_state_summary: `Process action ${result.kind} should complete successfully.`
    };
  }

  const pid = Number(processName);
  const processes = machineAwarenessAfter.processSnapshot.processes;
  const stillRunning = Number.isFinite(pid)
    ? processes.some((process) => process.pid === pid)
    : processes.some((process) => process.name.toLowerCase() === processName.toLowerCase());

  return {
    passed: !stillRunning && result.status === "executed",
    score: !stillRunning ? 1 : 0,
    reasons: !stillRunning ? ["Process no longer running."] : [`Process still running after termination: ${processName}`],
    evidence: [result.summary, machineAwarenessAfter.summary.machineName],
    observed_state: { stillRunning, processName, count: processes.length },
    expected_state_summary: `Process ${processName} should no longer be running.`
  };
};

const verifyDesktopActionService = async (
  _route: GovernedTaskPlanResult,
  result: DesktopActionResult,
  machineAwarenessAfter: MachineAwarenessSnapshot | null
): Promise<GovernedTaskVerification> => {
  const serviceName = result.target;
  const output = typeof result.output === "object" && result.output !== null ? (result.output as Record<string, unknown>) : null;
  const observedAfterState = typeof output?.after === "object" && output.after !== null ? (output.after as Record<string, unknown>) : null;
  const observedStateText =
    typeof observedAfterState?.state === "string"
      ? observedAfterState.state
      : typeof output?.state === "string"
        ? output.state
        : null;

  if (!machineAwarenessAfter) {
    return {
      passed: result.status !== "failed" && result.status !== "blocked" && result.status !== "denied",
      score: result.status === "executed" || result.status === "simulated" ? 1 : 0.5,
      reasons: ["Service-state verification unavailable; using execution result only."],
      evidence: [result.summary],
      observed_state: result,
      expected_state_summary: `Service action ${result.kind} should complete successfully.`
    };
  }

  const service = findMatchingService(machineAwarenessAfter.serviceSnapshot.services, serviceName);
  if (!service) {
    return {
      passed: result.status !== "failed" && result.status !== "blocked" && result.status !== "denied",
      score: result.status === "executed" || result.status === "simulated" ? 1 : 0.5,
      reasons: [`Service ${serviceName} could not be matched in the post-action snapshot.`],
      evidence: [result.summary],
      observed_state: { serviceName, output, machine: machineAwarenessAfter.summary.machineName },
      expected_state_summary: `Service ${serviceName} should reflect the requested state.`
    };
  }

  const stateMatches = verifyServiceState(result.kind, service.state) || (observedStateText ? verifyServiceState(result.kind, observedStateText) : false);

  return {
    passed: stateMatches && (result.status === "executed" || result.status === "simulated"),
    score: stateMatches ? 1 : 0,
    reasons: stateMatches
      ? [`Service ${service.displayName} is now ${service.state}.`]
      : [`Service ${service.displayName} did not reach the expected state.`],
    evidence: [result.summary, service.displayName, service.state],
    observed_state: {
      serviceName: service.serviceName,
      displayName: service.displayName,
      state: service.state,
      output
    },
    expected_state_summary:
      result.kind === "stop-service"
        ? `Service ${service.displayName} should be stopped.`
        : result.kind === "restart-service"
          ? `Service ${service.displayName} should be running after restart.`
          : `Service ${service.displayName} should be running.`
  };
};

const verifyDesktopActionRegistry = async (
  _route: GovernedTaskPlanResult,
  result: DesktopActionResult
): Promise<GovernedTaskVerification> => {
  const output = typeof result.output === "object" && result.output !== null ? (result.output as Record<string, unknown>) : null;
  const registryTarget = result.target;
  const valueName = typeof output?.valueName === "string" ? output.valueName : "Default";
  const passed = result.status !== "failed" && result.status !== "blocked" && result.status !== "denied";
  return {
    passed: passed && (result.status === "executed" || result.status === "simulated"),
    score: passed ? 1 : 0,
    reasons: passed
      ? [
          result.kind === "delete-registry-value"
            ? `Registry value ${valueName} under ${registryTarget} was deleted.`
            : `Registry value ${valueName} under ${registryTarget} was updated.`
        ]
      : [result.error ?? result.summary],
    evidence: [result.summary, registryTarget],
    observed_state: {
      target: registryTarget,
      valueName,
      output
    },
    expected_state_summary:
      result.kind === "delete-registry-value"
        ? `Registry value ${valueName} should be removed.`
        : `Registry value ${valueName} should be updated.`
  };
};

const verifyDesktopActionUi = async (
  _route: GovernedTaskPlanResult,
  result: DesktopActionResult,
  screenAwarenessAfter: ScreenAwarenessSnapshot | null
): Promise<GovernedTaskVerification> => {
  const output = typeof result.output === "object" && result.output !== null ? (result.output as Record<string, unknown>) : null;
  const outputTarget = typeof output?.target === "string" ? normalize(output.target) : null;
  const target = normalize(result.target);

  if (!screenAwarenessAfter) {
    return {
      passed: result.status !== "failed" && result.status !== "blocked" && result.status !== "denied",
      score: result.status === "executed" || result.status === "simulated" ? 1 : 0.5,
      reasons: ["Screen evidence unavailable; using action result only."],
      evidence: [result.summary],
      observed_state: result,
      expected_state_summary: `UI action ${result.kind} should complete successfully.`
    };
  }

  const focusedElement = screenAwarenessAfter.uiTree?.focusedElement ?? null;
  const focusedName = focusedElement?.name ? normalize(focusedElement.name) : null;
  const elementUnderCursor = screenAwarenessAfter.uiTree?.elementUnderCursor ?? null;
  const hoveredName = elementUnderCursor?.name ? normalize(elementUnderCursor.name) : null;
  const eventEvidence = screenAwarenessAfter.recentEvents.some((event) =>
    containsAny(event.type, ["click_observed", "active_window_changed", "ui_tree_refreshed", "hover_target_changed"])
  );
  const matchedTarget =
    Boolean(focusedName && focusedName.includes(target)) ||
    Boolean(hoveredName && hoveredName.includes(target)) ||
    Boolean(outputTarget && outputTarget.includes(target)) ||
    Boolean(target && (outputTarget ?? "").includes(target));

  return {
    passed:
      (result.status === "executed" || result.status === "simulated") &&
      (matchedTarget || eventEvidence || result.kind === "ui-hotkey"),
    score: matchedTarget || eventEvidence ? 1 : 0.5,
    reasons:
      result.status === "executed"
        ? matchedTarget || eventEvidence
          ? ["UI interaction is reflected in the screen snapshot."]
          : ["UI interaction completed, but the screen snapshot did not confirm a visible change."]
        : [result.error ?? result.summary],
    evidence: [
      result.summary,
      screenAwarenessAfter.summary.summary,
      focusedElement?.name ?? null,
      elementUnderCursor?.name ?? null
    ].filter((value): value is string => Boolean(value)),
    observed_state: {
      focusedElement: focusedElement?.name ?? null,
      elementUnderCursor: elementUnderCursor?.name ?? null,
      output,
      recentEvents: screenAwarenessAfter.recentEvents.slice(-3).map((event) => ({
        type: event.type,
        message: event.message
      }))
    },
    expected_state_summary:
      result.kind === "ui-type"
        ? `UI target ${result.target} should contain the typed text or reflect focus.`
        : `UI target ${result.target} should reflect the requested interaction.`
  };
};

const verifyWorkflowResult = async (
  route: GovernedTaskPlanResult,
  result: WorkflowExecutionResult
): Promise<GovernedTaskVerification> => {
  const artifactPaths = result.artifactPaths ?? [];
  const savedFiles = await Promise.all(artifactPaths.map(async (filePath) => fileExists(filePath)));
  const artifactPass = artifactPaths.length === 0 ? result.status !== "failed" : savedFiles.every(Boolean);
  const stepFailures = result.stepResults.filter((step) => step.status === "failed");
  const passed = artifactPass && stepFailures.length === 0 && result.status !== "failed" && result.status !== "blocked" && result.status !== "denied";

  return {
    passed,
    score: passed ? 1 : 0,
    reasons: passed
      ? ["Workflow completed and saved artifacts verified."]
      : [
          ...(stepFailures.length > 0 ? [`Failed workflow steps: ${stepFailures.map((step) => step.id).join(", ")}`] : []),
          ...(artifactPass ? [] : [`One or more workflow artifacts are missing: ${artifactPaths.join(", ")}`]),
          result.error ?? result.summary
        ].filter(Boolean),
    evidence: artifactPaths,
    observed_state: {
      artifactPaths,
      stepStatuses: result.stepResults.map((step) => `${step.id}:${step.status}`)
    },
    expected_state_summary: route.plan?.artifacts.length
      ? `Workflow should produce ${route.plan.artifacts.map((artifact) => artifact.fileName ?? artifact.kind).join(", ")}.`
      : "Workflow should complete successfully."
  };
};

export interface GovernedTaskVerificationInput {
  route: GovernedTaskPlanResult;
  executionResult: DesktopActionResult | WorkflowExecutionResult | null;
  machineAwarenessAfter?: MachineAwarenessSnapshot | null;
  fileAwarenessAfter?: FileAwarenessSummary | null;
  screenAwarenessAfter?: ScreenAwarenessSnapshot | null;
}

export const verifyGovernedTaskExecution = async (
  input: GovernedTaskVerificationInput
): Promise<GovernedTaskVerification> => {
  const { route, executionResult, machineAwarenessAfter, screenAwarenessAfter } = input;
  if (!executionResult) {
    return {
      passed: false,
      score: 0,
      reasons: ["No execution result was produced."],
      evidence: [],
      observed_state: null,
      expected_state_summary: "A task execution result is required."
    };
  }

  if ("plan" in executionResult) {
    return verifyWorkflowResult(route, executionResult as WorkflowExecutionResult);
  }

  const desktopResult = executionResult as DesktopActionResult;
  if (route.actionType?.includes("process") || route.actionType?.includes("uninstall")) {
    return verifyDesktopActionProcess(route, desktopResult, machineAwarenessAfter ?? null);
  }

  if (
    route.actionType?.includes("service") ||
    desktopResult.kind === "start-service" ||
    desktopResult.kind === "stop-service" ||
    desktopResult.kind === "restart-service"
  ) {
    return verifyDesktopActionService(route, desktopResult, machineAwarenessAfter ?? null);
  }

  if (
    route.actionType?.includes("registry") ||
    desktopResult.kind === "set-registry-value" ||
    desktopResult.kind === "delete-registry-value"
  ) {
    return verifyDesktopActionRegistry(route, desktopResult);
  }

  if (route.actionType?.includes("ui") || desktopResult.kind === "ui-click" || desktopResult.kind === "ui-type" || desktopResult.kind === "ui-hotkey") {
    return verifyDesktopActionUi(route, desktopResult, screenAwarenessAfter ?? null);
  }

  if (route.actionType?.includes("workflow")) {
    return {
      passed: desktopResult.status !== "failed" && desktopResult.status !== "blocked" && desktopResult.status !== "denied",
      score: desktopResult.status === "executed" || desktopResult.status === "simulated" ? 1 : 0,
      reasons:
        desktopResult.status === "executed" || desktopResult.status === "simulated"
          ? ["Workflow-style desktop action completed."]
          : [desktopResult.error ?? desktopResult.summary],
      evidence: [desktopResult.summary],
      observed_state: desktopResult,
      expected_state_summary: `Desktop action ${desktopResult.kind} should complete successfully.`
    };
  }

  return verifyDesktopActionFileMutation(route, desktopResult);
};

export const summarizeVerification = (verification: GovernedTaskVerification): string =>
  summarize([
    verification.passed ? "passed" : "failed",
    verification.reasons[0] ?? null,
    verification.expected_state_summary
  ]);
