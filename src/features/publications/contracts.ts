import { z } from "zod";

export const publicationKindSchema = z.enum([
  "SCHEDULE",
  "PRICING",
  "FORM",
  "GIFT_CARDS",
  "WIDGET",
]);

export const publicationTargetStatusSchema = z.enum([
  "DRAFT",
  "PUBLISHED",
  "PAUSED",
  "ARCHIVED",
]);

const optionalUrlSchema = z
  .string()
  .url()
  .max(2_048)
  .refine(
    (value) => {
      const protocol = new URL(value).protocol;
      return protocol === "https:" || protocol === "http:";
    },
    { message: "Only HTTP and HTTPS URLs are supported." },
  )
  .nullable()
  .default(null);

export const publicationSeoConfigSchema = z.object({
  title: z.string().trim().max(120).nullable().default(null),
  description: z.string().trim().max(320).nullable().default(null),
  imageUrl: optionalUrlSchema,
  canonicalUrl: optionalUrlSchema,
  index: z.boolean().default(true),
  follow: z.boolean().default(true),
});

export const publicationConsentConfigSchema = z.object({
  mode: z.enum(["DISABLED", "REQUIRED"]).default("DISABLED"),
  version: z.string().trim().min(1).max(40).default("1.0"),
  privacyPolicyUrl: optionalUrlSchema,
  categories: z
    .array(z.enum(["ANALYTICS", "MARKETING", "PERSONALIZATION"]))
    .max(3)
    .default([]),
});

const scheduleChannelConfigSchema = z.object({
  kind: z.literal("SCHEDULE"),
  maxDaysAhead: z.number().int().min(1).max(365).default(30),
  classTypeIds: z.array(z.string().min(1).max(128)).max(100).default([]),
  showAvailability: z.boolean().default(true),
});

const pricingChannelConfigSchema = z.object({
  kind: z.literal("PRICING"),
  showTerms: z.boolean().default(true),
  allowDirectPurchase: z.boolean().default(true),
});

const frameOriginSchema = z.string().trim().max(2_048).transform((value, ctx) => {
  try {
    const url = new URL(value);
    const isLocalHttp =
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1");
    if (
      (url.protocol !== "https:" && !isLocalHttp) ||
      decodeURIComponent(url.hostname).includes("*") ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      throw new Error("invalid frame origin");
    }
    return url.origin;
  } catch {
    ctx.addIssue({
      code: "custom",
      message: "Use an exact HTTPS origin, or HTTP localhost for development.",
    });
    return z.NEVER;
  }
});

const formChannelConfigSchema = z.object({
  kind: z.literal("FORM"),
  submissionMode: z.enum(["DISABLED", "ENABLED"]).default("DISABLED"),
  responseRetentionDays: z.number().int().min(1).max(3_650).default(365),
  responseConsentLabel: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .default("I agree to the privacy policy and the use of my response."),
  height: z.number().int().min(320).max(2_000).default(720),
  transparentBackground: z.boolean().default(false),
  allowedFrameOrigins: z
    .array(frameOriginSchema)
    .max(20)
    .superRefine((origins, ctx) => {
      if (new Set(origins).size !== origins.length) {
        ctx.addIssue({ code: "custom", message: "Frame origins must be unique." });
      }
    })
    .default([]),
});

const giftCardsChannelConfigSchema = z.object({
  kind: z.literal("GIFT_CARDS"),
  suggestedAmounts: z
    .array(z.string().regex(/^\d+(?:\.\d{1,2})?$/))
    .min(1)
    .max(8)
    .default(["25", "50", "100"]),
});

const widgetChannelConfigSchema = z.object({
  kind: z.literal("WIDGET"),
  height: z.number().int().min(240).max(2_000).default(600),
  transparentBackground: z.boolean().default(false),
  allowedFrameOrigins: z
    .array(frameOriginSchema)
    .max(20)
    .superRefine((origins, ctx) => {
      if (new Set(origins).size !== origins.length) {
        ctx.addIssue({ code: "custom", message: "Frame origins must be unique." });
      }
    })
    .default([]),
});

export const publicationChannelConfigSchema = z.discriminatedUnion("kind", [
  scheduleChannelConfigSchema,
  pricingChannelConfigSchema,
  formChannelConfigSchema,
  giftCardsChannelConfigSchema,
  widgetChannelConfigSchema,
]);

const targetBaseSchema = z.object({
  sourceKey: z.string().trim().min(1).max(256),
  name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  themePresetId: z.string().min(1).max(128).nullable().default(null),
  seoConfig: publicationSeoConfigSchema.default({
    title: null,
    description: null,
    imageUrl: null,
    canonicalUrl: null,
    index: true,
    follow: true,
  }),
  consentConfig: publicationConsentConfigSchema.default({
    mode: "DISABLED",
    version: "1.0",
    privacyPolicyUrl: null,
    categories: [],
  }),
  domainHost: z.string().trim().max(253).nullable().default(null),
});

export const createPublicationTargetSchema = z.discriminatedUnion("kind", [
  targetBaseSchema.extend({
    kind: z.literal("SCHEDULE"),
    channelConfig: scheduleChannelConfigSchema,
  }),
  targetBaseSchema.extend({
    kind: z.literal("PRICING"),
    channelConfig: pricingChannelConfigSchema,
  }),
  targetBaseSchema.extend({
    kind: z.literal("FORM"),
    channelConfig: formChannelConfigSchema,
  }),
  targetBaseSchema.extend({
    kind: z.literal("GIFT_CARDS"),
    channelConfig: giftCardsChannelConfigSchema,
  }),
  targetBaseSchema.extend({
    kind: z.literal("WIDGET"),
    channelConfig: widgetChannelConfigSchema,
  }),
]);

export const updatePublicationTargetSchema = z.object({
  id: z.string().min(1).max(128),
  name: z.string().trim().min(1).max(120).optional(),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  themePresetId: z.string().min(1).max(128).nullable().optional(),
  seoConfig: publicationSeoConfigSchema.optional(),
  consentConfig: publicationConsentConfigSchema.optional(),
  channelConfig: publicationChannelConfigSchema.optional(),
  domainHost: z.string().trim().max(253).nullable().optional(),
});

export const publicationTargetIdSchema = z.object({
  id: z.string().min(1).max(128),
});

export const publishPublicationTargetSchema = publicationTargetIdSchema.extend({
  changeNote: z.string().trim().max(500).nullable().default(null),
});

export const rollbackPublicationTargetSchema = publicationTargetIdSchema.extend(
  {
    versionId: z.string().min(1).max(128),
    changeNote: z.string().trim().max(500).nullable().default(null),
  },
);

export type PublicationKind = z.infer<typeof publicationKindSchema>;
export type PublicationChannelConfig = z.infer<
  typeof publicationChannelConfigSchema
>;
export type PublicationSeoConfig = z.infer<typeof publicationSeoConfigSchema>;
export type PublicationConsentConfig = z.infer<
  typeof publicationConsentConfigSchema
>;
