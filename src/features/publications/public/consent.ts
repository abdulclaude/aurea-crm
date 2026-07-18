import { z } from "zod";

import type { PublicationConsentConfig } from "@/features/publications/contracts";

export const PUBLICATION_CONSENT_CATEGORIES = [
  "ANALYTICS",
  "MARKETING",
  "PERSONALIZATION",
] as const;
export type PublicationConsentCategory =
  (typeof PUBLICATION_CONSENT_CATEGORIES)[number];

export const storedPublicationConsentDecisionSchema = z.object({
  version: z.string(),
  categories: z.array(z.enum(PUBLICATION_CONSENT_CATEGORIES)),
});

export type StoredPublicationConsentDecision = z.infer<
  typeof storedPublicationConsentDecisionSchema
>;

export function publicationConsentCookieName(targetId: string): string {
  return `aurea_publication_consent_${targetId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

export function buildPublicationConsentCookie(input: {
  targetId: string;
  value: string;
  secure: boolean;
}): string {
  const crossSitePolicy = input.secure
    ? "; SameSite=None; Secure; Partitioned"
    : "; SameSite=Lax";
  return `${publicationConsentCookieName(input.targetId)}=${input.value}; Path=/; Max-Age=31536000${crossSitePolicy}`;
}

export function getPublicationTrackingCategories(input: {
  analytics: "DISABLED" | "CONSENTED" | "ALWAYS";
  config: PublicationConsentConfig;
  cookieValue: string | undefined;
}): Array<Extract<PublicationConsentCategory, "ANALYTICS" | "MARKETING">> {
  if (input.analytics === "DISABLED") return [];
  if (input.config.mode === "DISABLED") {
    return input.analytics === "ALWAYS" ? ["ANALYTICS", "MARKETING"] : [];
  }
  const parsed = readStoredPublicationConsentDecision(input.cookieValue);
  if (!parsed || parsed.version !== input.config.version) return [];
  const configured = new Set(input.config.categories);
  return parsed.categories.filter(
    (
      category,
    ): category is Extract<
      PublicationConsentCategory,
      "ANALYTICS" | "MARKETING"
    > =>
      (category === "ANALYTICS" || category === "MARKETING") &&
      configured.has(category),
  );
}

export function hasPublicationConsentDecision(input: {
  config: PublicationConsentConfig;
  cookieValue: string | undefined;
}): boolean {
  if (input.config.mode === "DISABLED") return true;
  const parsed = readStoredPublicationConsentDecision(input.cookieValue);
  return parsed?.version === input.config.version;
}

export function readStoredPublicationConsentDecision(
  cookieValue: string | undefined,
): StoredPublicationConsentDecision | null {
  if (!cookieValue) return null;

  try {
    return storedPublicationConsentDecisionSchema.parse(
      JSON.parse(decodeURIComponent(cookieValue)),
    );
  } catch {
    return null;
  }
}
