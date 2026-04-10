import { mkdir, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright-core";
import type { WorkflowBrowserHost, WorkflowBrowserResult } from "./browser-session";

const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeKeys = (keys: string[]): string[] => keys.map((key) => key.trim()).filter(Boolean);

const normalizeHotkey = (keys: string[]): string => {
  const mapped = keys
    .map((key) => key.trim())
    .filter(Boolean)
    .map((key) => {
      switch (key.toLowerCase()) {
        case "ctrl":
        case "control":
          return "Control";
        case "alt":
          return "Alt";
        case "shift":
          return "Shift";
        case "meta":
        case "cmd":
        case "command":
        case "win":
        case "super":
          return "Meta";
        case "enter":
        case "return":
          return "Enter";
        case "escape":
        case "esc":
          return "Escape";
        case "tab":
          return "Tab";
        case "backspace":
          return "Backspace";
        case "delete":
          return "Delete";
        case "space":
          return "Space";
        default:
          return key.length === 1 ? key.toUpperCase() : key;
      }
    });

  if (mapped.length === 0) {
    return "Enter";
  }

  const last = mapped[mapped.length - 1] ?? "Enter";
  if (mapped.length === 1) {
    return last;
  }

  return `${mapped.slice(0, -1).join("+")}+${last}`;
};

const collectSnapshot = async (
  page: Page,
  runtimeRoot: string,
  backend: WorkflowBrowserResult["backend"] = "playwright"
): Promise<WorkflowBrowserResult> => {
  const capturesRoot = path.join(runtimeRoot, "browser", "captures");
  await mkdir(capturesRoot, { recursive: true });
  const capturePath = path.join(capturesRoot, `${Date.now()}-${Math.random().toString(16).slice(2)}.png`);

  const [text, links] = await Promise.all([
    page
      .locator("body")
      .innerText({ timeout: 5_000 })
      .catch(() => ""),
    page
      .locator("a[href]")
      .evaluateAll((anchors) =>
        anchors
          .slice(0, 8)
          .map((anchor) => {
            const element = anchor as HTMLAnchorElement;
            return {
              title: String(element.innerText || element.textContent || element.getAttribute("aria-label") || "").trim(),
              url: String(element.href || "")
            };
          })
          .filter((entry) => Boolean(entry.url))
      )
      .catch(() => [])
  ]);

  await page.screenshot({ path: capturePath, fullPage: true }).catch(() => undefined);

  return {
    url: page.url(),
    title: await page.title().catch(() => ""),
    text: String(text).slice(0, 8_000),
    links: Array.isArray(links) ? links : [],
    backend,
    tabCount: page.context().pages().filter((entry) => !entry.isClosed()).length,
    screenshotPath: capturePath
  };
};

const resolvePage = async (context: BrowserContext): Promise<Page> => {
  const pages = context.pages().filter((page) => !page.isClosed());
  if (pages.length > 0) {
    return pages[pages.length - 1];
  }
  return await context.newPage();
};

const findTargetFromDocument = async (
  page: Page,
  query: string,
  kind: "click" | "type" | "select" | "wait"
): Promise<{
  found: boolean;
  target?: string;
}> => {
  return await page.evaluate(
    ({ queryValue, kindValue }) => {
      const normalized = (value: string): string =>
        String(value || "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, " ")
          .replace(/\s+/g, " ")
          .trim();

      const query = normalized(queryValue);
      const selectors =
        kindValue === "type" || kindValue === "select"
          ? ["input", "textarea", "[contenteditable='true']", "[role='textbox']", "select", "[aria-label]", "[placeholder]", "[name]"]
          : ["button", "a", "input", "textarea", "select", "[role='button']", "[role='menuitem']", "[role='tab']", "[role='option']", "[role='checkbox']", "[role='radio']", "[contenteditable='true']", "[aria-label]", "[title]", "label"];

      let element: Element | null = null;
      try {
        element = document.querySelector(queryValue);
      } catch {
        element = null;
      }

      const matches = (candidate: Element): boolean => {
        const parts = [
          candidate.textContent,
          candidate.getAttribute("aria-label"),
          candidate.getAttribute("title"),
          candidate.getAttribute("placeholder"),
          candidate.getAttribute("name"),
          candidate.getAttribute("id"),
          (candidate as HTMLInputElement | HTMLTextAreaElement).value
        ]
          .filter(Boolean)
          .map((entry) => normalized(String(entry)))
          .join(" ");
        return parts === query || parts.includes(query) || query.includes(parts);
      };

      if (!element) {
        const candidates = selectors.flatMap((selector) => {
          try {
            return Array.from(document.querySelectorAll(selector));
          } catch {
            return [];
          }
        });
        element = candidates.find((candidate) => matches(candidate)) ?? null;
      }

      if (!element) {
        return { found: false };
      }

      if (kindValue === "wait") {
        return { found: true, target: normalized(element.textContent ?? element.getAttribute("aria-label") ?? element.getAttribute("title") ?? "") };
      }

      if (kindValue === "type") {
        if ("value" in element) {
          return { found: true, target: "value" };
        }
        return { found: true, target: "contenteditable" };
      }

      if (kindValue === "select") {
        return { found: true, target: "select" };
      }

      return { found: true, target: normalized(element.textContent ?? element.getAttribute("aria-label") ?? element.getAttribute("title") ?? "") };
    },
    { queryValue: query, kindValue: kind }
  );
};

const createPlaywrightHost = (runtimeRoot: string): WorkflowBrowserHost => {
  const browserRoot = path.join(runtimeRoot, "browser", "playwright");
  let contextPromise: Promise<BrowserContext> | null = null;
  let context: BrowserContext | null = null;
  let activePage: Page | null = null;

  const ensureContext = async (): Promise<BrowserContext> => {
    if (context && !context.browser()?.isConnected?.()) {
      context = null;
      contextPromise = null;
    }

    if (context) {
      return context;
    }

    if (!contextPromise) {
      contextPromise = (async () => {
        await mkdir(browserRoot, { recursive: true });
        const channels: Array<"msedge" | "chrome" | "chromium"> = ["msedge", "chrome", "chromium"];
        let lastError: unknown = null;

        for (const channel of channels) {
          try {
            const launched = await chromium.launchPersistentContext(browserRoot, {
              channel,
              headless: false,
              viewport: null,
              acceptDownloads: true,
              args: ["--start-maximized"]
            });
            context = launched;
            return launched;
          } catch (error) {
            lastError = error;
          }
        }

        throw lastError instanceof Error ? lastError : new Error("Unable to launch Playwright browser.");
      })();
    }

    context = await contextPromise;
    return context;
  };

  const ensurePage = async (visible = true): Promise<Page> => {
    const currentContext = await ensureContext();
    const page = await resolvePage(currentContext);
    activePage = page;
    if (visible) {
      await page.bringToFront().catch(() => undefined);
    }
    return page;
  };

  const open = async (url: string, visible = true): Promise<WorkflowBrowserResult> => {
    const page = await ensurePage(visible);
    await page.goto(url, { waitUntil: "domcontentloaded" }).catch(() => undefined);
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
    return await collectSnapshot(page, runtimeRoot);
  };

  const openTab = async (url: string, visible = true): Promise<WorkflowBrowserResult> => {
    const currentContext = await ensureContext();
    const page = await currentContext.newPage();
    activePage = page;
    if (visible) {
      await page.bringToFront().catch(() => undefined);
    }
    await page.goto(url, { waitUntil: "domcontentloaded" }).catch(() => undefined);
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
    return await collectSnapshot(page, runtimeRoot);
  };

  const search = async (query: string, maxResults = 5): Promise<WorkflowBrowserResult[]> => {
    const page = await ensurePage(true);
    await page.goto(`https://www.bing.com/search?q=${encodeURIComponent(query)}`, { waitUntil: "domcontentloaded" }).catch(() => undefined);
    const results = await page
      .evaluate(
        (limit) =>
          Array.from(document.querySelectorAll("li.b_algo"))
            .slice(0, Math.max(1, Math.min(Number(limit) || 5, 8)))
            .map((item) => {
              const link = item.querySelector("h2 a") as HTMLAnchorElement | null;
              const snippet = item.querySelector(".b_caption p");
              return {
                url: link ? String(link.href || "") : "",
                title: link ? String(link.textContent || "").trim() : "",
                text: snippet ? String(snippet.textContent || "").trim() : "",
                links: []
              };
            })
            .filter((entry) => Boolean(entry.url)),
        maxResults
      )
      .catch(() => []);
    return Array.isArray(results) ? (results as WorkflowBrowserResult[]) : [];
  };

  const playYoutube = async (query: string): Promise<WorkflowBrowserResult> => {
    const page = await ensurePage(true);
    await page.goto(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
      waitUntil: "domcontentloaded"
    }).catch(() => undefined);
    await page.evaluate(() => {
      const selectors = ["a#video-title", "ytd-video-renderer a[href^='/watch']", "a[href^='/watch']"];
      for (const selector of selectors) {
        const link = document.querySelector(selector) as HTMLElement | null;
        if (link && typeof link.click === "function") {
          link.click();
          return true;
        }
      }
      return false;
    }).catch(() => undefined);
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
    return await collectSnapshot(page, runtimeRoot);
  };

  const click = async (selectorOrText: string, visible = true): Promise<WorkflowBrowserResult> => {
    const page = await ensurePage(visible);
    const found = await findTargetFromDocument(page, selectorOrText, "click");
    if (!found.found) {
      throw new Error(`Element not found: ${selectorOrText}`);
    }
    await page.evaluate((queryValue) => {
      const normalized = (value: string): string =>
        String(value || "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, " ")
          .replace(/\s+/g, " ")
          .trim();

      const candidates = [
        "button",
        "a",
        "input",
        "textarea",
        "select",
        "[role='button']",
        "[role='menuitem']",
        "[role='tab']",
        "[role='option']",
        "[role='checkbox']",
        "[role='radio']",
        "[contenteditable='true']",
        "[aria-label]",
        "[title]",
        "label"
      ]
        .flatMap((selector) => Array.from(document.querySelectorAll(selector)))
        .filter((candidate) => {
          const haystack = [
            candidate.textContent,
            candidate.getAttribute("aria-label"),
            candidate.getAttribute("title"),
            candidate.getAttribute("placeholder"),
            candidate.getAttribute("name"),
            candidate.getAttribute("value")
          ]
            .filter(Boolean)
            .map((entry) => normalized(String(entry)))
            .join(" ");
          const target = normalized(queryValue);
          return haystack === target || haystack.includes(target) || target.includes(haystack);
        });
      const element = candidates[0] as HTMLElement | undefined;
      if (!element) {
        throw new Error(`Element not found: ${queryValue}`);
      }
      element.focus?.();
      element.click?.();
    }, selectorOrText).catch((error) => {
      throw error instanceof Error ? error : new Error(String(error));
    });
    await page.waitForLoadState("networkidle", { timeout: 2_500 }).catch(() => undefined);
    return await collectSnapshot(page, runtimeRoot);
  };

  const type = async (
    selectorOrText: string,
    text: string,
    submit = false,
    visible = true
  ): Promise<WorkflowBrowserResult> => {
    const page = await ensurePage(visible);
    const query = selectorOrText.trim();
    const found = await findTargetFromDocument(page, query, "type");
    if (!found.found) {
      throw new Error(`Element not found: ${selectorOrText}`);
    }
    await page.evaluate(
      ({ queryValue, value, submitValue }) => {
        const normalized = (candidate: string): string =>
          String(candidate || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        const selectors = ["input", "textarea", "[contenteditable='true']", "[role='textbox']", "[aria-label]", "[placeholder]", "[name]"];
        let element: Element | null = null;
        try {
          element = document.querySelector(queryValue);
        } catch {
          element = null;
        }
        if (!element) {
          const candidates = selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)));
          element = candidates.find((candidate) => {
            const textContent = [
              candidate.textContent,
              candidate.getAttribute("aria-label"),
              candidate.getAttribute("placeholder"),
              candidate.getAttribute("name"),
              candidate.getAttribute("id")
            ]
              .filter(Boolean)
              .map((entry) => normalized(String(entry)))
              .join(" ");
            const target = normalized(queryValue);
            return textContent === target || textContent.includes(target) || target.includes(textContent);
          }) ?? null;
        }
        if (!element) {
          throw new Error(`Element not found: ${queryValue}`);
        }

        if ("value" in element) {
          const input = element as HTMLInputElement | HTMLTextAreaElement;
          const descriptor =
            Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value") ??
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value") ??
            Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
          if (descriptor?.set) {
            descriptor.set.call(input, value);
          } else {
            input.value = value;
          }
        } else if ((element as HTMLElement).isContentEditable) {
          (element as HTMLElement).innerText = value;
        }
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
        if (submitValue) {
          const form = (element as HTMLInputElement | HTMLTextAreaElement).form ?? element.closest?.("form") ?? null;
          if (form && typeof (form as HTMLFormElement).requestSubmit === "function") {
            (form as HTMLFormElement).requestSubmit();
          } else if (typeof (element as HTMLElement).click === "function") {
            (element as HTMLElement).click();
          }
        }
      },
      { queryValue: query, value: text, submitValue: submit }
    ).catch((error) => {
      throw error instanceof Error ? error : new Error(String(error));
    });
    await page.waitForLoadState("networkidle", { timeout: submit ? 5_000 : 2_500 }).catch(() => undefined);
    return await collectSnapshot(page, runtimeRoot);
  };

  const hotkey = async (keys: string[], visible = true): Promise<WorkflowBrowserResult> => {
    const page = await ensurePage(visible);
    const combo = normalizeHotkey(normalizeKeys(keys));
    await page.keyboard.press(combo).catch((error) => {
      throw error instanceof Error ? error : new Error(String(error));
    });
    await page.waitForLoadState("networkidle", { timeout: 2_500 }).catch(() => undefined);
    return await collectSnapshot(page, runtimeRoot);
  };

  const waitFor = async (
    selectorOrText: string,
    visible = true,
    timeoutMs = 5_000
  ): Promise<WorkflowBrowserResult> => {
    const page = await ensurePage(visible);
    const query = selectorOrText.trim();
    try {
      await page.waitForSelector(query, { timeout: timeoutMs }).catch(async () => {
        await page.getByText(query, { exact: false }).first().waitFor({ state: "visible", timeout: timeoutMs });
      });
    } catch {
      await page.waitForFunction(
        (value) => {
          const normalized = (candidate: string): string =>
            String(candidate || "")
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, " ")
              .replace(/\s+/g, " ")
              .trim();

          const target = normalized(String(value));
          return Array.from(document.querySelectorAll("body *")).some((element) => {
            const text = normalized(
              [
                element.textContent,
                element.getAttribute("aria-label"),
                element.getAttribute("title"),
                element.getAttribute("placeholder"),
                element.getAttribute("name")
              ]
                .filter(Boolean)
                .join(" ")
            );
            return text.includes(target);
          });
        },
        query,
        { timeout: timeoutMs }
      ).catch((error) => {
        throw error instanceof Error ? error : new Error(String(error));
      });
    }
    return await collectSnapshot(page, runtimeRoot);
  };

  const select = async (selectorOrText: string, value: string, visible = true): Promise<WorkflowBrowserResult> => {
    const page = await ensurePage(visible);
    const query = selectorOrText.trim();
    await page.evaluate(
      ({ queryValue, valueToSelect }) => {
        const normalized = (candidate: string): string =>
          String(candidate || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        let element: Element | null = null;
        try {
          element = document.querySelector(queryValue);
        } catch {
          element = null;
        }
        if (!element) {
          const candidates = Array.from(document.querySelectorAll("select, [role='listbox'], [aria-label], [placeholder], [name]"));
          element =
            candidates.find((candidate) => {
              const text = [
                candidate.textContent,
                candidate.getAttribute("aria-label"),
                candidate.getAttribute("placeholder"),
                candidate.getAttribute("name"),
                candidate.getAttribute("id")
              ]
                .filter(Boolean)
                .map((entry) => normalized(String(entry)))
                .join(" ");
              const target = normalized(queryValue);
              return text === target || text.includes(target) || target.includes(text);
            }) ?? null;
        }

        if (!element) {
          throw new Error(`Element not found: ${queryValue}`);
        }

        const selectElement = element as HTMLSelectElement;
        if (selectElement.tagName === "SELECT" && selectElement.options) {
          const option = Array.from(selectElement.options).find(
            (entry) =>
              normalized(entry.value) === normalized(valueToSelect) ||
              normalized(entry.textContent ?? "") === normalized(valueToSelect) ||
              normalized(entry.value).includes(normalized(valueToSelect)) ||
              normalized(valueToSelect).includes(normalized(entry.value))
          );
          if (option) {
            selectElement.value = option.value;
            selectElement.dispatchEvent(new Event("input", { bubbles: true }));
            selectElement.dispatchEvent(new Event("change", { bubbles: true }));
            return;
          }
        }

        (element as HTMLElement).click?.();
      },
      { queryValue: query, valueToSelect: value }
    ).catch((error) => {
      throw error instanceof Error ? error : new Error(String(error));
    });
    await page.waitForLoadState("networkidle", { timeout: 2_500 }).catch(() => undefined);
    return await collectSnapshot(page, runtimeRoot);
  };

  const download = async (url: string, fileName?: string, visible = true): Promise<WorkflowBrowserResult> => {
    const page = await ensurePage(visible);
    const downloadsRoot = path.join(runtimeRoot, "browser", "downloads");
    await mkdir(downloadsRoot, { recursive: true });
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Download failed (${response.status}): ${response.statusText}`);
    }
    const inferredName = fileName?.trim() || path.basename(new URL(url).pathname) || `download-${Date.now()}.bin`;
    const destination = path.join(downloadsRoot, inferredName);
    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(destination, buffer);
    await page.goto(url, { waitUntil: "domcontentloaded" }).catch(() => undefined);
    const snapshot = await collectSnapshot(page, runtimeRoot);
    return {
      ...snapshot,
      text: `${snapshot.text}\nDownloaded to: ${destination}`.trim(),
      screenshotPath: snapshot.screenshotPath
    };
  };

  const close = async (): Promise<void> => {
    if (activePage && !activePage.isClosed()) {
      await activePage.close().catch(() => undefined);
    }
    if (context) {
      await context.close().catch(() => undefined);
    }
    context = null;
    contextPromise = null;
    activePage = null;
  };

  return {
    search,
    open,
    openTab,
    playYoutube,
    click,
    type,
    hotkey,
    waitFor,
    select,
    download,
    snapshot: async (visible = true) => {
      const page = await ensurePage(visible);
      return await collectSnapshot(page, runtimeRoot);
    },
    close
  };
};

export const createPlaywrightWorkflowBrowserHost = (runtimeRoot: string): WorkflowBrowserHost =>
  createPlaywrightHost(runtimeRoot);
