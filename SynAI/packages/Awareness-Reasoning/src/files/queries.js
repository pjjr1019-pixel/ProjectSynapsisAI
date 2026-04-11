import * as path from "node:path";
import { MAX_CONTEXT_LIST_ITEMS, clone, compactPath, formatBytes, isWithinPath, isPubliclyVisibleScope, normalizePathForMatch } from "./shared";
const isVisible = (entry) => entry.privacyScope == null || isPubliclyVisibleScope(entry.privacyScope);
const sanitizeFolderSummary = (folder) => ({
    ...clone(folder),
    topFiles: folder.topFiles.map((preview) => ({ ...preview }))
});
const normalizeQuery = (query) => query
    .toLowerCase()
    .replace(/[^a-z0-9/\\.\-]+/g, " ")
    .trim();
const scoreMatch = (haystack, query) => {
    const normalizedHaystack = normalizeQuery(haystack);
    const normalizedQuery = normalizeQuery(query);
    if (!normalizedQuery) {
        return 0;
    }
    let score = 0;
    for (const token of normalizedQuery.split(/\s+/).filter(Boolean)) {
        if (normalizedHaystack.includes(token)) {
            score += token.length >= 4 ? 3 : 1;
        }
    }
    if (normalizedHaystack.includes(normalizedQuery)) {
        score += 5;
    }
    return score;
};
const sortByScore = (items) => [...items].sort((a, b) => b.score - a.score);
export const searchFileEntries = (snapshot, query, limit = 10) => sortByScore(snapshot.files
    .filter(isVisible)
    .map((entry) => ({
    score: scoreMatch([entry.name, entry.path, entry.extension, entry.mimeType, entry.contentHint, entry.mediaKind ?? ""].filter(Boolean).join(" "), query),
    entry
}))
    .filter((item) => item.score > 0))
    .slice(0, limit)
    .map((item) => item.entry);
export const searchMediaEntries = (snapshot, query, limit = 10) => sortByScore(snapshot.media
    .filter(isVisible)
    .map((entry) => ({
    score: scoreMatch([entry.name, entry.path, entry.mediaKind, entry.mimeType, entry.contentHint, ...entry.tags].filter(Boolean).join(" "), query),
    entry
}))
    .filter((item) => item.score > 0))
    .slice(0, limit)
    .map((item) => item.entry);
export const searchFolderSummaries = (snapshot, query, limit = 10) => sortByScore(snapshot.folders
    .filter(isVisible)
    .map((entry) => ({
    score: scoreMatch([entry.name, entry.path, ...Object.keys(entry.fileTypeCounts)].join(" "), query),
    entry
}))
    .filter((item) => item.score > 0))
    .slice(0, limit)
    .map((item) => sanitizeFolderSummary(item.entry));
