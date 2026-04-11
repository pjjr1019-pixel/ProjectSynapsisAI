import { createHash, randomUUID } from "node:crypto";
import { readdir } from "node:fs/promises";
import * as path from "node:path";
import { extractTargetsFromResolvedPrompt, resolveBrowserNavigationTarget as resolveCanonicalBrowserNavigationTarget, resolveDesktopOrganizationTarget, resolveKnownApplicationTarget as resolveCanonicalApplicationTarget } from "@awareness/target-knowledge";
const normalizePrompt = (value) => value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const containsAny = (value, needles) => needles.some((needle) => value.includes(needle));
const slugify = (value, fallback) => {
    const slug = normalizePrompt(value).replace(/\s+/g, "-").replace(/^-+|-+$/g, "");
    return slug.length > 0 ? slug : fallback;
};
const uniqueStrings = (values) => [...new Set(values.filter((value) => Boolean(value)).map((value) => value.trim()).filter(Boolean))];
const hashWorkflowPlan = (plan) => {
    const { requestId, createdAt, ...stablePlan } = plan;
    return createHash("sha256").update(JSON.stringify(stablePlan)).digest("hex");
};
const resolveOutputPath = (saveTo, fileName, context) => {
    if (saveTo === "none" || !fileName) {
        return null;
    }
    const root = saveTo === "desktop"
        ? context.desktopPath
        : saveTo === "documents"
            ? context.documentsPath
            : context.workspaceRoot;
    return path.resolve(root, fileName);
};
const isFileTask = (prompt) => {
    const normalized = normalizePrompt(prompt);
    return /\b(file|folder|directory)\b/.test(normalized) || containsAny(normalized, ["desktop", "documents", "document folder", "docs folder"]);
};
const isCreateTask = (prompt) => /\b(create|make|new)\b/.test(normalizePrompt(prompt));
const isOpenTask = (prompt) => /\b(open|show|view|browse)\b/.test(normalizePrompt(prompt));
const isRenameTask = (prompt) => /\b(rename|name it|call it|save as|save it as)\b/.test(normalizePrompt(prompt));
const isMoveTask = (prompt) => /\b(move|relocate|put it in|put it into|send it to)\b/.test(normalizePrompt(prompt));
const isDeleteTask = (prompt) => /\b(delete|remove|trash)\b/.test(normalizePrompt(prompt));
const isCloseTask = (prompt) => /\b(close|quit|exit|shut down|shutdown)\b/.test(normalizePrompt(prompt));
const isHealthReportTask = (prompt) => /(?:computer[s]?|system|pc|machine).{0,24}\bhealth\b|\bhealth report\b/.test(normalizePrompt(prompt));
const isBrowserAutomationPrompt = (prompt) => {
    const normalized = normalizePrompt(prompt);
    return containsAny(normalized, [
        "browser",
        "web",
        "website",
        "tab",
        "page",
        "url",
        "link",
        "address bar",
        "chrome",
        "edge",
        "firefox",
        "youtube"
    ]);
};
const isServiceControlPrompt = (prompt) => {
    const normalized = normalizePrompt(prompt);
    return containsAny(normalized, ["service", "services", "print spooler", "windows update service"]);
};
const isRegistryControlPrompt = (prompt) => {
    const normalized = normalizePrompt(prompt);
    return containsAny(normalized, ["registry", "regedit", "registry key", "registry value"]) && containsAny(normalized, ["set", "change", "modify", "update", "delete", "remove", "edit"]);
};
const isUiAutomationPrompt = (prompt) => {
    const normalized = normalizePrompt(prompt);
    return containsAny(normalized, ["click", "type", "press", "hotkey", "keyboard shortcut", "select", "choose", "fill"]);
};
const extractBrowserNavigationTarget = (prompt) => {
    return resolveCanonicalBrowserNavigationTarget(prompt)?.url ?? null;
};
const isBrowserNavigationPrompt = (prompt) => {
    return extractBrowserNavigationTarget(prompt) !== null;
};
const resolveKnownApplicationTarget = (prompt) => {
    return resolveCanonicalApplicationTarget(prompt)?.target ?? null;
};
const extractQuotedValue = (prompt) => {
    const quoted = prompt.match(/["'`]{1}([^"'`]{2,})["'`]{1}/)?.[1]?.trim();
    return quoted?.length ? quoted : null;
};
const extractExplicitPaths = (prompt) => {
    const matches = prompt.match(/(?:[A-Za-z]:[\\/]|\\\\|\/)[^"'`]+/g) ?? [];
    return [...new Set(matches.map((match) => match.trim().replace(/[),.;]+$/, "")))];
};
const extractPromptValue = (prompt, patterns, fallback) => {
    const quoted = extractQuotedValue(prompt);
    if (quoted) {
        return quoted;
    }
    for (const pattern of patterns) {
        const match = prompt.match(pattern)?.[1]?.trim();
        if (match) {
            return match;
        }
    }
    return fallback;
};
const normalizeExecutableTarget = (value) => {
    const trimmed = value?.trim();
    if (!trimmed) {
        return null;
    }
    return trimmed.replace(/,\d+$/, "").trim() || null;
};
const pickTargetFolder = (prompt, context) => {
    const normalized = normalizePrompt(prompt);
    if (containsAny(normalized, ["desktop"])) {
        return "desktop";
    }
    if (containsAny(normalized, ["documents", "my documents", "docs folder"])) {
        return "documents";
    }
    if (containsAny(normalized, ["workspace", "repo", "project folder"])) {
        return "workspace";
    }
    return context.documentsPath ? "documents" : "workspace";
};
const summarizeMachine = (machine) => machine
    ? [
        `${machine.summary.machineName}`,
        `processes ${machine.processSnapshot.totalCount}`,
        `apps ${machine.installedAppsSnapshot.totalCount}`,
        `services ${machine.serviceSnapshot.totalCount}`
    ].join(" | ")
    : null;
const summarizeFile = (file) => file ? [`files ${file.counts.files}`, `folders ${file.counts.folders}`, `media ${file.counts.media}`].join(" | ") : null;
const summarizeScreen = (screen) => screen
    ? [
        `foreground ${screen.foregroundWindow?.title ?? "unknown"}`,
        `focused ${screen.uiTree?.focusedElement?.name ?? "n/a"}`,
        `assist ${screen.assistMode.enabled ? "on" : "off"}`
    ].join(" | ")
    : null;
const evidenceFromWeb = (web) => web && web.status === "used"
    ? web.results.slice(0, 5).map((result, index) => ({
        source: "web",
        label: `web-${index + 1}`,
        summary: `${result.title} | ${result.source} | ${result.snippet}`,
        url: result.url
    }))
    : [];
const candidateApps = (machine, target) => {
    if (!machine) {
        return [];
    }
    const normalized = normalizePrompt(target);
    const scored = machine.installedAppsSnapshot.apps
        .map((appEntry) => {
        const fields = [
            appEntry.name,
            appEntry.publisher,
            appEntry.installLocation,
            appEntry.uninstallCommand,
            appEntry.quietUninstallCommand,
            appEntry.displayIcon,
            ...appEntry.associatedProcessNames
        ]
            .filter((value) => Boolean(value))
            .map((value) => normalizePrompt(value));
        const score = fields.reduce((total, field) => {
            if (!field) {
                return total;
            }
            if (field === normalized) {
                return total + 4;
            }
            if (field.includes(normalized) || normalized.includes(field)) {
                return total + 2;
            }
            return total;
        }, 0);
        return { appEntry, score };
    })
        .filter((entry) => entry.score > 0)
        .sort((left, right) => right.score - left.score);
    return scored.map((entry) => entry.appEntry);
};
const candidateProcesses = (machine, target) => {
    if (!machine) {
        return [];
    }
    const normalized = normalizePrompt(target);
    const scored = machine.processSnapshot.processes
        .map((processEntry) => {
        const fields = [
            processEntry.name,
            processEntry.executablePath,
            processEntry.commandLine,
            processEntry.windowTitle
        ]
            .filter((value) => Boolean(value))
            .map((value) => normalizePrompt(value));
        const score = fields.reduce((total, field) => {
            if (!field) {
                return total;
            }
            if (field === normalized) {
                return total + 4;
            }
            if (field.includes(normalized) || normalized.includes(field)) {
                return total + 2;
            }
            return total;
        }, 0);
        return { processEntry, score };
    })
        .filter((entry) => entry.score > 0)
        .sort((left, right) => right.score - left.score);
    return scored.map((entry) => entry.processEntry);
};
const resolveCreateTargetName = (prompt, fallback) => extractPromptValue(prompt, [
    /\b(?:create|make|new)\s+(?:a\s+|an\s+)?(?:file|folder|directory)?\s*(?:named|called|as)?\s+([a-z0-9._-]+)/i,
    /\b(?:create|make|new)\s+(?:a\s+|an\s+)?(?:file|folder|directory)\s+([a-z0-9._-]+)/i,
    /\b(?:save it as|save as)\s+([a-z0-9._-]+)/i
], fallback);
const resolveRenameTargetName = (prompt, fallback) => extractPromptValue(prompt, [
    /\b(?:rename it to|rename to|name it|call it)\s+([a-z0-9._-]+)/i,
    /\b(?:save it as|save as)\s+([a-z0-9._-]+)/i
], fallback);
const resolveRenameSourceName = (prompt, fallback) => extractPromptValue(prompt, [
    /\b(?:rename|rename the|rename file|rename folder)\s+([a-z0-9._-]+)\s+(?:to|as)\s+[a-z0-9._-]+/i,
    /\b(?:rename|rename the|rename file|rename folder)\s+([a-z0-9._-]+)\s*(?:$|then\b)/i
], fallback);
const resolveMoveTargetName = (prompt, fallback) => extractPromptValue(prompt, [
    /\b(?:move it to|move it into|move into|move to|relocate to|put it in|put it into|send it to)\s+([a-z0-9._-]+)/i
], fallback);
const resolveMoveSourceName = (prompt, fallback) => extractPromptValue(prompt, [
    /\b(?:move|move the|move file|move folder)\s+([a-z0-9._-]+)\s+(?:to|into|onto)\s+[a-z0-9._-]+/i,
    /\b(?:move|move the|move file|move folder)\s+([a-z0-9._-]+)\s*(?:$|then\b)/i
], fallback);
const resolveOpenTargetName = (prompt, fallback) => extractPromptValue(prompt, [
    /\b(?:open|show|view|browse)\s+(?:the\s+)?(?:file|folder|directory|app|application|program)?\s+([a-z0-9._-]+)/i,
    /\b(?:open|show|view|browse)\s+([a-z0-9._-]+)/i
], fallback);
const resolveDeleteTargetName = (prompt, fallback) => extractPromptValue(prompt, [
    /\b(?:delete|remove|trash)\s+(?:the\s+)?(?:file|folder|directory|item)?\s+([a-z0-9._-]+)/i,
    /\b(?:delete|remove|trash)\s+([a-z0-9._-]+)/i
], fallback);
const resolveApplicationTargetName = (prompt, fallback) => resolveKnownApplicationTarget(prompt) ??
    extractPromptValue(prompt, [
        /\b(?:launch|start|run|open)\s+(?:the\s+)?(?:app|application|program)?\s+([a-z0-9._-]+(?:\s+[a-z0-9._-]+){0,3}(?:\.exe)?)\b/i,
        /\b(?:launch|start|run|open)\s+([a-z0-9._-]+(?:\s+[a-z0-9._-]+){0,3}(?:\.exe)?)\b/i
    ], fallback);
