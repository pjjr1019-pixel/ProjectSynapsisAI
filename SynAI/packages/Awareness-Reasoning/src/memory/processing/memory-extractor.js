const RULES = [
    { category: "preference", pattern: /\b(i prefer|please use|i like|i dislike)\b/i },
    { category: "personal_fact", pattern: /\b(i am|my name is|i live|i work as)\b/i },
    { category: "project", pattern: /\b(project|codebase|repo|app build)\b/i },
    { category: "goal", pattern: /\b(i want to|goal is|trying to)\b/i },
    { category: "constraint", pattern: /\b(must|cannot|can't|do not|never)\b/i },
    { category: "decision", pattern: /\b(we decided|decision|we will|let's)\b/i },
    { category: "note", pattern: /\b(remember|important note|note that)\b/i }
];
const clean = (value) => value.replace(/\s+/g, " ").trim();
export const extractMemoriesFromText = (text) => {
    const lines = text
        .split(/[\n\.]/)
        .map((line) => clean(line))
        .filter((line) => line.length >= 12);
    const extracted = [];
    for (const line of lines) {
        const rule = RULES.find((candidate) => candidate.pattern.test(line));
        if (!rule) {
            continue;
        }
        extracted.push({
            category: rule.category,
            text: line
        });
    }
    return extracted.slice(0, 6);
};
