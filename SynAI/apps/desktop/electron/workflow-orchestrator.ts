import { app } from "electron";
import { mkdir, writeFile } from "node:fs/promises";
import * as path from "node:path";
import type {
  ApprovalToken,
  DesktopActionProposal,
  DesktopActionRequest,
  DesktopActionResult,
  ExecutionVerificationRecord,
  ExecutionRollbackRecord,
  FileAwarenessSummary,
  MachineAwarenessSnapshot,
  ScreenAwarenessSnapshot,
  WorkflowExecutionRequest,
  WorkflowExecutionResult,
  WorkflowPlan,
  WorkflowProgressEvent,
  WorkflowStepPlan,
  WorkflowStepResult
} from "@contracts";
import {
  createApprovalLedger,
  createGovernanceCommandBus,
  hashGovernanceCommand,
  type ExecutionHandlerResult
} from "@governance-execution";
import type { GovernanceApprovalQueueStore } from "@governance-execution/approvals/queue";
import { resolveRecentWebContext } from "@web-search";
import { buildWorkflowPlan, type WorkflowPlanningContext } from "./workflow-planner";
import {
  createElectronWorkflowBrowserHost,
  type WorkflowBrowserHost,
  type WorkflowBrowserResult
} from "./browser-session";

interface WorkflowDesktopActions {
  listDesktopActions: () => DesktopActionProposal[];
  issueDesktopActionApproval: (
    request: DesktopActionRequest,
    approvedBy: string,
    ttlMs?: number
  ) => ApprovalToken;
  executeDesktopAction: (request: DesktopActionRequest) => Promise<DesktopActionResult>;
  rollbackDesktopAction: (commandId: string, approvedBy: string, dryRun?: boolean) => Promise<DesktopActionResult>;
}

export interface WorkflowOrchestratorOptions {
  workspaceRoot: string;
  runtimeRoot: string;
  desktopActions: WorkflowDesktopActions;
  approvalQueue?: GovernanceApprovalQueueStore | null;
  getMachineAwareness: () => MachineAwarenessSnapshot | null;
  getFileAwareness: () => FileAwarenessSummary | null;
  getScreenAwareness: () => ScreenAwarenessSnapshot | null;
  emitProgress?: (event: WorkflowProgressEvent) => void;
  browserHost?: WorkflowBrowserHost;
}

const normalizePrompt = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const containsAny = (value: string, needles: string[]): boolean =>
  needles.some((needle) => value.includes(needle));


const resolveOutputPath = (plan: WorkflowPlan, workspaceRoot: string): string | null =>
  plan.targetPaths[0] ?? (plan.artifacts[0]?.fileName ? path.resolve(workspaceRoot, plan.artifacts[0].fileName) : null);

const ensureParent = async (filePath: string): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
};

const writeTextFile = async (filePath: string, content: string): Promise<void> => {
  await ensureParent(filePath);
  await writeFile(filePath, content, "utf8");
};

const collectRollbackRecord = (
  target: Array<ExecutionRollbackRecord>,
  rollback: ExecutionRollbackRecord | null | undefined
): void => {
  if (rollback) {
    target.push(rollback);
  }
};

const createWorkflowVerificationRecord = (input: {
  plan: WorkflowPlan;
  stepResults: WorkflowStepResult[];
  artifactPaths: string[];
  status: WorkflowExecutionResult["status"];
  summary: string;
  compensation?: WorkflowStepResult[] | null;
  error?: string | null;
}): ExecutionVerificationRecord => {
  const failedStep = input.stepResults.find((step) => step.status === "failed" || step.status === "blocked") ?? null;
  const passed =
    input.status !== "failed" &&
    !failedStep &&
    (input.compensation?.every((entry) => entry.status === "executed" || entry.status === "simulated" || entry.status === "skipped") ?? true);

  return {
    passed,
    summary: passed
      ? input.summary
      : input.error ?? failedStep?.error ?? "Workflow execution did not complete successfully.",
    evidence: [
      ...input.stepResults.slice(-5).map((step) => `${step.id}:${step.status}`),
      ...input.artifactPaths.slice(-5)
    ],
    observedState: {
      status: input.status,
      stepResults: input.stepResults,
      artifactPaths: input.artifactPaths,
      compensation: input.compensation ?? []
    },
    expectedStateSummary: `Workflow ${input.plan.family} should complete without failed or blocked steps.`
  };
};

const buildCompensationSummary = (step: WorkflowStepResult, result: DesktopActionResult): string =>
  result.status === "executed"
    ? `Rolled back ${step.id} with ${result.summary}`
    : result.status === "simulated"
      ? `Simulated rollback for ${step.id}: ${result.summary}`
      : `Rollback for ${step.id} did not complete cleanly: ${result.summary}`;

