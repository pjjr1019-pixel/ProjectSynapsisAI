import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import type { AwarenessDigest } from "../../contracts/awareness";
import type { ChatReplyTaskClassifierResult } from "../../contracts/chat";
import type { ContextCachePackSummary, MemoryEntry, RetrievedMemory } from "../../contracts/memory";
import type { PromptIntentContract } from "../../contracts/prompt-intent";
import type { RetrievedPromptBehaviorMemory } from "../../contracts/prompt-preferences";
import type {
  CachePackType,
  ContextRouteDecision,
  RequestRouteMode,
  RetrievalHint
} from "../../contracts/rag";
import {
  getTaskSkillManifest,
  listTaskSkillManifests,
  type TaskSkillManifest
} from "../../context/task-skills";

const CONTEXT_CACHE_VERSION = "1";
const REPO_CORE_MAX_CHARS = 1200;
const TASK_SKILL_MAX_CHARS = 1100;
const WORK_CONTEXT_MAX_CHARS = 720;
const MEMORY_CONTEXT_MAX_CHARS = 720;
const MAX_PACK_SKILLS = 2;

const REPO_CORE_DOCS = [
  "context/AGENT_GUIDE.md",
  "context/REPO_MAP.md",
  "context/BLAST_RADIUS.md",
  "context/ARCHITECTURE_SUMMARY.md"
] as const;

export interface ResolvedContextCachePack extends ContextCachePackSummary {
  content: string;
  evidenceRefs: string[];
  dependencies: string[];
  sourceHashes: Record<string, string>;
  createdAt: string;
}

export interface ResolveHybridContextPlanInput {
  query: string;
  taskClassification: ChatReplyTaskClassifierResult;
  promptIntent?: PromptIntentContract | null;
  replyPolicySourceScope?: string | null;
  codingMode: boolean;
  highQualityMode: boolean;
  hasImageEvidence?: boolean;
  conversationMessageCount?: number;
  previousRouteMode?: RequestRouteMode | null;
}

export interface ResolveHybridContextPlanResult {
  routeDecision: ContextRouteDecision;
  selectedTaskSkills: TaskSkillManifest[];
  retrievalScopes: string[];
}

export interface ResolveContextCachePacksInput {
  workspaceRoot: string;
  runtimeRoot: string;
  routeDecision: ContextRouteDecision;
  selectedTaskSkills: TaskSkillManifest[];
  conversationId: string;
  latestUserMessage: string;
  summaryText: string;
  promptIntent?: PromptIntentContract | null;
  stableMemories: MemoryEntry[];
  retrievedMemories: RetrievedMemory[];
  promptBehaviorMemories: RetrievedPromptBehaviorMemory[];
  recentTouchedPaths?: string[];
  awarenessDigest?: AwarenessDigest | null;
}

export interface ResolveContextCachePacksResult {
  packs: ResolvedContextCachePack[];
  summaries: ContextCachePackSummary[];
}

interface StoredContextCacheManifest {
  version: string;
  updatedAt: string;
  packs: Record<
    string,
    {
      id: string;
      type: CachePackType;
      scope: string;
      version: string;
      dependencies: string[];
      sourceHashes: Record<string, string>;
      createdAt: string;
      tokenEstimate: number;
      evidenceRefs: string[];
    }
  >;
}

const normalizeWhitespace = (value: string): string =>
  value
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const estimateTokens = (value: string): number => Math.max(1, Math.ceil(value.length / 4));

const hashText = (value: string): string => createHash("sha256").update(value).digest("hex");

const compactMarkdown = (markdown: string, maxChars: number): string => {
  const lines = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("<!--"));
  const prioritized = lines.filter(
    (line) => line.startsWith("#") || line.startsWith("-") || /^\d+\./.test(line)
  );
  const selected = (prioritized.length > 0 ? prioritized : lines).slice(0, 20).join("\n");
  const compact = normalizeWhitespace(selected);
  return compact.length <= maxChars ? compact : `${compact.slice(0, maxChars - 3)}...`;
};

const matchesAny = (query: string, patterns: RegExp[]): boolean => patterns.some((pattern) => pattern.test(query));

const dedupe = <T>(values: T[]): T[] => [...new Set(values)];

const normalizeScope = (value: string | null | undefined): string => value?.trim().toLowerCase() ?? "";

