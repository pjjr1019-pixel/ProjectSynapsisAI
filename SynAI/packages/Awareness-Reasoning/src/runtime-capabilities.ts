// Phase 6: Capability registry extension and intent-based lookup
import type {
  RequestIntent,
  CapabilityMatch,
  CapabilityLookupResult,
  CapabilitySource,
  CapabilityType,
  UnsupportedRequestReason
} from "../../../Governance-Execution/src/governed-chat/types";

/**
 * Find capabilities matching a given intent. This is the primary lookup for all capability routing.
 * @param registryEntries CapabilityRegistryEntry[]
 * @param intent RequestIntent
 * @returns CapabilityLookupResult
 */
export function findCapabilitiesForIntent(
  registryEntries: CapabilityRegistryEntry[],
  intent: RequestIntent
): CapabilityLookupResult {
  // Simple deterministic matching: match by family/category, then by label/signals
  const matches: CapabilityMatch[] = [];
  for (const entry of registryEntries) {
    // Map kind to CapabilityType
    let type: CapabilityType = "skill";
    if (entry.kind === "desktop-action" || entry.kind === "workflow-step") type = "action";
    else if (entry.kind === "executor" || entry.kind === "workflow-family") type = "executor";
    else if (entry.kind === "system-surface" || entry.kind === "browser-capability") type = "surface";

    // Map source
    let source: CapabilitySource = "runtime-registry";
    if (entry.source?.startsWith("windows-action")) source = "windows-action-adapter";
    else if (entry.source?.startsWith("plugin")) source = "plugin";
    else if (entry.source?.startsWith("builtin")) source = "builtin";

    // Family/category match
    if (
      (entry.kind === intent.family || (entry.metadata?.category && entry.metadata.category === intent.family)) ||
      (Array.isArray(entry.metadata?.families) && entry.metadata.families.includes(intent.family))
    ) {
      matches.push({
        capabilityId: entry.id,
        name: entry.title,
        matchConfidence: 1.0,
        matchReason: "category",
        source,
        type
      });
      continue;
    }
    // Label/alias match
    if (
      entry.title.toLowerCase() === intent.label.toLowerCase() ||
      (Array.isArray(entry.metadata?.aliases) && entry.metadata.aliases.includes(intent.label))
    ) {
      matches.push({
        capabilityId: entry.id,
        name: entry.title,
        matchConfidence: 0.9,
        matchReason: "alias",
        source,
        type
      });
      continue;
    }
    // Signal match
    if (
      Array.isArray(intent.signals) &&
      Array.isArray(entry.metadata?.signals) &&
      intent.signals.some((sig) => entry.metadata.signals.includes(sig))
    ) {
      matches.push({
        capabilityId: entry.id,
        name: entry.title,
        matchConfidence: 0.7,
        matchReason: "intent",
        source,
        type
      });
    }
  }
  let unsupportedReason: UnsupportedRequestReason | undefined = undefined;
  if (matches.length === 0) unsupportedReason = "NO_CAPABILITY";
  return { matches, unsupportedReason };
}
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import type {
  CapabilityRegistryEntry,
  RuntimeCapabilityPluginCapability,
  RuntimeCapabilityPluginManifest,
  RuntimeCapabilityPluginRecord
} from "./contracts/ipc";

export interface RuntimeCapabilityRegistrySnapshot {
  capturedAt: string;
  plugins: RuntimeCapabilityPluginRecord[];
  entries: CapabilityRegistryEntry[];
}

const DEFAULT_PLUGIN_DIR_NAME = "plugins";
const CAPABILITY_KINDS = new Set<CapabilityRegistryEntry["kind"]>([
  "desktop-action",
  "workflow-family",
  "workflow-step",
  "browser-capability",
  "executor",
  "skill",
  "system-surface"
]);
const CAPABILITY_STATUSES = new Set<CapabilityRegistryEntry["status"]>([
  "active",
  "partial",
  "planned",
  "blocked"
]);

const normalizeId = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 128) || "plugin";

const walkJsonFiles = async (root: string): Promise<string[]> => {
  const files: string[] = [];
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkJsonFiles(fullPath)));
      continue;
    }
    if (entry.isFile() && /\.json$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
};

const resolvePluginSearchRoots = (runtimeRoot: string, workspaceRoot?: string | null): string[] =>
  [path.join(runtimeRoot, DEFAULT_PLUGIN_DIR_NAME), workspaceRoot ? path.join(workspaceRoot, DEFAULT_PLUGIN_DIR_NAME) : null]
    .filter((value): value is string => Boolean(value));

