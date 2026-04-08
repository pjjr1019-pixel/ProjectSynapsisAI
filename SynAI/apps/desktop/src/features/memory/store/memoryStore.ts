import type { MemoryState } from "../types/memory.types";

type Listener = () => void;

const initialState: MemoryState = {
  query: "",
  items: [],
  loading: false,
  error: null
};

let state: MemoryState = initialState;
const listeners = new Set<Listener>();

export const memoryStore = {
  getState: (): MemoryState => state,
  setState: (patch: Partial<MemoryState>): void => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  },
  subscribe: (listener: Listener): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
};
