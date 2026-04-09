import { vi } from "vitest";
import "@testing-library/jest-dom/vitest";

if (typeof window !== "undefined" && typeof window.HTMLElement !== "undefined") {
  Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn()
  });
}
