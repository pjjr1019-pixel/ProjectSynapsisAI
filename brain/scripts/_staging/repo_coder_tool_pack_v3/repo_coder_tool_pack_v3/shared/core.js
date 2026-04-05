
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cp = require('child_process');

const registryPath = path.join(__dirname, '..', 'registry', 'tools_index.json');
const aliasPath = path.join(__dirname, '..', 'registry', 'tool_aliases.json');
const toolIndex = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const aliasIndex = JSON.parse(fs.readFileSync(aliasPath, 'utf8'));
const toolMap = Object.fromEntries(toolIndex.map(t => [t.id, t]));

const IGNORED_DIRS = new Set([
  'node_modules','.git','dist','build','out','coverage','.next','.nuxt','target','bin','obj',
  'venv','.venv','__pycache__','.cache','.turbo','.idea','.vscode','.gradle','.pytest_cache'
]);

const SOURCE_EXTS = new Set(['.js','.jsx','.ts','.tsx','.mjs','.cjs','.py','.java','.go','.rs','.c','.cpp','.h','.hpp','.cs','.php','.rb','.sh','.ps1']);
const DOC_EXTS = new Set(['.md','.mdx','.txt','.rst','.adoc']);
const ASSET_EXTS = new Set(['.png','.jpg','.jpeg','.gif','.svg','.ico','.webp','.bmp','.tiff','.mp3','.wav','.mp4','.mov','.ttf','.woff','.woff2','.css','.scss','.less']);
const CONFIG_EXTS = new Set(['.json','.yaml','.yml','.toml','.ini','.cfg','.conf','.env','.lock']);
const TEXT_EXTS = new Set([...SOURCE_EXTS, ...DOC_EXTS, ...CONFIG_EXTS, '.csv','.xml','.html','.sql','.gitignore','.dockerignore','.npmrc','.editorconfig','.gitattributes','.properties']);
const STOP_WORDS = new Set(['this','that','with','from','have','your','into','then','than','they','them','were','will','would','there','their','about','after','before','when','while','what','which','where','who','why','how','just','also','more','most','some','such','only','each','many','much','very','make','made','does','done','doing','like','used','using','use','main','true','false','null','undefined','const','let','var','function','class','return','export','import']);

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
      if (!next || next.startsWith('--')) args[key] = true;
      else { args[key] = parseArgValue(next); i += 1; }
    }
  }
  return args;
}
function resolveRoot(p) { return path.resolve(process.cwd(), p || '.'); }
function rel(root, p) { return path.relative(root, p).split(path.sep).join('/') || '.'; }
function getExt(p) {
  const base = path.basename(p);
  if (base.startsWith('.') && !base.includes('.', 1)) return base.toLowerCase();
  return path.extname(p).toLowerCase();
}
function isTextPath(p) {
  const base = path.basename(p).toLowerCase();
  const ext = getExt(p);
  if (TEXT_EXTS.has(ext)) return true;
  if (base === 'dockerfile' || base.startsWith('dockerfile.') || base === 'makefile') return true;
  if (base.startsWith('.env')) return true;
  if (/readme|changelog|license|copying|notice/i.test(base)) return true;
  return false;
}
function looksLikeTest(p) {
  const rp = p.toLowerCase();
  const base = path.basename(rp);
  return /(^|\/)(__tests__|tests?|spec)(\/|$)/.test(rp) || /\.(test|spec)\.[^.]+$/.test(base);
}
function looksLikeDoc(p) {
  const base = path.basename(p).toLowerCase();
  return DOC_EXTS.has(getExt(p)) || /readme|changelog|license|copying|notice/.test(base);
}
function looksLikeConfig(p) {
  const base = path.basename(p).toLowerCase();
  const ext = getExt(p);
  if (CONFIG_EXTS.has(ext)) return true;
  return [
    'package.json','package-lock.json','pnpm-lock.yaml','yarn.lock','tsconfig.json','jsconfig.json',
    'pyproject.toml','requirements.txt','requirements-dev.txt','pipfile','dockerfile','.gitignore',
    '.dockerignore','.editorconfig','.eslintrc','.prettierrc','.npmrc'
  ].includes(base) || base.startsWith('.env');
}
function looksLikeAsset(p) { return ASSET_EXTS.has(getExt(p)); }
function looksLikeBuildArtifact(p) {
  const rp = p.toLowerCase();
  return /(^|\/)(dist|build|out|coverage|\.next|\.nuxt|target|bin|obj)(\/|$)/.test(rp) || /\.min\.(js|css)$/.test(rp);
}
function looksLikeSource(p) { return SOURCE_EXTS.has(getExt(p)) && !looksLikeTest(p); }
function looksHidden(p, root) {
  const parts = rel(root, p).split('/');
  return parts.some(x => x.startsWith('.') && x.length > 1);
}
function matchFilterKind(p, kind, root) {
  if (!kind || kind === 'all') return true;
  if (kind === 'source') return looksLikeSource(p);
  if (kind === 'test') return looksLikeTest(p);
  if (kind === 'docs') return looksLikeDoc(p);
  if (kind === 'config') return looksLikeConfig(p);
  if (kind === 'asset') return looksLikeAsset(p);
  if (kind === 'build') return looksLikeBuildArtifact(p);
  if (kind === 'hidden') return looksHidden(p, root);
  return true;
}
function safeStat(p) { try { return fs.lstatSync(p); } catch (_) { return null; } }
function walkTree(root, options = {}) {
  const includeIgnored = !!options.include_ignored;
  const maxFiles = Number(options.max_files || 25000);
  const maxDepth = Number(options.max_depth || 30);
  const out = [];
  let seen = 0;
  function visit(dir, depth) {
    if (depth > maxDepth || seen > maxFiles) return;
    let items = [];
    try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
    for (const ent of items) {
      const full = path.join(dir, ent.name);
      const stat = safeStat(full);
      if (!stat) continue;
      const entry = {
        path: full,
        rel: rel(root, full),
        name: ent.name,
        type: stat.isSymbolicLink() ? 'symlink' : (stat.isDirectory() ? 'dir' : 'file'),
        size: stat.size,
        mtimeMs: stat.mtimeMs,
        ctimeMs: stat.ctimeMs
      };
      out.push(entry);
      seen += 1;
      if (seen > maxFiles) break;
      if (entry.type === 'dir') {
        if (!includeIgnored && IGNORED_DIRS.has(ent.name)) continue;
        visit(full, depth + 1);
      }
    }
  }
  visit(root, 0);
  return out;
}
function listFiles(root, options = {}) { return walkTree(root, options).filter(e => e.type === 'file'); }
function listDirs(root, options = {}) { return walkTree(root, options).filter(e => e.type === 'dir'); }
function safeReadText(filePath, maxBytes = 300000) {
  try {
    const buf = fs.readFileSync(filePath);
    const slice = buf.length > maxBytes ? buf.slice(0, maxBytes) : buf;
    return slice.toString('utf8');
  } catch (_) { return ''; }
}
function countLines(text) { if (!text) return 0; return text.split(/\r?\n/).length; }
function md5Buffer(buf) { return crypto.createHash('md5').update(buf).digest('hex'); }
function normalizeLine(line) {
  return line.replace(/\/\/.*$/,'').replace(/#.*$/,'').replace(/\/\*.*?\*\//g,'').replace(/\s+/g,' ').trim();
}
function summarizeByExtension(files) {
  const counts = {};
  for (const f of files) {
    const ext = getExt(f.path) || '[no_ext]';
    counts[ext] = (counts[ext] || 0) + 1;
  }
  return Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([ext,count])=>({ext,count}));
}
function topFolders(files) {
  const counts = {};
  for (const f of files) {
    const top = f.rel.split('/')[0] || '.';
    counts[top] = (counts[top] || 0) + 1;
  }
  return Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([folder,count])=>({folder,count}));
}
function tokenizeWords(text) {
  return (text.toLowerCase().match(/[a-z_][a-z0-9_]{2,}/g) || []).filter(x => !STOP_WORDS.has(x));
}
function wordCounts(texts) {
  const counts = {};
  for (const text of texts) for (const word of tokenizeWords(text)) counts[word] = (counts[word] || 0) + 1;
  return counts;
}
function summarizeFileBasics(filePath, root) {
  const stat = safeStat(filePath);
  const text = isTextPath(filePath) ? safeReadText(filePath, 120000) : '';
  return {
    path: rel(root, filePath),
    ext: getExt(filePath) || '[no_ext]',
    size: stat ? stat.size : 0,
    lines: countLines(text),
    is_text: !!text,
    preview: text.split(/\r?\n/).slice(0, 6).join('\n')
  };
}
function scoreEntrypoint(file) {
  const n = file.name.toLowerCase();
  let score = 0;
  if (/^(index|main|app|server|cli|run|start|manage)\./.test(n)) score += 4;
  if (/(index|main|app|server|cli|run|start|manage|bootstrap)/.test(n)) score += 2;
  if (/src\//.test(file.rel)) score += 1;
  if (/bin\//.test(file.rel) || /^bin\//.test(file.rel)) score += 2;
  if (/test|spec/.test(file.rel)) score -= 4;
  if (/\.(js|ts|py|sh|ps1)$/.test(n)) score += 1;
  return score;
}
function headingFromMarkdown(text) { return text.split(/\r?\n/).filter(x => /^#{1,6}\s+/.test(x)).slice(0, 20); }
function regexMatches(text, regex, mapper) {
  const out = [];
  let m;
  while ((m = regex.exec(text)) !== null) {
    const v = mapper ? mapper(m) : m[0];
    if (Array.isArray(v)) out.push(...v);
    else out.push(v);
    if (out.length > 5000) break;
  }
  return out;
}
function extractSymbolsFromText(mode, text) {
  if (mode === 'imports_js_ts') {
    return [
      ...regexMatches(text, /import\s+[^'"\n]+?\s+from\s+['"]([^'"]+)['"]/g, m => m[1]),
      ...regexMatches(text, /import\(\s*['"]([^'"]+)['"]\s*\)/g, m => m[1]),
      ...regexMatches(text, /export\s+[^'"\n]+?\s+from\s+['"]([^'"]+)['"]/g, m => m[1])
    ];
  }
  if (mode === 'exports_js_ts') {
    return [
      ...regexMatches(text, /export\s+(?:const|let|var|function|class)\s+([A-Za-z0-9_]+)/g, m => m[1]),
      ...regexMatches(text, /export\s*{\s*([^}]+)\s*}/g, m => m[1].split(',').map(x => x.trim().split(/\s+as\s+/)[0]).filter(Boolean))
    ];
  }
  if (mode === 'requires_js') return regexMatches(text, /require\(\s*['"]([^'"]+)['"]\s*\)/g, m => m[1]);
  if (mode === 'imports_py') {
    return [
      ...regexMatches(text, /^\s*import\s+([A-Za-z0-9_.,\s]+)/gm, m => m[1].split(',').map(x => x.trim()).filter(Boolean)),
      ...regexMatches(text, /^\s*from\s+([A-Za-z0-9_\.]+)\s+import\s+/gm, m => m[1])
    ];
  }
  if (mode === 'functions_js_ts') {
    return [
      ...regexMatches(text, /function\s+([A-Za-z0-9_]+)\s*\(/g, m => m[1]),
      ...regexMatches(text, /(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g, m => m[1])
    ];
  }
  if (mode === 'functions_py') return regexMatches(text, /^\s*def\s+([A-Za-z0-9_]+)\s*\(/gm, m => m[1]);
  if (mode === 'classes_js_ts') return regexMatches(text, /class\s+([A-Za-z0-9_]+)/g, m => m[1]);
  if (mode === 'classes_py') return regexMatches(text, /^\s*class\s+([A-Za-z0-9_]+)/gm, m => m[1]);
  return [];
}
function jsTsFiles(root, args={}) { return listFiles(root, args).filter(f => /\.(js|jsx|ts|tsx|mjs|cjs)$/.test(f.path) && !looksLikeBuildArtifact(f.path)); }
function pyFiles(root, args={}) { return listFiles(root, args).filter(f => /\.py$/.test(f.path) && !looksLikeBuildArtifact(f.path)); }
function resolveJsImport(fromFile, spec) {
  if (!spec.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFile), spec);
  const candidates = [base, base + '.js', base + '.jsx', base + '.ts', base + '.tsx', base + '.mjs', base + '.cjs',
    path.join(base, 'index.js'), path.join(base, 'index.ts'), path.join(base, 'index.tsx'), path.join(base, 'index.jsx')];
  for (const c of candidates) if (fs.existsSync(c) && safeStat(c) && safeStat(c).isFile()) return c;
  return null;
}
function buildJsGraph(root, args={}) {
  const files = jsTsFiles(root, args);
  const graph = {};
  for (const f of files) {
    const text = safeReadText(f.path, 200000);
    const imports = extractSymbolsFromText('imports_js_ts', text).concat(extractSymbolsFromText('requires_js', text));
    const edges = [];
    for (const spec of imports) {
      const target = resolveJsImport(f.path, spec);
      if (target) edges.push(rel(root, target));
    }
    graph[f.rel] = Array.from(new Set(edges));
  }
  return graph;
}
function buildPyGraph(root, args={}) {
  const files = pyFiles(root, args);
  const fileMap = new Map(files.map(f => [path.basename(f.path, '.py'), f.rel]));
  const graph = {};
  for (const f of files) {
    const text = safeReadText(f.path, 200000);
    const imports = extractSymbolsFromText('imports_py', text);
    const edges = [];
    for (const spec of imports) {
      const key = spec.replace(/^\.+/,'').split('.')[0];
      if (fileMap.has(key) && fileMap.get(key) !== f.rel) edges.push(fileMap.get(key));
    }
    graph[f.rel] = Array.from(new Set(edges));
  }
  return graph;
}
function invertGraph(graph) {
  const indegree = {};
  for (const node of Object.keys(graph)) indegree[node] = 0;
  for (const arr of Object.values(graph)) for (const dst of arr) indegree[dst] = (indegree[dst] || 0) + 1;
  return indegree;
}
function findSimpleCycles(graph) {
  const cycles = [];
  for (const [a, outs] of Object.entries(graph)) for (const b of outs) if ((graph[b] || []).includes(a) && a < b) cycles.push([a, b]);
  return cycles;
}
function runGit(root, args) {
  try {
    const out = cp.execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore','pipe','pipe'] });
    return { ok: true, output: out.trim() };
  } catch (err) {
    return { ok: false, error: (err.stderr || err.message || '').toString().trim() };
  }
}
function fileCandidates(root, mode, args={}) {
  const entries = walkTree(root, args);
  if (mode === 'symlink') return entries.filter(e => e.type === 'symlink').map(e => ({ path: e.rel }));
  if (mode === 'hidden') return entries.filter(e => looksHidden(e.path, root)).map(e => ({ path: e.rel, type: e.type }));
  const files = entries.filter(e => e.type === 'file');
  if (mode === 'canonical') {
    return files.filter(f => /(^|\/)(readme|index|main|app|server|package\.json|tsconfig\.json|pyproject\.toml|dockerfile|requirements\.txt)/i.test(f.rel)).map(f => ({ path: f.rel, reason: 'name/path heuristic' })).slice(0, 200);
  }
  if (mode === 'generated') {
    const out = [];
    for (const f of files) {
      const text = isTextPath(f.path) ? safeReadText(f.path, 50000) : '';
      if (looksLikeBuildArtifact(f.path) || /generated file|auto-generated|do not edit|@generated/i.test(text)) out.push({ path: f.rel, reason: looksLikeBuildArtifact(f.path) ? 'build-artifact path' : 'generated marker' });
    }
    return out.slice(0, 300);
  }
  if (mode === 'minified') {
    const out = [];
    for (const f of files) {
      if (!/\.(js|css)$/.test(f.path)) continue;
      if (/\.min\.(js|css)$/.test(f.path)) out.push({ path: f.rel, reason: 'filename .min' });
      else {
        const text = safeReadText(f.path, 100000);
        const lines = text.split(/\r?\n/);
        const longest = lines.reduce((a,b)=>Math.max(a,b.length),0);
        if (longest > 1200) out.push({ path: f.rel, reason: 'very long line' });
      }
    }
    return out.slice(0, 200);
  }
  return [];
}
function basicInventory(root, args={}) {
  const files = listFiles(root, args).filter(f => matchFilterKind(f.path, args.filter_kind || 'all', root));
  const limit = Number(args.limit || 200);
  const mode = args.mode || 'list';
  if (mode === 'count') return { count: files.length };
  if (mode === 'summary') return { file_count: files.length, by_extension: summarizeByExtension(files).slice(0, 25), top_folders: topFolders(files).slice(0, 25) };
  return { count: files.length, items: files.slice(0, limit).map(f => ({ path: f.rel, size: f.size, mtimeMs: f.mtimeMs })) };
}
function rankFiles(root, args={}) {
  let files = listFiles(root, args).filter(f => matchFilterKind(f.path, args.filter_kind || 'all', root));
  const sort = args.sort || 'size';
  const now = Date.now();
  if (sort === 'size') files.sort((a,b)=>b.size-a.size);
  else if (sort === 'mtime_desc') files.sort((a,b)=>b.mtimeMs-a.mtimeMs);
  else if (sort === 'mtime_asc') files.sort((a,b)=>a.mtimeMs-b.mtimeMs);
  else if (sort === 'stale') files = files.filter(f => now - f.mtimeMs > Number(args.days || 180) * 86400000).sort((a,b)=>a.mtimeMs-b.mtimeMs);
  const limit = Number(args.limit || 50);
  return { count: files.length, items: files.slice(0, limit).map(f => ({ path: f.rel, size: f.size, mtimeMs: f.mtimeMs, age_days: Math.round((now-f.mtimeMs)/86400000) })) };
}

const handlers = {
  registry_search(root, args, tool) {
    const q = String(args.query || '').toLowerCase();
    const limit = Number(args.limit || tool.defaults.limit || 15);
    const scored = toolIndex.map(t => {
      const hay = [t.id, t.title, t.description, ...(t.tags||[]), ...(t.intent_examples||[])].join(' ').toLowerCase();
      let score = 0;
      for (const term of q.split(/\s+/).filter(Boolean)) if (hay.includes(term)) score += 1;
      if (t.id === q) score += 10;
      return { score, tool: t };
    }).filter(x => x.score > 0 || !q).sort((a,b)=>b.score-a.score);
    return { count: scored.length, items: scored.slice(0, limit).map(x => ({ id: x.tool.id, title: x.tool.title, category: x.tool.category, score: x.score, description: x.tool.description })) };
  },
  inventory_scan(root, args) { return basicInventory(root, args); },
  extension_breakdown(root, args) {
    const files = listFiles(root, args);
    return { count: files.length, items: summarizeByExtension(files).slice(0, Number(args.limit || 60)) };
  },
  ranked_files(root, args) { return rankFiles(root, args); },
  likely_entrypoints(root, args) {
    const files = listFiles(root, args).filter(f => /\.(js|jsx|ts|tsx|mjs|cjs|py|sh|ps1)$/.test(f.path) && !looksLikeBuildArtifact(f.path));
    const ranked = files.map(f => ({ path: f.rel, score: scoreEntrypoint(f) })).filter(x => x.score > 0).sort((a,b)=>b.score-a.score);
    return { count: ranked.length, items: ranked.slice(0, Number(args.limit || 40)) };
  },
  likely_root_configs(root, args) {
    const items = fs.readdirSync(root).map(name => path.join(root, name)).filter(p => safeStat(p) && safeStat(p).isFile() && looksLikeConfig(p)).map(p => ({ path: rel(root,p) }));
    return { count: items.length, items };
  },
  empties(root, args) {
    if (args.target === 'dirs') {
      const dirs = listDirs(root, args).filter(d => { try { return fs.readdirSync(d.path).length === 0; } catch (_) { return false; } });
      return { count: dirs.length, items: dirs.slice(0, Number(args.limit || 200)).map(d => ({ path: d.rel })) };
    }
    const files = listFiles(root, args).filter(f => {
      if (f.size === 0) return true;
      if (!isTextPath(f.path) || f.size > 50000) return false;
      return safeReadText(f.path, 50000).trim() === '';
    });
    return { count: files.length, items: files.slice(0, Number(args.limit || 200)).map(f => ({ path: f.rel, size: f.size })) };
  },
  duplicate_names(root, args) {
    const map = {};
    for (const f of listFiles(root, args)) { const key = path.basename(f.path).toLowerCase(); (map[key] ||= []).push(f.rel); }
    const groups = Object.entries(map).filter(([, arr]) => arr.length > 1).sort((a,b)=>b[1].length-a[1].length);
    return { count: groups.length, groups: groups.slice(0, Number(args.limit || 100)).map(([name, paths]) => ({ name, paths })) };
  },
  duplicate_content(root, args) {
    const map = {};
    for (const f of listFiles(root, args)) {
      if (f.size > Number(args.max_size || 2000000)) continue;
      try {
        const hash = md5Buffer(fs.readFileSync(f.path));
        (map[hash] ||= []).push(f.rel);
      } catch (_) {}
    }
    const groups = Object.entries(map).filter(([,arr]) => arr.length > 1).sort((a,b)=>b[1].length-a[1].length);
    return { count: groups.length, groups: groups.slice(0, Number(args.limit || 80)).map(([hash, paths]) => ({ hash, paths })) };
  },
  tree_preview(root, args) {
    const maxDepth = Number(args.max_depth || 3);
    const maxLines = Number(args.limit || 250);
    const lines = [];
    function visit(dir, depth) {
      if (depth > maxDepth || lines.length >= maxLines) return;
      let entries = [];
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
      entries = entries.filter(e => args.include_ignored || !IGNORED_DIRS.has(e.name)).slice(0, 60);
      for (const e of entries) {
        const full = path.join(dir, e.name);
        lines.push(`${'  '.repeat(depth)}- ${rel(root, full)}${e.isDirectory() ? '/' : ''}`);
        if (e.isDirectory()) visit(full, depth + 1);
        if (lines.length >= maxLines) break;
      }
    }
    visit(root, 0);
    return { line_count: lines.length, lines };
  },
  size_summary(root, args) {
    const entries = walkTree(root, args);
    const files = entries.filter(e => e.type === 'file');
    const dirs = entries.filter(e => e.type === 'dir');
    const totalSize = files.reduce((a,b)=>a+b.size,0);
    return { file_count: files.length, dir_count: dirs.length, total_size: totalSize, by_extension: summarizeByExtension(files).slice(0, 20), top_folders: topFolders(files).slice(0, 20) };
  },
  folder_summary(root, args) {
    const files = listFiles(root, args);
    const groups = {};
    for (const f of files) {
      const top = f.rel.split('/')[0] || '.';
      const g = (groups[top] ||= { folder: top, files: 0, size: 0, source: 0, tests: 0, docs: 0, config: 0, assets: 0 });
      g.files += 1; g.size += f.size;
      if (looksLikeSource(f.path)) g.source += 1;
      if (looksLikeTest(f.path)) g.tests += 1;
      if (looksLikeDoc(f.path)) g.docs += 1;
      if (looksLikeConfig(f.path)) g.config += 1;
      if (looksLikeAsset(f.path)) g.assets += 1;
    }
    const items = Object.values(groups).sort((a,b)=>b.files-a.files);
    return { count: items.length, items: items.slice(0, Number(args.limit || 60)) };
  },
  folder_roles(root, args) {
    const dirs = listDirs(root, args).filter(d => !d.rel.includes('/'));
    const items = dirs.map(d => {
      const name = d.name.toLowerCase();
      let role = 'general';
      if (/src|core|lib|app|server|api|services?/.test(name)) role = 'source/runtime';
      else if (/test|spec/.test(name)) role = 'tests';
      else if (/doc/.test(name)) role = 'documentation';
      else if (/script|bin|tools/.test(name)) role = 'automation/scripts';
      else if (/config|settings/.test(name)) role = 'configuration';
      else if (/public|static|assets|images?/.test(name)) role = 'assets';
      else if (/web|ui|frontend|components?/.test(name)) role = 'ui/frontend';
      else if (/dist|build|out|coverage/.test(name)) role = 'build output';
      return { path: d.rel, role };
    });
    return { count: items.length, items };
  },
  file_candidates(root, args) {
    const items = fileCandidates(root, args.mode, args);
    return { count: items.length, items: items.slice(0, Number(args.limit || 200)) };
  },
  symbol_extract(root, args) {
    const mode = args.mode;
    const targetPath = args.path ? resolveRoot(args.path) : null;
    let files = [];
    if (targetPath && safeStat(targetPath) && safeStat(targetPath).isFile()) files = [{ path: targetPath, rel: rel(root, targetPath) }];
    else {
      if (/js_ts|requires/.test(mode)) files = jsTsFiles(root, args);
      else if (/py/.test(mode)) files = pyFiles(root, args);
      else files = listFiles(root, args).filter(f => isTextPath(f.path));
    }
    const items = [];
    for (const f of files) {
      const text = safeReadText(f.path, 200000);
      const symbols = extractSymbolsFromText(mode, text);
      if (symbols.length) items.push({ path: f.rel, count: symbols.length, symbols: Array.from(new Set(symbols)).slice(0, 100) });
    }
    return { count: items.length, items: items.slice(0, Number(args.limit || 150)) };
  },
  marker_scan(root, args) {
    const marker = String(args.marker || 'TODO').toLowerCase();
    const items = [];
    for (const f of listFiles(root, args)) {
      if (!isTextPath(f.path) || f.size > 200000) continue;
      const lines = safeReadText(f.path, 200000).split(/\r?\n/);
      const hits = [];
      lines.forEach((line, idx) => { if (line.toLowerCase().includes(marker)) hits.push({ line: idx + 1, text: line.trim().slice(0, 240) }); });
      if (hits.length) items.push({ path: f.rel, count: hits.length, hits: hits.slice(0, 25) });
    }
    return { count: items.length, items: items.slice(0, Number(args.limit || 120)) };
  },
  comment_scan(root, args) {
    const mode = args.mode || 'summary';
    const items = [];
    for (const f of listFiles(root, args)) {
      if (!isTextPath(f.path) || f.size > 250000) continue;
      const text = safeReadText(f.path, 250000);
      const lines = text.split(/\r?\n/);
      const commentLines = lines.filter(line => /^\s*(\/\/|#|\*|\/\*|\*\/|<!--)/.test(line)).length;
      if (mode === 'docblocks') {
        const docs = regexMatches(text, /\/\*\*[\s\S]*?\*\//g).slice(0, 10);
        if (docs.length) items.push({ path: f.rel, count: docs.length, items: docs.map(x => x.slice(0, 300)) });
      } else if (commentLines > 0) {
        items.push({ path: f.rel, comment_lines: commentLines, total_lines: lines.length, ratio: Number((commentLines / Math.max(lines.length,1)).toFixed(3)) });
      }
    }
    items.sort((a,b)=> (b.comment_lines || b.count || 0) - (a.comment_lines || a.count || 0));
    return { count: items.length, items: items.slice(0, Number(args.limit || 100)) };
  },
  symbol_summary(root, args) {
    const scope = args.scope || 'project';
    if (scope === 'file' && args.path) {
      const p = resolveRoot(args.path);
      const text = safeReadText(p, 200000);
      const isPy = /\.py$/.test(p);
      return {
        path: rel(root,p),
        functions: extractSymbolsFromText(isPy ? 'functions_py' : 'functions_js_ts', text).slice(0,50),
        classes: extractSymbolsFromText(isPy ? 'classes_py' : 'classes_js_ts', text).slice(0,50),
        imports: extractSymbolsFromText(isPy ? 'imports_py' : 'imports_js_ts', text).slice(0,50)
      };
    }
    const files = scope === 'folder' && args.path ? listFiles(resolveRoot(args.path), args).map(f => ({...f, rel: rel(root, f.path)})) : listFiles(root, args);
    const out = [];
    for (const f of files) {
      if (!/\.(js|jsx|ts|tsx|py|mjs|cjs)$/.test(f.path)) continue;
      const text = safeReadText(f.path, 180000);
      const isPy = /\.py$/.test(f.path);
      out.push({
        path: f.rel,
        functions: extractSymbolsFromText(isPy ? 'functions_py' : 'functions_js_ts', text).length,
        classes: extractSymbolsFromText(isPy ? 'classes_py' : 'classes_js_ts', text).length,
        imports: extractSymbolsFromText(isPy ? 'imports_py' : 'imports_js_ts', text).length
      });
    }
    return { count: out.length, items: out.slice(0, Number(args.limit || 160)) };
  },
  import_graph(root, args) {
    const graph = args.lang === 'py' ? buildPyGraph(root, args) : buildJsGraph(root, args);
    const edges = Object.entries(graph).map(([node, imports]) => ({ path: node, imports }));
    return { node_count: Object.keys(graph).length, edge_count: edges.reduce((a,b)=>a+b.imports.length,0), items: edges.slice(0, Number(args.limit || 200)) };
  },
  unresolved_imports(root, args) {
    if (args.lang === 'py') {
      const files = pyFiles(root, args);
      const fileMap = new Map(files.map(f => [path.basename(f.path, '.py'), true]));
      const items = [];
      for (const f of files) {
        const text = safeReadText(f.path, 200000);
        const imports = extractSymbolsFromText('imports_py', text);
        const unresolved = imports.filter(spec => {
          const key = spec.replace(/^\.+/,'').split('.')[0];
          return key && !fileMap.has(key) && !/^(os|sys|re|json|time|typing|pathlib|collections|itertools|math|subprocess|logging|argparse|unittest|pytest)$/.test(key);
        });
        if (unresolved.length) items.push({ path: f.rel, unresolved: Array.from(new Set(unresolved)).slice(0,50) });
      }
      return { count: items.length, items: items.slice(0, Number(args.limit || 120)) };
    }
    const files = jsTsFiles(root, args);
    const items = [];
    for (const f of files) {
      const text = safeReadText(f.path, 200000);
      const imports = extractSymbolsFromText('imports_js_ts', text).concat(extractSymbolsFromText('requires_js', text));
      const unresolved = imports.filter(spec => spec.startsWith('.') && !resolveJsImport(f.path, spec));
      if (unresolved.length) items.push({ path: f.rel, unresolved: Array.from(new Set(unresolved)) });
    }
    return { count: items.length, items: items.slice(0, Number(args.limit || 120)) };
  },
  graph_analysis(root, args) {
    if (args.mode === 'circular_js_ts') {
      const graph = buildJsGraph(root, args);
      const cycles = findSimpleCycles(graph);
      return { count: cycles.length, items: cycles.slice(0, Number(args.limit || 80)).map(c => ({ cycle: c })) };
    }
    const graph = args.mode.includes('_py') ? buildPyGraph(root, args) : buildJsGraph(root, args);
    const indegree = invertGraph(graph);
    if (args.mode.startsWith('orphans')) {
      const items = Object.keys(graph).filter(n => (indegree[n] || 0) === 0 && !/index|main|app|server|cli|run|start|test|spec/i.test(n)).map(p => ({ path: p, inbound_refs: indegree[p] || 0 }));
      return { count: items.length, items: items.slice(0, Number(args.limit || 120)) };
    }
    if (args.mode === 'unused_exports_js_ts') {
      const files = jsTsFiles(root, args);
      const texts = Object.fromEntries(files.map(f => [f.rel, safeReadText(f.path, 200000)]));
      const allText = Object.values(texts).join('\n');
      const items = [];
      for (const f of files) {
        const exports = extractSymbolsFromText('exports_js_ts', texts[f.rel]);
        const unused = exports.filter(name => {
          const safe = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const uses = (allText.match(new RegExp(`\\b${safe}\\b`, 'g')) || []).length;
          return uses <= 1;
        });
        if (unused.length) items.push({ path: f.rel, unused_exports: unused });
      }
      return { count: items.length, items: items.slice(0, Number(args.limit || 120)) };
    }
    return { count: 0, items: [] };
  },
  pattern_scan(root, args) {
    const mode = args.mode;
    const files = listFiles(root, args).filter(f => isTextPath(f.path));
    if (mode === 'mixed_lang_folders') {
      const map = {};
      for (const f of files) {
        const folder = path.dirname(f.rel);
        const ext = getExt(f.path);
        if (!SOURCE_EXTS.has(ext)) continue;
        (map[folder] ||= new Set()).add(ext);
      }
      const items = Object.entries(map).filter(([,set]) => set.size >= 3).map(([folder,set]) => ({ folder, languages: Array.from(set) })).sort((a,b)=>b.languages.length-a.languages.length);
      return { count: items.length, items: items.slice(0, Number(args.limit || 80)) };
    }
    if (mode === 'duplicate_blocks') {
      const map = {};
      for (const f of files) {
        if (!looksLikeSource(f.path) || f.size > 250000) continue;
        const lines = safeReadText(f.path, 250000).split(/\r?\n/);
        for (const line of lines) {
          const norm = normalizeLine(line);
          if (norm.length < 30) continue;
          (map[norm] ||= new Set()).add(f.rel);
        }
      }
      const items = Object.entries(map).filter(([,set]) => set.size > 1).map(([snippet,set]) => ({ snippet: snippet.slice(0,160), files: Array.from(set) })).sort((a,b)=>b.files.length-a.files.length);
      return { count: items.length, items: items.slice(0, Number(args.limit || 80)) };
    }
    if (mode === 'repeated_strings') {
      const map = {};
      const regex = /['"`]([^'"`\n]{8,120})['"`]/g;
      for (const f of files) {
        if (!looksLikeSource(f.path) || f.size > 250000) continue;
        const text = safeReadText(f.path, 250000);
        let m;
        while ((m = regex.exec(text)) !== null) {
          const s = m[1].trim();
          if (s.length >= 8) (map[s] ||= new Set()).add(f.rel);
        }
      }
      const items = Object.entries(map).filter(([,set]) => set.size > 1).map(([string, set]) => ({ string: string.slice(0,160), files: Array.from(set) })).sort((a,b)=>b.files.length-a.files.length);
      return { count: items.length, items: items.slice(0, Number(args.limit || 80)) };
    }
    const PATTERNS = {
      side_effects: [/process\.exit\(/, /setInterval\(/, /setTimeout\(/, /app\.listen\(/, /server\.listen\(/, /fs\.(writeFile|appendFile|unlink|rm)\(/, /subprocess\.run\(/],
      risky: [/\b(exec|spawn|fork)\(/, /\bunlinkSync?\(/, /\brmSync?\(/, /\brmdirSync?\(/, /\bkill\(/, /writeFileSync?\(/, /chmodSync?\(/, /Remove-Item/i],
      hardcoded_paths: [/[A-Za-z]:\\[^'"`\n]+/, /\/Users\/[^'"`\n]+/, /\/home\/[^'"`\n]+/, /\/var\/[^'"`\n]+/],
      env_usage: [/process\.env\.[A-Za-z0-9_]+/g, /os\.getenv\(['"][A-Za-z0-9_]+['"]\)/g, /ENV\[['"][A-Za-z0-9_]+['"]\]/g],
      console_logs: [/console\.(log|warn|error|debug)\(/g],
      debug_py: [/\bpdb\.set_trace\(/g, /\bbreakpoint\(/g, /\bdebugger\b/g],
      json_schema: [/\$schema/g, /"properties"\s*:/g, /"required"\s*:/g],
      route_files: [/router\./g, /app\.(get|post|put|delete|patch)\(/g, /FastAPI\(/g, /APIRouter\(/g],
      api_strings: [/https?:\/\/[^\s'"`]+/g, /\/api\/[A-Za-z0-9_\/-]+/g, /\/v\d+\/[A-Za-z0-9_\/-]+/g],
      cli_files: [/^#!\/usr\/bin\/env/gm, /process\.argv/g, /\bargparse\b/g, /\bclick\.command\b/g, /\byargs\b/g, /\bcommander\b/g],
      helpers: [/(^|\/)(utils?|helpers?|common|shared|lib)\//i, /(utils?|helpers?|common|shared)/i]
    };
    const items = [];
    for (const f of files) {
      if (mode === 'very_large_files') { if (f.size > Number(args.threshold || 50000)) items.push({ path: f.rel, size: f.size }); continue; }
      if (mode === 'long_lines') {
        const text = safeReadText(f.path, 250000);
        const lines = text.split(/\r?\n/);
        const hits = lines.map((line, idx) => ({ line: idx + 1, len: line.length })).filter(x => x.len > Number(args.threshold || 140));
        if (hits.length) items.push({ path: f.rel, count: hits.length, max_len: Math.max(...hits.map(x=>x.len)) });
        continue;
      }
      if (mode === 'test_targets') {
        if (!looksLikeTest(f.path)) continue;
        const n = path.basename(f.path).replace(/\.(test|spec)\.[^.]+$/,'').replace(/\.[^.]+$/,'');
        items.push({ path: f.rel, likely_target_basename: n });
        continue;
      }
      if (mode === 'code_summary') continue;
      const pats = PATTERNS[mode] || [];
      if (!pats.length) continue;
      const text = safeReadText(f.path, 250000);
      let matches = 0;
      for (const pat of pats) { const m = text.match(pat); matches += m ? m.length : 0; }
      if (matches > 0 || (mode === 'helpers' && /(^|\/)(utils?|helpers?|common|shared|lib)\//i.test(f.rel))) items.push({ path: f.rel, matches });
    }
    if (mode === 'code_summary') {
      const src = files.filter(f => looksLikeSource(f.path));
      return { file_count: src.length, by_extension: summarizeByExtension(src).slice(0,20), entrypoints: handlers.likely_entrypoints(root, args).items.slice(0,10) };
    }
    items.sort((a,b)=> (b.matches || b.size || b.count || 0) - (a.matches || a.size || a.count || 0));
    return { count: items.length, items: items.slice(0, Number(args.limit || 120)) };
  },
  text_stats(root, args) {
    const mode = args.mode;
    const targetPath = args.path ? resolveRoot(args.path) : root;
    if (mode === 'preview' && args.path) {
      const text = safeReadText(targetPath, 200000);
      const lines = text.split(/\r?\n/);
      return { path: rel(root, targetPath), first_lines: lines.slice(0,20), last_lines: lines.slice(-20), line_count: lines.length };
    }
    const files = safeStat(targetPath) && safeStat(targetPath).isFile() ? [{ path: targetPath, rel: rel(root,targetPath), size: safeStat(targetPath).size }] : listFiles(targetPath, args).map(f => ({...f, rel: rel(root, f.path)}));
    const textFiles = files.filter(f => isTextPath(f.path) && f.size <= Number(args.max_size || 250000));
    if (mode === 'keyword_search') {
      const q = String(args.query || '').toLowerCase();
      const items = [];
      for (const f of textFiles) {
        const lines = safeReadText(f.path, 250000).split(/\r?\n/);
        const hits = [];
        lines.forEach((line, idx) => { if (line.toLowerCase().includes(q)) hits.push({ line: idx+1, text: line.trim().slice(0,240) }); });
        if (hits.length) items.push({ path: f.rel, count: hits.length, hits: hits.slice(0,20) });
      }
      return { count: items.length, items: items.slice(0, Number(args.limit || 80)) };
    }
    if (mode === 'regex_search') {
      const re = new RegExp(String(args.pattern || ''), 'g');
      const items = [];
      for (const f of textFiles) {
        const lines = safeReadText(f.path, 250000).split(/\r?\n/);
        const hits = [];
        lines.forEach((line, idx) => { if (re.test(line)) hits.push({ line: idx+1, text: line.trim().slice(0,240) }); re.lastIndex = 0; });
        if (hits.length) items.push({ path: f.rel, count: hits.length, hits: hits.slice(0,20) });
      }
      return { count: items.length, items: items.slice(0, Number(args.limit || 80)) };
    }
    if (mode === 'phrase_frequency') {
      const phrase = String(args.phrase || '').toLowerCase();
      let total = 0;
      const items = [];
      for (const f of textFiles) {
        const text = safeReadText(f.path, 250000).toLowerCase();
        const safe = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const count = (text.match(new RegExp(safe, 'g')) || []).length;
        if (count) { total += count; items.push({ path: f.rel, count }); }
      }
      items.sort((a,b)=>b.count-a.count);
      return { total, count: items.length, items: items.slice(0, Number(args.limit || 80)) };
    }
    if (mode === 'top_words' || mode === 'top_identifiers') {
      const counts = {};
      for (const f of textFiles.slice(0, Number(args.file_limit || 500))) {
        const tokens = mode === 'top_words' ? tokenizeWords(safeReadText(f.path, 150000)) : (safeReadText(f.path, 150000).match(/[A-Za-z_][A-Za-z0-9_]{2,}/g) || []);
        for (const t of tokens) counts[t] = (counts[t] || 0) + 1;
      }
      const items = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0, Number(args.limit || 80)).map(([token,count])=>({token,count}));
      return { count: items.length, items };
    }
    if (mode === 'line_counts') {
      const items = textFiles.map(f => ({ path: f.rel, lines: countLines(safeReadText(f.path, 200000)) })).sort((a,b)=>b.lines-a.lines);
      return { count: items.length, items: items.slice(0, Number(args.limit || 100)) };
    }
    return { count: 0, items: [] };
  },
  docs_scan(root, args) {
    const mode = args.mode;
    const files = listFiles(root, args);
    let docs = files.filter(f => looksLikeDoc(f.path));
    if (mode === 'headings') {
      const items = docs.map(f => ({ path: f.rel, headings: headingFromMarkdown(safeReadText(f.path, 150000)).slice(0,30) })).filter(x => x.headings.length);
      return { count: items.length, items: items.slice(0, Number(args.limit || 80)) };
    }
    if (mode === 'links') {
      const items = docs.map(f => ({ path: f.rel, links: regexMatches(safeReadText(f.path, 150000), /\[[^\]]+\]\(([^)]+)\)/g, m => m[1]).slice(0,40) })).filter(x => x.links.length);
      return { count: items.length, items: items.slice(0, Number(args.limit || 80)) };
    }
    if (mode === 'readmes') docs = docs.filter(f => /readme/i.test(path.basename(f.path)));
    if (mode === 'changelogs') docs = docs.filter(f => /change|history|release/i.test(path.basename(f.path)));
    if (mode === 'licenses') docs = docs.filter(f => /license|copying|notice/i.test(path.basename(f.path)));
    if (mode === 'md_todos') {
      const items = [];
      for (const f of docs.filter(x => /\.mdx?$/.test(x.path))) {
        const lines = safeReadText(f.path, 150000).split(/\r?\n/);
        const hits = lines.map((line, idx) => ({ line: idx+1, text: line.trim() })).filter(x => /todo/i.test(x.text));
        if (hits.length) items.push({ path: f.rel, count: hits.length, hits: hits.slice(0,25) });
      }
      return { count: items.length, items: items.slice(0, Number(args.limit || 80)) };
    }
    const items = docs.map(f => ({ path: f.rel, lines: countLines(safeReadText(f.path, 120000)), first_heading: headingFromMarkdown(safeReadText(f.path, 120000))[0] || '' }));
    return { count: items.length, items: items.slice(0, Number(args.limit || 80)) };
  },
  typed_file_summary(root, args) {
    const mode = args.mode;
    const files = listFiles(root, args);
    function parseJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; } }
    if (mode === 'package_json') {
      const items = files.filter(f => path.basename(f.path) === 'package.json').map(f => {
        const data = parseJson(f.path) || {};
        return { path: f.rel, name: data.name || '', scripts: Object.keys(data.scripts || {}), dependencies: Object.keys(data.dependencies || {}).length, dev_dependencies: Object.keys(data.devDependencies || {}).length };
      });
      return { count: items.length, items };
    }
    if (mode === 'tsconfig') {
      const items = files.filter(f => /tsconfig.*\.json$/i.test(path.basename(f.path))).map(f => {
        const data = parseJson(f.path) || {};
        const co = data.compilerOptions || {};
        return { path: f.rel, baseUrl: co.baseUrl || '', paths: Object.keys(co.paths || {}), outDir: co.outDir || '' };
      });
      return { count: items.length, items };
    }
    if (mode === 'pyproject') {
      const items = files.filter(f => path.basename(f.path) === 'pyproject.toml').map(f => {
        const text = safeReadText(f.path, 120000);
        return { path: f.rel, has_project: /\[project\]/.test(text), has_poetry: /\[tool\.poetry\]/.test(text), dependencies_hint: regexMatches(text, /^\s*[A-Za-z0-9_.-]+\s*=\s*["'][^"']+["']/gm).slice(0, 20) };
      });
      return { count: items.length, items };
    }
    if (mode === 'env_example') {
      const items = files.filter(f => /^\.env(\.example|\.sample|\.template)?$/i.test(path.basename(f.path))).map(f => {
        const keys = safeReadText(f.path, 120000).split(/\r?\n/).map(x => x.trim()).filter(x => /^[A-Za-z_][A-Za-z0-9_]*=/.test(x)).map(x => x.split('=')[0]);
        return { path: f.rel, keys: keys.slice(0, 100), key_count: keys.length };
      });
      return { count: items.length, items };
    }
    if (mode === 'csv') {
      const items = files.filter(f => /\.csv$/i.test(f.path)).map(f => {
        const lines = safeReadText(f.path, 120000).split(/\r?\n/).filter(Boolean);
        return { path: f.rel, rows: Math.max(lines.length - 1, 0), header: (lines[0] || '').split(',').slice(0, 40) };
      });
      return { count: items.length, items };
    }
    if (mode === 'json') {
      const items = files.filter(f => /\.json$/i.test(f.path) && !/package-lock\.json$/i.test(f.path)).map(f => {
        const data = parseJson(f.path);
        let keys = [];
        if (data && typeof data === 'object' && !Array.isArray(data)) keys = Object.keys(data);
        return { path: f.rel, top_keys: keys.slice(0, 40), key_count: keys.length };
      });
      return { count: items.length, items: items.slice(0, Number(args.limit || 100)) };
    }
    if (mode === 'yaml') {
      const items = files.filter(f => /\.(ya?ml)$/i.test(f.path)).map(f => {
        const keys = safeReadText(f.path, 120000).split(/\r?\n/).map(x => x.match(/^([A-Za-z0-9_-]+):/)).filter(Boolean).map(m => m[1]);
        return { path: f.rel, top_keys: Array.from(new Set(keys)).slice(0, 40), key_count: Array.from(new Set(keys)).length };
      });
      return { count: items.length, items };
    }
    return { count: 0, items: [] };
  },
  brief_generate(root, args) {
    const mode = args.mode || 'repo';
    if (mode === 'file' && args.path) {
      const p = resolveRoot(args.path);
      const basic = summarizeFileBasics(p, root);
      const text = safeReadText(p, 120000);
      const isPy = /\.py$/.test(p);
      basic.symbols = {
        functions: extractSymbolsFromText(isPy ? 'functions_py' : 'functions_js_ts', text).slice(0, 20),
        classes: extractSymbolsFromText(isPy ? 'classes_py' : 'classes_js_ts', text).slice(0, 20),
        imports: extractSymbolsFromText(isPy ? 'imports_py' : 'imports_js_ts', text).slice(0, 20)
      };
      basic.top_words = Object.entries(wordCounts([text])).sort((a,b)=>b[1]-a[1]).slice(0, 15).map(([word,count])=>({word,count}));
      return basic;
    }
    if (mode === 'folder') {
      const folder = resolveRoot(args.path || '.');
      const files = listFiles(folder, args).map(f => ({...f, rel: rel(root, f.path)}));
      return {
        folder: rel(root, folder),
        file_count: files.length,
        by_extension: summarizeByExtension(files).slice(0, 20),
        top_files: files.sort((a,b)=>b.size-a.size).slice(0, 15).map(f => ({ path: f.rel, size: f.size })),
        entrypoints: handlers.likely_entrypoints(folder, args).items.slice(0, 10)
      };
    }
    const size = handlers.size_summary(root, args);
    const entry = handlers.likely_entrypoints(root, args);
    const deps = handlers.config_scan(root, { ...args, mode: 'lockfiles' });
    return { root: root, file_count: size.file_count, dir_count: size.dir_count, by_extension: size.by_extension.slice(0, 12), top_folders: size.top_folders.slice(0, 12), likely_entrypoints: entry.items.slice(0, 12), lockfiles: deps.items || [] };
  },
  report_generate(root, args) {
    const mode = args.mode;
    const report = { mode, root: rel(root, root), generated_at: new Date().toISOString() };
    if (mode === 'context_pack') {
      report.repo = handlers.brief_generate(root, { mode: 'repo', ...args });
      report.entrypoints = handlers.likely_entrypoints(root, args).items.slice(0, 15);
      report.top_configs = handlers.likely_root_configs(root, args).items.slice(0, 20);
      report.top_folders = handlers.folder_summary(root, args).items.slice(0, 20);
    } else if (mode === 'low_token_pack') {
      report.repo = handlers.brief_generate(root, { mode: 'repo', ...args });
      report.features = handlers.report_generate(root, { mode: 'feature_guess_map', ...args }).features;
      report.entrypoints = handlers.likely_entrypoints(root, args).items.slice(0, 8);
      report.package_managers = (handlers.config_scan(root, { mode: 'lockfiles', ...args }).items || []).map(x => x.kind);
    } else if (mode === 'tooling_manifest') {
      report.package_json = handlers.typed_file_summary(root, { mode: 'package_json', ...args }).items;
      report.npm_scripts = handlers.config_scan(root, { mode: 'npm_scripts', ...args }).items;
      report.docker = handlers.config_scan(root, { mode: 'dockerfiles', ...args }).items;
      report.ci = handlers.config_scan(root, { mode: 'ci_files', ...args }).items;
    } else if (mode === 'entrypoint_pack') {
      report.entrypoints = handlers.likely_entrypoints(root, args).items;
      report.cli_candidates = handlers.pattern_scan(root, { mode: 'cli_files', ...args }).items;
      report.root_configs = handlers.likely_root_configs(root, args).items;
    } else if (mode === 'dependency_pack') {
      report.package_names = handlers.config_scan(root, { mode: 'package_names', ...args }).items;
      report.dependencies = handlers.config_scan(root, { mode: 'dependencies', ...args }).items;
      report.dev_dependencies = handlers.config_scan(root, { mode: 'dev_dependencies', ...args }).items;
      report.python = handlers.config_scan(root, { mode: 'python_requirements', ...args }).items;
      report.lockfiles = handlers.config_scan(root, { mode: 'lockfiles', ...args }).items;
    } else if (mode === 'docs_pack') {
      report.readmes = handlers.docs_scan(root, { mode: 'readmes', ...args }).items;
      report.changelogs = handlers.docs_scan(root, { mode: 'changelogs', ...args }).items;
      report.licenses = handlers.docs_scan(root, { mode: 'licenses', ...args }).items;
      report.headings = handlers.docs_scan(root, { mode: 'headings', ...args }).items.slice(0, 30);
    } else if (mode === 'test_pack') {
      report.tests = handlers.inventory_scan(root, { mode: 'list', filter_kind: 'test', ...args }).items || [];
      report.gaps = handlers.quality_scan(root, { mode: 'test_gaps', ...args }).items || [];
      report.targets = handlers.pattern_scan(root, { mode: 'test_targets', ...args }).items || [];
    } else if (mode === 'cleanup_report') {
      report.empty_files = handlers.empties(root, { target: 'files', ...args }).items || [];
      report.empty_directories = handlers.empties(root, { target: 'dirs', ...args }).items || [];
      report.duplicate_filenames = handlers.duplicate_names(root, { mode: 'filename', ...args }).groups || [];
      report.generated_candidates = handlers.file_candidates(root, { mode: 'generated', ...args }).items || [];
      report.minified_candidates = handlers.file_candidates(root, { mode: 'minified', ...args }).items || [];
    } else if (mode === 'portability_report') {
      report.hardcoded_paths = handlers.pattern_scan(root, { mode: 'hardcoded_paths', ...args }).items || [];
      report.env_usage = handlers.pattern_scan(root, { mode: 'env_usage', ...args }).items || [];
      report.docker = handlers.config_scan(root, { mode: 'dockerfiles', ...args }).items || [];
      report.ci = handlers.config_scan(root, { mode: 'ci_files', ...args }).items || [];
      report.lockfiles = handlers.config_scan(root, { mode: 'lockfiles', ...args }).items || [];
    } else if (mode === 'script_registry_template') {
      report.template = { id: "tool_id_here", title: "Human title", description: "One clear sentence.", category: "repo|code|system|text", tags: ["tag1","tag2"], intent_examples: ["find X","summarize Y"], inputs: { path: "string", limit: "number optional" }, outputs: { items: "array" }, side_effects: [], risk_level: "low", requires_confirmation: false, entrypoint: "scripts/category/tool_id_here.js" };
    } else if (mode === 'coder_handoff') {
      report.repo = handlers.brief_generate(root, { mode: 'repo', ...args });
      report.entrypoints = handlers.likely_entrypoints(root, args).items.slice(0, 15);
      report.top_folders = handlers.folder_summary(root, args).items.slice(0, 20);
      report.docs = handlers.docs_scan(root, { mode: 'readmes', ...args }).items.slice(0, 20);
      report.gaps = handlers.quality_scan(root, { mode: 'test_gaps', ...args }).items.slice(0, 20);
      report.risks = handlers.pattern_scan(root, { mode: 'risky', ...args }).items.slice(0, 20);
    } else if (mode === 'runtime_surface_map') {
      report.entrypoints = handlers.likely_entrypoints(root, args).items;
      report.route_files = handlers.pattern_scan(root, { mode: 'route_files', ...args }).items;
      report.cli = handlers.pattern_scan(root, { mode: 'cli_files', ...args }).items;
      report.services = handlers.folder_roles(root, args).items.filter(x => /source\/runtime|ui\/frontend/.test(x.role));
    } else if (mode === 'feature_guess_map') {
      const top = handlers.folder_summary(root, args).items.slice(0, 25);
      report.features = top.map(item => {
        let guess = 'general';
        const name = item.folder.toLowerCase();
        if (/auth/.test(name)) guess = 'authentication';
        else if (/task|queue|job/.test(name)) guess = 'tasks/workflows';
        else if (/api|server|route/.test(name)) guess = 'backend/api';
        else if (/ui|web|frontend|component/.test(name)) guess = 'ui/frontend';
        else if (/db|model|schema/.test(name)) guess = 'data/models';
        else if (/test|spec/.test(name)) guess = 'tests';
        else if (/doc/.test(name)) guess = 'documentation';
        return { folder: item.folder, guess };
      });
    } else if (mode === 'path_alias_report') {
      report.ts_paths = handlers.config_scan(root, { mode: 'ts_paths', ...args }).items;
      report.import_aliases = handlers.config_scan(root, { mode: 'import_aliases', ...args }).items;
    } else if (mode === 'machine_context_index') {
      report.index = { root: root, size: handlers.size_summary(root, args), entrypoints: handlers.likely_entrypoints(root, args).items.slice(0, 12), packages: handlers.config_scan(root, { mode: 'package_names', ...args }).items, docs: handlers.docs_scan(root, { mode: 'readmes', ...args }).items.slice(0, 20) };
    } else {
      report.repo = handlers.brief_generate(root, { mode: 'repo', ...args });
    }
    if (args.output) {
      fs.writeFileSync(resolveRoot(args.output), JSON.stringify(report, null, 2), 'utf8');
      report.written_to = resolveRoot(args.output);
    }
    return report;
  },
  config_scan(root, args) {
    const mode = args.mode;
    const files = listFiles(root, { ...args, include_ignored: true });
    function parseJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; } }
    if (mode === 'package_names') return { count: files.filter(f => path.basename(f.path) === 'package.json').length, items: files.filter(f => path.basename(f.path) === 'package.json').map(f => ({ path: f.rel, name: (parseJson(f.path) || {}).name || '' })) };
    if (mode === 'dependencies' || mode === 'dev_dependencies') {
      const key = mode === 'dependencies' ? 'dependencies' : 'devDependencies';
      const items = files.filter(f => path.basename(f.path) === 'package.json').map(f => {
        const data = parseJson(f.path) || {};
        const deps = Object.keys(data[key] || {});
        return { path: f.rel, count: deps.length, deps: deps.slice(0, 120) };
      });
      return { count: items.length, items };
    }
    if (mode === 'workspace_packages') {
      const items = files.filter(f => path.basename(f.path) === 'package.json').map(f => {
        const data = parseJson(f.path) || {};
        return { path: f.rel, workspaces: data.workspaces || null, private: !!data.private };
      }).filter(x => x.workspaces);
      return { count: items.length, items };
    }
    if (mode === 'npm_scripts') {
      const items = files.filter(f => path.basename(f.path) === 'package.json').map(f => ({ path: f.rel, scripts: (parseJson(f.path) || {}).scripts || {} })).filter(x => Object.keys(x.scripts).length);
      return { count: items.length, items };
    }
    if (mode === 'ts_paths') {
      const items = files.filter(f => /tsconfig.*\.json$/i.test(path.basename(f.path))).map(f => {
        const data = parseJson(f.path) || {};
        const co = data.compilerOptions || {};
        return { path: f.rel, baseUrl: co.baseUrl || '', paths: co.paths || {} };
      }).filter(x => x.baseUrl || Object.keys(x.paths).length);
      return { count: items.length, items };
    }
    if (mode === 'python_requirements') {
      const items = files.filter(f => /requirements.*\.txt$|pyproject\.toml$|setup\.py$|Pipfile$/i.test(path.basename(f.path))).map(f => {
        const lines = safeReadText(f.path, 120000).split(/\r?\n/).filter(x => x.trim() && !x.trim().startsWith('#')).slice(0, 100);
        return { path: f.rel, entries: lines };
      });
      return { count: items.length, items };
    }
    if (mode === 'dockerfiles') {
      const items = files.filter(f => /^dockerfile/i.test(path.basename(f.path))).map(f => ({ path: f.rel, from: (safeReadText(f.path, 60000).match(/^FROM\s+([^\s]+)/mi) || [,''])[1] }));
      return { count: items.length, items };
    }
    if (mode === 'ci_files') {
      const items = files.filter(f => /(^|\/)\.github\/workflows\/.+\.ya?ml$|\.gitlab-ci\.yml$|azure-pipelines\.ya?ml$|circleci/i.test(f.rel)).map(f => ({ path: f.rel }));
      return { count: items.length, items };
    }
    if (mode === 'env_files') {
      const items = files.filter(f => /^\.env(\.|$)/i.test(path.basename(f.path))).map(f => {
        const keys = safeReadText(f.path, 120000).split(/\r?\n/).map(x => x.trim()).filter(x => /^[A-Za-z_][A-Za-z0-9_]*=/.test(x)).map(x => x.split('=')[0]);
        return { path: f.rel, key_count: keys.length, keys: keys.slice(0, 50) };
      });
      return { count: items.length, items };
    }
    if (mode === 'gitignore') {
      const items = files.filter(f => path.basename(f.path) === '.gitignore').map(f => ({ path: f.rel, patterns: safeReadText(f.path, 120000).split(/\r?\n/).map(x => x.trim()).filter(x => x && !x.startsWith('#')).slice(0, 200) }));
      return { count: items.length, items };
    }
    if (mode === 'lockfiles') {
      const items = files.filter(f => /package-lock\.json$|pnpm-lock\.yaml$|yarn\.lock$|poetry\.lock$|Pipfile\.lock$|Cargo\.lock$|uv\.lock$/i.test(path.basename(f.path))).map(f => {
        let kind = 'unknown';
        const b = path.basename(f.path).toLowerCase();
        if (b === 'package-lock.json') kind = 'npm';
        else if (b === 'pnpm-lock.yaml') kind = 'pnpm';
        else if (b === 'yarn.lock') kind = 'yarn';
        else if (b === 'poetry.lock') kind = 'poetry';
        else if (b === 'pipfile.lock') kind = 'pipenv';
        else if (b === 'cargo.lock') kind = 'cargo';
        else if (b === 'uv.lock') kind = 'uv';
        return { path: f.rel, kind };
      });
      return { count: items.length, items };
    }
    if (mode === 'import_aliases') {
      const items = [];
      for (const f of jsTsFiles(root, args)) {
        const text = safeReadText(f.path, 150000);
        const aliases = [...regexMatches(text, /from\s+['"](@\/[^'"]+)['"]/g, m => m[1]), ...regexMatches(text, /from\s+['"](~\/[^'"]+)['"]/g, m => m[1])];
        if (aliases.length) items.push({ path: f.rel, aliases: Array.from(new Set(aliases)) });
      }
      return { count: items.length, items };
    }
    if (mode === 'versions') {
      const items = [];
      for (const f of files.filter(f => looksLikeConfig(f.path) && f.size < 150000)) {
        const versions = regexMatches(safeReadText(f.path, 150000), /\b\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?\b/g).slice(0, 30);
        if (versions.length) items.push({ path: f.rel, versions: Array.from(new Set(versions)) });
      }
      return { count: items.length, items: items.slice(0, Number(args.limit || 100)) };
    }
    if (mode === 'ports') {
      const items = [];
      for (const f of files.filter(f => isTextPath(f.path) && f.size < 150000)) {
        const text = safeReadText(f.path, 150000);
        const ports = regexMatches(text, /\b(?:port|listen|localhost:)(?:["'=:\s(]*)(\d{2,5})\b/gi, m => m[1]);
        if (ports.length) items.push({ path: f.rel, ports: Array.from(new Set(ports)) });
      }
      return { count: items.length, items: items.slice(0, Number(args.limit || 100)) };
    }
    return { count: 0, items: [] };
  },
  git_scan(root, args) {
    const mode = args.mode || 'status';
    if (mode === 'status') return runGit(root, ['status', '--short', '--branch']);
    if (mode === 'branch') return runGit(root, ['branch', '-vv']);
    if (mode === 'recent_commits') return runGit(root, ['log', '--oneline', '-n', String(args.limit || 20)]);
    if (mode === 'changed_files') return runGit(root, ['diff', '--name-only']);
    if (mode === 'untracked') return runGit(root, ['ls-files', '--others', '--exclude-standard']);
    return { ok: false, error: 'Unsupported git mode' };
  },
  quality_scan(root, args) {
    const mode = args.mode;
    const files = listFiles(root, args);
    if (mode === 'filename_case') {
      function classify(name) {
        const stem = name.replace(/\.[^.]+$/,'');
        if (/^[a-z0-9]+(?:_[a-z0-9]+)+$/.test(stem)) return 'snake_case';
        if (/^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(stem)) return 'kebab-case';
        if (/^[a-z]+(?:[A-Z][a-z0-9]+)+$/.test(stem)) return 'camelCase';
        if (/^[A-Z][A-Za-z0-9]+(?:[A-Z][A-Za-z0-9]+)*$/.test(stem)) return 'PascalCase';
        if (/^\.[a-z0-9_.-]+$/.test(name)) return 'dotfile';
        return 'mixed';
      }
      const counts = {};
      for (const f of files) counts[classify(f.name)] = (counts[classify(f.name)] || 0) + 1;
      return { items: Object.entries(counts).map(([style,count])=>({style,count})).sort((a,b)=>b.count-a.count) };
    }
    if (mode === 'suspicious_names') {
      const items = files.filter(f => /(copy|backup|bak|old|new|final|final2|tmp|temp|conflict)/i.test(f.name)).map(f => ({ path: f.rel }));
      return { count: items.length, items: items.slice(0, Number(args.limit || 120)) };
    }
    if (mode === 'duplicate_basename_ext') {
      const map = {};
      for (const f of files) {
        const stem = path.basename(f.path, getExt(f.path)).toLowerCase();
        (map[stem] ||= []).push({ path: f.rel, ext: getExt(f.path) || '[no_ext]' });
      }
      const items = Object.entries(map).filter(([,arr]) => new Set(arr.map(x=>x.ext)).size > 1).map(([basename, variants]) => ({ basename, variants })).sort((a,b)=>b.variants.length-a.variants.length);
      return { count: items.length, items: items.slice(0, Number(args.limit || 100)) };
    }
    if (mode === 'duplicate_folder_names') {
      const dirs = listDirs(root, args);
      const map = {};
      for (const d of dirs) (map[d.name.toLowerCase()] ||= []).push(d.rel);
      const items = Object.entries(map).filter(([,arr]) => arr.length > 1).map(([name, paths]) => ({ name, paths })).sort((a,b)=>b.paths.length-a.paths.length);
      return { count: items.length, items: items.slice(0, Number(args.limit || 100)) };
    }
    if (mode === 'folder_depth') {
      const dirs = listDirs(root, args);
      const depths = dirs.map(d => d.rel === '.' ? 0 : d.rel.split('/').length);
      const avg = depths.length ? depths.reduce((a,b)=>a+b,0)/depths.length : 0;
      return { dir_count: dirs.length, max_depth: Math.max(0, ...depths), avg_depth: Number(avg.toFixed(2)) };
    }
    if (mode === 'age_buckets') {
      const now = Date.now();
      const buckets = { '<7d':0, '7-30d':0, '30-90d':0, '90-365d':0, '>365d':0 };
      for (const f of files) {
        const days = (now - f.mtimeMs) / 86400000;
        if (days < 7) buckets['<7d'] += 1;
        else if (days < 30) buckets['7-30d'] += 1;
        else if (days < 90) buckets['30-90d'] += 1;
        else if (days < 365) buckets['90-365d'] += 1;
        else buckets['>365d'] += 1;
      }
      return { buckets };
    }
    if (mode === 'line_length_percentiles') {
      const lengths = [];
      for (const f of files.filter(f => isTextPath(f.path)).slice(0, Number(args.file_limit || 400))) safeReadText(f.path, 150000).split(/\r?\n/).forEach(line => lengths.push(line.length));
      lengths.sort((a,b)=>a-b);
      function pct(p) { if (!lengths.length) return 0; return lengths[Math.min(lengths.length - 1, Math.floor((p / 100) * lengths.length))]; }
      return { count: lengths.length, p50: pct(50), p90: pct(90), p95: pct(95), p99: pct(99), max: lengths[lengths.length - 1] || 0 };
    }
    if (mode === 'import_density') {
      const items = [];
      for (const f of files.filter(f => /\.(js|jsx|ts|tsx|py|mjs|cjs)$/.test(f.path) && f.size < 200000)) {
        const text = safeReadText(f.path, 200000);
        const imports = (text.match(/^\s*(import|from|require\()/gm) || []).length;
        const lines = countLines(text);
        items.push({ path: f.rel, imports, lines, ratio: Number((imports / Math.max(lines,1)).toFixed(3)) });
      }
      items.sort((a,b)=>b.ratio-a.ratio);
      return { count: items.length, items: items.slice(0, Number(args.limit || 80)) };
    }
    if (mode === 'comment_density') {
      const items = [];
      for (const f of files.filter(f => /\.(js|jsx|ts|tsx|py|mjs|cjs|java|go|rs|sh)$/.test(f.path) && f.size < 200000)) {
        const lines = safeReadText(f.path, 200000).split(/\r?\n/);
        const commentLines = lines.filter(line => /^\s*(\/\/|#|\/\*|\*|\*\/)/.test(line)).length;
        items.push({ path: f.rel, lines: lines.length, comment_lines: commentLines, ratio: Number((commentLines / Math.max(lines.length,1)).toFixed(3)) });
      }
      items.sort((a,b)=>b.ratio-a.ratio);
      return { count: items.length, items: items.slice(0, Number(args.limit || 80)) };
    }
    if (mode === 'test_gaps') {
      const filesByTop = {};
      for (const f of files) {
        const top = f.rel.split('/')[0] || '.';
        const g = (filesByTop[top] ||= { folder: top, source: 0, tests: 0 });
        if (looksLikeSource(f.path)) g.source += 1;
        if (looksLikeTest(f.path)) g.tests += 1;
      }
      const items = Object.values(filesByTop).filter(x => x.source >= 5 && x.tests === 0).sort((a,b)=>b.source-a.source);
      return { count: items.length, items: items.slice(0, Number(args.limit || 60)) };
    }
    return { count: 0, items: [] };
  }
};

function finish(toolId, root, args, payload) { return { ok: true, tool_id: toolId, root, args, ...payload }; }
function runTool(toolId, cliArgs) {
  const tool = toolMap[toolId];
  if (!tool) {
    console.error(JSON.stringify({ ok: false, error: `Unknown tool: ${toolId}` }, null, 2));
    process.exit(1);
  }
  const args = { ...(tool.defaults || {}), ...(cliArgs || parseArgs(process.argv.slice(3))) };
  const root = resolveRoot(args.path || '.');
  const handler = handlers[tool.handler];
  if (!handler) {
    console.error(JSON.stringify({ ok: false, error: `Missing handler: ${tool.handler}` }, null, 2));
    process.exit(1);
  }
  try {
    const payload = handler(root, args, tool);
    console.log(JSON.stringify(finish(toolId, root, args, payload), null, 2));
  } catch (err) {
    console.error(JSON.stringify({ ok: false, tool_id: toolId, error: err.message, stack: err.stack }, null, 2));
    process.exit(1);
  }
}
function runToolByCli() {
  const toolId = process.argv[2];
  if (!toolId) {
    console.log(JSON.stringify({ ok: true, usage: "node run-tool.js <tool_id> [--path .] [--limit 20]", tool_count: toolIndex.length, sample_tools: toolIndex.slice(0, 12).map(t => t.id) }, null, 2));
    return;
  }
  runTool(toolId, parseArgs(process.argv.slice(3)));
}
module.exports = { runTool, runToolByCli };
