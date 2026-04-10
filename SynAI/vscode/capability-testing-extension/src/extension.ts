import * as path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as vscode from "vscode";
import {
  buildCapabilityCliArgs,
  discoverCapabilityCards,
  parseCapabilityCliSummary,
  resolveCardArtifactPath
} from "./core";

const execFileAsync = promisify(execFile);

const controllerId = "synaiCapabilityTests";
const controllerLabel = "SynAI Capability Tests";

const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";

interface OperatorCliSummary extends Record<string, unknown> {
  approvalQueue?: {
    totals?: {
      total: number;
      pending: number;
      approved: number;
      consumed: number;
      blocked: number;
      revoked: number;
      expired: number;
    };
  };
  auditEntries?: Array<Record<string, unknown>>;
  officialKnowledge?: {
    ready?: boolean;
    documentCount?: number;
  };
  sources?: Array<Record<string, unknown>>;
}

const runCapabilityCli = async (
  workspaceRoot: string,
  args: string[]
): Promise<ReturnType<typeof parseCapabilityCliSummary>> => {
  try {
    const { stdout, stderr } = await execFileAsync(npmExecutable, args, {
      cwd: workspaceRoot,
      windowsHide: true
    });
    if (stderr?.trim().length > 0 && stdout.trim().length === 0) {
      throw new Error(stderr.trim());
    }
    return parseCapabilityCliSummary(stdout);
  } catch (error) {
    const stdout =
      typeof error === "object" && error !== null && "stdout" in error
        ? String((error as { stdout?: unknown }).stdout ?? "")
        : "";
    if (stdout.trim().length > 0) {
      return parseCapabilityCliSummary(stdout);
    }
    throw error;
  }
};

const runOperatorCli = async (
  workspaceRoot: string,
  args: string[]
): Promise<OperatorCliSummary> => {
  try {
    const { stdout, stderr } = await execFileAsync(npmExecutable, ["run", "operator", "--", "--workspace-root", workspaceRoot, "--json", ...args], {
      cwd: workspaceRoot,
      windowsHide: true
    });
    if (stderr?.trim().length > 0 && stdout.trim().length === 0) {
      throw new Error(stderr.trim());
    }
    return JSON.parse(stdout.trim()) as OperatorCliSummary;
  } catch (error) {
    const stdout =
      typeof error === "object" && error !== null && "stdout" in error
        ? String((error as { stdout?: unknown }).stdout ?? "")
        : "";
    if (stdout.trim().length > 0) {
      return JSON.parse(stdout.trim()) as OperatorCliSummary;
    }
    throw error;
  }
};

const firstWorkspaceRoot = (): string | null =>
  vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;