const readJson = async <T>(filePath: string): Promise<T | null> => {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const coerceCapabilityDefinition = (
  value: unknown,
  pluginId: string,
  pluginVersion: string,
  manifestPath: string
): CapabilityRegistryEntry | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = typeof record.id === "string" && record.id.trim().length > 0 ? record.id.trim() : "";
  const kind = typeof record.kind === "string" && CAPABILITY_KINDS.has(record.kind as CapabilityRegistryEntry["kind"])
    ? (record.kind as CapabilityRegistryEntry["kind"])
    : null;
  const title = typeof record.title === "string" && record.title.trim().length > 0 ? record.title.trim() : id;
  const description =
    typeof record.description === "string" && record.description.trim().length > 0
      ? record.description.trim()
      : `${title} capability.`;
  const status =
    typeof record.status === "string" && CAPABILITY_STATUSES.has(record.status as CapabilityRegistryEntry["status"])
      ? (record.status as CapabilityRegistryEntry["status"])
      : "partial";
  const riskClass =
    record.riskClass === "low" ||
    record.riskClass === "medium" ||
    record.riskClass === "high" ||
    record.riskClass === "critical"
      ? record.riskClass
      : "low";
  const approvalRequired = Boolean(record.approvalRequired);

  if (!id || !kind) {
    return null;
  }

  return {
    id,
    kind,
    title,
    description,
    status,
    riskClass,
    approvalRequired,
    source: `runtime-plugin:${pluginId}`,
    metadata: {
      ...(typeof record.metadata === "object" && record.metadata !== null ? (record.metadata as Record<string, unknown>) : {}),
      pluginId,
      pluginVersion,
      manifestPath
    }
  };
};

const normalizeManifest = (
  raw: Partial<RuntimeCapabilityPluginManifest> & Record<string, unknown>,
  manifestPath: string
): RuntimeCapabilityPluginManifest => {
  const pluginId = typeof raw.id === "string" && raw.id.trim().length > 0 ? raw.id.trim() : path.basename(path.dirname(manifestPath));
  const title = typeof raw.title === "string" && raw.title.trim().length > 0 ? raw.title.trim() : pluginId;
  const version = typeof raw.version === "string" && raw.version.trim().length > 0 ? raw.version.trim() : "0.0.0";
  const description =
    typeof raw.description === "string" && raw.description.trim().length > 0
      ? raw.description.trim()
      : `${title} runtime plugin.`;
  const capabilities = Array.isArray(raw.capabilities)
    ? raw.capabilities
        .map((entry) => {
          if (!entry || typeof entry !== "object") {
            return null;
          }
          const record = entry as Partial<RuntimeCapabilityPluginCapability> & Record<string, unknown>;
          const id = typeof record.id === "string" ? record.id.trim() : "";
          const kind =
            typeof record.kind === "string" && CAPABILITY_KINDS.has(record.kind as CapabilityRegistryEntry["kind"])
              ? (record.kind as RuntimeCapabilityPluginCapability["kind"])
              : "";
          const title = typeof record.title === "string" ? record.title.trim() : id;
          const description =
            typeof record.description === "string" && record.description.trim().length > 0
              ? record.description.trim()
              : `${title} capability.`;
          if (!id || !kind) {
            return null;
          }
          return {
            id,
            kind: kind as RuntimeCapabilityPluginCapability["kind"],
            title,
            description,
            status:
              record.status === "active" ||
              record.status === "partial" ||
              record.status === "planned" ||
              record.status === "blocked"
                ? record.status
                : undefined,
            riskClass:
              record.riskClass === "low" ||
              record.riskClass === "medium" ||
              record.riskClass === "high" ||
              record.riskClass === "critical"
                ? record.riskClass
                : undefined,
            approvalRequired: typeof record.approvalRequired === "boolean" ? record.approvalRequired : undefined,
            metadata:
              typeof record.metadata === "object" && record.metadata !== null
                ? (record.metadata as Record<string, unknown>)
                : undefined
          } satisfies RuntimeCapabilityPluginCapability;
        })
        .filter((entry): entry is RuntimeCapabilityPluginCapability => Boolean(entry))
    : [];

  return {
    id: pluginId,
    title,
    version,
    description,
    enabled: raw.enabled !== false,
    approved: Boolean(raw.approved),
    approvedBy: typeof raw.approvedBy === "string" ? raw.approvedBy : null,
    approvedAt: typeof raw.approvedAt === "string" ? raw.approvedAt : null,
    entrypoint: typeof raw.entrypoint === "string" && raw.entrypoint.trim().length > 0 ? raw.entrypoint.trim() : null,
    capabilities,
    metadata: typeof raw.metadata === "object" && raw.metadata !== null ? (raw.metadata as Record<string, unknown>) : undefined
  };
};

