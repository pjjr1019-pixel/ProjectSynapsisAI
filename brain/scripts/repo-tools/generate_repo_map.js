#!/usr/bin/env node
/**
 * generate_repo_map.js
 * Generates a complete filesystem inventory of the repository.
 *
 * Outputs:
 *   REPO_MAP_FULL.md         — Full tree in markdown (chunked if large)
 *   REPO_MAP_FULL.txt        — Full tree in plain text
 *   REPO_MAP_FULL.json       — Machine-readable nested structure
 *   REPO_FILE_MANIFEST.csv   — One row per file/folder
 *   REPO_MAP_INDEX.md        — Index of chunked markdown files
 *   repo_map_chunks/         — Per-top-level-folder markdown chunks
 *   REPO_MAP_README.md       — Explains all outputs and how to regenerate
 *
 * Usage:
 *   node taskmanager/brain/scripts/repo-tools/generate_repo_map.js
 *   (run from repo root, or from anywhere — script self-locates)
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");

// ── Config ──────────────────────────────────────────────────────────────────

// 4 levels up: repo-tools/ → scripts/ → brain/ → taskmanager/ → Horizons.AI/
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..", "..");
const CHUNKS_DIR = path.join(REPO_ROOT, "repo_map_chunks");
const TIMESTAMP = new Date().toISOString();

// Chunk markdown when a single top-level folder has more than this many nodes.
const CHUNK_LINE_THRESHOLD = 500;

// ── Helpers ──────────────────────────────────────────────────────────────────

function sortedEntries(dir) {
  try {
    return fs.readdirSync(dir).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  } catch (err) {
    return null; // unreadable
  }
}

function statSafe(fullPath) {
  try {
    return fs.statSync(fullPath);
  } catch {
    return null;
  }
}

function ext(name) {
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return "";
  return name.slice(dot);
}

// ── Core recursive walker ────────────────────────────────────────────────────

/**
 * Walk the directory tree and collect every entry.
 *
 * Returns:
 *   { tree: <JSON node>, rows: Array<{path,name,type,parent,extension,depth}>, unreadable: string[] }
 */
function walk(absPath, relPath, depth, rows, unreadable) {
  const st = statSafe(absPath);
  const name = path.basename(absPath);
  const parentRel = relPath === "" ? "" : path.dirname(relPath).replace(/\\/g, "/");

  if (!st) {
    unreadable.push(relPath || name);
    return null;
  }

  const type = st.isDirectory() ? "directory" : "file";
  const normRel = relPath.replace(/\\/g, "/");

  rows.push({
    path: normRel,
    name,
    type,
    parent: parentRel,
    extension: type === "file" ? ext(name) : "",
    depth,
  });

  if (!st.isDirectory()) {
    return { name, path: normRel, type };
  }

  const entries = sortedEntries(absPath);
  if (entries === null) {
    unreadable.push(normRel);
    return { name, path: normRel, type, children: [], _unreadable: true };
  }

  const children = [];
  for (const entry of entries) {
    const childAbs = path.join(absPath, entry);
    const childRel = relPath ? `${normRel}/${entry}` : entry;
    const child = walk(childAbs, childRel, depth + 1, rows, unreadable);
    if (child !== null) children.push(child);
  }

  return { name, path: normRel, type, children };
}

// ── Text / Markdown tree renderer ───────────────────────────────────────────

function renderTreeLines(node, prefix, isLast, lines) {
  const connector = isLast ? "└── " : "├── ";
  const label = node.type === "directory" ? node.name + "/" : node.name;
  lines.push(`${prefix}${connector}${label}`);

  if (node.children && node.children.length > 0) {
    const childPrefix = prefix + (isLast ? "    " : "│   ");
    for (let i = 0; i < node.children.length; i++) {
      renderTreeLines(node.children[i], childPrefix, i === node.children.length - 1, lines);
    }
  }
}

function nodeToLines(node) {
  const lines = [];
  // Root node itself
  lines.push(node.name + "/");
  if (node.children) {
    for (let i = 0; i < node.children.length; i++) {
      renderTreeLines(node.children[i], "", i === node.children.length - 1, lines);
    }
  }
  return lines;
}

// ── CSV helpers ──────────────────────────────────────────────────────────────

