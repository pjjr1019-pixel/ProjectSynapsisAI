const fs = require('fs');
const path = require('path');

// PACK_ROOT: taskmanager/ (3 levels up from taskmanager/brain/scripts/lib/)
const PACK_ROOT = path.resolve(__dirname, '..', '..', '..');
const DEFAULT_REPO_ROOT = path.resolve(PACK_ROOT, '..');
const OUTPUT_DIR_NAME = '.ai_repo';

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      if (eq !== -1) {
        out[arg.slice(2, eq)] = arg.slice(eq + 1);
      } else {
        const next = argv[i + 1];
        if (next && !next.startsWith('--')) {
          out[arg.slice(2)] = next;
          i += 1;
        } else {
          out[arg.slice(2)] = true;
        }
      }
    } else {
      out._.push(arg);
    }
  }
  return out;
}

function normalize(relPath) {
  return relPath.split(path.sep).join('/');
}

function detectRepoRoot(cliArgs = {}) {
  if (cliArgs.repo) {
    return path.resolve(cliArgs.repo);
  }
  if (process.env.REPO_ROOT) {
    return path.resolve(process.env.REPO_ROOT);
  }
  return DEFAULT_REPO_ROOT;
}

function loadConfig() {
  const configPath = path.join(PACK_ROOT, 'config', 'horizons-ai.defaults.json');
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function outputDir(repoRoot) {
  return path.join(repoRoot, OUTPUT_DIR_NAME);
}

function writeRepoFile(repoRoot, relativePath, content) {
  const filePath = path.join(repoRoot, relativePath);
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

function safeReadText(filePath, maxBytes = 200000) {
  try {
    const stat = fs.statSync(filePath);
    const size = Math.min(stat.size, maxBytes);
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(size);
    fs.readSync(fd, buffer, 0, size, 0);
    fs.closeSync(fd);
    return buffer.toString('utf8');
  } catch (error) {
    return '';
  }
}

function listAllEntries(repoRoot, options = {}) {
  const skipPackFolder = options.skipPackFolder !== false;
  const skipOutputDir = options.skipOutputDir !== false;
  const packFolderName = path.basename(PACK_ROOT);
  const out = [];
  const stack = [{ abs: repoRoot, rel: '.', depth: 0 }];
  const unreadable = [];

  while (stack.length) {
    const current = stack.pop();
    let stat;
    try {
      stat = fs.statSync(current.abs);
    } catch (error) {
      unreadable.push({ path: current.rel, error: error.message });
      continue;
    }

    const isDirectory = stat.isDirectory();
    out.push({
      abs: current.abs,
      rel: current.rel,
      depth: current.depth,
      name: current.rel === '.' ? path.basename(repoRoot) : path.basename(current.abs),
      type: isDirectory ? 'directory' : 'file',
      size: stat.size,
      mtimeMs: stat.mtimeMs
    });

    if (!isDirectory) continue;

    let names;
    try {
      names = fs.readdirSync(current.abs).sort((a, b) => a.localeCompare(b));
    } catch (error) {
      unreadable.push({ path: current.rel, error: error.message });
      continue;
    }

    for (let i = names.length - 1; i >= 0; i -= 1) {
      const name = names[i];
      if (skipPackFolder && current.rel === '.' && name === packFolderName) continue;
      if (skipOutputDir && current.rel === '.' && name === OUTPUT_DIR_NAME) continue;
      const abs = path.join(current.abs, name);
      const rel = current.rel === '.' ? normalize(name) : normalize(path.join(current.rel, name));
      stack.push({ abs, rel, depth: current.depth + 1 });
    }
  }

  return { entries: out, unreadable };
}

function pathStartsWith(relPath, prefixes = []) {
  return prefixes.some((prefix) => {
    if (!prefix) return false;
    const normalizedPrefix = prefix.replace(/\\/g, '/');
    return relPath === normalizedPrefix || relPath.startsWith(normalizedPrefix);
  });
}

function classifyPath(relPath, config) {
  const rel = relPath.replace(/\\/g, '/');
  if (rel === '.') return 'root';
  if (pathStartsWith(rel, config.generatedPrefixes)) return 'generated';
  if (pathStartsWith(rel, config.lowValuePrefixes)) return 'low-value';
  if (pathStartsWith(rel, config.highValuePrefixes)) return 'high-value';
  if (pathStartsWith(rel, config.docPrefixes)) return 'docs';
  return 'neutral';
}

function isLikelyCode(relPath) {
  return ['.js', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts', '.jsx'].includes(path.extname(relPath).toLowerCase());
}

function isLikelyText(relPath, size) {
  const ext = path.extname(relPath).toLowerCase();
  const textExts = new Set([
    '.js','.mjs','.cjs','.ts','.tsx','.mts','.cts','.jsx',
    '.json','.jsonl','.md','.txt','.css','.html','.htm',
    '.yml','.yaml','.xml','.csv','.cmd','.ps1','.sh','.env',
    '.gitignore','.gitattributes','.d.ts','.d.mts'
  ]);
  if (textExts.has(ext)) return true;
  if (!ext && size < 200000) return true;
  return false;
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9/_\-.]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function scorePathForTask(relPath, task, config) {
  const rel = relPath.toLowerCase();
  const tokens = tokenize(task);
  let score = 0;

  for (const token of tokens) {
    if (token.length < 2) continue;
    if (rel.includes(token)) score += 4;
    const basename = path.basename(rel);
    if (basename.includes(token)) score += 6;
  }

  const classification = classifyPath(relPath, config);
  if (classification === 'high-value') score += 20;
  if (classification === 'docs') score += 6;
  if (classification === 'generated') score -= 25;
  if (classification === 'low-value') score -= 15;
  if (isLikelyCode(relPath)) score += 8;

  if (/read_first|readme|package\.json|main|app|index|server|core|runtime|task-manager|optimizer|brain/i.test(relPath)) {
    score += 3;
  }

  return score;
}

function topN(items, n, scoreKey = 'score') {
  return [...items].sort((a, b) => (b[scoreKey] - a[scoreKey]) || a.rel.localeCompare(b.rel)).slice(0, n);
}

function renderList(items, formatter) {
  return items.map(formatter).join('\n');
}

function nowIso() {
  return new Date().toISOString();
}

function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

function collectDirectoryFileCounts(entries) {
  const fileCounts = new Map();
  const dirEntries = entries.filter((entry) => entry.type === 'directory');

  for (const dir of dirEntries) {
    fileCounts.set(dir.rel, 0);
  }

  for (const entry of entries) {
    if (entry.type !== 'file') continue;
    const parts = entry.rel.split('/');
    let current = '.';
    fileCounts.set('.', (fileCounts.get('.') || 0) + 1);
    for (let i = 0; i < parts.length - 1; i += 1) {
      current = current === '.' ? parts[i] : `${current}/${parts[i]}`;
      fileCounts.set(current, (fileCounts.get(current) || 0) + 1);
    }
  }

  return fileCounts;
}

function extractImports(text) {
  const imports = [];
  const patterns = [
    /import\s+(?:.+?\s+from\s+)?['"]([^'"]+)['"]/g,
    /require\(\s*['"]([^'"]+)['"]\s*\)/g,
    /export\s+.+?\s+from\s+['"]([^'"]+)['"]/g
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      imports.push(match[1]);
    }
  }
  return imports;
}

function resolveRelativeImport(sourceRelPath, importPath) {
  if (!importPath.startsWith('.')) return null;
  const sourceDir = path.dirname(sourceRelPath);
  const base = normalize(path.join(sourceDir, importPath));
  const candidates = [
    base,
    `${base}.js`, `${base}.mjs`, `${base}.cjs`, `${base}.ts`, `${base}.tsx`, `${base}.mts`, `${base}.cts`,
    `${base}/index.js`, `${base}/index.mjs`, `${base}/index.cjs`, `${base}/index.ts`, `${base}/index.tsx`,
    `${base}/index.mts`, `${base}/index.cts`
  ];
  return candidates;
}

module.exports = {
  PACK_ROOT,
  DEFAULT_REPO_ROOT,
  OUTPUT_DIR_NAME,
  parseArgs,
  normalize,
  detectRepoRoot,
  loadConfig,
  ensureDir,
  outputDir,
  writeRepoFile,
  safeReadText,
  listAllEntries,
  classifyPath,
  isLikelyCode,
  isLikelyText,
  tokenize,
  scorePathForTask,
  topN,
  renderList,
  nowIso,
  groupBy,
  collectDirectoryFileCounts,
  extractImports,
  resolveRelativeImport
};
