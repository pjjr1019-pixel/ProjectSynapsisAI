function stripComment(raw) {
  let out = "";
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === "#" && !inSingle && !inDouble) break;
    out += ch;
  }
  return out;
}

function parseScalar(value) {
  const raw = String(value ?? "").trim();
  if (raw === "") return "";
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw === "null") return null;
  if (/^-?\d+(?:\.\d+)?$/.test(raw)) return Number(raw);
  if (raw.startsWith("[") && raw.endsWith("]")) {
    const inner = raw.slice(1, -1).trim();
    if (!inner) return [];
    return inner
      .split(",")
      .map((part) => parseScalar(part))
      .filter((part) => part !== "");
  }
  return raw;
}

function tokenizeYaml(text) {
  return String(text ?? "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((raw, lineIndex) => {
      const cleaned = stripComment(raw);
      const trimmedRight = cleaned.replace(/\s+$/, "");
      if (!trimmedRight.trim()) return null;
      const indent = trimmedRight.match(/^ */)?.[0]?.length || 0;
      return {
        lineIndex,
        indent,
        content: trimmedRight.slice(indent),
      };
    })
    .filter(Boolean);
}

function parseArray(lines, startIndex, indent) {
  const items = [];
  let i = startIndex;
  while (i < lines.length) {
    const line = lines[i];
    if (line.indent < indent) break;
    const isArrayItem = line.content === "-" || line.content.startsWith("- ");
    if (line.indent !== indent || !isArrayItem) break;
    const rest = line.content === "-" ? "" : line.content.slice(2).trim();
    if (!rest) {
      const next = lines[i + 1];
      if (!next || next.indent <= indent) {
        items.push(null);
        i += 1;
      } else {
        const parsed = parseBlock(lines, i + 1, next.indent);
        items.push(parsed.value);
        i = parsed.nextIndex;
      }
      continue;
    }
    items.push(parseScalar(rest));
    i += 1;
  }
  return { value: items, nextIndex: i };
}

function parseObject(lines, startIndex, indent) {
  const out = {};
  let i = startIndex;
  while (i < lines.length) {
    const line = lines[i];
    if (line.indent < indent) break;
    if (line.indent !== indent || line.content === "-" || line.content.startsWith("- ")) break;
    const sep = line.content.indexOf(":");
    if (sep < 0) throw new Error(`Invalid YAML at line ${line.lineIndex + 1}: ${line.content}`);
    const key = line.content.slice(0, sep).trim();
    const rest = line.content.slice(sep + 1).trim();
    if (!rest) {
      const next = lines[i + 1];
      if (!next || next.indent <= indent) {
        out[key] = "";
        i += 1;
      } else {
        const parsed = parseBlock(lines, i + 1, next.indent);
        out[key] = parsed.value;
        i = parsed.nextIndex;
      }
      continue;
    }
    out[key] = parseScalar(rest);
    i += 1;
  }
  return { value: out, nextIndex: i };
}

function parseBlock(lines, startIndex, indent) {
  const line = lines[startIndex];
  if (!line) return { value: {}, nextIndex: startIndex };
  if (line.content === "-" || line.content.startsWith("- ")) {
    return parseArray(lines, startIndex, indent);
  }
  return parseObject(lines, startIndex, indent);
}

export function parseYaml(text) {
  const lines = tokenizeYaml(text);
  if (!lines.length) return {};
  return parseBlock(lines, 0, lines[0].indent).value;
}

export function extractFrontMatter(text) {
  const raw = String(text ?? "");
  if (!raw.startsWith("---")) {
    return { frontMatter: {}, body: raw };
  }
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return { frontMatter: {}, body: raw };
  }
  return {
    frontMatter: parseYaml(match[1]),
    body: raw.slice(match[0].length),
  };
}