const buildCachePaths = (runtimeRoot: string): { cacheRoot: string; manifestPath: string; packsRoot: string } => {
  const cacheRoot = path.join(path.resolve(runtimeRoot), "context-cache");
  return {
    cacheRoot,
    manifestPath: path.join(cacheRoot, "manifest.json"),
    packsRoot: path.join(cacheRoot, "packs")
  };
};

const readManifest = async (manifestPath: string): Promise<StoredContextCacheManifest> => {
  try {
    const raw = await readFile(manifestPath, "utf8");
    return JSON.parse(raw) as StoredContextCacheManifest;
  } catch {
    return {
      version: CONTEXT_CACHE_VERSION,
      updatedAt: new Date(0).toISOString(),
      packs: {}
    };
  }
};

const writeManifest = async (manifestPath: string, manifest: StoredContextCacheManifest): Promise<void> => {
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
};

const readPack = async (packPath: string): Promise<ResolvedContextCachePack | null> => {
  try {
    const raw = await readFile(packPath, "utf8");
    return JSON.parse(raw) as ResolvedContextCachePack;
  } catch {
    return null;
  }
};

const writePack = async (packPath: string, pack: ResolvedContextCachePack): Promise<void> => {
  await writeFile(packPath, JSON.stringify(pack, null, 2), "utf8");
};

const buildPackId = (type: CachePackType, scope: string): string =>
  `${type}-${hashText(`${type}:${scope}`).slice(0, 16)}`;

const repoStateKey = (digest?: AwarenessDigest | null): string | null => {
  if (!digest) {
    return null;
  }
  return [
    digest.repo.branch ?? "no-branch",
    digest.repo.headSha ?? "no-sha",
    digest.repo.dirtyState ?? "unknown"
  ].join(":");
};

