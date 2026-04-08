/// <reference types="vite/client" />

import type { SynAIBridge } from "@contracts";

declare global {
  interface Window {
    synai: SynAIBridge;
  }
}

export {};
