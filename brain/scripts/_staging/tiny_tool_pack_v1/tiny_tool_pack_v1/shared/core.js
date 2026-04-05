
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const registryPath = path.join(__dirname, '..', 'registry', 'tools_index.json');
const toolIndex = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const toolMap = Object.fromEntries(toolIndex.map(t => [t.id, t]));

function parseArgValue(value) {
  if (value === undefined) return true;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  if (/^-?\d+\.\d+$/.test(value)) return Number(value);
  if ((value.startsWith('[') && value.endsWith(']')) || (value.startsWith('{') && value.endsWith('}'))) {
    try { return JSON.parse(value); } catch (_) {}
  }
  return value;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2).replace(/-/g, '_');
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        args[key] = true;
      } else {
        args[key] = parseArgValue(next);
        i += 1;
      }
    }
  }
  return args;
}

function resolvePathMaybe(p) {
  if (typeof p !== 'string') return p;
  return path.resolve(process.cwd(), p);
}

function walk(root, opts = {}) {
  const recursive = opts.recursive !== false;
  const includeHidden = opts.includeHidden === true;
  const maxDepth = Number.isFinite(opts.maxDepth) ? opts.maxDepth : Infinity;
  const entries = [];

  function visit(current, depth) {
    let dirents = [];
    try {
      dirents = fs.readdirSync(current, { withFileTypes: true });
    } catch (error) {
      entries.push({ path: current, error: error.message, type: 'error' });
      return;
    }
    for (const dirent of dirents) {
      if (!includeHidden && dirent.name.startsWith('.')) continue;
      const fullPath = path.join(current, dirent.name);
      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch (error) {
        entries.push({ path: fullPath, error: error.message, type: 'error' });
        continue;
      }
      const item = {
        path: fullPath,
        relative_path: path.relative(root, fullPath) || '.',
        name: dirent.name,
        type: dirent.isDirectory() ? 'dir' : dirent.isFile() ? 'file' : 'other',
        ext: path.extname(dirent.name).toLowerCase(),
        size: stat.size,
        mtimeMs: stat.mtimeMs,
        ctimeMs: stat.ctimeMs,
        birthtimeMs: stat.birthtimeMs,
        depth,
      };
      entries.push(item);
      if (recursive && dirent.isDirectory() && depth < maxDepth) {
        visit(fullPath, depth + 1);
      }
    }
  }

  visit(root, 1);
  return entries;
}

function readText(filePath) {
  return fs.readFileSync(resolvePathMaybe(filePath), 'utf8');
}

function readLines(filePath) {
  return readText(filePath).split(/\r?\n/);
}

function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return [value];
  return [];
}

function limitItems(items, limit) {
  const n = Number.isFinite(limit) ? limit : (typeof limit === 'number' ? limit : undefined);
  if (!n || n <= 0) return items;
  return items.slice(0, n);
}

function jsonRead(filePath) {
  return JSON.parse(fs.readFileSync(resolvePathMaybe(filePath), 'utf8'));
}

