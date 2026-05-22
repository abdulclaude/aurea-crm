import { TRPCError } from "@trpc/server";
import { createId } from "@paralleldrive/cuid2";
import { and, desc, eq, inArray } from "drizzle-orm";
import z from "zod";

import { db } from "@/db";
import {
  client,
  deal,
  note,
  noteMention,
  notification,
  locationMember,
} from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

const noteTargetBaseSchema = z.object({
  clientId: z.string().optional(),
  dealId: z.string().optional(),
});

const noteTargetSchema = noteTargetBaseSchema.refine(
  (data) => Boolean(data.clientId) !== Boolean(data.dealId),
  {
    message: "Provide either clientId or dealId.",
  }
);

async function loadNote(id: string) {
  const loadedNote = await db.query.note.findFirst({
    where: eq(note.id, id),
    with: {
      user: {
        columns: { id: true, name: true, email: true, image: true },
      },
      noteMentions: {
        with: {
          user: {
            columns: { id: true, name: true, email: true, image: true },
          },
        },
      },
    },
  });

  if (!loadedNote) {
    return null;
  }

  const { user, noteMentions, ...rest } = loadedNote;
  return {
    ...rest,
    author: user,
    mentions: noteMentions,
  };
}

export const notesRouter = createTRPCRouter({
  list: protectedProcedure
    .input(noteTargetSchema)
    .query(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      const locationId = ctx.locationId;

      if (!orgId || !locationId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Location context required to view notes.",
        });
      }

      const notes = await db.query.note.findMany({
        where: and(
          eq(note.organizationId, orgId),
          eq(note.locationId, locationId),
          input.clientId ? eq(note.clientId, input.clientId) : undefined,
          input.dealId ? eq(note.dealId, input.dealId) : undefined
        ),
        with: {
          user: {
            columns: { id: true, name: true, email: true, image: true },
          },
          noteMentions: {
            with: {
              user: {
                columns: { id: true, name: true, email: true, image: true },
              },
            },
          },
        },
        orderBy: [desc(note.pinned), desc(note.createdAt)],
      });

      return notes.map(({ user, noteMentions, ...currentNote }) => ({
        ...currentNote,
        author: user,
        mentions: noteMentions,
      }));
    }),

  create: protectedProcedure
    .input(
      noteTargetBaseSchema
        .extend({
          content: z.string().min(1),
          mentionIds: z.array(z.string()).optional(),
          pinned: z.boolean().optional(),
        })
        .refine((data) => Boolean(data.clientId) !== Boolean(data.dealId), {
          message: "Provide either clientId or dealId.",
        })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      const locationId = ctx.locationId;

      if (!orgId || !locationId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Location context required to create notes.",
        });
      }

      const target = input.clientId
        ? await db.query.client.findFirst({
            where: and(
              eq(client.id, input.clientId),
              eq(client.organizationId, orgId),
              eq(client.locationId, locationId)
            ),
            columns: { id: true, name: true },
          })
        : await db.query.deal.findFirst({
            where: and(
              eq(deal.id, input.dealId!),
              eq(deal.organizationId, orgId),
              eq(deal.locationId, locationId)
            ),
            columns: { id: true, name: true },
          });

      if (!target) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Target record not found for note creation.",
        });
      }

      const content = input.content.trim();
      if (!content) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Note content cannot be empty.",
        });
      }

      const mentionIds = input.mentionIds ?? [];
      const mentionableUsers = mentionIds.length
        ? await db
            .select({ userId: locationMember.userId })
            .from(locationMember)
            .where(
              and(
                eq(locationMember.locationId, locationId),
                inArray(locationMember.userId, mentionIds)
              )
            )
        : [];

      const validMentionIds = mentionableUsers
        .map((member) => member.userId)
        .filter((userId) => userId !== ctx.auth.user.id);

      const noteId = createId();
      await db.transaction(async (tx) => {
        const now = new Date();
        await tx.insert(note).values({
          id: noteId,
          organizationId: orgId,
          locationId,
          clientId: input.clientId ?? null,
          dealId: input.dealId ?? null,
          authorId: ctx.auth.user.id,
          content,
          pinned: input.pinned ?? false,
          createdAt: now,
          updatedAt: now,
        });

        if (validMentionIds.length > 0) {
          await tx.insert(noteMention).values(
            validMentionIds.map((userId) => ({
              id: createId(),
              noteId,
              userId,
            }))
          );
        }

        if (input.clientId) {
          await tx
            .update(client)
            .set({ lastInteractionAt: now, updatedAt: now })
            .where(eq(client.id, input.clientId));
        }

        if (input.dealId) {
          await tx
            .update(deal)
            .set({ lastActivityAt: now, updatedAt: now })
            .where(eq(deal.id, input.dealId));
        }

        if (validMentionIds.length > 0) {
          const entityType = input.clientId ? "client" : "deal";
          const entityId = input.clientId ?? input.dealId!;
          const messageTarget = input.clientId
            ? `client ${target.name}`
            : `deal ${target.name}`;

          await tx.insert(notification).values(
            validMentionIds.map((userId) => ({
            id: createId(),
            userId,
            organizationId: orgId,
            locationId,
            type: "NOTE_MENTION",
            title: "You were mentioned in a note",
            message: `${ctx.auth.user.name} mentioned you on ${messageTarget}.`,
            data: {
              noteId: note.id,
              entityType,
              entityId,
            },
            entityType,
            entityId,
            actorId: ctx.auth.user.id,
            createdAt: now,
          }))
          );
        }
      });

      const createdNote = await loadNote(noteId);
      if (!createdNote) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Note was created but could not be loaded.",
        });
      }

      return createdNote;
    }),

  pin: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        pinned: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      const locationId = ctx.locationId;

      if (!orgId || !locationId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Location context required to update notes.",
        });
      }

      const updatedNotes = await db
        .update(note)
        .set({
          pinned: input.pinned,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(note.id, input.id),
            eq(note.organizationId, orgId),
            eq(note.locationId, locationId)
          )
        )
        .returning({ id: note.id });

      if (updatedNotes.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Note not found.",
        });
      }

      return { success: true };
    }),
});