const runBrowserInteractionStep = async (
  step: WorkflowStepPlan,
  browserHost: WorkflowBrowserHost
): Promise<WorkflowBrowserResult> => {
  const metadata = (step.metadata ?? {}) as Record<string, unknown>;
  const action = typeof metadata.action === "string" ? metadata.action : "click";
  const target = typeof step.target === "string" && step.target.trim().length > 0 ? step.target : step.summary;
  const visible = metadata.visible !== false;

  if (action === "open-tab" || action === "tab") {
    const openTabTarget = typeof metadata.url === "string" && metadata.url.trim().length > 0 ? metadata.url : target;
    return await (browserHost.openTab ? browserHost.openTab(openTabTarget, visible) : browserHost.open(openTabTarget, visible));
  }

  if (action === "wait") {
    const timeoutMs = typeof metadata.timeoutMs === "number" && Number.isFinite(metadata.timeoutMs) ? metadata.timeoutMs : 5_000;
    return await (browserHost.waitFor ? browserHost.waitFor(target, visible, timeoutMs) : browserHost.open(target, visible));
  }

  if (action === "select") {
    const value = typeof metadata.value === "string" ? metadata.value : "";
    return await (browserHost.select ? browserHost.select(target, value, visible) : browserHost.click(target, visible));
  }

  if (action === "download") {
    const fileName = typeof metadata.fileName === "string" ? metadata.fileName : undefined;
    const downloadTarget = typeof metadata.url === "string" && metadata.url.trim().length > 0 ? metadata.url : target;
    return await (browserHost.download ? browserHost.download(downloadTarget, fileName, visible) : browserHost.open(downloadTarget, visible));
  }

  if (action === "type") {
    const value = typeof metadata.text === "string" ? metadata.text : "";
    const submit = Boolean(metadata.submit);
    return await browserHost.type(target, value, submit, visible);
  }

  if (action === "hotkey") {
    const keys = Array.isArray(metadata.keys)
      ? metadata.keys.filter((entry): entry is string => typeof entry === "string")
      : [];
    return await browserHost.hotkey(keys.length > 0 ? keys : ["Enter"], visible);
  }

  return await browserHost.click(target, visible);
};

const summarizeMachine = (machine: MachineAwarenessSnapshot | null): string[] => {
  if (!machine) {
    return ["Machine awareness unavailable."];
  }

  return [
    `Machine: ${machine.summary.machineName}`,
    `Processes: ${machine.processSnapshot.totalCount}`,
    `Apps: ${machine.installedAppsSnapshot.totalCount}`,
    `Services: ${machine.serviceSnapshot.totalCount}`,
    `Top processes: ${machine.processSnapshot.processes.slice(0, 3).map((entry) => entry.name).join(", ") || "n/a"}`,
    `Top apps: ${machine.installedAppsSnapshot.apps.slice(0, 3).map((entry) => entry.name).join(", ") || "n/a"}`
  ];
};

const summarizeFile = (file: FileAwarenessSummary | null): string[] => {
  if (!file) {
    return ["File awareness unavailable."];
  }

  return [
    `Files: ${file.counts.files}`,
    `Folders: ${file.counts.folders}`,
    `Media: ${file.counts.media}`,
    `Hot folders: ${file.hotFolders.slice(0, 3).map((entry) => entry.path).join(", ") || "n/a"}`
  ];
};

const summarizeScreen = (screen: ScreenAwarenessSnapshot | null): string[] => {
  if (!screen) {
    return ["Screen awareness unavailable."];
  }

  return [
    `Foreground window: ${screen.foregroundWindow?.title ?? "unknown"}`,
    `Focused element: ${screen.uiTree?.focusedElement?.name ?? "n/a"}`,
    `Assist mode: ${screen.assistMode.enabled ? "on" : "off"}`
  ];
};

const buildSourcesSection = (
  webResults: Awaited<ReturnType<typeof resolveRecentWebContext>> | null,
  browserResults: WorkflowBrowserResult[]
): string[] => {
  const sources: string[] = [];
  if (webResults?.status === "used") {
    for (const result of webResults.results.slice(0, 5)) {
      sources.push(`- [${result.title}](${result.url}) - ${result.source}`);
    }
  }
  for (const result of browserResults.slice(0, 5)) {
    sources.push(`- [${result.title || result.url}](${result.url})`);
  }
  return sources.length > 0 ? sources : ["- No sources recorded."];
};

const createReportMarkdown = (input: {
  title: string;
  summary: string;
  evidence: string[];
  sources: string[];
  savedPath: string;
  extraSections?: string[];
}): string =>
  [
    `# ${input.title}`,
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    input.summary,
    "",
    "## Evidence",
    ...input.evidence,
    "",
    "## Sources",
    ...input.sources,
    ...(input.extraSections ?? []),
    "",
    `Saved to: ${input.savedPath}`
  ].join("\n");

