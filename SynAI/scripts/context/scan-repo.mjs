import { createHash } from "node:crypto";
import {
  mkdir,
  readdir,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(SCRIPT_PATH);
const DEFAULT_SYNAI_ROOT = path.resolve(SCRIPT_DIR, "..", "..");
const DEFAULT_REPO_ROOT = path.resolve(DEFAULT_SYNAI_ROOT, "..");
const DEFAULT_ARTIFACTS_DIR = path.join(DEFAULT_SYNAI_ROOT, "artifacts");
const SECONDARY_ROOT_FOLDERS = ["context", "docs", "scripts", "specs", "src", "tests"];
const HASH_ALGORITHM = "sha256";
const PARSEABLE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mts",
  ".cts",
  ".mjs",
  ".cjs",
]);
const ROOT_LEVEL_SKIP_NAMES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".cache",
  ".turbo",
  ".next",
  ".vite",
  ".yarn",
]);
const SYNAI_SKIP_NAMES = new Set([
  ...ROOT_LEVEL_SKIP_NAMES,
  ".runtime",
  "artifacts",
  "context",
  "out",
]);
const CONFIG_PATTERNS = [
  {
    type: "package-manifest",
    test: (name) => name === "package.json",
  },
  {
    type: "tsconfig",
    test: (name) => /^tsconfig(\..+)?\.json$/i.test(name),
  },
  {
    type: "vite",
    test: (name) => /^vite\.config\.(ts|js|mjs|cjs|mts|cts)$/i.test(name),
  },
  {
    type: "electron-vite",
    test: (name) => /^electron\.vite\.config\.(ts|js|mjs|cjs|mts|cts)$/i.test(name),
  },
  {
    type: "tailwind",
    test: (name) => /^tailwind\.config\.(ts|js|mjs|cjs|mts|cts)$/i.test(name),
  },
  {
    type: "postcss",
    test: (name) => /^postcss\.config\.(ts|js|mjs|cjs|mts|cts)$/i.test(name),
  },
  {
    type: "jest",
    test: (name) => /^jest(\..+)?\.config\.(ts|js|mjs|cjs|mts|cts)$/i.test(name) || /^jest\..+\.cjs$/i.test(name),
  },
  {
    type: "vitest",
    test: (name) => /^vitest\.config\.(ts|js|mjs|cjs|mts|cts)$/i.test(name),
  },
  {
    type: "env-example",
    test: (name) => /^\.env(\.[^.]+)?\.example$/i.test(name),
  },
];

const toPosixPath = (value) => value.split(path.sep).join("/");

const repoRelativePath = (repoRoot, absolutePath) =>
  toPosixPath(path.relative(repoRoot, absolutePath));

const stableJson = (value) =>
  JSON.stringify(value, (_key, current) => {
    if (current && typeof current === "object" && !Array.isArray(current)) {
      return Object.keys(current)
        .sort()
        .reduce((accumulator, key) => {
          accumulator[key] = current[key];
          return accumulator;
        }, {});
    }
    return current;
  }, 2) + "\n";

const hashText = (value) => createHash(HASH_ALGORITHM).update(value).digest("hex");

const confidenceFromDiagnostics = (diagnosticCount) => {
  if (diagnosticCount === 0) {
    return "high";
  }
  if (diagnosticCount <= 4) {
    return "medium";
  }
  return "low";
};

const resolveScriptKind = (extension) => {
  switch (extension) {
    case ".ts":
      return ts.ScriptKind.TS;
    case ".tsx":
      return ts.ScriptKind.TSX;
    case ".js":
      return ts.ScriptKind.JS;
    case ".jsx":
      return ts.ScriptKind.JSX;
    case ".mts":
      return ts.ScriptKind.TS;
    case ".cts":
      return ts.ScriptKind.TS;
    case ".mjs":
      return ts.ScriptKind.JS;
    case ".cjs":
      return ts.ScriptKind.JS;
    default:
      return ts.ScriptKind.Unknown;
  }
};

const maybeReadJson = async (absolutePath) => {
  try {
    const content = await readFile(absolutePath, "utf8");
    return JSON.parse(content);
  } catch {
    return null;
  }
};