const resolveManifestCandidates = async (roots: string[]): Promise<string[]> => {
  const candidates = new Set<string>();
  for (const root of roots) {
    const rootEntries = await readdir(root, { withFileTypes: true }).catch(() => []);
    for (const entry of rootEntries) {
      const fullPath = path.join(root, entry.name);
      if (entry.isFile() && (path.basename(entry.name).toLowerCase() === "plugin.json" || /\.plugin\.json$/i.test(entry.name))) {
        candidates.add(fullPath);
        continue;
      }
      if (!entry.isDirectory()) {
        continue;
      }
      const pluginJsonPath = path.join(fullPath, "plugin.json");
      const pluginJsonExists = await readFile(pluginJsonPath, "utf8").then(() => true).catch(() => false);
      if (pluginJsonExists) {
        candidates.add(pluginJsonPath);
      }
      const nestedJsons = await walkJsonFiles(fullPath);
      for (const nested of nestedJsons) {
        const baseName = path.basename(nested).toLowerCase();
        if (baseName === "plugin.json" || baseName.endsWith(".plugin.json")) {
          candidates.add(nested);
        }
      }
    }
  }
  return [...candidates];
};

const loadCapabilitiesFromModule = async (
  manifest: RuntimeCapabilityPluginManifest,
  manifestPath: string
): Promise<CapabilityRegistryEntry[]> => {
  if (!manifest.enabled || !manifest.approved || !manifest.entrypoint) {
    return [];
  }

  const entrypointPath = path.isAbsolute(manifest.entrypoint)
    ? manifest.entrypoint
    : path.resolve(path.dirname(manifestPath), manifest.entrypoint);

  const moduleExports = await import(pathToFileURL(entrypointPath).href);
  const rawCapabilities =
    typeof moduleExports.getCapabilities === "function"
      ? await moduleExports.getCapabilities(manifest)
      : Array.isArray(moduleExports.capabilities)
        ? moduleExports.capabilities
        : Array.isArray(moduleExports.default)
          ? moduleExports.default
          : [];

  const capabilities = Array.isArray(rawCapabilities) ? rawCapabilities : [];
  return capabilities
    .map((entry) => coerceCapabilityDefinition(entry, manifest.id, manifest.version, manifestPath))
    .filter((entry): entry is CapabilityRegistryEntry => Boolean(entry));
};

const buildPluginSummaryEntry = (
  manifest: RuntimeCapabilityPluginManifest,
  record: RuntimeCapabilityPluginRecord
): CapabilityRegistryEntry => {
  const status = record.loaded
    ? "active"
    : !manifest.enabled
      ? "planned"
      : !manifest.approved
        ? "blocked"
        : "partial";

  return {
    id: `runtime-plugin.${manifest.id}`,
    kind: "skill",
    title: manifest.title,
    description: manifest.description,
    status,
    riskClass: record.capabilities.some((entry) => entry.riskClass === "critical" || entry.riskClass === "high")
      ? "high"
      : record.capabilities.some((entry) => entry.riskClass === "medium")
        ? "medium"
        : "low",
    approvalRequired: !manifest.approved,
    source: "runtime-plugin-loader",
    metadata: {
      pluginId: manifest.id,
      version: manifest.version,
      manifestPath: record.manifestPath,
      enabled: manifest.enabled,
      approved: manifest.approved,
      approvedBy: manifest.approvedBy,
      approvedAt: manifest.approvedAt,
      entrypoint: manifest.entrypoint,
      loaded: record.loaded,
      loadError: record.loadError,
      capabilityCount: record.capabilities.length
    }
  };
};

const writeManifest = async (manifestPath: string, manifest: RuntimeCapabilityPluginManifest): Promise<void> => {
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
};

const loadManifestRecord = async (manifestPath: string): Promise<RuntimeCapabilityPluginRecord | null> => {
  const raw = await readJson<Record<string, unknown>>(manifestPath);
  if (!raw) {
    return null;
  }

  const manifest = normalizeManifest(raw, manifestPath);
  let loaded = false;
  let loadError: string | null = null;
  let capabilities: CapabilityRegistryEntry[] = [];

  try {
    capabilities = await loadCapabilitiesFromModule(manifest, manifestPath);
    loaded = capabilities.length > 0 || (!manifest.entrypoint && manifest.enabled && manifest.approved);
  } catch (error) {
    loadError = error instanceof Error ? error.message : String(error);
  }

  if (!manifest.enabled || !manifest.approved) {
    loaded = false;
    if (!loadError) {
      loadError = manifest.approved ? "Plugin is disabled." : "Plugin is not approved.";
    }
    capabilities = [];
  }

  return {
    manifest,
    manifestPath,
    loaded,
    loadError,
    capabilities
  };
};

