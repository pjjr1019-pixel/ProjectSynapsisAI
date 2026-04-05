import fs from "node:fs";
import path from "node:path";
import { normalizeSlashes, readJsonIfExists } from "../../portable_lib/brain-build-utils.mjs";
import { PROMPT_CASES_ROOT, REPO_ROOT } from "./eval-paths.mjs";

const ALLOWED_MODES = new Set(["route", "workflow", "governed_direct"]);

function collectJsonFiles(root) {
  const files = [];
  if (!fs.existsSync(root)) return files;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJsonFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) {
      files.push(fullPath);
    }
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function normalizeTagList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((entry) => String(entry || "").trim()).filter(Boolean))];
}

function normalizeCase(input, sourceFile) {
  const id = String(input?.id || "").trim();
  if (!id) {
    throw new Error(`Prompt eval case in ${sourceFile} is missing an id.`);
  }

  const prompt = String(input?.prompt || "").trim();
  if (!prompt) {
    throw new Error(`Prompt eval case "${id}" is missing a prompt.`);
  }

  const mode = String(input?.mode || "route").trim();
  if (!ALLOWED_MODES.has(mode)) {
    throw new Error(`Prompt eval case "${id}" has unsupported mode "${mode}".`);
  }

  return {
    ...input,
    id,
    prompt,
    mode,
    repeat: Math.max(1, Number(input?.repeat) || 1),
    tags: normalizeTagList(input?.tags),
    allowVariants: input?.allowVariants === true,
    expect: input?.expect && typeof input.expect === "object" ? input.expect : {},
    sourceFile,
  };
}

function unpackCases(filePath, parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.cases)) return parsed.cases;
  if (parsed && typeof parsed === "object") return [parsed];
  throw new Error(`Unsupported prompt eval case file format: ${filePath}`);
}

export function loadPromptEvalCases({
  root = PROMPT_CASES_ROOT,
  caseIds = [],
  tags = [],
} = {}) {
  const idFilter = new Set(
    (Array.isArray(caseIds) ? caseIds : [caseIds]).map((entry) => String(entry || "").trim()).filter(Boolean)
  );
  const tagFilter = new Set(
    (Array.isArray(tags) ? tags : [tags]).map((entry) => String(entry || "").trim()).filter(Boolean)
  );

  const cases = [];
  const seenIds = new Set();

  for (const filePath of collectJsonFiles(root)) {
    const parsed = readJsonIfExists(filePath);
    const sourceFile = normalizeSlashes(path.relative(REPO_ROOT, filePath));
    for (const entry of unpackCases(filePath, parsed)) {
      const normalized = normalizeCase(entry, sourceFile);
      if (seenIds.has(normalized.id)) {
        throw new Error(`Duplicate prompt eval case id "${normalized.id}" found in ${sourceFile}.`);
      }
      seenIds.add(normalized.id);
      cases.push(normalized);
    }
  }

  return cases.filter((entry) => {
    if (idFilter.size && !idFilter.has(entry.id)) return false;
    if (tagFilter.size && !entry.tags.some((tag) => tagFilter.has(tag))) return false;
    return true;
  });
}
