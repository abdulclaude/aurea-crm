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

const CUSTOM_HTML_TAGS = [
  ...RICH_TEXT_TAGS,
  "article",
  "aside",
  "button",
  "details",
  "div",
  "figure",
  "figcaption",
  "footer",
  "header",
  "img",
  "main",
  "nav",
  "section",
  "summary",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
] as const;

const SAFE_SCHEMES = ["http", "https", "mailto", "tel"];
const UNSAFE_CSS_PATTERN =
  /(?:expression\s*\(|javascript\s*:|vbscript\s*:|data\s*:|@import|behavior\s*:|-moz-binding|[<>{};\\])/i;
const UNSAFE_CUSTOM_CSS_PATTERN =
  /(?:<\s*\/\s*style|expression\s*\(|javascript\s*:|vbscript\s*:|@import|-moz-binding|behavior\s*:)/i;

export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };

  return text.replace(/[&<>"']/g, (character) => map[character] ?? character);
}

export function sanitizeRichText(html: string): string {
  return sanitizeHtmlLibrary(html, {
    allowedTags: [...RICH_TEXT_TAGS],
    allowedAttributes: {
      a: ["href", "target", "rel", "title"],
      "*": ["aria-label"],
    },
    allowedSchemes: SAFE_SCHEMES,
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeAnchor,
    },
  });
}

export function sanitizeCustomHtml(html: string): string {
  return sanitizeHtmlLibrary(html, {
    allowedTags: [...CUSTOM_HTML_TAGS],
    allowedAttributes: {
      a: ["href", "target", "rel", "title", "class"],
      button: ["type", "class", "aria-label", "disabled"],
      img: ["src", "alt", "width", "height", "loading", "class"],
      "*": ["class", "id", "role", "title", "aria-*", "data-*"],
    },
    allowedSchemes: SAFE_SCHEMES,
    allowedSchemesByTag: {
      img: ["http", "https"],
    },
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeAnchor,
      img: sanitizeImage,
    },
  });
}

export function sanitizePublicUrl(
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

export function sanitizeCustomCss(css: string): string {
  return UNSAFE_CUSTOM_CSS_PATTERN.test(css) ? "" : css;
}

export function serializeForInlineScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function containInlineScript(script: string): string {
  return script.replace(/<\s*\/\s*script/gi, "<\\/script");
}

export function toSafeDomId(value: string, prefix: string): string {
  const safeValue = value.replace(/[^a-zA-Z0-9_-]/g, "-");
  return `${prefix}-${safeValue || "block"}`;
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

function sanitizeImage(
  tagName: string,
  attributes: sanitizeHtmlLibrary.Attributes,
): sanitizeHtmlLibrary.Tag {
  const src = sanitizePublicUrl(attributes.src, "media");
  const nextAttributes: sanitizeHtmlLibrary.Attributes = {
    ...attributes,
    loading: "lazy",
  };
  if (src) nextAttributes.src = src;
  else delete nextAttributes.src;
  return { tagName, attribs: nextAttributes };
}
