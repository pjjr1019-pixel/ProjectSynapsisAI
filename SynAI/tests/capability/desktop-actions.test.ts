import { describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import {
  createDesktopActionService,
  type DesktopActionProposal,
  type DesktopActionHost,
  type DesktopActionRequest
} from "../../apps/desktop/electron/desktop-actions";

const buildHost = (): DesktopActionHost => ({
  launchProgram: vi.fn(async () => ({ pid: 1001 })),
  openTarget: vi.fn(async (target: string) => ({ target })),
  createFile: vi.fn(async (target: string, content: string) => ({ target, bytesWritten: Buffer.byteLength(content, "utf8") })),
  createFolder: vi.fn(async (target: string) => ({ target })),
  deletePath: vi.fn(async (target: string, recursive: boolean) => ({ target, recursive })),
  renamePath: vi.fn(async (target: string, destination: string) => ({ source: target, destination })),
  movePath: vi.fn(async (target: string, destination: string) => ({ source: target, destination })),
  inspectProcess: vi.fn(async (target: string, targetKind: string) => ({ target, targetKind })),
  terminateProcess: vi.fn(async (target: string, targetKind: string, force: boolean) => ({ target, targetKind, force })),
  openTaskManager: vi.fn(async () => ({ opened: true }))
});

const buildRequest = (
  proposal: DesktopActionProposal,
  workspaceRoot: string,
  target = ""
): DesktopActionRequest => ({
  proposalId: proposal.id,
  kind: proposal.kind,
  scope: proposal.scope,
  targetKind: proposal.targetKind,
  target,
  destinationTarget: null,
  args: [],
  workingDirectory: null,
  workspaceRoot,
  riskClass: proposal.riskClass,
  destructive: proposal.approvalRequired || proposal.riskClass === "high" || proposal.riskClass === "critical",
  dryRun: false,
  approvedBy: null,
  approvalToken: null,
  metadata: {}
});

describe("desktop actions service", () => {
  it("lists catalog actions and suggests a launch action", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "desktop-actions-"));

    try {
      const service = createDesktopActionService({
        workspaceRoot: root,
        runtimeRoot: path.join(root, ".runtime"),
        host: buildHost()
      });

      const actions = service.listDesktopActions();
      expect(actions.some((action) => action.id === "launch-program")).toBe(true);

      const suggestion = service.suggestDesktopAction("launch program");
      expect(suggestion?.id).toBe("launch-program");
      expect(suggestion?.commandPreview).toContain("spawn");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("suggests and executes the history-failed settings and explorer prompts", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "desktop-actions-"));
    const runtimeRoot = path.join(root, ".runtime", "governance");
    const host = buildHost();
    const service = createDesktopActionService({
      workspaceRoot: root,
      runtimeRoot,
      host
    });

    try {
      const settingsProposal = service.suggestDesktopAction("open windows settings");
      expect(settingsProposal?.id).toBe("open-windows-settings");

      const settingsResult = await service.executeDesktopAction(buildRequest(settingsProposal!, root));
      expect(settingsResult.status).toBe("executed");
      expect(host.openTarget).toHaveBeenCalledWith("ms-settings:");

      const explorerProposal = service.suggestDesktopAction("open explorer");
      expect(explorerProposal?.id).toBe("open-file-explorer");

      const explorerResult = await service.executeDesktopAction(buildRequest(explorerProposal!, root));
      expect(explorerResult.status).toBe("executed");
      expect(host.launchProgram).toHaveBeenCalledWith("explorer", [], null);

      const addRemoveProposal = service.suggestDesktopAction("windows add remove program");
      expect(addRemoveProposal?.id).toBe("open-add-remove-programs");

      const addRemoveResult = await service.executeDesktopAction(buildRequest(addRemoveProposal!, root));
      expect(addRemoveResult.status).toBe("executed");
      expect(host.openTarget).toHaveBeenCalledWith("ms-settings:appsfeatures");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("executes live folder opens and file creation while writing audit events", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "desktop-actions-"));
    const runtimeRoot = path.join(root, ".runtime", "governance");
    const host = buildHost();
    const service = createDesktopActionService({
      workspaceRoot: root,
      runtimeRoot,
      host
    });

    try {
      const folderTarget = path.join(root, "docs");
      const openResult = await service.executeDesktopAction({
        proposalId: "open-folder",
        kind: "open-folder",
        scope: "folder",
        targetKind: "directory",
        target: folderTarget,
        riskClass: "low",
        destructive: false,
        dryRun: false
      });

      expect(openResult.status).toBe("executed");
      expect(host.openTarget).toHaveBeenCalledWith(path.normalize(folderTarget));

      const fileTarget = path.join(root, "notes", "todo.txt");
      const createResult = await service.executeDesktopAction({
        proposalId: "create-file",
        kind: "create-file",
        scope: "workspace",
        targetKind: "path",
        target: fileTarget,
        riskClass: "medium",
        destructive: false,
        dryRun: false,
        metadata: {
          content: "hello world"
        }
      });

      expect(createResult.status).toBe("executed");
      expect(host.createFile).toHaveBeenCalledWith(path.normalize(fileTarget), "hello world");

      const auditLog = await readFile(path.join(runtimeRoot, "desktop-actions.commands.jsonl"), "utf8");
      expect(auditLog).toContain("\"event\":\"enqueue\"");
      expect(auditLog).toContain("\"event\":\"completed\"");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("allows approved Desktop and Documents file operations when roots are explicitly approved", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "desktop-actions-"));
    const runtimeRoot = path.join(root, ".runtime", "governance");
    const desktopPath = path.join(root, "Desktop");
    const documentsPath = path.join(root, "Documents");
    const host = buildHost();
    const service = createDesktopActionService({
      workspaceRoot: root,
      runtimeRoot,
      host
    });

    try {
      const desktopFile = path.join(desktopPath, "draft.txt");
      const createResult = await service.executeDesktopAction({
        proposalId: "create-file",
        kind: "create-file",
        scope: "workspace",
        targetKind: "path",
        target: desktopFile,
        riskClass: "medium",
        destructive: false,
        dryRun: false,
        metadata: {
          content: "hello desktop",
          allowedRoots: [desktopPath]
        }
      });

      expect(createResult.status).toBe("executed");
      expect(host.createFile).toHaveBeenCalledWith(path.normalize(desktopFile), "hello desktop");

      const documentsFile = path.join(documentsPath, "draft.txt");
      const moveResult = await service.executeDesktopAction({
        proposalId: "move-item",
        kind: "move-item",
        scope: "workspace",
        targetKind: "path",
        target: desktopFile,
        destinationTarget: documentsFile,
        riskClass: "medium",
        destructive: false,
        dryRun: false,
        metadata: {
          allowedRoots: [desktopPath, documentsPath]
        }
      });

      expect(moveResult.status).toBe("executed");
      expect(host.movePath).toHaveBeenCalledWith(path.normalize(desktopFile), path.normalize(documentsFile));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("ignores relative allowed roots so they cannot widen file-operation approval scope", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "desktop-actions-"));
    const host = buildHost();
    const service = createDesktopActionService({
      workspaceRoot: root,
      runtimeRoot: path.join(root, ".runtime"),
      host
    });

    try {
      const outsideTarget = path.join(path.dirname(root), "outside.txt");
      const blockedResult = await service.executeDesktopAction({
        proposalId: "create-file",
        kind: "create-file",
        scope: "workspace",
        targetKind: "path",
        target: outsideTarget,
        riskClass: "medium",
        destructive: false,
        dryRun: false,
        allowedRoots: [".."],
        metadata: {
          content: "should stay blocked"
        }
      });

      expect(blockedResult.status).toBe("failed");
      expect(String(blockedResult.error ?? blockedResult.summary)).toContain("workspace root");
      expect(host.createFile).not.toHaveBeenCalledWith(path.normalize(outsideTarget), expect.anything());
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("simulates dry-run file creation and blocks cross-scope writes", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "desktop-actions-"));
    const host = buildHost();
    const service = createDesktopActionService({
      workspaceRoot: root,
      runtimeRoot: path.join(root, ".runtime"),
      host
    });

    try {
      const dryRunResult = await service.executeDesktopAction({
        proposalId: "create-file",
        kind: "create-file",
        scope: "workspace",
        targetKind: "path",
        target: "draft.txt",
        riskClass: "medium",
        destructive: false,
        dryRun: true
      });

      expect(dryRunResult.status).toBe("simulated");
      expect(host.createFile).not.toHaveBeenCalled();

      const outsideTarget = path.join(path.dirname(root), "outside.txt");
      const blockedResult = await service.executeDesktopAction({
        proposalId: "create-file",
        kind: "create-file",
        scope: "workspace",
        targetKind: "path",
        target: outsideTarget,
        riskClass: "medium",
        destructive: false,
        dryRun: false
      });

      expect(blockedResult.status).toBe("failed");
      expect(String(blockedResult.error ?? blockedResult.summary)).toContain("workspace root");
      expect(host.createFile).not.toHaveBeenCalledWith(path.normalize(outsideTarget), expect.anything());
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("requires a matching approval token for exact process termination", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "desktop-actions-"));
    const host = buildHost();
    const service = createDesktopActionService({
      workspaceRoot: root,
      runtimeRoot: path.join(root, ".runtime"),
      host
    });

    try {
      const request: DesktopActionRequest = {
        proposalId: "terminate-process",
        kind: "terminate-process",
        scope: "process",
        targetKind: "process-id",
        target: "1234",
        riskClass: "high",
        destructive: true,
        dryRun: false,
        metadata: {
          force: false
        }
      };

      const blocked = await service.executeDesktopAction(request);
      expect(blocked.status).toBe("blocked");
      expect(blocked.summary).toContain("Approval token");
      expect(host.terminateProcess).not.toHaveBeenCalled();

      const token = service.issueDesktopActionApproval(request, "qa-operator", 60_000);
      expect(token.commandHash).toMatch(/^[0-9a-f]{64}$/);

      const approved = await service.executeDesktopAction({
        ...request,
        approvalToken: token,
        approvedBy: "qa-operator"
      });

      expect(approved.status).toBe("executed");
      expect(host.terminateProcess).toHaveBeenCalledWith("1234", "process-id", false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("records denied and blocked approval queue outcomes distinctly", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "desktop-actions-"));
    const host = buildHost();
    const queueRecords: Array<{ status: string; summary: string }> = [];
    const approvalQueue = {
      record: vi.fn(async (record: { status: string; summary: string }) => {
        queueRecords.push(record);
      }),
      list: vi.fn(async () => ({
        capturedAt: new Date().toISOString(),
        totals: {
          total: queueRecords.length,
          pending: 0,
          approved: 0,
          consumed: 0,
          denied: queueRecords.filter((record) => record.status === "denied").length,
          blocked: queueRecords.filter((record) => record.status === "blocked").length,
          revoked: 0,
          expired: 0
        },
        records: queueRecords
      }))
    };

    const service = createDesktopActionService({
      workspaceRoot: root,
      runtimeRoot: path.join(root, ".runtime"),
      host,
      approvalQueue
    });

    try {
      const deniedResult = await service.executeDesktopAction({
        proposalId: "launch-program",
        kind: "launch-program",
        scope: "application",
        targetKind: "program",
        target: "format c:",
        riskClass: "low",
        destructive: false,
        dryRun: false
      });

      expect(deniedResult.status).toBe("denied");
      expect(queueRecords.at(-1)?.status).toBe("denied");
      expect(host.launchProgram).not.toHaveBeenCalled();

      const blockedResult = await service.executeDesktopAction({
        proposalId: "terminate-process",
        kind: "terminate-process",
        scope: "process",
        targetKind: "process-id",
        target: "1234",
        riskClass: "high",
        destructive: true,
        dryRun: false
      });

      expect(blockedResult.status).toBe("blocked");
      expect(queueRecords.at(-1)?.status).toBe("blocked");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
