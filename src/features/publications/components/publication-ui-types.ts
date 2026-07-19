import type { inferRouterOutputs } from "@trpc/server";
import type { z } from "zod";

import {
  createPublicationTargetSchema,
  publicationConsentConfigSchema,
  publicationSeoConfigSchema,
  publicationChannelConfigSchema,
  type PublicationKind,
} from "@/features/publications/contracts";
import type { AppRouter } from "@/trpc/routers/_app";

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type PublicationSource =
  RouterOutputs["publications"]["sourceInventory"][number];
export type PublicationTargetSummary =
  RouterOutputs["publications"]["list"][number];
export type PublicationTarget = RouterOutputs["publications"]["get"];
export type PublicationVersion =
  RouterOutputs["publications"]["versions"][number];
export type CreatePublicationTarget = z.infer<
  typeof createPublicationTargetSchema
>;
export type PublicationSeoConfig = z.infer<typeof publicationSeoConfigSchema>;
export type PublicationConsentConfig = z.infer<
  typeof publicationConsentConfigSchema
>;
export type PublicationChannelConfig = z.infer<
  typeof publicationChannelConfigSchema
>;

export const PUBLICATION_KINDS: PublicationKind[] = [
  "SCHEDULE",
  "PRICING",
  "FORM",
  "GIFT_CARDS",
  "WIDGET",
];

export const KIND_LABELS: Record<PublicationKind, string> = {
  SCHEDULE: "Schedule",
  PRICING: "Pricing",
  FORM: "Form",
  GIFT_CARDS: "Gift cards",
  WIDGET: "Widget",
};

export function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    .replace(/-+$/g, "");
  return slug || "publication";
}

const DEFAULT_SEO: PublicationSeoConfig = {
  title: null,
  description: null,
  imageUrl: null,
  canonicalUrl: null,
  index: true,
  follow: true,
};

const DEFAULT_CONSENT: PublicationConsentConfig = {
  mode: "DISABLED",
  version: "1.0",
  privacyPolicyUrl: null,
  categories: [],
};

export function createInputForSource(
  source: PublicationSource,
): CreatePublicationTarget {
  const base = {
    sourceKey: source.sourceKey,
    name: source.name,
    slug: slugify(source.name),
    themePresetId: null,
    seoConfig: DEFAULT_SEO,
    consentConfig: DEFAULT_CONSENT,
    domainHost: null,
  };
  switch (source.kind) {
    case "SCHEDULE":
      return {
        ...base,
        kind: source.kind,
        channelConfig: {
          kind: source.kind,
          maxDaysAhead: 30,
          classTypeIds: [],
          showAvailability: true,
        },
      };
    case "PRICING":
      return {
        ...base,
        kind: source.kind,
        channelConfig: {
          kind: source.kind,
          showTerms: true,
          allowDirectPurchase: true,
        },
      };
    case "FORM":
      return {
        ...base,
        kind: source.kind,
        channelConfig: {
          kind: source.kind,
          submissionMode: "DISABLED",
          responseRetentionDays: 365,
          responseConsentLabel:
            "I agree to the privacy policy and the use of my response.",
          height: 720,
          transparentBackground: false,
          allowedFrameOrigins: [],
        },
      };
    case "GIFT_CARDS":
      return {
        ...base,
        kind: source.kind,
        channelConfig: {
          kind: source.kind,
          suggestedAmounts: ["25", "50", "100"],
        },
      };
    case "WIDGET":
      return {
        ...base,
        kind: source.kind,
        channelConfig: {
          kind: source.kind,
          height: 600,
          transparentBackground: false,
          allowedFrameOrigins: [],
        },
      };
  }
}

export function parseTargetConfigs(target: PublicationTarget): {
  seoConfig: PublicationSeoConfig;
  consentConfig: PublicationConsentConfig;
  channelConfig: PublicationChannelConfig;
} {
  return {
    seoConfig: publicationSeoConfigSchema.parse(target.seoConfig),
    consentConfig: publicationConsentConfigSchema.parse(target.consentConfig),
    channelConfig: publicationChannelConfigSchema.parse(target.channelConfig),
  };
}

export function formatPublicationDate(value: Date | string | null): string {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
