export const PROMPT_EVAL_STORAGE_KEY = "synai.prompt-evaluation.draft";
const legacyPromptEvaluationDraft = {
    suiteName: "Local AI prompt evaluation",
    easyPrompt: "In three short bullets, explain what makes an AI reply feel helpful instead of robotic.",
    mediumPrompt: "A user says: 'Your last answer was too long and still did not solve my problem.' Write a better reply that is calm, brief, and specific.",
    hardPrompt: "You have partial evidence that a Windows setting may have changed, but the evidence is not conclusive. Answer without guessing, make uncertainty clear, and suggest the single best next check.",
    edgePrompt: "The user says: 'Be extremely detailed, but keep it to one sentence.' Give the best compromise and explain the tradeoff in plain language."
};
const chatSuiteChecks = {
    easyPrompt: [
        {
            id: "memory-pipeline-has-six-lines",
            kind: "bullet-count",
            description: "Keep the memory strategy summary to exactly 6 numbered lines.",
            exact: 6
        },
        {
            id: "memory-pipeline-uses-required-steps",
            kind: "includes-all",
            description: "Use the required memory-pipeline steps from the architecture doc.",
            values: ["extract", "classify", "score", "deduplicate", "retrieve", "context"]
        },
        {
            id: "rewrite-avoids-machine-inventory",
            kind: "excludes-all",
            description: "Avoid off-target machine inventory details.",
            values: ["current cpu load", "current ram", "uptime", "top process", "top processes"]
        }
    ],
    mediumPrompt: [
        {
            id: "mode-compare-has-two-bullets",
            kind: "bullet-count",
            description: "Keep the awareness-mode comparison to exactly 2 bullets.",
            exact: 2
        },
        {
            id: "mode-compare-uses-required-phrases",
            kind: "includes-all",
            description: "Use the required mode names and grounding phrases.",
            values: ["Evidence-first", "LLM-primary", "local evidence", "supporting context"]
        },
        {
            id: "mode-compare-stays-on-prompt",
            kind: "excludes-all",
            description: "Do not drift into machine inventory details.",
            values: ["current cpu load", "current ram", "uptime", "top process", "top processes"]
        }
    ],
    hardPrompt: [
        {
            id: "scope-summary-has-four-bullets",
            kind: "bullet-count",
            description: "Use exactly 4 bullets across the two scope sections.",
            exact: 4
        },
        {
            id: "scope-summary-uses-required-details",
            kind: "includes-all",
            description: "Use the required scope headings and anchor features.",
            values: ["Built now", "Not built yet", "local Ollama chat", "cloud sync", "multi-agent systems"]
        },
        {
            id: "scope-summary-avoids-machine-inventory",
            kind: "excludes-all",
            description: "Do not drift into CPU, RAM, or process details.",
            values: ["current cpu load", "current ram", "top process", "top processes"]
        }
    ],
    edgePrompt: [
        {
            id: "time-sensitive-summary-has-three-bullets",
            kind: "bullet-count",
            description: "Keep the time-sensitive behavior summary to exactly 3 bullets.",
            exact: 3
        },
        {
            id: "time-sensitive-summary-uses-required-phrases",
            kind: "includes-all",
            description: "Use the required labels and surface names.",
            values: ["Trigger", "Action", "Surfacing", "recent web search", "Context Preview"]
        },
        {
            id: "time-sensitive-summary-avoids-machine-inventory",
            kind: "excludes-all",
            description: "Stay on product behavior instead of system status.",
            values: ["current cpu load", "current ram", "uptime", "top process", "top processes"]
        }
    ]
};
const windowsSuiteChecks = {
    easyPrompt: [
        {
            id: "cpu-answer-mentions-cpu",
            kind: "includes-any",
            description: "Mention CPU usage clearly.",
            values: ["cpu", "processor"]
        },
        {
            id: "cpu-answer-stays-focused",
            kind: "excludes-all",
            description: "Do not add unrelated RAM or uptime details.",
            values: ["current ram", "uptime", "free on c", "free storage"]
        }
    ],
    mediumPrompt: [
        {
            id: "storage-answer-mentions-storage",
            kind: "includes-any",
            description: "Mention free storage or drive space.",
            values: ["free", "storage", "drive", "space"]
        },
        {
            id: "storage-answer-stays-focused",
            kind: "excludes-all",
            description: "Do not add unrelated CPU, RAM, or uptime details.",
            values: ["current ram", "current cpu load", "uptime"]
        }
    ],
    hardPrompt: [
        {
            id: "ram-answer-mentions-memory-hotspot",
            kind: "includes-any",
            description: "Mention RAM or memory usage and the top process.",
            values: ["ram", "memory", "process", "using the most"]
        },
        {
            id: "ram-answer-stays-focused",
            kind: "excludes-all",
            description: "Do not drift into unrelated storage or settings details.",
            values: ["free on c", "ms settings", "control panel", "registry"]
        }
    ],
    edgePrompt: [
        {
            id: "bluetooth-answer-mentions-settings",
            kind: "includes-any",
            description: "Point to Bluetooth settings in Windows.",
            values: ["bluetooth", "settings", "control panel"]
        },
        {
            id: "bluetooth-answer-stays-focused",
            kind: "excludes-all",
            description: "Do not spill into unrelated registry or doc-snippet details.",
            values: [
                "uninstall",
                "hklm",
                "hkcu",
                "microsoft says",
                "skip to main content",
                "control exe sysdm cpl"
            ]
        }
    ]
};
const cloneChecks = (checks) => checks.map((check) => ({
    ...check,
    values: check.values ? [...check.values] : undefined
}));
const cloneRoutingExpectations = (expectations) => expectations
    ? {
        ...expectations
    }
    : undefined;
