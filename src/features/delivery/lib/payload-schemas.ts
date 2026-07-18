import { z } from "zod";

import {
  DELIVERY_CHANNELS,
  DELIVERY_PROVIDERS,
  DELIVERY_PURPOSES,
  OUTBOUND_DELIVERY_STATUSES,
  type DeliveryChannel,
  type DeliveryProvider,
} from "@/features/delivery/contracts";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

const emailAddressSchema = z.string().trim().toLowerCase().email();
const optionalEmailAddressSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email()
  .optional();

const attachmentFilenameSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .refine(
    (filename) =>
      !filename.includes("/") &&
      !filename.includes("\\") &&
      !/[\u0000-\u001f\u007f]/.test(filename),
    {
      message:
        "Attachment filename must not contain paths or control characters",
    },
  );

const legacyAssetAttachmentReferenceSchema = z
  .object({
    assetId: z.string().trim().min(1),
    filename: attachmentFilenameSchema,
    contentType: z.string().trim().min(1),
  })
  .strict();

const invoicePdfAttachmentReferenceSchema = z
  .object({
    kind: z.literal("INVOICE_PDF"),
    invoiceId: z.string().trim().min(1),
    filename: attachmentFilenameSchema,
    contentType: z.literal("application/pdf"),
  })
  .strict();

export const emailAttachmentReferenceSchema = z.union([
  invoicePdfAttachmentReferenceSchema,
  legacyAssetAttachmentReferenceSchema,
]);

export const protectedEmailContentSchema = z
  .object({
    scheme: z.literal("AUREA_ENCRYPTED_V1"),
    html: z.string().min(1).optional(),
    text: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((content, context) => {
    if (!content.html && !content.text) {
      context.addIssue({
        code: "custom",
        message: "Protected email content requires HTML or text ciphertext",
        path: ["html"],
      });
    }
  });

export const emailDeliveryPayloadSchema = z
  .object({
    channel: z.literal("EMAIL"),
    subject: z.string().trim().min(1).max(998),
    html: z.string().min(1).optional(),
    text: z.string().min(1).optional(),
    cc: z.array(emailAddressSchema).max(50).optional(),
    bcc: z.array(emailAddressSchema).max(50).optional(),
    replyTo: optionalEmailAddressSchema,
    unsubscribeUrl: z.string().url().optional(),
    attachments: z.array(emailAttachmentReferenceSchema).max(5).optional(),
    protectedContent: protectedEmailContentSchema.optional(),
  })
  .strict()
  .superRefine((payload, context) => {
    if (!payload.html && !payload.text && !payload.protectedContent) {
      context.addIssue({
        code: "custom",
        message: "Email deliveries require HTML or text content",
        path: ["html"],
      });
    }
  });

export const smsDeliveryPayloadSchema = z
  .object({
    channel: z.literal("SMS"),
    body: z.string().trim().min(1).max(1_600),
  })
  .strict();

const actionUrlSchema = z
  .string()
  .trim()
  .refine(
    (value) => {
      if (value.startsWith("/") && !value.startsWith("//")) {
        return true;
      }

      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Action URL must be relative or use HTTP(S)" },
  );

export const appDeliveryPayloadSchema = z
  .object({
    channel: z.literal("APP"),
    title: z.string().trim().min(1).max(200).optional(),
    body: z.string().trim().min(1).max(10_000),
    actionUrl: actionUrlSchema.optional(),
    data: z.record(z.string(), jsonValueSchema).optional(),
  })
  .strict();

export const deliveryPayloadSchema = z.discriminatedUnion("channel", [
  emailDeliveryPayloadSchema,
  smsDeliveryPayloadSchema,
  appDeliveryPayloadSchema,
]);

export const deliverySenderRefSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("EMAIL_DOMAIN"),
      id: z.string().trim().min(1),
      fromName: z.string().trim().min(1).optional(),
      fromEmail: optionalEmailAddressSchema,
      replyTo: optionalEmailAddressSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("SMS_CONFIG"),
      id: z.string().trim().min(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal("TWILIO_PHONE_NUMBER"),
      id: z.string().trim().min(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal("MAILBOX"),
      provider: z.enum(["GMAIL", "OUTLOOK"]),
      userId: z.string().trim().min(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal("INTERNAL"),
      key: z.string().trim().min(1),
    })
    .strict(),
]);

const PROVIDER_CHANNELS = {
  RESEND: "EMAIL",
  GMAIL: "EMAIL",
  OUTLOOK: "EMAIL",
  TWILIO: "SMS",
  VONAGE: "SMS",
  MESSAGEBIRD: "SMS",
  INTERNAL: "APP",
} as const satisfies Record<DeliveryProvider, DeliveryChannel>;

export const enqueueDeliveryInputSchema = z
  .object({
    organizationId: z.string().trim().min(1),
    locationId: z.string().trim().min(1).nullable(),
    clientId: z.string().trim().min(1).nullable(),
    channel: z.enum(DELIVERY_CHANNELS),
    purpose: z.enum(DELIVERY_PURPOSES),
    provider: z.enum(DELIVERY_PROVIDERS),
    providerAccountId: z.string().trim().min(1).nullable().optional(),
    providerAccountRef: z.string().trim().min(1),
    sourceType: z.string().trim().min(1),
    sourceId: z.string().trim().min(1),
    destination: z.string().trim().min(1),
    sender: deliverySenderRefSchema,
    payload: deliveryPayloadSchema,
    idempotencyKey: z.string().trim().min(1).max(500),
    availableAt: z.date().optional(),
    maxAttempts: z.number().int().min(1).max(20).default(5),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.channel !== input.payload.channel) {
      context.addIssue({
        code: "custom",
        message: "Payload channel must match the delivery channel",
        path: ["payload", "channel"],
      });
    }

    if (PROVIDER_CHANNELS[input.provider] !== input.channel) {
      context.addIssue({
        code: "custom",
        message: "Provider does not support the delivery channel",
        path: ["provider"],
      });
    }

    if (
      ["RESEND", "TWILIO", "VONAGE", "MESSAGEBIRD"].includes(input.provider) &&
      !input.providerAccountId
    ) {
      context.addIssue({
        code: "custom",
        message: "Provider-backed delivery requires an internal account ID",
        path: ["providerAccountId"],
      });
    }

    const senderMatchesProvider =
      (input.provider === "RESEND" && input.sender.kind === "EMAIL_DOMAIN") ||
      ((input.provider === "GMAIL" || input.provider === "OUTLOOK") &&
        input.sender.kind === "MAILBOX" &&
        input.sender.provider === input.provider) ||
      ((input.provider === "TWILIO" ||
        input.provider === "VONAGE" ||
        input.provider === "MESSAGEBIRD") &&
        (input.sender.kind === "SMS_CONFIG" ||
          (input.provider === "TWILIO" &&
            input.sender.kind === "TWILIO_PHONE_NUMBER"))) ||
      (input.provider === "INTERNAL" && input.sender.kind === "INTERNAL");

    if (!senderMatchesProvider) {
      context.addIssue({
        code: "custom",
        message: "Sender reference does not match the delivery provider",
        path: ["sender"],
      });
    }
  });

export const outboundDeliveryStatusSchema = z.enum(OUTBOUND_DELIVERY_STATUSES);

export type DeliveryPayload = z.infer<typeof deliveryPayloadSchema>;
export type DeliverySenderRef = z.infer<typeof deliverySenderRefSchema>;
export type EmailAttachmentReference = z.infer<
  typeof emailAttachmentReferenceSchema
>;
export type EnqueueDeliveryInput = z.infer<typeof enqueueDeliveryInputSchema>;
