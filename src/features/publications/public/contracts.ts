import { z } from "zod";

import { DeviceType, FunnelBlockType, PixelProvider } from "@/db/enums";
import { publishedFormSourceSchema } from "@/features/forms-builder/lib/public-form-contract";
import {
  publicationChannelConfigSchema,
  publicationConsentConfigSchema,
  publicationSeoConfigSchema,
} from "@/features/publications/contracts";
import {
  bookingWidgetConfigSchema,
  eventWidgetConfigSchema,
  instructorWidgetConfigSchema,
  introOfferWidgetConfigSchema,
  membershipWidgetConfigSchema,
  onDemandWidgetConfigSchema,
  referralWidgetConfigSchema,
  scheduleWidgetConfigSchema,
} from "@/features/studio/widgets/contracts";
import { calBookingPathSegmentSchema } from "@/features/studio/widgets/booking-destination";
import { parsePublicMediaUrl } from "@/features/studio/widgets/public-media-url";

const nullableText = z.string().nullable();
const publicImageUrlSchema = z
  .string()
  .url()
  .max(2_048)
  .refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === "https:" ||
      (url.protocol === "http:" &&
        (url.hostname === "localhost" || url.hostname === "127.0.0.1"))
    );
  });

const publicEventImageUrlSchema = z
  .string()
  .url()
  .max(2_048)
  .refine((value) => parsePublicMediaUrl(value) === value, {
    message: "Event images must use credential-free public HTTPS URLs",
  });

export const publishedFunnelSourceSchema = z.object({
  type: z.literal("FUNNEL"),
  funnel: z
    .object({
      id: z.string(),
      name: z.string(),
      locationId: nullableText,
    })
    .nullable(),
  pages: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      order: z.number().int(),
      isPublished: z.boolean(),
      metaTitle: nullableText,
      metaDescription: nullableText,
      metaImage: nullableText,
      customCss: nullableText,
      customJs: nullableText,
    }),
  ),
  blocks: z.array(
    z.object({
      id: z.string(),
      pageId: nullableText,
      parentBlockId: nullableText,
      type: z.nativeEnum(FunnelBlockType),
      props: z.unknown(),
      styles: z.unknown(),
      order: z.number().int(),
      visible: z.boolean(),
    }),
  ),
  breakpoints: z.array(
    z.object({
      blockId: z.string(),
      device: z.nativeEnum(DeviceType),
      styles: z.unknown(),
    }),
  ),
  events: z.array(
    z.object({
      blockId: z.string(),
      eventType: z.string(),
      eventName: nullableText,
      parameters: z.unknown().nullable(),
    }),
  ),
  pixels: z.array(
    z.object({
      provider: z.nativeEnum(PixelProvider),
      pixelId: z.string(),
      enabled: z.boolean(),
      metadata: z.unknown().nullable(),
    }),
  ),
});

const publicationBrandSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  companyName: z.string().optional(),
  slug: nullableText.optional(),
  logo: nullableText.optional(),
  brandColor: nullableText.optional(),
  accentColor: nullableText.optional(),
});

export const publishedScheduleSourceSchema = z.discriminatedUnion("scope", [
  z.object({
    type: z.literal("SCHEDULE"),
    scope: z.literal("ORGANIZATION"),
    organization: publicationBrandSchema.nullable(),
  }),
  z.object({
    type: z.literal("SCHEDULE"),
    scope: z.literal("LOCATION"),
    location: publicationBrandSchema.nullable(),
  }),
]);

export const publishedScheduleWidgetSourceSchema = z.object({
  type: z.literal("WIDGET"),
  widget: z.object({
    id: z.string(),
    name: z.string(),
    type: z.literal("SCHEDULE"),
    locationId: nullableText,
    config: scheduleWidgetConfigSchema,
    isActive: z.literal(true),
    updatedAt: z.string().datetime(),
  }),
  brand: publicationBrandSchema,
});