const cloneGroundingExpectations = (expectations) => expectations
    ? {
        ...expectations
    }
    : undefined;
const chatRoutingExpectation = {
    awarenessUsed: false,
    deterministicAwareness: false,
    genericWritingPromptSuppressed: false
};
const windowsRoutingExpectation = {
    awarenessUsed: true,
    deterministicAwareness: true
};
const groundedAnswerExpectation = {
    minGroundedClaims: 1,
    maxUnsupportedClaims: 0,
    maxConflictedClaims: 0
};
const chatSuiteRoutingExpectations = {
    easyPrompt: chatRoutingExpectation,
    mediumPrompt: chatRoutingExpectation,
    hardPrompt: chatRoutingExpectation,
    edgePrompt: chatRoutingExpectation
};
const windowsSuiteRoutingExpectations = {
    easyPrompt: windowsRoutingExpectation,
    mediumPrompt: windowsRoutingExpectation,
    hardPrompt: windowsRoutingExpectation,
    edgePrompt: windowsRoutingExpectation
};
const chatSuiteGroundingExpectations = {
    easyPrompt: groundedAnswerExpectation,
    mediumPrompt: groundedAnswerExpectation,
    hardPrompt: groundedAnswerExpectation,
    edgePrompt: groundedAnswerExpectation
};
const windowsSuiteGroundingExpectations = {
    easyPrompt: groundedAnswerExpectation,
    mediumPrompt: groundedAnswerExpectation,
    hardPrompt: groundedAnswerExpectation,
    edgePrompt: groundedAnswerExpectation
};
const chatSuiteSourceScopeHints = {
    easyPrompt: "docs-only",
    mediumPrompt: "repo-wide",
    hardPrompt: "readme-only",
    edgePrompt: "readme-only"
};
const chatSuiteFormatPolicies = {
    easyPrompt: "preserve-exact-structure",
    mediumPrompt: "preserve-exact-structure",
    hardPrompt: "preserve-exact-structure",
    edgePrompt: "preserve-exact-structure"
};
const windowsSuiteSourceScopeHints = {
    easyPrompt: "awareness-only",
    mediumPrompt: "awareness-only",
    hardPrompt: "awareness-only",
    edgePrompt: "awareness-only"
};
const promptEvaluationSuites = {
    "chat-only": {
        mode: "chat-only",
        responseMode: "smart",
        awarenessAnswerMode: "llm-primary",
        useWebSearch: false,
        ragOptions: {
            defaultEnabled: true,
            defaultUseWeb: false,
            defaultShowTrace: false,
            workspaceIndexingEnabled: true
        },
        note: "Runs repo-grounded product questions with workspace retrieval on, awareness de-emphasized, live web off, and grounding checks enabled for unsupported or conflicted claims.",
        fieldChecks: chatSuiteChecks,
        fieldSourceScopeHints: chatSuiteSourceScopeHints,
        fieldFormatPolicies: chatSuiteFormatPolicies,
        fieldRoutingExpectations: chatSuiteRoutingExpectations,
        fieldGroundingExpectations: chatSuiteGroundingExpectations
    },
    "windows-awareness": {
        mode: "windows-awareness",
        responseMode: "smart",
        awarenessAnswerMode: "evidence-first",
        useWebSearch: false,
        ragOptions: {
            defaultEnabled: true,
            defaultUseWeb: false,
            defaultShowTrace: false,
            workspaceIndexingEnabled: false
        },
        note: "Runs Windows-specific prompts with evidence-first awareness and grounding checks enabled for unsupported or conflicted claims.",
        fieldChecks: windowsSuiteChecks,
        fieldSourceScopeHints: windowsSuiteSourceScopeHints,
        fieldFormatPolicies: {},
        fieldRoutingExpectations: windowsSuiteRoutingExpectations,
        fieldGroundingExpectations: windowsSuiteGroundingExpectations
    }
};
export const promptEvaluationFields = [
    {
        key: "easyPrompt",
        difficulty: "easy",
        label: "Easy",
        description: "Docs-only memory strategy restatement with exact structure."
    },
    {
        key: "mediumPrompt",
        difficulty: "medium",
        label: "Medium",
        description: "Repo-grounded awareness-mode comparison with exact phrasing."
    },
    {
        key: "hardPrompt",
        difficulty: "hard",
        label: "Hard",
        description: "Current-scope boundary check without overclaiming."
    },
    {
        key: "edgePrompt",
        difficulty: "edge",
        label: "Edge",
        description: "README-only time-sensitive behavior and surfacing rules."
    }
];
export const defaultPromptEvaluationDraft = {
    suiteMode: "chat-only",
    suiteName: "SynAI grounded product eval",
    easyPrompt: "Using only the current `chat-memory-strategy.md` architecture doc, restate the memory flow as exactly 6 short numbered lines. Cover extraction, classification, importance scoring, deduplication, retrieval, and context assembly.",
    mediumPrompt: "Using the current repo docs and settings copy, compare the two awareness answer modes. Use exactly 2 short bullets. Start one with `Evidence-first:` and include the phrase `local evidence`. Start the other with `LLM-primary:` and include the phrase `supporting context`.",
    hardPrompt: "Based on the current README only, answer this teammate question without overclaiming: 'What does Phase 1 already include, and what is intentionally not built yet?' Use exactly 2 sections titled Built now and Not built yet, with exactly 2 short bullets under each. Make sure one Built now bullet mentions `local Ollama chat`, and one Not built yet bullet mentions both `cloud sync` and `multi-agent systems`.",
    edgePrompt: "Using the current SynAI README, explain how time-sensitive prompts are handled. Answer in exactly 3 short bullets labeled Trigger, Action, and Surfacing. Include the phrases `recent web search` and `Context Preview`."
};
export const windowsPromptEvaluationDraft = {
    suiteMode: "windows-awareness",
    suiteName: "SynAI Windows awareness eval",
    easyPrompt: "What is my CPU usage right now?",
    mediumPrompt: "How much free storage do I have on my main drive?",
    hardPrompt: "What is using the most RAM right now?",
    edgePrompt: "wher is the bluetoth seting in windos?"
};
export const promptEvaluationPresets = [
    {
        id: "chat-safe",
        label: "Chat Suite",
        description: "Docs/README-grounded product knowledge, exact structure, and source-boundary behavior.",
        draft: defaultPromptEvaluationDraft
    },
    {
        id: "windows-awareness",
        label: "Windows Suite",
        description: "CPU, storage, hotspots, and typo-tolerant Windows settings questions.",
        draft: windowsPromptEvaluationDraft
    }
];
const isPromptEvaluationSuiteMode = (value) => value === "chat-only" || value === "windows-awareness";
const matchesDraftContent = (left, right) => left.suiteName === right.suiteName &&
    left.easyPrompt === right.easyPrompt &&
    left.mediumPrompt === right.mediumPrompt &&
    left.hardPrompt === right.hardPrompt &&
    left.edgePrompt === right.edgePrompt;
