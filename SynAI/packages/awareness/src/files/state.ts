import { copyFile, mkdir } from "node:fs/promises";
import type { FileAwarenessSnapshot } from "../../../contracts/src/awareness";
import { buildFileAwarenessRuntimePaths, clone, readJsonIfExists, writeJson, type FileAwarenessState, type FileCaptureOptions } from "./shared";
import {
  buildFileAwarenessSummary,
  captureFileAwarenessSnapshot,
  readFileAwarenessSnapshot,
  readFileContentSlice,
  writeFileAwarenessSnapshot
} from "./scanner";
import {
  findFolderSummary,
  getLargestFiles,
  getNewestFiles,
  getRecentChanges,
  searchFileEntries,
  searchFolderSummaries,
  searchMediaEntries
} from "./queries";

export const initializeFileAwareness = async (
  options: FileCaptureOptions & { runtimeRoot: string }
): Promise<FileAwarenessState> => {
  const paths = buildFileAwarenessRuntimePaths(options.runtimeRoot);
  await mkdir(paths.runtimeRoot, { recursive: true });

  const currentOnDisk = await readFileAwarenessSnapshot(paths.currentCatalogPath);
  if (currentOnDisk) {
    await copyFile(paths.currentCatalogPath, paths.previousCatalogPath).catch(() => undefined);
  }
  const previousSnapshot = currentOnDisk ?? (await readJsonIfExists<FileAwarenessSnapshot>(paths.previousCatalogPath));
  let currentSnapshot = await captureFileAwarenessSnapshot({
    ...options,
    previousSnapshot
  });

  await writeFileAwarenessSnapshot(paths.currentCatalogPath, currentSnapshot);
  await writeJson(paths.latestSummaryPath, buildFileAwarenessSummary(currentSnapshot));
  await writeJson(paths.recentChangesPath, currentSnapshot.summary.recentChanges);

  const persist = async (snapshot: FileAwarenessSnapshot): Promise<void> => {
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
      currentSnapshot = await captureFileAwarenessSnapshot({
        ...options,
        previousSnapshot: currentSnapshot
      });
      await persist(currentSnapshot);
      return currentSnapshot;
    },
    listRoots() {
      return clone(currentSnapshot.roots);
    },
    searchFiles(query: string, limit = 10) {
      return searchFileEntries(currentSnapshot, query, limit);
    },
    searchMedia(query: string, limit = 10) {
      return searchMediaEntries(currentSnapshot, query, limit);
    },
    searchFolders(query: string, limit = 10) {
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
    getFolderSummary(folderPath: string) {
      return findFolderSummary(currentSnapshot, folderPath);
    },
    readFileContentSlice(filePath: string, sliceOptions?: { startLine?: number; endLine?: number; maxBytes?: number }) {
      return readFileContentSlice(filePath, sliceOptions);
    }
  };
};
