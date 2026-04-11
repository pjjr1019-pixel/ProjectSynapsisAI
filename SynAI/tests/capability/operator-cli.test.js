import { appendChatMessage, configureMemoryDatabase, createConversationRecord } from "../../packages/Awareness-Reasoning/src/memory";
import { mkdir, rm, writeFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { runOperatorCli } from "../../scripts/operator";
const captureJsonOutput = async (argv) => {
    const logs = [];
    const spy = vi.spyOn(console, "log").mockImplementation((...entries) => {
        logs.push(entries.map((entry) => String(entry)).join(" "));
    });
    try {
        const code = await runOperatorCli(argv);
        return {
            code,
            payload: JSON.parse(logs.join("\n"))
        };
    }
    finally {
        spy.mockRestore();
    }
};
const writePluginFixture = async (workspaceRoot) => {
    const pluginRoot = path.join(workspaceRoot, ".runtime", "governance", "plugins", "sample-plugin");
    await mkdir(pluginRoot, { recursive: true });
    await writeFile(path.join(pluginRoot, "plugin.json"), `${JSON.stringify({
        id: "sample-plugin",
        title: "Sample Plugin",
        version: "1.0.0",
        description: "Sample plugin for operator CLI tests.",
        enabled: false,
        approved: false,
        approvedBy: null,
        approvedAt: null,
        entrypoint: "./plugin.mjs",
        capabilities: []
    }, null, 2)}\n`, "utf8");
    await writeFile(path.join(pluginRoot, "plugin.mjs"), [
        "export const capabilities = [",
        "  {",
        '    id: "sample.executor",',
        '    kind: "executor",',
        '    title: "Sample Executor",',
        '    description: "Sample executor from a runtime plugin.",',
        '    status: "active",',
        '    riskClass: "low",',
        "    approvalRequired: false",
        "  }",
        "];"
    ].join("\n"), "utf8");
};
describe("operator cli", () => {
    it("mines governed history into the backlog artifacts", async () => {
        const workspaceRoot = path.join(tmpdir(), `synai-operator-history-${Date.now()}-${Math.random().toString(16).slice(2)}`);
        const dbPath = path.join(workspaceRoot, "synai-db.json");
        try {
            configureMemoryDatabase(dbPath);
            const conversation = await createConversationRecord();
            await appendChatMessage(conversation.id, "user", "open cmd");
            await appendChatMessage(conversation.id, "assistant", "I tried but the launch failed.");
            await appendChatMessage(conversation.id, "user", "didn't work");
            const { code, payload } = await captureJsonOutput([
                "--workspace-root",
                workspaceRoot,
                "improvements",
                "mine",
                "5",
                "--json"
            ]);
            expect(code).toBe(0);
            const output = payload;
            expect(output.findings.length).toBeGreaterThan(0);
            expect(output.backlogPath).toContain("governance-history");
            await access(output.backlogPath);
        }
        finally {
            await rm(workspaceRoot, { recursive: true, force: true });
        }
    });
    it("approves, enables, and lists runtime plugins", async () => {
        const workspaceRoot = path.join(tmpdir(), `synai-operator-plugins-${Date.now()}-${Math.random().toString(16).slice(2)}`);
        try {
            await writePluginFixture(workspaceRoot);
            const approveResult = await captureJsonOutput([
                "--workspace-root",
                workspaceRoot,
                "plugins",
                "approve",
                "sample-plugin",
                "--approved-by",
                "tester",
                "--json"
            ]);
            expect(approveResult.code).toBe(0);
            const approved = approveResult.payload;
            expect(approved.updated.approved).toBe(true);
            expect(approved.updated.approvedBy).toBe("tester");
            const enableResult = await captureJsonOutput([
                "--workspace-root",
                workspaceRoot,
                "plugins",
                "enable",
                "sample-plugin",
                "--json"
            ]);
            expect(enableResult.code).toBe(0);
            const enabled = enableResult.payload;
            expect(enabled.updated.enabled).toBe(true);
            const listResult = await captureJsonOutput([
                "--workspace-root",
                workspaceRoot,
                "plugins",
                "list",
                "--json"
            ]);
            expect(listResult.code).toBe(0);
            const listed = listResult.payload;
            expect(listed.plugins[0]?.loaded).toBe(true);
            expect(listed.plugins[0]?.manifest.id).toBe("sample-plugin");
            expect(listed.entries.some((entry) => entry.id === "sample.executor")).toBe(true);
        }
        finally {
            await rm(workspaceRoot, { recursive: true, force: true });
        }
    });
});
