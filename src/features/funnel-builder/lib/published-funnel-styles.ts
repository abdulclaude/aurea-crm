import type { PublishedFunnelBlock } from "./published-funnel-types";
import {
  sanitizeCssValue,
  sanitizeCustomCss,
  toSafeDomId,
} from "./published-funnel-sanitization";

const NUMERIC_PIXEL_PROPERTIES = new Set([
  "border-radius",
  "border-width",
  "bottom",
  "column-gap",
  "font-size",
  "gap",
  "height",
  "left",
  "letter-spacing",
  "line-height",
  "margin",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "margin-top",
  "max-height",
  "max-width",
  "min-height",
  "min-width",
  "padding",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "right",
  "row-gap",
  "top",
  "width",
]);

export const BASE_FUNNEL_STYLES = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; min-height: 100%; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.5; }
  img, video, iframe { max-width: 100%; }
  [data-aurea-funnel-page] { min-height: 100vh; }
`.trim();

export function getBlockClassName(blockId: string): string {
  return toSafeDomId(blockId, "aurea-block");
}

export function convertStylesToInlineCSS(
  baseStyles: Record<string, unknown>,
  overrideStyles: Record<string, unknown> = {},
): string {
  return Object.entries({ ...baseStyles, ...overrideStyles })
    .map(([key, value]) => serializeDeclaration(key, value))
    .filter((declaration): declaration is string => declaration !== null)
    .join("; ");
}

export function generateResponsiveBlockStyles(
  blocks: PublishedFunnelBlock[],
): string {
  return blocks
    .filter((block) => block.visible)
    .map((block) => {
      const className = getBlockClassName(block.id);
      const base = convertStylesToInlineCSS(
        block.styles as Record<string, unknown>,
        getBreakpointStyleObject(block, "DESKTOP"),
      );
      const tablet = getBreakpointStyles(block, "TABLET");
      const mobile = getBreakpointStyles(block, "MOBILE");

      return [
        base ? `.${className} { ${base}; }` : "",
        tablet
          ? `@media (max-width: 1024px) { .${className} { ${tablet}; } }`
          : "",
        mobile
          ? `@media (max-width: 767px) { .${className} { ${mobile}; } }`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .filter(Boolean)
    .join("\n");
}

export function generatePageStyles(
  blocks: PublishedFunnelBlock[],
  customCss: string | null,
  allowCustomCode: boolean,
): string {
  const custom =
    allowCustomCode && customCss ? sanitizeCustomCss(customCss) : "";
  return [BASE_FUNNEL_STYLES, generateResponsiveBlockStyles(blocks), custom]
    .filter(Boolean)
    .join("\n");
}

function getBreakpointStyles(
  block: PublishedFunnelBlock,
  device: "TABLET" | "MOBILE",
): string {
  const breakpoint = block.breakpoints.find((entry) => entry.device === device);
  return breakpoint
    ? convertStylesToInlineCSS({}, breakpoint.styles as Record<string, unknown>)
    : "";
}

function getBreakpointStyleObject(
  block: PublishedFunnelBlock,
  device: "DESKTOP" | "TABLET" | "MOBILE",
): Record<string, unknown> {
  const breakpoint = block.breakpoints.find((entry) => entry.device === device);
  return (breakpoint?.styles as Record<string, unknown> | undefined) ?? {};
}

function serializeDeclaration(key: string, value: unknown): string | null {
  const cssKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
  if (!/^(?:--)?[a-z][a-z0-9-]*$/.test(cssKey)) return null;

  const sanitizedValue = sanitizeCssValue(value);
  if (sanitizedValue === null) return null;
  const cssValue =
    typeof value === "number" && NUMERIC_PIXEL_PROPERTIES.has(cssKey)
      ? `${sanitizedValue}px`
      : sanitizedValue;
  return `${cssKey}: ${cssValue}`;
}