const formatBytes = (value: number | null | undefined): string => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "n/a";
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  let current = Math.max(0, value);
  let unitIndex = 0;
  while (current >= 1024 && unitIndex < units.length - 1) {
    current /= 1024;
    unitIndex += 1;
  }
  return `${current.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const createMaintenanceReviewMarkdown = (input: {
  title: string;
  summary: string;
  mode: string;
  evidence: string[];
  sources: string[];
  savedPath: string;
  machine: MachineAwarenessSnapshot | null;
  file: FileAwarenessSummary | null;
  screen: ScreenAwarenessSnapshot | null;
}): string => {
  const driveLines =
    input.machine?.systemIdentity.hardware.drives.length
      ? input.machine.systemIdentity.hardware.drives.slice(0, 4).map(
          (drive) =>
            `- ${drive.deviceId}${drive.volumeLabel ? ` (${drive.volumeLabel})` : ""}: ${formatBytes(drive.freeBytes)} free / ${formatBytes(drive.totalBytes)} total`
        )
      : ["- No drive snapshot available."];

  const startupLines =
    input.machine?.startupSnapshot.folderEntries.length ||
    input.machine?.startupSnapshot.registryEntries.length ||
    input.machine?.startupSnapshot.scheduledTaskEntries.length
      ? [
          ...input.machine.startupSnapshot.folderEntries.slice(0, 3).map((entry) => `- Folder: ${entry.name} -> ${entry.location}`),
          ...input.machine.startupSnapshot.registryEntries.slice(0, 3).map((entry) => `- Registry: ${entry.name} -> ${entry.location}`),
          ...input.machine.startupSnapshot.scheduledTaskEntries.slice(0, 3).map((entry) => `- Scheduled: ${entry.name} -> ${entry.location}`)
        ]
      : ["- No startup items were captured."];

  const processLines =
    input.machine?.processSnapshot.processes.length
      ? input.machine.processSnapshot.processes.slice(0, 5).map(
          (process) =>
            `- ${process.name} (PID ${process.pid}) | ${process.windowTitle ?? "no window"} | ${formatBytes(process.memoryBytes)}`
        )
      : ["- No process snapshot available."];

  const serviceLines =
    input.machine?.serviceSnapshot.services.length
      ? input.machine.serviceSnapshot.services.slice(0, 5).map(
          (service) =>
            `- ${service.displayName} [${service.state}, ${service.startupType}]`
        )
      : ["- No service snapshot available."];

  const installedAppLines =
    input.machine?.installedAppsSnapshot.apps.length
      ? input.machine.installedAppsSnapshot.apps.slice(0, 5).map(
          (app) => `- ${app.name}${app.version ? ` (${app.version})` : ""}`
        )
      : ["- No installed app inventory available."];

  return [
    `# ${input.title}`,
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    input.summary,
    "",
    "## Mode",
    input.mode,
    "",
    "## Evidence",
    ...input.evidence,
    "",
    "## Sources",
    ...input.sources,
    "",
    "## Processes",
    ...processLines,
    "",
    "## Startup",
    ...startupLines,
    "",
    "## Services",
    ...serviceLines,
    "",
    "## Installed Apps",
    ...installedAppLines,
    "",
    "## Drives",
    ...driveLines,
    "",
    "## File Awareness",
    ...(input.file
      ? [
          `- Files: ${input.file.counts.files}`,
          `- Folders: ${input.file.counts.folders}`,
          `- Media: ${input.file.counts.media}`,
          `- Hot folders: ${input.file.hotFolders.slice(0, 3).map((entry) => entry.path).join(", ") || "n/a"}`
        ]
      : ["- File awareness unavailable."]),
    "",
    "## Screen",
    ...(input.screen
      ? [
          `- Foreground window: ${input.screen.foregroundWindow?.title ?? "unknown"}`,
          `- Focused element: ${input.screen.uiTree?.focusedElement?.name ?? "n/a"}`,
          `- Assist mode: ${input.screen.assistMode.enabled ? "on" : "off"}`
        ]
      : ["- Screen awareness unavailable."]),
    "",
    "## Safe Next Steps",
    input.mode === "startup-review"
      ? "Review startup entries for unfamiliar apps and disable only after confirming they are safe to remove."
      : input.mode === "disk-space-triage"
        ? "Check the largest files and move or delete only clearly unnecessary items after approval."
        : input.mode === "performance-triage"
          ? "Inspect startup apps, top processes, and storage pressure before making any changes."
          : "Sort the desktop, move files into Documents, and remove only obvious duplicates after review.",
    "",
    `Saved to: ${input.savedPath}`
  ].join("\n");
};