const isGenericProcessTarget = (value) => ["task", "process", "app", "application", "program", "thing", "item", "window"].includes(normalizePrompt(value));
const resolvePathRoot = (prompt, context, fallback) => {
    const normalized = normalizePrompt(prompt);
    if (containsAny(normalized, ["desktop"])) {
        return context.desktopPath;
    }
    if (containsAny(normalized, ["documents", "document folder", "docs folder", "my docs"])) {
        return context.documentsPath;
    }
    if (containsAny(normalized, ["workspace", "repo", "project folder"])) {
        return context.workspaceRoot;
    }
    if (fallback === "desktop") {
        return context.desktopPath;
    }
    if (fallback === "documents") {
        return context.documentsPath;
    }
    return context.workspaceRoot;
};
const resolveSystemNavigationAction = (prompt) => {
    const normalized = normalizePrompt(prompt);
    const surfaces = [
        {
            actionId: "open-add-remove-programs",
            tests: [/\b(add or remove programs|apps and features|installed apps|uninstall apps)\b/i],
            target: "ms-settings:appsfeatures"
        },
        {
            actionId: "open-startup-apps",
            tests: [/\b(startup apps?|startup items?|launch at sign in|launch at startup)\b/i],
            target: "ms-settings:startupapps"
        },
        {
            actionId: "open-storage-settings",
            tests: [/\b(storage settings?|disk space|disk cleanup|storage sense|free up space)\b/i],
            target: "ms-settings:storage"
        },
        {
            actionId: "open-task-manager",
            tests: [/\b(task manager|taskmgr|end task)\b/i],
            target: "taskmgr"
        },
        {
            actionId: "open-control-panel",
            tests: [/\b(control panel|control\.exe)\b/i],
            target: "control"
        },
        {
            actionId: "open-control-panel",
            tests: [/\b(services|services\.msc|service manager)\b/i],
            target: "services.msc"
        },
        {
            actionId: "open-control-panel",
            tests: [/\b(device manager|devmgmt\.msc)\b/i],
            target: "devmgmt.msc"
        },
        {
            actionId: "open-control-panel",
            tests: [/\b(event viewer|eventvwr\.msc|event logs?)\b/i],
            target: "eventvwr.msc"
        },
        {
            actionId: "open-control-panel",
            tests: [/\b(task scheduler|taskschd\.msc)\b/i],
            target: "taskschd.msc"
        },
        {
            actionId: "open-control-panel",
            tests: [/\b(computer management|compmgmt\.msc)\b/i],
            target: "compmgmt.msc"
        },
        {
            actionId: "open-registry-editor",
            tests: [/\b(registry editor|regedit|registry)\b/i],
            target: "regedit"
        },
        {
            actionId: "open-settings",
            tests: [/\b(settings|ms-settings)\b/i],
            target: "ms-settings:"
        }
    ];
    for (const surface of surfaces) {
        if (surface.tests.some((pattern) => pattern.test(normalized))) {
            return {
                actionId: surface.actionId,
                target: surface.target
            };
        }
    }
    return null;
};
const buildPlan = (base) => ({
    ...base,
    workflowHash: hashWorkflowPlan(base)
});
const researchPlan = (prompt, context, web) => {
    const folder = pickTargetFolder(prompt, context);
    const fileName = `${slugify(prompt, "ai-research-report")}.md`;
    const targetPath = resolveOutputPath(folder, fileName, context);
    const steps = [
        {
            id: "collect-web",
            kind: "collect-web",
            title: "Collect web evidence",
            summary: "Pull the latest web results for the research topic.",
            approvalRequired: false,
            riskClass: "low",
            query: prompt,
            metadata: {
                resultCount: web?.status === "used" ? web.results.length : 0
            }
        }
    ];
    if (web?.status === "used") {
        for (const [index, result] of web.results.slice(0, 4).entries()) {
            steps.push({
                id: `open-source-${index + 1}`,
                kind: "browser-open",
                title: `Open source ${index + 1}`,
                summary: `Open ${result.title} and capture the visible page text.`,
                approvalRequired: false,
                riskClass: "low",
                url: result.url,
                metadata: {
                    sourceTitle: result.title
                }
            });
        }
    }
    steps.push({
        id: "write-report",
        kind: "write-markdown",
        title: "Write markdown report",
        summary: "Save a concise markdown report with sources and timestamps.",
        approvalRequired: false,
        riskClass: "low",
        saveTo: folder,
        fileName
    });
    const evidence = [...evidenceFromWeb(web)];
    if (context.machineAwareness) {
        evidence.push({
            source: "machine",
            label: "machine-awareness",
            summary: summarizeMachine(context.machineAwareness) ?? "Machine awareness available."
        });
    }
    const basePlan = {
        requestId: randomUUID(),
        prompt,
        normalizedPrompt: normalizePrompt(prompt),
        family: "research-report",
        summary: `Research the topic and save a report to ${targetPath ?? folder}.`,
        steps,
        evidence,
        artifacts: [
            {
                id: "report",
                kind: "markdown",
                label: "Research report",
                saveTo: folder,
                fileName,
                description: "Saved research report"
            }
        ],
        clarificationNeeded: [],
        approvalRequired: false,
        approvalReason: null,
        targetPaths: targetPath ? [targetPath] : [],
        createdAt: new Date().toISOString()
    };
    return buildPlan(basePlan);
};
const healthPlan = (prompt, context) => {
    const folder = pickTargetFolder(prompt, context);
    const fileName = `${slugify(prompt, "computer-health-report")}.md`;
    const targetPath = resolveOutputPath(folder, fileName, context);
    const evidence = [
        {
            source: "machine",
            label: "machine-awareness",
            summary: summarizeMachine(context.machineAwareness) ?? "Machine awareness unavailable."
        },
        {
            source: "file",
            label: "file-awareness",
            summary: summarizeFile(context.fileAwareness) ?? "File awareness unavailable."
        },
        {
            source: "screen",
            label: "screen-awareness",
            summary: context.screenAwareness
                ? `${context.screenAwareness.foregroundWindow?.title ?? "unknown"} | ${context.screenAwareness.assistMode.enabled ? "assist on" : "assist off"}`
                : "Screen awareness unavailable."
        }
    ];
    const basePlan = {
        requestId: randomUUID(),
        prompt,
        normalizedPrompt: normalizePrompt(prompt),
        family: "computer-health-report",
        summary: `Create a computer health report and save it to ${targetPath ?? folder}.`,
        steps: [
            {
                id: "collect-machine",
                kind: "collect-machine",
                title: "Collect machine evidence",
                summary: "Capture process, service, startup, app, and update health evidence.",
                approvalRequired: false,
                riskClass: "low"
            },
            {
                id: "collect-file",
                kind: "collect-file",
                title: "Collect file evidence",
                summary: "Capture file and folder evidence for the report.",
                approvalRequired: false,
                riskClass: "low"
            },
            {
                id: "write-report",
                kind: "write-markdown",
                title: "Write markdown report",
                summary: "Save a concise markdown health report with sources and timestamps.",
                approvalRequired: false,
                riskClass: "low",
                saveTo: folder,
                fileName
            }
        ],
        evidence,
        artifacts: [
            {
                id: "report",
                kind: "markdown",
                label: "Health report",
                saveTo: folder,
                fileName,
                description: "Saved computer health report"
            }
        ],
        clarificationNeeded: [],
        approvalRequired: false,
        approvalReason: null,
        targetPaths: targetPath ? [targetPath] : [],
        createdAt: new Date().toISOString()
    };
    return buildPlan(basePlan);
};
const browserPlan = (prompt, _context) => {
    const query = prompt.match(/\bplay\b(.+?)(?:\bon\b|\bin\b|\busing\b|$)/i)?.[1]?.trim() ||
        prompt.match(/\byoutube\b(.+?)$/i)?.[1]?.trim() ||
        "interesting AI and tech news";
    return buildPlan({
        requestId: randomUUID(),
        prompt,
        normalizedPrompt: normalizePrompt(prompt),
        family: "browser-playback",
        summary: `Open YouTube and play a video for ${query}.`,
        steps: [
            {
                id: "search-youtube",
                kind: "browser-search",
                title: "Search YouTube",
                summary: `Search YouTube for ${query}.`,
                approvalRequired: false,
                riskClass: "low",
                query
            },
            {
                id: "play-video",
                kind: "browser-play",
                title: "Play video",
                summary: "Open the first matching video and start playback.",
                approvalRequired: false,
                riskClass: "low",
                query
            }
        ],
        evidence: [],
        artifacts: [],
        clarificationNeeded: [],
        approvalRequired: false,
        approvalReason: null,
        targetPaths: [],
        createdAt: new Date().toISOString()
    });
};
const browserNavigationPlan = (prompt, _context) => {
    const target = extractBrowserNavigationTarget(prompt);
    if (!target) {
        return buildPlan({
            requestId: randomUUID(),
            prompt,
            normalizedPrompt: normalizePrompt(prompt),
            family: "browser-playback",
            summary: "Need the exact website or URL before I can open it.",
            steps: [
                {
                    id: "clarify",
                    kind: "confirm-approval",
                    title: "Clarify website target",
                    summary: "Ask which website or URL should be opened.",
                    approvalRequired: false,
                    riskClass: "low"
                }
            ],
            evidence: [],
            artifacts: [],
            clarificationNeeded: ["Please provide the exact website or URL to open."],
            approvalRequired: false,
            approvalReason: null,
            targetPaths: [],
            createdAt: new Date().toISOString()
        });
    }
    return buildPlan({
        requestId: randomUUID(),
        prompt,
        normalizedPrompt: normalizePrompt(prompt),
        family: "browser-playback",
        summary: `Open ${target} in the browser.`,
        steps: [
            {
                id: "open-site",
                kind: "browser-open",
                title: "Open website",
                summary: `Open ${target} in the browser.`,
                approvalRequired: false,
                riskClass: "low",
                url: target
            }
        ],
        evidence: [],
        artifacts: [],
        clarificationNeeded: [],
        approvalRequired: false,
        approvalReason: null,
        targetPaths: [target],
        createdAt: new Date().toISOString()
    });
};
const resolveBrowserInteractionMode = (prompt) => {
    const normalized = normalizePrompt(prompt);
    const browserTarget = resolveCanonicalBrowserNavigationTarget(prompt)?.url ?? null;
    if (containsAny(normalized, ["new tab", "open tab", "open a tab", "new browser tab"])) {
        return {
            action: "open-tab",
            target: extractPromptValue(prompt, [/\b(?:new\s+)?tab(?:\s+for|\s+to)?\s+(.+)$/i], browserTarget ?? "browser tab"),
            text: null,
            keys: [],
            value: null,
            url: browserTarget,
            timeoutMs: null,
            fileName: null
        };
    }
    if (containsAny(normalized, ["wait for", "wait until", "pause until", "hold until", "stay on this page until"])) {
        return {
            action: "wait",
            target: extractPromptValue(prompt, [/\b(?:wait for|wait until|pause until|hold until)\s+(.+)$/i], "browser state"),
            text: null,
            keys: [],
            value: null,
            url: null,
            timeoutMs: containsAny(normalized, ["5 seconds"]) ? 5_000 : containsAny(normalized, ["10 seconds"]) ? 10_000 : 5_000,
            fileName: null
        };
    }
    if (containsAny(normalized, ["select", "choose", "pick", "dropdown", "combo box"])) {
        return {
            action: "select",
            target: extractPromptValue(prompt, [/\b(?:select|choose|pick)\s+(?:the\s+)?([a-z0-9._-]+(?:\s+[a-z0-9._-]+){0,5})/i], "browser select"),
            text: null,
            keys: [],
            value: extractPromptValue(prompt, [/\b(?:select|choose|pick)\s+(.+)$/i], ""),
            url: null,
            timeoutMs: null,
            fileName: null
        };
    }
    if (containsAny(normalized, ["download", "save file", "save this file", "save the file"])) {
        return {
            action: "download",
            target: extractPromptValue(prompt, [/\b(?:download|save file|save this file|save the file)\s+(.+)$/i], browserTarget ?? "download"),
            text: null,
            keys: [],
            value: null,
            url: browserTarget,
            timeoutMs: null,
            fileName: extractPromptValue(prompt, [/\b(?:as|to)\s+([A-Za-z0-9._-]+(?:\s+[A-Za-z0-9._-]+){0,5})$/i], "").replace(/\s+/g, " ").trim() || null
        };
    }
    if (containsAny(normalized, ["hotkey", "keyboard shortcut", "press ctrl", "press alt", "press shift", "press win"])) {
        const keys = prompt
            .split(/\s*\+\s*|\s+/)
            .map((entry) => entry.trim())
            .filter(Boolean)
            .filter((entry) => !/^(click|type|press|hotkey|keyboard|shortcut)$/i.test(entry));
        return {
            action: "hotkey",
            target: extractPromptValue(prompt, [/\b(?:hotkey|keyboard shortcut|press)\s+(.+)$/i], "browser window"),
            text: null,
            keys: keys.length > 0 ? keys : ["Enter"],
            value: null,
            url: null,
            timeoutMs: null,
            fileName: null
        };
    }
    if (containsAny(normalized, ["type ", "enter text", "fill ", "search ", "submit form", "login", "sign in"])) {
        return {
            action: "type",
            target: extractPromptValue(prompt, [
                /\b(?:type|enter|fill|search)\s+(?:into\s+)?(?:the\s+)?(?:field|box|input|textbox|textarea|search box)?\s*(?:named|called|for)?\s+([a-z0-9._-]+(?:\s+[a-z0-9._-]+){0,5})/i,
                /\b(?:type|enter|fill|search)\s+(.+?)\s+(?:into|in|on)\s+(.+)$/i
            ], "browser input"),
            text: extractPromptValue(prompt, [/\b(?:type|enter|fill|search)\s+(?:into\s+)?(.+)$/i], prompt),
            keys: [],
            value: extractPromptValue(prompt, [/\b(?:type|enter|fill|search)\s+(?:into\s+)?(.+)$/i], prompt),
            url: browserTarget,
            timeoutMs: null,
            fileName: null
        };
    }
    return {
        action: "click",
        target: extractPromptValue(prompt, [
            /\b(?:click|press|select|choose|open)\s+(?:the\s+)?([a-z0-9._-]+(?:\s+[a-z0-9._-]+){0,5})/i,
            /\b(?:click|press|select|choose)\s+(.+)$/i
        ], "browser element"),
        text: null,
        keys: [],
        value: null,
        url: browserTarget,
        timeoutMs: null,
        fileName: null
    };
};
const resolveServiceAction = (prompt) => {
    const normalized = normalizePrompt(prompt);
    if (!containsAny(normalized, ["service", "services", "print spooler", "windows update service"])) {
        return null;
    }
    const actionId = containsAny(normalized, ["restart", "cycle"])
        ? "restart-service"
        : containsAny(normalized, ["stop", "disable", "turn off"]) && !containsAny(normalized, ["start"])
            ? "stop-service"
            : "start-service";
    const target = extractPromptValue(prompt, [
        /\b(?:start|stop|restart|cycle|enable|disable)\s+(?:the\s+)?(?:service\s+)?([a-z0-9._-]+(?:\s+[a-z0-9._-]+){0,5})/i,
        /\b(?:service\s+)?([a-z0-9._-]+(?:\s+[a-z0-9._-]+){0,5})\s+service/i
    ], normalized.includes("print spooler") ? "Print Spooler" : "service");
    return {
        actionId,
        target
    };
};
const resolveRegistryAction = (prompt) => {
    const normalized = normalizePrompt(prompt);
    if (!containsAny(normalized, ["registry", "regedit", "registry key", "registry value"])) {
        return null;
    }
    const actionId = containsAny(normalized, ["delete", "remove"]) && !containsAny(normalized, ["set", "change", "modify", "update"])
        ? "delete-registry-value"
        : "set-registry-value";
    const key = extractPromptValue(prompt, [
        /\b(?:registry key|registry value|key)\s+([A-Za-z0-9_\\:\- ]{3,})/i,
        /\b(?:set|delete|remove|change|modify|update)\s+(?:the\s+)?registry\s+(?:key|value)?\s+([A-Za-z0-9_\\:\- ]{3,})/i
    ], "HKCU\\Software\\SynAI");
    const valueName = extractPromptValue(prompt, [
        /\b(?:value name|named|called)\s+([A-Za-z0-9._-]{1,64})/i
    ], "Default");
    const value = extractPromptValue(prompt, [
        /\b(?:set|change|modify|update)\s+.*?\bto\s+(.+)$/i
    ], "");
    return {
        actionId,
        key,
        valueName,
        value
    };
};
const resolveUiAction = (prompt) => {
    const normalized = normalizePrompt(prompt);
    if (!containsAny(normalized, ["click", "type", "press", "hotkey", "keyboard shortcut", "select", "choose", "fill"])) {
        return null;
    }
    if (containsAny(normalized, ["hotkey", "keyboard shortcut", "press ctrl", "press alt", "press shift", "press win"])) {
        const keys = prompt
            .split(/\s*\+\s*|\s+/)
            .map((entry) => entry.trim())
            .filter(Boolean)
            .filter((entry) => !/^(click|type|press|hotkey|keyboard|shortcut)$/i.test(entry));
        return {
            actionId: "ui-hotkey",
            target: extractPromptValue(prompt, [/\b(?:hotkey|keyboard shortcut|press)\s+(.+)$/i], "window"),
            value: null,
            keys: keys.length > 0 ? keys : ["Enter"],
            submit: false
        };
    }
    if (containsAny(normalized, ["type ", "enter text", "fill ", "search ", "write "])) {
        return {
            actionId: "ui-type",
            target: extractPromptValue(prompt, [
                /\b(?:type|enter|fill|search|write)\s+(?:into\s+)?(?:the\s+)?(?:field|box|input|textbox|textarea)?\s*(?:named|called|for)?\s+([a-z0-9._-]+(?:\s+[a-z0-9._-]+){0,5})/i,
                /\b(?:type|enter|fill|search|write)\s+(.+)$/i
            ], "text field"),
            value: extractPromptValue(prompt, [/\b(?:type|enter|fill|search|write)\s+(?:into\s+)?(.+)$/i], prompt),
            keys: [],
            submit: containsAny(normalized, ["submit", "press enter", "enter after", "hit enter"])
        };
    }
    return {
        actionId: "ui-click",
        target: extractPromptValue(prompt, [
            /\b(?:click|press|select|choose|open)\s+(?:the\s+)?([a-z0-9._-]+(?:\s+[a-z0-9._-]+){0,5})/i,
            /\b(?:click|press|select|choose)\s+(.+)$/i
        ], "ui element"),
        value: null,
        keys: [],
        submit: false
    };
};
const browserInteractionPlan = (prompt, context) => {
    const normalized = normalizePrompt(prompt);
    const mode = resolveBrowserInteractionMode(prompt);
    const targetPath = context.recentWebContext?.status === "used" ? context.recentWebContext.results[0]?.url ?? null : null;
    return buildPlan({
        requestId: randomUUID(),
        prompt,
        normalizedPrompt: normalized,
        family: "browser-interaction",
        summary: mode.action === "open-tab"
            ? `Open a new browser tab for ${mode.target}.`
            : mode.action === "wait"
                ? `Wait for ${mode.target} in the browser.`
                : mode.action === "select"
                    ? `Select ${mode.value ?? mode.target} in the browser.`
                    : mode.action === "download"
                        ? `Download ${mode.target} in the browser.`
                        : mode.action === "click"
                            ? `Click ${mode.target} in the browser.`
                            : mode.action === "type"
                                ? `Type into ${mode.target} in the browser.`
                                : `Send the requested hotkeys in the browser.`,
        steps: [
            {
                id: "browser-interact",
                kind: "browser-interact",
                title: "Interact with browser",
                summary: mode.action === "open-tab"
                    ? `Open a new tab for ${mode.url ?? mode.target}.`
                    : mode.action === "wait"
                        ? `Wait for ${mode.target}.`
                        : mode.action === "select"
                            ? `Select ${mode.value ?? mode.target}.`
                            : mode.action === "download"
                                ? `Download ${mode.target}.`
                                : mode.action === "click"
                                    ? `Click ${mode.target}.`
                                    : mode.action === "type"
                                        ? `Type into ${mode.target}.`
                                        : `Send ${mode.keys.join(" + ")}.`,
                approvalRequired: false,
                riskClass: "low",
                target: mode.target,
                metadata: {
                    action: mode.action,
                    text: mode.text,
                    keys: mode.keys,
                    submit: mode.action === "type" ? mode.keys.includes("Enter") : false,
                    visible: true,
                    targetPath,
                    value: mode.value,
                    url: mode.url,
                    timeoutMs: mode.timeoutMs,
                    fileName: mode.fileName
                }
            }
        ],
        evidence: context.recentWebContext?.status === "used"
            ? context.recentWebContext.results.slice(0, 3).map((result, index) => ({
                source: "web",
                label: `browser-${index + 1}`,
                summary: `${result.title} | ${result.source} | ${result.snippet}`,
                url: result.url
            }))
            : [],
        artifacts: [],
        clarificationNeeded: [],
        approvalRequired: false,
        approvalReason: null,
        targetPaths: targetPath ? [targetPath] : [],
        createdAt: new Date().toISOString()
    });
};
const serviceControlPlan = (prompt, context) => {
    const normalized = normalizePrompt(prompt);
    const action = resolveServiceAction(prompt);
    if (!action) {
        return buildPlan({
            requestId: randomUUID(),
            prompt,
            normalizedPrompt: normalized,
            family: "service-control",
            summary: "Need the exact service name before I can change it.",
            steps: [
                {
                    id: "clarify",
                    kind: "confirm-approval",
                    title: "Clarify service target",
                    summary: "Ask for the exact service name.",
                    approvalRequired: false,
                    riskClass: "low"
                }
            ],
            evidence: context.machineAwareness
                ? [
                    {
                        source: "machine",
                        label: "services",
                        summary: `Machine awareness includes ${context.machineAwareness.serviceSnapshot.totalCount} services.`
                    }
                ]
                : [],
            artifacts: [],
            clarificationNeeded: ["Please provide the exact service name to change."],
            approvalRequired: true,
            approvalReason: "Service control requires approval.",
            targetPaths: [],
            createdAt: new Date().toISOString()
        });
    }
    return buildPlan({
        requestId: randomUUID(),
        prompt,
        normalizedPrompt: normalized,
        family: "service-control",
        summary: action.actionId === "restart-service"
            ? `Restart the ${action.target} service.`
            : action.actionId === "stop-service"
                ? `Stop the ${action.target} service.`
                : `Start the ${action.target} service.`,
        steps: [
            {
                id: "service-action",
                kind: "service-action",
                title: "Control service",
                summary: action.actionId === "restart-service"
                    ? `Restart ${action.target}.`
                    : action.actionId === "stop-service"
                        ? `Stop ${action.target}.`
                        : `Start ${action.target}.`,
                approvalRequired: true,
                riskClass: "high",
                target: action.target,
                actionId: action.actionId
            }
        ],
        evidence: context.machineAwareness
            ? [
                {
                    source: "machine",
                    label: "services",
                    summary: `Machine awareness includes ${context.machineAwareness.serviceSnapshot.totalCount} services.`
                }
            ]
            : [],
        artifacts: [],
        clarificationNeeded: [],
        approvalRequired: true,
        approvalReason: "Service control requires approval.",
        targetPaths: [action.target],
        createdAt: new Date().toISOString()
    });
};
const registryControlPlan = (prompt, context) => {
    const normalized = normalizePrompt(prompt);
    const action = resolveRegistryAction(prompt);
    if (!action) {
        return buildPlan({
            requestId: randomUUID(),
            prompt,
            normalizedPrompt: normalized,
            family: "registry-control",
            summary: "Need the exact registry key or value before I can change it.",
            steps: [
                {
                    id: "clarify",
                    kind: "confirm-approval",
                    title: "Clarify registry target",
                    summary: "Ask for the exact registry key or value.",
                    approvalRequired: false,
                    riskClass: "low"
                }
            ],
            evidence: context.machineAwareness
                ? [
                    {
                        source: "machine",
                        label: "registry-zones",
                        summary: `Registry zone map includes ${context.machineAwareness.registryZoneMap.zones.length} zones.`
                    }
                ]
                : [],
            artifacts: [],
            clarificationNeeded: ["Please provide the exact registry key or value to change."],
            approvalRequired: true,
            approvalReason: "Registry changes require approval.",
            targetPaths: [],
            createdAt: new Date().toISOString()
        });
    }
    return buildPlan({
        requestId: randomUUID(),
        prompt,
        normalizedPrompt: normalized,
        family: "registry-control",
        summary: action.actionId === "delete-registry-value"
            ? `Delete registry value ${action.valueName} under ${action.key}.`
            : `Set registry value ${action.valueName} under ${action.key}.`,
        steps: [
            {
                id: "registry-action",
                kind: "registry-action",
                title: "Update registry",
                summary: action.actionId === "delete-registry-value"
                    ? `Delete ${action.valueName} at ${action.key}.`
                    : `Set ${action.valueName} at ${action.key}.`,
                approvalRequired: true,
                riskClass: "high",
                target: action.key,
                actionId: action.actionId,
                metadata: {
                    valueName: action.valueName,
                    value: action.value,
                    valueKind: "String"
                }
            }
        ],
        evidence: context.machineAwareness
            ? [
                {
                    source: "machine",
                    label: "registry-zones",
                    summary: `Registry zone map includes ${context.machineAwareness.registryZoneMap.zones.length} zones.`
                }
            ]
            : [],
        artifacts: [],
        clarificationNeeded: [],
        approvalRequired: true,
        approvalReason: "Registry changes require approval.",
        targetPaths: [action.key],
        createdAt: new Date().toISOString()
    });
};
const uiAutomationPlan = (prompt, context) => {
    const normalized = normalizePrompt(prompt);
    const action = resolveUiAction(prompt);
    if (!action) {
        return buildPlan({
            requestId: randomUUID(),
            prompt,
            normalizedPrompt: normalized,
            family: "ui-automation",
            summary: "Need the exact UI target before I can interact with it.",
            steps: [
                {
                    id: "clarify",
                    kind: "confirm-approval",
                    title: "Clarify UI target",
                    summary: "Ask for the exact UI element or window.",
                    approvalRequired: false,
                    riskClass: "low"
                }
            ],
            evidence: context.screenAwareness
                ? [
                    {
                        source: "screen",
                        label: "screen-awareness",
                        summary: summarizeScreen(context.screenAwareness) ?? "Screen awareness available."
                    }
                ]
                : [],
            artifacts: [],
            clarificationNeeded: ["Please provide the exact UI element, window, or shortcut to use."],
            approvalRequired: false,
            approvalReason: null,
            targetPaths: [],
            createdAt: new Date().toISOString()
        });
    }
    return buildPlan({
        requestId: randomUUID(),
        prompt,
        normalizedPrompt: normalized,
        family: "ui-automation",
        summary: action.actionId === "ui-type"
            ? `Type into ${action.target}.`
            : action.actionId === "ui-hotkey"
                ? `Send hotkeys for ${action.target}.`
                : `Click ${action.target}.`,
        steps: [
            {
                id: "ui-action",
                kind: "ui-action",
                title: "UI action",
                summary: action.actionId === "ui-type"
                    ? `Type into ${action.target}.`
                    : action.actionId === "ui-hotkey"
                        ? `Send hotkeys for ${action.target}.`
                        : `Click ${action.target}.`,
                approvalRequired: false,
                riskClass: "low",
                target: action.target,
                actionId: action.actionId,
                metadata: {
                    value: action.value,
                    keys: action.keys,
                    submit: action.submit
                }
            }
        ],
        evidence: context.screenAwareness
            ? [
                {
                    source: "screen",
                    label: "screen-awareness",
                    summary: summarizeScreen(context.screenAwareness) ?? "Screen awareness available."
                }
            ]
            : [],
        artifacts: [],
        clarificationNeeded: [],
        approvalRequired: false,
        approvalReason: null,
        targetPaths: [action.target],
        createdAt: new Date().toISOString()
    });
};
const applicationPlan = (prompt, context) => {
    const normalized = normalizePrompt(prompt);
    const target = resolveApplicationTargetName(prompt, "");
    const matchedApps = candidateApps(context.machineAwareness, target).slice(0, 2);
    const targetWords = uniqueStrings([
        target,
        ...matchedApps.flatMap((entry) => [entry.name, normalizeExecutableTarget(entry.displayIcon), entry.associatedProcessNames[0] ?? null])
    ]);
    if (!target || isGenericProcessTarget(target)) {
        return buildPlan({
            requestId: randomUUID(),
            prompt,
            normalizedPrompt: normalized,
            family: "application-management",
            summary: "Need the exact program or app name before launching it.",
            steps: [
                {
                    id: "clarify",
                    kind: "confirm-approval",
                    title: "Clarify application target",
                    summary: "Ask which app or program should be launched.",
                    approvalRequired: false,
                    riskClass: "low"
                }
            ],
            evidence: context.machineAwareness
                ? [
                    {
                        source: "machine",
                        label: "installed-apps",
                        summary: `Installed apps inventory has ${context.machineAwareness.installedAppsSnapshot.totalCount} entries.`
                    }
                ]
                : [],
            artifacts: [],
            clarificationNeeded: ["Please provide the exact program or app name to launch."],
            approvalRequired: false,
            approvalReason: null,
            targetPaths: [],
            createdAt: new Date().toISOString()
        });
    }
    const resolvedTarget = targetWords[0] ?? target;
    const launchTargetCandidates = [
        normalizeExecutableTarget(matchedApps[0]?.displayIcon),
        normalizeExecutableTarget(matchedApps[0]?.associatedProcessNames[0]),
        resolvedTarget
    ].filter((entry) => Boolean(entry));
    const launchTarget = launchTargetCandidates.find((candidate) => /[\\/]|(?:\.exe|\.com|\.bat|\.cmd)$/i.test(candidate)) ??
        resolvedTarget;
    return buildPlan({
        requestId: randomUUID(),
        prompt,
        normalizedPrompt: normalized,
        family: "application-management",
        summary: `Launch ${resolvedTarget}.`,
        steps: [
            {
                id: "launch-program",
                kind: "desktop-action",
                title: "Launch program",
                summary: `Launch ${launchTarget}.`,
                approvalRequired: false,
                riskClass: "low",
                target: launchTarget,
                actionId: "launch-program"
            }
        ],
        evidence: context.machineAwareness
            ? [
                {
                    source: "machine",
                    label: "installed-apps",
                    summary: `Installed apps inventory has ${context.machineAwareness.installedAppsSnapshot.totalCount} entries.`
                }
            ]
            : [],
        artifacts: [],
        clarificationNeeded: [],
        approvalRequired: false,
        approvalReason: null,
        targetPaths: [launchTarget],
        createdAt: new Date().toISOString()
    });
};
const resolveCloseTargetName = (prompt, context) => {
    const target = extractPromptValue(prompt, [
        /\b(?:close|quit|exit|shut down|shutdown)\s+(?:the\s+)?(?:app|application|program|window|browser)?\s+([a-z0-9._-]+(?:\s+[a-z0-9._-]+){0,5})/i,
        /\b(?:close|quit|exit|shut down|shutdown)\s+([a-z0-9._-]+(?:\s+[a-z0-9._-]+){0,5})/i
    ], "");
    if (!target || isGenericProcessTarget(target)) {
        return null;
    }
    const candidates = candidateProcesses(context.machineAwareness, target);
    const appCandidates = candidateApps(context.machineAwareness, target);
    const synaiForegroundTarget = (() => {
        const foregroundProcess = context.screenAwareness?.foregroundWindow?.processName ?? null;
        const foregroundTitle = context.screenAwareness?.foregroundWindow?.title ?? null;
        if ((foregroundProcess && normalizePrompt(foregroundProcess).includes("synai")) ||
            (foregroundTitle && normalizePrompt(foregroundTitle).includes("synai"))) {
            return foregroundProcess ?? foregroundTitle ?? "SynAI";
        }
        return "SynAI";
    })();
    const resolvedTarget = candidates[0]?.name ??
        candidates[0]?.windowTitle ??
        appCandidates[0]?.associatedProcessNames[0] ??
        appCandidates[0]?.name ??
        (containsAny(normalizePrompt(prompt), ["synai"]) ? synaiForegroundTarget : null) ??
        target;
    return {
        target: resolvedTarget,
        candidates,
        appCandidates
    };
};
const closeAppPlan = (prompt, context) => {
    const normalized = normalizePrompt(prompt);
    const resolved = resolveCloseTargetName(prompt, context);
    if (!resolved) {
        return buildPlan({
            requestId: randomUUID(),
            prompt,
            normalizedPrompt: normalized,
            family: "application-management",
            summary: "Need the exact app or process name before I can close it safely.",
            steps: [
                {
                    id: "clarify",
                    kind: "confirm-approval",
                    title: "Clarify close target",
                    summary: "Ask which app, browser, or window should be closed.",
                    approvalRequired: false,
                    riskClass: "low"
                }
            ],
            evidence: context.machineAwareness
                ? [
                    {
                        source: "machine",
                        label: "running-apps",
                        summary: `Running process inventory has ${context.machineAwareness.processSnapshot.totalCount} entries.`
                    }
                ]
                : [],
            artifacts: [],
            clarificationNeeded: ["Please provide the exact app, browser, or process name to close."],
            approvalRequired: false,
            approvalReason: null,
            targetPaths: [],
            createdAt: new Date().toISOString()
        });
    }
    return buildPlan({
        requestId: randomUUID(),
        prompt,
        normalizedPrompt: normalized,
        family: "application-management",
        summary: `Close ${resolved.target} gracefully.`,
        steps: [
            {
                id: "close-app",
                kind: "desktop-action",
                title: "Close app gracefully",
                summary: `Request graceful shutdown for ${resolved.target}.`,
                approvalRequired: true,
                riskClass: "high",
                target: resolved.target,
                actionId: "close-app"
            }
        ],
        evidence: [
            {
                source: "machine",
                label: "resolved-close-target",
                summary: resolved.target
            }
        ],
        artifacts: [],
        clarificationNeeded: [],
        approvalRequired: true,
        approvalReason: "Closing an app can lose unsaved work and requires approval.",
        targetPaths: [resolved.target],
        createdAt: new Date().toISOString()
    });
};
const isWindowControlPrompt = (prompt) => {
    const normalized = normalizePrompt(prompt);
    return containsAny(normalized, ["focus ", "bring to front", "switch to", "activate ", "show window", "foreground window"]);
};
const resolveWindowControlTargetName = (prompt, context) => {
    const target = extractPromptValue(prompt, [
        /\b(?:focus|bring(?: the)?(?: window)?|switch to|activate|show)\s+(?:the\s+)?(?:app|application|program|window)?\s+([a-z0-9._-]+(?:\s+[a-z0-9._-]+){0,4})/i,
        /\b(?:focus|bring(?: the)?(?: window)?|switch to|activate|show)\s+([a-z0-9._-]+(?:\s+[a-z0-9._-]+){0,4})/i
    ], "");
    if (!target || isGenericProcessTarget(target)) {
        return null;
    }
    const candidates = candidateProcesses(context.machineAwareness, target);
    const fallbackTarget = candidates[0]?.windowTitle ?? candidates[0]?.name ?? target;
    return {
        target: fallbackTarget,
        candidates
    };
};
const windowControlPlan = (prompt, context) => {
    const normalized = normalizePrompt(prompt);
    const resolved = resolveWindowControlTargetName(prompt, context);
    if (!resolved) {
        return buildPlan({
            requestId: randomUUID(),
            prompt,
            normalizedPrompt: normalized,
            family: "window-control",
            summary: "Need the exact window or app name before I can focus it.",
            steps: [
                {
                    id: "clarify",
                    kind: "confirm-approval",
                    title: "Clarify window target",
                    summary: "Ask which exact window should be focused.",
                    approvalRequired: false,
                    riskClass: "low"
                }
            ],
            evidence: context.screenAwareness
                ? [
                    {
                        source: "screen",
                        label: "screen-awareness",
                        summary: summarizeScreen(context.screenAwareness) ?? "Screen awareness available."
                    }
                ]
                : [],
            artifacts: [],
            clarificationNeeded: ["Please provide the exact window title, app, or program to focus."],
            approvalRequired: false,
            approvalReason: null,
            targetPaths: [],
            createdAt: new Date().toISOString()
        });
    }
    return buildPlan({
        requestId: randomUUID(),
        prompt,
        normalizedPrompt: normalized,
        family: "window-control",
        summary: `Focus the window for ${resolved.target}.`,
        steps: [
            {
                id: "focus-window",
                kind: "desktop-action",
                title: "Focus window",
                summary: `Bring ${resolved.target} to the foreground.`,
                approvalRequired: false,
                riskClass: "low",
                target: resolved.target,
                actionId: "focus-window",
                metadata: {
                    candidateCount: resolved.candidates.length
                }
            }
        ],
        evidence: [
            ...(context.screenAwareness
                ? [
                    {
                        source: "screen",
                        label: "screen-awareness",
                        summary: summarizeScreen(context.screenAwareness) ?? "Screen awareness available."
                    }
                ]
                : []),
            ...(context.machineAwareness
                ? [
                    {
                        source: "machine",
                        label: "window-candidates",
                        summary: resolved.candidates.length > 0
                            ? resolved.candidates
                                .slice(0, 3)
                                .map((entry) => `${entry.name}#${entry.pid} | ${entry.windowTitle ?? "no title"}`)
                                .join(" | ")
                            : `Installed apps inventory has ${context.machineAwareness.installedAppsSnapshot.totalCount} entries.`
                    }
                ]
                : [])
        ],
        artifacts: [],
        clarificationNeeded: [],
        approvalRequired: false,
        approvalReason: null,
        targetPaths: [resolved.target],
        createdAt: new Date().toISOString()
    });
};
const isBulkDesktopOrganizationPrompt = (prompt) => {
    const normalized = normalizePrompt(prompt);
    return (containsAny(normalized, ["desktop"]) &&
        containsAny(normalized, ["move", "relocate", "put", "send"]) &&
        containsAny(normalized, ["everything", "all", "contents", "items", "files"]) &&
        containsAny(normalized, ["new folder", "folder named", "folder called", "folder as", "into a folder", "into folder"]));
};
const bulkDesktopOrganizationPlan = async (prompt, context) => {
    const normalized = normalizePrompt(prompt);
    const resolution = resolveDesktopOrganizationTarget(prompt);
    if (!resolution) {
        return buildPlan({
            requestId: randomUUID(),
            prompt,
            normalizedPrompt: normalized,
            family: "file-management",
            summary: "Need the destination folder name before I can move the desktop items.",
            steps: [
                {
                    id: "clarify",
                    kind: "confirm-approval",
                    title: "Clarify desktop folder",
                    summary: "Ask for the exact destination folder name.",
                    approvalRequired: false,
                    riskClass: "low"
                }
            ],
            evidence: context.fileAwareness
                ? [
                    {
                        source: "file",
                        label: "file-awareness",
                        summary: summarizeFile(context.fileAwareness) ?? "File awareness available."
                    }
                ]
                : [],
            artifacts: [],
            clarificationNeeded: ["Please name the new folder that should receive the desktop items."],
            approvalRequired: false,
            approvalReason: null,
            targetPaths: [],
            createdAt: new Date().toISOString()
        });
    }
    const destinationFolderPath = path.resolve(context.desktopPath, resolution.folderName);
    const desktopEntries = await readdir(context.desktopPath, { withFileTypes: true }).catch(() => []);
    const movableEntries = desktopEntries.filter((entry) => entry.name !== resolution.folderName &&
        entry.name !== "desktop.ini" &&
        !entry.name.startsWith(".") &&
        (entry.isFile() || entry.isDirectory()));
    const steps = [
        {
            id: "create-desktop-folder",
            kind: "desktop-action",
            title: "Create destination folder",
            summary: `Create ${destinationFolderPath}.`,
            approvalRequired: false,
            riskClass: "low",
            target: destinationFolderPath,
            actionId: "create-folder",
            metadata: {
                allowedRoots: uniqueStrings([context.desktopPath])
            }
        }
    ];
    for (const entry of movableEntries) {
        const sourcePath = path.resolve(context.desktopPath, entry.name);
        const destinationPath = path.resolve(destinationFolderPath, entry.name);
        steps.push({
            id: `move-desktop-${slugify(entry.name, "item")}`,
            kind: "desktop-action",
            title: `Move ${entry.name}`,
            summary: `Move ${entry.name} into ${destinationFolderPath}.`,
            approvalRequired: false,
            riskClass: "medium",
            target: sourcePath,
            destination: destinationPath,
            actionId: "move-item",
            metadata: {
                allowedRoots: uniqueStrings([context.desktopPath, destinationFolderPath])
            }
        });
    }
    const evidence = [
        {
            source: "file",
            label: "desktop-contents",
            summary: movableEntries.length > 0
                ? `Desktop entries to move: ${movableEntries.slice(0, 8).map((entry) => entry.name).join(" | ")}`
                : "Desktop was empty or the contents could not be read."
        }
    ];
    return buildPlan({
        requestId: randomUUID(),
        prompt,
        normalizedPrompt: normalized,
        family: "file-management",
        summary: movableEntries.length > 0
            ? `Move everything from the desktop into ${destinationFolderPath} after approval.`
            : `Create ${destinationFolderPath} and leave the desktop organized after approval.`,
        steps,
        evidence,
        artifacts: [],
        clarificationNeeded: [],
        approvalRequired: true,
        approvalReason: "Moving everything on the desktop requires approval.",
        targetPaths: [destinationFolderPath, ...movableEntries.map((entry) => path.resolve(destinationFolderPath, entry.name))],
        createdAt: new Date().toISOString()
    });
};
const maintenancePromptMode = (normalized) => {
    if (containsAny(normalized, ["startup", "launch at sign in", "launch at startup"])) {
        return "startup-review";
    }
    if (containsAny(normalized, ["disk space", "storage", "space on my drive", "free up space", "disk cleanup"])) {
        return "disk-space-triage";
    }
    if (containsAny(normalized, ["make my computer faster", "slowing my pc", "slow pc", "performance", "running slow", "slow down"])) {
        return "performance-triage";
    }
    if (containsAny(normalized, ["organize my files", "organize my desktop", "orginaze my desktop", "organize", "organise", "tidy my desktop", "sort my desktop"])) {
        return "organization";
    }
    return "cleanup";
};
const maintenanceReviewPlan = (prompt, context) => {
    const normalized = normalizePrompt(prompt);
    const mode = maintenancePromptMode(normalized);
    const folder = pickTargetFolder(prompt, context);
    const fileName = `${slugify(`${mode} ${prompt}`, `${mode}-review`)}.md`;
    const targetPath = resolveOutputPath(folder, fileName, context);
    const steps = [
        {
            id: "collect-machine",
            kind: "collect-machine",
            title: "Collect machine evidence",
            summary: "Capture process, startup, services, app, and disk evidence.",
            approvalRequired: false,
            riskClass: "low"
        },
        {
            id: "collect-file",
            kind: "collect-file",
            title: "Collect file evidence",
            summary: "Capture file and folder evidence relevant to cleanup and organization.",
            approvalRequired: false,
            riskClass: "low"
        }
    ];
    if (mode === "performance-triage") {
        steps.push({
            id: "collect-screen",
            kind: "collect-screen",
            title: "Collect screen evidence",
            summary: "Capture the active screen context for visible slowdown clues.",
            approvalRequired: false,
            riskClass: "low"
        });
        steps.push({
            id: "open-task-manager",
            kind: "desktop-action",
            title: "Open Task Manager",
            summary: "Open Task Manager for direct process inspection.",
            approvalRequired: false,
            riskClass: "low",
            target: "taskmgr",
            actionId: "open-task-manager"
        });
        steps.push({
            id: "open-startup-apps",
            kind: "desktop-action",
            title: "Open Startup Apps",
            summary: "Open Startup Apps to review launch-time load.",
            approvalRequired: false,
            riskClass: "low",
            target: "ms-settings:startupapps",
            actionId: "open-startup-apps"
        });
        steps.push({
            id: "open-storage-settings",
            kind: "desktop-action",
            title: "Open Storage Settings",
            summary: "Open Storage settings to review disk-space usage.",
            approvalRequired: false,
            riskClass: "low",
            target: "ms-settings:storage",
            actionId: "open-storage-settings"
        });
    }
    else if (mode === "startup-review") {
        steps.push({
            id: "open-task-manager",
            kind: "desktop-action",
            title: "Open Task Manager",
            summary: "Open Task Manager for startup-linked process inspection.",
            approvalRequired: false,
            riskClass: "low",
            target: "taskmgr",
            actionId: "open-task-manager"
        });
        steps.push({
            id: "open-startup-apps",
            kind: "desktop-action",
            title: "Open Startup Apps",
            summary: "Open Startup Apps for launch-item review.",
            approvalRequired: false,
            riskClass: "low",
            target: "ms-settings:startupapps",
            actionId: "open-startup-apps"
        });
    }
    else if (mode === "disk-space-triage") {
        steps.push({
            id: "open-storage-settings",
            kind: "desktop-action",
            title: "Open Storage Settings",
            summary: "Open Storage settings for disk-space triage.",
            approvalRequired: false,
            riskClass: "low",
            target: "ms-settings:storage",
            actionId: "open-storage-settings"
        });
    }
    else {
        steps.push({
            id: "open-add-remove-programs",
            kind: "desktop-action",
            title: "Open installed apps",
            summary: "Open Add or Remove Programs to review installed software.",
            approvalRequired: false,
            riskClass: "low",
            target: "ms-settings:appsfeatures",
            actionId: "open-add-remove-programs"
        });
        steps.push({
            id: "open-task-manager",
            kind: "desktop-action",
            title: "Open Task Manager",
            summary: "Open Task Manager for active-process review.",
            approvalRequired: false,
            riskClass: "low",
            target: "taskmgr",
            actionId: "open-task-manager"
        });
    }
    steps.push({
        id: "write-report",
        kind: "write-markdown",
        title: "Write maintenance review",
        summary: "Save a concise maintenance review with safe next steps.",
        approvalRequired: false,
        riskClass: "low",
        saveTo: folder,
        fileName
    });
    const evidence = [
        {
            source: "machine",
            label: "machine-awareness",
            summary: summarizeMachine(context.machineAwareness) ?? "Machine awareness unavailable."
        },
        {
            source: "file",
            label: "file-awareness",
            summary: summarizeFile(context.fileAwareness) ?? "File awareness unavailable."
        }
    ];
    if (context.screenAwareness) {
        evidence.push({
            source: "screen",
            label: "screen-awareness",
            summary: summarizeScreen(context.screenAwareness) ?? "Screen awareness available."
        });
    }
    return buildPlan({
        requestId: randomUUID(),
        prompt,
        normalizedPrompt: normalized,
        family: "maintenance-review",
        summary: mode === "startup-review"
            ? `Review startup load and save the findings to ${targetPath ?? folder}.`
            : mode === "disk-space-triage"
                ? `Review disk-space usage and save the findings to ${targetPath ?? folder}.`
                : mode === "performance-triage"
                    ? `Review system slowdown clues and save the findings to ${targetPath ?? folder}.`
                    : `Review cleanup and organization opportunities and save the findings to ${targetPath ?? folder}.`,
        steps,
        evidence,
        artifacts: [
            {
                id: "review",
                kind: "markdown",
                label: mode === "startup-review"
                    ? "Startup review"
                    : mode === "disk-space-triage"
                        ? "Disk-space triage"
                        : mode === "performance-triage"
                            ? "Performance triage"
                            : "Maintenance review",
                saveTo: folder,
                fileName,
                description: "Saved maintenance review",
                metadata: {
                    mode
                }
            }
        ],
        clarificationNeeded: [],
        approvalRequired: false,
        approvalReason: null,
        targetPaths: targetPath ? [targetPath] : [],
        createdAt: new Date().toISOString()
    });
};
const systemNavigationPlan = (prompt, context) => {
    const normalized = normalizePrompt(prompt);
    const resolved = resolveSystemNavigationAction(prompt);
    if (!resolved) {
        return buildPlan({
            requestId: randomUUID(),
            prompt,
            normalizedPrompt: normalized,
            family: "system-navigation",
            summary: "Need the exact Windows surface before opening it.",
            steps: [
                {
                    id: "clarify",
                    kind: "confirm-approval",
                    title: "Clarify Windows surface",
                    summary: "Ask which Settings, Control Panel, or management surface to open.",
                    approvalRequired: false,
                    riskClass: "low"
                }
            ],
            evidence: context.screenAwareness
                ? [
                    {
                        source: "screen",
                        label: "screen-awareness",
                        summary: summarizeScreen(context.screenAwareness) ?? "Screen awareness available."
                    }
                ]
                : [],
            artifacts: [],
            clarificationNeeded: ["Please provide the exact Windows surface to open."],
            approvalRequired: false,
            approvalReason: null,
            targetPaths: [],
            createdAt: new Date().toISOString()
        });
    }
    return buildPlan({
        requestId: randomUUID(),
        prompt,
        normalizedPrompt: normalized,
        family: "system-navigation",
        summary: `Open ${resolved.actionId.replace(/^open-/, "").replace(/-/g, " ")}.`,
        steps: [
            {
                id: "open-surface",
                kind: "desktop-action",
                title: "Open Windows surface",
                summary: `Open the requested Windows surface (${resolved.actionId}).`,
                approvalRequired: false,
                riskClass: "low",
                target: resolved.target,
                actionId: resolved.actionId
            }
        ],
        evidence: context.screenAwareness
            ? [
                {
                    source: "screen",
                    label: "screen-awareness",
                    summary: summarizeScreen(context.screenAwareness) ?? "Screen awareness available."
                }
            ]
            : [],
        artifacts: [],
        clarificationNeeded: [],
        approvalRequired: false,
        approvalReason: null,
        targetPaths: [resolved.target],
        createdAt: new Date().toISOString()
    });
};
const filePlan = (prompt, context) => {
    const normalized = normalizePrompt(prompt);
    const wantsCreate = isCreateTask(prompt);
    const wantsOpen = isOpenTask(prompt);
    const wantsRename = isRenameTask(prompt);
    const wantsMove = isMoveTask(prompt);
    const wantsDelete = isDeleteTask(prompt);
    const explicitPaths = extractExplicitPaths(prompt);
    const explicitSourcePath = explicitPaths[0] ?? "";
    const explicitDestinationPath = explicitPaths[1] ?? "";
    const primaryKind = containsAny(normalized, ["folder", "directory"]) && !containsAny(normalized, ["file"]) ? "folder" : "file";
    const baseRoot = explicitSourcePath ? path.dirname(explicitSourcePath) : resolvePathRoot(prompt, context, pickTargetFolder(prompt, context));
    const createName = resolveCreateTargetName(prompt, primaryKind === "folder" ? "new-folder" : "new-file.txt");
    const explicitRenameSource = wantsRename ? resolveRenameSourceName(prompt, "") : "";
    const explicitMoveSource = wantsMove ? resolveMoveSourceName(prompt, "") : "";
    const deleteName = wantsDelete ? resolveDeleteTargetName(prompt, wantsCreate ? createName : "") : "";
    const renameName = wantsRename ? resolveRenameTargetName(prompt, createName) : createName;
    const moveNameCandidate = wantsMove ? resolveMoveTargetName(prompt, renameName) : renameName;
    const openName = wantsOpen ? resolveOpenTargetName(prompt, "") : "";
    const normalizedOpenName = normalizePrompt(openName);
    const resolvedOpenName = openName && !containsAny(normalizedOpenName, ["file", "folder", "directory", "app", "application", "program"])
        ? openName
        : "";
    const openRequiresClarification = wantsOpen &&
        !openName &&
        !containsAny(normalized, ["desktop", "documents", "document folder", "docs folder", "workspace", "repo", "project folder"]);
    const openTarget = explicitSourcePath && wantsOpen
        ? explicitSourcePath
        : resolvedOpenName && !containsAny(normalized, ["desktop", "documents", "document folder", "docs folder", "workspace", "repo", "project folder"])
            ? path.resolve(baseRoot, resolvedOpenName)
            : baseRoot;
    const createPath = explicitSourcePath && wantsCreate ? explicitSourcePath : path.resolve(baseRoot, createName);
    const renamePath = explicitDestinationPath && wantsRename ? explicitDestinationPath : path.resolve(baseRoot, renameName);
    const moveName = wantsMove && ["my", "the", "a", "an", "document", "documents", "folder", "file", "item", "it"].includes(normalizePrompt(moveNameCandidate))
        ? renameName
        : moveNameCandidate;
    const destinationRoot = wantsMove
        ? containsAny(normalized, ["documents", "document folder", "my document folder", "docs folder", "my docs"])
            ? context.documentsPath
            : containsAny(normalized, ["desktop"])
                ? context.desktopPath
                : resolvePathRoot(prompt, context, pickTargetFolder(prompt, context))
        : baseRoot;
    const movePath = explicitDestinationPath && wantsMove ? explicitDestinationPath : path.resolve(destinationRoot, moveName);
    const renameSourcePath = explicitSourcePath && wantsRename ? explicitSourcePath : explicitRenameSource ? path.resolve(baseRoot, explicitRenameSource) : wantsCreate ? createPath : "";
    const moveSourcePath = explicitSourcePath && wantsMove ? explicitSourcePath : explicitMoveSource ? path.resolve(baseRoot, explicitMoveSource) : wantsRename ? renamePath : wantsCreate ? createPath : "";
    const deleteSourcePath = explicitSourcePath && wantsDelete ? explicitSourcePath : deleteName ? path.resolve(baseRoot, deleteName) : wantsMove ? movePath : wantsRename ? renamePath : wantsCreate ? createPath : "";
    const renameRequiresClarification = wantsRename && !renameSourcePath;
    const moveRequiresClarification = wantsMove && !moveSourcePath;
    const deleteRequiresClarification = wantsDelete && !deleteSourcePath;
    const steps = [];
    if (renameRequiresClarification || moveRequiresClarification || deleteRequiresClarification) {
        steps.push({
            id: "clarify",
            kind: "confirm-approval",
            title: "Clarify file task",
            summary: "Need the exact file, folder, or item before making the change.",
            approvalRequired: false,
            riskClass: "low"
        });
    }
    else if (wantsOpen && !wantsCreate && !wantsRename && !wantsMove && !wantsDelete && !openRequiresClarification) {
        steps.push({
            id: "open-item",
            kind: "desktop-action",
            title: `Open ${primaryKind}`,
            summary: `Open ${openTarget}.`,
            approvalRequired: false,
            riskClass: "low",
            target: openTarget,
            actionId: primaryKind === "folder" ? "open-folder" : "open-file"
        });
    }
    if (wantsCreate) {
        steps.push({
            id: `create-${primaryKind}`,
            kind: "desktop-action",
            title: `Create ${primaryKind}`,
            summary: `Create ${createPath}.`,
            approvalRequired: false,
            riskClass: "medium",
            target: createPath,
            actionId: primaryKind === "folder" ? "create-folder" : "create-file",
            metadata: primaryKind === "file"
                ? { content: "", allowedRoots: uniqueStrings([baseRoot]) }
                : { allowedRoots: uniqueStrings([baseRoot]) }
        });
    }
    if (wantsRename) {
        steps.push({
            id: `rename-${primaryKind}`,
            kind: "desktop-action",
            title: "Rename item",
            summary: `Rename the item to ${renameName}.`,
            approvalRequired: false,
            riskClass: "medium",
            target: renameSourcePath || createPath,
            destination: renamePath,
            actionId: "rename-item",
            metadata: {
                allowedRoots: uniqueStrings([baseRoot, destinationRoot])
            }
        });
    }
    if (wantsMove) {
        steps.push({
            id: `move-${primaryKind}`,
            kind: "desktop-action",
            title: "Move item",
            summary: `Move the item to ${movePath}.`,
            approvalRequired: false,
            riskClass: "medium",
            target: moveSourcePath,
            destination: movePath,
            actionId: "move-item",
            metadata: {
                allowedRoots: uniqueStrings([baseRoot, destinationRoot])
            }
        });
    }
    if (wantsDelete && !deleteRequiresClarification) {
        steps.push({
            id: `delete-${primaryKind}`,
            kind: "desktop-action",
            title: `Delete ${primaryKind}`,
            summary: `Delete ${deleteSourcePath}.`,
            approvalRequired: true,
            riskClass: "high",
            target: deleteSourcePath,
            actionId: primaryKind === "folder" ? "delete-folder" : "delete-file",
            metadata: {
                allowedRoots: uniqueStrings([baseRoot, destinationRoot])
            }
        });
    }
    if (steps.length === 0) {
        steps.push({
            id: "clarify",
            kind: "confirm-approval",
            title: "Clarify file task",
            summary: "Need a clearer file request before execution.",
            approvalRequired: false,
            riskClass: "low"
        });
    }
    const approvalRequired = steps.some((step) => step.approvalRequired);
    return buildPlan({
        requestId: randomUUID(),
        prompt,
        normalizedPrompt: normalized,
        family: "file-management",
        summary: wantsOpen && !approvalRequired
            ? `Open the requested ${primaryKind}.`
            : approvalRequired
                ? `Carry out the requested file workflow after approval.`
                : `Carry out the file workflow and keep the result visible in the target folder.`,
        steps,
        evidence: context.fileAwareness
            ? [
                {
                    source: "file",
                    label: "file-awareness",
                    summary: summarizeFile(context.fileAwareness) ?? "File awareness available."
                }
            ]
            : [],
        artifacts: [],
        clarificationNeeded: steps.length === 1 && steps[0].kind === "confirm-approval"
            ? ["Please provide the exact file, folder, or destination target."]
            : [],
        approvalRequired,
        approvalReason: approvalRequired ? "Destructive file operations require an approval token." : null,
        targetPaths: uniqueStrings([openTarget, createPath, renamePath, movePath, deleteSourcePath]),
        createdAt: new Date().toISOString()
    });
};
const processPlan = (prompt, context) => {
    const normalized = normalizePrompt(prompt);
    const resolvedTargets = uniqueStrings([
        ...extractTargetsFromResolvedPrompt(prompt),
        extractPromptValue(prompt, [
            /\b(?:kill|terminate|end task|stop task|close)\s+(?:the\s+)?([a-z0-9._-]+(?:\s+[a-z0-9._-]+){0,5})/i,
            /\b(?:process|task)\s+([a-z0-9._-]+(?:\s+[a-z0-9._-]+){0,5})/i
        ], "")
    ]).filter((entry) => !isGenericProcessTarget(entry));
    if (resolvedTargets.length === 0) {
        return buildPlan({
            requestId: randomUUID(),
            prompt,
            normalizedPrompt: normalized,
            family: "process-control",
            summary: "Need an exact process name or PID before terminating anything.",
            steps: [
                {
                    id: "clarify",
                    kind: "confirm-approval",
                    title: "Clarify process target",
                    summary: "Ask which exact process should be terminated.",
                    approvalRequired: false,
                    riskClass: "low"
                }
            ],
            evidence: context.machineAwareness
                ? [
                    {
                        source: "machine",
                        label: "process-inventory",
                        summary: `Machine process inventory has ${context.machineAwareness.processSnapshot.totalCount} entries.`
                    }
                ]
                : [],
            artifacts: [],
            clarificationNeeded: ["Please provide the exact process name or PID."],
            approvalRequired: false,
            approvalReason: null,
            targetPaths: [],
            createdAt: new Date().toISOString()
        });
    }
    const candidateSets = resolvedTargets.map((target) => ({
        target,
        candidates: candidateProcesses(context.machineAwareness, target)
    }));
    const evidenceSummary = candidateSets
        .map((entry) => entry.candidates.length > 0
        ? entry.candidates[0]
            ? `${entry.target} => ${entry.candidates[0].name}#${entry.candidates[0].pid}`
            : entry.target
        : entry.target)
        .join(" | ") || resolvedTargets.join(" | ");
    const steps = [];
    for (const entry of candidateSets) {
        const process = entry.candidates[0] ?? null;
        const processTarget = process?.pid ? String(process.pid) : entry.target;
        steps.push({
            id: `inspect-process-${slugify(entry.target, "process")}`,
            kind: "desktop-action",
            title: `Inspect ${entry.target}`,
            summary: `Inspect the exact process ${entry.target}.`,
            approvalRequired: false,
            riskClass: "low",
            target: processTarget,
            actionId: "inspect-process",
            metadata: {
                targetKind: process?.pid ? "process-id" : "process-name",
                sourceTarget: entry.target
            }
        });
        steps.push({
            id: `terminate-process-${slugify(entry.target, "process")}`,
            kind: "desktop-action",
            title: `Terminate ${entry.target}`,
            summary: `Terminate the exact process ${entry.target}.`,
            approvalRequired: true,
            riskClass: "high",
            target: processTarget,
            actionId: "terminate-process",
            metadata: {
                targetKind: process?.pid ? "process-id" : "process-name",
                sourceTarget: entry.target
            }
        });
    }
    return buildPlan({
        requestId: randomUUID(),
        prompt,
        normalizedPrompt: normalized,
        family: "process-control",
        summary: resolvedTargets.length === 1
            ? `Inspect and terminate the exact process ${resolvedTargets[0]}.`
            : `Inspect and terminate the exact processes ${resolvedTargets.join(", ")}.`,
        steps,
        evidence: [
            {
                source: "machine",
                label: "resolved-process",
                summary: evidenceSummary
            }
        ],
        artifacts: [],
        clarificationNeeded: [],
        approvalRequired: true,
        approvalReason: "Process termination requires an approval token.",
        targetPaths: resolvedTargets,
        createdAt: new Date().toISOString()
    });
};
const uninstallPlan = (prompt, context) => {
    const normalized = normalizePrompt(prompt);
    const target = extractPromptValue(prompt, [
        /\b(?:remove|uninstall|delete)\s+(?:the\s+)?([a-z0-9._-]+)/i,
        /\b(?:remove|uninstall|delete)\s+(?:the\s+)?(?:app|application|program)\s+([a-z0-9._-]+)/i
    ], "chrome");
    const candidates = target && !isGenericProcessTarget(target) ? candidateApps(context.machineAwareness, target) : [];
    if (!target || isGenericProcessTarget(target) || candidates.length === 0) {
        return buildPlan({
            requestId: randomUUID(),
            prompt,
            normalizedPrompt: normalized,
            family: "app-uninstall",
            summary: "Need the exact installed app name before uninstalling.",
            steps: [
                {
                    id: "clarify",
                    kind: "confirm-approval",
                    title: "Clarify application target",
                    summary: "Ask which exact installed app should be removed.",
                    approvalRequired: false,
                    riskClass: "low"
                }
            ],
            evidence: context.machineAwareness
                ? [
                    {
                        source: "machine",
                        label: "installed-apps",
                        summary: `Installed apps inventory has ${context.machineAwareness.installedAppsSnapshot.totalCount} entries.`
                    }
                ]
                : [],
            artifacts: [],
            clarificationNeeded: ["Please provide the exact installed app name to remove."],
            approvalRequired: false,
            approvalReason: null,
            targetPaths: [],
            createdAt: new Date().toISOString()
        });
    }
    const appEntry = candidates[0];
    return buildPlan({
        requestId: randomUUID(),
        prompt,
        normalizedPrompt: normalized,
        family: "app-uninstall",
        summary: `Remove ${appEntry.name} from the system.`,
        steps: [
            {
                id: "resolve-installed-app",
                kind: "resolve-installed-app",
                title: "Resolve installed app",
                summary: `Resolve the installed app record for ${appEntry.name}.`,
                approvalRequired: false,
                riskClass: "low",
                target: appEntry.name
            },
            {
                id: "uninstall-app",
                kind: "desktop-action",
                title: "Uninstall app",
                summary: `Uninstall ${appEntry.name} using its registered uninstall command.`,
                approvalRequired: true,
                riskClass: "high",
                target: appEntry.name,
                actionId: "uninstall-app"
            }
        ],
        evidence: [
            {
                source: "machine",
                label: "resolved-installed-app",
                summary: `${appEntry.name} | ${appEntry.publisher ?? "unknown publisher"}`
            }
        ],
        artifacts: [],
        clarificationNeeded: [],
        approvalRequired: true,
        approvalReason: "Application removal requires an approval token.",
        targetPaths: [appEntry.name],
        createdAt: new Date().toISOString()
    });
};
const generalPlan = (prompt, context) => buildPlan({
    requestId: randomUUID(),
    prompt,
    normalizedPrompt: normalizePrompt(prompt),
    family: "general",
    summary: "I need a more specific task before I can safely execute anything.",
    steps: [
        {
            id: "clarify",
            kind: "confirm-approval",
            title: "Clarify task",
            summary: "Ask for the exact Windows task to perform.",
            approvalRequired: false,
            riskClass: "low"
        }
    ],
    evidence: context.machineAwareness
        ? [
            {
                source: "machine",
                label: "machine-awareness",
                summary: summarizeMachine(context.machineAwareness) ?? "Machine awareness available."
            }
        ]
        : [],
    artifacts: [],
    clarificationNeeded: ["Please specify the action, target, and save location."],
    approvalRequired: false,
    approvalReason: null,
    targetPaths: [],
    createdAt: new Date().toISOString()
});
export const buildWorkflowPlan = async (prompt, context) => {
    const normalized = normalizePrompt(prompt);
    const webContext = context.recentWebContext ??
        (containsAny(normalized, ["research", "report", "latest", "current state"])
            ? context.recentWebContext ?? null
            : null);
    const planningContext = {
        ...context,
        recentWebContext: webContext
    };
    if (isHealthReportTask(prompt)) {
        return healthPlan(prompt, planningContext);
    }
    if (containsAny(normalized, ["research", "report", "write a report", "current state", "latest"])) {
        return researchPlan(prompt, planningContext, webContext);
    }
    if (isWindowControlPrompt(prompt)) {
        return windowControlPlan(prompt, planningContext);
    }
    if (isBulkDesktopOrganizationPrompt(prompt)) {
        return await bulkDesktopOrganizationPlan(prompt, planningContext);
    }
    if (containsAny(normalized, ["cleanup", "organize", "organise", "orginaze", "startup", "disk space", "disk cleanup", "make my computer faster", "slowing my pc", "performance", "slow pc"])) {
        return maintenanceReviewPlan(prompt, planningContext);
    }
    if (isServiceControlPrompt(normalized)) {
        return serviceControlPlan(prompt, planningContext);
    }
    if (isRegistryControlPrompt(normalized)) {
        return registryControlPlan(prompt, planningContext);
    }
    if (isUiAutomationPrompt(normalized)) {
        return uiAutomationPlan(prompt, planningContext);
    }
    if (isBrowserAutomationPrompt(normalized) && containsAny(normalized, ["click", "type", "hotkey", "keyboard shortcut", "submit", "form", "login", "sign in", "search"])) {
        return browserInteractionPlan(prompt, planningContext);
    }
    if (isBrowserNavigationPrompt(prompt)) {
        return browserNavigationPlan(prompt, planningContext);
    }
    if (resolveSystemNavigationAction(prompt) || containsAny(normalized, ["settings", "control panel", "task manager", "device manager", "event viewer", "task scheduler", "computer management", "registry editor", "apps and features", "add or remove programs"])) {
        return systemNavigationPlan(prompt, planningContext);
    }
    if (containsAny(normalized, ["youtube", "video", "play ", "watch "])) {
        return browserPlan(prompt, planningContext);
    }
    if (containsAny(normalized, ["uninstall", "remove chrome", "remove app", "remove browser", "delete application"])) {
        return uninstallPlan(prompt, planningContext);
    }
    if (containsAny(normalized, ["kill ", "terminate ", "end task", "stop task", "process", "task manager", "close chrome", "quit chrome", "close browser"])) {
        return processPlan(prompt, planningContext);
    }
    if (containsAny(normalized, ["launch", "run ", "start app", "open app", "open program"]) ||
        (isOpenTask(prompt) && !isFileTask(prompt))) {
        return applicationPlan(prompt, planningContext);
    }
    if (isCloseTask(prompt) && !isFileTask(prompt)) {
        return closeAppPlan(prompt, planningContext);
    }
    if ((isOpenTask(prompt) && isFileTask(prompt)) ||
        isCreateTask(prompt) ||
        isRenameTask(prompt) ||
        isMoveTask(prompt) ||
        isDeleteTask(prompt) ||
        isFileTask(prompt)) {
        return filePlan(prompt, planningContext);
    }
    return generalPlan(prompt, planningContext);
};
