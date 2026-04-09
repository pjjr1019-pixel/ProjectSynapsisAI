import * as http from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import type {
  AwarenessAnswerMode,
  AwarenessAnomalyDiagnostic,
  AwarenessCurrentUiDiagnostic,
  AwarenessDigest,
  AwarenessEventLogDiagnostic,
  FolderListingSummary,
  OfficialKnowledgeContext,
  AwarenessPerformanceDiagnostic,
  AwarenessQueryRequest,
  AwarenessScopeSummary,
  AwarenessStorageDiagnostic,
  AwarenessStartupDiagnostic,
  AwarenessSummaryMode,
  AwarenessSummaryScope,
  ScreenAwarenessStatus,
  StartAssistModeOptions,
  VolumeAwarenessSnapshot,
  VolumeMonitorState
} from "../contracts/awareness";
import type { AwarenessEngine, AwarenessStatus } from "../bootstrap";
import type { OfficialKnowledgeStatus } from "../official-knowledge";
import {
  findFolderSummary,
  getLargestFiles,
  getRecentChanges,
  queryWindowsIndexedEntries,
  searchFileEntries,
  searchFolderSummaries,
  searchMediaEntries
} from "../files";

export interface AwarenessApiServer {
  port: number;
  baseUrl: string;
  close(): Promise<void>;
}

export interface AwarenessApiResponse<TBody> {
  status: number;
  body: TBody;
}

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
} as const;

const writeJson = <TBody>(res: ServerResponse, response: AwarenessApiResponse<TBody>): void => {
  res.writeHead(response.status, jsonHeaders);
  res.end(JSON.stringify(response.body, null, 2));
};

const collectBody = async (req: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
};

const SUMMARY_SCOPES: AwarenessSummaryScope[] = [
  "session",
  "previous-session",
  "last-report",
  "current-machine"
];

const SUMMARY_MODES: AwarenessSummaryMode[] = ["short", "medium", "detailed"];
const ANSWER_MODES: AwarenessAnswerMode[] = ["evidence-first", "llm-primary"];

const parseSummaryScope = (value: string | null): AwarenessSummaryScope =>
  value && SUMMARY_SCOPES.includes(value as AwarenessSummaryScope) ? (value as AwarenessSummaryScope) : "current-machine";

const parseSummaryMode = (value: string | null): AwarenessSummaryMode | undefined =>
  value && SUMMARY_MODES.includes(value as AwarenessSummaryMode) ? (value as AwarenessSummaryMode) : undefined;

const parseAnswerMode = (value: unknown): AwarenessAnswerMode | undefined =>
  typeof value === "string" && ANSWER_MODES.includes(value as AwarenessAnswerMode)
    ? (value as AwarenessAnswerMode)
    : undefined;

