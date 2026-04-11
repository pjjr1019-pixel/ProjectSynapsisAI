export const inferConversationTitle = (text) => {
    const compact = text.replace(/\s+/g, " ").trim();
    if (!compact) {
        return "New conversation";
    }
    return compact.slice(0, 52);
};
