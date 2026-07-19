import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  not,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { z } from "zod";

import { ConversationChannel, ConversationStatus } from "@/db/enums";
import { db } from "@/db";
import {
  client,
  inboxConversation,
  inboxMessage,
  inboxReadState,
  staffIdentity,
} from "@/db/schema";
import { requestDeliveryDispatch } from "@/features/delivery/server/request-dispatch";
import {
  enqueueInboxMessageInTransaction,
  prepareInboxDelivery,
} from "@/features/inbox/server/outbound-message";
import { inboxManagementProcedures } from "@/features/inbox/server/management-procedures";
import {
  createInboxConversationInputSchema,
  sendInboxMessageInputSchema,
} from "@/features/inbox/contracts";
import {
  inboxConversationViewColumns,
  inboxMessageViewColumns,
} from "@/features/inbox/server/conversation-view";
import { requireCapability } from "@/features/permissions/server/authorization";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

const INBOX_PAGE_SIZE = 30;

function locationCondition(locationId: string | null | undefined): SQL {
  return locationId
    ? eq(inboxConversation.locationId, locationId)
    : isNull(inboxConversation.locationId);
}

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

function mapConversation<T extends { inboxMessages?: unknown }>(
  conversation: T
): Omit<T, "inboxMessages"> & { messages: T["inboxMessages"] } {
  const { inboxMessages, ...rest } = conversation;
  return {
    ...rest,
    messages: inboxMessages,
  };
}

