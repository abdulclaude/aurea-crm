import { z } from "zod";

const cssColorSchema = z
  .string()
  .regex(/^#[0-9a-f]{6}$/i, "Use a six-digit hex color");

export const scheduleWidgetConfigSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  primaryColor: cssColorSchema.default("#2563eb"),
  accentColor: cssColorSchema.default("#16a34a"),
  fontFamily: z
    .enum(["Inter", "Arial", "Georgia", "system-ui"])
    .default("Inter"),
  borderRadius: z.number().int().min(0).max(24).default(8),
  showPrices: z.boolean().default(true),
  showInstructors: z.boolean().default(true),
  maxDaysAhead: z.number().int().min(1).max(90).default(14),
  classTypeIds: z
    .array(z.string().min(1).max(128))
    .max(100)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "Class type filters must be unique",
    })
    .default([]),
}).strict();

export const instructorWidgetConfigSchema = z
  .object({
    schemaVersion: z.literal(1).default(1),
    instructorIds: z
      .array(z.string().min(1).max(128))
      .min(1, "Select at least one instructor")
      .max(100)
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "Instructor selections must be unique",
      }),
    layout: z.enum(["GRID", "LIST"]).default("GRID"),
    columns: z.number().int().min(1).max(4).default(3),
    showProfilePhoto: z.boolean().default(true),
    showBio: z.boolean().default(true),
    showSpecialties: z.boolean().default(true),
    showCertifications: z.boolean().default(false),
  })
  .strict();

export const membershipWidgetConfigSchema = z
  .object({
    schemaVersion: z.literal(1).default(1),
    pricingOptionIds: z
      .array(z.string().min(1).max(128))
      .min(1, "Select at least one membership option")
      .max(24)
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "Membership selections must be unique",
      }),
    layout: z.enum(["GRID", "LIST"]).default("GRID"),
    showPrice: z.boolean().default(true),
    showDescription: z.boolean().default(true),
    showAccessSummary: z.boolean().default(true),
    showBillingInterval: z.boolean().default(true),
    featuredPricingOptionId: z.string().min(1).max(128).nullable().default(null),
  })
  .strict()
  .superRefine((config, ctx) => {
    if (
      config.featuredPricingOptionId &&
      !config.pricingOptionIds.includes(config.featuredPricingOptionId)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["featuredPricingOptionId"],
        message: "The featured membership must be selected",
      });
    }
  });

export const bookingWidgetConfigSchema = z
  .object({
    schemaVersion: z.literal(1).default(1),
    eventTypeIds: z
      .array(z.string().min(1).max(128))
      .min(1, "Select at least one appointment type")
      .max(12)
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "Appointment selections must be unique",
      }),
    layout: z.enum(["GRID", "LIST"]).default("GRID"),
    showDescription: z.boolean().default(true),
    showDuration: z.boolean().default(true),
    showPrice: z.boolean().default(false),
    buttonLabel: z.string().trim().min(1).max(40).default("Book appointment"),
  })
  .strict();

export const introOfferWidgetConfigSchema = z
  .object({
    schemaVersion: z.literal(1).default(1),
    pricingOptionIds: z
      .array(z.string().min(1).max(128))
      .min(1, "Select at least one intro offer")
      .max(12)
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "Intro offer selections must be unique",
      }),
    layout: z.enum(["GRID", "LIST"]).default("GRID"),
    showPrice: z.boolean().default(true),
    showDescription: z.boolean().default(true),
    showDuration: z.boolean().default(true),
    showAccessSummary: z.boolean().default(true),
    featuredPricingOptionId: z.string().min(1).max(128).nullable().default(null),
    buttonLabel: z.string().trim().min(1).max(40).default("View intro offer"),
  })
  .strict()
  .superRefine((config, ctx) => {
    if (
      config.featuredPricingOptionId &&
      !config.pricingOptionIds.includes(config.featuredPricingOptionId)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["featuredPricingOptionId"],
        message: "The featured intro offer must be selected",
      });
    }
  });

export const onDemandWidgetConfigSchema = z
  .object({
    schemaVersion: z.literal(1).default(1),
    assetIds: z
      .array(z.string().min(1).max(128))
      .min(1, "Select at least one public free video")
      .max(24)
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "Video selections must be unique",
      }),
    layout: z.enum(["GRID", "LIST"]).default("GRID"),
    columns: z.number().int().min(1).max(3).default(3),
    showDescription: z.boolean().default(true),
    showDuration: z.boolean().default(true),
    showInstructor: z.boolean().default(true),
    showClassType: z.boolean().default(true),
  })
  .strict();

export const eventWidgetConfigSchema = z
  .object({
    schemaVersion: z.literal(1).default(1),
    serviceTypeIds: z
      .array(z.string().min(1).max(128))
      .min(1, "Select at least one event")
      .max(12)
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "Event selections must be unique",
      }),
    layout: z.enum(["GRID", "LIST"]).default("GRID"),
    occurrencesPerEvent: z.number().int().min(1).max(6).default(3),
    showDescription: z.boolean().default(true),
    showImage: z.boolean().default(true),
    showPrice: z.boolean().default(true),
    showSchedule: z.boolean().default(true),
    showLocation: z.boolean().default(true),
  })
  .strict();

export const referralWidgetConfigSchema = z
  .object({
    schemaVersion: z.literal(1).default(1),
    programId: z.string().min(1).max(128),
    layout: z.enum(["STACKED", "INLINE"]).default("STACKED"),
    showReferrerReward: z.boolean().default(true),
    showRefereeReward: z.boolean().default(true),
    showOfferWindow: z.boolean().default(true),
  })
  .strict()
  .superRefine((config, ctx) => {
    if (!config.showReferrerReward && !config.showRefereeReward) {
      ctx.addIssue({
        code: "custom",
        path: ["showRefereeReward"],
        message: "Show at least one referral reward",
      });
    }
  });

export type ScheduleWidgetConfig = z.infer<
  typeof scheduleWidgetConfigSchema
>;

export type InstructorWidgetConfig = z.infer<
  typeof instructorWidgetConfigSchema
>;

export type MembershipWidgetConfig = z.infer<
  typeof membershipWidgetConfigSchema
>;

export type BookingWidgetConfig = z.infer<typeof bookingWidgetConfigSchema>;

export type IntroOfferWidgetConfig = z.infer<
  typeof introOfferWidgetConfigSchema
>;

export type OnDemandWidgetConfig = z.infer<
  typeof onDemandWidgetConfigSchema
>;

export type EventWidgetConfig = z.infer<typeof eventWidgetConfigSchema>;

export type ReferralWidgetConfig = z.infer<
  typeof referralWidgetConfigSchema
>;