export const publishedInstructorWidgetSourceSchema = z.object({
  type: z.literal("WIDGET"),
  widget: z.object({
    id: z.string(),
    name: z.string(),
    type: z.literal("INSTRUCTORS"),
    locationId: nullableText,
    config: instructorWidgetConfigSchema,
    isActive: z.literal(true),
    updatedAt: z.string().datetime(),
  }),
  brand: publicationBrandSchema,
  instructors: z
    .array(
      z
        .object({
          id: z.string(),
          name: z.string().min(1).max(160),
          profilePhoto: publicImageUrlSchema.nullable(),
          bio: z.string().max(2_000).nullable(),
          specialties: z.array(z.string().max(120)).max(20),
          certifications: z.array(z.string().max(120)).max(20),
        })
        .strict(),
    )
    .min(1)
    .max(100),
});

export const publishedMembershipWidgetSourceSchema = z.object({
  type: z.literal("WIDGET"),
  widget: z.object({
    id: z.string(),
    name: z.string(),
    type: z.literal("MEMBERSHIP"),
    locationId: nullableText,
    config: membershipWidgetConfigSchema,
    isActive: z.literal(true),
    updatedAt: z.string().datetime(),
  }),
  brand: publicationBrandSchema,
  offers: z
    .array(
      z
        .object({
          id: z.string(),
          name: z.string().min(1).max(160),
          descriptionHtml: z.string().max(2_000).nullable(),
          price: z.string().regex(/^\d+(?:\.\d+)?$/),
          currency: z.string().length(3),
          billingInterval: z.enum([
            "WEEKLY",
            "MONTHLY",
            "QUARTERLY",
            "ANNUALLY",
            "ONE_TIME",
          ]),
          classCredits: z.number().int().nullable(),
          durationDays: z.number().int().nullable(),
          accessSummary: z.string().max(500).nullable(),
          updatedAt: z.string().datetime(),
        })
        .strict(),
    )
    .min(1)
    .max(24),
});

export const publishedBookingWidgetSourceSchema = z
  .object({
    type: z.literal("WIDGET"),
    widget: z.object({
      id: z.string(),
      name: z.string(),
      type: z.literal("BOOKING"),
      locationId: z.string().min(1),
      config: bookingWidgetConfigSchema,
      isActive: z.literal(true),
      updatedAt: z.string().datetime(),
    }),
    brand: publicationBrandSchema,
    events: z
      .array(
        z
          .object({
            id: z.string(),
            title: z.string().min(1).max(160),
            description: z.string().max(2_000).nullable(),
            length: z.number().int().positive().max(1_440),
            locationType: z.enum([
              "CAL_VIDEO",
              "PHONE",
              "IN_PERSON",
              "GOOGLE_MEET",
              "ZOOM",
              "MS_TEAMS",
              "CUSTOM",
            ]),
            calEventTypeId: z.number().int().positive(),
            calComCredentialId: z.string().min(1),
            calUsername: calBookingPathSegmentSchema,
            slug: calBookingPathSegmentSchema,
          })
          .strict(),
      )
      .min(1)
      .max(12),
  })
  .strict();

export const publishedIntroOfferWidgetSourceSchema = z
  .object({
    type: z.literal("WIDGET"),
    widget: z.object({
      id: z.string(),
      name: z.string(),
      type: z.literal("INTRO_OFFER"),
      locationId: nullableText,
      config: introOfferWidgetConfigSchema,
      isActive: z.literal(true),
      updatedAt: z.string().datetime(),
    }),
    brand: publicationBrandSchema,
    organizationSlug: z.string().min(1).max(120),
    offers: z
      .array(
        z
          .object({
            id: z.string(),
            name: z.string().min(1).max(160),
            descriptionHtml: z.string().max(2_000).nullable(),
            price: z.string().regex(/^\d+(?:\.\d+)?$/),
            currency: z.string().length(3),
            billingInterval: z.enum([
              "WEEKLY",
              "MONTHLY",
              "QUARTERLY",
              "ANNUALLY",
              "ONE_TIME",
            ]),
            classCredits: z.number().int().nullable(),
            durationDays: z.number().int().nullable(),
            accessSummary: z.string().max(500).nullable(),
            updatedAt: z.string().datetime(),
            pricingTarget: z
              .object({
                id: z.string().min(1),
                slug: z.string().min(1).max(120),
                versionId: z.string().min(1),
              })
              .strict(),
          })
          .strict(),
      )
      .min(1)
      .max(12),
  })
  .strict();