const shouldSkipDirectory = (absolutePath, name, area, synaiRoot) => {
  const normalizedName = name.toLowerCase();
  if (area === "primary-synai" && SYNAI_SKIP_NAMES.has(normalizedName)) {
    return true;
  }
  if (area === "secondary-root" && ROOT_LEVEL_SKIP_NAMES.has(normalizedName)) {
    return true;
  }

  const relativeToSynai = repoRelativePath(synaiRoot, absolutePath);
  return (
    relativeToSynai === ".runtime" ||
    relativeToSynai.startsWith(".runtime/") ||
    relativeToSynai === "artifacts" ||
    relativeToSynai.startsWith("artifacts/") ||
    relativeToSynai === "context" ||
    relativeToSynai.startsWith("context/") ||
    relativeToSynai === "out" ||
    relativeToSynai.startsWith("out/")
  );
};

const extractImportsAndExports = async (absolutePath, repoRoot) => {
  const extension = path.extname(absolutePath).toLowerCase();
  const result = {
    path: repoRelativePath(repoRoot, absolutePath),
    parseConfidence: "not-applicable",
    parser: "typescript-ast",
    imports: [],
    exports: [],
    errors: [],
  };

  if (!PARSEABLE_EXTENSIONS.has(extension)) {
    return result;
  }

  try {
    const content = await readFile(absolutePath, "utf8");
    const sourceFile = ts.createSourceFile(
      absolutePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      resolveScriptKind(extension),
    );
    result.parseConfidence = confidenceFromDiagnostics(sourceFile.parseDiagnostics.length);
    if (sourceFile.parseDiagnostics.length > 0) {
      result.errors = sourceFile.parseDiagnostics.map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
      );
    }

    const pushImport = (entry) => {
      result.imports.push(entry);
    };
    const pushExport = (entry) => {
      result.exports.push(entry);
    };

    const visit = (node) => {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const clause = node.importClause;
        const specifiers = [];
        if (clause?.name) {
          specifiers.push({ name: clause.name.text, kind: "default" });
        }
        if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
          for (const element of clause.namedBindings.elements) {
            specifiers.push({
              name: element.name.text,
              kind: "named",
              propertyName: element.propertyName?.text ?? null,
            });
          }
        }
        if (clause?.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
          specifiers.push({
            name: clause.namedBindings.name.text,
            kind: "namespace",
          });
        }
        pushImport({
          source: node.moduleSpecifier.text,
          kind: "static-import",
          isTypeOnly: Boolean(clause?.isTypeOnly),
          specifiers,
        });
      }

      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        node.arguments.length === 1 &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        pushImport({
          source: node.arguments[0].text,
          kind: "dynamic-import",
          isTypeOnly: false,
          specifiers: [],
        });
      }

      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "require" &&
        node.arguments.length === 1 &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        pushImport({
          source: node.arguments[0].text,
          kind: "require",
          isTypeOnly: false,
          specifiers: [],
        });
      }

      if (ts.isExportDeclaration(node)) {
        const source = node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)
          ? node.moduleSpecifier.text
          : null;
        const specifiers =
          node.exportClause && ts.isNamedExports(node.exportClause)
            ? node.exportClause.elements.map((element) => ({
                name: element.name.text,
                propertyName: element.propertyName?.text ?? null,
              }))
            : [];
        pushExport({
          kind: source ? "re-export" : "named-export",
          source,
          isTypeOnly: Boolean(node.isTypeOnly),
          specifiers,
          star: !node.exportClause,
        });
      }

      if (ts.isExportAssignment(node)) {
        pushExport({
          kind: "default-export",
          source: null,
          isTypeOnly: false,
          specifiers: [],
          star: false,
        });
      }

      if (
        (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0 &&
        ("name" in node || ts.isVariableStatement(node))
      ) {
        if (ts.isVariableStatement(node)) {
          const specifiers = node.declarationList.declarations
            .filter((declaration) => ts.isIdentifier(declaration.name))
            .map((declaration) => ({
              name: declaration.name.text,
              propertyName: null,
            }));
          if (specifiers.length > 0) {
            pushExport({
              kind: "named-export",
              source: null,
              isTypeOnly: false,
              specifiers,
              star: false,
            });
          }
        } else if ("name" in node && node.name && ts.isIdentifier(node.name)) {
          pushExport({
            kind: "named-export",
            source: null,
            isTypeOnly: false,
            specifiers: [{ name: node.name.text, propertyName: null }],
            star: false,
          });
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    result.imports.sort((left, right) =>
      `${left.kind}:${left.source}`.localeCompare(`${right.kind}:${right.source}`),
    );
    result.exports.sort((left, right) =>
      `${left.kind}:${left.source ?? ""}:${left.specifiers.map((entry) => entry.name).join(",")}`.localeCompare(
        `${right.kind}:${right.source ?? ""}:${right.specifiers.map((entry) => entry.name).join(",")}`,
      ),
    );
    return result;
  } catch (error) {
    return {
      ...result,
      parseConfidence: "low",
      imports: [],
      exports: [],
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
};

const classifyConfigSurface = (name) => {
  const match = CONFIG_PATTERNS.find((entry) => entry.test(name));
  return match?.type ?? null;
};

const determineCanonicalCandidate = (members, context = {}) => {
  const sortedMembers = [...members].sort();
  const tsCandidate = sortedMembers.find((entry) => /\.(ts|mts|cts)$/i.test(entry));
  const jsCandidate = sortedMembers.find((entry) => /\.(js|mjs|cjs)$/i.test(entry));
  const selected = tsCandidate ?? sortedMembers[0] ?? null;
  const evidence = [];

  if (tsCandidate && jsCandidate) {
    evidence.push("paired TypeScript and JavaScript variants detected");
  }
  if (context.isConfigPair && tsCandidate) {
    evidence.push("TypeScript config is referenced by tsconfig/package surfaces");
  }
  if (context.isSourceMirror && tsCandidate) {
    evidence.push("TypeScript source is treated as canonical and JavaScript looks mirrored");
  }

  let confidence = 0.62;
  if (context.isConfigPair && tsCandidate) {
    confidence = 0.9;
  } else if (context.isSourceMirror && tsCandidate) {
    confidence = 0.75;
  } else if (selected) {
    confidence = 0.66;
  }

  return {
    canonicalCandidate: selected,
    confidence,
    evidence,
  };
};

const collectPackageBoundaries = async ({
  repoRoot,
  synaiRoot,
  repoTree,
  configSurfaces,
}) => {
  const boundaries = [];
  const seen = new Set();
  const pushBoundary = (entry) => {
    if (seen.has(entry.root)) {
      return;
    }
    seen.add(entry.root);
    boundaries.push(entry);
  };

  pushBoundary({
    root: ".",
    area: "secondary-root",
    boundaryType: "repository-shell",
    packageName: "repository-shell",
    markers: ["README.md", "SynAI/"],
    summary: "Bootstrap shell only; primary product code lives under SynAI/.",
  });

  const packageFiles = repoTree.filter((entry) => entry.kind === "file" && path.posix.basename(entry.path) === "package.json");
  for (const packageFile of packageFiles) {
    const absolutePath = path.join(repoRoot, packageFile.path);
    const parsed = await maybeReadJson(absolutePath);
    const packageRoot = path.posix.dirname(packageFile.path);
    pushBoundary({
      root: packageRoot,
      area: packageFile.area,
      boundaryType: packageRoot === "SynAI" ? "primary-package-root" : "package-json-boundary",
      packageName: parsed?.name ?? path.posix.basename(packageRoot),
      markers: [packageFile.path],
      summary:
        packageRoot === "SynAI"
          ? "Canonical app/package root for SynAI."
          : `Package boundary inferred from ${packageFile.path}.`,
    });
  }

  const desktopConfig = configSurfaces.find((entry) => entry.path === "SynAI/electron.vite.config.ts")
    ?? configSurfaces.find((entry) => entry.path === "SynAI/electron.vite.config.js");
  if (desktopConfig) {
    pushBoundary({
      root: "SynAI/apps/desktop",
      area: "primary-synai",
      boundaryType: "config-defined-app",
      packageName: "desktop-app",
      markers: [desktopConfig.path, "SynAI/apps/desktop/index.html"],
      summary: "Electron/Vite desktop app boundary inferred from renderer/main/preload config.",
    });
  }

  const packageDirectories = repoTree
    .filter(
      (entry) =>
        entry.kind === "dir" &&
        entry.path.startsWith("SynAI/packages/") &&
        entry.path.split("/").length === 3,
    )
    .map((entry) => entry.path)
    .sort();
  for (const packageDirectory of packageDirectories) {
    pushBoundary({
      root: packageDirectory,
      area: "primary-synai",
      boundaryType: "workspace-package",
      packageName: path.posix.basename(packageDirectory),
      markers: [`${packageDirectory}/src`, `${packageDirectory}/tests`],
      summary: `Workspace package directory for ${path.posix.basename(packageDirectory)}.`,
    });
  }

  return boundaries.sort((left, right) => left.root.localeCompare(right.root));
};

const collectDuplicateCandidates = ({
  repoTree,
}) => {
  const fileEntries = repoTree.filter((entry) => entry.kind === "file");
  const groupedByBasename = new Map();

  for (const entry of fileEntries) {
    const extension = path.posix.extname(entry.path).toLowerCase();
    if (!extension) {
      continue;
    }
    const directory = path.posix.dirname(entry.path);
    const basename = path.posix.basename(entry.path, extension);
    const key = `${directory}::${basename}`;
    if (!groupedByBasename.has(key)) {
      groupedByBasename.set(key, []);
    }
    groupedByBasename.get(key).push(entry.path);
  }

  const candidates = [];

  for (const [key, members] of groupedByBasename.entries()) {
    if (members.length < 2) {
      continue;
    }

    const [directory, basename] = key.split("::");
    const isConfigPair = members.some((member) =>
      classifyConfigSurface(path.posix.basename(member)) !== null,
    );
    const isSourceMirror =
      members.some((member) => /\.(ts|tsx|mts|cts)$/i.test(member)) &&
      members.some((member) => /\.(js|jsx|mjs|cjs)$/i.test(member));
    const canonical = determineCanonicalCandidate(members, { isConfigPair, isSourceMirror });

    candidates.push({
      id: `dup-${hashText(`${directory}:${basename}`).slice(0, 12)}`,
      directory,
      basename,
      members: [...members].sort(),
      category: isConfigPair ? "config-pair" : "same-basename",
      canonicalCandidate: canonical.canonicalCandidate,
      alternates: canonical.canonicalCandidate
        ? members.filter((member) => member !== canonical.canonicalCandidate).sort()
        : [...members].sort(),
      reason: isConfigPair
        ? "Overlapping config surfaces detected in the same directory."
        : isSourceMirror
          ? "TypeScript/JavaScript same-basename mirror detected."
          : "Same-basename overlap detected.",
      confidence: canonical.confidence,
      evidence: canonical.evidence,
      action: "document-only",
    });
  }

  return candidates.sort((left, right) => left.id.localeCompare(right.id));
};

const collectConfigSurfaces = async ({ repoRoot, repoTree, duplicateCandidates }) => {
  const entries = [];
  const duplicateMap = new Map();
  for (const candidate of duplicateCandidates) {
    for (const member of candidate.members) {
      duplicateMap.set(member, candidate);
    }
  }

  for (const fileEntry of repoTree.filter((entry) => entry.kind === "file")) {
    const configType = classifyConfigSurface(path.posix.basename(fileEntry.path));
    if (!configType) {
      continue;
    }
    const duplicate = duplicateMap.get(fileEntry.path) ?? null;
    const isCanonical = duplicate?.canonicalCandidate === fileEntry.path || !duplicate;
    const parsedPackage =
      configType === "package-manifest"
        ? await maybeReadJson(path.join(repoRoot, fileEntry.path))
        : null;

    entries.push({
      path: fileEntry.path,
      area: fileEntry.area,
      type: configType,
      canonicalCandidate: duplicate?.canonicalCandidate ?? fileEntry.path,
      isCanonical,
      pairedWith: duplicate ? duplicate.members.filter((member) => member !== fileEntry.path).sort() : [],
      confidence: duplicate?.confidence ?? 0.9,
      reason:
        duplicate?.reason ??
        (configType === "package-manifest"
          ? "Package manifest detected."
          : `Recognized ${configType} surface.`),
      metadata:
        configType === "package-manifest"
          ? {
              packageName: parsedPackage?.name ?? null,
              private: parsedPackage?.private ?? null,
            }
          : {},
    });
  }

  return entries.sort((left, right) => left.path.localeCompare(right.path));
};

const walkTree = async ({
  repoRoot,
  synaiRoot,
  startAbsolutePath,
  area,
  entries,
}) => {
  const directoryEntries = await readdir(startAbsolutePath, { withFileTypes: true });
  const sorted = [...directoryEntries].sort((left, right) => left.name.localeCompare(right.name));
  const relativeDirectoryPath = repoRelativePath(repoRoot, startAbsolutePath);
  entries.push({
    path: relativeDirectoryPath,
    kind: "dir",
    size: 0,
    extension: null,
    area,
  });

  for (const directoryEntry of sorted) {
    const absolutePath = path.join(startAbsolutePath, directoryEntry.name);
    if (directoryEntry.isDirectory()) {
      if (shouldSkipDirectory(absolutePath, directoryEntry.name, area, synaiRoot)) {
        continue;
      }
      await walkTree({
        repoRoot,
        synaiRoot,
        startAbsolutePath: absolutePath,
        area,
        entries,
      });
      continue;
    }

    if (!directoryEntry.isFile()) {
      continue;
    }

    const fileStat = await stat(absolutePath);
    const extension = path.extname(directoryEntry.name).toLowerCase() || null;
    entries.push({
      path: repoRelativePath(repoRoot, absolutePath),
      kind: "file",
      size: fileStat.size,
      extension,
      area,
    });
  }
};

export const scanRepository = async (options = {}) => {
  const synaiRoot = path.resolve(options.synaiRoot ?? DEFAULT_SYNAI_ROOT);
  const repoRoot = path.resolve(options.repoRoot ?? DEFAULT_REPO_ROOT);
  const artifactsDir = path.resolve(options.artifactsDir ?? path.join(synaiRoot, "artifacts"));
  const includeSecondaryRoot = options.includeSecondaryRoot !== false;

  const repoTree = [];
  await walkTree({
    repoRoot,
    synaiRoot,
    startAbsolutePath: synaiRoot,
    area: "primary-synai",
    entries: repoTree,
  });

  if (includeSecondaryRoot) {
    for (const secondaryFolder of SECONDARY_ROOT_FOLDERS) {
      const absoluteSecondaryPath = path.join(repoRoot, secondaryFolder);
      if (absoluteSecondaryPath === synaiRoot) {
        continue;
      }
      try {
        const secondaryStat = await stat(absoluteSecondaryPath);
        if (!secondaryStat.isDirectory()) {
          continue;
        }
        await walkTree({
          repoRoot,
          synaiRoot,
          startAbsolutePath: absoluteSecondaryPath,
          area: "secondary-root",
          entries: repoTree,
        });
      } catch {
        // Secondary folders are optional.
      }
    }
  }

  repoTree.sort((left, right) => {
    if (left.path === right.path) {
      return left.kind.localeCompare(right.kind);
    }
    return left.path.localeCompare(right.path);
  });

  const fileHashes = [];
  const importEntries = [];
  const exportEntries = [];

  for (const entry of repoTree.filter((item) => item.kind === "file")) {
    const absolutePath = path.join(repoRoot, entry.path);
    const fileStat = await stat(absolutePath);
    const content = await readFile(absolutePath);
    fileHashes.push({
      path: entry.path,
      sha256: createHash(HASH_ALGORITHM).update(content).digest("hex"),
      mtime: fileStat.mtime.toISOString(),
    });

    const parseResult = await extractImportsAndExports(absolutePath, repoRoot);
    importEntries.push({
      path: parseResult.path,
      parseConfidence: parseResult.parseConfidence,
      parser: parseResult.parser,
      imports: parseResult.imports,
      errors: parseResult.errors,
    });
    exportEntries.push({
      path: parseResult.path,
      parseConfidence: parseResult.parseConfidence,
      parser: parseResult.parser,
      exports: parseResult.exports,
      errors: parseResult.errors,
    });
  }

  const duplicateCandidates = collectDuplicateCandidates({
    repoTree,
  });
  const configSurfaces = await collectConfigSurfaces({
    repoRoot,
    repoTree,
    duplicateCandidates,
  });
  const packageBoundaries = await collectPackageBoundaries({
    repoRoot,
    synaiRoot,
    repoTree,
    configSurfaces,
  });

  const artifacts = {
    "repo-tree.json": repoTree,
    "file-hashes.json": fileHashes.sort((left, right) => left.path.localeCompare(right.path)),
    "imports.json": importEntries.sort((left, right) => left.path.localeCompare(right.path)),
    "exports.json": exportEntries.sort((left, right) => left.path.localeCompare(right.path)),
    "config-surfaces.json": configSurfaces,
    "package-boundaries.json": packageBoundaries,
    "duplicate-candidates.json": duplicateCandidates,
  };

  if (options.writeArtifacts !== false) {
    await mkdir(artifactsDir, { recursive: true });
    for (const [fileName, payload] of Object.entries(artifacts)) {
      await writeFile(path.join(artifactsDir, fileName), stableJson(payload), "utf8");
    }
  }

  return {
    repoRoot,
    synaiRoot,
    artifactsDir,
    artifacts,
  };
};

const runCli = async () => {
  const result = await scanRepository();
  const summary = Object.entries(result.artifacts).map(([fileName, payload]) => ({
    fileName,
    entries: Array.isArray(payload) ? payload.length : 1,
    sha256: hashText(stableJson(payload)),
  }));
  process.stdout.write(`${stableJson(summary)}`);
};

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH;

if (isDirectRun) {
  runCli().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
