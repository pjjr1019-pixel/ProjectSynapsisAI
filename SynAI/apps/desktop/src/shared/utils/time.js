export const formatTime = (isoTime) => new Date(isoTime).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3
});
export const formatDateTime = (isoTime) => new Date(isoTime).toLocaleString();
export const formatStopwatch = (durationMs) => {
    const safeDuration = Math.max(0, Math.round(durationMs));
    const hours = Math.floor(safeDuration / 3_600_000);
    const minutes = Math.floor((safeDuration % 3_600_000) / 60_000);
    const seconds = Math.floor((safeDuration % 60_000) / 1_000);
    const milliseconds = safeDuration % 1_000;
    const pad = (value) => value.toString().padStart(2, "0");
    const padMs = (value) => value.toString().padStart(3, "0");
    if (hours > 0) {
        return `${hours}:${pad(minutes)}:${pad(seconds)}.${padMs(milliseconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}.${padMs(milliseconds)}`;
};
