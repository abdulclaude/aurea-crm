import { z } from "zod";

const idSchema = z.string().trim().min(1).max(128);
const optionalText = z.string().trim().max(2_000).nullable().default(null);

export const commerceTaxRateKinds = ["EXCLUSIVE", "INCLUSIVE"] as const;
export const commerceTaxAssignmentSubjects = ["LINE_TYPE", "PRODUCT"] as const;
export const commerceLineTypes = [
  "MEMBERSHIP",
  "CLASS",
  "ADD_ON",
  "GIFT_CARD",
  "RETAIL",
  "OTHER",
] as const;
export const offlinePaymentKinds = [
  "CASH",
  "CARD_TERMINAL",
  "BANK_TRANSFER",
  "CHEQUE",
  "OTHER",
] as const;

export const taxRateValuesSchema = z.object({
  name: z.string().trim().min(1).max(120),
  code: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .regex(/^[A-Z0-9_-]+$/),
  rateBasisPoints: z.number().int().min(0).max(10_000),
  kind: z.enum(commerceTaxRateKinds),
  description: optionalText,
});

export const createTaxRateSchema = taxRateValuesSchema;
export const updateTaxRateSchema = taxRateValuesSchema.extend({ id: idSchema });
export const archiveTaxRateSchema = z.object({ id: idSchema });

export const taxAssignmentValuesSchema = z
  .object({
    subjectType: z.enum(commerceTaxAssignmentSubjects),
    lineType: z.enum(commerceLineTypes).nullable().default(null),
    productId: idSchema.nullable().default(null),
    taxRateId: idSchema.nullable().default(null),
  })
  .superRefine((value, context) => {
    if (value.subjectType === "LINE_TYPE" && !value.lineType) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose a line type.",
        path: ["lineType"],
      });
    }
    if (value.subjectType === "LINE_TYPE" && value.productId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A line-type assignment cannot select a product.",
        path: ["productId"],
      });
    }
    if (value.subjectType === "PRODUCT" && !value.productId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose a product.",
        path: ["productId"],
      });
    }
    if (value.subjectType === "PRODUCT" && value.lineType) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A product assignment cannot select a line type.",
        path: ["lineType"],
      });
    }
  });

export const upsertTaxAssignmentSchema = taxAssignmentValuesSchema.safeExtend({
  id: idSchema.nullable().default(null),
});
export const archiveTaxAssignmentSchema = z.object({ id: idSchema });

export const revenueCategoryValuesSchema = z.object({
  name: z.string().trim().min(1).max(120),
  code: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[A-Z0-9_-]+$/),
  description: optionalText,
  accountingAccountReference: z
    .string()
    .trim()
    .max(255)
    .nullable()
    .default(null),
  accountingAccountName: z.string().trim().max(255).nullable().default(null),
});
export const createRevenueCategorySchema = revenueCategoryValuesSchema;
export const updateRevenueCategorySchema = revenueCategoryValuesSchema.extend({
  id: idSchema,
});
export const archiveRevenueCategorySchema = z.object({ id: idSchema });

export const offlinePaymentMethodValuesSchema = z.object({
  name: z.string().trim().min(1).max(120),
  kind: z.enum(offlinePaymentKinds),
  instructions: optionalText,
  enabled: z.boolean(),
});
export const createOfflinePaymentMethodSchema =
  offlinePaymentMethodValuesSchema;
export const updateOfflinePaymentMethodSchema =
  offlinePaymentMethodValuesSchema.extend({ id: idSchema });
export const archiveOfflinePaymentMethodSchema = z.object({ id: idSchema });

export const saveDocumentDefaultsSchema = z.object({
  invoicePrefix: z.string().trim().max(16).nullable().default(null),
  invoiceDueDays: z.number().int().min(0).max(365).nullable().default(null),
  invoiceFooter: optionalText,
  receiptFooter: optionalText,
  defaultRevenueCategoryId: idSchema.nullable().default(null),
});

export const guestPassPolicyValuesSchema = z.object({
  enabled: z.boolean(),
  passesPerMember: z.number().int().min(0).max(100),
  validityDays: z.number().int().min(1).max(730),
  requiresApproval: z.boolean(),
});
export const versionGuestPassPolicySchema = z.object({
  values: guestPassPolicyValuesSchema,
  expectedVersion: z.number().int().positive().nullable().default(null),
  changeNote: z.string().trim().max(240).nullable().default(null),
});

const guestPassIdempotencyKeySchema = z.string().trim().min(8).max(200);

export const listGuestPassesSchema = z.object({
  ownerClientId: idSchema,
});

export const issueGuestPassSchema = z.object({
  ownerClientId: idSchema,
  guestName: z.string().trim().min(1).max(160),
  guestEmail: z.string().trim().email().max(320).nullable().default(null),
  guestPhone: z.string().trim().max(40).nullable().default(null),
  idempotencyKey: guestPassIdempotencyKeySchema,
});

export const approveGuestPassSchema = z.object({
  guestPassId: idSchema,
});

export const redeemGuestPassSchema = z.object({
  guestPassId: idSchema,
  bookingReference: z.string().trim().max(200).nullable().default(null),
  idempotencyKey: guestPassIdempotencyKeySchema,
});

export const revokeGuestPassSchema = z.object({
  guestPassId: idSchema,
});

export type GuestPassPolicyValues = z.infer<typeof guestPassPolicyValuesSchema>;
