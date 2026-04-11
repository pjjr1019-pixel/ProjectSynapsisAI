import * as http from "node:http";
import { findFolderSummary, getLargestFiles, getRecentChanges, queryWindowsIndexedEntries, searchFileEntries, searchFolderSummaries, searchMediaEntries } from "../files";
const jsonHeaders = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
};
const writeJson = (res, response) => {
    res.writeHead(response.status, jsonHeaders);
    res.end(JSON.stringify(response.body, null, 2));
};
const collectBody = async (req) => {
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const raw = Buffer.concat(chunks).toString("utf8");
    if (!raw) {
        return null;
    }
    try {
        return JSON.parse(raw);
    }
    catch {
        return raw;
    }
};
const SUMMARY_SCOPES = [
    "session",
    "previous-session",
    "last-report",
    "current-machine"
];
const SUMMARY_MODES = ["short", "medium", "detailed"];
const ANSWER_MODES = ["evidence-first", "llm-primary"];
const parseSummaryScope = (value) => value && SUMMARY_SCOPES.includes(value) ? value : "current-machine";
const parseSummaryMode = (value) => value && SUMMARY_MODES.includes(value) ? value : undefined;
const parseAnswerMode = (value) => typeof value === "string" && ANSWER_MODES.includes(value)
    ? value
    : undefined;
