import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { loadRuntimeCapabilityRegistry, setRuntimeCapabilityPluginApproval, setRuntimeCapabilityPluginEnabled } from "../../packages/Awareness-Reasoning/src/runtime-capabilities";
const writePluginFixture = async (workspaceRoot) => {
    const pluginRoot = path.join(workspaceRoot, ".runtime", "governance", "plugins", "sample-plugin");
    await mkdir(pluginRoot, { recursive: true });
    await writeFile(path.join(pluginRoot, "plugin.json"), `${JSON.stringify({
        id: "sample-plugin",
        title: "Sample Plugin",
        version: "1.0.0",
        description: "Sample plugin for runtime registry tests.",
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
describe("runtime capability registry", () => {
    it("loads plugin manifests and reflects approval / enabled state", async () => {
        const workspaceRoot = path.join(tmpdir(), `synai-runtime-plugin-${Date.now()}-${Math.random().toString(16).slice(2)}`);
        try {
            await writePluginFixture(workspaceRoot);
            const runtimeRoot = path.join(workspaceRoot, ".runtime", "governance");
            const initial = await loadRuntimeCapabilityRegistry(runtimeRoot, workspaceRoot);
            expect(initial.plugins).toHaveLength(1);
            expect(initial.plugins[0]?.manifest.id).toBe("sample-plugin");
            expect(initial.plugins[0]?.loaded).toBe(false);
            expect(initial.plugins[0]?.loadError).toMatch(/not approved/i);
            expect(initial.entries.some((entry) => entry.id === "sample.executor")).toBe(false);
            await setRuntimeCapabilityPluginApproval(runtimeRoot, "sample-plugin", true, "tester", workspaceRoot);
            const approved = await loadRuntimeCapabilityRegistry(runtimeRoot, workspaceRoot);
            expect(approved.plugins[0]?.manifest.approved).toBe(true);
            expect(approved.plugins[0]?.loaded).toBe(false);
            expect(approved.plugins[0]?.loadError).toMatch(/disabled/i);
            await setRuntimeCapabilityPluginEnabled(runtimeRoot, "sample-plugin", true, workspaceRoot);
            const enabled = await loadRuntimeCapabilityRegistry(runtimeRoot, workspaceRoot);
            expect(enabled.plugins[0]?.manifest.enabled).toBe(true);
            expect(enabled.plugins[0]?.loaded).toBe(true);
            expect(enabled.plugins[0]?.loadError).toBeNull();
            expect(enabled.entries.some((entry) => entry.id === "sample.executor")).toBe(true);
            expect(enabled.entries.some((entry) => entry.id === "runtime-plugin.sample-plugin")).toBe(true);
        }
        finally {
            await rm(workspaceRoot, { recursive: true, force: true });
        }
    });
});
