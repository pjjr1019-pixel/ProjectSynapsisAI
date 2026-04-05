import fs from "node:fs";
import path from "node:path";
import {
  ensureDir,
  sha256File,
  sha256Text,
  stableStringify,
  writeJsonStable,
} from "./brain-build-utils.mjs";
import {
  WEBSTER_1913_CORPUS_ID,
  WEBSTER_1913_PROJECT_URL,
  WEBSTER_1913_SOURCE_URL,
  WEBSTER_1913_TITLE,
  compactDictionaryTerm,
  dictionaryLookupKeys,
  ensureWebster1913Layout,
  entryShardNameForTerm,
  getWebster1913Paths,
  normalizeDictionaryTerm,
  readJsonlFile,
  relFromBrain,
  slugifyDictionaryTerm,
} from "./brain-dictionary-common.mjs";
import { tokenizeForRetrieval } from "./brain-text-tokens.mjs";

const PROJECT_GUTENBERG_START = "*** START OF THE PROJECT GUTENBERG EBOOK";
const PROJECT_GUTENBERG_END = "*** END OF THE PROJECT GUTENBERG EBOOK";
const PARTS_OF_SPEECH = [
  "v. t.",
  "v. i.",
  "v. i. & t.",
  "v. t. & i.",
  "v.",
  "n.",
  "a.",
  "adj.",
  "adv.",
  "prep.",
  "pron.",
  "conj.",
  "interj.",
];

function collapseWhitespace(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function trimDefinitionNoise(value) {
  return collapseWhitespace(
    String(value ?? "")
      .replace(/^\[[^\]]+\]\s*/g, "")
      .replace(/\s+--\s+/g, " -- ")
  );
}

function normalizeVariantLabel(value) {
  return collapseWhitespace(String(value ?? "").replace(/\s*;\s*/g, "; "));
}

function toSentencePreview(value, limit = 220) {
  const text = collapseWhitespace(value);
  if (!text) return "";
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const sentenceBoundary = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("; "));
  if (sentenceBoundary >= Math.floor(limit * 0.55)) {
    return cut.slice(0, sentenceBoundary + 1).trim();
  }
  return `${cut.trim()}...`;
}

