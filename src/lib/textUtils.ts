/** Strip markdown formatting characters for plain-text previews (cards, summaries). */
export function stripMarkdown(input?: string | null, maxLen = 220): string {
  if (!input) return "";
  let s = input
    // remove headings markers
    .replace(/^#{1,6}\s+/gm, "")
    // bold/italic
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    // images / links
    .replace(/!\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    // inline code & code fences
    .replace(/`{1,3}([^`]*)`{1,3}/g, "$1")
    // table pipes & separator rows
    .replace(/^\s*\|?[\s:|-]{3,}\|?\s*$/gm, "")
    .replace(/\|/g, " ")
    // blockquote / list markers
    .replace(/^\s*[>\-*+]\s+/gm, "")
    // horizontal rules
    .replace(/^-{3,}$/gm, "")
    // collapse whitespace
    .replace(/\s+/g, " ")
    .trim();
  if (s.length > maxLen) s = s.slice(0, maxLen).trimEnd() + "…";
  return s;
}

/** Slugify any title (used for /projects/:slug). */
export function slugify(input?: string | null): string {
  if (!input) return "";
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
