import { useMemo, useState } from "react";
import type { Conversation } from "@contracts";

export const useConversationSearch = (conversations: Conversation[]) => {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return conversations;
    }
    return conversations.filter((conversation) =>
      conversation.title.toLowerCase().includes(normalized)
    );
  }, [conversations, query]);

  return {
    query,
    setQuery,
    filtered
  };
};
