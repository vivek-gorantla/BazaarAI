export function textParser(value?: string) {
    if (!value) return "";

    return value
        .trim()
        .replace(/\s+/g, " ");
}