const createWorkflowStepRequest = (
  plan: WorkflowPlan,
  step: WorkflowStepPlan,
  workspaceRoot: string,
  approvedBy: string,
  approvalToken: ApprovalToken | null,
  dryRun: boolean,
  actions: WorkflowDesktopActions
): DesktopActionRequest | null => {
  if (!step.actionId) {
    return null;
  }

  const proposal = actions.listDesktopActions().find((entry) => entry.id === step.actionId) ?? null;
  if (!proposal) {
    throw new Error(`Action ${step.actionId} is not available.`);
  }

  return {
    proposalId: proposal.id,
    kind: proposal.kind,
    scope: proposal.scope,
    targetKind: proposal.targetKind,
    target: step.target ?? proposal.defaultTarget ?? "",
    destinationTarget: step.destination ?? null,
    args: [],
    workingDirectory: null,
    workspaceRoot,
    riskClass: proposal.riskClass,
    destructive: proposal.riskClass === "high" || proposal.riskClass === "critical",
    dryRun,
    approvedBy,
    approvalToken,
    metadata: {
      ...(step.metadata ?? {}),
      stepId: step.id,
      workflowHash: plan.workflowHash,
      content: step.metadata?.content ?? "",
      force: step.metadata?.force ?? false
    }
  };
};

