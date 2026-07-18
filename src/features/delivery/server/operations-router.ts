import "server-only";

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  and,
  count,
  desc,
  eq,
  ilike,
  isNull,
  lt,
  or,
  type SQL,
} from "drizzle-orm";

import { db } from "@/db";
import { client, deliveryAttempt, outboundDelivery } from "@/db/schema";
import {
  deliveryOperationDetailSchema,
  deliveryOperationIdSchema,
  deliveryOperationListItemSchema,
  deliveryOperationPageSchema,
  deliveryOperationsSummarySchema,
  listDeliveryOperationsInputSchema,
} from "@/features/delivery/operations-contracts";
import { requireCapability } from "@/features/permissions/server/authorization";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { resolveTwilioPlatformAccount } from "@/features/communications/server/twilio-client";
import { smsDeliveryPayloadSchema } from "@/features/delivery/lib/payload-schemas";
import { requestDeliveryDispatch } from "@/features/delivery/server/request-dispatch";
import { matchesAmbiguousSmsCandidate } from "@/features/delivery/lib/ambiguous-sms-policy";

type DeliveryScope = {
  organizationId: string;
  locationId: string | null;
};

async function authorizeDeliveryView(input: {
  userId: string;
  organizationId: string | null;
  locationId: string | null;
}): Promise<DeliveryScope> {
  if (!input.organizationId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select an organization before viewing delivery operations.",
    });
  }
  const scope = {
    organizationId: input.organizationId,
    locationId: input.locationId,
  };
  await requireCapability({
    actor: {
      userId: input.userId,
      organizationId: input.organizationId,
      locationId: input.locationId,
    },
    capability: "messaging.view",
    resource: scope,
  });
  return scope;
}

async function authorizeDeliveryManagement(input: {
  userId: string;
  organizationId: string | null;
  locationId: string | null;
}): Promise<DeliveryScope> {
  const scope = await authorizeDeliveryView(input);
  await requireCapability({
    actor: {
      userId: input.userId,
      organizationId: scope.organizationId,
      locationId: scope.locationId,
    },
    capability: "messaging.manage",
    resource: scope,
  });
  return scope;
}

function deliveryScopeConditions(scope: DeliveryScope): SQL[] {
  return [
    eq(outboundDelivery.organizationId, scope.organizationId),
    scope.locationId
      ? eq(outboundDelivery.locationId, scope.locationId)
      : isNull(outboundDelivery.locationId),
  ];
}

const deliveryProjection = {
  id: outboundDelivery.id,
  clientId: outboundDelivery.clientId,
  clientName: client.name,
  clientEmail: client.email,
  channel: outboundDelivery.channel,
  provider: outboundDelivery.provider,
  status: outboundDelivery.status,
  purpose: outboundDelivery.purpose,
  destination: outboundDelivery.destinationNormalized,
  sourceType: outboundDelivery.sourceType,
  sourceId: outboundDelivery.sourceId,
  attemptCount: outboundDelivery.attemptCount,
  maxAttempts: outboundDelivery.maxAttempts,
  providerMessageId: outboundDelivery.providerMessageId,
  lastFailureClass: outboundDelivery.lastFailureClass,
  lastErrorCode: outboundDelivery.lastErrorCode,
  lastErrorMessage: outboundDelivery.lastErrorMessage,
  nextAttemptAt: outboundDelivery.nextAttemptAt,
  acceptedAt: outboundDelivery.acceptedAt,
  deliveredAt: outboundDelivery.deliveredAt,
  bouncedAt: outboundDelivery.bouncedAt,
  createdAt: outboundDelivery.createdAt,
};

