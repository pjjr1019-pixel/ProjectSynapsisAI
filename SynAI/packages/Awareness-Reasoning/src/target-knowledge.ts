import type { ChatMessage } from "./contracts/chat";

const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const containsAny = (value: string, needles: string[]): boolean =>
  needles.some((needle) => value.includes(needle));

const trimToken = (value: string): string =>
  value
    .trim()
    .replace(/^[\s*>\-\u2022]+/, "")
    .replace(/[\s,.;:|]+$/, "")
    .trim();

const splitTargets = (value: string): string[] =>
  value
    .split(/\s*(?:,|;|&|\band\b|\bor\b|\bthen\b|\bplus\b|\+)\s*/i)
    .map(trimToken)
    .filter((entry) => entry.length > 0)
    .filter((entry, index, values) => values.indexOf(entry) === index);

const matchesWord = (value: string, word: string): boolean => {
  const pattern = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  return pattern.test(value);
};

const isFailureFeedbackMessage = (value: string): boolean => {
  const normalized = value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return containsAny(normalized, [
    "didnt work",
    "did not work",
    "did not open",
    "didnt open",
    "does not work",
    "doesnt work",
    "not working",
    "nothing happened",
    "no change",
    "wrong target",
    "wrong app",
    "wrong site",
    "opened hidden",
    "opened in background",
    "still not working",
    "failed"
  ]);
};

export interface BrowserTargetResolution {
  url: string;
  label: string;
  source: "raw-url" | "site-alias";
}

export interface ApplicationTargetResolution {
  target: string;
  label: string;
  source: "known-target";
}

export interface DesktopOrganizationResolution {
  folderName: string;
  source: "desktop-move-all";
}

export interface ProcessFollowUpResolution {
  actionVerb: "inspect" | "terminate" | "close";
  targets: string[];
  resolvedPrompt: string;
  sourceAssistantMessage: string | null;
  sourceUserMessage: string | null;
}

const BROWSER_SITE_ALIASES: Array<{ alias: string; label: string; url: string }> = [
  { alias: "google", label: "Google", url: "https://www.google.com" },
  { alias: "youtube", label: "YouTube", url: "https://www.youtube.com" },
  { alias: "facebook", label: "Facebook", url: "https://www.facebook.com" },
  { alias: "duckduckgo", label: "DuckDuckGo", url: "https://duckduckgo.com" },
  { alias: "bing", label: "Bing", url: "https://www.bing.com" },
  { alias: "github", label: "GitHub", url: "https://github.com" },
  { alias: "reddit", label: "Reddit", url: "https://www.reddit.com" }
];

export const resolveBrowserNavigationTarget = (prompt: string): BrowserTargetResolution | null => {
  const rawMatch = prompt.match(
    /(?:https?:\/\/|www\.)[^\s]+|(?:\b[a-z0-9-]+\.)+(?:com|net|org|io|ai|co|app|dev|gg|tv|me|site|info)(?:\/[^\s]*)?/i
  )?.[0]?.trim();
  if (rawMatch) {
    return {
      url: rawMatch.startsWith("http") ? rawMatch : `https://${rawMatch}`,
      label: rawMatch,
      source: "raw-url"
    };
  }

  const normalized = normalizeText(prompt);
  if (!containsAny(normalized, ["open", "visit", "browse", "go to", "show"])) {
    return null;
  }

  for (const site of BROWSER_SITE_ALIASES) {
    if (matchesWord(normalized, site.alias)) {
      return {
        url: site.url,
        label: site.label,
        source: "site-alias"
      };
    }
  }

  return null;
};

export const resolveKnownApplicationTarget = (prompt: string): ApplicationTargetResolution | null => {
  const raw = prompt.toLowerCase();
  if (/\bnotepad(?:\s+plus\s+plus|\+\+)/i.test(raw)) {
    return {
      target: "notepad++.exe",
      label: "Notepad++",
      source: "known-target"
    };
  }
  if (/\b(command prompt|cmd)\b/i.test(raw)) {
    return {
      target: "cmd.exe",
      label: "Command Prompt",
      source: "known-target"
    };
  }
  if (/\b(power shell|powershell)\b/i.test(raw)) {
    return {
      target: "powershell.exe",
      label: "PowerShell",
      source: "known-target"
    };
  }
  if (/\b(windows terminal|terminal|\bwt\b)\b/i.test(raw)) {
    return {
      target: "wt.exe",
      label: "Windows Terminal",
      source: "known-target"
    };
  }
  if (/\bnotepad\b/i.test(raw)) {
    return {
      target: "notepad.exe",
      label: "Notepad",
      source: "known-target"
    };
  }
  return null;
};