export const activate = async (context: vscode.ExtensionContext): Promise<void> => {
  const controller = vscode.tests.createTestController(controllerId, controllerLabel);
  const operatorOutput = vscode.window.createOutputChannel("SynAI Operator");
  context.subscriptions.push(controller);
  context.subscriptions.push(operatorOutput);

  const refreshTests = async (): Promise<void> => {
    controller.items.replace([]);
    const workspaceRoot = firstWorkspaceRoot();
    if (!workspaceRoot) {
      return;
    }
    const cardsRoot = path.join(workspaceRoot, "capability", "cards");
    const cards = await discoverCapabilityCards(cardsRoot);
    for (const card of cards) {
      const item = controller.createTestItem(card.id, `${card.id} - ${card.name}`, vscode.Uri.file(card.filePath));
      controller.items.add(item);
    }
  };

  const runHandler = async (
    request: vscode.TestRunRequest,
    token: vscode.CancellationToken
  ): Promise<void> => {
    const run = controller.createTestRun(request);
    const workspaceRoot = firstWorkspaceRoot();
    if (!workspaceRoot) {
      run.end();
      return;
    }

    const selected = request.include?.length
      ? request.include
      : [...controller.items.values()];

    for (const testItem of selected) {
      if (token.isCancellationRequested) {
        break;
      }
      run.started(testItem);
      try {
        const args = buildCapabilityCliArgs({
          command: "run",
          cardId: testItem.id
        });
        const summary = await runCapabilityCli(workspaceRoot, args);
        const result = summary.cardResults.find((entry) => entry.cardId === testItem.id);
        if (!result || result.status === "failed") {
          const artifactPath = resolveCardArtifactPath(summary, testItem.id);
          run.failed(
            testItem,
            new vscode.TestMessage(
              artifactPath
                ? `Capability failed. Artifact: ${artifactPath}`
                : "Capability failed. No artifact path found."
            )
          );
        } else {
          run.passed(testItem);
        }
      } catch (error) {
        run.errored(
          testItem,
          new vscode.TestMessage(error instanceof Error ? error.message : String(error))
        );
      }
    }

    run.end();
  };

  controller.createRunProfile("Run Capability Test", vscode.TestRunProfileKind.Run, runHandler, true);

  context.subscriptions.push(
    vscode.commands.registerCommand("synaiCapability.refreshTests", refreshTests),
    vscode.commands.registerCommand("synaiCapability.runFailed", async () => {
      const workspaceRoot = firstWorkspaceRoot();
      if (!workspaceRoot) {
        return;
      }
      const args = buildCapabilityCliArgs({ command: "rerun-failed" });
      const summary = await runCapabilityCli(workspaceRoot, args);
      void vscode.window.showInformationMessage(
        `Capability rerun complete: ${summary.totals.passed} passed / ${summary.totals.failed} failed`
      );
    }),
    vscode.commands.registerCommand("synaiCapability.openLatestArtifacts", async () => {
      const workspaceRoot = firstWorkspaceRoot();
      if (!workspaceRoot) {
        return;
      }
      const latestSummaryPath = path.join(workspaceRoot, ".runtime", "capability-eval", "latest-summary.json");
      const document = await vscode.workspace.openTextDocument(vscode.Uri.file(latestSummaryPath));
      await vscode.window.showTextDocument(document, { preview: false });
    }),
    vscode.commands.registerCommand("synaiCapability.openOperatorDashboard", async () => {
      const workspaceRoot = firstWorkspaceRoot();
      if (!workspaceRoot) {
        return;
      }
      const summary = await runOperatorCli(workspaceRoot, ["dashboard"]);
      operatorOutput.clear();
      operatorOutput.show(true);
      operatorOutput.appendLine(`Operator dashboard for ${workspaceRoot}`);
      operatorOutput.appendLine(
        `Approvals: ${JSON.stringify(summary.approvalQueue?.totals ?? {})}`
      );
      operatorOutput.appendLine(
        `Knowledge: ${JSON.stringify(summary.officialKnowledge ?? {})}`
      );
      operatorOutput.appendLine(`Audit entries: ${summary.auditEntries?.length ?? 0}`);
    }),
    vscode.commands.registerCommand("synaiCapability.openApprovalQueue", async () => {
      const workspaceRoot = firstWorkspaceRoot();
      if (!workspaceRoot) {
        return;
      }
      const summary = await runOperatorCli(workspaceRoot, ["approvals"]);
      operatorOutput.clear();
      operatorOutput.show(true);
      operatorOutput.appendLine(`Approval queue for ${workspaceRoot}`);
      operatorOutput.appendLine(JSON.stringify(summary.approvalQueue ?? summary, null, 2));
    }),
    vscode.commands.registerCommand("synaiCapability.openGovernanceAudit", async () => {
      const workspaceRoot = firstWorkspaceRoot();
      if (!workspaceRoot) {
        return;
      }
      const summary = await runOperatorCli(workspaceRoot, ["audit"]);
      operatorOutput.clear();
      operatorOutput.show(true);
      operatorOutput.appendLine(`Governance audit for ${workspaceRoot}`);
      operatorOutput.appendLine(JSON.stringify(summary.auditEntries ?? summary, null, 2));
    }),
    vscode.commands.registerCommand("synaiCapability.openKnowledgeSources", async () => {
      const workspaceRoot = firstWorkspaceRoot();
      if (!workspaceRoot) {
        return;
      }
      const summary = await runOperatorCli(workspaceRoot, ["knowledge", "sources"]);
      operatorOutput.clear();
      operatorOutput.show(true);
      operatorOutput.appendLine(`Official knowledge sources for ${workspaceRoot}`);
      operatorOutput.appendLine(JSON.stringify(summary.sources ?? summary, null, 2));
    })
  );

  await refreshTests();
};

export const deactivate = (): void => {};