function isHeadwordLine(lines, index) {
  const line = String(lines[index] ?? "").trim();
  if (!line || line.length > 96) return false;
  if (!/[A-Z]/.test(line)) return false;
  if (/[a-z]/.test(line)) return false;
  if (/^(Defn:|Etym:|Note:|Syn\.|Specif\.|[0-9]+\.)/.test(line)) return false;
  if (!/^[A-Z0-9][A-Z0-9 .,';:()\/&-]*$/.test(line)) return false;
  let lookahead = index + 1;
  while (lookahead < lines.length) {
    const next = String(lines[lookahead] ?? "").trim();
    if (!next) {
      lookahead += 1;
      continue;
    }
    if (!/[a-z]/.test(next) && /^[A-Z0-9 .,';:()\/&-]+$/.test(next)) return false;
    return true;
  }
  return false;
}

function extractProjectGutenbergBody(text) {
  const start = text.indexOf(PROJECT_GUTENBERG_START);
  const end = text.indexOf(PROJECT_GUTENBERG_END);
  const sliced =
    start >= 0
      ? text.slice(text.indexOf("\n", start) + 1, end >= 0 ? end : undefined)
      : text;
  return sliced.replace(/\r\n/g, "\n");
}

function splitHeadwordVariants(line) {
  const segments = String(line ?? "")
    .split(/\s*;\s*/)
    .flatMap((segment) => segment.split(/\s+\bOR\b\s+/i))
    .map(normalizeVariantLabel)
    .filter(Boolean);
  return [...new Set(segments)];
}

function extractPartOfSpeech(introText) {
  const haystack = ` ${String(introText ?? "").replace(/\s+/g, " ")} `;
  const matches = [];
  for (const pos of PARTS_OF_SPEECH) {
    const pattern = new RegExp(`\\b${pos.replace(/\./g, "\\.")}\\b`, "i");
    if (pattern.test(haystack)) matches.push(pos.toLowerCase());
  }
  return [...new Set(matches)];
}

function parseDefinitionBlocks(bodyLines) {
  const definitions = [];
  const examples = [];
  /** @type {{ text: string[], examples: string[], marker: string } | null} */
  let current = null;

  function pushCurrent() {
    if (!current) return;
    const text = trimDefinitionNoise(current.text.join(" "));
    if (text) {
      definitions.push(text);
      for (const sample of current.examples) {
        const cleaned = collapseWhitespace(sample);
        if (cleaned) examples.push(cleaned);
      }
    }
    current = null;
  }

  const isExampleLine = (line) =>
    /^["']/.test(line) ||
    /(?:\.\s*[A-Z][A-Za-z. ]{1,24}|[A-Z][a-z]+\.?)$/.test(line);

  for (const rawLine of bodyLines) {
    const line = String(rawLine ?? "").trim();
    if (!line) {
      if (current) current.text.push("");
      continue;
    }
    const numbered = line.match(/^([0-9]+)\.\s*(.+)$/);
    if (numbered) {
      pushCurrent();
      current = { text: [numbered[2]], examples: [], marker: numbered[1] };
      continue;
    }
    if (/^Defn:\s*/.test(line)) {
      if (!current) current = { text: [], examples: [], marker: "defn" };
      current.text.push(line.replace(/^Defn:\s*/, ""));
      continue;
    }
    if (/^(Note:|Syn\.|Specif\.)/.test(line)) {
      pushCurrent();
      continue;
    }
    if (!current) continue;
    if (isExampleLine(line) && current.text.length) {
      current.examples.push(line);
      continue;
    }
    current.text.push(line);
  }
  pushCurrent();
  return {
    definitions: [...new Set(definitions)].filter(Boolean),
    examples: [...new Set(examples)].filter(Boolean).slice(0, 5),
  };
}

function parseWebsterEntryBlock(headwordLine, blockLines) {
  const variantsRaw = splitHeadwordVariants(headwordLine);
  const headword = variantsRaw[0] || normalizeVariantLabel(headwordLine);
  const variants = variantsRaw.slice(1);
  const lines = blockLines.map((line) => String(line ?? "").replace(/\s+$/g, ""));

  let bodyStart = 0;
  while (bodyStart < lines.length && !lines[bodyStart].trim()) bodyStart += 1;

  const introLines = [];
  let cursor = bodyStart;
  for (; cursor < lines.length; cursor += 1) {
    const line = lines[cursor].trim();
    if (/^(?:[0-9]+\.\s+|Defn:\s*)/.test(line)) break;
    introLines.push(line);
  }

  const introText = collapseWhitespace(introLines.join(" "));
  const etymMatch = introText.match(/\bEtym:\s*(.+)$/i);
  const etymology = etymMatch ? toSentencePreview(etymMatch[1], 260) : "";
  const { definitions, examples } = parseDefinitionBlocks(lines.slice(cursor));
  const partOfSpeech = extractPartOfSpeech(introText);
  const normalizedHeadword = normalizeDictionaryTerm(headword);
  const lookupTerms = new Set(dictionaryLookupKeys(headword));
  for (const variant of variants) {
    for (const key of dictionaryLookupKeys(variant)) lookupTerms.add(key);
  }
  const compactHeadword = compactDictionaryTerm(headword);
  if (compactHeadword && compactHeadword !== normalizedHeadword) lookupTerms.add(compactHeadword);

  return {
    headword,
    normalizedHeadword,
    variants,
    lookupTerms: [...lookupTerms],
    partOfSpeech,
    definitions: definitions.slice(0, 12),
    etymology,
    examples,
    introText,
  };
}

export function parseWebster1913Source(sourceText) {
  const body = extractProjectGutenbergBody(String(sourceText ?? ""));
  const lines = body.split("\n");
  /** @type {{ headwordLine: string, bodyLines: string[] }[]} */
  const blocks = [];
  /** @type {{ headwordLine: string, bodyLines: string[] } | null} */
  let current = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (isHeadwordLine(lines, index)) {
      if (current) blocks.push(current);
      current = { headwordLine: line.trim(), bodyLines: [] };
      continue;
    }
    if (current) current.bodyLines.push(line);
  }
  if (current) blocks.push(current);

  const entries = [];
  const slugCounts = new Map();
  let ignoredBlocks = 0;
  for (const block of blocks) {
    const parsed = parseWebsterEntryBlock(block.headwordLine, block.bodyLines);
    if (!parsed.normalizedHeadword || !parsed.definitions.length) {
      ignoredBlocks += 1;
      continue;
    }
    const baseSlug = slugifyDictionaryTerm(parsed.headword) || slugifyDictionaryTerm(parsed.normalizedHeadword);
    if (!baseSlug) {
      ignoredBlocks += 1;
      continue;
    }
    const seen = (slugCounts.get(baseSlug) || 0) + 1;
    slugCounts.set(baseSlug, seen);
    const slug = seen === 1 ? baseSlug : `${baseSlug}-${seen}`;
    entries.push({
      entryId: `hz.dictionary.webster1913.${slug}`,
      headword: parsed.headword,
      normalizedHeadword: parsed.normalizedHeadword,
      variants: parsed.variants,
      lookupTerms: parsed.lookupTerms,
      partOfSpeech: parsed.partOfSpeech,
      definitions: parsed.definitions,
      etymology: parsed.etymology,
      examples: parsed.examples,
      source: {
        corpusId: WEBSTER_1913_CORPUS_ID,
        title: WEBSTER_1913_TITLE,
        publisher: "Project Gutenberg",
      },
      provenance: {
        projectUrl: WEBSTER_1913_PROJECT_URL,
        sourceUrl: WEBSTER_1913_SOURCE_URL,
      },
    });
  }

  return {
    entries,
    stats: {
      parsedBlocks: blocks.length,
      entryCount: entries.length,
      ignoredBlocks,
    },
  };
}

function buildShardListing(entries) {
  const shards = new Map();
  for (const entry of entries) {
    const shard = entryShardNameForTerm(entry.normalizedHeadword);
    if (!shards.has(shard)) shards.set(shard, []);
    shards.get(shard).push(entry);
  }
  return [...shards.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([shard, rows]) => [shard, rows.sort((left, right) => left.entryId.localeCompare(right.entryId))]);
}

function buildCorpusStats(entries, sourceHash, parseStats) {
  const lookupTermCount = entries.reduce((sum, entry) => sum + (entry.lookupTerms?.length || 0), 0);
  const definitionCount = entries.reduce((sum, entry) => sum + (entry.definitions?.length || 0), 0);
  const variantCount = entries.reduce((sum, entry) => sum + (entry.variants?.length || 0), 0);
  return {
    artifactType: "dictionary-corpus-stats",
    corpusId: WEBSTER_1913_CORPUS_ID,
    title: WEBSTER_1913_TITLE,
    builtAt: new Date().toISOString(),
    sourceHash,
    counts: {
      entries: entries.length,
      variants: variantCount,
      definitions: definitionCount,
      lookupTerms: lookupTermCount,
      parsedBlocks: parseStats.parsedBlocks,
      ignoredBlocks: parseStats.ignoredBlocks,
    },
  };
}

async function fetchSourceText(logger = console) {
  logger?.log?.(`[dictionary] downloading Webster 1913 source from ${WEBSTER_1913_SOURCE_URL}`);
  const response = await fetch(WEBSTER_1913_SOURCE_URL, {
    headers: {
      "User-Agent": "HorizonsAI/1.0 (+local dictionary importer)",
      Accept: "text/plain, text/*;q=0.9, */*;q=0.1",
    },
  });
  if (!response.ok) {
    throw new Error(`Webster 1913 download failed: HTTP ${response.status}`);
  }
  return response.text();
}

export async function importWebster1913Corpus(opts = {}) {
  const logger = opts.logger || console;
  const paths = ensureWebster1913Layout();
  let sourceText = "";
  let sourceOrigin = "existing-snapshot";

  if (typeof opts.sourceText === "string" && opts.sourceText.trim()) {
    sourceText = opts.sourceText;
    sourceOrigin = "inline";
  } else if (opts.sourceFile && fs.existsSync(opts.sourceFile)) {
    sourceText = fs.readFileSync(opts.sourceFile, "utf8");
    sourceOrigin = relFromBrain(opts.sourceFile);
  } else if (fs.existsSync(paths.sourceTextFile)) {
    sourceText = fs.readFileSync(paths.sourceTextFile, "utf8");
  } else {
    sourceText = await fetchSourceText(logger);
    sourceOrigin = "download";
  }

  ensureDir(path.dirname(paths.sourceTextFile));
  fs.writeFileSync(paths.sourceTextFile, sourceText, "utf8");
  const sourceHash = sha256Text(sourceText);
  const parsed = parseWebster1913Source(sourceText);
  const entries = parsed.entries;
  const shardListing = buildShardListing(entries);

  for (const fileName of fs.readdirSync(paths.entriesRoot)) {
    if (fileName.endsWith(".jsonl")) fs.rmSync(path.join(paths.entriesRoot, fileName), { force: true });
  }

  const shardManifest = [];
  for (const [shard, rows] of shardListing) {
    const filePath = path.join(paths.entriesRoot, `${shard}.jsonl`);
    const payload = rows.map((row) => stableStringify(row)).join("\n") + "\n";
    fs.writeFileSync(filePath, payload, "utf8");
    shardManifest.push({
      shard,
      file: normalizeShardPath(filePath),
      count: rows.length,
      sha256: sha256File(filePath),
    });
  }

  const corpusStats = buildCorpusStats(entries, sourceHash, parsed.stats);
  const corpusManifest = {
    artifactType: "dictionary-corpus-manifest",
    corpusId: WEBSTER_1913_CORPUS_ID,
    title: WEBSTER_1913_TITLE,
    builtAt: corpusStats.builtAt,
    sourceHash,
    sourceFile: relFromBrain(paths.sourceTextFile),
    shardCount: shardManifest.length,
    entryCount: entries.length,
    shards: shardManifest,
  };
  const sourceManifest = {
    artifactType: "dictionary-source-manifest",
    corpusId: WEBSTER_1913_CORPUS_ID,
    title: WEBSTER_1913_TITLE,
    projectUrl: WEBSTER_1913_PROJECT_URL,
    sourceUrl: WEBSTER_1913_SOURCE_URL,
    snapshotFile: relFromBrain(paths.sourceTextFile),
    sourceHash,
    sourceOrigin,
    importedAt: corpusStats.builtAt,
    license: "Project Gutenberg public domain distribution",
  };

  writeJsonStable(paths.sourceManifestFile, sourceManifest);
  writeJsonStable(paths.corpusManifestFile, corpusManifest);
  writeJsonStable(paths.corpusStatsFile, corpusStats);

  logger?.log?.(
    `[dictionary] imported ${entries.length} Webster 1913 entries into ${shardManifest.length} shards`
  );
  return {
    paths,
    sourceManifest,
    corpusManifest,
    corpusStats,
  };
}

function normalizeShardPath(fullPath) {
  const paths = getWebster1913Paths();
  return path.relative(paths.importsRoot, fullPath).replace(/\\/g, "/");
}

function readCorpusManifest() {
  const paths = getWebster1913Paths();
  if (!fs.existsSync(paths.corpusManifestFile)) return null;
  return JSON.parse(fs.readFileSync(paths.corpusManifestFile, "utf8"));
}

export function loadWebster1913Entries() {
  const paths = getWebster1913Paths();
  const manifest = readCorpusManifest();
  if (!manifest?.shards?.length) return [];
  const entries = [];
  for (const shard of manifest.shards) {
    const shardPath = path.join(paths.importsRoot, shard.file);
    entries.push(...readJsonlFile(shardPath));
  }
  return entries;
}

function buildDictionaryBm25(entries) {
  const entryOrder = [];
  const docLengths = [];
  const termFrequencies = [];
  const documentFrequency = Object.create(null);

  for (const entry of entries) {
    const sourceText = [
      entry.headword,
      ...(entry.variants || []),
      ...(entry.partOfSpeech || []),
      ...(entry.definitions || []).slice(0, 4),
      entry.etymology || "",
      ...(entry.examples || []).slice(0, 2),
    ]
      .filter(Boolean)
      .join(" ");
    const tokens = tokenizeForRetrieval(sourceText);
    const tf = Object.create(null);
    for (const token of tokens) tf[token] = (tf[token] || 0) + 1;
    entryOrder.push(entry.entryId);
    docLengths.push(tokens.length || 1);
    termFrequencies.push(tf);
    for (const token of Object.keys(tf)) {
      documentFrequency[token] = (documentFrequency[token] || 0) + 1;
    }
  }

  const inverted = {};
  for (let index = 0; index < termFrequencies.length; index += 1) {
    for (const [term, tf] of Object.entries(termFrequencies[index])) {
      if (!inverted[term]) inverted[term] = [];
      inverted[term].push(index, tf);
    }
  }

  const avgdl =
    docLengths.length > 0 ? docLengths.reduce((sum, value) => sum + value, 0) / docLengths.length : 0;
  return {
    artifactType: "dictionary-bm25",
    corpusId: WEBSTER_1913_CORPUS_ID,
    builtAt: new Date().toISOString(),
    counts: {
      entries: entryOrder.length,
      terms: Object.keys(documentFrequency).length,
    },
    N: entryOrder.length,
    avgdl,
    entryOrder,
    docLengths,
    df: documentFrequency,
    inverted,
  };
}

export function buildWebster1913Artifacts(opts = {}) {
  const logger = opts.logger || console;
  const paths = ensureWebster1913Layout();
  const corpusManifest = readCorpusManifest();
  if (!corpusManifest?.shards?.length) {
    logger?.warn?.("[dictionary] Webster 1913 corpus is missing; run the import step first");
    return { skipped: true, reason: "missing-corpus" };
  }
  const existingManifest = fs.existsSync(paths.artifactManifestFile)
    ? JSON.parse(fs.readFileSync(paths.artifactManifestFile, "utf8"))
    : null;
  if (
    opts.force !== true &&
    existingManifest?.sourceHash &&
    existingManifest.sourceHash === corpusManifest.sourceHash
  ) {
    return {
      skipped: true,
      reason: "fresh",
      manifest: existingManifest,
    };
  }

  const entries = loadWebster1913Entries();
  const headwordMap = {};
  const aliasMap = {};
  const entryToShard = {};
  const shardToEntries = {};
  for (const entry of entries) {
    const shard = entryShardNameForTerm(entry.normalizedHeadword);
    entryToShard[entry.entryId] = `${shard}.jsonl`;
    if (!shardToEntries[shard]) shardToEntries[shard] = [];
    shardToEntries[shard].push(entry.entryId);

    const normalizedHeadword = normalizeDictionaryTerm(entry.normalizedHeadword || entry.headword);
    if (!headwordMap[normalizedHeadword]) headwordMap[normalizedHeadword] = [];
    headwordMap[normalizedHeadword].push(entry.entryId);

    const aliasTerms = new Set(entry.lookupTerms || []);
    aliasTerms.delete(normalizedHeadword);
    for (const alias of aliasTerms) {
      if (!aliasMap[alias]) aliasMap[alias] = [];
      aliasMap[alias].push(entry.entryId);
    }
  }

  const bm25 = buildDictionaryBm25(entries);
  const stats = {
    artifactType: "dictionary-artifact-stats",
    corpusId: WEBSTER_1913_CORPUS_ID,
    title: WEBSTER_1913_TITLE,
    builtAt: bm25.builtAt,
    sourceHash: corpusManifest.sourceHash,
    counts: {
      entries: entries.length,
      headwords: Object.keys(headwordMap).length,
      aliases: Object.keys(aliasMap).length,
      bm25Terms: Object.keys(bm25.df).length,
      shards: Object.keys(shardToEntries).length,
    },
  };
  const entryManifest = {
    artifactType: "dictionary-entry-manifest",
    corpusId: WEBSTER_1913_CORPUS_ID,
    builtAt: bm25.builtAt,
    sourceHash: corpusManifest.sourceHash,
    entryToShard,
    shardToEntries,
  };
  const artifactManifest = {
    artifactType: "dictionary-artifact-manifest",
    corpusId: WEBSTER_1913_CORPUS_ID,
    title: WEBSTER_1913_TITLE,
    builtAt: bm25.builtAt,
    sourceHash: corpusManifest.sourceHash,
    files: {
      headwordMap: relFromBrain(paths.headwordMapFile),
      aliasMap: relFromBrain(paths.aliasMapFile),
      bm25: relFromBrain(paths.bm25File),
      stats: relFromBrain(paths.statsFile),
      entryManifest: relFromBrain(paths.entryManifestFile),
    },
  };

  writeJsonStable(paths.headwordMapFile, headwordMap);
  writeJsonStable(paths.aliasMapFile, aliasMap);
  writeJsonStable(paths.bm25File, bm25);
  writeJsonStable(paths.statsFile, stats);
  writeJsonStable(paths.entryManifestFile, entryManifest);
  writeJsonStable(paths.artifactManifestFile, artifactManifest);

  logger?.log?.(
    `[dictionary] built Webster 1913 artifacts for ${entries.length} entries (${Object.keys(aliasMap).length} aliases)`
  );
  return {
    skipped: false,
    paths,
    manifest: artifactManifest,
    stats,
  };
}