export const publishedEventWidgetSourceSchema = z
  .object({
    type: z.literal("WIDGET"),
    widget: z
      .object({
        id: z.string(),
        name: z.string(),
        type: z.literal("EVENT"),
        locationId: nullableText,
        config: eventWidgetConfigSchema,
        isActive: z.literal(true),
        updatedAt: z.string().datetime(),
      })
      .strict(),
    brand: publicationBrandSchema,
    timezone: z.string().min(1).max(100),
    events: z
      .array(
        z
          .object({
            id: z.string().min(1),
            name: z.string().min(1).max(160),
            description: z.string().max(2_000).nullable(),
            imageUrl: publicEventImageUrlSchema.nullable(),
            format: z.enum(["IN_PERSON", "VIRTUAL", "HYBRID"]),
            defaultLocation: z.string().max(240).nullable(),
            durationMinutes: z.number().int().positive().max(10_080),
            price: z.string().regex(/^\d+(?:\.\d+)?$/).nullable(),
            currency: z.string().length(3),
            updatedAt: z.string().datetime(),
            occurrences: z
              .array(
                z
                  .object({
                    id: z.string().min(1),
                    name: z.string().min(1).max(160),
                    startTime: z.string().datetime(),
                    endTime: z.string().datetime(),
                    instructorName: z.string().max(160).nullable(),
                    location: z.string().max(240).nullable(),
                    roomName: z.string().max(160).nullable(),
                    isVirtual: z.boolean(),
                    updatedAt: z.string().datetime(),
                  })
                  .strict(),
              )
              .min(1)
              .max(6),
          })
          .strict(),
      )
      .min(1)
      .max(12),
  })
  .strict();

const publicMediaUrlSchema = z
  .string()
  .url()
  .max(2_048)
  .refine((value) => parsePublicMediaUrl(value) === value, {
    message: "Public media URLs must be credential-free HTTPS URLs",
  });

export const publishedOnDemandWidgetSourceSchema = z
  .object({
    type: z.literal("WIDGET"),
    widget: z
      .object({
        id: z.string(),
        name: z.string(),
        type: z.literal("ON_DEMAND"),
        locationId: nullableText,
        config: onDemandWidgetConfigSchema,
        isActive: z.literal(true),
        updatedAt: z.string().datetime(),
      })
      .strict(),
    brand: publicationBrandSchema,
    assets: z
      .array(
        z
          .object({
            id: z.string(),
            title: z.string().min(1).max(160),
            description: z.string().max(2_000).nullable(),
            videoUrl: publicMediaUrlSchema,
            thumbnailUrl: publicMediaUrlSchema.nullable(),
            durationSeconds: z.number().int().positive().max(86_400).nullable(),
            instructorName: z.string().max(160).nullable(),
            classTypeName: z.string().max(160).nullable(),
            updatedAt: z.string().datetime(),
          })
          .strict(),
      )
      .min(1)
      .max(24),
  })
  .strict();

