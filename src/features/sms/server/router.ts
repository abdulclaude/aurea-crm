import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { and, desc, eq, lt, or, sql, type SQL } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

import { db } from "@/db";
import { smsConfig, smsMessage } from "@/db/schema";

export const smsRouter = createTRPCRouter({
  getConfig: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

    return db.query.smsConfig.findFirst({
      where: eq(smsConfig.organizationId, ctx.orgId),
    });
  }),

  saveConfig: protectedProcedure
    .input(
      z.object({
        provider: z.enum(["TWILIO", "VONAGE", "MESSAGEBIRD"]).default("TWILIO"),
        accountSid: z.string().min(1),
        authToken: z.string().min(1),
        fromNumber: z.string().min(1),
        monthlyLimit: z.number().int().min(100).default(5000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      const now = new Date();
      const [config] = await db
        .insert(smsConfig)
        .values({
          id: createId(),
          organizationId: ctx.orgId,
          ...input,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: smsConfig.organizationId,
          set: { ...input, updatedAt: now },
        })
        .returning();

      return config;
    }),

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

      const config = await db.query.smsConfig.findFirst({
        where: eq(smsConfig.organizationId, ctx.orgId),
      });

      if (!config || !config.isActive) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "SMS not configured" });
      }

      if (config.sentThisMonth >= config.monthlyLimit) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Monthly SMS limit reached" });
      }

      const message = await db.transaction(async (tx) => {
        const [createdMessage] = await tx
          .insert(smsMessage)
          .values({
            id: createId(),
            organizationId: ctx.orgId!,
            locationId: ctx.locationId ?? null,
            clientId: input.clientId,
            to: input.to,
            from: config.fromNumber,
            body: input.body,
            direction: "OUTBOUND",
            status: "QUEUED",
          })
          .returning();

        await tx
          .update(smsConfig)
          .set({
            sentThisMonth: sql`${smsConfig.sentThisMonth} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(smsConfig.organizationId, ctx.orgId!));

        return createdMessage;
      });

      return message;
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

      const config = await db.query.smsConfig.findFirst({
        where: eq(smsConfig.organizationId, ctx.orgId),
      });

      if (!config || !config.isActive) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "SMS not configured" });
      }

      const remaining = config.monthlyLimit - config.sentThisMonth;
      if (input.recipients.length > remaining) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `Only ${remaining} SMS remaining this month` });
      }

      const messages = await db.transaction(async (tx) => {
        const insertedMessages = await tx
          .insert(smsMessage)
          .values(
            input.recipients.map((recipient) => ({
              id: createId(),
              organizationId: ctx.orgId!,
              locationId: ctx.locationId ?? null,
              clientId: recipient.clientId,
              to: recipient.to,
              from: config.fromNumber,
              body: input.body,
              direction: "OUTBOUND" as const,
              status: "QUEUED" as const,
            }))
          )
          .returning({ id: smsMessage.id });

        await tx
          .update(smsConfig)
          .set({
            sentThisMonth: sql`${smsConfig.sentThisMonth} + ${input.recipients.length}`,
            updatedAt: new Date(),
          })
          .where(eq(smsConfig.organizationId, ctx.orgId!));

        return insertedMessages;
      });

      return { count: messages.length };
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

      const conditions: SQL[] = [
        eq(smsMessage.organizationId, ctx.orgId),
        ...(ctx.locationId ? [eq(smsMessage.locationId, ctx.locationId)] : []),
      ];
      if (input.direction) conditions.push(eq(smsMessage.direction, input.direction));
      if (input.clientId) conditions.push(eq(smsMessage.clientId, input.clientId));
      if (input.cursor) {
        const cursor = await db.query.smsMessage.findFirst({
          where: eq(smsMessage.id, input.cursor),
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
