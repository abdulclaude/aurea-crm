import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  ilike,
  isNull,
  lt,
  or,
  type SQL,
} from "drizzle-orm";
import { z } from "zod";

import { ConversationChannel, ConversationStatus, MessageDirection } from "@/db/enums";
import { db } from "@/db";
import {
  client,
  inboxConversation,
  inboxMessage,
} from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

const INBOX_PAGE_SIZE = 30;

function locationCondition(locationId: string | null | undefined): SQL {
  return locationId
    ? eq(inboxConversation.locationId, locationId)
    : isNull(inboxConversation.locationId);
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
  listConversations: protectedProcedure
    .input(
      z.object({
        status: z.nativeEnum(ConversationStatus).optional(),
        unreadOnly: z.boolean().optional(),
        search: z.string().optional(),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { orgId, locationId } = ctx;
      if (!orgId) throw new TRPCError({ code: "UNAUTHORIZED" });

      const filters: Array<SQL | undefined> = [
        eq(inboxConversation.organizationId, orgId),
        locationCondition(locationId),
        input.status ? eq(inboxConversation.status, input.status) : undefined,
        input.unreadOnly ? eq(inboxConversation.isRead, false) : undefined,
      ];

      const cursorConversation = input.cursor
        ? await db.query.inboxConversation.findFirst({
            where: eq(inboxConversation.id, input.cursor),
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

      return {
        conversations: conversations.map(mapConversation),
        nextCursor,
      };
    }),

  getConversation: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { orgId } = ctx;
      if (!orgId) throw new TRPCError({ code: "UNAUTHORIZED" });

      const conversation = await db.query.inboxConversation.findFirst({
        where: and(
          eq(inboxConversation.id, input.id),
          eq(inboxConversation.organizationId, orgId)
        ),
        with: {
          client: {
            columns: { id: true, name: true, logo: true, email: true, phone: true },
          },
          inboxMessages: {
            orderBy: [asc(inboxMessage.createdAt)],
          },
        },
      });

      if (!conversation) throw new TRPCError({ code: "NOT_FOUND" });

      await db.transaction(async (tx) => {
        await tx
          .update(inboxMessage)
          .set({ isRead: true })
          .where(
            and(
              eq(inboxMessage.conversationId, input.id),
              eq(inboxMessage.isRead, false)
            )
          );
        await tx
          .update(inboxConversation)
          .set({ isRead: true, updatedAt: new Date() })
          .where(eq(inboxConversation.id, input.id));
      });

      return mapConversation(conversation);
    }),

  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        content: z.string().min(1).max(4000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { orgId, auth } = ctx;
      if (!orgId) throw new TRPCError({ code: "UNAUTHORIZED" });

      const conversation = await db.query.inboxConversation.findFirst({
        where: and(
          eq(inboxConversation.id, input.conversationId),
          eq(inboxConversation.organizationId, orgId)
        ),
        columns: { id: true },
      });
      if (!conversation) throw new TRPCError({ code: "NOT_FOUND" });

      return db.transaction(async (tx) => {
        const [message] = await tx
          .insert(inboxMessage)
          .values({
            id: createId(),
            conversationId: input.conversationId,
            direction: MessageDirection.OUTBOUND,
            content: input.content,
            isRead: true,
            senderUserId: auth.user.id,
          })
          .returning();

        if (!message) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create inbox message",
          });
        }

        await tx
          .update(inboxConversation)
          .set({
            lastMessageAt: message.createdAt,
            status: ConversationStatus.OPEN,
            isRead: true,
            updatedAt: new Date(),
          })
          .where(eq(inboxConversation.id, input.conversationId));

        return message;
      });
    }),

  createConversation: protectedProcedure
    .input(
      z.object({
        clientId: z.string().optional(),
        channel: z.nativeEnum(ConversationChannel),
        subject: z.string().optional(),
        initialMessage: z.string().min(1).max(4000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { orgId, locationId, auth } = ctx;
      if (!orgId) throw new TRPCError({ code: "UNAUTHORIZED" });

      return db.transaction(async (tx) => {
        const now = new Date();
        const [conversation] = await tx
          .insert(inboxConversation)
          .values({
            id: createId(),
            organizationId: orgId,
            locationId: locationId ?? null,
            clientId: input.clientId ?? null,
            channel: input.channel,
            subject: input.subject ?? null,
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

        await tx.insert(inboxMessage).values({
          id: createId(),
          conversationId: conversation.id,
          direction: MessageDirection.OUTBOUND,
          content: input.initialMessage,
          isRead: true,
          senderUserId: auth.user.id,
        });

        return conversation;
      });
    }),

  setStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.nativeEnum(ConversationStatus),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { orgId } = ctx;
      if (!orgId) throw new TRPCError({ code: "UNAUTHORIZED" });

      const [conversation] = await db
        .update(inboxConversation)
        .set({ status: input.status, updatedAt: new Date() })
        .where(
          and(
            eq(inboxConversation.id, input.id),
            eq(inboxConversation.organizationId, orgId)
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

    const [result] = await db
      .select({ count: count(inboxConversation.id) })
      .from(inboxConversation)
      .where(
        and(
          eq(inboxConversation.organizationId, orgId),
          locationCondition(locationId),
          eq(inboxConversation.isRead, false),
          eq(inboxConversation.status, ConversationStatus.OPEN)
        )
      );

    return result?.count ?? 0;
  }),
});
