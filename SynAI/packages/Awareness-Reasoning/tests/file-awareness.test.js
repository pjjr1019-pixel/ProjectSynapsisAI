import { mkdir, mkdtemp, readFile, rm, truncate, unlink, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { assembleContext } from "../src/memory/index";
import { createAwarenessApiServer } from "../src/api";
import { buildFileAwarenessContextSection, findFolderSummary, getLargestFiles, initializeFileAwareness, readFileContentSlice, searchFileEntries, searchFolderSummaries, searchMediaEntries } from "../src/files";
const fixedNow = () => new Date("2026-04-08T01:00:00.000Z");
const fixedIso = () => fixedNow().toISOString();
const createTinyPng = (width = 1, height = 1) => {
    const buffer = Buffer.alloc(24);
    buffer.set([137, 80, 78, 71, 13, 10, 26, 10], 0);
    buffer.writeUInt32BE(13, 8);
    buffer.write("IHDR", 12, "ascii");
    buffer.writeUInt32BE(width, 16);
    buffer.writeUInt32BE(height, 20);
    return buffer;
};
const withWorkspace = async (fn) => {
    const workspaceRoot = await mkdtemp(path.join(process.cwd(), ".tmp-file-awareness-"));
    try {
        return await fn(workspaceRoot);
    }
    finally {
        await rm(workspaceRoot, { recursive: true, force: true });
    }
};
const buildRuntimeRoot = (workspaceRoot) => path.join(workspaceRoot, ".runtime", "awareness", "files");
const seedBaseWorkspace = async (workspaceRoot, options) => {
    const documentsPath = path.join(workspaceRoot, "Documents");
    const downloadsPath = path.join(workspaceRoot, "Downloads");
    const picturesPath = path.join(workspaceRoot, "Pictures");
    const videosPath = path.join(workspaceRoot, "Videos");
    const passwordsPath = path.join(workspaceRoot, "Passwords");
    const nodeModulesPath = path.join(workspaceRoot, "node_modules");
    const cachePath = path.join(workspaceRoot, ".cache");
    await Promise.all([
        mkdir(documentsPath, { recursive: true }),
        mkdir(downloadsPath, { recursive: true }),
        mkdir(picturesPath, { recursive: true }),
        mkdir(videosPath, { recursive: true }),
        mkdir(passwordsPath, { recursive: true }),
        mkdir(nodeModulesPath, { recursive: true }),
        mkdir(cachePath, { recursive: true })
    ]);
    const reportPath = path.join(documentsPath, "report.txt");
    const secretPath = path.join(passwordsPath, "secret.txt");
    const photoPath = path.join(downloadsPath, "photo.png");
    const ignoredNodeModulesPath = path.join(nodeModulesPath, "ignored.txt");
    const ignoredCachePath = path.join(cachePath, "ignored.txt");
    const notesPath = options?.includeNotes ? path.join(documentsPath, "notes.txt") : null;
    const largeFilePath = options?.includeLargeFile ? path.join(videosPath, "big.bin") : null;
    await writeFile(reportPath, "alpha\nbeta\ngamma\n", "utf8");
    await writeFile(photoPath, createTinyPng(1, 1));
    await writeFile(secretPath, "super secret contents\n", "utf8");
    await writeFile(ignoredNodeModulesPath, "ignored by policy\n", "utf8");
    await writeFile(ignoredCachePath, "ignored by policy\n", "utf8");
    if (notesPath) {
        await writeFile(notesPath, "line 1\nline 2\nline 3\nline 4\n", "utf8");
    }
    if (largeFilePath) {
        await writeFile(largeFilePath, "", "utf8");
        await truncate(largeFilePath, 60 * 1024 * 1024);
    }
    return {
        secretPath,
        downloadsPath,
        documentsPath,
        largeFilePath,
        notesPath
    };
};
const initializeWorkspaceAwareness = async (workspaceRoot) => initializeFileAwareness({
    workspaceRoot,
    roots: [workspaceRoot],
    runtimeRoot: buildRuntimeRoot(workspaceRoot),
    now: fixedNow
});
describe("file awareness", () => {
    it("creates a metadata-only catalog, excludes protected roots, and keeps prompt context free of sensitive content", async () => {
        await withWorkspace(async (workspaceRoot) => {
            const seeded = await seedBaseWorkspace(workspaceRoot);
            const state = await initializeWorkspaceAwareness(workspaceRoot);
            const snapshot = state.snapshot;
            expect(snapshot.files.some((entry) => entry.path === seeded.secretPath && entry.privacyScope === "sensitive local content")).toBe(true);
            expect(snapshot.files.some((entry) => entry.path.includes("node_modules"))).toBe(false);
            expect(snapshot.files.some((entry) => entry.path.includes(".cache"))).toBe(false);
            expect(snapshot.summary.summary).not.toContain("super secret");
            expect(snapshot.summary.summary).not.toContain("node_modules");
            expect(snapshot.summary.counts.files).toBe(2);
            const secretSearch = searchFileEntries(snapshot, "secret", 10);
            expect(secretSearch).toHaveLength(0);
            const contextSection = buildFileAwarenessContextSection(snapshot, "what changed in Downloads today?", "contextual");
            expect(contextSection).not.toBeNull();
            expect(contextSection ?? "").toContain("File awareness");
            expect(contextSection ?? "").not.toContain("super secret");
            expect(contextSection ?? "").not.toContain("Passwords");
            const visibleSlice = await readFileContentSlice(path.join(seeded.documentsPath, "report.txt"), {
                startLine: 2,
                endLine: 3
            });
            expect(visibleSlice?.content).toBe("beta\ngamma");
            const blockedSlice = await readFileContentSlice(seeded.secretPath, {
                startLine: 1,
                endLine: 2
            });
            expect(blockedSlice).toBeNull();
            const assembled = assembleContext({
                systemInstruction: "system",
                summaryText: "summary",
                allMessages: [
                    {
                        id: "msg-1",
                        conversationId: "conversation-1",
                        role: "user",
                        content: "what changed in Downloads today?",
                        createdAt: fixedIso()
                    }
                ],
                stableMemories: [],
                retrievedMemories: [],
                webSearch: {
                    status: "off",
                    query: "",
                    results: []
                },
                fileAwareness: snapshot
            });
            expect(assembled.preview.fileAwareness).not.toBeNull();
            expect(assembled.promptMessages[0].content).toContain("File awareness");
            expect(assembled.promptMessages[0].content).not.toContain("super secret");
            expect(assembled.promptMessages[0].content).not.toContain("Passwords");
            expect(assembled.promptMessages[0].content.length).toBeLessThan(1400);
        });
    });
    it("refreshes incrementally and records visible recent changes", async () => {
        await withWorkspace(async (workspaceRoot) => {
            const seeded = await seedBaseWorkspace(workspaceRoot, { includeNotes: true });
            const state = await initializeWorkspaceAwareness(workspaceRoot);
            const originalFingerprint = state.snapshot.fingerprint;
            expect(seeded.notesPath).not.toBeNull();
            await writeFile(seeded.notesPath ?? "", "line 1\nline 2 updated\nline 3\nline 4\nline 5\n", "utf8");
            const createdPath = path.join(seeded.documentsPath, "fresh.txt");
            await writeFile(createdPath, "fresh file\n", "utf8");
            await unlink(path.join(seeded.documentsPath, "report.txt"));
            const refreshed = await state.refresh("manual");
            expect(refreshed.fingerprint).not.toBe(originalFingerprint);
            expect(refreshed.summary.recentChanges.length).toBeGreaterThan(0);
            expect(refreshed.summary.recentChanges.map((entry) => entry.type)).toEqual(expect.arrayContaining(["created", "modified", "deleted"]));
            expect(refreshed.summary.recentChanges.map((entry) => entry.path)).toContain(path.normalize(createdPath));
            const recentChangesFile = await readFile(path.join(buildRuntimeRoot(workspaceRoot), "recent-changes.json"), "utf8");
            const recentChanges = JSON.parse(recentChangesFile);
            expect(recentChanges).toHaveLength(refreshed.summary.recentChanges.length);
            expect(recentChanges.map((entry) => entry.path)).toContain(path.normalize(createdPath));
        });
    });
    it("tracks large files and media metadata with compact folder summaries", async () => {
        await withWorkspace(async (workspaceRoot) => {
            const seeded = await seedBaseWorkspace(workspaceRoot, { includeLargeFile: true });
            const state = await initializeWorkspaceAwareness(workspaceRoot);
            const snapshot = state.snapshot;
            const largest = getLargestFiles(snapshot, 2);
            expect(largest[0]?.path).toBe(path.normalize(seeded.largeFilePath ?? ""));
            expect(snapshot.summary.largestFiles[0]?.path).toBe(path.normalize(seeded.largeFilePath ?? ""));
            const media = searchMediaEntries(snapshot, "photo", 10);
            expect(media).toHaveLength(1);
            expect(media[0]?.width).toBe(1);
            expect(media[0]?.height).toBe(1);
            expect(media[0]?.path).toBe(path.normalize(path.join(seeded.downloadsPath, "photo.png")));
            const downloadSummary = findFolderSummary(snapshot, seeded.downloadsPath);
            expect(downloadSummary).not.toBeNull();
            expect(downloadSummary?.topFiles[0]?.path).toBe(path.normalize(path.join(seeded.downloadsPath, "photo.png")));
            expect(downloadSummary?.topFiles.every((entry) => !entry.path.includes("secret"))).toBe(true);
            const folderSearch = searchFolderSummaries(snapshot, "downloads", 5);
            const searchedDownload = folderSearch.find((entry) => entry.path === path.normalize(seeded.downloadsPath));
            expect(searchedDownload).not.toBeUndefined();
            expect(searchedDownload?.topFiles.every((entry) => !entry.path.includes("secret"))).toBe(true);
        });
    });
    it("serves the file and media awareness API surfaces on localhost", async () => {
        await withWorkspace(async (workspaceRoot) => {
            const seeded = await seedBaseWorkspace(workspaceRoot, { includeNotes: true, includeLargeFile: true });
            const state = await initializeWorkspaceAwareness(workspaceRoot);
            const engine = {
                get fileAwareness() {
                    return state.snapshot;
                },
                getStatus: () => ({}),
                getDigest: () => ({}),
                refresh: async () => ({}),
                refreshFiles: async (reason) => state.refresh(reason),
                markDigestDelivered: async () => ({}),
                appendEvent: async () => ({}),
                close: async () => undefined
            };
            const api = await createAwarenessApiServer(engine, { host: "127.0.0.1" });
            try {
                const rootsResponse = await fetch(`${api.baseUrl}/api/awareness/files/roots`);
                expect(rootsResponse.status).toBe(200);
                const roots = (await rootsResponse.json());
                expect(roots[0]?.path).toBe(path.normalize(workspaceRoot));
                expect(roots[0]?.included).toBe(true);
                const searchResponse = await fetch(`${api.baseUrl}/api/awareness/files/search?q=secret`);
                expect(searchResponse.status).toBe(200);
                const searchResult = (await searchResponse.json());
                expect(searchResult.files).toHaveLength(0);
                expect(searchResult.folders).toHaveLength(0);
                const largestResponse = await fetch(`${api.baseUrl}/api/awareness/files/largest`);
                expect(largestResponse.status).toBe(200);
                const largest = (await largestResponse.json());
                expect(largest[0]?.path).toBe(path.normalize(seeded.largeFilePath ?? ""));
                const recentResponse = await fetch(`${api.baseUrl}/api/awareness/files/recent`);
                expect(recentResponse.status).toBe(200);
                const recent = (await recentResponse.json());
                expect(recent.length).toBeGreaterThan(0);
                const folderSummaryResponse = await fetch(`${api.baseUrl}/api/awareness/files/folder-summary?path=${encodeURIComponent(seeded.downloadsPath)}`);
                expect(folderSummaryResponse.status).toBe(200);
                const folderSummary = (await folderSummaryResponse.json());
                expect(folderSummary.path).toBe(path.normalize(seeded.downloadsPath));
                expect(folderSummary.topFiles.every((entry) => !entry.path.includes("secret"))).toBe(true);
                const mediaResponse = await fetch(`${api.baseUrl}/api/awareness/media/search?q=photo`);
                expect(mediaResponse.status).toBe(200);
                const mediaResult = (await mediaResponse.json());
                expect(mediaResult.results).toHaveLength(1);
                expect(mediaResult.results[0]?.width).toBe(1);
                expect(mediaResult.results[0]?.height).toBe(1);
                const refreshTarget = path.join(seeded.documentsPath, "api-refresh.txt");
                await writeFile(refreshTarget, "api refresh\n", "utf8");
                const refreshResponse = await fetch(`${api.baseUrl}/api/awareness/files/refresh`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ reason: "api-test" })
                });
                expect(refreshResponse.status).toBe(200);
                const refreshed = (await refreshResponse.json());
                expect(refreshed.recentChanges.map((entry) => entry.path)).toContain(path.normalize(refreshTarget));
            }
            finally {
                await api.close();
            }
        });
    });
});
