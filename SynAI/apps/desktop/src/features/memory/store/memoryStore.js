const initialState = {
    query: "",
    items: [],
    loading: false,
    error: null
};
let state = initialState;
const listeners = new Set();
export const memoryStore = {
    getState: () => state,
    setState: (patch) => {
        state = { ...state, ...patch };
        listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
    }
};
