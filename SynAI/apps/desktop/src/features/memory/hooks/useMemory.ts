import { useEffect, useSyncExternalStore } from "react";
import { memoryStore } from "../store/memoryStore";

const bridge = () => window.synai;

export const useMemory = () => {
  const state = useSyncExternalStore(memoryStore.subscribe, memoryStore.getState);

  const load = async (): Promise<void> => {
    memoryStore.setState({ loading: true, error: null });
    try {
      const items = await bridge().listMemories();
      memoryStore.setState({ items });
    } catch (error) {
      memoryStore.setState({
        error: error instanceof Error ? error.message : "Failed to load memories"
      });
    } finally {
      memoryStore.setState({ loading: false });
    }
  };

  const setQuery = async (query: string): Promise<void> => {
    memoryStore.setState({ query, loading: true, error: null });
    try {
      const items = query.trim()
        ? await bridge().searchMemories(query)
        : await bridge().listMemories();
      memoryStore.setState({ items });
    } catch (error) {
      memoryStore.setState({
        error: error instanceof Error ? error.message : "Failed to search memories"
      });
    } finally {
      memoryStore.setState({ loading: false });
    }
  };

  const remove = async (memoryId: string): Promise<void> => {
    try {
      await bridge().deleteMemory(memoryId);
      await setQuery(state.query);
    } catch (error) {
      memoryStore.setState({
        error: error instanceof Error ? error.message : "Failed to delete memory"
      });
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return {
    ...state,
    load,
    setQuery,
    remove
  };
};