const parseQueryRequest = (body: unknown, requestUrl: URL): AwarenessQueryRequest => {
  if (body && typeof body === "object") {
    const value = body as Record<string, unknown>;
    return {
      query: typeof value.query === "string" ? value.query : "",
      scope:
        typeof value.scope === "string" && SUMMARY_SCOPES.includes(value.scope as AwarenessSummaryScope)
          ? (value.scope as AwarenessSummaryScope)
          : undefined,
      mode:
        typeof value.mode === "string" && SUMMARY_MODES.includes(value.mode as AwarenessSummaryMode)
          ? (value.mode as AwarenessSummaryMode)
          : undefined,
      awarenessAnswerMode: parseAnswerMode(value.awarenessAnswerMode),
      officialKnowledgePolicy:
        typeof value.officialKnowledgePolicy === "string"
          ? (value.officialKnowledgePolicy as AwarenessQueryRequest["officialKnowledgePolicy"])
          : undefined,
      allowOfficialWindowsKnowledge:
        typeof value.allowOfficialWindowsKnowledge === "boolean"
          ? value.allowOfficialWindowsKnowledge
          : undefined,
      windowsVersionHint: typeof value.windowsVersionHint === "string" ? value.windowsVersionHint : undefined,
      hints:
        value.hints && typeof value.hints === "object"
          ? {
              force:
                "force" in (value.hints as Record<string, unknown>) &&
                typeof (value.hints as Record<string, unknown>).force === "boolean"
                  ? ((value.hints as Record<string, unknown>).force as boolean)
                  : undefined,
              strictGrounding:
                "strictGrounding" in (value.hints as Record<string, unknown>) &&
                typeof (value.hints as Record<string, unknown>).strictGrounding === "boolean"
                  ? ((value.hints as Record<string, unknown>).strictGrounding as boolean)
                  : undefined,
              maxScanMs:
                "maxScanMs" in (value.hints as Record<string, unknown>) &&
                typeof (value.hints as Record<string, unknown>).maxScanMs === "number" &&
                Number.isFinite((value.hints as Record<string, unknown>).maxScanMs as number)
                  ? ((value.hints as Record<string, unknown>).maxScanMs as number)
                  : undefined,
              officialKnowledgePolicy:
                typeof (value.hints as Record<string, unknown>).officialKnowledgePolicy === "string"
                  ? ((value.hints as Record<string, unknown>).officialKnowledgePolicy as AwarenessQueryRequest["officialKnowledgePolicy"])
                  : undefined,
              allowOfficialWindowsKnowledge:
                typeof (value.hints as Record<string, unknown>).allowOfficialWindowsKnowledge === "boolean"
                  ? ((value.hints as Record<string, unknown>).allowOfficialWindowsKnowledge as boolean)
                  : undefined,
              windowsVersionHint:
                typeof (value.hints as Record<string, unknown>).windowsVersionHint === "string"
                  ? ((value.hints as Record<string, unknown>).windowsVersionHint as string)
                  : undefined
            }
          : undefined,
      refresh: typeof value.refresh === "boolean" ? value.refresh : undefined
    };
  }

  return {
    query: requestUrl.searchParams.get("q") ?? requestUrl.searchParams.get("query") ?? "",
    awarenessAnswerMode: parseAnswerMode(requestUrl.searchParams.get("awarenessAnswerMode")),
    officialKnowledgePolicy:
      (requestUrl.searchParams.get("officialKnowledgePolicy") as AwarenessQueryRequest["officialKnowledgePolicy"] | null) ?? undefined,
    allowOfficialWindowsKnowledge:
      requestUrl.searchParams.get("allowOfficialWindowsKnowledge") == null
        ? undefined
        : requestUrl.searchParams.get("allowOfficialWindowsKnowledge") !== "false",
    windowsVersionHint: requestUrl.searchParams.get("windowsVersionHint") ?? undefined,
    hints:
      requestUrl.searchParams.get("force") != null ||
      requestUrl.searchParams.get("strictGrounding") != null ||
      requestUrl.searchParams.get("maxScanMs") != null ||
      requestUrl.searchParams.get("officialKnowledgePolicy") != null ||
      requestUrl.searchParams.get("allowOfficialWindowsKnowledge") != null ||
      requestUrl.searchParams.get("windowsVersionHint") != null
        ? {
            force:
              requestUrl.searchParams.get("force") == null
                ? undefined
                : requestUrl.searchParams.get("force") !== "false",
            strictGrounding:
              requestUrl.searchParams.get("strictGrounding") == null
                ? undefined
                : requestUrl.searchParams.get("strictGrounding") !== "false",
            maxScanMs:
              requestUrl.searchParams.get("maxScanMs") == null
                ? undefined
                : (() => {
                    const parsed = Number(requestUrl.searchParams.get("maxScanMs"));
                    return Number.isFinite(parsed) ? parsed : undefined;
                  })(),
            officialKnowledgePolicy:
              (requestUrl.searchParams.get("officialKnowledgePolicy") as AwarenessQueryRequest["officialKnowledgePolicy"] | null) ?? undefined,
            allowOfficialWindowsKnowledge:
              requestUrl.searchParams.get("allowOfficialWindowsKnowledge") == null
                ? undefined
                : requestUrl.searchParams.get("allowOfficialWindowsKnowledge") !== "false",
            windowsVersionHint: requestUrl.searchParams.get("windowsVersionHint") ?? undefined
          }
        : undefined,
    refresh:
      requestUrl.searchParams.get("refresh") == null
        ? undefined
        : requestUrl.searchParams.get("refresh") !== "false"
  };
};