export const getLargestFiles = (snapshot, limit = 10) => [...snapshot.files].filter(isVisible).sort((a, b) => (b.sizeBytes ?? 0) - (a.sizeBytes ?? 0)).slice(0, limit);
export const getNewestFiles = (snapshot, limit = 10) => [...snapshot.files].filter(isVisible).sort((a, b) => (b.modifiedAt ?? "").localeCompare(a.modifiedAt ?? "")).slice(0, limit);
export const getRecentChanges = (snapshot, limit = 10) => [...snapshot.changes].filter((change) => isVisible(change) || change.privacyScope == null).sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
export const findFolderSummary = (snapshot, folderPath) => {
    const normalized = normalizePathForMatch(folderPath);
    const exact = snapshot.folders.find((folder) => normalizePathForMatch(folder.path) === normalized);
    if (exact) {
        return sanitizeFolderSummary(exact);
    }
    const files = snapshot.files.filter((file) => isVisible(file) && isWithinPath(file.path, normalized));
    if (files.length === 0) {
        return null;
    }
    const totalSizeBytes = files.reduce((sum, file) => sum + (file.sizeBytes ?? 0), 0);
    const fileTypeCounts = {};
    for (const file of files) {
        const key = file.mediaKind ?? file.contentHint ?? file.extension ?? "unknown";
        fileTypeCounts[key] = (fileTypeCounts[key] ?? 0) + 1;
    }
    const topFiles = [...files].sort((a, b) => (b.sizeBytes ?? 0) - (a.sizeBytes ?? 0)).slice(0, MAX_CONTEXT_LIST_ITEMS).map((file) => ({
        path: file.path,
        sizeBytes: file.sizeBytes,
        modifiedAt: file.modifiedAt,
        mediaKind: file.mediaKind
    }));
    return {
        path: normalized,
        parentPath: path.dirname(normalized) === normalized ? null : normalizePathForMatch(path.dirname(normalized)),
        name: path.basename(normalized) || normalized,
        totalSizeBytes,
        fileCount: files.length,
        folderCount: 0,
        largeFileCount: files.filter((file) => (file.sizeBytes ?? 0) >= 50 * 1024 * 1024).length,
        recentChangeCount: snapshot.changes.filter((change) => isWithinPath(change.path, normalized) || (change.previousPath ? isWithinPath(change.previousPath, normalized) : false)).length,
        fileTypeCounts,
        newestModifiedAt: [...files].sort((a, b) => (b.modifiedAt ?? "").localeCompare(a.modifiedAt ?? "")).at(0)?.modifiedAt ?? null,
        oldestModifiedAt: [...files].sort((a, b) => (a.modifiedAt ?? "").localeCompare(b.modifiedAt ?? "")).at(0)?.modifiedAt ?? null,
        growthBytes: null,
        hotScore: 0,
        privacyScope: "user-visible local content",
        freshness: snapshot.freshness,
        topFiles
    };
};
const isFileRelevant = (query, mode) => mode === "debug" ||
    [
        "file",
        "files",
        "folder",
        "folders",
        "media",
        "photo",
        "photos",
        "video",
        "videos",
        "audio",
        "document",
        "documents",
        "download",
        "desktop",
        "picture",
        "pictures",
        "largest",
        "newest",
        "changed",
        "modified",
        "renamed",
        "deleted",
        "recent",
        "largest files",
        "biggest files",
        "taking up space",
        "taking the most space"
    ].some((keyword) => query.toLowerCase().includes(keyword));
export const buildFileAwarenessContextSection = (snapshot, latestUserMessage, awarenessMode = "observe") => {
    if (!snapshot || !isFileRelevant(latestUserMessage, awarenessMode)) {
        return null;
    }
    const folderMatches = searchFolderSummaries(snapshot, latestUserMessage, 2);
    const fileMatches = searchFileEntries(snapshot, latestUserMessage, 3);
    const mediaMatches = searchMediaEntries(snapshot, latestUserMessage, 2);
    const lines = [
        `File awareness: ${snapshot.summary.summary}`,
        `Roots: ${snapshot.roots.filter((root) => root.included).map((root) => root.label).slice(0, 4).join(", ") || "none"}`,
        `Largest files: ${snapshot.summary.largestFiles.slice(0, 3).map((entry) => `${path.basename(entry.path)} (${formatBytes(entry.sizeBytes)})`).join(" | ") || "none"}`
    ];
    if (folderMatches.length > 0) {
        lines.push(`Folders: ${folderMatches.map((folder) => `${compactPath(folder.path)} (${folder.fileCount} files)`).join(" | ")}`);
    }
    if (fileMatches.length > 0) {
        lines.push(`Files: ${fileMatches.map((file) => `${compactPath(file.path)} (${formatBytes(file.sizeBytes)})`).join(" | ")}`);
    }
    if (mediaMatches.length > 0) {
        lines.push(`Media: ${mediaMatches.map((media) => `${compactPath(media.path)} (${media.mediaKind})`).join(" | ")}`);
    }
    if (snapshot.summary.recentChanges.length > 0) {
        lines.push(`Recent changes: ${snapshot.summary.recentChanges.slice(0, 3).map((change) => `${change.type} ${compactPath(change.path)}`).join(" | ")}`);
    }
    if (snapshot.summary.blockedScopes.length > 0) {
        lines.push(`Blocked scopes: ${snapshot.summary.blockedScopes.join(", ")}`);
    }
    return lines.join("\n").slice(0, 1400);
};
