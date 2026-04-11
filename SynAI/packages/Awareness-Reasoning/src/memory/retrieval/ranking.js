export const rankRetrievedMemories = (keyword, semantic, limit) => {
    const map = new Map();
    for (const item of [...keyword, ...semantic]) {
        const existing = map.get(item.memory.id);
        if (!existing || item.score > existing.score) {
            map.set(item.memory.id, item);
        }
    }
    return [...map.values()].sort((a, b) => b.score - a.score).slice(0, limit);
};
