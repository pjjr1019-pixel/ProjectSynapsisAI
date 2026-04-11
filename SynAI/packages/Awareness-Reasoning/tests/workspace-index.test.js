import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { queryWorkspaceIndex } from "../src/retrieval/workspace-index";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
describe("workspace index retrieval", () => {
    it("indexes eligible workspace files, excludes generated paths, and falls back to keyword ranking", async () => {
        const root = await mkdtemp(path.join(os.tmpdir(), "synai-workspace-index-"));
        try {
            const runtimeRoot = path.join(root, ".runtime", "awareness");
            await mkdir(path.join(root, "src"), { recursive: true });
            await mkdir(path.join(root, "dist"), { recursive: true });
            await writeFile(path.join(root, "src", "planner.ts"), "export const planner = 'advanced rag retrieval';\n");
            await writeFile(path.join(root, "README.md"), "This workspace supports advanced retrieval and reasoning.\n");
            await writeFile(path.join(root, "dist", "bundle.js"), "minified output should stay out of the index;\n");
            await writeFile(path.join(root, "binary.bin"), Buffer.from([0, 159, 146, 150, 0, 1, 2, 3]));
            const result = await queryWorkspaceIndex("advanced retrieval", {
                workspaceRoot: root,
                runtimeRoot,
                enabled: true,
                mode: "incremental",
                embedder: async () => []
            });
            expect(result.status.ready).toBe(true);
            expect(result.status.embeddingEnabled).toBe(false);
            expect(result.status.fileCount).toBe(2);
            expect(result.hits.length).toBeGreaterThan(0);
            expect(result.hits.every((hit) => !hit.relativePath.startsWith("dist"))).toBe(true);
            expect(result.hits.some((hit) => hit.relativePath === path.join("src", "planner.ts"))).toBe(true);
        }
        finally {
            await rm(root, { recursive: true, force: true });
        }
    });
    it("reuses unchanged file chunks across incremental refreshes", async () => {
        const root = await mkdtemp(path.join(os.tmpdir(), "synai-workspace-incremental-"));
        try {
            const runtimeRoot = path.join(root, ".runtime", "awareness");
            await mkdir(path.join(root, "src"), { recursive: true });
            await writeFile(path.join(root, "src", "stable.ts"), "export const stable = 'keep me';\n");
            await writeFile(path.join(root, "src", "changing.ts"), "export const value = 'first';\n");
            await queryWorkspaceIndex("stable keep", {
                workspaceRoot: root,
                runtimeRoot,
                enabled: true,
                mode: "incremental",
                embedder: async () => []
            });
            const indexPath = path.join(runtimeRoot, "retrieval", "workspace-index.json");
            const firstIndex = JSON.parse(await readFile(indexPath, "utf8"));
            const stableChunkIds = firstIndex.files.find((file) => file.relativePath === path.join("src", "stable.ts"))?.chunkIds;
            expect(stableChunkIds?.length).toBeGreaterThan(0);
            await delay(20);
            await writeFile(path.join(root, "src", "changing.ts"), "export const value = 'second';\n");
            await queryWorkspaceIndex("second", {
                workspaceRoot: root,
                runtimeRoot,
                enabled: true,
                mode: "incremental",
                embedder: async () => []
            });
            const secondIndex = JSON.parse(await readFile(indexPath, "utf8"));
            const nextStableChunkIds = secondIndex.files.find((file) => file.relativePath === path.join("src", "stable.ts"))?.chunkIds;
            expect(nextStableChunkIds).toEqual(stableChunkIds);
        }
        finally {
            await rm(root, { recursive: true, force: true });
        }
    });
});
