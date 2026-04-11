export const RESOURCE_USAGE_TARGETS = ["cpu", "ram", "gpu", "disk", "uptime"];
export const RESOURCE_USAGE_TARGET_LABELS = {
    cpu: "CPU",
    ram: "RAM",
    gpu: "GPU",
    disk: "Disk",
    uptime: "Uptime"
};
const RESOURCE_USAGE_BROAD_PHRASES = [
    "system stats",
    "pc stats",
    "computer stats",
    "machine stats",
    "hardware stats",
    "device stats",
    "resource stats",
    "system health stats",
    "performance stats",
    "system status",
    "system health",
    "system info",
    "system information"
];
const RESOURCE_USAGE_PATTERNS = {
    cpu: ["cpu", "processor"],
    ram: ["ram", "memory"],
    gpu: ["gpu", "vram", "graphics card", "video card", "video memory", "graphics"],
    disk: ["disk", "storage", "drive", "hard drive"],
    uptime: ["uptime", "since boot", "since startup", "since restart", "how long has"]
};
const normalizeQuery = (query) => query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const phraseIndex = (query, phrase) => {
    const normalizedQuery = ` ${normalizeQuery(query)} `;
    const normalizedPhrase = ` ${normalizeQuery(phrase)} `;
    const index = normalizedQuery.indexOf(normalizedPhrase);
    return index >= 0 ? index : null;
};
const lineMatchesTarget = (line, target) => {
    const normalized = ` ${normalizeQuery(line)} `;
    switch (target) {
        case "cpu":
            return /(?:^|\s)current cpu load(?:\s|:)/i.test(line) || /(?:^|\s)cpu(?:\s|:)/i.test(line);
        case "ram":
            return /(?:^|\s)current ram(?:\s|:)/i.test(line) || /(?:^|\s)ram(?:\s|:)/i.test(line);
        case "gpu":
            return /(?:^|\s)current gpu(?:\s|:)/i.test(line) || /(?:^|\s)gpu(?:\s|:)/i.test(line) || /(?:^|\s)vram(?:\s|:)/i.test(line);
        case "disk":
            return /(?:^|\s)disk(?:\s|:)/i.test(line) || /(?:^|\s)drives?(?:\s|:)/i.test(line) || /(?:^|\s)you have .* free on /i.test(normalized);
        case "uptime":
            return /(?:^|\s)uptime(?:\s|:)/i.test(line);
        default:
            return false;
    }
};
export const resourceUsageTargetLabel = (target) => RESOURCE_USAGE_TARGET_LABELS[target];
export const resourceUsageSelectionTitle = (selection) => {
    if (selection.mode === "all" || selection.targets.length === 0) {
        return "Live system usage";
    }
    if (selection.targets.length === 1) {
        switch (selection.targets[0]) {
            case "cpu":
                return "CPU usage";
            case "ram":
                return "RAM usage";
            case "gpu":
                return "GPU usage";
            case "disk":
                return "Drive space";
            case "uptime":
                return "System uptime";
            default:
                return "Live system usage";
        }
    }
    return `${selection.targets.map((target) => resourceUsageTargetLabel(target)).join(" + ")} usage`;
};
export const formatResourceUsageMetric = (target, line) => {
    const trimmed = line.trim();
    if (!trimmed) {
        return {
            label: resourceUsageTargetLabel(target),
            value: trimmed
        };
    }
    if (target === "disk") {
        return {
            label: resourceUsageTargetLabel(target),
            value: trimmed.replace(/^Disk:\s*/i, "") || trimmed
        };
    }
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex >= 0) {
        const value = trimmed.slice(colonIndex + 1).trim();
        if (value) {
            return {
                label: resourceUsageTargetLabel(target),
                value
            };
        }
    }
    return {
        label: resourceUsageTargetLabel(target),
        value: trimmed
    };
};
export const parseResourceUsageTargets = (query) => {
    const normalizedQuery = normalizeQuery(query);
    if (!normalizedQuery) {
        return { mode: "all", targets: [] };
    }
    if (RESOURCE_USAGE_BROAD_PHRASES.some((phrase) => phraseIndex(normalizedQuery, phrase) !== null)) {
        return { mode: "all", targets: [] };
    }
    const matches = RESOURCE_USAGE_TARGETS.map((target) => {
        const indexes = RESOURCE_USAGE_PATTERNS[target]
            .map((phrase) => phraseIndex(normalizedQuery, phrase))
            .filter((value) => value !== null);
        return {
            target,
            index: indexes.length > 0 ? Math.min(...indexes) : null
        };
    })
        .filter((entry) => entry.index !== null)
        .sort((left, right) => left.index - right.index);
    if (matches.length === 0) {
        return { mode: "all", targets: [] };
    }
    return {
        mode: "focused",
        targets: matches.map((entry) => entry.target)
    };
};
export const pickResourceUsageFindings = (lines, selection) => {
    const normalizedLines = lines.map((line) => line.trim()).filter(Boolean);
    if (selection.mode === "all" || selection.targets.length === 0) {
        return normalizedLines;
    }
    const selected = selection.targets
        .map((target) => normalizedLines.find((line) => lineMatchesTarget(line, target)) ?? null)
        .filter((line) => Boolean(line));
    return selected.length > 0 ? selected : normalizedLines.slice(0, Math.max(1, selection.targets.length));
};