function regexFrom(pattern, flags) {
  return new RegExp(pattern, flags || 'g');
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function gatherJsonPaths(value, prefix = '$', out = []) {
  if (Array.isArray(value)) {
    out.push({ path: prefix, type: 'array', length: value.length });
    value.forEach((v, i) => gatherJsonPaths(v, `${prefix}[${i}]`, out));
  } else if (value && typeof value === 'object') {
    out.push({ path: prefix, type: 'object', keys: Object.keys(value).length });
    for (const [k, v] of Object.entries(value)) {
      gatherJsonPaths(v, `${prefix}.${k}`, out);
    }
  } else {
    out.push({ path: prefix, type: value === null ? 'null' : typeof value, value });
  }
  return out;
}

function schemaGuess(value) {
  if (Array.isArray(value)) {
    return { type: 'array', items: value.length ? schemaGuess(value[0]) : { type: 'unknown' } };
  }
  if (value === null) return { type: 'null' };
  if (typeof value === 'object') {
    const props = {};
    for (const [k, v] of Object.entries(value)) props[k] = schemaGuess(v);
    return { type: 'object', properties: props };
  }
  return { type: typeof value };
}

function hashString(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function writeMaybe(outputPath, content, dryRun) {
  if (!outputPath) return { wrote: false, output: null, preview: content };
  if (dryRun) return { wrote: false, output: resolvePathMaybe(outputPath), preview: content };
  fs.writeFileSync(resolvePathMaybe(outputPath), content, 'utf8');
  return { wrote: true, output: resolvePathMaybe(outputPath), preview: null };
}

function buildResult(tool, args, data, warnings = []) {
  return {
    ok: true,
    tool_id: tool.id,
    title: tool.title,
    category: tool.category,
    risk_level: tool.risk_level,
    args,
    data,
    warnings,
  };
}

function scanEntries(tool, args) {
  const root = resolvePathMaybe(args.path || '.');
  const recursive = args.recursive !== false;
  const entries = walk(root, { recursive, includeHidden: args.include_hidden === true, maxDepth: args.max_depth });
  const defaults = tool.defaults || {};
  let filtered = entries.filter(e => e.type !== 'error');
  const entryType = args.entry_type || defaults.entryType;
  if (entryType === 'file') filtered = filtered.filter(e => e.type === 'file');
  if (entryType === 'dir') filtered = filtered.filter(e => e.type === 'dir');
  const ext = args.extension || defaults.extension;
  const extList = args.extensions || defaults.extensions;
  if (ext) filtered = filtered.filter(e => e.ext === String(ext).toLowerCase());
  if (Array.isArray(extList) && extList.length) {
    const s = new Set(extList.map(v => String(v).toLowerCase()));
    filtered = filtered.filter(e => s.has(e.ext));
  }
  const nameEquals = args.name_equals || defaults.nameEquals;
  if (nameEquals) filtered = filtered.filter(e => e.name === nameEquals);
  const nameRegex = args.name_regex || defaults.nameRegex;
  if (nameRegex) {
    const flags = args.name_flags || defaults.nameFlags || '';
    const re = new RegExp(nameRegex, flags);
    filtered = filtered.filter(e => re.test(e.name));
  }
  const query = args.query;
  if (query) filtered = filtered.filter(e => e.name.toLowerCase().includes(String(query).toLowerCase()));
  return buildResult(tool, args, {
    root,
    count: filtered.length,
    items: limitItems(filtered, args.limit || defaults.limit || 200),
  });
}

function countEntries(tool, args) {
  const res = scanEntries(tool, args);
  res.data = { root: res.data.root, count: res.data.count };
  return res;
}

function treePreview(tool, args) {
  const root = resolvePathMaybe(args.path || '.');
  const maxDepth = args.max_depth ?? 3;
  const limit = args.limit ?? 200;
  const filtered = walk(root, { recursive: true, includeHidden: args.include_hidden === true, maxDepth })
    .filter(e => e.type !== 'error')
    .sort((a, b) => a.relative_path.localeCompare(b.relative_path))
    .slice(0, limit)
    .map(e => `${'  '.repeat(Math.max(0, e.depth - 1))}${e.type === 'dir' ? '📁' : '📄'} ${e.name}`);
  return buildResult(tool, args, { root, lines: filtered, count: filtered.length, max_depth: maxDepth });
}

function rankFiles(tool, args) {
  const root = resolvePathMaybe(args.path || '.');
  const defaults = tool.defaults || {};
  const sortBy = defaults.sortBy || 'size';
  const sortDir = defaults.sortDir || 'desc';
  const files = walk(root, { recursive: args.recursive !== false, includeHidden: args.include_hidden === true })
    .filter(e => e.type === 'file')
    .sort((a, b) => sortDir === 'desc' ? b[sortBy] - a[sortBy] : a[sortBy] - b[sortBy]);
  return buildResult(tool, args, { root, count: files.length, items: limitItems(files, args.limit || 50) });
}

function extensionBreakdown(tool, args) {
  const root = resolvePathMaybe(args.path || '.');
  const files = walk(root, { recursive: args.recursive !== false, includeHidden: args.include_hidden === true }).filter(e => e.type === 'file');
  const counts = {};
  for (const f of files) counts[f.ext || '(none)'] = (counts[f.ext || '(none)'] || 0) + 1;
  const items = Object.entries(counts).map(([ext, count]) => ({ ext, count })).sort((a, b) => b.count - a.count);
  return buildResult(tool, args, { root, count: files.length, items });
}

function emptyDirectories(tool, args) {
  const root = resolvePathMaybe(args.path || '.');
  const dirs = walk(root, { recursive: args.recursive !== false, includeHidden: args.include_hidden === true }).filter(e => e.type === 'dir');
  const items = dirs.filter(d => {
    try { return fs.readdirSync(d.path).length === 0; } catch (_) { return false; }
  });
  return buildResult(tool, args, { root, count: items.length, items: limitItems(items, args.limit || 200) });
}

function zeroByteFiles(tool, args) {
  const root = resolvePathMaybe(args.path || '.');
  const items = walk(root, { recursive: args.recursive !== false, includeHidden: args.include_hidden === true })
    .filter(e => e.type === 'file' && e.size === 0);
  return buildResult(tool, args, { root, count: items.length, items: limitItems(items, args.limit || 200) });
}

function duplicateFilenames(tool, args) {
  const root = resolvePathMaybe(args.path || '.');
  const files = walk(root, { recursive: args.recursive !== false, includeHidden: args.include_hidden === true }).filter(e => e.type === 'file');
  const groups = {};
  for (const f of files) {
    groups[f.name] = groups[f.name] || [];
    groups[f.name].push(f.path);
  }
  const items = Object.entries(groups).filter(([, paths]) => paths.length > 1).map(([name, paths]) => ({ name, count: paths.length, paths }));
  items.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return buildResult(tool, args, { root, count: items.length, items: limitItems(items, args.limit || 100) });
}

function pathExists(tool, args) {
  const p = resolvePathMaybe(args.path);
  const exists = fs.existsSync(p);
  let stat = null;
  if (exists) {
    const s = fs.statSync(p);
    stat = { isFile: s.isFile(), isDirectory: s.isDirectory(), size: s.size, mtime: s.mtime.toISOString() };
  }
  return buildResult(tool, args, { path: p, exists, stat });
}

function fileSizes(tool, args) {
  const root = resolvePathMaybe(args.path || '.');
  const files = walk(root, { recursive: args.recursive !== false, includeHidden: args.include_hidden === true })
    .filter(e => e.type === 'file')
    .sort((a, b) => b.size - a.size);
  return buildResult(tool, args, { root, count: files.length, items: limitItems(files, args.limit || 200) });
}

function recentFiles(tool, args) {
  const root = resolvePathMaybe(args.path || '.');
  const days = Number(args.days || 7);
  const cutoff = Date.now() - days * 86400000;
  const items = walk(root, { recursive: args.recursive !== false, includeHidden: args.include_hidden === true })
    .filter(e => e.type === 'file' && e.mtimeMs >= cutoff)
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  return buildResult(tool, args, { root, days, count: items.length, items: limitItems(items, args.limit || 200) });
}

function hiddenFiles(tool, args) {
  const root = resolvePathMaybe(args.path || '.');
  const items = walk(root, { recursive: args.recursive !== false, includeHidden: true }).filter(e => e.type === 'file' && e.name.startsWith('.'));
  return buildResult(tool, args, { root, count: items.length, items: limitItems(items, args.limit || 200) });
}

function longPaths(tool, args) {
  const root = resolvePathMaybe(args.path || '.');
  const minLength = Number(args.min_length || tool.defaults.min_length || 120);
  const items = walk(root, { recursive: args.recursive !== false, includeHidden: args.include_hidden === true })
    .filter(e => e.path.length >= minLength)
    .sort((a, b) => b.path.length - a.path.length)
    .map(e => ({ ...e, path_length: e.path.length }));
  return buildResult(tool, args, { root, min_length: minLength, count: items.length, items: limitItems(items, args.limit || 200) });
}

function shallowInventory(tool, args) {
  const root = resolvePathMaybe(args.path || '.');
  const items = walk(root, { recursive: false, includeHidden: true });
  const summary = {
    root,
    total: items.length,
    files: items.filter(i => i.type === 'file').length,
    directories: items.filter(i => i.type === 'dir').length,
    file_examples: items.filter(i => i.type === 'file').slice(0, 30),
    directory_examples: items.filter(i => i.type === 'dir').slice(0, 30),
  };
  return buildResult(tool, args, summary);
}

function fileNameSearch(tool, args) {
  return scanEntries(tool, args);
}

function pathParts(tool, args) {
  const p = resolvePathMaybe(args.path);
  return buildResult(tool, args, {
    input: args.path,
    absolute: p,
    root: path.parse(p).root,
    dir: path.dirname(p),
    base: path.basename(p),
    name: path.parse(p).name,
    ext: path.extname(p),
    segments: p.split(path.sep).filter(Boolean),
  });
}

function normalizePathOp(tool, args) {
  return buildResult(tool, args, { input: args.path, normalized: path.normalize(args.path) });
}

function relativePathOp(tool, args) {
  return buildResult(tool, args, { from: resolvePathMaybe(args.from), to: resolvePathMaybe(args.to), relative: path.relative(resolvePathMaybe(args.from), resolvePathMaybe(args.to)) });
}

function absolutePathOp(tool, args) {
  return buildResult(tool, args, { input: args.path, absolute: resolvePathMaybe(args.path) });
}

function commonPathPrefix(tool, args) {
  const paths = safeArray(args.paths).map(resolvePathMaybe);
  if (!paths.length) return buildResult(tool, args, { common_prefix: null, paths: [] }, ['No paths provided']);
  let prefix = paths[0].split(path.sep);
  for (const p of paths.slice(1)) {
    const segs = p.split(path.sep);
    let i = 0;
    while (i < prefix.length && i < segs.length && prefix[i] === segs[i]) i++;
    prefix = prefix.slice(0, i);
  }
  return buildResult(tool, args, { common_prefix: prefix.join(path.sep) || path.sep, paths });
}

function pathDepth(tool, args) {
  const p = resolvePathMaybe(args.path);
  const depth = p.split(path.sep).filter(Boolean).length;
  return buildResult(tool, args, { path: p, depth });
}

function parentPath(tool, args) {
  const p = resolvePathMaybe(args.path);
  return buildResult(tool, args, { path: p, parent: path.dirname(p) });
}

function pathCompare(tool, args) {
  const a = path.normalize(resolvePathMaybe(args.a));
  const b = path.normalize(resolvePathMaybe(args.b));
  return buildResult(tool, args, { a, b, same: a === b });
}

function joinPaths(tool, args) {
  const parts = safeArray(args.paths);
  return buildResult(tool, args, { input: parts, joined: path.join(...parts) });
}

function sanitizeFilename(tool, args) {
  const name = String(args.name || '');
  const sanitized = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').replace(/\s+/g, ' ').trim();
  return buildResult(tool, args, { input: name, sanitized });
}

function fileExtension(tool, args) {
  const p = String(args.path || '');
  return buildResult(tool, args, { path: p, ext: path.extname(p), name: path.basename(p, path.extname(p)) });
}

function basenameDirname(tool, args) {
  const p = resolvePathMaybe(args.path);
  return buildResult(tool, args, { path: p, basename: path.basename(p), dirname: path.dirname(p) });
}

function textMetric(tool, args) {
  const text = readText(args.path);
  const lines = text.split(/\r?\n/);
  const metric = tool.defaults.metric;
  let value;
  if (metric === 'lines') value = lines.length;
  else if (metric === 'words') value = (text.match(/\b[\w'-]+\b/g) || []).length;
  else if (metric === 'chars') value = text.length;
  else if (metric === 'blank_lines') value = lines.filter(l => !l.trim()).length;
  else if (metric === 'comment_lines') value = lines.filter(l => /^\s*(#|\/\/|\/\*|\*|--)/.test(l)).length;
  return buildResult(tool, args, { path: resolvePathMaybe(args.path), metric, value });
}

function grepPatternLines(tool, args) {
  const lines = readLines(args.path);
  let pattern = args.pattern || tool.defaults.pattern || '';
  let flags = args.flags || tool.defaults.flags || '';
  if (tool.defaults.useQueryAsPattern) pattern = String(args.query || '');
  if (tool.defaults.escapeQuery) pattern = escapeRegex(pattern);
  const re = new RegExp(pattern, flags);
  const items = [];
  lines.forEach((line, idx) => {
    if (re.test(line)) items.push({ line_number: idx + 1, line });
    re.lastIndex = 0;
  });
  return buildResult(tool, args, { path: resolvePathMaybe(args.path), count: items.length, items: limitItems(items, args.limit || 200) });
}

function extractHeadings(tool, args) {
  const lines = readLines(args.path);
  const items = [];
  lines.forEach((line, idx) => {
    if (/^#{1,6}\s+/.test(line)) items.push({ line_number: idx + 1, level: line.match(/^#+/)[0].length, text: line.replace(/^#{1,6}\s+/, '') });
    else if (/^[A-Z][A-Za-z0-9\s_-]{2,}$/.test(line) && line === line.trim()) items.push({ line_number: idx + 1, level: null, text: line.trim() });
  });
  return buildResult(tool, args, { path: resolvePathMaybe(args.path), count: items.length, items: limitItems(items, args.limit || 200) });
}

function regexCapture(tool, args) {
  const text = readText(args.path);
  const pattern = args.pattern || tool.defaults.pattern;
  const re = regexFrom(pattern, args.flags || tool.defaults.flags || 'g');
  const captureMode = tool.defaults.captureMode || 'single';
  const items = [];
  let match;
  while ((match = re.exec(text)) !== null) {
    if (captureMode === 'pairs') items.push({ text: match[1], url: match[2] });
    else if (match.length > 1) items.push(match[1]);
    else items.push(match[0]);
    if (!re.global) break;
  }
  return buildResult(tool, args, { path: resolvePathMaybe(args.path), count: items.length, items: limitItems(items, args.limit || 200) });
}

function wordStats(tool, args) {
  const text = readText(args.path).toLowerCase();
  const words = (text.match(/\b[a-z0-9_'-]+\b/g) || []).filter(w => w.length > 1);
  const counts = {};
  for (const word of words) counts[word] = (counts[word] || 0) + 1;
  const items = Object.entries(counts).map(([word, count]) => ({ word, count })).sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
  if (tool.defaults.mode === 'unique') {
    return buildResult(tool, args, { path: resolvePathMaybe(args.path), unique_count: items.length, sample: limitItems(items, args.limit || 100) });
  }
  return buildResult(tool, args, { path: resolvePathMaybe(args.path), count: items.length, items: limitItems(items, args.limit || 50) });
}

function lineView(tool, args) {
  const lines = readLines(args.path);
  const n = Number(args.n || 20);
  let items;
  if (tool.defaults.mode === 'first') items = lines.slice(0, n).map((line, idx) => ({ line_number: idx + 1, line }));
  else if (tool.defaults.mode === 'last') items = lines.slice(-n).map((line, idx) => ({ line_number: lines.length - itemsLengthGuard(n, lines.length) + idx + 1, line }));
  else items = lines.map((line, idx) => ({ line_number: idx + 1, line, length: line.length })).sort((a, b) => b.length - a.length).slice(0, args.limit || 20);
  return buildResult(tool, args, { path: resolvePathMaybe(args.path), items });
}

function itemsLengthGuard(n, total) { return Math.min(n, total); }

function lineLengthStats(tool, args) {
  const lines = readLines(args.path);
  const lengths = lines.map(l => l.length);
  const total = lengths.reduce((a, b) => a + b, 0);
  const stats = {
    lines: lines.length,
    min: lengths.length ? Math.min(...lengths) : 0,
    max: lengths.length ? Math.max(...lengths) : 0,
    average: lengths.length ? total / lengths.length : 0,
    total_chars: total,
  };
  return buildResult(tool, args, { path: resolvePathMaybe(args.path), stats });
}

function extractSymbols(tool, args) {
  const text = readText(args.path);
  let patterns = [];
  if (tool.defaults.symbolType === 'function') {
    patterns = [
      /function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g,
      /const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\([^)]*\)\s*=>/g,
      /def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g,
    ];
  } else {
    patterns = [/class\s+([A-Za-z_][A-Za-z0-9_]*)/g];
  }
  const names = new Set();
  for (const re of patterns) {
    let match;
    while ((match = re.exec(text)) !== null) names.add(match[1]);
  }
  return buildResult(tool, args, { path: resolvePathMaybe(args.path), count: names.size, items: Array.from(names).sort() });
}

function extractEnvKeys(tool, args) {
  const lines = readLines(args.path);
  const items = lines.filter(l => /^\s*[A-Za-z_][A-Za-z0-9_]*=/.test(l)).map(l => l.split('=')[0].trim());
  return buildResult(tool, args, { path: resolvePathMaybe(args.path), count: items.length, items });
}

function entrypointCandidates(tool, args) {
  const root = resolvePathMaybe(args.path || '.');
  const re = /^(index|main|app|server|cli|run|start)\.(js|mjs|cjs|ts|py|java|go|rs|php|rb)$/i;
  const items = walk(root, { recursive: args.recursive !== false, includeHidden: args.include_hidden === true })
    .filter(e => e.type === 'file' && re.test(e.name));
  return buildResult(tool, args, { root, count: items.length, items: limitItems(items, args.limit || 200) });
}

function folderFileCounts(tool, args) {
  const root = resolvePathMaybe(args.path || '.');
  const files = walk(root, { recursive: args.recursive !== false, includeHidden: args.include_hidden === true }).filter(e => e.type === 'file');
  const counts = {};
  for (const f of files) {
    const dir = path.dirname(f.relative_path);
    counts[dir] = (counts[dir] || 0) + 1;
  }
  const items = Object.entries(counts).map(([directory, count]) => ({ directory, count })).sort((a, b) => b.count - a.count);
  return buildResult(tool, args, { root, count: items.length, items: limitItems(items, args.limit || 200) });
}

function folderSizeEstimate(tool, args) {
  const root = resolvePathMaybe(args.path || '.');
  const items = [];
  for (const name of fs.readdirSync(root)) {
    const full = path.join(root, name);
    let stat;
    try { stat = fs.statSync(full); } catch (_) { continue; }
    if (!stat.isDirectory()) continue;
    const size = walk(full, { recursive: true, includeHidden: true }).filter(e => e.type === 'file').reduce((sum, item) => sum + item.size, 0);
    items.push({ directory: full, size_bytes: size });
  }
  items.sort((a, b) => b.size_bytes - a.size_bytes);
  return buildResult(tool, args, { root, count: items.length, items });
}

function importSummaryJs(tool, args) {
  const root = resolvePathMaybe(args.path || '.');
  const files = walk(root, { recursive: args.recursive !== false, includeHidden: args.include_hidden === true })
    .filter(e => e.type === 'file' && ['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx'].includes(e.ext));
  const counts = {};
  for (const file of files) {
    const text = fs.readFileSync(file.path, 'utf8');
    const patterns = [ /import\s+.*?from\s+['"]([^'"]+)['"]/g, /require\(['"]([^'"]+)['"]\)/g ];
    for (const re of patterns) {
      let match;
      while ((match = re.exec(text)) !== null) counts[match[1]] = (counts[match[1]] || 0) + 1;
    }
  }
  const items = Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  return buildResult(tool, args, { root, files_scanned: files.length, count: items.length, items: limitItems(items, args.limit || 100) });
}

function importSummaryPy(tool, args) {
  const root = resolvePathMaybe(args.path || '.');
  const files = walk(root, { recursive: args.recursive !== false, includeHidden: args.include_hidden === true }).filter(e => e.type === 'file' && e.ext === '.py');
  const counts = {};
  for (const file of files) {
    const text = fs.readFileSync(file.path, 'utf8');
    const patterns = [/^\s*import\s+([A-Za-z0-9_., ]+)/gm, /^\s*from\s+([A-Za-z0-9_.]+)\s+import\s+/gm];
    for (const re of patterns) {
      let match;
      while ((match = re.exec(text)) !== null) {
        const parts = match[1].split(',').map(s => s.trim().split(' ')[0]).filter(Boolean);
        for (const p of parts) counts[p] = (counts[p] || 0) + 1;
      }
    }
  }
  const items = Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  return buildResult(tool, args, { root, files_scanned: files.length, count: items.length, items: limitItems(items, args.limit || 100) });
}

function dependencyMentions(tool, args) {
  const root = resolvePathMaybe(args.path || '.');
  const names = safeArray(args.names).map(String);
  const files = walk(root, { recursive: true, includeHidden: false }).filter(e => e.type === 'file' && e.size <= 1024 * 1024);
  const hits = [];
  for (const file of files) {
    let text;
    try { text = fs.readFileSync(file.path, 'utf8'); } catch (_) { continue; }
    for (const name of names) {
      const count = (text.match(new RegExp(escapeRegex(name), 'g')) || []).length;
      if (count) hits.push({ path: file.path, name, count });
    }
  }
  return buildResult(tool, args, { root, names, count: hits.length, items: limitItems(hits, args.limit || 200) });
}

function packageJsonScripts(tool, args) {
  const root = resolvePathMaybe(args.path || '.');
  const files = walk(root, { recursive: args.recursive !== false, includeHidden: false }).filter(e => e.type === 'file' && e.name === 'package.json');
  const items = [];
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(file.path, 'utf8'));
      items.push({ path: file.path, scripts: data.scripts || {} });
    } catch (error) {
      items.push({ path: file.path, error: error.message });
    }
  }
  return buildResult(tool, args, { root, count: items.length, items });
}

function jsonInspect(tool, args) {
  const data = jsonRead(args.path);
  const mode = tool.defaults.mode;
  const paths = gatherJsonPaths(data);
  let out;
  if (mode === 'top_keys') out = Array.isArray(data) ? [] : Object.keys(data);
  else if (mode === 'key_paths') out = paths.map(p => p.path);
  else if (mode === 'value_types') out = Array.isArray(data) ? { root: 'array' } : Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v]));
  else if (mode === 'array_lengths') out = paths.filter(p => p.type === 'array').map(p => ({ path: p.path, length: p.length }));
  else if (mode === 'schema_guess') out = schemaGuess(data);
  else if (mode === 'key_search') out = paths.filter(p => p.path.toLowerCase().includes(String(args.query || '').toLowerCase())).map(p => p.path);
  else if (mode === 'value_search') out = paths.filter(p => typeof p.value === 'string' && p.value.toLowerCase().includes(String(args.query || '').toLowerCase())).map(p => ({ path: p.path, value: p.value }));
  else if (mode === 'summary') out = { root_type: Array.isArray(data) ? 'array' : (data === null ? 'null' : typeof data), top_level_keys: Array.isArray(data) ? [] : Object.keys(data).slice(0, 100), total_paths: paths.length };
  else if (mode === 'numeric_fields') out = paths.filter(p => typeof p.value === 'number').map(p => p.path);
  else if (mode === 'boolean_fields') out = paths.filter(p => typeof p.value === 'boolean').map(p => p.path);
  else if (mode === 'null_fields') out = paths.filter(p => p.type === 'null').map(p => p.path);
  else if (mode === 'string_length_stats') {
    const lengths = paths.filter(p => typeof p.value === 'string').map(p => p.value.length);
    out = { count: lengths.length, min: lengths.length ? Math.min(...lengths) : 0, max: lengths.length ? Math.max(...lengths) : 0, average: lengths.length ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0 };
  }
  else if (mode === 'object_count') out = { objects: paths.filter(p => p.type === 'object').length, arrays: paths.filter(p => p.type === 'array').length, total_nodes: paths.length };
  return buildResult(tool, args, { path: resolvePathMaybe(args.path), mode, result: out });
}

function jsonTransform(tool, args) {
  const data = jsonRead(args.path);
  const mode = tool.defaults.mode;
  let content;
  if (mode === 'pretty') content = JSON.stringify(data, null, 2) + '\n';
  else if (mode === 'minify') content = JSON.stringify(data);
  else if (mode === 'sort_keys') content = JSON.stringify(sortJsonKeys(data), null, 2) + '\n';
  const write = writeMaybe(args.output, content, args.dry_run === true);
  return buildResult(tool, args, { path: resolvePathMaybe(args.path), mode, output: write.output, wrote: write.wrote, preview: write.preview ? write.preview.slice(0, 2000) : null });
}

function sortJsonKeys(value) {
  if (Array.isArray(value)) return value.map(sortJsonKeys);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(k => [k, sortJsonKeys(value[k])]));
  }
  return value;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return { header: [], rows: [] };
  const splitLine = (line) => line.split(',').map(v => v.trim());
  const header = splitLine(lines[0]);
  const rows = lines.slice(1).map(splitLine);
  return { header, rows };
}

function csvInspect(tool, args) {
  const { header, rows } = parseCsv(readText(args.path));
  const mode = tool.defaults.mode;
  let result;
  if (mode === 'header') result = header;
  else if (mode === 'row_count') result = rows.length;
  else if (mode === 'column_count') result = header.length;
  else if (mode === 'column_names') result = header;
  else if (mode === 'sample_rows') result = rows.slice(0, Number(args.limit || 10));
  else if (mode === 'null_like_counts') {
    const counts = Object.fromEntries(header.map(h => [h, 0]));
    rows.forEach(row => row.forEach((cell, i) => { if (['', 'null', 'na', 'n/a', 'none', 'undefined'].includes(String(cell).toLowerCase())) counts[header[i]] += 1; }));
    result = counts;
  }
  else if (mode === 'unique_count_for_column') {
    const idx = header.indexOf(String(args.column));
    result = idx === -1 ? { error: 'column not found' } : { column: args.column, unique_count: new Set(rows.map(r => r[idx])).size };
  }
  else if (mode === 'numeric_columns') {
    result = header.map((name, i) => {
      const cells = rows.map(r => r[i]).filter(v => v !== undefined && v !== '');
      const numeric = cells.filter(v => /^-?\d+(?:\.\d+)?$/.test(v)).length;
      return { column: name, rows: cells.length, numeric_ratio: cells.length ? numeric / cells.length : 0 };
    }).filter(x => x.numeric_ratio >= 0.7);
  }
  return buildResult(tool, args, { path: resolvePathMaybe(args.path), header, row_count: rows.length, result });
}

function backupFile(tool, args) {
  const source = resolvePathMaybe(args.path);
  const suffix = String(args.suffix || tool.defaults.suffix || '.bak');
  const target = source + suffix;
  if (args.dry_run === true) return buildResult(tool, args, { source, target, wrote: false });
  fs.copyFileSync(source, target);
  return buildResult(tool, args, { source, target, wrote: true });
}

function writeText(tool, args) {
  const p = resolvePathMaybe(args.path);
  if (args.dry_run === true) return buildResult(tool, args, { path: p, bytes: Buffer.byteLength(String(args.content || '')), wrote: false, preview: String(args.content || '').slice(0, 500) });
  fs.writeFileSync(p, String(args.content || ''), 'utf8');
  return buildResult(tool, args, { path: p, wrote: true });
}

function appendText(tool, args) {
  const p = resolvePathMaybe(args.path);
  if (args.dry_run === true) return buildResult(tool, args, { path: p, wrote: false, preview: String(args.content || '').slice(0, 500) });
  fs.appendFileSync(p, String(args.content || ''), 'utf8');
  return buildResult(tool, args, { path: p, wrote: true });
}

function prependText(tool, args) {
  const p = resolvePathMaybe(args.path);
  const current = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
  const next = String(args.content || '') + current;
  if (args.dry_run === true) return buildResult(tool, args, { path: p, wrote: false, preview: next.slice(0, 500) });
  fs.writeFileSync(p, next, 'utf8');
  return buildResult(tool, args, { path: p, wrote: true });
}

function replaceLiteral(tool, args) {
  const p = resolvePathMaybe(args.path);
  const current = fs.readFileSync(p, 'utf8');
  const next = current.split(String(args.find || '')).join(String(args.replace || ''));
  if (args.dry_run === true) return buildResult(tool, args, { path: p, wrote: false, changed: current !== next, preview: next.slice(0, 1000) });
  fs.writeFileSync(p, next, 'utf8');
  return buildResult(tool, args, { path: p, wrote: true, changed: current !== next });
}

function normalizeLineEndings(tool, args) {
  const p = resolvePathMaybe(args.path);
  const style = String(args.style || tool.defaults.style || 'lf').toLowerCase();
  const current = fs.readFileSync(p, 'utf8');
  let next = current.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (style === 'crlf') next = next.replace(/\n/g, '\r\n');
  if (args.dry_run === true) return buildResult(tool, args, { path: p, style, wrote: false, changed: current !== next, preview: next.slice(0, 1000) });
  fs.writeFileSync(p, next, 'utf8');
  return buildResult(tool, args, { path: p, style, wrote: true, changed: current !== next });
}

function trimTrailingWhitespace(tool, args) {
  const p = resolvePathMaybe(args.path);
  const current = fs.readFileSync(p, 'utf8');
  const next = current.split(/\r?\n/).map(line => line.replace(/[ \t]+$/g, '')).join('\n');
  if (args.dry_run === true) return buildResult(tool, args, { path: p, wrote: false, changed: current !== next, preview: next.slice(0, 1000) });
  fs.writeFileSync(p, next, 'utf8');
  return buildResult(tool, args, { path: p, wrote: true, changed: current !== next });
}

function ensureFinalNewline(tool, args) {
  const p = resolvePathMaybe(args.path);
  const current = fs.readFileSync(p, 'utf8');
  const next = current.endsWith('\n') ? current : current + '\n';
  if (args.dry_run === true) return buildResult(tool, args, { path: p, wrote: false, changed: current !== next });
  fs.writeFileSync(p, next, 'utf8');
  return buildResult(tool, args, { path: p, wrote: true, changed: current !== next });
}

function sortLines(tool, args) {
  const p = resolvePathMaybe(args.path);
  const current = fs.readFileSync(p, 'utf8');
  const next = current.split(/\r?\n/).sort((a, b) => a.localeCompare(b)).join('\n');
  if (args.dry_run === true) return buildResult(tool, args, { path: p, wrote: false, preview: next.slice(0, 1000) });
  fs.writeFileSync(p, next, 'utf8');
  return buildResult(tool, args, { path: p, wrote: true });
}

function dedupeLines(tool, args) {
  const p = resolvePathMaybe(args.path);
  const current = fs.readFileSync(p, 'utf8');
  const seen = new Set();
  const next = current.split(/\r?\n/).filter(line => { if (seen.has(line)) return false; seen.add(line); return true; }).join('\n');
  if (args.dry_run === true) return buildResult(tool, args, { path: p, wrote: false, preview: next.slice(0, 1000) });
  fs.writeFileSync(p, next, 'utf8');
  return buildResult(tool, args, { path: p, wrote: true });
}

function splitFileByLines(tool, args) {
  const p = resolvePathMaybe(args.path);
  const outDir = resolvePathMaybe(args.out_dir || path.join(path.dirname(p), path.basename(p) + '.parts'));
  const linesPerFile = Number(args.lines_per_file || 1000);
  const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
  const files = [];
  for (let i = 0; i < lines.length; i += linesPerFile) {
    const filePath = path.join(outDir, `${path.basename(p)}.part${String(files.length + 1).padStart(3, '0')}.txt`);
    files.push({ path: filePath, start_line: i + 1, end_line: Math.min(lines.length, i + linesPerFile) });
  }
  if (args.dry_run === true) return buildResult(tool, args, { source: p, out_dir: outDir, files });
  fs.mkdirSync(outDir, { recursive: true });
  files.forEach((file, idx) => fs.writeFileSync(file.path, lines.slice(idx * linesPerFile, (idx + 1) * linesPerFile).join('\n'), 'utf8'));
  return buildResult(tool, args, { source: p, out_dir: outDir, files, wrote: true });
}

function mergeTextFiles(tool, args) {
  const paths = safeArray(args.paths).map(resolvePathMaybe);
  const output = resolvePathMaybe(args.output);
  const content = paths.map(p => fs.readFileSync(p, 'utf8')).join('\n');
  if (args.dry_run === true) return buildResult(tool, args, { paths, output, wrote: false, preview: content.slice(0, 2000) });
  fs.writeFileSync(output, content, 'utf8');
  return buildResult(tool, args, { paths, output, wrote: true });
}

function cwdInfo(tool, args) {
  return buildResult(tool, args, { cwd: process.cwd(), contents_count: fs.readdirSync(process.cwd()).length });
}

function envVarNames(tool, args) {
  return buildResult(tool, args, { count: Object.keys(process.env).length, items: Object.keys(process.env).sort() });
}

function nodeRuntimeInfo(tool, args) {
  return buildResult(tool, args, {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    cwd: process.cwd(),
    pid: process.pid,
    memory_usage: process.memoryUsage(),
  });
}

function diskUsageEstimate(tool, args) {
  const root = resolvePathMaybe(args.path || '.');
  const size = walk(root, { recursive: true, includeHidden: true }).filter(e => e.type === 'file').reduce((sum, item) => sum + item.size, 0);
  return buildResult(tool, args, { path: root, size_bytes: size });
}

function folderSnapshot(tool, args) {
  const root = resolvePathMaybe(args.path || '.');
  const recursive = args.recursive !== false;
  const files = walk(root, { recursive, includeHidden: true }).filter(e => e.type === 'file').map(e => ({ relative_path: e.relative_path, size: e.size, mtimeMs: e.mtimeMs, sha256_quick: hashString(`${e.relative_path}|${e.size}|${e.mtimeMs}`) }));
  const snapshot = { root, created_at: new Date().toISOString(), file_count: files.length, files };
  if (args.output) {
    if (args.dry_run === true) return buildResult(tool, args, { root, output: resolvePathMaybe(args.output), wrote: false, snapshot_preview: { file_count: files.length } });
    fs.writeFileSync(resolvePathMaybe(args.output), JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
    return buildResult(tool, args, { root, output: resolvePathMaybe(args.output), wrote: true, file_count: files.length });
  }
  return buildResult(tool, args, snapshot);
}

function compareFolderSnapshots(tool, args) {
  const before = jsonRead(args.before);
  const after = jsonRead(args.after);
  const b = new Map(before.files.map(f => [f.relative_path, f]));
  const a = new Map(after.files.map(f => [f.relative_path, f]));
  const added = [];
  const removed = [];
  const changed = [];
  for (const [k, v] of a.entries()) {
    if (!b.has(k)) added.push(v);
    else {
      const old = b.get(k);
      if (old.size !== v.size || old.mtimeMs !== v.mtimeMs) changed.push({ before: old, after: v });
    }
  }
  for (const [k, v] of b.entries()) if (!a.has(k)) removed.push(v);
  return buildResult(tool, args, { added_count: added.length, removed_count: removed.length, changed_count: changed.length, added: limitItems(added, 200), removed: limitItems(removed, 200), changed: limitItems(changed, 200) });
}

function timestampNow(tool, args) {
  const now = new Date();
  return buildResult(tool, args, { iso: now.toISOString(), epoch_ms: now.getTime(), locale: now.toString() });
}

function hashFileSha256(tool, args) {
  const p = resolvePathMaybe(args.path);
  const buf = fs.readFileSync(p);
  return buildResult(tool, args, { path: p, sha256: crypto.createHash('sha256').update(buf).digest('hex') });
}

function hashTextSha256(tool, args) {
  return buildResult(tool, args, { sha256: hashString(String(args.text || '')) });
}

function fileMtimeInfo(tool, args) {
  const p = resolvePathMaybe(args.path);
  const stat = fs.statSync(p);
  return buildResult(tool, args, { path: p, mtime: stat.mtime.toISOString(), ctime: stat.ctime.toISOString(), birthtime: stat.birthtime.toISOString(), mtimeMs: stat.mtimeMs });
}

function permissionProbeReadonly(tool, args) {
  const p = resolvePathMaybe(args.path);
  let canRead = false, canWrite = false;
  try { fs.accessSync(p, fs.constants.R_OK); canRead = true; } catch (_) {}
  try { fs.accessSync(p, fs.constants.W_OK); canWrite = true; } catch (_) {}
  return buildResult(tool, args, { path: p, can_read: canRead, can_write: canWrite });
}

function registrySearch(tool, args) {
  const query = String(args.query || '').toLowerCase();
  const limit = Number(args.limit || 20);
  const scored = toolIndex.map(item => {
    const hay = [item.id, item.title, item.description, ...(item.tags || []), ...(item.intent_examples || []), ...(item.aliases || [])].join(' ').toLowerCase();
    let score = 0;
    if (!query) score = 1;
    else {
      for (const term of query.split(/\s+/).filter(Boolean)) if (hay.includes(term)) score += 1;
      if (item.id.includes(query)) score += 4;
      if ((item.tags || []).some(t => t.toLowerCase() === query)) score += 3;
    }
    return { item, score };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id)).slice(0, limit);
  return buildResult(tool, args, { query, count: scored.length, items: scored.map(x => ({ id: x.item.id, title: x.item.title, category: x.item.category, score: x.score, description: x.item.description, tags: x.item.tags })) });
}

const dispatch = {
  scan_dir: scanEntries,
  count_entries: countEntries,
  tree_preview: treePreview,
  rank_files: rankFiles,
  extension_breakdown: extensionBreakdown,
  empty_directories: emptyDirectories,
  zero_byte_files: zeroByteFiles,
  duplicate_filenames: duplicateFilenames,
  path_exists: pathExists,
  file_sizes: fileSizes,
  recent_files: recentFiles,
  hidden_files: hiddenFiles,
  long_paths: longPaths,
  shallow_inventory: shallowInventory,
  file_name_search: fileNameSearch,
  path_parts: pathParts,
  normalize_path: normalizePathOp,
  relative_path: relativePathOp,
  absolute_path: absolutePathOp,
  common_path_prefix: commonPathPrefix,
  path_depth: pathDepth,
  parent_path: parentPath,
  path_compare: pathCompare,
  join_paths: joinPaths,
  sanitize_filename: sanitizeFilename,
  file_extension: fileExtension,
  basename_dirname: basenameDirname,
  text_metric: textMetric,
  grep_pattern_lines: grepPatternLines,
  extract_headings: extractHeadings,
  regex_capture: regexCapture,
  word_stats: wordStats,
  line_view: lineView,
  line_length_stats: lineLengthStats,
  extract_symbols: extractSymbols,
  extract_env_keys: extractEnvKeys,
  entrypoint_candidates: entrypointCandidates,
  folder_file_counts: folderFileCounts,
  folder_size_estimate: folderSizeEstimate,
  import_summary_js: importSummaryJs,
  import_summary_py: importSummaryPy,
  dependency_mentions: dependencyMentions,
  package_json_scripts: packageJsonScripts,
  json_inspect: jsonInspect,
  json_transform: jsonTransform,
  csv_inspect: csvInspect,
  backup_file: backupFile,
  write_text: writeText,
  append_text: appendText,
  prepend_text: prependText,
  replace_literal: replaceLiteral,
  normalize_line_endings: normalizeLineEndings,
  trim_trailing_whitespace: trimTrailingWhitespace,
  ensure_final_newline: ensureFinalNewline,
  sort_lines: sortLines,
  dedupe_lines: dedupeLines,
  split_file_by_lines: splitFileByLines,
  merge_text_files: mergeTextFiles,
  cwd_info: cwdInfo,
  env_var_names: envVarNames,
  node_runtime_info: nodeRuntimeInfo,
  disk_usage_estimate: diskUsageEstimate,
  folder_snapshot: folderSnapshot,
  compare_folder_snapshots: compareFolderSnapshots,
  timestamp_now: timestampNow,
  hash_file_sha256: hashFileSha256,
  hash_text_sha256: hashTextSha256,
  file_mtime_info: fileMtimeInfo,
  permission_probe_readonly: permissionProbeReadonly,
  registry_search: registrySearch,
};

async function runTool(toolId, args = null) {
  const parsedArgs = args || parseArgs(process.argv.slice(2));
  const tool = toolMap[toolId];
  if (!tool) {
    console.error(JSON.stringify({ ok: false, error: `Unknown tool: ${toolId}` }, null, 2));
    process.exitCode = 1;
    return;
  }
  const handler = dispatch[tool.operation];
  if (!handler) {
    console.error(JSON.stringify({ ok: false, error: `No handler for operation: ${tool.operation}` }, null, 2));
    process.exitCode = 1;
    return;
  }
  try {
    const result = await handler(tool, parsedArgs);
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error(JSON.stringify({ ok: false, tool_id: toolId, error: error.message, stack: error.stack }, null, 2));
    process.exitCode = 1;
  }
}

async function runToolByCli() {
  const argv = process.argv.slice(2);
  const toolId = argv[0];
  const args = parseArgs(argv.slice(1));
  return runTool(toolId, args);
}

module.exports = { runTool, runToolByCli, parseArgs, toolIndex };
