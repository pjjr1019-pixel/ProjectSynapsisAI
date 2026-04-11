import { copyFile, mkdir } from "node:fs/promises";
import { buildFileAwarenessRuntimePaths, clone, FILE_FRESHNESS_WINDOW_MS, readJsonIfExists, writeJson } from "./shared";
import { buildFileAwarenessSummary, captureFileAwarenessSnapshot, readFileAwarenessSnapshot, readFileContentSlice, writeFileAwarenessSnapshot } from "./scanner";
import { findFolderSummary, getLargestFiles, getNewestFiles, getRecentChanges, searchFileEntries, searchFolderSummaries, searchMediaEntries } from "./queries";
import { buildVolumeAwarenessState, browseFolderSummary } from "./volumes";
const overlayVolumeState = (snapshot, volumeState) => ({
    ...snapshot,
    volumes: volumeState.volumes,
    journalCursors: volumeState.journalCursors,
    monitor: volumeState.monitor,
    summary: {
        ...snapshot.summary,
        counts: {
            ...snapshot.summary.counts,
            volumes: volumeState.volumes.length
        },
        volumes: volumeState.volumes.map((volume) => ({
            id: volume.id,
            rootPath: volume.rootPath,
            freeBytes: volume.freeBytes,
            totalBytes: volume.totalBytes,
            fileSystem: volume.fileSystem,
            volumeType: volume.volumeType
        })),
        monitor: volumeState.monitor
    }
});
export const initializeFileAwareness = async (options) => {
    const paths = buildFileAwarenessRuntimePaths(options.runtimeRoot);
    await mkdir(paths.runtimeRoot, { recursive: true });
    const currentOnDisk = await readFileAwarenessSnapshot(paths.currentCatalogPath);
    if (currentOnDisk) {
        await copyFile(paths.currentCatalogPath, paths.previousCatalogPath).catch(() => undefined);
    }
    const previousSnapshot = currentOnDisk ?? (await readJsonIfExists(paths.previousCatalogPath));
    const readNow = options.now ?? (() => new Date());
    const initialVolumeState = await buildVolumeAwarenessState({
        roots: options.roots,
        workspaceRoot: options.workspaceRoot,
        additionalRoots: options.additionalRoots,
        previousCursors: previousSnapshot?.journalCursors,
        previousMonitor: previousSnapshot?.monitor ?? null,
        observedAt: readNow()
    });
    const catalogAgeMs = currentOnDisk?.capturedAt
        ? Date.now() - new Date(currentOnDisk.capturedAt).getTime()
        : Infinity;
    const catalogIsFresh = catalogAgeMs < FILE_FRESHNESS_WINDOW_MS &&
        currentOnDisk !== null &&
        (currentOnDisk.volumes?.length ?? 0) > 0;
    let currentSnapshot;
    if (catalogIsFresh && currentOnDisk) {
        currentSnapshot = overlayVolumeState(currentOnDisk, initialVolumeState);
    }
    else {
        currentSnapshot = await captureFileAwarenessSnapshot({
            ...options,
            rootCandidates: initialVolumeState.rootCandidates,
            volumes: initialVolumeState.volumes,
            journalCursors: initialVolumeState.journalCursors,
            monitor: initialVolumeState.monitor,
            previousSnapshot
        });
        await writeFileAwarenessSnapshot(paths.currentCatalogPath, currentSnapshot);
        await writeJson(paths.latestSummaryPath, buildFileAwarenessSummary(currentSnapshot));
        await writeJson(paths.recentChangesPath, currentSnapshot.summary.recentChanges);
    }
    const persist = async (snapshot) => {
        await writeFileAwarenessSnapshot(paths.currentCatalogPath, snapshot);
        await writeJson(paths.latestSummaryPath, buildFileAwarenessSummary(snapshot));
        await writeJson(paths.recentChangesPath, snapshot.summary.recentChanges);
    };
    return {
        paths,
        get snapshot() {
            return currentSnapshot;
        },
        async refresh(reason = "manual") {
            void reason;
            await copyFile(paths.currentCatalogPath, paths.previousCatalogPath).catch(() => undefined);
            const refreshedVolumeState = await buildVolumeAwarenessState({
                roots: options.roots,
                workspaceRoot: options.workspaceRoot,
                additionalRoots: options.additionalRoots,
                previousCursors: currentSnapshot.journalCursors,
                previousMonitor: currentSnapshot.monitor,
                observedAt: readNow()
            });
            currentSnapshot = await captureFileAwarenessSnapshot({
                ...options,
                rootCandidates: refreshedVolumeState.rootCandidates,
                volumes: refreshedVolumeState.volumes,
                journalCursors: refreshedVolumeState.journalCursors,
                monitor: refreshedVolumeState.monitor,
                previousSnapshot: currentSnapshot
            });
            await persist(currentSnapshot);
            return currentSnapshot;
        },
        listRoots() {
            return clone(currentSnapshot.roots);
        },
        listVolumes() {
            return clone(currentSnapshot.volumes ?? []);
        },
        searchFiles(query, limit = 10) {
            return searchFileEntries(currentSnapshot, query, limit);
        },
        searchMedia(query, limit = 10) {
            return searchMediaEntries(currentSnapshot, query, limit);
        },
        searchFolders(query, limit = 10) {
            return searchFolderSummaries(currentSnapshot, query, limit);
        },
        getLargestFiles(limit = 10) {
            return getLargestFiles(currentSnapshot, limit);
        },
        getNewestFiles(limit = 10) {
            return getNewestFiles(currentSnapshot, limit);
        },
        getRecentChanges(limit = 10) {
            return getRecentChanges(currentSnapshot, limit);
        },
        getFolderSummary(folderPath) {
            return findFolderSummary(currentSnapshot, folderPath);
        },
        browseFolder(folderPath) {
            return browseFolderSummary(folderPath, readNow());
        },
        getMonitorStatus() {
            return currentSnapshot.monitor ? clone(currentSnapshot.monitor) : null;
        },
        readFileContentSlice(filePath, sliceOptions) {
            return readFileContentSlice(filePath, sliceOptions);
        }
    };
};
