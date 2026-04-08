export const cn = (...parts: Array<string | undefined | false | null>): string =>
  parts.filter(Boolean).join(" ");
