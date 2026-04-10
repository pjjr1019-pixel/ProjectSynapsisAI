import { BrowserWindow } from "electron";
import * as path from "node:path";
import { createPlaywrightWorkflowBrowserHost } from "./browser-session-playwright";

export interface WorkflowBrowserResult {
  url: string;
  title: string;
  text: string;
  links: Array<{ title: string; url: string }>;
  backend?: "electron" | "playwright";
  tabCount?: number | null;
  screenshotPath?: string | null;
  downloadPath?: string | null;
}

export interface WorkflowBrowserHost {
  search(query: string, maxResults?: number): Promise<WorkflowBrowserResult[]>;
  open(url: string, visible?: boolean): Promise<WorkflowBrowserResult>;
  openTab?(url: string, visible?: boolean): Promise<WorkflowBrowserResult>;
  playYoutube(query: string): Promise<WorkflowBrowserResult>;
  click(selectorOrText: string, visible?: boolean): Promise<WorkflowBrowserResult>;
  type(selectorOrText: string, text: string, submit?: boolean, visible?: boolean): Promise<WorkflowBrowserResult>;
  hotkey(keys: string[], visible?: boolean): Promise<WorkflowBrowserResult>;
  waitFor?(selectorOrText: string, visible?: boolean, timeoutMs?: number): Promise<WorkflowBrowserResult>;
  select?(selectorOrText: string, value: string, visible?: boolean): Promise<WorkflowBrowserResult>;
  download?(url: string, fileName?: string, visible?: boolean): Promise<WorkflowBrowserResult>;
  snapshot?(visible?: boolean): Promise<WorkflowBrowserResult>;
  close(): Promise<void>;
}

const waitForLoad = async (window: BrowserWindow, timeoutMs = 30_000): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Browser load timed out."));
    }, timeoutMs);

    const cleanup = (): void => {
      clearTimeout(timeout);
      window.webContents.removeListener("did-finish-load", onFinish);
      window.webContents.removeListener("did-fail-load", onFail);
    };

    const onFinish = (): void => {
      cleanup();
      resolve();
    };

    const onFail = (_event: Electron.Event, errorCode: number, errorDescription: string): void => {
      cleanup();
      reject(new Error(`Browser load failed (${errorCode}): ${errorDescription}`));
    };

    window.webContents.once("did-finish-load", onFinish);
    window.webContents.once("did-fail-load", onFail);
  });
};

const collectSnapshot = async (window: BrowserWindow): Promise<WorkflowBrowserResult> => {
  const text = await window.webContents.executeJavaScript(
    `(() => String(document.body ? document.body.innerText : "").slice(0, 8000))()`,
    true
  );
  const links = await window.webContents.executeJavaScript(
    `(() => Array.from(document.querySelectorAll('a[href]')).slice(0, 8).map((a) => ({
      title: String(a.innerText || a.textContent || a.getAttribute('aria-label') || '').trim(),
      url: String(a.href || '')
    })).filter((entry) => entry.url))()`,
    true
  );
  return {
    url: window.webContents.getURL(),
    title: window.getTitle(),
    text: String(text),
    links: Array.isArray(links) ? links : []
  };
};

const normalizeKeys = (keys: string[]): string[] =>
  keys.map((key) => key.trim()).filter(Boolean);

