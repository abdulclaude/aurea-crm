import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, isNotNull, isNull, lt } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { ConversationChannel } from "@/db/enums";
import {
  inboxConversation,
  inboxConversationEvent,
  inboxMessage,
  inboxReadState,
  inboxRoute,
  locationMember,
  staffIdentity,
} from "@/db/schema";
import { isInboxReadCursorAdvance } from "@/features/inbox/lib/read-cursor-policy";
import { requireCapability } from "@/features/permissions/server/authorization";
import { resolveProviderAccount } from "@/features/provider-accounts/server/resolver";
import { protectedProcedure } from "@/trpc/init";

type InboxProcedureContext = {
  auth: { user: { id: string } };
  orgId: string | null;
  locationId: string | null;
};

function actor(ctx: InboxProcedureContext) {
  return {
    userId: ctx.auth.user.id,
    organizationId: ctx.orgId,
    locationId: ctx.locationId,
  };
}

function isPostgresUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function conversationScope(ctx: InboxProcedureContext) {
  if (!ctx.orgId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return and(
    eq(inboxConversation.organizationId, ctx.orgId),
    ctx.locationId
      ? eq(inboxConversation.locationId, ctx.locationId)
      : isNull(inboxConversation.locationId),
  );
}

function routeScope(ctx: InboxProcedureContext) {
  if (!ctx.orgId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return and(
    eq(inboxRoute.organizationId, ctx.orgId),
    ctx.locationId
      ? eq(inboxRoute.locationId, ctx.locationId)
      : isNull(inboxRoute.locationId),
  );
}

async function requireAssignableStaffIdentity(input: {
  organizationId: string;
  locationId: string | null;
  staffIdentityId: string;
}) {
  const [identity] = await db
    .select({
      id: staffIdentity.id,
      userId: staffIdentity.userId,
      status: staffIdentity.status,
    })
    .from(staffIdentity)
    .leftJoin(
      locationMember,
      and(
        eq(locationMember.staffIdentityId, staffIdentity.id),
        input.locationId
          ? eq(locationMember.locationId, input.locationId)
          : isNull(locationMember.id),
      ),
    )
    .where(
      and(
        eq(staffIdentity.id, input.staffIdentityId),
        eq(staffIdentity.organizationId, input.organizationId),
        eq(staffIdentity.status, "ACTIVE"),
        input.locationId ? eq(locationMember.locationId, input.locationId) : undefined,
      ),
    )
    .limit(1);

  if (!identity?.userId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Select an active staff member with access to this workspace.",
    });
  }
  return identity;
}

const routeInput = z.object({
  id: z.string().optional(),
  providerAccountId: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  inboundAddress: z.string().trim().email().max(320),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  defaultAssigneeStaffIdentityId: z.string().nullable().optional(),
});

