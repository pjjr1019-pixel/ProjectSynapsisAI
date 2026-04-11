import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
let envLoaded = false;
const candidateDirectories = () => {
    const cwd = process.cwd();
    const directories = [cwd];
    if (path.basename(cwd).toLowerCase() !== "synai") {
        directories.push(path.join(cwd, "SynAI"));
    }
    return [...new Set(directories)];
};
const parseEnvValue = (value) => {
    const trimmed = value.trim();
    if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        return trimmed.slice(1, -1);
    }
    return trimmed;
};
const applyEnvFile = (filePath) => {
    const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) {
            continue;
        }
        const normalized = line.startsWith("export ") ? line.slice(7) : line;
        const equalsIndex = normalized.indexOf("=");
        if (equalsIndex <= 0) {
            continue;
        }
        const key = normalized.slice(0, equalsIndex).trim();
        if (!key || process.env[key] !== undefined) {
            continue;
        }
        const value = normalized.slice(equalsIndex + 1);
        process.env[key] = parseEnvValue(value);
    }
};
export const ensureLocalEnvLoaded = () => {
    if (envLoaded) {
        return;
    }
    envLoaded = true;
    for (const directory of candidateDirectories()) {
        for (const fileName of [".env", ".env.local"]) {
            const filePath = path.join(directory, fileName);
            if (existsSync(filePath)) {
                applyEnvFile(filePath);
            }
        }
    }
};
