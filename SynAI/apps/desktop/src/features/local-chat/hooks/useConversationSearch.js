import { useMemo, useState } from "react";
export const useConversationSearch = (conversations) => {
    const [query, setQuery] = useState("");
    const filtered = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) {
            return conversations;
        }
        return conversations.filter((conversation) => conversation.title.toLowerCase().includes(normalized));
    }, [conversations, query]);
    return {
        query,
        setQuery,
        filtered
    };
};
