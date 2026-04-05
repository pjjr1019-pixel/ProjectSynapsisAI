import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "..", "..");

export function createTempTaskmanagerRoot(prefix = "horizons-workflow-runtime-") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.mkdirSync(path.join(root, "brain", "runtime", "settings"), { recursive: true });
  fs.mkdirSync(path.join(root, "brain", "runtime", "workflows", "candidates"), { recursive: true });
  fs.mkdirSync(path.join(root, "brain", "runtime", "workflows", "trusted"), { recursive: true });
  fs.mkdirSync(path.join(root, "brain", "runtime", "workflows", "archive"), { recursive: true });
  fs.mkdirSync(path.join(root, "brain", "runtime", "workflow-runs"), { recursive: true });
  fs.mkdirSync(path.join(root, "brain", "runtime", "workflow-index"), { recursive: true });
  fs.mkdirSync(path.join(root, "brain", "generated", "runtime"), { recursive: true });
  fs.mkdirSync(path.join(root, "brain", "retrieval", "indexes"), { recursive: true });
  fs.mkdirSync(path.join(root, ".runtime"), { recursive: true });
  fs.mkdirSync(path.join(root, "Desktop"), { recursive: true });
  fs.mkdirSync(path.join(root, "Documents"), { recursive: true });
  return root;
}

export function seedMinimalTaskmanagerState(root) {
  const runtimeSettingsPath = path.join(root, "brain", "runtime", "settings", "runtime-settings.json");
  const developerSettingsPath = path.join(root, "brain", "runtime", "settings", "developer-mode-settings.json");
  const profilesPath = path.join(root, "brain", "retrieval", "profiles.json");
  const chunksPath = path.join(root, "brain", "retrieval", "indexes", "chunks.jsonl");

  const runtimeSettings = {
    schemaVersion: "2.0",
    crawlers: [],
    updatedAt: new Date().toISOString(),
  };
  const developerSettings = {
    enabled: true,
    snapshot: { pollMs: 2500 },
    logs: { pollMs: 1500, limit: 120, source: "all" },
    chat: { streaming: false, localLlm: false, internet: false, profileName: "repo-knowledge-pack" },
    ui: { density: "compact", defaultInspector: "pipeline", defaultLogSource: "all" },
    features: { workerPanel: false },
    debug: { forceDryRun: false, verboseDiagnostics: false, showRawPayloads: false },
  };
  const profiles = {
    profiles: {
      "repo-knowledge-pack": {
        includeDomains: ["assistant", "taskmanager", "process", "system", "runtime"],
        allowedApps: [],
        minConfidence: 0,
        allowMemory: true,
        allowDraft: true,
        allowImports: true,
      },
    },
  };

  fs.writeFileSync(runtimeSettingsPath, `${JSON.stringify(runtimeSettings, null, 2)}\n`, "utf8");
  fs.writeFileSync(developerSettingsPath, `${JSON.stringify(developerSettings, null, 2)}\n`, "utf8");
  fs.writeFileSync(profilesPath, `${JSON.stringify(profiles, null, 2)}\n`, "utf8");
  fs.writeFileSync(chunksPath, "", "utf8");
}

export function applyRuntimeTestEnv(root) {
  process.env.HORIZONS_TASKMANAGER_ROOT = root;
  process.env.HORIZONS_BRAIN_ROOT = path.join(root, "brain");
  process.env.HORIZONS_RUNTIME_STATE_ROOT = path.join(root, ".runtime");
  process.env.HORIZONS_GENERATED_RUNTIME_ROOT = path.join(root, "brain", "generated", "runtime");
  process.env.HORIZONS_WORKFLOW_RUNTIME_ROOT = path.join(root, "brain", "runtime", "workflows");
  process.env.HORIZONS_WORKFLOW_RUNTIME_BASE_ROOT = path.join(root, "brain", "runtime");
  process.env.HORIZONS_GOVERNED_RUNTIME_ROOT = path.join(root, "brain", "runtime", "logs", "governed-actions");
  process.env.HORIZONS_DESKTOP_PATH = path.join(root, "Desktop");
  process.env.HORIZONS_DOCUMENTS_PATH = path.join(root, "Documents");
  process.env.LOCAL_LLM_MODE = "off";
}

export function clearDirectoryContents(target) {
  if (!fs.existsSync(target)) return;
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    fs.rmSync(path.join(target, entry.name), { recursive: true, force: true });
  }
}

export function resetRuntimeTestRoot(root) {
  clearDirectoryContents(path.join(root, "brain", "runtime", "workflows", "candidates"));
  clearDirectoryContents(path.join(root, "brain", "runtime", "workflows", "trusted"));
  clearDirectoryContents(path.join(root, "brain", "runtime", "workflows", "archive"));
  clearDirectoryContents(path.join(root, "brain", "runtime", "workflow-runs"));
  clearDirectoryContents(path.join(root, "brain", "runtime", "workflow-index"));
  clearDirectoryContents(path.join(root, "brain", "runtime", "logs"));
  clearDirectoryContents(path.join(root, "Desktop"));
  clearDirectoryContents(path.join(root, "Documents"));
}

export async function importFresh(relativePath) {
  const fullPath = path.resolve(REPO_ROOT, relativePath);
  return import(`${pathToFileURL(fullPath).href}?test=${Date.now()}-${Math.random().toString(16).slice(2)}`);
}

export function createMockRequest(method, url, body = null) {
  const payload = body == null ? [] : [Buffer.from(JSON.stringify(body), "utf8")];
  return {
    method,
    url,
    headers: {},
    async *[Symbol.asyncIterator]() {
      for (const chunk of payload) yield chunk;
    },
  };
}

export function createMockResponse() {
  return {
    statusCode: null,
    headers: null,
    body: "",
    headersSent: false,
    writableEnded: false,
    destroyed: false,
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers;
      this.headersSent = true;
    },
    end(chunk = "") {
      this.body += chunk ? String(chunk) : "";
      this.writableEnded = true;
    },
  };
}

export async function invokeRoute(module, method, url, body = null) {
  const req = createMockRequest(method, url, body);
  const res = createMockResponse();
  const pathname = new URL(url, "http://127.0.0.1").pathname;
  const handled = await module.handleTaskManagerHttpRoute({
    req,
    res,
    headers: {},
    pathname,
  });
  return {
    handled,
    statusCode: res.statusCode,
    headers: res.headers,
    json: res.body ? JSON.parse(res.body) : null,
  };
}

