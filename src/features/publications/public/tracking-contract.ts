import { z } from "zod";

const trackingPropertiesSchema = z
  .object({
    interaction: z.enum(["click", "submit"]).optional(),
    label: z
      .string()
      .min(1)
      .max(80)
      .regex(/^[a-zA-Z0-9_.:-]+$/)
      .optional(),
  })
  .strict();

const utmValueSchema = z.string().trim().min(1).max(200);

export const publicationTrackingEventSchema = z
  .object({
    eventId: z.string().uuid(),
    eventName: z.enum(["page_view", "public_interaction"]),
    occurredAt: z.number().int().nonnegative(),
    page: z
      .object({
        path: z.string().min(1).max(2_048),
        title: z.string().max(200).optional(),
        referrerOrigin: z.string().url().max(2_048).optional(),
      })
      .strict(),
    properties: trackingPropertiesSchema.default({}),
    sessionId: z.string().uuid(),
    utm: z
      .object({
        source: utmValueSchema.optional(),
        medium: utmValueSchema.optional(),
        campaign: utmValueSchema.optional(),
        term: utmValueSchema.optional(),
        content: utmValueSchema.optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const publicationTrackingBatchSchema = z
  .object({
    token: z.string().min(1).max(2_048),
    events: z.array(publicationTrackingEventSchema).min(1).max(5),
  })
  .strict();

export type PublicationTrackingBatch = z.infer<
  typeof publicationTrackingBatchSchema
>;
