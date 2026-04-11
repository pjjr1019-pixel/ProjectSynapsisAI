import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
class MockWebContents extends EventEmitter {
    currentURL = "";
    async executeJavaScript(script) {
        if (script.includes("li.b_algo")) {
            return [
                {
                    url: "https://example.com/ai-snapshot",
                    title: "AI snapshot",
                    text: "Recent AI results.",
                    links: []
                }
            ];
        }
        if (script.includes("querySelectorAll('a[href]')")) {
            return [
                {
                    title: "Example link",
                    url: "https://example.com/link"
                }
            ];
        }
        if (script.includes("a#video-title") || script.includes("ytd-video-renderer")) {
            setImmediate(() => {
                this.currentURL = "https://www.youtube.com/watch?v=test";
                this.emit("did-finish-load");
            });
            return true;
        }
        return "Example page body";
    }
    getURL() {
        return this.currentURL;
    }
}
class MockBrowserWindow extends EventEmitter {
    webContents = new MockWebContents();
    visible = false;
    destroyed = false;
    title = "SynAI Workflow Browser";
    loadURL = vi.fn(async (url) => {
        this.webContents.currentURL = url;
        this.title = url.includes("youtube.com") ? "YouTube" : "Example Page";
        this.webContents.emit("did-finish-load");
    });
    show() {
        this.visible = true;
    }
    isVisible() {
        return this.visible;
    }
    isDestroyed() {
        return this.destroyed;
    }
    close() {
        this.destroyed = true;
        this.emit("closed");
    }
    getTitle() {
        return this.title;
    }
}
vi.mock("electron", () => ({
    BrowserWindow: MockBrowserWindow
}));
const { createElectronWorkflowBrowserHost } = await import("../../apps/desktop/electron/browser-session");
describe("workflow browser host", () => {
    it("opens a page after the initial navigation has already finished", async () => {
        const host = createElectronWorkflowBrowserHost();
        try {
            const result = await host.open("https://example.com/article", true);
            expect(result.url).toBe("https://example.com/article");
            expect(result.title).toBe("Example Page");
            expect(result.text).toBe("Example page body");
            expect(result.links).toEqual([{ title: "Example link", url: "https://example.com/link" }]);
        }
        finally {
            await host.close();
        }
    });
    it("returns search results without waiting for a second load event", async () => {
        const host = createElectronWorkflowBrowserHost();
        try {
            const results = await host.search("current state of AI");
            expect(results).toHaveLength(1);
            expect(results[0]?.title).toBe("AI snapshot");
            expect(results[0]?.url).toBe("https://example.com/ai-snapshot");
        }
        finally {
            await host.close();
        }
    });
    it("starts YouTube playback and waits for the follow-up navigation", async () => {
        const host = createElectronWorkflowBrowserHost();
        try {
            const result = await host.playYoutube("space documentary");
            expect(result.url).toBe("https://www.youtube.com/watch?v=test");
            expect(result.title).toBe("YouTube");
            expect(result.text).toBe("Example page body");
        }
        finally {
            await host.close();
        }
    });
});