export const inboxManagementProcedures = {
  listRoutes: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.orgId) throw new TRPCError({ code: "UNAUTHORIZED" });
    await requireCapability({ actor: actor(ctx), capability: "messaging.manage" });
    return db.query.inboxRoute.findMany({
      where: routeScope(ctx),
      orderBy: [asc(inboxRoute.name), asc(inboxRoute.id)],
    });
  }),

  upsertRoute: protectedProcedure
    .input(routeInput)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const organizationId = ctx.orgId;
      await requireCapability({ actor: actor(ctx), capability: "messaging.manage" });

      await resolveProviderAccount({
        providerAccountId: input.providerAccountId,
        provider: "RESEND",
        scope: {
          organizationId,
          locationId: ctx.locationId ?? null,
        },
      });
      if (input.defaultAssigneeStaffIdentityId) {
        await requireAssignableStaffIdentity({
          organizationId,
          locationId: ctx.locationId ?? null,
          staffIdentityId: input.defaultAssigneeStaffIdentityId,
        });
      }

      const normalizedAddress = input.inboundAddress.toLowerCase();
      const shouldBeDefault = input.isActive && input.isDefault;
      try {
        return await db.transaction(async (tx) => {
          if (shouldBeDefault) {
            await tx
              .update(inboxRoute)
              .set({ isDefault: false, updatedAt: new Date() })
              .where(
                and(
                  routeScope(ctx),
                  eq(inboxRoute.channel, ConversationChannel.EMAIL),
                  eq(inboxRoute.isDefault, true),
                ),
              );
          }

          const values = {
            organizationId,
            locationId: ctx.locationId ?? null,
            providerAccountId: input.providerAccountId,
            channel: ConversationChannel.EMAIL,
            name: input.name,
            inboundAddress: input.inboundAddress,
            inboundAddressNormalized: normalizedAddress,
            isDefault: shouldBeDefault,
            isActive: input.isActive,
            defaultAssigneeStaffIdentityId:
              input.defaultAssigneeStaffIdentityId ?? null,
            updatedAt: new Date(),
          };

          if (input.id) {
            const [updated] = await tx
              .update(inboxRoute)
              .set(values)
              .where(and(eq(inboxRoute.id, input.id), routeScope(ctx)))
              .returning();
            if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
            return updated;
          }

          const [created] = await tx
            .insert(inboxRoute)
            .values({
              id: createId(),
              ...values,
              createdByUserId: ctx.auth.user.id,
            })
            .returning();
          if (!created) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to create inbox route.",
            });
          }
          return created;
        });
      } catch (error) {
        if (isPostgresUniqueViolation(error)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "That inbound address is already configured for this account.",
          });
        }
        throw error;
      }
    }),

  listAssignableStaff: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.orgId) throw new TRPCError({ code: "UNAUTHORIZED" });
    await requireCapability({ actor: actor(ctx), capability: "messaging.assign" });

    const base = db
      .select({
        id: staffIdentity.id,
        displayName: staffIdentity.displayName,
        email: staffIdentity.email,
      })
      .from(staffIdentity);
    const rows = ctx.locationId
      ? await base
          .innerJoin(
            locationMember,
            and(
              eq(locationMember.staffIdentityId, staffIdentity.id),
              eq(locationMember.locationId, ctx.locationId),
            ),
          )
          .where(
            and(
              eq(staffIdentity.organizationId, ctx.orgId),
              eq(staffIdentity.status, "ACTIVE"),
              isNotNull(staffIdentity.userId),
              eq(locationMember.locationId, ctx.locationId),
            ),
          )
          .orderBy(asc(staffIdentity.displayName), asc(staffIdentity.id))
      : await base
          .where(
            and(
              eq(staffIdentity.organizationId, ctx.orgId),
              eq(staffIdentity.status, "ACTIVE"),
              isNotNull(staffIdentity.userId),
            ),
          )
          .orderBy(asc(staffIdentity.displayName), asc(staffIdentity.id));
    return rows;
  }),

  assignConversation: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        staffIdentityId: z.string().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const organizationId = ctx.orgId;
      await requireCapability({ actor: actor(ctx), capability: "messaging.assign" });
      if (input.staffIdentityId) {
        await requireAssignableStaffIdentity({
          organizationId,
          locationId: ctx.locationId ?? null,
          staffIdentityId: input.staffIdentityId,
        });
      }

      return db.transaction(async (tx) => {
        const now = new Date();
        const [conversation] = await tx
          .update(inboxConversation)
          .set({
            assigneeStaffIdentityId: input.staffIdentityId,
            assignedAt: input.staffIdentityId ? now : null,
            assignedByUserId: input.staffIdentityId ? ctx.auth.user.id : null,
            updatedAt: now,
          })
          .where(
            and(
              eq(inboxConversation.id, input.conversationId),
              conversationScope(ctx),
            ),
          )
          .returning();
        if (!conversation) throw new TRPCError({ code: "NOT_FOUND" });

        await tx.insert(inboxConversationEvent).values({
          id: createId(),
          organizationId,
          locationId: ctx.locationId ?? null,
          conversationId: input.conversationId,
          eventType: input.staffIdentityId ? "ASSIGNED" : "UNASSIGNED",
          actorUserId: ctx.auth.user.id,
          targetStaffIdentityId: input.staffIdentityId,
        });
        return conversation;
      });
    }),

  markRead: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        lastReadMessageId: z.string().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireCapability({ actor: actor(ctx), capability: "messaging.view" });
      const conversation = await db.query.inboxConversation.findFirst({
        where: and(
          eq(inboxConversation.id, input.conversationId),
          conversationScope(ctx),
        ),
        columns: { id: true, lastMessageAt: true },
      });
      if (!conversation) throw new TRPCError({ code: "NOT_FOUND" });

      const observedMessage = input.lastReadMessageId
        ? await db.query.inboxMessage.findFirst({
            where: and(
              eq(inboxMessage.id, input.lastReadMessageId),
              eq(inboxMessage.conversationId, input.conversationId),
            ),
            columns: { id: true, createdAt: true },
          })
        : null;
      if (input.lastReadMessageId && !observedMessage) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The observed message is not part of this conversation.",
        });
      }
      if (!input.lastReadMessageId && conversation.lastMessageAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Provide the last observed message before marking this conversation read.",
        });
      }
      const now = new Date();
      const lastReadAt = observedMessage?.createdAt ?? new Date(0);
      return db.transaction(async (tx) => {
        const [current] = await tx
          .select()
          .from(inboxReadState)
          .where(
            and(
              eq(inboxReadState.conversationId, input.conversationId),
              eq(inboxReadState.userId, ctx.auth.user.id),
            ),
          )
          .limit(1)
          .for("update");
        if (
          current &&
          !isInboxReadCursorAdvance(current.lastReadAt, lastReadAt)
        ) {
          return current;
        }

        const [advanced] = await tx
          .insert(inboxReadState)
          .values({
            id: createId(),
            conversationId: input.conversationId,
            userId: ctx.auth.user.id,
            lastReadMessageId: observedMessage?.id ?? null,
            lastReadAt,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [inboxReadState.conversationId, inboxReadState.userId],
            set: {
              lastReadMessageId: observedMessage?.id ?? null,
              lastReadAt,
              updatedAt: now,
            },
            setWhere: lt(inboxReadState.lastReadAt, lastReadAt),
          })
          .returning();
        if (advanced) return advanced;

        const [concurrentState] = await tx
          .select()
          .from(inboxReadState)
          .where(
            and(
              eq(inboxReadState.conversationId, input.conversationId),
              eq(inboxReadState.userId, ctx.auth.user.id),
            ),
          )
          .limit(1);
        if (!concurrentState) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update the inbox read cursor.",
          });
        }
        return concurrentState;
      });
    }),
};