const composeRetrievalHint = (
  selectedTaskSkills: TaskSkillManifest[],
  query: string,
  highQualityMode: boolean
): RetrievalHint | null => {
  const preferredPathGlobs = dedupe(selectedTaskSkills.flatMap((skill) => skill.preferredPathGlobs));
  const preferredExtensions = dedupe(selectedTaskSkills.flatMap((skill) => skill.preferredExtensions));
  const preferredDomains = dedupe(selectedTaskSkills.flatMap((skill) => skill.preferredDomains));
  const explicitPathMatches = query.match(/[A-Za-z0-9_./\\-]+\.[A-Za-z0-9]+/g) ?? [];
  const normalizedPaths = dedupe(
    explicitPathMatches
      .map((entry) => entry.trim().replace(/^["'`]+|["'`]+$/g, ""))
      .filter((entry) => /[\\/]/.test(entry) || /\.[A-Za-z0-9]+$/.test(entry))
  );

  const hint: RetrievalHint = {
    preferredPathGlobs: dedupe([...preferredPathGlobs, ...normalizedPaths]),
    preferredExtensions,
    preferredDomains,
    maxResults: highQualityMode ? 8 : 6
  };

  return hint.preferredPathGlobs?.length || hint.preferredExtensions?.length || hint.preferredDomains?.length
    ? hint
    : null;
};

const selectTaskSkills = (query: string, codingMode: boolean): TaskSkillManifest[] => {
  const matches: string[] = [];

  const push = (id: string, active: boolean): void => {
    if (active && !matches.includes(id)) {
      matches.push(id);
    }
  };

  push("inspect_repo_structure", /(repo structure|repo map|architecture|ownership|boundary|wiring|surface map)/i.test(query));
  push("explain_module", /(explain|walk through|what does|how does).*(module|component|service|package|function|class)/i.test(query));
  push("debug_issue", /(debug|bug|error|failing|failure|broken|fix)/i.test(query));
  push("implement_toggle", /(?:(?:add|implement|wire|update).*(toggle|setting|checkbox|switch|mode))|(?:(toggle|setting|checkbox|switch|mode).*(add|implement|wire|update))/i.test(query));
  push("trace_request_flow", /(trace|flow|path|handoff|request flow|wiring)/i.test(query));
  push("summarize_recent_changes", /(recent changes|what changed|summari[sz]e.*changes?|change summary)/i.test(query));
  push("add_test_for_existing_behavior", /(test|regression|coverage|spec|verify with tests)/i.test(query));
  push("small_refactor", /(refactor|cleanup|extract|rename|simplify)/i.test(query));
  push("verify_integration", /(verify|integration|smoke|validate|end to end)/i.test(query));

  if (codingMode && matches.length === 0) {
    matches.push("trace_request_flow", "verify_integration");
  }

  return matches
    .slice(0, MAX_PACK_SKILLS)
    .map((id) => getTaskSkillManifest(id))
    .filter((entry): entry is TaskSkillManifest => Boolean(entry));
};

export const renderTaskSkillMarkdown = (manifest: TaskSkillManifest): string =>
  normalizeWhitespace(
    [
      `# ${manifest.title}`,
      manifest.summary,
      "",
      "## Route Bias",
      `- ${manifest.routeBias}`,
      "",
      "## Retrieval Focus",
      ...manifest.preferredRetrievalScopes.map((entry) => `- ${entry}`),
      "",
      "## Evidence Needs",
      ...manifest.requiredEvidenceKinds.map((entry) => `- ${entry}`),
      "",
      "## Output Hints",
      ...manifest.outputContractHints.map((entry) => `- ${entry}`),
      "",
      "## Procedure",
      ...manifest.instructions.map((entry) => `- ${entry}`)
    ].join("\n")
  );

export const listTaskSkillMarkdown = (): Array<{ manifest: TaskSkillManifest; markdown: string }> =>
  listTaskSkillManifests().map((manifest) => ({
    manifest,
    markdown: renderTaskSkillMarkdown(manifest)
  }));

export const resolveHybridContextPlan = (
  input: ResolveHybridContextPlanInput
): ResolveHybridContextPlanResult => {
  const sourceScope = normalizeScope(input.replyPolicySourceScope || input.promptIntent?.sourceScope);
  const selectedTaskSkills = selectTaskSkills(input.query, input.codingMode);
  const exactEvidenceRequested =
    input.taskClassification.categories.repo_grounded &&
    (matchesAny(input.query, [
      /[A-Za-z0-9_./\\-]+\.[A-Za-z0-9]+/i,
      /\b(line|lines|function|class|module|component|error|stack|trace|diff|patch|commit|branch)\b/i,
      /\bcurrent\b|\brecent\b|\blatest\b|\bright now\b/i
    ]) ||
      sourceScope === "workspace-only");
  const architectureStyleQuestion = matchesAny(input.query, [
    /\b(architecture|repo structure|repo map|module map|boundaries|glossary|wiring|how .* works|where .* lives)\b/i,
    /\b(explain|overview|summari[sz]e)\b/i
  ]);
  const implementationStyleQuestion = matchesAny(input.query, [
    /\b(implement|add|wire|update|refactor|debug|fix|trace|test|verify)\b/i
  ]);
  const freshEvidenceRequired =
    input.hasImageEvidence === true ||
    input.taskClassification.categories.time_sensitive ||
    input.taskClassification.categories.awareness_local_state ||
    matchesAny(input.query, [/\b(current|recent|latest|today|right now|just changed)\b/i]);
  const reasons: string[] = [];

  let mode: RequestRouteMode = "cache_plus_retrieval";
  if (
    !input.codingMode &&
    architectureStyleQuestion &&
    !implementationStyleQuestion &&
    !exactEvidenceRequested &&
    !freshEvidenceRequired &&
    sourceScope !== "workspace-only"
  ) {
    mode = "cache_only";
    reasons.push("architecture-style repo question without exact current-state evidence");
  } else if (
    exactEvidenceRequested ||
    freshEvidenceRequired ||
    ["readme-only", "docs-only", "workspace-only", "awareness-only", "time-sensitive-live"].includes(sourceScope)
  ) {
    mode = implementationStyleQuestion || input.codingMode ? "cache_plus_retrieval" : "retrieval_only";
    reasons.push("request needs exact or fresh evidence");
  } else if (implementationStyleQuestion || input.codingMode) {
    mode = "cache_plus_retrieval";
    reasons.push("implementation-style request benefits from both reusable context and live evidence");
  } else if (input.previousRouteMode === "cache_only" && architectureStyleQuestion) {
    mode = "cache_only";
    reasons.push("continuing cached repo-understanding flow");
  } else if (input.taskClassification.categories.repo_grounded) {
    mode = "cache_only";
    reasons.push("repo-grounded understanding prompt with no exact evidence trigger");
  } else {
    reasons.push("fallback to balanced hybrid path");
  }

  const selectedPackTypes: CachePackType[] = [];
  if (mode !== "retrieval_only" && input.taskClassification.categories.repo_grounded) {
    selectedPackTypes.push("repo_core");
  }
  if (mode !== "retrieval_only" && selectedTaskSkills.length > 0) {
    selectedPackTypes.push("task_skill");
  }
  if ((input.conversationMessageCount ?? 0) > 0) {
    selectedPackTypes.push("work_context");
  }
  selectedPackTypes.push("memory_context");

  return {
    routeDecision: {
      mode,
      reason: reasons[0] ?? "default hybrid path",
      reasons,
      codingMode: input.codingMode,
      highQualityMode: input.highQualityMode,
      freshEvidenceRequired,
      selectedTaskSkillIds: selectedTaskSkills.map((skill) => skill.id),
      selectedPackTypes: dedupe(selectedPackTypes),
      retrievalHint: composeRetrievalHint(selectedTaskSkills, input.query, input.highQualityMode)
    },
    selectedTaskSkills,
    retrievalScopes: dedupe(selectedTaskSkills.flatMap((skill) => skill.preferredRetrievalScopes))
  };
};

const buildRepoCorePack = async (
  workspaceRoot: string,
  digest: AwarenessDigest | null | undefined
): Promise<
  | { record: Omit<ResolvedContextCachePack, "cacheHit" | "stale" | "invalidationReason">; sourceKeys: Record<string, string> }
  | { invalidationReason: string }
> => {
  const sections: string[] = [];
  const sourceKeys: Record<string, string> = {};
  const sourceRefs: string[] = [];

  for (const relativeDoc of REPO_CORE_DOCS) {
    const absolutePath = path.join(workspaceRoot, relativeDoc);
    try {
      const raw = await readFile(absolutePath, "utf8");
      const compact = compactMarkdown(raw, Math.floor(REPO_CORE_MAX_CHARS / REPO_CORE_DOCS.length));
      if (compact) {
        sections.push(`## ${path.basename(relativeDoc, path.extname(relativeDoc))}\n${compact}`);
      }
      sourceKeys[relativeDoc] = hashText(raw);
      sourceRefs.push(relativeDoc);
    } catch {
      return { invalidationReason: `missing-context-snapshot:${relativeDoc}` };
    }
  }

  const repoKey = repoStateKey(digest);
  if (repoKey) {
    sourceKeys["repo-state"] = repoKey;
  }
  const content = normalizeWhitespace(sections.join("\n\n"));
  return {
    record: {
      id: buildPackId("repo_core", "repo"),
      type: "repo_core",
      scope: "repo",
      version: CONTEXT_CACHE_VERSION,
      tokenEstimate: estimateTokens(content),
      sourceRefs,
      evidenceRefs: sourceRefs,
      dependencies: [...REPO_CORE_DOCS],
      sourceHashes: sourceKeys,
      createdAt: new Date().toISOString(),
      content
    },
    sourceKeys
  };
};

const buildTaskSkillPack = (manifest: TaskSkillManifest) => {
  const content = compactMarkdown(renderTaskSkillMarkdown(manifest), TASK_SKILL_MAX_CHARS);
  const manifestHash = hashText(JSON.stringify(manifest));
  return {
    record: {
      id: buildPackId("task_skill", manifest.id),
      type: "task_skill" as const,
      scope: manifest.id,
      version: CONTEXT_CACHE_VERSION,
      tokenEstimate: estimateTokens(content),
      sourceRefs: [`task-skill:${manifest.id}`],
      evidenceRefs: manifest.requiredEvidenceKinds,
      dependencies: [`task-skill:${manifest.id}`],
      sourceHashes: {
        manifest: manifestHash
      },
      createdAt: new Date().toISOString(),
      content
    },
    sourceKeys: {
      manifest: manifestHash
    }
  };
};

const buildWorkContextPack = (input: ResolveContextCachePacksInput) => {
  const recentPaths = dedupe((input.recentTouchedPaths ?? []).filter(Boolean)).slice(0, 4);
  const content = normalizeWhitespace(
    [
      "Current work context:",
      `- Task: ${input.latestUserMessage.trim().slice(0, 220)}`,
      `- Route: ${input.routeDecision.mode} because ${input.routeDecision.reason}`,
      input.promptIntent ? `- Goal: ${input.promptIntent.userGoal}` : null,
      input.summaryText ? `- Rolling summary: ${input.summaryText.slice(0, 220)}` : null,
      recentPaths.length > 0 ? `- Recent files: ${recentPaths.join(" | ")}` : null,
      `- Modes: coding ${input.routeDecision.codingMode ? "on" : "off"} | quality ${
        input.routeDecision.highQualityMode ? "high" : "default"
      }`
    ]
      .filter((line): line is string => Boolean(line))
      .join("\n")
  ).slice(0, WORK_CONTEXT_MAX_CHARS);
  const sourceHashes = {
    conversation: input.conversationId,
    task: hashText(input.latestUserMessage),
    summary: hashText(input.summaryText),
    route: hashText(JSON.stringify(input.routeDecision)),
    touchedPaths: hashText(recentPaths.join("|")),
    awareness: input.awarenessDigest?.freshness.generatedAt ?? "none"
  };
  return {
    record: {
      id: buildPackId("work_context", input.conversationId),
      type: "work_context" as const,
      scope: input.conversationId,
      version: CONTEXT_CACHE_VERSION,
      tokenEstimate: estimateTokens(content),
      sourceRefs: recentPaths,
      evidenceRefs: recentPaths,
      dependencies: ["conversation-summary", "recent-paths", "route-decision"],
      sourceHashes,
      createdAt: new Date().toISOString(),
      content
    },
    sourceKeys: sourceHashes
  };
};

const buildMemoryContextPack = (input: ResolveContextCachePacksInput) => {
  const lines = [
    ...input.retrievedMemories.slice(0, 3).map(
      (entry) => `- Memory [${entry.memory.category}] ${entry.memory.text}`
    ),
    ...input.promptBehaviorMemories.slice(0, 2).map(
      (entry) => `- Style: ${entry.entry.summary}`
    )
  ];
  const content = normalizeWhitespace(
    lines.length > 0 ? `Durable memory context:\n${lines.join("\n")}` : "Durable memory context:\n- No durable memory matched."
  ).slice(0, MEMORY_CONTEXT_MAX_CHARS);
  const sourceHashes = {
    retrieved: hashText(
      input.retrievedMemories.map((entry) => `${entry.memory.id}:${entry.memory.updatedAt}`).join("|")
    ),
    promptBehavior: hashText(
      input.promptBehaviorMemories.map((entry) => `${entry.entry.id}:${entry.entry.updatedAt}`).join("|")
    ),
    stable: hashText(input.stableMemories.map((entry) => `${entry.id}:${entry.updatedAt}`).join("|"))
  };
  return {
    record: {
      id: buildPackId("memory_context", input.conversationId),
      type: "memory_context" as const,
      scope: input.conversationId,
      version: CONTEXT_CACHE_VERSION,
      tokenEstimate: estimateTokens(content),
      sourceRefs: input.retrievedMemories.slice(0, 3).map((entry) => `memory:${entry.memory.id}`),
      evidenceRefs: input.promptBehaviorMemories.slice(0, 2).map((entry) => `prompt:${entry.entry.id}`),
      dependencies: ["retrieved-memory", "prompt-behavior-memory"],
      sourceHashes,
      createdAt: new Date().toISOString(),
      content
    },
    sourceKeys: sourceHashes
  };
};

const isSourceHashMatch = (
  manifestEntry: StoredContextCacheManifest["packs"][string] | undefined,
  sourceHashes: Record<string, string>
): boolean => {
  if (!manifestEntry) {
    return false;
  }
  const left = Object.entries(manifestEntry.sourceHashes).sort();
  const right = Object.entries(sourceHashes).sort();
  return JSON.stringify(left) === JSON.stringify(right);
};

const isRepoStateOnlyInvalidation = (
  manifestEntry: StoredContextCacheManifest["packs"][string] | undefined,
  sourceHashes: Record<string, string>
): boolean => {
  if (!manifestEntry) {
    return false;
  }
  const previousRepoState = manifestEntry.sourceHashes["repo-state"];
  const nextRepoState = sourceHashes["repo-state"];
  if (!previousRepoState || !nextRepoState || previousRepoState === nextRepoState) {
    return false;
  }

  const previousDocEntries = Object.entries(manifestEntry.sourceHashes)
    .filter(([key]) => key !== "repo-state")
    .sort();
  const nextDocEntries = Object.entries(sourceHashes)
    .filter(([key]) => key !== "repo-state")
    .sort();

  return JSON.stringify(previousDocEntries) === JSON.stringify(nextDocEntries);
};

const reuseOrWritePack = async (
  runtimeRoot: string,
  manifest: StoredContextCacheManifest,
  built:
    | { record: Omit<ResolvedContextCachePack, "cacheHit" | "stale" | "invalidationReason">; sourceKeys: Record<string, string> }
    | { invalidationReason: string },
  type: CachePackType
): Promise<ResolvedContextCachePack | null> => {
  if ("invalidationReason" in built) {
    return {
      id: buildPackId(type, "stale"),
      type,
      scope: "stale",
      version: CONTEXT_CACHE_VERSION,
      tokenEstimate: 0,
      cacheHit: false,
      stale: true,
      invalidationReason: built.invalidationReason,
      sourceRefs: [],
      content: "",
      evidenceRefs: [],
      dependencies: [],
      sourceHashes: {},
      createdAt: new Date().toISOString()
    };
  }

  const paths = buildCachePaths(runtimeRoot);
  const existingMeta = manifest.packs[built.record.id];
  const packPath = path.join(paths.packsRoot, `${built.record.id}.json`);

  if (isSourceHashMatch(existingMeta, built.sourceKeys)) {
    const existingPack = await readPack(packPath);
    if (existingPack) {
      return {
        ...existingPack,
        cacheHit: true,
        stale: false,
        invalidationReason: null
      };
    }
  }

  if (type === "repo_core" && isRepoStateOnlyInvalidation(existingMeta, built.sourceKeys)) {
    return {
      id: built.record.id,
      type,
      scope: built.record.scope,
      version: built.record.version,
      tokenEstimate: 0,
      cacheHit: false,
      stale: true,
      invalidationReason: "repo-changed-after-cache-build",
      sourceRefs: built.record.sourceRefs,
      content: "",
      evidenceRefs: built.record.evidenceRefs,
      dependencies: built.record.dependencies,
      sourceHashes: built.record.sourceHashes,
      createdAt: new Date().toISOString()
    };
  }

  const nextPack: ResolvedContextCachePack = {
    ...built.record,
    cacheHit: false,
    stale: false,
    invalidationReason: null
  };
  manifest.packs[nextPack.id] = {
    id: nextPack.id,
    type: nextPack.type,
    scope: nextPack.scope,
    version: nextPack.version,
    dependencies: nextPack.dependencies,
    sourceHashes: nextPack.sourceHashes,
    createdAt: nextPack.createdAt,
    tokenEstimate: nextPack.tokenEstimate,
    evidenceRefs: nextPack.evidenceRefs
  };
  await writePack(packPath, nextPack);
  return nextPack;
};

export const resolveContextCachePacks = async (
  input: ResolveContextCachePacksInput
): Promise<ResolveContextCachePacksResult> => {
  const paths = buildCachePaths(input.runtimeRoot);
  await mkdir(paths.packsRoot, { recursive: true });
  const manifest = await readManifest(paths.manifestPath);
  const packs: ResolvedContextCachePack[] = [];

  if (input.routeDecision.selectedPackTypes.includes("repo_core")) {
    const repoPack = await reuseOrWritePack(
      input.runtimeRoot,
      manifest,
      await buildRepoCorePack(input.workspaceRoot, input.awarenessDigest),
      "repo_core"
    );
    if (repoPack) {
      packs.push(repoPack);
    }
  }

  if (input.routeDecision.selectedPackTypes.includes("task_skill")) {
    for (const manifestEntry of input.selectedTaskSkills.slice(0, MAX_PACK_SKILLS)) {
      const pack = await reuseOrWritePack(
        input.runtimeRoot,
        manifest,
        buildTaskSkillPack(manifestEntry),
        "task_skill"
      );
      if (pack) {
        packs.push(pack);
      }
    }
  }

  if (input.routeDecision.selectedPackTypes.includes("work_context")) {
    const workPack = await reuseOrWritePack(
      input.runtimeRoot,
      manifest,
      buildWorkContextPack(input),
      "work_context"
    );
    if (workPack) {
      packs.push(workPack);
    }
  }

  if (input.routeDecision.selectedPackTypes.includes("memory_context")) {
    const memoryPack = await reuseOrWritePack(
      input.runtimeRoot,
      manifest,
      buildMemoryContextPack(input),
      "memory_context"
    );
    if (memoryPack) {
      packs.push(memoryPack);
    }
  }

  manifest.updatedAt = new Date().toISOString();
  await writeManifest(paths.manifestPath, manifest);

  return {
    packs: packs.filter((pack) => pack.content.length > 0),
    summaries: packs.map((pack) => ({
      id: pack.id,
      type: pack.type,
      scope: pack.scope,
      version: pack.version,
      tokenEstimate: pack.tokenEstimate,
      cacheHit: pack.cacheHit,
      stale: pack.stale,
      invalidationReason: pack.invalidationReason,
      sourceRefs: pack.sourceRefs
    }))
  };
};
