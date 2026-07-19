import sanitizeHtmlLibrary from "sanitize-html";

const RICH_TEXT_TAGS = [
  "a",
  "blockquote",
  "br",
  "code",
  "del",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "li",
  "ol",
  "p",
  "pre",
  "span",
  "strong",
  "sub",
  "sup",
  "u",
  "ul",
] as const;

const SAFE_SCHEMES = ["http", "https", "mailto", "tel"];
const UNSAFE_CSS_PATTERN =
  /(?:expression\s*\(|javascript\s*:|vbscript\s*:|data\s*:|@import|behavior\s*:|-moz-binding|[<>{};\\])/i;

export function sanitizeRichText(html: string): string {
  return sanitizeHtmlLibrary(html, {
    allowedTags: [...RICH_TEXT_TAGS],
    allowedAttributes: {
      a: ["href", "target", "rel", "title"],
      "*": ["aria-label"],
    },
    allowedSchemes: SAFE_SCHEMES,
    allowProtocolRelative: false,
    transformTags: { a: sanitizeAnchor },
  });
}

export function sanitizeCssValue(value: unknown): string | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : null;
  }
  if (typeof value !== "string") return null;

  const candidate = value.trim();
  if (!candidate || UNSAFE_CSS_PATTERN.test(candidate)) return null;

  const urlMatch = candidate.match(/^url\((['"]?)(.*?)\1\)$/i);
  if (candidate.toLowerCase().includes("url(")) {
    const safeUrl = urlMatch ? sanitizePublicUrl(urlMatch[2], "media") : null;
    return safeUrl ? `url("${safeUrl.replace(/"/g, "%22")}")` : null;
  }

  return candidate;
}

function sanitizePublicUrl(
  value: unknown,
  kind: "navigation" | "media" = "navigation",
): string | null {
  if (typeof value !== "string") return null;

  const candidate = value.trim();
  if (!candidate || /[\u0000-\u001f\u007f]/.test(candidate)) return null;
  if (candidate.startsWith("//")) return null;
  if (
    candidate.startsWith("/") ||
    candidate.startsWith("./") ||
    candidate.startsWith("../") ||
    candidate.startsWith("#") ||
    candidate.startsWith("?")
  ) {
    return candidate;
  }

  try {
    const parsed = new URL(candidate);
    const allowedProtocols =
      kind === "media"
        ? new Set(["http:", "https:"])
        : new Set(["http:", "https:", "mailto:", "tel:"]);
    return allowedProtocols.has(parsed.protocol) ? candidate : null;
  } catch {
    return null;
  }
}

function sanitizeAnchor(
  tagName: string,
  attributes: sanitizeHtmlLibrary.Attributes,
): sanitizeHtmlLibrary.Tag {
  const href = sanitizePublicUrl(attributes.href);
  const nextAttributes = { ...attributes };
  if (href) nextAttributes.href = href;
  else delete nextAttributes.href;

  if (nextAttributes.target === "_blank") {
    nextAttributes.rel = "noopener noreferrer";
  } else {
    delete nextAttributes.target;
  }

  return { tagName, attribs: nextAttributes };
}
