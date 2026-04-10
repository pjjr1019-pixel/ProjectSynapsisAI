import fs from "node:fs";
import path from "node:path";

const promptEvalDir = path.join(process.cwd(), ".runtime", "prompt-evals");
const outputPath = path.join(promptEvalDir, "chathistory.md");

const files = fs
  .readdirSync(promptEvalDir)
  .filter((file) => file.endsWith(".md") && file.toLowerCase() !== "chathistory.md")
  .sort();

const header = [
  "# Chat History",
  "",
  "Prompt evaluation prompts and replies saved for gap analysis.",
  "Use this file to review where the assistant is strong, where it misses, and what product knowledge or retrieval features to improve."
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const extractField = (content, label) => {
  const match = content.match(new RegExp(`^- ${escapeRegExp(label)}: (.+)$`, "m"));
  return match ? match[1].trim() : null;
};

const extractFencedSection = (section, heading) => {
  const match = section.match(
    new RegExp(
      `${escapeRegExp(heading)}\\s*\\r?\\n\\r?\\n?\`\`\`(?:[a-z]*)\\r?\\n([\\s\\S]*?)\\r?\\n\`\`\``,
      "m"
    )
  );
  return match ? match[1].trim() : "";
};

const extractFailedChecks = (section) => {
  const checksIndex = section.indexOf("### Checks");
  if (checksIndex === -1) {
    return ["- None."];
  }

  const failed = section
    .slice(checksIndex + "### Checks".length)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- FAIL |"))
    .map((line) => line.replace(/^- FAIL \|\s*/, "- "));

  return failed.length > 0 ? failed : ["- None."];
};

const lines = [...header];

for (const file of files) {
  const content = fs.readFileSync(path.join(promptEvalDir, file), "utf8");
  const suiteName = content.match(/^# (.+)$/m)?.[1]?.trim() ?? file;
  const generatedAt = extractField(content, "Generated") ?? file;
  const suiteMode = extractField(content, "Suite mode") ?? "unknown";
  const model = extractField(content, "Model") ?? "default model";
  const qualityPassed = extractField(content, "Quality passed") ?? "unknown";
  const totalPrompts = extractField(content, "Total prompts") ?? "unknown";
  const needsReview = extractField(content, "Needs review") ?? "unknown";

  lines.push(
    "",
    `## ${generatedAt} | ${suiteName}`,
    "",
    `- Report file: ${file}`,
    `- Suite mode: ${suiteMode}`,
    `- Model: ${model}`,
    `- Quality passed: ${qualityPassed}/${totalPrompts}`,
    `- Needs review: ${needsReview}`,
    ""
  );

  const caseHeadingPattern = /^## (.+?) \((easy|medium|hard|edge)\)\s*$/gm;
  const headings = Array.from(content.matchAll(caseHeadingPattern));

  for (const [index, match] of headings.entries()) {
    const label = match[1].trim();
    const difficulty = match[2].trim();
    const sectionStart = (match.index ?? 0) + match[0].length;
    const sectionEnd = headings[index + 1]?.index ?? content.length;
    const section = content.slice(sectionStart, sectionEnd);
    const status = extractField(section, "Status") ?? "unknown";
    const quality = extractField(section, "Quality") ?? "unknown";
    const route = extractField(section, "Route") ?? "none";
    const sourceScope = extractField(section, "Source scope") ?? "none";
    const prompt = extractFencedSection(section, "### Prompt");
    const reply = extractFencedSection(section, "### Reply");
    const failedChecks = extractFailedChecks(section);

    lines.push(
      `### ${label} (${difficulty})`,
      "",
      `- Status: ${status}`,
      `- Quality: ${quality}`,
      `- Route: ${route}`,
      `- Source scope: ${sourceScope}`,
      "",
      "#### Prompt",
      "",
      "```",
      prompt,
      "```",
      "",
      "#### Reply",
      "",
      "```",
      reply,
      "```",
      "",
      "#### Failed Checks",
      "",
      ...failedChecks,
      ""
    );
  }
}

fs.writeFileSync(outputPath, `${lines.join("\n").trim()}\n`, "utf8");

console.log(outputPath);
console.log(`${files.length} reports processed.`);
