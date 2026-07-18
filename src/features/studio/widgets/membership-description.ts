import sanitizeHtml from "sanitize-html";

export function sanitizeMembershipDescription(
  value: string | null,
): string | null {
  if (!value) return null;
  const sanitized = sanitizeHtml(value.slice(0, 4_000), {
    allowedTags: ["p", "br", "strong", "em", "ul", "ol", "li"],
    allowedAttributes: {},
    disallowedTagsMode: "discard",
  }).trim();
  return sanitized ? sanitized.slice(0, 2_000) : null;
}