export const deliveryOperationsRouter = createTRPCRouter({
  summary: protectedProcedure
    .output(deliveryOperationsSummarySchema)
    .query(async ({ ctx }) => {
      const scope = await authorizeDeliveryView({
        userId: ctx.auth.user.id,
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
      });
      const rows = await db
        .select({ status: outboundDelivery.status, total: count() })
        .from(outboundDelivery)
        .where(and(...deliveryScopeConditions(scope)))
        .groupBy(outboundDelivery.status);
      const counts = new Map(rows.map((row) => [row.status, row.total]));
      return {
        queued: counts.get("QUEUED") ?? 0,
        inFlight: counts.get("SENDING") ?? 0,
        accepted: counts.get("ACCEPTED") ?? 0,
        delivered: counts.get("DELIVERED") ?? 0,
        failed: counts.get("DEAD_LETTER") ?? 0,
        suppressed:
          (counts.get("SUPPRESSED") ?? 0) + (counts.get("BOUNCED") ?? 0),
        unknown: counts.get("UNKNOWN") ?? 0,
      };
    }),

  list: protectedProcedure
    .input(listDeliveryOperationsInputSchema)
    .output(deliveryOperationPageSchema)
    .query(async ({ ctx, input }) => {
      const scope = await authorizeDeliveryView({
        userId: ctx.auth.user.id,
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
      });
      const conditions = deliveryScopeConditions(scope);
      if (input.status) {
        conditions.push(eq(outboundDelivery.status, input.status));
      }
      if (input.channel) {
        conditions.push(eq(outboundDelivery.channel, input.channel));
      }
      if (input.query) {
        const escaped = input.query.replace(/[\\%_]/g, "\\$&");
        const pattern = `%${escaped}%`;
        const search = or(
          ilike(outboundDelivery.destinationNormalized, pattern),
          ilike(outboundDelivery.sourceId, pattern),
          ilike(outboundDelivery.providerMessageId, pattern),
          ilike(client.name, pattern),
          ilike(client.email, pattern),
        );
        if (search) conditions.push(search);
      }
      if (input.cursor) {
        const cursor = or(
          lt(outboundDelivery.createdAt, input.cursor.at),
          and(
            eq(outboundDelivery.createdAt, input.cursor.at),
            lt(outboundDelivery.id, input.cursor.id),
          ),
        );
        if (cursor) conditions.push(cursor);
      }

      const rows = await db
        .select(deliveryProjection)
        .from(outboundDelivery)
        .leftJoin(client, eq(client.id, outboundDelivery.clientId))
        .where(and(...conditions))
        .orderBy(desc(outboundDelivery.createdAt), desc(outboundDelivery.id))
        .limit(input.limit + 1);
      const hasMore = rows.length > input.limit;
      const items = hasMore ? rows.slice(0, input.limit) : rows;
      const last = items.at(-1);
      return {
        items,
        nextCursor:
          hasMore && last ? { at: last.createdAt, id: last.id } : null,
      };
    }),

  getDetail: protectedProcedure
    .input(deliveryOperationIdSchema)
    .output(deliveryOperationDetailSchema)
    .query(async ({ ctx, input }) => {
      const scope = await authorizeDeliveryView({
        userId: ctx.auth.user.id,
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
      });
      const [delivery] = await db
        .select(deliveryProjection)
        .from(outboundDelivery)
        .leftJoin(client, eq(client.id, outboundDelivery.clientId))
        .where(
          and(
            ...deliveryScopeConditions(scope),
            eq(outboundDelivery.id, input.id),
          ),
        )
        .limit(1);
      if (!delivery) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Delivery operation not found.",
        });
      }
      const attempts = await db
        .select({
          id: deliveryAttempt.id,
          attemptNumber: deliveryAttempt.attemptNumber,
          provider: deliveryAttempt.provider,
          outcome: deliveryAttempt.outcome,
          providerMessageId: deliveryAttempt.providerMessageId,
          providerRequestId: deliveryAttempt.providerRequestId,
          httpStatus: deliveryAttempt.httpStatus,
          errorClass: deliveryAttempt.errorClass,
          errorCode: deliveryAttempt.errorCode,
          errorMessage: deliveryAttempt.errorMessage,
          retryAfter: deliveryAttempt.retryAfter,
          startedAt: deliveryAttempt.startedAt,
          completedAt: deliveryAttempt.completedAt,
        })
        .from(deliveryAttempt)
        .where(eq(deliveryAttempt.deliveryId, delivery.id))
        .orderBy(desc(deliveryAttempt.attemptNumber));
      return {
        delivery: deliveryOperationListItemSchema.parse(delivery),
        attempts,
      };
    }),

  resolveUnknownTwilio: protectedProcedure
    .input(
      z.discriminatedUnion("resolution", [
        z.object({
          id: z.string().min(1),
          resolution: z.literal("CORRELATE"),
          providerMessageId: z.string().regex(/^SM[a-fA-F0-9]{32}$/),
        }),
        z.object({
          id: z.string().min(1),
          resolution: z.literal("NOT_CREATED"),
        }),
      ]),
    )
    .mutation(async ({ ctx, input }) => {
      const scope = await authorizeDeliveryManagement({
        userId: ctx.auth.user.id,
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
      });
      const [delivery] = await db
        .select()
        .from(outboundDelivery)
        .where(
          and(
            ...deliveryScopeConditions(scope),
            eq(outboundDelivery.id, input.id),
            eq(outboundDelivery.provider, "TWILIO"),
            eq(outboundDelivery.channel, "SMS"),
            eq(outboundDelivery.status, "UNKNOWN"),
            isNull(outboundDelivery.providerMessageId),
          ),
        )
        .limit(1);
      if (!delivery?.providerAccountId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Unknown Twilio delivery not found.",
        });
      }
      if (input.resolution === "CORRELATE") {
        const payload = smsDeliveryPayloadSchema.safeParse(delivery.payload);
        if (!payload.success) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "The stored SMS payload cannot be reconciled safely.",
          });
        }
        const binding = await resolveTwilioPlatformAccount({
          organizationId: scope.organizationId,
        });
        if (!binding.client || binding.account.id !== delivery.providerAccountId) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "The managed Twilio account is unavailable.",
          });
        }
        const remote = await binding.client.messages(input.providerMessageId).fetch();
        const matches = matchesAmbiguousSmsCandidate({
          destination: delivery.destinationNormalized,
          body: payload.data.body,
          requestedAt: delivery.createdAt,
          providerDestination: remote.to,
          providerBody: remote.body,
          providerCreatedAt: remote.dateCreated,
        });
        if (!matches) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "That Twilio message does not match the ambiguous delivery.",
          });
        }
        const [updated] = await db
          .update(outboundDelivery)
          .set({
            status: "ACCEPTED",
            providerMessageId: remote.sid,
            acceptedAt: remote.dateCreated ?? new Date(),
            claimToken: null,
            leaseExpiresAt: null,
            lastFailureClass: null,
            lastErrorCode: null,
            lastErrorMessage: null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(outboundDelivery.id, delivery.id),
              eq(outboundDelivery.status, "UNKNOWN"),
              isNull(outboundDelivery.providerMessageId),
            ),
          )
          .returning({ id: outboundDelivery.id });
        if (!updated) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "The delivery was resolved by another operator.",
          });
        }
        return { status: "ACCEPTED" as const };
      }
      const [requeued] = await db
        .update(outboundDelivery)
        .set({
          status: "QUEUED",
          availableAt: new Date(),
          nextAttemptAt: new Date(),
          claimToken: null,
          leaseExpiresAt: null,
          lastFailureClass: null,
          lastErrorCode: "OPERATOR_CONFIRMED_NOT_CREATED",
          lastErrorMessage:
            "An operator confirmed that the ambiguous provider request created no message.",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(outboundDelivery.id, delivery.id),
            eq(outboundDelivery.status, "UNKNOWN"),
            isNull(outboundDelivery.providerMessageId),
          ),
        )
        .returning({ id: outboundDelivery.id });
      if (!requeued) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "The delivery was resolved by another operator.",
        });
      }
      await requestDeliveryDispatch(scope.organizationId);
      return { status: "QUEUED" as const };
    }),
});
