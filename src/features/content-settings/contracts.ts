import { z } from "zod";

export const contentLibraryKinds = [
  "TERMINOLOGY_PACK",
  "FAQ_COLLECTION",
  "MESSAGE_MACRO",
  "PUBLIC_PROFILE",
] as const;

export const contentLibraryKindSchema = z.enum(contentLibraryKinds);

const contentKeySchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z][a-z0-9_-]*$/);

const terminologyTermSchema = z.object({
  key: contentKeySchema,
  label: z.string().trim().min(1).max(80),
  pluralLabel: z.string().trim().min(1).max(80),
});

export const terminologyPackPayloadSchema = z
  .object({
    kind: z.literal("TERMINOLOGY_PACK"),
    terms: z.array(terminologyTermSchema).min(1).max(100),
  })
  .superRefine((value, context) => {
    if (new Set(value.terms.map((term) => term.key)).size !== value.terms.length) {
      context.addIssue({
        code: "custom",
        path: ["terms"],
        message: "Terminology keys must be unique.",
      });
    }
  });

const faqEntrySchema = z.object({
  id: z.string().trim().min(1).max(128),
  question: z.string().trim().min(1).max(500),
  answer: z.string().trim().min(1).max(10_000),
  sortOrder: z.number().int().min(0).max(10_000),
  isVisible: z.boolean().default(true),
});

export const faqCollectionPayloadSchema = z
  .object({
    kind: z.literal("FAQ_COLLECTION"),
    entries: z.array(faqEntrySchema).max(200),
  })
  .superRefine((value, context) => {
    if (new Set(value.entries.map((entry) => entry.id)).size !== value.entries.length) {
      context.addIssue({
        code: "custom",
        path: ["entries"],
        message: "FAQ entry IDs must be unique.",
      });
    }
  });

export const messageMacroPayloadSchema = z.object({
  kind: z.literal("MESSAGE_MACRO"),
  content: z.string().trim().min(1).max(10_000),
  channel: z.enum(["ALL", "EMAIL", "SMS", "INBOX"]).default("ALL"),
  tags: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  isActive: z.boolean().default(true),
});

export const publicProfilePayloadSchema = z.object({
  kind: z.literal("PUBLIC_PROFILE"),
  slug: contentKeySchema,
  displayName: z.string().trim().min(1).max(160),
  summary: z.string().trim().max(5_000).nullable().default(null),
  email: z.string().email().nullable().default(null),
  phone: z.string().trim().min(3).max(40).nullable().default(null),
  websiteUrl: z.string().url().nullable().default(null),
  bookingUrl: z.string().url().nullable().default(null),
  address: z
    .object({
      line1: z.string().trim().max(160).nullable().default(null),
      line2: z.string().trim().max(160).nullable().default(null),
      city: z.string().trim().max(100).nullable().default(null),
      region: z.string().trim().max(100).nullable().default(null),
      postalCode: z.string().trim().max(24).nullable().default(null),
      countryCode: z
        .string()
        .trim()
        .regex(/^[A-Z]{2}$/)
        .nullable()
        .default(null),
    })
    .default({
      line1: null,
      line2: null,
      city: null,
      region: null,
      postalCode: null,
      countryCode: null,
    }),
  socialLinks: z
    .array(
      z.object({
        platform: z.string().trim().min(1).max(60),
        url: z.string().url(),
      }),
    )
    .max(30)
    .default([]),
});

export const contentLibraryPayloadSchema = z.discriminatedUnion("kind", [
  terminologyPackPayloadSchema,
  faqCollectionPayloadSchema,
  messageMacroPayloadSchema,
  publicProfilePayloadSchema,
]);

const itemIdentitySchema = z.object({
  name: z.string().trim().min(1).max(160),
  key: contentKeySchema,
  description: z.string().trim().max(1_000).nullable().default(null),
});

export const createContentLibraryItemSchema = itemIdentitySchema.extend({
  payload: contentLibraryPayloadSchema,
  changeNote: z.string().trim().max(240).nullable().default(null),
});

export const versionContentLibraryItemSchema = z.object({
  itemId: z.string().min(1).max(128),
  expectedVersion: z.number().int().positive(),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1_000).nullable().default(null),
  payload: contentLibraryPayloadSchema,
  changeNote: z.string().trim().max(240).nullable().default(null),
});

export const publishContentLibraryItemSchema = z.object({
  itemId: z.string().min(1).max(128),
  version: z.number().int().positive(),
});

export const rollbackContentLibraryItemSchema = z.object({
  itemId: z.string().min(1).max(128),
  targetVersion: z.number().int().positive(),
  expectedVersion: z.number().int().positive(),
  changeNote: z.string().trim().max(240).nullable().default(null),
});

export const archiveContentLibraryItemSchema = z.object({
  itemId: z.string().min(1).max(128),
});

export const getContentLibraryItemSchema = z.object({
  itemId: z.string().min(1).max(128),
});

export const listContentLibraryItemsSchema = z.object({
  kind: contentLibraryKindSchema.optional(),
  search: z.string().trim().max(160).default(""),
  includeArchived: z.boolean().default(false),
});

export type ContentLibraryKind = z.infer<typeof contentLibraryKindSchema>;
export type ContentLibraryPayload = z.infer<typeof contentLibraryPayloadSchema>;

export function assertPayloadKind(input: {
  itemKind: ContentLibraryKind;
  payload: ContentLibraryPayload;
}): void {
  if (input.itemKind !== input.payload.kind) {
    throw new Error("Content payload kind does not match the library item.");
  }
}
