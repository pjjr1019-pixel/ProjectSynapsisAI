import { useRef } from "react";
import { useSyncExternalStore } from "react";
import { localChatStore } from "../store/localChatStore";
/**
 * Selector-based subscription to localChatStore.
 *
 * Unlike the full `useSyncExternalStore(localChatStore.subscribe, localChatStore.getState)`
 * used by `useLocalChat`, this hook only triggers a re-render when the selected
 * value actually changes (compared via Object.is). Components that only care about
 * a single field (e.g. modelHealth, screenStatus, loading) will not re-render
 * during streaming or live-usage polling.
 *
 * Usage:
 *   const loading = useLocalChatStore((s) => s.loading);
 *   const modelHealth = useLocalChatStore((s) => s.modelHealth);
 */
export const useLocalChatStore = (selector) => {
    // Keep the latest selector in a ref so the getSnapshot closure always uses it
    // without needing to be recreated on every render.
    const selectorRef = useRef(selector);
    selectorRef.current = selector;
    // Keep the last computed value so we can return the same reference when
    // the selection hasn't changed — this is what prevents the re-render.
    const lastValueRef = useRef(undefined);
    const getSnapshot = () => {
        const next = selectorRef.current(localChatStore.getState());
        if (lastValueRef.current !== undefined && Object.is(lastValueRef.current.value, next)) {
            return lastValueRef.current.value;
        }
        lastValueRef.current = { value: next };
        return next;
    };
    return useSyncExternalStore(localChatStore.subscribe, getSnapshot, getSnapshot);
};