function csvEscape(val) {
  const str = String(val ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowToCsv(row) {
  return [row.path, row.name, row.type, row.parent, row.extension, row.depth]
    .map(csvEscape)
    .join(",");
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  console.log(`[repo-map] scanning ${REPO_ROOT}`);

  const rows = [];
  const unreadable = [];

  // Add root itself
  rows.push({
    path: ".",
    name: path.basename(REPO_ROOT),
    type: "directory",
    parent: "",
    extension: "",
    depth: 0,
  });

  const rootSt = statSafe(REPO_ROOT);
  const rootEntries = rootSt ? sortedEntries(REPO_ROOT) : null;
  const rootChildren = [];

  if (rootEntries === null) {
    unreadable.push(".");
  } else {
    for (const entry of rootEntries) {
      const childAbs = path.join(REPO_ROOT, entry);
      const child = walk(childAbs, entry, 1, rows, unreadable);
      if (child !== null) rootChildren.push(child);
    }
  }

  const rootNode = {
    name: path.basename(REPO_ROOT),
    path: ".",
    type: "directory",
    children: rootChildren,
  };

  const totalFolders = rows.filter((r) => r.type === "directory").length;
  const totalFiles = rows.filter((r) => r.type === "file").length;

  console.log(`[repo-map] found ${totalFiles} files, ${totalFolders} folders, ${unreadable.length} unreadable`);

  // ── Ensure chunks dir ──────────────────────────────────────────────────────
  if (!fs.existsSync(CHUNKS_DIR)) fs.mkdirSync(CHUNKS_DIR, { recursive: true });

  // ── REPO_MAP_FULL.json ────────────────────────────────────────────────────
  console.log("[repo-map] writing REPO_MAP_FULL.json ...");
  fs.writeFileSync(
    path.join(REPO_ROOT, "REPO_MAP_FULL.json"),
    JSON.stringify(rootNode, null, 2),
    "utf8"
  );

  // ── REPO_FILE_MANIFEST.csv ────────────────────────────────────────────────
  console.log("[repo-map] writing REPO_FILE_MANIFEST.csv ...");
  const csvHeader = "path,name,type,parent,extension,depth";
  const csvLines = [csvHeader, ...rows.map(rowToCsv)];
  fs.writeFileSync(path.join(REPO_ROOT, "REPO_FILE_MANIFEST.csv"), csvLines.join("\n"), "utf8");

  // ── Build tree lines and decide chunking ──────────────────────────────────
  console.log("[repo-map] rendering tree ...");
  const allTreeLines = nodeToLines(rootNode);

  // Determine if we need chunks (more than CHUNK_LINE_THRESHOLD lines in any top-level child)
  const chunkMap = {}; // topLevelName → lines[]
  let needsChunks = false;

  for (const child of rootChildren) {
    const childLines = [];
    if (child.type === "directory") {
      childLines.push(`${child.name}/`);
      if (child.children) {
        for (let i = 0; i < child.children.length; i++) {
          renderTreeLines(child.children[i], "", i === child.children.length - 1, childLines);
        }
      }
    } else {
      childLines.push(child.name);
    }
    chunkMap[child.name] = childLines;
    if (childLines.length > CHUNK_LINE_THRESHOLD) needsChunks = true;
  }

  if (allTreeLines.length > 5000) needsChunks = true;

  // ── REPO_MAP_FULL.txt ─────────────────────────────────────────────────────
  console.log("[repo-map] writing REPO_MAP_FULL.txt ...");
  fs.writeFileSync(path.join(REPO_ROOT, "REPO_MAP_FULL.txt"), allTreeLines.join("\n"), "utf8");

  // ── REPO_MAP_FULL.md ──────────────────────────────────────────────────────
  console.log("[repo-map] writing REPO_MAP_FULL.md ...");
  const mdHeader = [
    "# Repo Map — Full Tree",
    "",
    `| Field | Value |`,
    `|---|---|`,
    `| Generated | ${TIMESTAMP} |`,
    `| Repo root | ${REPO_ROOT} |`,
    `| Total folders | ${totalFolders} |`,
    `| Total files | ${totalFiles} |`,
    `| Unreadable paths | ${unreadable.length} |`,
    "",
  ];

  if (needsChunks) {
    mdHeader.push(
      "> **Note:** This repo is large. The tree below is the full flat listing.",
      "> Per-folder chunks are in `repo_map_chunks/`. See `REPO_MAP_INDEX.md` for links.",
      ""
    );
  }

  if (unreadable.length > 0) {
    mdHeader.push("## Unreadable Paths", "");
    for (const p of unreadable) mdHeader.push(`- \`${p}\``);
    mdHeader.push("");
  }

  mdHeader.push("## Full Tree", "", "```");
  const mdFooter = ["```", ""];

  const mdContent = [...mdHeader, ...allTreeLines, ...mdFooter].join("\n");
  fs.writeFileSync(path.join(REPO_ROOT, "REPO_MAP_FULL.md"), mdContent, "utf8");

  // ── Chunk files ───────────────────────────────────────────────────────────
  if (needsChunks) {
    console.log("[repo-map] writing chunk files ...");
    const chunkFiles = [];

    for (const [name, lines] of Object.entries(chunkMap).sort()) {
      const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const chunkFile = `chunk-${safeName}.md`;
      const chunkPath = path.join(CHUNKS_DIR, chunkFile);

      const childNode = rootChildren.find((c) => c.name === name);
      const childRows = rows.filter((r) => r.path === name || r.path.startsWith(`${name}/`));
      const childFiles = childRows.filter((r) => r.type === "file").length;
      const childFolders = childRows.filter((r) => r.type === "directory").length;

      const content = [
        `# Repo Map — ${name}/`,
        "",
        `| Field | Value |`,
        `|---|---|`,
        `| Generated | ${TIMESTAMP} |`,
        `| Folder | \`${name}/\` |`,
        `| Files | ${childFiles} |`,
        `| Folders | ${childFolders} |`,
        "",
        "## Tree",
        "",
        "```",
        ...lines,
        "```",
        "",
      ].join("\n");

      fs.writeFileSync(chunkPath, content, "utf8");
      chunkFiles.push({ name, file: chunkFile, files: childFiles, folders: childFolders });
    }

    // ── REPO_MAP_INDEX.md ──────────────────────────────────────────────────
    console.log("[repo-map] writing REPO_MAP_INDEX.md ...");
    const indexLines = [
      "# Repo Map Index",
      "",
      `Generated: ${TIMESTAMP}`,
      "",
      `**Repo root:** \`${REPO_ROOT}\``,
      `**Total files:** ${totalFiles}`,
      `**Total folders:** ${totalFolders}`,
      `**Unreadable:** ${unreadable.length}`,
      "",
      "## Top-Level Chunks",
      "",
      "| Folder | Files | Folders | Chunk |",
      "|---|---|---|---|",
    ];

    for (const c of chunkFiles) {
      indexLines.push(`| \`${c.name}/\` | ${c.files} | ${c.folders} | [${c.file}](repo_map_chunks/${c.file}) |`);
    }

    indexLines.push(
      "",
      "## Full Outputs",
      "",
      "| File | Description |",
      "|---|---|",
      "| [REPO_MAP_FULL.md](REPO_MAP_FULL.md) | Full tree in markdown |",
      "| [REPO_MAP_FULL.txt](REPO_MAP_FULL.txt) | Full tree in plain text |",
      "| [REPO_MAP_FULL.json](REPO_MAP_FULL.json) | Machine-readable nested JSON |",
      "| [REPO_FILE_MANIFEST.csv](REPO_FILE_MANIFEST.csv) | One row per file/folder |",
      ""
    );

    if (unreadable.length > 0) {
      indexLines.push("## Unreadable Paths", "");
      for (const p of unreadable) indexLines.push(`- \`${p}\``);
      indexLines.push("");
    }

    fs.writeFileSync(path.join(REPO_ROOT, "REPO_MAP_INDEX.md"), indexLines.join("\n"), "utf8");
  }

  // ── REPO_MAP_README.md ────────────────────────────────────────────────────
  console.log("[repo-map] writing REPO_MAP_README.md ...");
  const readmeContent = `# Repo Map System

## What Was Generated

A complete filesystem inventory of the repository was generated on ${TIMESTAMP}.

| Output | Description |
|---|---|
| \`REPO_MAP_FULL.md\` | Full directory tree in Markdown with metadata header |
| \`REPO_MAP_FULL.txt\` | Full directory tree in plain text (no Markdown) |
| \`REPO_MAP_FULL.json\` | Machine-readable nested JSON tree — every node has \`name\`, \`path\`, \`type\`, \`children\` |
| \`REPO_FILE_MANIFEST.csv\` | One row per file/folder: \`path, name, type, parent, extension, depth\` |
| \`REPO_MAP_INDEX.md\` | Index page linking per-folder chunk files |
| \`repo_map_chunks/\` | Per-top-level-folder Markdown tree files (generated when tree is large) |
| \`REPO_MAP_README.md\` | This file |

### Stats at Last Generation

- Repo root: \`${REPO_ROOT}\`
- Total folders: **${totalFolders}**
- Total files: **${totalFiles}**
- Unreadable paths: **${unreadable.length}**

## How to Regenerate

Run from the repo root:

\`\`\`bash
node scripts/generate_repo_map.js
\`\`\`

The script:
- Automatically locates the repo root (parent of \`scripts/\`)
- Scans all files and folders recursively (including hidden, node_modules, dist, brain, etc.)
- Alphabetizes entries within each folder
- Handles permission errors gracefully (records unreadable paths, does not crash)
- Overwrites all previous output files
- Produces deterministic output

## Output File Details

### REPO_MAP_FULL.md

Markdown file with a metadata table at the top followed by the full ASCII tree in a code block.
When the tree exceeds ~5,000 lines or any top-level folder exceeds ~500 lines, a note references
the chunk files for easier navigation.

### REPO_MAP_FULL.txt

Same content as the tree section of REPO_MAP_FULL.md but with no Markdown syntax.
Useful for piping into other tools or viewing in non-Markdown editors.

### REPO_MAP_FULL.json

Nested JSON structure. Each node:
\`\`\`json
{
  "name": "filename.ext",
  "path": "relative/path/from/repo/root",
  "type": "file" | "directory",
  "children": [ ... ]  // only present for directories
}
\`\`\`

### REPO_FILE_MANIFEST.csv

Flat CSV with columns:
\`\`\`
path, name, type, parent, extension, depth
\`\`\`

- \`path\` — relative path from repo root (forward slashes)
- \`name\` — filename or directory name only
- \`type\` — \`file\` or \`directory\`
- \`parent\` — relative path of containing directory
- \`extension\` — file extension including dot (empty for directories)
- \`depth\` — 0 = repo root, 1 = top-level entries, etc.

Useful for filtering with tools like Excel, DuckDB, jq, or any CSV reader.

### REPO_MAP_INDEX.md

Index listing all chunk files with file/folder counts per top-level directory.
Generated only when the full tree is large enough to warrant chunking.

### repo_map_chunks/

One Markdown file per top-level directory, e.g. \`chunk-taskmanager.md\`.
Each chunk contains only that folder's subtree.

## Design Notes

- The script includes every folder and file without omission.
- \`node_modules/\`, \`dist/\`, \`brain/\`, \`.runtime/\` are all included.
- Output is always regenerated from scratch (no caching).
- Paths use forward slashes regardless of OS.
- The script is pure Node.js with no dependencies beyond the standard library.
`;

  fs.writeFileSync(path.join(REPO_ROOT, "REPO_MAP_README.md"), readmeContent, "utf8");

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n[repo-map] DONE");
  console.log(`  Repo root    : ${REPO_ROOT}`);
  console.log(`  Total files  : ${totalFiles}`);
  console.log(`  Total folders: ${totalFolders}`);
  console.log(`  Unreadable   : ${unreadable.length}`);
  console.log(`  Chunked      : ${needsChunks}`);
  console.log("");
  console.log("  Outputs:");
  console.log(`    REPO_MAP_FULL.md`);
  console.log(`    REPO_MAP_FULL.txt`);
  console.log(`    REPO_MAP_FULL.json`);
  console.log(`    REPO_FILE_MANIFEST.csv`);
  if (needsChunks) console.log(`    REPO_MAP_INDEX.md`);
  if (needsChunks) console.log(`    repo_map_chunks/ (${Object.keys(chunkMap).length} chunks)`);
  console.log(`    REPO_MAP_README.md`);

  if (unreadable.length > 0) {
    console.log("\n  Unreadable paths:");
    for (const p of unreadable) console.log(`    ${p}`);
  }
}

main();