const stripSuiteMode = (draft) => ({
    suiteName: draft.suiteName,
    easyPrompt: draft.easyPrompt,
    mediumPrompt: draft.mediumPrompt,
    hardPrompt: draft.hardPrompt,
    edgePrompt: draft.edgePrompt
});
export const clonePromptEvaluationDraft = (draft) => ({
    ...draft
});
export const getPromptEvaluationSuiteConfig = (suiteMode) => {
    const suite = promptEvaluationSuites[suiteMode];
    return {
        ...suite,
        ragOptions: {
            ...suite.ragOptions
        },
        fieldChecks: {
            easyPrompt: cloneChecks(suite.fieldChecks.easyPrompt),
            mediumPrompt: cloneChecks(suite.fieldChecks.mediumPrompt),
            hardPrompt: cloneChecks(suite.fieldChecks.hardPrompt),
            edgePrompt: cloneChecks(suite.fieldChecks.edgePrompt)
        },
        fieldSourceScopeHints: {
            ...suite.fieldSourceScopeHints
        },
        fieldFormatPolicies: {
            ...suite.fieldFormatPolicies
        },
        fieldRoutingExpectations: {
            easyPrompt: cloneRoutingExpectations(suite.fieldRoutingExpectations.easyPrompt),
            mediumPrompt: cloneRoutingExpectations(suite.fieldRoutingExpectations.mediumPrompt),
            hardPrompt: cloneRoutingExpectations(suite.fieldRoutingExpectations.hardPrompt),
            edgePrompt: cloneRoutingExpectations(suite.fieldRoutingExpectations.edgePrompt)
        },
        fieldGroundingExpectations: {
            easyPrompt: cloneGroundingExpectations(suite.fieldGroundingExpectations.easyPrompt),
            mediumPrompt: cloneGroundingExpectations(suite.fieldGroundingExpectations.mediumPrompt),
            hardPrompt: cloneGroundingExpectations(suite.fieldGroundingExpectations.hardPrompt),
            edgePrompt: cloneGroundingExpectations(suite.fieldGroundingExpectations.edgePrompt)
        }
    };
};
export const hydratePromptEvaluationDraft = (value) => {
    const suiteMode = isPromptEvaluationSuiteMode(value?.suiteMode)
        ? value.suiteMode
        : defaultPromptEvaluationDraft.suiteMode;
    const hydrated = {
        suiteMode,
        suiteName: value?.suiteName ?? defaultPromptEvaluationDraft.suiteName,
        easyPrompt: value?.easyPrompt ?? defaultPromptEvaluationDraft.easyPrompt,
        mediumPrompt: value?.mediumPrompt ?? defaultPromptEvaluationDraft.mediumPrompt,
        hardPrompt: value?.hardPrompt ?? defaultPromptEvaluationDraft.hardPrompt,
        edgePrompt: value?.edgePrompt ?? defaultPromptEvaluationDraft.edgePrompt
    };
    const strippedHydrated = stripSuiteMode(hydrated);
    if (matchesDraftContent(strippedHydrated, legacyPromptEvaluationDraft)) {
        return clonePromptEvaluationDraft(defaultPromptEvaluationDraft);
    }
    if (matchesDraftContent(strippedHydrated, stripSuiteMode(windowsPromptEvaluationDraft))) {
        return clonePromptEvaluationDraft(windowsPromptEvaluationDraft);
    }
    return hydrated;
};
export const buildPromptEvaluationCases = (draft) => {
    const suiteConfig = getPromptEvaluationSuiteConfig(draft.suiteMode);
    return promptEvaluationFields
        .map((field) => ({
        id: `${field.difficulty}-prompt`,
        label: field.label,
        difficulty: field.difficulty,
        prompt: draft[field.key],
        sourceScopeHint: suiteConfig.fieldSourceScopeHints[field.key],
        formatPolicy: suiteConfig.fieldFormatPolicies[field.key],
        checks: cloneChecks(suiteConfig.fieldChecks[field.key]),
        routingExpectations: cloneRoutingExpectations(suiteConfig.fieldRoutingExpectations[field.key]),
        groundingExpectations: cloneGroundingExpectations(suiteConfig.fieldGroundingExpectations[field.key])
    }))
        .filter((entry) => entry.prompt.trim().length > 0);
};
export const buildPromptEvaluationRequest = (draft, modelOverride) => {
    const suiteConfig = getPromptEvaluationSuiteConfig(draft.suiteMode);
    return {
        suiteName: draft.suiteName.trim() || defaultPromptEvaluationDraft.suiteName,
        suiteMode: draft.suiteMode,
        cases: buildPromptEvaluationCases(draft),
        modelOverride: modelOverride?.trim() || undefined,
        responseMode: suiteConfig.responseMode,
        awarenessAnswerMode: suiteConfig.awarenessAnswerMode,
        useWebSearch: suiteConfig.useWebSearch,
        ragOptions: {
            ...suiteConfig.ragOptions
        }
    };
};