export const listRuntimeCapabilityPlugins = async (
  runtimeRoot: string,
  workspaceRoot?: string | null
): Promise<RuntimeCapabilityPluginRecord[]> => {
  const roots = resolvePluginSearchRoots(runtimeRoot, workspaceRoot);
  const manifestPaths = await resolveManifestCandidates(roots);
  const records: RuntimeCapabilityPluginRecord[] = [];
  const seenIds = new Set<string>();

  for (const manifestPath of manifestPaths.sort()) {
    const record = await loadManifestRecord(manifestPath);
    if (!record) {
      continue;
    }
    if (seenIds.has(record.manifest.id)) {
      continue;
    }
    seenIds.add(record.manifest.id);
    records.push(record);
  }

  return records.sort((left, right) => left.manifest.id.localeCompare(right.manifest.id));
};

export const loadRuntimeCapabilityRegistry = async (
  runtimeRoot: string,
  workspaceRoot?: string | null
): Promise<RuntimeCapabilityRegistrySnapshot> => {
  const plugins = await listRuntimeCapabilityPlugins(runtimeRoot, workspaceRoot);
  const entries: CapabilityRegistryEntry[] = [];

  for (const plugin of plugins) {
    entries.push(buildPluginSummaryEntry(plugin.manifest, plugin));
    entries.push(...plugin.capabilities);
  }

  return {
    capturedAt: new Date().toISOString(),
    plugins,
    entries
  };
};

export const findRuntimeCapabilityPlugin = async (
  runtimeRoot: string,
  pluginId: string,
  workspaceRoot?: string | null
): Promise<RuntimeCapabilityPluginRecord | null> => {
  const plugins = await listRuntimeCapabilityPlugins(runtimeRoot, workspaceRoot);
  return plugins.find((entry) => entry.manifest.id === pluginId) ?? null;
};

export const upsertRuntimeCapabilityPluginManifest = async (
  runtimeRoot: string,
  manifest: RuntimeCapabilityPluginManifest
): Promise<RuntimeCapabilityPluginManifest> => {
  const normalized: RuntimeCapabilityPluginManifest = {
    ...manifest,
    id: normalizeId(manifest.id),
    title: manifest.title.trim(),
    version: manifest.version.trim(),
    description: manifest.description.trim(),
    enabled: Boolean(manifest.enabled),
    approved: Boolean(manifest.approved),
    approvedBy: manifest.approvedBy ?? null,
    approvedAt: manifest.approvedAt ?? null,
    entrypoint: manifest.entrypoint ?? null,
    capabilities: Array.isArray(manifest.capabilities) ? manifest.capabilities : []
  };
  const manifestPath = path.join(runtimeRoot, DEFAULT_PLUGIN_DIR_NAME, normalized.id, "plugin.json");
  await writeManifest(manifestPath, normalized);
  return normalized;
};

const updateManifestField = async (
  runtimeRoot: string,
  pluginId: string,
  updater: (manifest: RuntimeCapabilityPluginManifest) => RuntimeCapabilityPluginManifest,
  workspaceRoot?: string | null
): Promise<RuntimeCapabilityPluginManifest> => {
  const plugins = await listRuntimeCapabilityPlugins(runtimeRoot, workspaceRoot);
  const record = plugins.find((entry) => entry.manifest.id === pluginId);
  const manifestPath = record?.manifestPath ?? path.join(runtimeRoot, DEFAULT_PLUGIN_DIR_NAME, normalizeId(pluginId), "plugin.json");
  const current = record?.manifest ?? {
    id: normalizeId(pluginId),
    title: pluginId,
    version: "0.0.0",
    description: `${pluginId} runtime plugin.`,
    enabled: false,
    approved: false,
    approvedBy: null,
    approvedAt: null,
    entrypoint: null,
    capabilities: []
  };
  const updated = updater(current);
  await writeManifest(manifestPath, updated);
  return updated;
};

export const setRuntimeCapabilityPluginEnabled = async (
  runtimeRoot: string,
  pluginId: string,
  enabled: boolean,
  workspaceRoot?: string | null
): Promise<RuntimeCapabilityPluginManifest> =>
  await updateManifestField(runtimeRoot, pluginId, (manifest) => ({
    ...manifest,
    enabled
  }), workspaceRoot);

export const setRuntimeCapabilityPluginApproval = async (
  runtimeRoot: string,
  pluginId: string,
  approved: boolean,
  approvedBy: string | null,
  workspaceRoot?: string | null
): Promise<RuntimeCapabilityPluginManifest> =>
  await updateManifestField(runtimeRoot, pluginId, (manifest) => ({
    ...manifest,
    approved,
    approvedBy: approved ? approvedBy : null,
    approvedAt: approved ? new Date().toISOString() : null
  }), workspaceRoot);