export const publishedReferralWidgetSourceSchema = z
  .object({
    type: z.literal("WIDGET"),
    widget: z
      .object({
        id: z.string(),
        name: z.string(),
        type: z.literal("REFERRAL"),
        locationId: nullableText,
        config: referralWidgetConfigSchema,
        isActive: z.literal(true),
        updatedAt: z.string().datetime(),
      })
      .strict(),
    brand: publicationBrandSchema,
    program: z
      .object({
        id: z.string().min(1),
        name: z.string().min(1).max(160),
        referrerRewardType: z.enum([
          "CREDIT",
          "DISCOUNT",
          "FREE_CLASS",
          "CASH",
        ]),
        referrerRewardValue: z.string().regex(/^\d+(?:\.\d+)?$/),
        refereeRewardType: z.enum([
          "CREDIT",
          "DISCOUNT",
          "FREE_CLASS",
          "CASH",
        ]),
        refereeRewardValue: z.string().regex(/^\d+(?:\.\d+)?$/),
        currency: z.string().length(3),
        refereeOfferDays: z.number().int().min(1).max(3_650),
        isActive: z.literal(true),
        updatedAt: z.string().datetime(),
      })
      .strict(),
  })
  .strict();

export const publishedWidgetSourceSchema = z.union([
  publishedScheduleWidgetSourceSchema,
  publishedBookingWidgetSourceSchema,
  publishedInstructorWidgetSourceSchema,
  publishedMembershipWidgetSourceSchema,
  publishedIntroOfferWidgetSourceSchema,
  publishedOnDemandWidgetSourceSchema,
  publishedEventWidgetSourceSchema,
  publishedReferralWidgetSourceSchema,
]);

export const publishedPricingSourceSchema = z.object({
  type: z.literal("PRICING"),
  pricingOption: z
    .object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      description: nullableText,
      type: z.enum([
        "CLASS_PACK",
        "MEMBERSHIP",
        "BUNDLE",
        "DROP_IN",
        "INTRO_OFFER",
        "ACCOUNT_CREDIT",
      ]),
      price: z.string(),
      currency: z.string(),
      billingInterval: z.enum([
        "WEEKLY",
        "MONTHLY",
        "QUARTERLY",
        "ANNUALLY",
        "ONE_TIME",
      ]),
      classCredits: z.number().int().nullable(),
      durationDays: z.number().int().nullable(),
      isIntroOffer: z.boolean(),
      isBundle: z.boolean(),
      isPublic: z.boolean(),
      isHidden: z.boolean(),
      directPurchaseEnabled: z.boolean(),
      buyPagePath: nullableText,
      termsText: nullableText,
      accessSummary: nullableText,
      locationId: nullableText,
      updatedAt: z.string().datetime(),
    })
    .nullable(),
});

export { publishedFormSourceSchema };

export const storedPublicationSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  source: z.unknown(),
  channelConfig: publicationChannelConfigSchema,
});

export const publishedPublicationConfigSchema = z.object({
  snapshot: storedPublicationSnapshotSchema,
  seo: publicationSeoConfigSchema,
  consent: publicationConsentConfigSchema,
});

export type PublishedFunnelSource = z.infer<typeof publishedFunnelSourceSchema>;
export type PublishedScheduleWidgetSource = z.infer<
  typeof publishedScheduleWidgetSourceSchema
>;
export type PublishedInstructorWidgetSource = z.infer<
  typeof publishedInstructorWidgetSourceSchema
>;
export type PublishedMembershipWidgetSource = z.infer<
  typeof publishedMembershipWidgetSourceSchema
>;
export type PublishedBookingWidgetSource = z.infer<
  typeof publishedBookingWidgetSourceSchema
>;
export type PublishedIntroOfferWidgetSource = z.infer<
  typeof publishedIntroOfferWidgetSourceSchema
>;
export type PublishedOnDemandWidgetSource = z.infer<
  typeof publishedOnDemandWidgetSourceSchema
>;
export type PublishedEventWidgetSource = z.infer<
  typeof publishedEventWidgetSourceSchema
>;
export type PublishedReferralWidgetSource = z.infer<
  typeof publishedReferralWidgetSourceSchema
>;
