import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import * as path from "node:path";
import { ensureLocalEnvLoaded } from "./env";
const DEFAULT_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_MODEL = "llama3.2";
const DEFAULT_STARTUP_TIMEOUT_MS = 8000;
const DEFAULT_STARTUP_POLL_MS = 250;
let lastReachableBaseUrl = null;
let ensureServePromise = null;
const normalizeBaseUrl = (baseUrl) => {
    return baseUrl.trim().replace(/\/+$/, "");
};
const uniqueBaseUrls = (values) => {
    return [...new Set(values.map((value) => (value ? normalizeBaseUrl(value) : null)).filter(Boolean))];
};
const buildCandidateBaseUrls = (preferredBaseUrl) => {
    const preferred = normalizeBaseUrl(preferredBaseUrl);
    const localhostVariant = preferred.includes("127.0.0.1")
        ? preferred.replace("127.0.0.1", "localhost")
        : preferred.includes("localhost")
            ? preferred.replace("localhost", "127.0.0.1")
            : null;
    return uniqueBaseUrls([
        preferred,
        lastReachableBaseUrl,
        process.env.OLLAMA_BASE_URL,
        localhostVariant,
        DEFAULT_BASE_URL,
        DEFAULT_BASE_URL.replace("127.0.0.1", "localhost")
    ]);
};
const readSpawnResultPath = (stdout) => {
    return stdout
        .split(/\r?\n/)
        .map((entry) => entry.trim())
        .find(Boolean) ?? null;
};
const defaultFindExecutable = () => {
    const explicitPath = process.env.OLLAMA_EXECUTABLE?.trim();
    if (explicitPath && existsSync(explicitPath)) {
        return explicitPath;
    }
    const localAppData = process.env.LOCALAPPDATA?.trim();
    if (localAppData) {
        const installedPath = path.join(localAppData, "Programs", "Ollama", "ollama.exe");
        if (existsSync(installedPath)) {
            return installedPath;
        }
    }
    const homeInstallPath = path.join(homedir(), "AppData", "Local", "Programs", "Ollama", "ollama.exe");
    if (existsSync(homeInstallPath)) {
        return homeInstallPath;
    }
    const lookupCommand = process.platform === "win32" ? "where" : "which";
    const result = spawnSync(lookupCommand, ["ollama"], {
        encoding: "utf8",
        windowsHide: true
    });
    if (result.status === 0) {
        return readSpawnResultPath(result.stdout);
    }
    return null;
};
const defaultSpawnServe = (executablePath) => {
    const child = spawn(executablePath, ["serve"], {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
        env: process.env
    });
    child.unref();
};
const defaultSleep = async (ms) => {
    await new Promise((resolve) => setTimeout(resolve, ms));
};
const defaultRuntimeHooks = {
    findExecutable: defaultFindExecutable,
    spawnServe: defaultSpawnServe,
    sleep: defaultSleep
};
let runtimeHooks = defaultRuntimeHooks;
const extractOllamaErrorDetail = (error) => {
    if (!(error instanceof Error)) {
        return "Unknown Ollama error";
    }
    const parts = [error.message];
    const cause = error.cause;
    if (cause instanceof Error) {
        parts.push(cause.message);
    }
    else if (cause && typeof cause === "object") {
        const causeRecord = cause;
        if (typeof causeRecord.message === "string") {
            parts.push(causeRecord.message);
        }
        if (typeof causeRecord.code === "string") {
            parts.push(causeRecord.code);
        }
    }
    return [...new Set(parts.filter(Boolean))].join(" | ");
};
export const isOllamaReachabilityErrorDetail = (detail) => {
    if (!detail) {
        return false;
    }
    return /fetch failed|ECONNREFUSED|ENOTFOUND|EADDRNOTAVAIL|timed out|Unable to connect|Could not reach Ollama|socket/i.test(detail);
};
const rawOllamaFetch = async (baseUrl, requestPath, init) => {
    const response = await fetch(`${baseUrl}${requestPath}`, {
        headers: {
            "Content-Type": "application/json"
        },
        ...init
    });
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Ollama request failed (${response.status}): ${body}`);
    }
    return (await response.json());
};
const probeOllamaBaseUrl = async (baseUrl) => {
    try {
        await rawOllamaFetch(baseUrl, "/api/tags", {
            signal: AbortSignal.timeout(1500)
        });
        lastReachableBaseUrl = normalizeBaseUrl(baseUrl);
        return true;
    }
    catch {
        return false;
    }
};
const waitForReachableOllama = async (baseUrls) => {
    const deadline = Date.now() + DEFAULT_STARTUP_TIMEOUT_MS;
    while (Date.now() < deadline) {
        for (const baseUrl of baseUrls) {
            if (await probeOllamaBaseUrl(baseUrl)) {
                return normalizeBaseUrl(baseUrl);
            }
        }
        await runtimeHooks.sleep(DEFAULT_STARTUP_POLL_MS);
    }
    return null;
};
const ensureOllamaServing = async (baseUrls) => {
    if (!ensureServePromise) {
        ensureServePromise = (async () => {
            const executablePath = runtimeHooks.findExecutable();
            if (!executablePath) {
                return {
                    baseUrl: null,
                    executablePath: null
                };
            }
            try {
                runtimeHooks.spawnServe(executablePath);
            }
            catch {
                return {
                    baseUrl: null,
                    executablePath
                };
            }
            return {
                baseUrl: await waitForReachableOllama(baseUrls),
                executablePath
            };
        })();
    }
    try {
        return await ensureServePromise;
    }
    finally {
        ensureServePromise = null;
    }
};
const resolveReachableOllamaConfig = async (config) => {
    const candidates = buildCandidateBaseUrls(config.baseUrl);
    for (const baseUrl of candidates) {
        if (await probeOllamaBaseUrl(baseUrl)) {
            return {
                ...config,
                baseUrl
            };
        }
    }
    const startResult = await ensureOllamaServing(candidates);
    if (startResult.baseUrl) {
        return {
            ...config,
            baseUrl: startResult.baseUrl
        };
    }
    const attemptedBaseUrl = candidates[0] ?? normalizeBaseUrl(config.baseUrl);
    if (startResult.executablePath) {
        throw new Error(`Could not reach Ollama at ${attemptedBaseUrl}. SynAI tried to start Ollama automatically, but the server never became reachable.`);
    }
    throw new Error(`Could not reach Ollama at ${attemptedBaseUrl}. Ollama is not installed or not available on PATH.`);
};
export const getOllamaConfig = (overrides) => {
    ensureLocalEnvLoaded();
    return {
        baseUrl: overrides?.baseUrl ?? lastReachableBaseUrl ?? process.env.OLLAMA_BASE_URL ?? DEFAULT_BASE_URL,
        model: overrides?.model ?? process.env.OLLAMA_MODEL ?? DEFAULT_MODEL,
        embedModel: overrides?.embedModel ?? process.env.OLLAMA_EMBED_MODEL
    };
};
export const ollamaFetch = async (config, requestPath, init) => {
    const resolvedConfig = await resolveReachableOllamaConfig(config);
    try {
        return await rawOllamaFetch(resolvedConfig.baseUrl, requestPath, init);
    }
    catch (error) {
        const detail = extractOllamaErrorDetail(error);
        if (isOllamaReachabilityErrorDetail(detail)) {
            throw new Error(`Could not reach Ollama at ${resolvedConfig.baseUrl}. ${detail}`);
        }
        throw error;
    }
};
export const ollamaChat = async (config, messages) => {
    const payload = {
        model: config.model,
        stream: false,
        messages
    };
    const data = await ollamaFetch(config, "/api/chat", {
        method: "POST",
        body: JSON.stringify(payload)
    });
    return data.message?.content ?? "";
};
const parseOllamaStreamLine = (line, content, onChunk) => {
    const parsed = JSON.parse(line);
    const delta = parsed.message?.content ?? "";
    const nextContent = delta ? `${content}${delta}` : content;
    if (delta) {
        onChunk(nextContent);
    }
    return {
        content: nextContent,
        done: Boolean(parsed.done)
    };
};
export const ollamaChatStream = async (config, messages, onChunk) => {
    const resolvedConfig = await resolveReachableOllamaConfig(config);
    let response;
    try {
        response = await fetch(`${resolvedConfig.baseUrl}/api/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: resolvedConfig.model,
                stream: true,
                messages
            })
        });
    }
    catch (error) {
        const detail = extractOllamaErrorDetail(error);
        if (isOllamaReachabilityErrorDetail(detail)) {
            throw new Error(`Could not reach Ollama at ${resolvedConfig.baseUrl}. ${detail}`);
        }
        throw error;
    }
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Ollama request failed (${response.status}): ${body}`);
    }
    if (!response.body) {
        return "";
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let content = "";
    let buffer = "";
    while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line) {
                continue;
            }
            const parsed = parseOllamaStreamLine(line, content, onChunk);
            content = parsed.content;
            if (parsed.done) {
                return content;
            }
        }
        if (done) {
            break;
        }
    }
    const trailingLine = buffer.trim();
    if (trailingLine) {
        const parsed = parseOllamaStreamLine(trailingLine, content, onChunk);
        content = parsed.content;
    }
    return content;
};
export const ollamaEmbeddings = async (config, text) => {
    if (!config.embedModel) {
        return [];
    }
    const data = await ollamaFetch(config, "/api/embeddings", {
        method: "POST",
        body: JSON.stringify({
            model: config.embedModel,
            prompt: text
        })
    });
    return data.embedding ?? [];
};
export const pingOllama = async (config) => {
    await ollamaFetch(config, "/api/tags");
};
export const listOllamaModels = async (config) => {
    const data = await ollamaFetch(config, "/api/tags");
    return data.models.map((model) => model.name);
};
export const __setOllamaRuntimeHooksForTests = (hooks) => {
    runtimeHooks = {
        ...defaultRuntimeHooks,
        ...hooks
    };
};
export const __resetOllamaRuntimeForTests = () => {
    runtimeHooks = defaultRuntimeHooks;
    lastReachableBaseUrl = null;
    ensureServePromise = null;
};