export const createWorkflowOrchestrator = (options: WorkflowOrchestratorOptions) => {
  const workspaceRoot = path.resolve(options.workspaceRoot);
  const runtimeRoot = path.resolve(options.runtimeRoot);
  const approvalLedger = createApprovalLedger();
  const approvalQueue = options.approvalQueue ?? null;
  const commandBus = createGovernanceCommandBus({
    approvalLedger,
    auditLogPath: path.join(runtimeRoot, "workflow.commands.jsonl")
  });
  const browserHost =
    options.browserHost ?? createElectronWorkflowBrowserHost({ runtimeRoot, preferPlaywright: true });

  const getPlanningContext = async (): Promise<WorkflowPlanningContext> => ({
    workspaceRoot,
    desktopPath: app.getPath("desktop"),
    documentsPath: app.getPath("documents"),
    machineAwareness: options.getMachineAwareness(),
    fileAwareness: options.getFileAwareness(),
    screenAwareness: options.getScreenAwareness(),
    recentWebContext: null
  });

  const emitProgress = (event: WorkflowProgressEvent): void => {
    options.emitProgress?.(event);
  };

  const buildPlan = async (prompt: string): Promise<WorkflowPlan> => {
    const planningContext = await getPlanningContext();
    if (containsAny(normalizePrompt(prompt), ["research", "report", "latest", "current state"])) {
      planningContext.recentWebContext = await resolveRecentWebContext(prompt, true);
    }
    return buildWorkflowPlan(prompt, planningContext);
  };

  const issueWorkflowApproval = async (
    plan: WorkflowPlan,
    approvedBy: string,
    ttlMs?: number
  ): Promise<ApprovalToken> => {
    const request = {
      commandName: `workflow.${plan.family}`,
      command: plan.summary,
      args: [plan.workflowHash],
      metadata: {
        workflowHash: plan.workflowHash,
        plan: JSON.stringify(plan)
      },
      riskClass: plan.approvalRequired ? "high" as const : "low" as const,
      destructive: plan.approvalRequired,
      approvalToken: null,
      approvedBy,
      dryRun: false
    };
    const commandHash = hashGovernanceCommand(request);
    const token = approvalLedger.issueApprovalToken(commandHash, approvedBy, ttlMs);
    void approvalQueue?.record({
      id: commandHash,
      source: "workflow",
      commandId: null,
      commandHash,
      commandName: `workflow.${plan.family}`,
      actionType: plan.family,
      riskClass: plan.approvalRequired ? "high" : "low",
      scope: null,
      targetKind: null,
      status: "approved",
      approvedBy,
      tokenId: token.tokenId,
      createdAt: token.issuedAt,
      updatedAt: token.issuedAt,
      expiresAt: token.expiresAt,
      summary: plan.summary,
      metadata: {
        workflowHash: plan.workflowHash,
        plan
      }
    });
    return token;
  };

  const executePlan = async (
    plan: WorkflowPlan,
    approvedBy: string,
    dryRun: boolean,
    workflowId: string
  ): Promise<WorkflowExecutionResult> => {
    const stepResults: WorkflowStepResult[] = [];
    const completedStepIds: string[] = [];
    const artifactPaths: string[] = [];
    const rollbackRecords: ExecutionRollbackRecord[] = [];
    const compensationResults: WorkflowStepResult[] = [];
    const rollbackCandidates: Array<{
      stepId: string;
      stepKind: WorkflowStepPlan["kind"];
      commandId: string;
      rollback: ExecutionRollbackRecord;
    }> = [];
    const machine = options.getMachineAwareness();
    const fileAwareness = options.getFileAwareness();
    const screenAwareness = options.getScreenAwareness();
    const webContext = containsAny(normalizePrompt(plan.prompt), ["research", "report", "latest", "current state"])
      ? await resolveRecentWebContext(plan.prompt, true)
      : null;
    const browserResults: WorkflowBrowserResult[] = [];
    let failure: { stepId: string; stepIndex: number; message: string } | null = null;

    const pushProgress = (
      status: WorkflowProgressEvent["status"],
      currentStepId: string | null,
      currentStepIndex: number,
      summary: string
    ): void => {
      emitProgress({
        workflowId,
        workflowHash: plan.workflowHash,
        plan,
        status,
        currentStepId,
        currentStepIndex,
        stepCount: plan.steps.length,
        completedStepIds: [...completedStepIds],
        stepResults: [...stepResults],
        artifactPaths: [...artifactPaths],
        summary
      });
    };

    pushProgress("running", plan.steps[0]?.id ?? null, 0, "Workflow started.");

    for (const [index, step] of plan.steps.entries()) {
      if (failure) {
        break;
      }
      const startedAt = new Date().toISOString();
      try {
        if (step.kind === "confirm-approval") {
          stepResults.push({
            id: step.id,
            kind: step.kind,
            status: "skipped",
            summary: step.summary,
            startedAt,
            completedAt: new Date().toISOString()
          });
        } else if (step.kind === "collect-web") {
          stepResults.push({
            id: step.id,
            kind: step.kind,
            status: webContext?.status === "used" ? "executed" : "simulated",
            summary:
              webContext?.status === "used"
                ? `Collected ${webContext.results.length} web results.`
                : "No recent web results were available.",
            startedAt,
            completedAt: new Date().toISOString(),
            output: webContext ?? null
          });
        } else if (step.kind === "collect-machine") {
          stepResults.push({
            id: step.id,
            kind: step.kind,
            status: machine ? "executed" : "simulated",
            summary: machine ? "Collected machine evidence." : "Machine evidence unavailable.",
            startedAt,
            completedAt: new Date().toISOString(),
            output: machine?.summary ?? null
          });
        } else if (step.kind === "collect-file") {
          stepResults.push({
            id: step.id,
            kind: step.kind,
            status: fileAwareness ? "executed" : "simulated",
            summary: fileAwareness ? "Collected file evidence." : "File evidence unavailable.",
            startedAt,
            completedAt: new Date().toISOString(),
            output: fileAwareness?.summary ?? null
          });
        } else if (step.kind === "collect-screen") {
          stepResults.push({
            id: step.id,
            kind: step.kind,
            status: screenAwareness ? "executed" : "simulated",
            summary: screenAwareness ? "Collected screen evidence." : "Screen evidence unavailable.",
            startedAt,
            completedAt: new Date().toISOString(),
            output: screenAwareness?.summary ?? null
          });
        } else if (step.kind === "browser-search") {
          const results = await browserHost.search(step.query ?? plan.prompt);
          browserResults.push(...results);
          stepResults.push({
            id: step.id,
            kind: step.kind,
            status: "executed",
            summary: `Found ${results.length} browser results.`,
            startedAt,
            completedAt: new Date().toISOString(),
            output: results
          });
        } else if (step.kind === "browser-open") {
          const opened = await browserHost.open(step.url ?? "about:blank", true);
          browserResults.push(opened);
          stepResults.push({
            id: step.id,
            kind: step.kind,
            status: "executed",
            summary: `Opened ${opened.title || opened.url}.`,
            startedAt,
            completedAt: new Date().toISOString(),
            output: opened
          });
        } else if (step.kind === "browser-extract") {
          const opened = await browserHost.open(step.url ?? "about:blank", true);
          browserResults.push(opened);
          stepResults.push({
            id: step.id,
            kind: step.kind,
            status: "executed",
            summary: `Extracted page text from ${opened.title || opened.url}.`,
            startedAt,
            completedAt: new Date().toISOString(),
            output: opened
          });
        } else if (step.kind === "browser-play") {
          const played = await browserHost.playYoutube(step.query ?? plan.prompt);
          browserResults.push(played);
          stepResults.push({
            id: step.id,
            kind: step.kind,
            status: "executed",
            summary: `Started playback in ${played.title || "YouTube"}.`,
            startedAt,
            completedAt: new Date().toISOString(),
            output: played
          });
        } else if (step.kind === "browser-interact") {
          const interacted = await runBrowserInteractionStep(step, browserHost);
          browserResults.push(interacted);
          stepResults.push({
            id: step.id,
            kind: step.kind,
            status: "executed",
            summary:
              typeof step.metadata?.action === "string" && step.metadata.action === "type"
                ? `Typed into ${step.target ?? step.summary}.`
                : typeof step.metadata?.action === "string" && step.metadata.action === "hotkey"
                  ? `Sent hotkeys for ${step.target ?? step.summary}.`
                  : `Clicked ${step.target ?? step.summary}.`,
            startedAt,
            completedAt: new Date().toISOString(),
            output: interacted
          });
        } else if (step.kind === "resolve-installed-app") {
          stepResults.push({
            id: step.id,
            kind: step.kind,
            status: "executed",
            summary: step.summary,
            startedAt,
            completedAt: new Date().toISOString(),
            output: step.target ?? null
          });
        } else if (
          (step.kind === "desktop-action" ||
            step.kind === "service-action" ||
            step.kind === "registry-action" ||
            step.kind === "ui-action") &&
          step.actionId
        ) {
          const request = createWorkflowStepRequest(
            plan,
            step,
            workspaceRoot,
            approvedBy,
            null,
            dryRun,
            options.desktopActions
          );
          if (!request) {
            throw new Error(`Workflow step ${step.id} is missing an action id.`);
          }
          const actionApproval = step.approvalRequired
            ? options.desktopActions.issueDesktopActionApproval(request, approvedBy, 15 * 60 * 1000)
            : null;
          const actionResult = await options.desktopActions.executeDesktopAction({
            ...request,
            approvalToken: actionApproval,
            approvedBy
          });
          const stepStatus =
            actionResult.status === "executed"
              ? "executed"
              : actionResult.status === "simulated"
                ? "simulated"
                : actionResult.status === "blocked" || actionResult.status === "denied"
                  ? "blocked"
                  : "failed";
          stepResults.push({
            id: step.id,
            kind: step.kind,
            status: stepStatus,
            summary: actionResult.summary,
            startedAt,
            completedAt: new Date().toISOString(),
            output: actionResult,
            rollback: actionResult.rollback ?? null
          });
          if (actionResult.rollback?.possible && actionResult.commandId && actionResult.status === "executed") {
            rollbackCandidates.push({
              stepId: step.id,
              stepKind: step.kind,
              commandId: actionResult.commandId,
              rollback: actionResult.rollback
            });
          }
          collectRollbackRecord(rollbackRecords, actionResult.rollback);
        } else if (step.kind === "write-markdown") {
          const targetPath = resolveOutputPath(plan, workspaceRoot);
          if (!targetPath) {
            throw new Error("No output path is configured for this workflow.");
          }
          const maintenanceMode =
            typeof plan.artifacts[0]?.metadata?.mode === "string"
              ? String(plan.artifacts[0].metadata.mode)
              : "cleanup";
          const reportBody =
            plan.family === "computer-health-report"
              ? createReportMarkdown({
                  title: plan.prompt,
                  summary: "Computer health report",
                  evidence: summarizeMachine(machine).map((line) => `- ${line}`),
                  sources: buildSourcesSection(webContext, browserResults),
                  savedPath: targetPath,
                  extraSections: [
                    "",
                    "## Machine",
                    ...summarizeMachine(machine),
                    "",
                    "## File",
                    ...summarizeFile(fileAwareness),
                    "",
                    "## Screen",
                    ...summarizeScreen(screenAwareness)
                  ]
                })
              : plan.family === "maintenance-review"
                ? createMaintenanceReviewMarkdown({
                    title: plan.prompt,
                    summary: plan.summary,
                    mode: maintenanceMode,
                    evidence: plan.evidence.length > 0 ? plan.evidence.map((entry) => `- ${entry.summary}`) : ["- No evidence was collected."],
                    sources: buildSourcesSection(webContext, browserResults),
                    savedPath: targetPath,
                    machine,
                    file: fileAwareness,
                    screen: screenAwareness
                  })
              : createReportMarkdown({
                  title: plan.prompt,
                  summary: `Research report for ${plan.prompt}.`,
                  evidence: plan.evidence.length > 0 ? plan.evidence.map((entry) => `- ${entry.summary}`) : ["- No external evidence was collected."],
                  sources: buildSourcesSection(webContext, browserResults),
                  savedPath: targetPath
                });
          if (!dryRun) {
            await writeTextFile(targetPath, reportBody);
            artifactPaths.push(targetPath);
          }
          stepResults.push({
            id: step.id,
            kind: step.kind,
            status: dryRun ? "simulated" : "executed",
            summary: dryRun ? `Previewed report output for ${targetPath}.` : `Saved report to ${targetPath}.`,
            startedAt,
            completedAt: new Date().toISOString(),
            output: dryRun ? reportBody.slice(0, 1000) : { targetPath }
          });
        } else {
          stepResults.push({
            id: step.id,
            kind: step.kind,
            status: "skipped",
            summary: step.summary,
            startedAt,
            completedAt: new Date().toISOString()
          });
        }

        const currentResult = stepResults[stepResults.length - 1] ?? null;
        if (currentResult && (currentResult.status === "blocked" || currentResult.status === "failed")) {
          failure = {
            stepId: step.id,
            stepIndex: index,
            message: currentResult.error ?? currentResult.summary
          };
          break;
        }

        completedStepIds.push(step.id);
        pushProgress(
          dryRun ? "simulated" : "executed",
          step.id,
          index,
          stepResults[stepResults.length - 1]?.summary ?? step.summary
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const completedAt = new Date().toISOString();
        stepResults.push({
          id: step.id,
          kind: step.kind,
          status: "failed",
          summary: step.summary,
          startedAt,
          completedAt,
          error: message
        });
        failure = {
          stepId: step.id,
          stepIndex: index,
          message
        };
        pushProgress("failed", step.id, index, message);
        break;
      }
    }

    if (failure) {
      for (const candidate of [...rollbackCandidates].reverse()) {
        const startedAt = new Date().toISOString();
        try {
          const rollbackResult = await options.desktopActions.rollbackDesktopAction(candidate.commandId, approvedBy, dryRun);
          compensationResults.push({
            id: `compensation-${candidate.stepId}`,
            kind: candidate.stepKind,
            status:
              rollbackResult.status === "executed"
                ? "executed"
                : rollbackResult.status === "simulated"
                  ? "simulated"
                  : rollbackResult.status === "blocked" || rollbackResult.status === "denied"
                    ? "blocked"
                    : "failed",
            summary: buildCompensationSummary(
              {
                id: candidate.stepId,
                kind: candidate.stepKind,
                status: "executed",
                summary: candidate.rollback.summary,
                startedAt,
                completedAt: startedAt,
                rollback: candidate.rollback
              },
              rollbackResult
            ),
            startedAt,
            completedAt: new Date().toISOString(),
            output: rollbackResult,
            rollback: rollbackResult.rollback ?? candidate.rollback
          });
          collectRollbackRecord(rollbackRecords, rollbackResult.rollback);
        } catch (rollbackError) {
          const completedAt = new Date().toISOString();
          compensationResults.push({
            id: `compensation-${candidate.stepId}`,
            kind: candidate.stepKind,
            status: "failed",
            summary: `Rollback failed for ${candidate.stepId}.`,
            startedAt,
            completedAt,
            error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
            rollback: candidate.rollback
          });
        }
      }

      const summary = `Workflow failed at ${failure.stepId}. ${compensationResults.length > 0 ? "Compensation was attempted." : "No compensation was available."}`;
      const verification = createWorkflowVerificationRecord({
        plan,
        stepResults,
        artifactPaths,
        status: "failed",
        summary,
        compensation: compensationResults,
        error: failure.message
      });
      pushProgress("failed", failure.stepId, failure.stepIndex, summary);
      return {
        workflowId,
        workflowHash: plan.workflowHash,
        plan,
        status: "failed",
        summary,
        approvalRequired: plan.approvalRequired,
        approvedBy,
        commandId: null,
        commandHash: null,
        startedAt: plan.createdAt,
        completedAt: new Date().toISOString(),
        currentStepId: failure.stepId,
        completedStepIds,
        stepResults,
        artifactPaths,
        rollback: rollbackRecords.length > 0 ? rollbackRecords : null,
        compensation: compensationResults.length > 0 ? compensationResults : null,
        verification,
        error: failure.message
      };
    }

    const summary =
      plan.family === "research-report"
        ? "Research workflow completed."
        : plan.family === "computer-health-report"
          ? "Computer health workflow completed."
          : plan.family === "browser-playback"
            ? plan.steps.some((step) => step.kind === "browser-open")
              ? "Browser navigation workflow completed."
              : "Browser playback workflow completed."
            : plan.family === "browser-interaction"
              ? "Browser interaction workflow completed."
            : plan.family === "file-management"
              ? "File workflow completed."
              : plan.family === "application-management"
                ? "Application workflow completed."
                : plan.family === "window-control"
                  ? "Window control workflow completed."
                : plan.family === "system-navigation"
                  ? "System navigation workflow completed."
              : plan.family === "process-control"
                ? "Process workflow completed."
              : plan.family === "app-uninstall"
                  ? "Uninstall workflow completed."
                : plan.family === "service-control"
                  ? "Service control workflow completed."
                : plan.family === "registry-control"
                  ? "Registry control workflow completed."
                : plan.family === "ui-automation"
                  ? "UI automation workflow completed."
              : plan.family === "maintenance-review"
                  ? "Maintenance review workflow completed."
                  : "Workflow completed.";

    const verification = createWorkflowVerificationRecord({
      plan,
      stepResults,
      artifactPaths,
      status: dryRun ? "simulated" : "executed",
      summary
    });

    return {
      workflowId,
      workflowHash: plan.workflowHash,
      plan,
      status: dryRun ? "simulated" : "executed",
      summary,
      approvalRequired: plan.approvalRequired,
      approvedBy,
      commandId: null,
      commandHash: null,
      startedAt: plan.createdAt,
      completedAt: new Date().toISOString(),
      currentStepId: null,
      completedStepIds,
      stepResults,
      artifactPaths,
      rollback: rollbackRecords.length > 0 ? rollbackRecords : null,
      compensation: compensationResults.length > 0 ? compensationResults : null,
      verification
    };
  };

  const executeWorkflow = async (
    request: WorkflowExecutionRequest
  ): Promise<WorkflowExecutionResult> => {
    const plan = request.plan ?? (await buildPlan(request.prompt));
    if (plan.clarificationNeeded.length > 0) {
      return {
        workflowId: plan.requestId,
        workflowHash: plan.workflowHash,
        plan,
        status: "blocked",
        summary: plan.clarificationNeeded.join(" "),
        approvalRequired: plan.approvalRequired,
        approvedBy: request.approvedBy ?? null,
        commandId: null,
        commandHash: null,
        startedAt: null,
        completedAt: null,
        currentStepId: plan.steps[0]?.id ?? null,
        completedStepIds: [],
        stepResults: [],
        artifactPaths: [],
        error: plan.clarificationNeeded.join(" ")
      };
    }

    const approvalToken = request.approvalToken ?? null;
    const command = {
      commandName: `workflow.${plan.family}`,
      command: plan.summary,
      args: [plan.workflowHash],
      metadata: {
        workflowHash: plan.workflowHash,
        plan: JSON.stringify(plan)
      },
      riskClass: plan.approvalRequired ? ("high" as const) : ("low" as const),
      destructive: plan.approvalRequired,
      approvalToken,
      approvedBy: request.approvedBy ?? null,
      dryRun: Boolean(request.dryRun),
      handler: async (): Promise<ExecutionHandlerResult> => {
        const executionResult = await executePlan(
          plan,
          request.approvedBy ?? "workflow-operator",
          Boolean(request.dryRun),
          plan.requestId
        );
        return {
          simulated: Boolean(request.dryRun),
          status: executionResult.status,
          output: executionResult,
          summary: executionResult.summary
        };
      }
    };

    const queued = commandBus.enqueueGovernanceCommand(command);
    const result = await commandBus.processNextGovernanceCommand();
    if (!result) {
      return {
        workflowId: plan.requestId,
        workflowHash: plan.workflowHash,
        plan,
        status: "failed",
        summary: "No workflow command result returned by governance bus.",
        approvalRequired: plan.approvalRequired,
        approvedBy: request.approvedBy ?? null,
        commandId: queued.commandId,
        commandHash: queued.commandHash,
        startedAt: null,
        completedAt: null,
        currentStepId: null,
        completedStepIds: [],
        stepResults: [],
        artifactPaths: [],
        error: "No workflow command result returned by governance bus."
      };
    }

    const output = result.output as WorkflowExecutionResult | undefined;
    void approvalQueue?.record({
      id: result.commandHash,
      source: "workflow",
      commandId: result.commandId,
      commandHash: result.commandHash,
      commandName: `workflow.${plan.family}`,
      actionType: plan.family,
      riskClass: plan.approvalRequired ? "high" : "low",
      scope: null,
      targetKind: null,
      status: result.status === "executed" || result.status === "simulated" ? "consumed" : "blocked",
      approvedBy: request.approvedBy ?? null,
      tokenId: approvalToken?.tokenId ?? null,
      createdAt: result.startedAt,
      updatedAt: result.completedAt,
      expiresAt: approvalToken?.expiresAt ?? null,
      summary: result.summary,
      metadata: {
        workflowHash: plan.workflowHash,
        plan,
        result
      }
    });
    if (output) {
      return {
        ...output,
        commandId: result.commandId,
        commandHash: result.commandHash,
        summary: result.summary,
        status: result.status
      };
    }

    return {
      workflowId: plan.requestId,
      workflowHash: plan.workflowHash,
      plan,
      status: result.status,
      summary: result.summary,
      approvalRequired: plan.approvalRequired,
      approvedBy: request.approvedBy ?? null,
      commandId: result.commandId,
      commandHash: result.commandHash,
      startedAt: result.startedAt,
      completedAt: result.completedAt,
      currentStepId: null,
      completedStepIds: [],
      stepResults: [],
      artifactPaths: []
    };
  };

  const close = async (): Promise<void> => {
    await browserHost.close();
  };

  return {
    suggestWorkflow: buildPlan,
    issueWorkflowApproval,
    executeWorkflow,
    close
  };
};

export type WorkflowOrchestrator = ReturnType<typeof createWorkflowOrchestrator>;
