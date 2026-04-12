import type { RequestRouteMode } from "../contracts/rag";

export interface TaskSkillManifest {
  id: string;
  title: string;
  summary: string;
  routeBias: RequestRouteMode | "flexible";
  preferredRetrievalScopes: string[];
  preferredPathGlobs: string[];
  preferredExtensions: string[];
  preferredDomains: string[];
  requiredEvidenceKinds: string[];
  outputContractHints: string[];
  instructions: string[];
  legacyAliases?: string[];
}

export const TASK_SKILL_MANIFESTS: TaskSkillManifest[] = [
  {
    id: "inspect_repo_structure",
    title: "Inspect Repo Structure",
    summary: "Map package ownership, entrypoints, boundaries, and shared contracts before changing code.",
    routeBias: "cache_only",
    preferredRetrievalScopes: ["repo map", "architecture docs", "package boundaries"],
    preferredPathGlobs: ["context/", "docs/architecture/", "apps/desktop/electron/", "packages/"],
    preferredExtensions: [".md", ".yaml", ".ts"],
    preferredDomains: [],
    requiredEvidenceKinds: ["repo-map", "architecture-summary", "package-boundary"],
    outputContractHints: ["name owners", "highlight blast radius", "keep summary compact"],
    instructions: [
      "Start from repo maps, architecture summaries, and stable package boundaries.",
      "Explain which package owns the behavior before drilling into files.",
      "Call out danger zones and integration seams explicitly."
    ]
  },
  {
    id: "explain_module",
    title: "Explain Module",
    summary: "Trace what a module owns, what it imports, and how data flows through it.",
    routeBias: "cache_plus_retrieval",
    preferredRetrievalScopes: ["workspace code", "contracts", "context notes"],
    preferredPathGlobs: ["apps/desktop/", "packages/"],
    preferredExtensions: [".ts", ".tsx", ".md"],
    preferredDomains: [],
    requiredEvidenceKinds: ["module-file", "contract", "call-site"],
    outputContractHints: ["explain flow", "name dependencies", "note side effects"],
    instructions: [
      "Anchor the explanation in the exact module and its nearest contracts.",
      "Prefer a short flow description over broad prose.",
      "Mention side effects, IPC, or persistence when they matter."
    ]
  },
  {
    id: "debug_issue",
    title: "Debug Issue",
    summary: "Narrow failures to the smallest runtime surface, then gather exact evidence before patching.",
    routeBias: "cache_plus_retrieval",
    preferredRetrievalScopes: ["workspace code", "tests", "runtime traces"],
    preferredPathGlobs: ["apps/desktop/", "packages/", "tests/"],
    preferredExtensions: [".ts", ".tsx", ".md"],
    preferredDomains: [],
    requiredEvidenceKinds: ["error-signal", "runtime-path", "regression-test"],
    outputContractHints: ["state failure mode", "name likely cause", "note validation path"],
    instructions: [
      "Start from the failing surface and the closest test or smoke coverage.",
      "Use exact code evidence before proposing a fix.",
      "Keep the fix scoped and pair it with regression coverage."
    ],
    legacyAliases: ["bugfix"]
  },
  {
    id: "implement_toggle",
    title: "Implement Toggle",
    summary: "Wire settings through persisted state, runtime resolution, UI controls, and inspection surfaces.",
    routeBias: "cache_plus_retrieval",
    preferredRetrievalScopes: ["renderer settings", "main-process runtime", "contracts"],
    preferredPathGlobs: ["apps/desktop/src/features/local-chat/", "apps/desktop/electron/", "packages/"],
    preferredExtensions: [".ts", ".tsx"],
    preferredDomains: [],
    requiredEvidenceKinds: ["settings-state", "send-request", "inspection-ui"],
    outputContractHints: ["persist defaults", "support per-turn override", "show effect in UI"],
    instructions: [
      "Update stored defaults and per-turn overrides together.",
      "Make the toggle affect runtime behavior, not just UI state.",
      "Expose the resolved effect in inspection surfaces."
    ],
    legacyAliases: ["ui-change"]
  },
  {
    id: "trace_request_flow",
    title: "Trace Request Flow",
    summary: "Follow one request across renderer, IPC, main process, shared package logic, and inspection output.",
    routeBias: "cache_plus_retrieval",
    preferredRetrievalScopes: ["renderer", "ipc", "main-process", "shared packages"],
    preferredPathGlobs: ["apps/desktop/src/", "apps/desktop/electron/", "packages/"],
    preferredExtensions: [".ts", ".tsx"],
    preferredDomains: [],
    requiredEvidenceKinds: ["entrypoint", "ipc-hop", "shared-runtime-call"],
    outputContractHints: ["list handoffs", "note payload changes", "call out side effects"],
    instructions: [
      "Identify the first entrypoint, then walk each handoff in order.",
      "Call out where data shape changes or where retrieval/runtime is invoked.",
      "Keep the trace bounded to the specific request path."
    ]
  },
  {
    id: "summarize_recent_changes",
    title: "Summarize Recent Changes",
    summary: "Summarize current branch or recent repo changes with exact file evidence, not stale architecture prose.",
    routeBias: "retrieval_only",
    preferredRetrievalScopes: ["workspace code", "git-aware traces", "change summaries"],
    preferredPathGlobs: ["apps/desktop/", "packages/", "tests/"],
    preferredExtensions: [".ts", ".tsx", ".md"],
    preferredDomains: [],
    requiredEvidenceKinds: ["recent-file", "diff-signal", "test-impact"],
    outputContractHints: ["name changed surfaces", "note behavior impact", "call out risks"],
    instructions: [
      "Bias toward exact changed files or recent touched paths.",
      "Do not rely on repo-core cache when the question is about current changes.",
      "Keep the summary tied to observable behavior."
    ]
  },
  {
    id: "add_test_for_existing_behavior",
    title: "Add Test For Existing Behavior",
    summary: "Find the narrowest existing test harness and add coverage around the current behavior contract.",
    routeBias: "cache_plus_retrieval",
    preferredRetrievalScopes: ["tests", "related implementation", "contracts"],
    preferredPathGlobs: ["tests/", "packages/", "apps/desktop/src/"],
    preferredExtensions: [".ts", ".tsx"],
    preferredDomains: [],
    requiredEvidenceKinds: ["existing-test-pattern", "behavior-contract", "failure-mode"],
    outputContractHints: ["prefer narrow test", "state regression", "keep setup realistic"],
    instructions: [
      "Reuse the nearest test convention already in the repo.",
      "Test the current contract at the smallest useful seam.",
      "Name the regression risk the test is covering."
    ],
    legacyAliases: ["tests"]
  },
  {
    id: "small_refactor",
    title: "Small Refactor",
    summary: "Tighten one area without changing behavior, and keep blast radius easy to review.",
    routeBias: "cache_plus_retrieval",
    preferredRetrievalScopes: ["workspace code", "tests", "architecture notes"],
    preferredPathGlobs: ["apps/desktop/", "packages/", "tests/"],
    preferredExtensions: [".ts", ".tsx"],
    preferredDomains: [],
    requiredEvidenceKinds: ["current-owner", "call-sites", "test-coverage"],
    outputContractHints: ["preserve behavior", "reduce complexity", "note blast radius"],
    instructions: [
      "Keep the refactor in one bounded surface.",
      "Preserve existing behavior and update nearby tests when needed.",
      "Prefer extracting or clarifying code over rewriting the subsystem."
    ],
    legacyAliases: ["refactor"]
  },
  {
    id: "verify_integration",
    title: "Verify Integration",
    summary: "Check that the end-to-end flow still works across runtime, retrieval, UI, and tests.",
    routeBias: "cache_plus_retrieval",
    preferredRetrievalScopes: ["tests", "inspection UI", "runtime traces"],
    preferredPathGlobs: ["tests/", "apps/desktop/src/features/local-chat/", "apps/desktop/electron/", "packages/"],
    preferredExtensions: [".ts", ".tsx", ".md"],
    preferredDomains: [],
    requiredEvidenceKinds: ["integration-test", "inspection-output", "runtime-selection"],
    outputContractHints: ["state what passed", "state what remains unverified", "name next risk"],
    instructions: [
      "Verify the full request path, not just the implementation function.",
      "Prefer existing smoke and integration harnesses.",
      "Report remaining gaps clearly if a path cannot be exercised."
    ]
  }
];

const taskSkillMap = new Map(TASK_SKILL_MANIFESTS.map((entry) => [entry.id, entry] as const));
const aliasMap = new Map(
  TASK_SKILL_MANIFESTS.flatMap((entry) =>
    (entry.legacyAliases ?? []).map((alias) => [alias, entry.id] as const)
  )
);

export const listTaskSkillManifests = (): TaskSkillManifest[] => [...TASK_SKILL_MANIFESTS];

export const resolveTaskSkillId = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return taskSkillMap.has(trimmed) ? trimmed : aliasMap.get(trimmed) ?? null;
};

export const getTaskSkillManifest = (idOrAlias: string): TaskSkillManifest | null => {
  const resolved = resolveTaskSkillId(idOrAlias);
  return resolved ? taskSkillMap.get(resolved) ?? null : null;
};
