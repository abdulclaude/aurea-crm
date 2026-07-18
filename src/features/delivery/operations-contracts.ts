import { z } from "zod";

import {
  DELIVERY_PROVIDERS,
  OUTBOUND_DELIVERY_STATUSES,
  STORED_COMMUNICATION_CHANNELS,
} from "@/features/delivery/contracts";

export const deliveryDateCursorSchema = z.object({
  at: z.coerce.date(),
  id: z.string().min(1),
});

export const listDeliveryOperationsInputSchema = z.object({
  cursor: deliveryDateCursorSchema.optional(),
  limit: z.number().int().min(1).max(100).default(25),
  status: z.enum(OUTBOUND_DELIVERY_STATUSES).optional(),
  channel: z.enum(STORED_COMMUNICATION_CHANNELS).optional(),
  query: z.string().trim().max(120).optional(),
});

export const deliveryOperationIdSchema = z.object({
  id: z.string().min(1).max(128),
});

export const deliveryOperationListItemSchema = z.object({
  id: z.string(),
  clientId: z.string().nullable(),
  clientName: z.string().nullable(),
  clientEmail: z.string().nullable(),
  channel: z.enum(STORED_COMMUNICATION_CHANNELS),
  provider: z.enum(DELIVERY_PROVIDERS),
  status: z.enum(OUTBOUND_DELIVERY_STATUSES),
  purpose: z.enum(["MARKETING", "TRANSACTIONAL", "ONE_TO_ONE", "SYSTEM"]),
  destination: z.string(),
  sourceType: z.string(),
  sourceId: z.string(),
  attemptCount: z.number().int(),
  maxAttempts: z.number().int(),
  providerMessageId: z.string().nullable(),
  lastFailureClass: z.enum(["RETRYABLE", "TERMINAL", "AMBIGUOUS"]).nullable(),
  lastErrorCode: z.string().nullable(),
  lastErrorMessage: z.string().nullable(),
  nextAttemptAt: z.date().nullable(),
  acceptedAt: z.date().nullable(),
  deliveredAt: z.date().nullable(),
  bouncedAt: z.date().nullable(),
  createdAt: z.date(),
});

export const deliveryOperationPageSchema = z.object({
  items: z.array(deliveryOperationListItemSchema),
  nextCursor: deliveryDateCursorSchema.nullable(),
});

export const deliveryAttemptListItemSchema = z.object({
  id: z.string(),
  attemptNumber: z.number().int(),
  provider: z.enum(DELIVERY_PROVIDERS),
  outcome: z
    .enum(["ACCEPTED", "RETRYABLE_FAILURE", "TERMINAL_FAILURE", "AMBIGUOUS"])
    .nullable(),
  providerMessageId: z.string().nullable(),
  providerRequestId: z.string().nullable(),
  httpStatus: z.number().int().nullable(),
  errorClass: z.enum(["RETRYABLE", "TERMINAL", "AMBIGUOUS"]).nullable(),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  retryAfter: z.date().nullable(),
  startedAt: z.date(),
  completedAt: z.date().nullable(),
});

export const deliveryOperationDetailSchema = z.object({
  delivery: deliveryOperationListItemSchema,
  attempts: z.array(deliveryAttemptListItemSchema),
});

export const deliveryOperationsSummarySchema = z.object({
  queued: z.number().int(),
  inFlight: z.number().int(),
  accepted: z.number().int(),
  delivered: z.number().int(),
  failed: z.number().int(),
  suppressed: z.number().int(),
  unknown: z.number().int(),
});

export type DeliveryOperationListItem = z.infer<
  typeof deliveryOperationListItemSchema
>;
