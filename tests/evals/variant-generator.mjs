function uniquePrompts(variants) {
  const seen = new Set();
  return variants.filter((entry) => {
    const key = String(entry?.prompt || "").trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function lowerFirst(text) {
  return text ? text.slice(0, 1).toLowerCase() + text.slice(1) : text;
}

function shortenPrompt(prompt) {
  return prompt
    .replace(/\bplease\b/gi, "")
    .replace(/\bcan you\b/gi, "")
    .replace(/\bcould you\b/gi, "")
    .replace(/\bfor me\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function addPolitePrefix(prompt) {
  const trimmed = String(prompt || "").trim();
  if (!trimmed) return "";
  if (/^(please|can you|could you)\b/i.test(trimmed)) return trimmed;
  return `please ${lowerFirst(trimmed)}`;
}

function addNoise(prompt) {
  return `${String(prompt || "").trim()} ... thanks`;
}

function applyTypo(prompt) {
  const replacements = [
    [/\bopen\b/i, "opne"],
    [/\bcontrol\b/i, "contrl"],
    [/\bpanel\b/i, "panle"],
    [/\bcreate\b/i, "cretae"],
    [/\bfolder\b/i, "fodler"],
    [/\bfile\b/i, "fiel"],
    [/\bsummarize\b/i, "sumarize"],
    [/\bdocuments\b/i, "documetns"],
  ];
  let next = String(prompt || "");
  for (const [pattern, replacement] of replacements) {
    if (pattern.test(next)) {
      next = next.replace(pattern, replacement);
      break;
    }
  }
  return next;
}

function alternatePhrasing(prompt) {
  const text = String(prompt || "").trim();
  if (/^open\b/i.test(text)) {
    return text.replace(/^open\b/i, "bring up");
  }
  if (/^create a folder\b/i.test(text)) {
    return text.replace(/^create a folder\b/i, "make a folder");
  }
  if (/^create a\b.*\bfile\b/i.test(text)) {
    return text.replace(/^create\b/i, "write");
  }
  if (/^summarize\b/i.test(text)) {
    return `can you ${lowerFirst(text)}`;
  }
  if (/^rename\b/i.test(text)) {
    return text.replace(/^rename\b/i, "change the name of");
  }
  return `could you ${lowerFirst(text)}`;
}

function reorderPrompt(prompt) {
  const text = String(prompt || "").trim();
  const folderMatch = text.match(/^create a folder in documents called (.+)$/i);
  if (folderMatch) {
    return `in documents, create a folder called ${folderMatch[1]}`;
  }
  const fileMatch = text.match(/^create (?:a )?(?:text|markdown|md)?\s*file(?: in documents)? called (.+)$/i);
  if (fileMatch) {
    return `in documents, create a file called ${fileMatch[1]}`;
  }
  const summarizeMatch = text.match(/^summarize (?:the )?file (.+)$/i);
  if (summarizeMatch) {
    return `please summarize the file ${summarizeMatch[1]}`;
  }
  return `for this request, ${lowerFirst(text)}`;
}

export function generatePromptVariants(testCase) {
  if (!testCase?.allowVariants) return [];

  const prompt = String(testCase.prompt || "").trim();
  if (!prompt) return [];

  const variants = uniquePrompts([
    { kind: "polite", prompt: addPolitePrefix(prompt) },
    { kind: "short", prompt: shortenPrompt(prompt) },
    { kind: "noisy", prompt: addNoise(prompt) },
    { kind: "typo", prompt: applyTypo(prompt) },
    { kind: "alternate", prompt: alternatePhrasing(prompt) },
    { kind: "reordered", prompt: reorderPrompt(prompt) },
  ]);

  return variants
    .filter((entry) => entry.prompt && entry.prompt.toLowerCase() !== prompt.toLowerCase())
    .map((entry) => ({
      id: `${testCase.id}::${entry.kind}`,
      baseCaseId: testCase.id,
      kind: entry.kind,
      prompt: entry.prompt,
    }));
}