export const inboxRouter = createTRPCRouter({
  ...inboxManagementProcedures,
  listConversations: protectedProcedure
    .input(
      z.object({
        status: z.nativeEnum(ConversationStatus).optional(),
        unreadOnly: z.boolean().optional(),
        search: z.string().optional(),
        clientId: z.string().optional(),
        assignment: z.enum(["ALL", "MINE", "UNASSIGNED"]).default("ALL"),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { orgId, locationId } = ctx;
      if (!orgId) throw new TRPCError({ code: "UNAUTHORIZED" });
      await requireCapability({
        actor: capabilityActor(ctx),
        capability: "messaging.view",
      });

      const filters: Array<SQL | undefined> = [
        eq(inboxConversation.organizationId, orgId),
        locationCondition(locationId),
        input.clientId
          ? eq(inboxConversation.clientId, input.clientId)
          : undefined,
        input.status ? eq(inboxConversation.status, input.status) : undefined,
        input.unreadOnly
          ? and(
              isNotNull(inboxConversation.lastMessageAt),
              not(
                exists(
                  db
                    .select({ id: inboxReadState.id })
                    .from(inboxReadState)
                    .where(
                      and(
                        eq(
                          inboxReadState.conversationId,
                          inboxConversation.id,
                        ),
                        eq(inboxReadState.userId, ctx.auth.user.id),
                        gte(
                          inboxReadState.lastReadAt,
                          inboxConversation.lastMessageAt,
                        ),
                      ),
                    ),
                ),
              ),
            )
          : undefined,
      ];

      if (input.assignment === "UNASSIGNED") {
        filters.push(isNull(inboxConversation.assigneeStaffIdentityId));
      } else if (input.assignment === "MINE") {
        const actorIdentity = await db.query.staffIdentity.findFirst({
          where: and(
            eq(staffIdentity.organizationId, orgId),
            eq(staffIdentity.userId, ctx.auth.user.id),
            eq(staffIdentity.status, "ACTIVE"),
          ),
          columns: { id: true },
        });
        filters.push(
          actorIdentity
            ? eq(inboxConversation.assigneeStaffIdentityId, actorIdentity.id)
            : sql`false`,
        );
      }

      const cursorConversation = input.cursor
        ? await db.query.inboxConversation.findFirst({
            where: and(
              eq(inboxConversation.id, input.cursor),
              eq(inboxConversation.organizationId, orgId),
              locationCondition(locationId),
            ),
            columns: { id: true, lastMessageAt: true },
          })
        : null;

      if (cursorConversation?.lastMessageAt) {
        filters.push(
          or(
            lt(inboxConversation.lastMessageAt, cursorConversation.lastMessageAt),
            and(
              eq(inboxConversation.lastMessageAt, cursorConversation.lastMessageAt),
              lt(inboxConversation.id, cursorConversation.id)
            )
          )
        );
      }

      if (input.search) {
        const term = input.search.trim();
        const channel = term.toUpperCase();
        const channelFilter = ["EMAIL", "SMS", "APP"].includes(channel)
          ? eq(inboxConversation.channel, channel as ConversationChannel)
          : undefined;

        filters.push(
          or(
            exists(
              db
                .select({ id: client.id })
                .from(client)
                .where(
                  and(
                    eq(client.id, inboxConversation.clientId),
                    or(
                      ilike(client.name, `%${term}%`),
                      ilike(client.email, `%${term}%`)
                    )
                  )
                )
            ),
            ilike(inboxConversation.subject, `%${term}%`),
            channelFilter,
            exists(
              db
                .select({ id: inboxMessage.id })
                .from(inboxMessage)
                .where(
                  and(
                    eq(inboxMessage.conversationId, inboxConversation.id),
                    ilike(inboxMessage.content, `%${term}%`)
                  )
                )
            )
          )
        );
      }

      const conversations = await db.query.inboxConversation.findMany({
        where: and(...filters),
        orderBy: [desc(inboxConversation.lastMessageAt), desc(inboxConversation.id)],
        limit: INBOX_PAGE_SIZE + 1,
        columns: inboxConversationViewColumns,
        with: {
          client: {
            columns: { id: true, name: true, logo: true, email: true, phone: true },
          },
          inboxMessages: {
            orderBy: [desc(inboxMessage.createdAt)],
            limit: 1,
            columns: { content: true, direction: true, createdAt: true },
          },
        },
      });

      let nextCursor: string | undefined;
      if (conversations.length > INBOX_PAGE_SIZE) {
        const next = conversations.pop();
        nextCursor = next?.id;
      }

      const conversationIds = conversations.map((conversation) => conversation.id);
      const assigneeIds = conversations.flatMap((conversation) =>
        conversation.assigneeStaffIdentityId
          ? [conversation.assigneeStaffIdentityId]
          : [],
      );
      const [readStates, assignees] = await Promise.all([
        conversationIds.length
          ? db
              .select({
                conversationId: inboxReadState.conversationId,
                lastReadAt: inboxReadState.lastReadAt,
              })
              .from(inboxReadState)
              .where(
                and(
                  eq(inboxReadState.userId, ctx.auth.user.id),
                  inArray(inboxReadState.conversationId, conversationIds),
                ),
              )
          : Promise.resolve([]),
        assigneeIds.length
          ? db
              .select({
                id: staffIdentity.id,
                displayName: staffIdentity.displayName,
                email: staffIdentity.email,
              })
              .from(staffIdentity)
              .where(inArray(staffIdentity.id, assigneeIds))
          : Promise.resolve([]),
      ]);
      const readStateByConversation = new Map(
        readStates.map((state) => [state.conversationId, state.lastReadAt]),
      );
      const assigneeById = new Map(
        assignees.map((assignee) => [assignee.id, assignee]),
      );

      return {
        conversations: conversations.map((conversation) => ({
          ...mapConversation(conversation),
          isRead:
            conversation.lastMessageAt === null ||
            (readStateByConversation.get(conversation.id)?.getTime() ?? 0) >=
              conversation.lastMessageAt.getTime(),
          assignee: conversation.assigneeStaffIdentityId
            ? (assigneeById.get(conversation.assigneeStaffIdentityId) ?? null)
            : null,
        })),
        nextCursor,
      };
    }),

  getConversation: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { orgId, locationId } = ctx;
      if (!orgId) throw new TRPCError({ code: "UNAUTHORIZED" });
      await requireCapability({
        actor: capabilityActor(ctx),
        capability: "messaging.view",
      });

      const conversation = await db.query.inboxConversation.findFirst({
        where: and(
          eq(inboxConversation.id, input.id),
          eq(inboxConversation.organizationId, orgId),
          locationCondition(locationId),
        ),
        columns: inboxConversationViewColumns,
        with: {
          client: {
            columns: { id: true, name: true, logo: true, email: true, phone: true },
          },
          inboxMessages: {
            orderBy: [asc(inboxMessage.createdAt)],
            columns: inboxMessageViewColumns,
          },
        },
      });

      if (!conversation) throw new TRPCError({ code: "NOT_FOUND" });

      const [readState, assignee] = await Promise.all([
        db.query.inboxReadState.findFirst({
          where: and(
            eq(inboxReadState.conversationId, input.id),
            eq(inboxReadState.userId, ctx.auth.user.id),
          ),
          columns: { lastReadAt: true },
        }),
        conversation.assigneeStaffIdentityId
          ? db.query.staffIdentity.findFirst({
              where: and(
                eq(staffIdentity.id, conversation.assigneeStaffIdentityId),
                eq(staffIdentity.organizationId, orgId),
              ),
              columns: { id: true, displayName: true, email: true },
            })
          : Promise.resolve(undefined),
      ]);

      return {
        ...mapConversation(conversation),
        isRead:
          conversation.lastMessageAt === null ||
          (readState?.lastReadAt.getTime() ?? 0) >=
            conversation.lastMessageAt.getTime(),
        assignee: assignee ?? null,
      };
    }),

  sendMessage: protectedProcedure
    .input(sendInboxMessageInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { orgId, locationId, auth } = ctx;
      if (!orgId) throw new TRPCError({ code: "UNAUTHORIZED" });
      await requireCapability({
        actor: capabilityActor(ctx),
        capability: "messaging.send",
      });

      const conversation = await db.query.inboxConversation.findFirst({
        where: and(
          eq(inboxConversation.id, input.conversationId),
          eq(inboxConversation.organizationId, orgId),
          locationCondition(locationId),
        ),
        columns: {
          id: true,
          clientId: true,
          channel: true,
          subject: true,
          routeId: true,
        },
      });
      if (!conversation) throw new TRPCError({ code: "NOT_FOUND" });
      if (
        conversation.channel === ConversationChannel.EMAIL &&
        !input.senderAddressId
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Select a sender address before sending an email.",
        });
      }

      const prepared = await prepareInboxDelivery({
        organizationId: orgId,
        locationId: locationId ?? null,
        clientId: conversation.clientId,
        channel: conversation.channel,
        subject: conversation.subject,
        content: input.content,
        conversationId: conversation.id,
        routeId: conversation.routeId,
        senderAddressId: input.senderAddressId,
      });
      const result = await db.transaction(async (tx) => {
        const queuedMessage = await enqueueInboxMessageInTransaction(tx, {
          conversationId: conversation.id,
          senderUserId: auth.user.id,
          content: input.content,
          prepared,
        });

        await tx
          .update(inboxConversation)
          .set({
            lastMessageAt: queuedMessage.message.createdAt,
            status: ConversationStatus.OPEN,
            isRead: true,
            updatedAt: new Date(),
            routeId:
              conversation.channel === ConversationChannel.EMAIL
                ? prepared.routeId
                : (prepared.routeId ?? conversation.routeId),
            replyRoutingTokenHash: prepared.replyRoutingTokenHash,
          })
          .where(
            and(
              eq(inboxConversation.id, input.conversationId),
              eq(inboxConversation.organizationId, orgId),
              locationCondition(locationId),
            ),
          );

        return queuedMessage;
      });
      if (!result.suppressed) {
        await requestDeliveryDispatch(orgId);
      }
      return result.message;
    }),

  createConversation: protectedProcedure
    .input(createInboxConversationInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { orgId, locationId, auth } = ctx;
      if (!orgId) throw new TRPCError({ code: "UNAUTHORIZED" });
      await requireCapability({
        actor: capabilityActor(ctx),
        capability: "messaging.send",
      });

      const conversationId = createId();
      const prepared = await prepareInboxDelivery({
        organizationId: orgId,
        locationId: locationId ?? null,
        clientId: input.clientId ?? null,
        channel: input.channel,
        subject: input.subject ?? null,
        content: input.initialMessage,
        conversationId,
        senderAddressId: input.senderAddressId,
      });

      const result = await db.transaction(async (tx) => {
        const now = new Date();
        const [conversation] = await tx
          .insert(inboxConversation)
          .values({
            id: conversationId,
            organizationId: orgId,
            locationId: locationId ?? null,
            clientId: input.clientId ?? null,
            channel: input.channel,
            subject: input.subject ?? null,
            routeId: prepared.routeId,
            replyRoutingTokenHash: prepared.replyRoutingTokenHash,
            lastMessageAt: now,
            updatedAt: now,
          })
          .returning();

        if (!conversation) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create inbox conversation",
          });
        }

        const queuedMessage = await enqueueInboxMessageInTransaction(tx, {
          conversationId: conversation.id,
          senderUserId: auth.user.id,
          content: input.initialMessage,
          prepared,
        });

        await tx
          .update(inboxConversation)
          .set({
            lastMessageAt: queuedMessage.message.createdAt,
            updatedAt: queuedMessage.message.createdAt,
          })
          .where(eq(inboxConversation.id, conversation.id));

        return { conversation, suppressed: queuedMessage.suppressed };
      });
      if (!result.suppressed) {
        await requestDeliveryDispatch(orgId);
      }
      return result.conversation;
    }),

  setStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.nativeEnum(ConversationStatus),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { orgId, locationId } = ctx;
      if (!orgId) throw new TRPCError({ code: "UNAUTHORIZED" });
      await requireCapability({
        actor: capabilityActor(ctx),
        capability: "messaging.send",
      });

      const [conversation] = await db
        .update(inboxConversation)
        .set({ status: input.status, updatedAt: new Date() })
        .where(
          and(
            eq(inboxConversation.id, input.id),
            eq(inboxConversation.organizationId, orgId),
            locationCondition(locationId),
          )
        )
        .returning();

      if (!conversation) throw new TRPCError({ code: "NOT_FOUND" });

      return conversation;
    }),

  searchClients: protectedProcedure
    .input(z.object({ search: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { orgId, locationId } = ctx;
      if (!orgId) throw new TRPCError({ code: "UNAUTHORIZED" });
      await requireCapability({
        actor: capabilityActor(ctx),
        capability: "messaging.view",
      });

      return db.query.client.findMany({
        where: and(
          eq(client.organizationId, orgId),
          locationId ? eq(client.locationId, locationId) : isNull(client.locationId),
          or(
            ilike(client.name, `%${input.search}%`),
            ilike(client.email, `%${input.search}%`)
          )
        ),
        columns: { id: true, name: true, email: true, phone: true, logo: true },
        limit: 20,
        orderBy: [asc(client.name)],
      });
    }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const { orgId, locationId } = ctx;
    if (!orgId) return 0;
    await requireCapability({
      actor: capabilityActor(ctx),
      capability: "messaging.view",
    });

    const [result] = await db
      .select({ count: count(inboxConversation.id) })
      .from(inboxConversation)
      .where(
        and(
          eq(inboxConversation.organizationId, orgId),
          locationCondition(locationId),
          isNotNull(inboxConversation.lastMessageAt),
          not(
            exists(
              db
                .select({ id: inboxReadState.id })
                .from(inboxReadState)
                .where(
                  and(
                    eq(
                      inboxReadState.conversationId,
                      inboxConversation.id,
                    ),
                    eq(inboxReadState.userId, ctx.auth.user.id),
                    gte(
                      inboxReadState.lastReadAt,
                      inboxConversation.lastMessageAt,
                    ),
                  ),
                ),
            ),
          ),
          eq(inboxConversation.status, ConversationStatus.OPEN)
        )
      );

    return result?.count ?? 0;
  }),
});