export const resolveDesktopOrganizationTarget = (prompt: string): DesktopOrganizationResolution | null => {
  const normalized = normalizeText(prompt);
  if (!containsAny(normalized, ["desktop"]) || !containsAny(normalized, ["move", "relocate", "put", "send"])) {
    return null;
  }

  if (
    !containsAny(normalized, ["everything", "all", "contents", "items", "files"]) ||
    !containsAny(normalized, ["new folder", "folder named", "folder called", "folder as", "into a folder", "into folder"])
  ) {
    return null;
  }

  const folderName = prompt.match(
    /\b(?:new\s+)?folder(?:\s+(?:named|called|as))?\s+([A-Za-z0-9._-]+(?:\s+[A-Za-z0-9._-]+){0,8})/i
  )?.[1]?.trim();

  if (!folderName) {
    return null;
  }

  return {
    folderName,
    source: "desktop-move-all"
  };
};

const extractProcessList = (text: string): string[] => {
  const normalized = text.replace(/\r/g, "\n");
  const listSeed =
    normalized.match(
      /(?:top processes|processes|resource hotspots?)\s*[:\-]\s*([\s\S]+?)(?:\n\s*\n|\n\s*(?:summary|note|focus|verify|expected|assisted|assistant)\b|$)/i
    )?.[1] ?? normalized;

  return splitTargets(listSeed)
    .map((entry) => entry.replace(/^[\s*>\-\u2022]+/, "").trim())
    .filter((entry) => entry.length > 0)
    .filter((entry) => !matchesWord(normalizeText(entry), "process"))
    .filter((entry) => !matchesWord(normalizeText(entry), "processes"))
    .filter((entry) => !matchesWord(normalizeText(entry), "top"))
    .filter((entry) => !matchesWord(normalizeText(entry), "resource"))
    .filter((entry) => !matchesWord(normalizeText(entry), "hotspots"))
    .filter((entry, index, values) => values.findIndex((candidate) => candidate.toLowerCase() === entry.toLowerCase()) === index);
};

const resolveProcessVerb = (prompt: string): "inspect" | "terminate" | "close" | null => {
  const normalized = normalizeText(prompt);
  if (containsAny(normalized, ["kill", "terminate", "end task", "stop task", "stop those", "stop them"])) {
    return "terminate";
  }
  if (containsAny(normalized, ["close", "quit", "exit", "shut down", "shutdown"])) {
    return "close";
  }
  if (containsAny(normalized, ["inspect", "check", "show", "list", "view", "see"])) {
    return "inspect";
  }
  return null;
};

const findAssistantProcessMessage = (messages: ChatMessage[]): ChatMessage | null => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "assistant") {
      continue;
    }
    const targets = extractProcessList(message.content);
    if (targets.length > 0) {
      return message;
    }
  }
  return null;
};

const findUserVerbMessage = (messages: ChatMessage[]): ChatMessage | null => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "user") {
      continue;
    }
    if (resolveProcessVerb(message.content)) {
      return message;
    }
  }
  return null;
};

export const resolveProcessFollowUpPrompt = (
  prompt: string,
  messages: ChatMessage[]
): ProcessFollowUpResolution | null => {
  const normalized = normalizeText(prompt);
  const followUpSignals = [
    "them processes",
    "those processes",
    "the top processes you mentioned",
    "the processes you mentioned",
    "the ones you mentioned",
    "those ones",
    "all them processes"
  ];
  const hasFollowUpSignal = containsAny(normalized, followUpSignals);
  const currentVerb = resolveProcessVerb(prompt);
  const assistantMessage = findAssistantProcessMessage(messages);
  const assistantTargets = assistantMessage ? extractProcessList(assistantMessage.content) : [];
  if (!hasFollowUpSignal && !currentVerb) {
    return null;
  }
  if (assistantTargets.length === 0) {
    return null;
  }

  const userVerbMessage = findUserVerbMessage(messages);
  const verb = currentVerb ?? (userVerbMessage ? resolveProcessVerb(userVerbMessage.content) : null) ?? "inspect";
  const sourceUserMessage = userVerbMessage?.content ?? null;
  const resolvedPrompt = `${verb} ${assistantTargets.join(", ")}`;

  return {
    actionVerb: verb,
    targets: assistantTargets,
    resolvedPrompt,
    sourceAssistantMessage: assistantMessage?.content ?? null,
    sourceUserMessage
  };
};

export const detectFailureFeedback = (prompt: string): boolean => isFailureFeedbackMessage(prompt);

export const extractTargetsFromResolvedPrompt = (prompt: string): string[] => {
  const normalized = normalizeText(prompt);
  const verbPattern = /(kill|terminate|end task|stop task|close|inspect|check|show|list|view|see)\s+(.+)$/i;
  const match = prompt.match(verbPattern);
  if (!match) {
    return [];
  }

  const remainder = match[2] ?? "";
  return splitTargets(remainder).filter((entry) => {
    const lowered = normalizeText(entry);
    return lowered.length > 0 && lowered !== normalized && !matchesWord(lowered, "them");
  });
};