const parseQueryRequest = (body, requestUrl) => {
    if (body && typeof body === "object") {
        const value = body;
        return {
            query: typeof value.query === "string" ? value.query : "",
            scope: typeof value.scope === "string" && SUMMARY_SCOPES.includes(value.scope)
                ? value.scope
                : undefined,
            mode: typeof value.mode === "string" && SUMMARY_MODES.includes(value.mode)
                ? value.mode
                : undefined,
            awarenessAnswerMode: parseAnswerMode(value.awarenessAnswerMode),
            officialKnowledgePolicy: typeof value.officialKnowledgePolicy === "string"
                ? value.officialKnowledgePolicy
                : undefined,
            allowOfficialWindowsKnowledge: typeof value.allowOfficialWindowsKnowledge === "boolean"
                ? value.allowOfficialWindowsKnowledge
                : undefined,
            windowsVersionHint: typeof value.windowsVersionHint === "string" ? value.windowsVersionHint : undefined,
            hints: value.hints && typeof value.hints === "object"
                ? {
                    force: "force" in value.hints &&
                        typeof value.hints.force === "boolean"
                        ? value.hints.force
                        : undefined,
                    strictGrounding: "strictGrounding" in value.hints &&
                        typeof value.hints.strictGrounding === "boolean"
                        ? value.hints.strictGrounding
                        : undefined,
                    maxScanMs: "maxScanMs" in value.hints &&
                        typeof value.hints.maxScanMs === "number" &&
                        Number.isFinite(value.hints.maxScanMs)
                        ? value.hints.maxScanMs
                        : undefined,
                    officialKnowledgePolicy: typeof value.hints.officialKnowledgePolicy === "string"
                        ? value.hints.officialKnowledgePolicy
                        : undefined,
                    allowOfficialWindowsKnowledge: typeof value.hints.allowOfficialWindowsKnowledge === "boolean"
                        ? value.hints.allowOfficialWindowsKnowledge
                        : undefined,
                    windowsVersionHint: typeof value.hints.windowsVersionHint === "string"
                        ? value.hints.windowsVersionHint
                        : undefined
                }
                : undefined,
            refresh: typeof value.refresh === "boolean" ? value.refresh : undefined
        };
    }
    return {
        query: requestUrl.searchParams.get("q") ?? requestUrl.searchParams.get("query") ?? "",
        awarenessAnswerMode: parseAnswerMode(requestUrl.searchParams.get("awarenessAnswerMode")),
        officialKnowledgePolicy: requestUrl.searchParams.get("officialKnowledgePolicy") ?? undefined,
        allowOfficialWindowsKnowledge: requestUrl.searchParams.get("allowOfficialWindowsKnowledge") == null
            ? undefined
            : requestUrl.searchParams.get("allowOfficialWindowsKnowledge") !== "false",
        windowsVersionHint: requestUrl.searchParams.get("windowsVersionHint") ?? undefined,
        hints: requestUrl.searchParams.get("force") != null ||
            requestUrl.searchParams.get("strictGrounding") != null ||
            requestUrl.searchParams.get("maxScanMs") != null ||
            requestUrl.searchParams.get("officialKnowledgePolicy") != null ||
            requestUrl.searchParams.get("allowOfficialWindowsKnowledge") != null ||
            requestUrl.searchParams.get("windowsVersionHint") != null
            ? {
                force: requestUrl.searchParams.get("force") == null
                    ? undefined
                    : requestUrl.searchParams.get("force") !== "false",
                strictGrounding: requestUrl.searchParams.get("strictGrounding") == null
                    ? undefined
                    : requestUrl.searchParams.get("strictGrounding") !== "false",
                maxScanMs: requestUrl.searchParams.get("maxScanMs") == null
                    ? undefined
                    : (() => {
                        const parsed = Number(requestUrl.searchParams.get("maxScanMs"));
                        return Number.isFinite(parsed) ? parsed : undefined;
                    })(),
                officialKnowledgePolicy: requestUrl.searchParams.get("officialKnowledgePolicy") ?? undefined,
                allowOfficialWindowsKnowledge: requestUrl.searchParams.get("allowOfficialWindowsKnowledge") == null
                    ? undefined
                    : requestUrl.searchParams.get("allowOfficialWindowsKnowledge") !== "false",
                windowsVersionHint: requestUrl.searchParams.get("windowsVersionHint") ?? undefined
            }
            : undefined,
        refresh: requestUrl.searchParams.get("refresh") == null
            ? undefined
            : requestUrl.searchParams.get("refresh") !== "false"
    };
};
const toAssistOptions = (body) => {
    if (!body || typeof body !== "object") {
        return {};
    }
    const value = body;
    const options = {};
    if (value.scope === "current-window" ||
        value.scope === "selected-app" ||
        value.scope === "chosen-display") {
        options.scope = value.scope;
    }
    if (typeof value.targetLabel === "string") {
        options.targetLabel = value.targetLabel;
    }
    if (value.captureMode === "on-demand" || value.captureMode === "session") {
        options.captureMode = value.captureMode;
    }
    if (typeof value.sampleIntervalMs === "number" && Number.isFinite(value.sampleIntervalMs)) {
        options.sampleIntervalMs = value.sampleIntervalMs;
    }
    return options;
};
export const handleAwarenessApiRequest = async (engine, method, requestUrl, body) => {
    const pathname = requestUrl.pathname;
    if (method === "OPTIONS") {
        return {
            status: 204,
            body: null
        };
    }
    if (pathname === "/api/awareness/status" && method === "GET") {
        const status = engine.getStatus();
        return {
            status: 200,
            body: status
        };
    }
    if (pathname === "/api/awareness/digest" && method === "GET") {
        const digest = engine.getDigest();
        return {
            status: 200,
            body: digest
        };
    }
    if (pathname === "/api/awareness/knowledge/status" && method === "GET") {
        const status = engine.getOfficialKnowledgeStatus();
        return {
            status: 200,
            body: status
        };
    }
    if (pathname === "/api/awareness/knowledge/query" && method === "POST") {
        const request = parseQueryRequest(body, requestUrl);
        const context = await engine.queryOfficialKnowledge(request.query, {
            policy: request.officialKnowledgePolicy ?? request.hints?.officialKnowledgePolicy,
            windowsVersionHint: request.windowsVersionHint ?? request.hints?.windowsVersionHint,
            allowLiveFetch: (request.allowOfficialWindowsKnowledge ?? request.hints?.allowOfficialWindowsKnowledge ?? true) &&
                (request.officialKnowledgePolicy ?? request.hints?.officialKnowledgePolicy) === "live-fallback"
        });
        return {
            status: 200,
            body: context
        };
    }
    if (pathname === "/api/awareness/knowledge/refresh" && method === "POST") {
        const reason = typeof body === "object" && body !== null && "reason" in body && typeof body.reason === "string"
            ? body.reason
            : "api";
        return {
            status: 200,
            body: await engine.refreshOfficialKnowledge(reason)
        };
    }
    if (pathname === "/api/awareness/query" && method === "POST") {
        const request = parseQueryRequest(body, requestUrl);
        return {
            status: 200,
            body: await engine.queryAwarenessLive(request)
        };
    }
    if (pathname === "/api/awareness/summary" && method === "GET") {
        const scope = parseSummaryScope(requestUrl.searchParams.get("scope"));
        const mode = parseSummaryMode(requestUrl.searchParams.get("mode"));
        const summary = engine.getAwarenessSummary(scope, mode);
        return {
            status: 200,
            body: summary
        };
    }
    if (pathname === "/api/awareness/diagnostics/performance" && method === "GET") {
        const diagnostic = engine.getPerformanceDiagnostic();
        return {
            status: 200,
            body: diagnostic
        };
    }
    if (pathname === "/api/awareness/diagnostics/startup" && method === "GET") {
        const diagnostic = engine.getStartupDiagnostic();
        return {
            status: 200,
            body: diagnostic
        };
    }
    if (pathname === "/api/awareness/diagnostics/storage" && method === "GET") {
        const diagnostic = engine.getStorageDiagnostic();
        return {
            status: 200,
            body: diagnostic
        };
    }
    if (pathname === "/api/awareness/diagnostics/current-ui" && method === "GET") {
        const diagnostic = engine.getCurrentUiDiagnostic();
        return {
            status: 200,
            body: diagnostic
        };
    }
    if (pathname === "/api/awareness/diagnostics/events" && method === "GET") {
        const diagnostic = engine.getEventLogDiagnostic();
        return {
            status: 200,
            body: diagnostic
        };
    }
    if (pathname === "/api/awareness/diagnostics/anomalies" && method === "GET") {
        const diagnostic = engine.getAnomalyDiagnostic();
        return {
            status: 200,
            body: diagnostic
        };
    }
    if (pathname === "/api/awareness/screen/status" && method === "GET") {
        const screenStatus = engine.getScreenStatus();
        return {
            status: 200,
            body: screenStatus
        };
    }
    if (pathname === "/api/awareness/screen/foreground-window" && method === "GET") {
        return {
            status: 200,
            body: engine.screenAwareness?.foregroundWindow ?? null
        };
    }
    if (pathname === "/api/awareness/screen/ui-tree" && method === "GET") {
        return {
            status: 200,
            body: engine.screenAwareness?.uiTree ?? null
        };
    }
    if (pathname === "/api/awareness/screen/last-events" && method === "GET") {
        return {
            status: 200,
            body: engine.screenAwareness?.recentEvents ?? []
        };
    }
    if (pathname === "/api/awareness/screen/start-assist" && method === "POST") {
        await engine.startAssistMode(toAssistOptions(body));
        return {
            status: 200,
            body: engine.getScreenStatus()
        };
    }
    if (pathname === "/api/awareness/screen/stop-assist" && method === "POST") {
        const reason = typeof body === "object" && body !== null && "reason" in body && typeof body.reason === "string"
            ? body.reason
            : "api";
        await engine.stopAssistMode(reason);
        return {
            status: 200,
            body: engine.getScreenStatus()
        };
    }
    if (pathname === "/api/awareness/system/identity" && method === "GET") {
        return {
            status: 200,
            body: engine.machineAwareness.systemIdentity
        };
    }
    if (pathname === "/api/awareness/system/processes" && method === "GET") {
        return {
            status: 200,
            body: engine.machineAwareness.processSnapshot
        };
    }
    if (pathname === "/api/awareness/system/services" && method === "GET") {
        return {
            status: 200,
            body: engine.machineAwareness.serviceSnapshot
        };
    }
    if (pathname === "/api/awareness/system/startup" && method === "GET") {
        return {
            status: 200,
            body: engine.machineAwareness.startupSnapshot
        };
    }
    if (pathname === "/api/awareness/system/apps" && method === "GET") {
        return {
            status: 200,
            body: engine.machineAwareness.installedAppsSnapshot
        };
    }
    if (pathname === "/api/awareness/system/settings-map" && method === "GET") {
        return {
            status: 200,
            body: engine.machineAwareness.settingsMap
        };
    }
    if (pathname === "/api/awareness/system/control-map" && method === "GET") {
        return {
            status: 200,
            body: engine.machineAwareness.controlPanelMap
        };
    }
    if (pathname === "/api/awareness/system/registry-zones" && method === "GET") {
        return {
            status: 200,
            body: engine.machineAwareness.registryZoneMap
        };
    }
    if (pathname === "/api/awareness/system/event-logs" && method === "GET") {
        return {
            status: 200,
            body: engine.machineAwareness.eventLogSnapshot
        };
    }
    if (pathname === "/api/awareness/files/roots" && method === "GET") {
        return {
            status: 200,
            body: engine.fileAwareness.roots
        };
    }
    if (pathname === "/api/awareness/files/volumes" && method === "GET") {
        const volumes = engine.listFileVolumes();
        return {
            status: 200,
            body: volumes
        };
    }
    if (pathname === "/api/awareness/files/search" && method === "GET") {
        const query = requestUrl.searchParams.get("q") ?? "";
        const indexedVolumeRoots = typeof engine.listFileVolumes === "function"
            ? engine
                .listFileVolumes()
                .filter((volume) => volume.indexedSearchCapable)
                .map((volume) => volume.rootPath)
            : (engine.fileAwareness?.volumes ?? [])
                .filter((volume) => volume.indexedSearchCapable)
                .map((volume) => volume.rootPath);
        const indexed = await queryWindowsIndexedEntries(query, {
            limit: 20,
            volumeRoots: indexedVolumeRoots,
            mode: "files"
        });
        return {
            status: 200,
            body: {
                query,
                source: indexed?.source ?? "snapshot",
                files: indexed?.files ?? searchFileEntries(engine.fileAwareness, query, 20),
                folders: searchFolderSummaries(engine.fileAwareness, query, 10)
            }
        };
    }
    if (pathname === "/api/awareness/files/largest" && method === "GET") {
        return {
            status: 200,
            body: getLargestFiles(engine.fileAwareness, 20)
        };
    }
    if (pathname === "/api/awareness/files/recent" && method === "GET") {
        return {
            status: 200,
            body: getRecentChanges(engine.fileAwareness, 20)
        };
    }
    if (pathname === "/api/awareness/files/folder-summary" && method === "GET") {
        const folderPath = requestUrl.searchParams.get("path") ?? "";
        const summary = findFolderSummary(engine.fileAwareness, folderPath);
        return summary
            ? {
                status: 200,
                body: summary
            }
            : {
                status: 404,
                body: {
                    error: "Folder not found"
                }
            };
    }
    if (pathname === "/api/awareness/files/folder" && method === "GET") {
        const folderPath = requestUrl.searchParams.get("path") ?? "";
        const listing = await engine.browseFolder(folderPath);
        return listing
            ? {
                status: 200,
                body: listing
            }
            : {
                status: 404,
                body: {
                    error: "Folder not found"
                }
            };
    }
    if (pathname === "/api/awareness/files/changes" && method === "GET") {
        const volume = (requestUrl.searchParams.get("volume") ?? "").toLowerCase();
        const since = requestUrl.searchParams.get("since");
        const changes = getRecentChanges(engine.fileAwareness, 50).filter((change) => {
            const matchesVolume = !volume || change.path.toLowerCase().startsWith(volume);
            const matchesSince = !since || change.timestamp >= since;
            return matchesVolume && matchesSince;
        });
        return {
            status: 200,
            body: changes
        };
    }
    if (pathname === "/api/awareness/files/monitor-status" && method === "GET") {
        const monitorStatus = engine.getFileMonitorStatus();
        return {
            status: 200,
            body: monitorStatus
        };
    }
    if (pathname === "/api/awareness/media/search" && method === "GET") {
        const query = requestUrl.searchParams.get("q") ?? "";
        const indexedVolumeRoots = typeof engine.listFileVolumes === "function"
            ? engine
                .listFileVolumes()
                .filter((volume) => volume.indexedSearchCapable)
                .map((volume) => volume.rootPath)
            : (engine.fileAwareness?.volumes ?? [])
                .filter((volume) => volume.indexedSearchCapable)
                .map((volume) => volume.rootPath);
        const indexed = await queryWindowsIndexedEntries(query, {
            limit: 20,
            volumeRoots: indexedVolumeRoots,
            mode: "media"
        });
        return {
            status: 200,
            body: {
                query,
                source: indexed?.source ?? "snapshot",
                results: indexed?.media ?? searchMediaEntries(engine.fileAwareness, query, 20)
            }
        };
    }
    if (pathname === "/api/awareness/files/refresh" && method === "POST") {
        const reason = typeof body === "object" && body !== null && "reason" in body && typeof body.reason === "string"
            ? body.reason
            : "api";
        const snapshot = await engine.refreshFiles(reason);
        return {
            status: 200,
            body: snapshot.summary
        };
    }
    if (pathname === "/api/awareness/refresh" && method === "POST") {
        const reason = typeof body === "object" && body !== null && "reason" in body && typeof body.reason === "string"
            ? body.reason
            : "api";
        const digest = await engine.refresh(reason);
        return {
            status: 200,
            body: digest
        };
    }
    return {
        status: 404,
        body: {
            error: "Not found"
        }
    };
};
export const createAwarenessApiServer = async (engine, options) => {
    const host = options?.host ?? "127.0.0.1";
    let closed = false;
    const server = http.createServer((req, res) => {
        void (async () => {
            const requestUrl = new URL(req.url ?? "/", `http://${host}`);
            const body = req.method === "POST" ? await collectBody(req) : undefined;
            const response = await handleAwarenessApiRequest(engine, req.method ?? "GET", requestUrl, body);
            writeJson(res, response);
        })().catch((error) => {
            writeJson(res, {
                status: 500,
                body: {
                    error: error instanceof Error ? error.message : "Awareness API error"
                }
            });
        });
    });
    await new Promise((resolve, reject) => {
        const onError = (error) => {
            server.off("error", onError);
            reject(error);
        };
        server.once("error", onError);
        server.listen(options?.port ?? 0, host, () => {
            server.off("error", onError);
            resolve();
        });
    });
    const address = server.address();
    if (!address || typeof address === "string") {
        throw new Error("Failed to start awareness API server.");
    }
    return {
        port: address.port,
        baseUrl: `http://${host}:${address.port}`,
        close: async () => {
            if (closed) {
                return;
            }
            closed = true;
            await new Promise((resolve, reject) => {
                server.close((error) => {
                    if (error) {
                        reject(error);
                    }
                    else {
                        resolve();
                    }
                });
            });
        }
    };
};
