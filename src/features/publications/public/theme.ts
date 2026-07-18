import { z } from "zod";

import { sanitizeCssValue } from "@/features/funnel-builder/lib/published-funnel-sanitization";

const optionalToken = z.string().nullable().optional();
const themeSchema = z.object({
  primaryColor: optionalToken,
  secondaryColor: optionalToken,
  accentColor: optionalToken,
  backgroundColor: optionalToken,
  textColor: optionalToken,
  mutedColor: optionalToken,
  borderColor: optionalToken,
  fontFamily: optionalToken,
  headingFont: optionalToken,
});

export function buildPublicationThemeCss(value: unknown): string {
  const parsed = themeSchema.safeParse(value);
  if (!parsed.success) return "";
  const declarations = [
    token("--publication-primary", parsed.data.primaryColor),
    token("--publication-secondary", parsed.data.secondaryColor),
    token("--publication-accent", parsed.data.accentColor),
    token("--publication-background", parsed.data.backgroundColor),
    token("--publication-text", parsed.data.textColor),
    token("--publication-muted", parsed.data.mutedColor),
    token("--publication-border", parsed.data.borderColor),
    token("--publication-font", parsed.data.fontFamily),
    token("--publication-heading-font", parsed.data.headingFont),
  ].filter((entry): entry is string => Boolean(entry));
  if (!declarations.length) return "";
  return `
    .aurea-publication-root {
      ${declarations.join(";")};
      min-height: 100vh;
      background: var(--publication-background, #ffffff);
      color: var(--publication-text, #111827);
      font-family: var(--publication-font, system-ui), system-ui, sans-serif;
    }
    .aurea-publication-root h1,
    .aurea-publication-root h2,
    .aurea-publication-root h3 {
      font-family: var(--publication-heading-font, var(--publication-font, system-ui));
    }
  `.trim();
}

function token(name: string, value: string | null | undefined): string | null {
  const sanitized = sanitizeCssValue(value);
  return sanitized === null ? null : `${name}:${sanitized}`;
}
