import { describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { createDesktopActionService } from "../../apps/desktop/electron/desktop-actions";

const buildHost = () => ({
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

describe("desktop actions clarification-needed outcomes", () => {
  it("returns clarification_needed when required fields are missing", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "desktop-actions-clarify-"));
    try {
      const service = createDesktopActionService({
        workspaceRoot: root,
        runtimeRoot: path.join(root, ".runtime"),
        host: buildHost()
      });
      // Simulate a proposal missing required fields (e.g., target)
      const result = await service.executeDesktopAction({
        proposalId: "open-folder",
        kind: "open-folder",
        scope: "folder",
        targetKind: "directory",
        target: "", // Missing target
        riskClass: "low",
        destructive: false,
        dryRun: false
      });
      expect(result.status).toBe("clarification_needed");
      expect(result.summary || result.reason || result.message).toMatch(/clarification|missing|required/i);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
