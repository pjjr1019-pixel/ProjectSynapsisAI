import * as http from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import type {
  AwarenessCurrentUiDiagnostic,
  AwarenessDigest,
  AwarenessPerformanceDiagnostic,
  AwarenessQueryRequest,
  AwarenessScopeSummary,
  AwarenessStartupDiagnostic,
  AwarenessSummaryMode,
  AwarenessSummaryScope,
  ScreenAwarenessStatus,
  StartAssistModeOptions
} from "../../../contracts/src/awareness";
import type { AwarenessEngine, AwarenessStatus } from "../bootstrap";
import {
  findFolderSummary,
  getLargestFiles,
  getRecentChanges,
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

const parseSummaryScope = (value: string | null): AwarenessSummaryScope =>
  value && SUMMARY_SCOPES.includes(value as AwarenessSummaryScope) ? (value as AwarenessSummaryScope) : "current-machine";

const parseSummaryMode = (value: string | null): AwarenessSummaryMode | undefined =>
  value && SUMMARY_MODES.includes(value as AwarenessSummaryMode) ? (value as AwarenessSummaryMode) : undefined;

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
          : undefined
    };
  }

  return {
    query: requestUrl.searchParams.get("q") ?? requestUrl.searchParams.get("query") ?? ""
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

  if (pathname === "/api/awareness/query" && method === "POST") {
    const request = parseQueryRequest(body, requestUrl);
    return {
      status: 200,
      body: engine.queryAwareness(request)
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

  if (pathname === "/api/awareness/diagnostics/current-ui" && method === "GET") {
    const diagnostic: AwarenessCurrentUiDiagnostic = engine.getCurrentUiDiagnostic();
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

  if (pathname === "/api/awareness/files/roots" && method === "GET") {
    return {
      status: 200,
      body: engine.fileAwareness.roots
    };
  }

  if (pathname === "/api/awareness/files/search" && method === "GET") {
    const query = requestUrl.searchParams.get("q") ?? "";
    return {
      status: 200,
      body: {
        query,
        files: searchFileEntries(engine.fileAwareness, query, 20),
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

  if (pathname === "/api/awareness/media/search" && method === "GET") {
    const query = requestUrl.searchParams.get("q") ?? "";
    return {
      status: 200,
      body: {
        query,
        results: searchMediaEntries(engine.fileAwareness, query, 20)
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
