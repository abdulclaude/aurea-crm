import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { and, desc, eq, isNull, lt, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { smsMessage } from "@/db/schema";
import { InvalidDeliveryDestinationError } from "@/features/delivery/lib/normalization";
import { requireCapability } from "@/features/permissions/server/authorization";
import {
  disconnectSmsConfigProcedure,
  getSmsConfigProcedure,
  saveSmsConfigProcedure,
} from "@/features/sms/server/config-procedures";
import { enqueueSmsMessages } from "@/features/sms/server/services/enqueue-sms";

function capabilityActor(ctx: {
  auth: { user: { id: string } };
  orgId: string | null;
  locationId: string | null;
}) {
  return {
    userId: ctx.auth.user.id,
    organizationId: ctx.orgId,
    locationId: ctx.locationId,
  };
}

export const smsRouter = createTRPCRouter({
  getConfig: getSmsConfigProcedure,
  saveConfig: saveSmsConfigProcedure,
  disconnectConfig: disconnectSmsConfigProcedure,

  send: protectedProcedure
    .input(
      z.object({
        to: z.string().min(1),
        body: z.string().min(1).max(1600),
        clientId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
      await requireCapability({
        actor: capabilityActor(ctx),
        capability: "messaging.send",
      });
      try {
        const result = await enqueueSmsMessages({
          organizationId: ctx.orgId,
          locationId: ctx.locationId ?? null,
          recipients: [{ to: input.to, clientId: input.clientId }],
          body: input.body,
          purpose: "ONE_TO_ONE",
        });
        return {
          id: result.messageIds[0],
          status: result.queued === 1 ? "QUEUED" : "FAILED",
          suppressed: result.suppressed === 1,
        };
      } catch (error) {
        if (error instanceof InvalidDeliveryDestinationError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Phone numbers must use international E.164 format",
          });
        }
        throw error;
      }
    }),

  sendBulk: protectedProcedure
    .input(
      z.object({
        recipients: z.array(z.object({
          to: z.string().min(1),
          clientId: z.string().optional(),
        })).min(1).max(500),
        body: z.string().min(1).max(1600),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
      await requireCapability({
        actor: capabilityActor(ctx),
        capability: "messaging.send",
      });
      try {
        const result = await enqueueSmsMessages({
          organizationId: ctx.orgId,
          locationId: ctx.locationId ?? null,
          recipients: input.recipients,
          body: input.body,
          purpose: "MARKETING",
        });
        return {
          count: result.messageIds.length,
          queued: result.queued,
          suppressed: result.suppressed,
        };
      } catch (error) {
        if (error instanceof InvalidDeliveryDestinationError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "All phone numbers must use international E.164 format",
          });
        }
        throw error;
      }
    }),

  list: protectedProcedure
    .input(
      z.object({
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(50),
        direction: z.enum(["INBOUND", "OUTBOUND"]).optional(),
        clientId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
      await requireCapability({
        actor: capabilityActor(ctx),
        capability: "messaging.view",
      });

      const conditions: SQL[] = [
        eq(smsMessage.organizationId, ctx.orgId),
        ctx.locationId
          ? eq(smsMessage.locationId, ctx.locationId)
          : isNull(smsMessage.locationId),
      ];
      if (input.direction) conditions.push(eq(smsMessage.direction, input.direction));
      if (input.clientId) conditions.push(eq(smsMessage.clientId, input.clientId));
      if (input.cursor) {
        const cursor = await db.query.smsMessage.findFirst({
          where: and(
            eq(smsMessage.id, input.cursor),
            eq(smsMessage.organizationId, ctx.orgId),
            ctx.locationId
              ? eq(smsMessage.locationId, ctx.locationId)
              : isNull(smsMessage.locationId),
          ),
          columns: { id: true, createdAt: true },
        });
        if (cursor) {
          conditions.push(
            or(
              lt(smsMessage.createdAt, cursor.createdAt),
              and(eq(smsMessage.createdAt, cursor.createdAt), lt(smsMessage.id, cursor.id))
            )!
          );
        }
      }

      const messages = await db.query.smsMessage.findMany({
        where: and(...conditions),
        limit: input.limit + 1,
        orderBy: [desc(smsMessage.createdAt), desc(smsMessage.id)],
      });

      const hasMore = messages.length > input.limit;
      if (hasMore) messages.pop();

      return {
        messages,
        nextCursor: hasMore ? messages[messages.length - 1]?.id : undefined,
      };
    }),
});