const createElectronFallbackBrowserHost = (): WorkflowBrowserHost => {
  let browserWindow: BrowserWindow | null = null;

  const ensureWindow = (visible = false): BrowserWindow => {
    if (browserWindow && !browserWindow.isDestroyed()) {
      if (visible && !browserWindow.isVisible()) {
        browserWindow.show();
      }
      return browserWindow;
    }

    browserWindow = new BrowserWindow({
      width: 1280,
      height: 860,
      show: visible,
      title: "SynAI Workflow Browser",
      autoHideMenuBar: true,
      webPreferences: {
        partition: "persist:synai-workflow-browser",
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });

    browserWindow.on("closed", () => {
      browserWindow = null;
    });

    return browserWindow;
  };

  const open = async (url: string, visible = false): Promise<WorkflowBrowserResult> => {
    const window = ensureWindow(visible);
    if (visible) {
      window.show();
    }
    await window.loadURL(url);
    return await collectSnapshot(window);
  };

  const search = async (query: string, maxResults = 5): Promise<WorkflowBrowserResult[]> => {
    const window = ensureWindow(false);
    await window.loadURL(`https://www.bing.com/search?q=${encodeURIComponent(query)}`);
    const results = await window.webContents.executeJavaScript(
      `(() => Array.from(document.querySelectorAll('li.b_algo')).slice(0, ${Math.max(
        1,
        Math.min(maxResults, 8)
      )}).map((item) => {
        const link = item.querySelector('h2 a');
        const snippet = item.querySelector('.b_caption p');
        return {
          url: link ? String(link.href || '') : '',
          title: link ? String(link.textContent || '').trim() : '',
          text: snippet ? String(snippet.textContent || '').trim() : '',
          links: []
        };
      }).filter((entry) => entry.url))()`,
      true
    );
    return Array.isArray(results) ? (results as WorkflowBrowserResult[]) : [];
  };

  const playYoutube = async (query: string): Promise<WorkflowBrowserResult> => {
    const window = ensureWindow(true);
    await window.loadURL(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
    await window.webContents.executeJavaScript(
      `(() => {
        const selectors = ['a#video-title', 'ytd-video-renderer a[href^="/watch"]', 'a[href^="/watch"]'];
        for (const selector of selectors) {
          const link = document.querySelector(selector);
          if (link && typeof link.click === 'function') {
            link.click();
            return true;
          }
        }
        return false;
      })()`,
      true
    );
    await waitForLoad(window, 5_000).catch(() => undefined);
    return await collectSnapshot(window);
  };

  const click = async (selectorOrText: string, visible = true): Promise<WorkflowBrowserResult> => {
    const window = ensureWindow(visible);
    if (visible) {
      window.show();
    }
    await window.webContents.executeJavaScript(
      `(() => {
        const query = ${JSON.stringify(selectorOrText)};
        const normalized = (value) => String(value || "").toLowerCase().replace(/\\s+/g, " ").trim();
        const target = normalized(query);
        const selectors = [
          'button',
          'a',
          'input',
          'textarea',
          'select',
          '[role="button"]',
          '[role="menuitem"]',
          '[role="tab"]',
          '[role="option"]',
          '[role="checkbox"]',
          '[role="radio"]',
          '[contenteditable="true"]',
          '[aria-label]',
          '[title]',
          'label'
        ];
        let element = null;
        try {
          element = document.querySelector(query);
        } catch {}
        if (!element) {
          const candidates = selectors.flatMap((selector) => {
            try {
              return Array.from(document.querySelectorAll(selector));
            } catch {
              return [];
            }
          });
          element = candidates.find((candidate) => {
            const text = [
              candidate.innerText,
              candidate.textContent,
              candidate.getAttribute?.('aria-label'),
              candidate.getAttribute?.('title'),
              candidate.getAttribute?.('placeholder'),
              candidate.getAttribute?.('value'),
              candidate.getAttribute?.('name')
            ]
              .filter(Boolean)
              .map((value) => normalized(value))
              .join(' ');
            return text === target || text.includes(target) || target.includes(text);
          }) || null;
        }
        if (!element) {
          return { clicked: false, selector: query, reason: 'Element not found' };
        }
        if (typeof element.focus === 'function') {
          element.focus();
        }
        if (typeof element.click === 'function') {
          element.click();
          return {
            clicked: true,
            selector: query,
            text: normalized(element.innerText || element.textContent || element.getAttribute?.('aria-label') || element.getAttribute?.('title') || '')
          };
        }
        return { clicked: false, selector: query, reason: 'Element cannot be clicked' };
      })()`,
      true
    );
    await waitForLoad(window, 2_500).catch(() => undefined);
    return await collectSnapshot(window);
  };

  const type = async (
    selectorOrText: string,
    text: string,
    submit = false,
    visible = true
  ): Promise<WorkflowBrowserResult> => {
    const window = ensureWindow(visible);
    if (visible) {
      window.show();
    }
    await window.webContents.executeJavaScript(
      `(() => {
        const query = ${JSON.stringify(selectorOrText)};
        const value = ${JSON.stringify(text)};
        const normalized = (candidate) => String(candidate || "").toLowerCase().replace(/\\s+/g, " ").trim();
        const target = normalized(query);
        const selectors = [
          'input',
          'textarea',
          '[contenteditable="true"]',
          '[role="textbox"]',
          '[aria-label]',
          '[placeholder]',
          '[name]'
        ];
        let element = null;
        try {
          element = document.querySelector(query);
        } catch {}
        if (!element) {
          const candidates = selectors.flatMap((selector) => {
            try {
              return Array.from(document.querySelectorAll(selector));
            } catch {
              return [];
            }
          });
          element = candidates.find((candidate) => {
            const textContent = [
              candidate.innerText,
              candidate.textContent,
              candidate.getAttribute?.('aria-label'),
              candidate.getAttribute?.('placeholder'),
              candidate.getAttribute?.('name'),
              candidate.getAttribute?.('id')
            ]
              .filter(Boolean)
              .map((entry) => normalized(entry))
              .join(' ');
            return textContent === target || textContent.includes(target) || target.includes(textContent);
          }) || null;
        }
        if (!element) {
          return { typed: false, selector: query, reason: 'Element not found' };
        }
        if ('value' in element) {
          const descriptor =
            Object.getOwnPropertyDescriptor(element.constructor?.prototype ?? HTMLInputElement.prototype, 'value') ??
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value') ??
            Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
          if (descriptor?.set) {
            descriptor.set.call(element, value);
          } else {
            element.value = value;
          }
        } else if (element.isContentEditable) {
          element.innerText = value;
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        if (${submit ? "true" : "false"}) {
          const form = element.form ?? element.closest?.('form') ?? null;
          if (form && typeof form.requestSubmit === 'function') {
            form.requestSubmit();
          } else if (typeof element.click === 'function' && /button|submit/i.test(String(element.type ?? element.getAttribute?.('role') ?? ''))) {
            element.click();
          } else {
            element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
            element.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true }));
          }
        }
        return {
          typed: true,
          selector: query,
          submit: ${submit ? "true" : "false"},
          text: value
        };
      })()`,
      true
    );
    await waitForLoad(window, submit ? 5_000 : 2_500).catch(() => undefined);
    return await collectSnapshot(window);
  };

  const hotkey = async (keys: string[], visible = true): Promise<WorkflowBrowserResult> => {
    const window = ensureWindow(visible);
    if (visible) {
      window.show();
    }
    const normalizedKeys = normalizeKeys(keys);
    const key = normalizedKeys[normalizedKeys.length - 1] ?? "";
    const modifiers = {
      control: normalizedKeys.some((entry) => /^(ctrl|control)$/i.test(entry)),
      alt: normalizedKeys.some((entry) => /^alt$/i.test(entry)),
      shift: normalizedKeys.some((entry) => /^shift$/i.test(entry)),
      meta: normalizedKeys.some((entry) => /^(meta|cmd|command|win|super)$/i.test(entry))
    };
    const keyCode =
      key.length === 1 ? key.toUpperCase() : key.replace(/^key/i, "").replace(/^digit/i, "").trim() || key;
    window.focus();
    window.webContents.sendInputEvent({
      type: "keyDown",
      keyCode,
      ...modifiers
    });
    window.webContents.sendInputEvent({
      type: "char",
      keyCode,
      ...modifiers
    });
    window.webContents.sendInputEvent({
      type: "keyUp",
      keyCode,
      ...modifiers
    });
    await waitForLoad(window, 2_500).catch(() => undefined);
    return await collectSnapshot(window);
  };

  const close = async (): Promise<void> => {
    if (browserWindow && !browserWindow.isDestroyed()) {
      browserWindow.close();
    }
    browserWindow = null;
  };

  return { search, open, playYoutube, click, type, hotkey, close };
};

export const createElectronWorkflowBrowserHost = (options?: { runtimeRoot?: string; preferPlaywright?: boolean }): WorkflowBrowserHost => {
  if (!options?.preferPlaywright && process.env.SYNAI_BROWSER_BACKEND !== "playwright") {
    return createElectronFallbackBrowserHost();
  }

  const playwrightHost = createPlaywrightWorkflowBrowserHost(options?.runtimeRoot ?? path.join(process.cwd(), ".runtime"));
  let fallbackHost: WorkflowBrowserHost | null = null;
  const getFallback = (): WorkflowBrowserHost => {
    fallbackHost ??= createElectronFallbackBrowserHost();
    return fallbackHost;
  };

  const wrap = <T>(operation: () => Promise<T>, fallback: () => Promise<T>): Promise<T> =>
    operation().catch(async (error) => {
      const message = error instanceof Error ? error.message : String(error);
      if (/playwright|browser|chromium|edge|chrome/i.test(message)) {
        return await fallback();
      }
      throw error;
    });

  return {
    search: async (query, maxResults) => await wrap(
      () => playwrightHost.search(query, maxResults),
      () => getFallback().search(query, maxResults)
    ),
    open: async (url, visible) => await wrap(
      () => playwrightHost.open(url, visible),
      () => getFallback().open(url, visible)
    ),
    openTab: async (url, visible) => await wrap(
      async () => playwrightHost.openTab ? await playwrightHost.openTab(url, visible) : await playwrightHost.open(url, visible),
      async () => getFallback().open(url, visible)
    ),
    playYoutube: async (query) => await wrap(
      () => playwrightHost.playYoutube(query),
      () => getFallback().playYoutube(query)
    ),
    click: async (selectorOrText, visible) => await wrap(
      () => playwrightHost.click(selectorOrText, visible),
      () => getFallback().click(selectorOrText, visible)
    ),
    type: async (selectorOrText, text, submit, visible) => await wrap(
      () => playwrightHost.type(selectorOrText, text, submit, visible),
      () => getFallback().type(selectorOrText, text, submit, visible)
    ),
    hotkey: async (keys, visible) => await wrap(
      () => playwrightHost.hotkey(keys, visible),
      () => getFallback().hotkey(keys, visible)
    ),
    waitFor: async (selectorOrText, visible, timeoutMs) => await wrap(
      async () => (playwrightHost.waitFor ? await playwrightHost.waitFor(selectorOrText, visible, timeoutMs) : await playwrightHost.click(selectorOrText, visible)),
      async () => getFallback().click(selectorOrText, visible)
    ),
    select: async (selectorOrText, value, visible) => await wrap(
      async () => (playwrightHost.select ? await playwrightHost.select(selectorOrText, value, visible) : await playwrightHost.type(selectorOrText, value, true, visible)),
      async () => getFallback().type(selectorOrText, value, true, visible)
    ),
    download: async (url, fileName, visible) => await wrap(
      async () => (playwrightHost.download ? await playwrightHost.download(url, fileName, visible) : await playwrightHost.open(url, visible)),
      async () => getFallback().open(url, visible)
    ),
    snapshot: async (visible) => await wrap(
      async () => (playwrightHost.snapshot ? await playwrightHost.snapshot(visible) : await playwrightHost.open("about:blank", visible)),
      async () => getFallback().open("about:blank", visible)
    ),
    close: async () => {
      await Promise.allSettled([
        playwrightHost.close(),
        fallbackHost?.close()
      ]);
      fallbackHost = null;
    }
  };
};