const toAssistOptions = (body: unknown): StartAssistModeOptions => {
  if (!body || typeof body !== "object") {
    return {};
  }

  const value = body as Record<string, unknown>;
  const options: StartAssistModeOptions = {};

  if (
    value.scope === "current-window" ||
    value.scope === "selected-app" ||
    value.scope === "chosen-display"
  ) {
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

export const handleAwarenessApiRequest = async (
  engine: AwarenessEngine,
  method: string,
  requestUrl: URL,
  body?: unknown
): Promise<AwarenessApiResponse<unknown>> => {
  const pathname = requestUrl.pathname;

  if (method === "OPTIONS") {
    return {
      status: 204,
      body: null
    };
  }

  if (pathname === "/api/awareness/status" && method === "GET") {
    const status: AwarenessStatus = engine.getStatus();
    return {
      status: 200,
      body: status
    };
  }

  if (pathname === "/api/awareness/digest" && method === "GET") {
    const digest: AwarenessDigest = engine.getDigest();
    return {
      status: 200,
      body: digest
    };
  }

  if (pathname === "/api/awareness/knowledge/status" && method === "GET") {
    const status: OfficialKnowledgeStatus = engine.getOfficialKnowledgeStatus();
    return {
      status: 200,
      body: status
    };
  }

  if (pathname === "/api/awareness/knowledge/query" && method === "POST") {
    const request = parseQueryRequest(body, requestUrl);
    const context: OfficialKnowledgeContext | null = await engine.queryOfficialKnowledge(request.query, {
      policy: request.officialKnowledgePolicy ?? request.hints?.officialKnowledgePolicy,
      windowsVersionHint: request.windowsVersionHint ?? request.hints?.windowsVersionHint,
      allowLiveFetch:
        (request.allowOfficialWindowsKnowledge ?? request.hints?.allowOfficialWindowsKnowledge ?? true) &&
        (request.officialKnowledgePolicy ?? request.hints?.officialKnowledgePolicy) === "live-fallback"
    });
    return {
      status: 200,
      body: context
    };
  }

  if (pathname === "/api/awareness/knowledge/refresh" && method === "POST") {
    const reason =
      typeof body === "object" && body !== null && "reason" in body && typeof (body as { reason?: unknown }).reason === "string"
        ? (body as { reason: string }).reason
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
    const summary: AwarenessScopeSummary = engine.getAwarenessSummary(scope, mode);
    return {
      status: 200,
      body: summary
    };
  }

  if (pathname === "/api/awareness/diagnostics/performance" && method === "GET") {
    const diagnostic: AwarenessPerformanceDiagnostic = engine.getPerformanceDiagnostic();
    return {
      status: 200,
      body: diagnostic
    };
  }

  if (pathname === "/api/awareness/diagnostics/startup" && method === "GET") {
    const diagnostic: AwarenessStartupDiagnostic = engine.getStartupDiagnostic();
    return {
      status: 200,
      body: diagnostic
    };
  }

  if (pathname === "/api/awareness/diagnostics/storage" && method === "GET") {
    const diagnostic: AwarenessStorageDiagnostic = engine.getStorageDiagnostic();
    return {
      status: 200,
      body: diagnostic
    };
  }

  if (pathname === "/api/awareness/diagnostics/current-ui" && method === "GET") {
    const diagnostic: AwarenessCurrentUiDiagnostic = engine.getCurrentUiDiagnostic();
    return {
      status: 200,
      body: diagnostic
    };
  }

  if (pathname === "/api/awareness/diagnostics/events" && method === "GET") {
    const diagnostic: AwarenessEventLogDiagnostic = engine.getEventLogDiagnostic();
    return {
      status: 200,
      body: diagnostic
    };
  }

  if (pathname === "/api/awareness/diagnostics/anomalies" && method === "GET") {
    const diagnostic: AwarenessAnomalyDiagnostic = engine.getAnomalyDiagnostic();
    return {
      status: 200,
      body: diagnostic
    };
  }

  if (pathname === "/api/awareness/screen/status" && method === "GET") {
    const screenStatus: ScreenAwarenessStatus = engine.getScreenStatus();
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
    const reason =
      typeof body === "object" && body !== null && "reason" in body && typeof (body as { reason?: unknown }).reason === "string"
        ? (body as { reason: string }).reason
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
    const volumes: VolumeAwarenessSnapshot[] = engine.listFileVolumes();
    return {
      status: 200,
      body: volumes
    };
  }

  if (pathname === "/api/awareness/files/search" && method === "GET") {
    const query = requestUrl.searchParams.get("q") ?? "";
    const indexedVolumeRoots =
      typeof engine.listFileVolumes === "function"
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
    const listing: FolderListingSummary | null = await engine.browseFolder(folderPath);
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
    const monitorStatus: VolumeMonitorState | null = engine.getFileMonitorStatus();
    return {
      status: 200,
      body: monitorStatus
    };
  }

  if (pathname === "/api/awareness/media/search" && method === "GET") {
    const query = requestUrl.searchParams.get("q") ?? "";
    const indexedVolumeRoots =
      typeof engine.listFileVolumes === "function"
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
    const reason =
      typeof body === "object" && body !== null && "reason" in body && typeof (body as { reason?: unknown }).reason === "string"
        ? (body as { reason: string }).reason
        : "api";
    const snapshot = await engine.refreshFiles(reason);
    return {
      status: 200,
      body: snapshot.summary
    };
  }

  if (pathname === "/api/awareness/refresh" && method === "POST") {
    const reason =
      typeof body === "object" && body !== null && "reason" in body && typeof (body as { reason?: unknown }).reason === "string"
        ? (body as { reason: string }).reason
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

export const createAwarenessApiServer = async (
  engine: AwarenessEngine,
  options?: { host?: string; port?: number }
): Promise<AwarenessApiServer> => {
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

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error): void => {
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
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    }
  };
};

