export function stripReleaseMention(value?: string | null) {
  if (!value) {
    return "";
  }

  return value
    .replace(/\bRelease\s*1\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}
