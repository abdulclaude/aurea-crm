import { TRPCError } from "@trpc/server";
import { createId } from "@paralleldrive/cuid2";
import { and, desc, eq, exists, inArray, isNull, or } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  client,
  clientHousehold,
  clientHouseholdMember,
} from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { requireCapability } from "@/features/permissions/server/authorization";

const householdRoles = ["PRIMARY", "PARTNER", "CHILD", "DEPENDENT", "MEMBER"] as const;
type HouseholdRole = (typeof householdRoles)[number];

const householdMemberInput = z.object({
  clientId: z.string().min(1),
  role: z.enum(householdRoles).default("MEMBER"),
  relationship: z.string().max(80).optional(),
});

async function assertClientsInScope(
  clientIds: string[],
  organizationId: string,
  locationId: string | null,
): Promise<void> {
  if (clientIds.length === 0) {
    return;
  }

  const clients = await db
    .select({ id: client.id })
    .from(client)
    .where(
      and(
        inArray(client.id, clientIds),
        eq(client.organizationId, organizationId),
        locationId
          ? eq(client.locationId, locationId)
          : isNull(client.locationId)
      )
    );

  if (clients.length !== new Set(clientIds).size) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "One or more clients are outside this workspace",
    });
  }
}

export const householdsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.orgId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Organization context is required",
      });
    }

    const households = await db.query.clientHousehold.findMany({
      where: and(
        eq(clientHousehold.organizationId, ctx.orgId),
        ctx.locationId
          ? eq(clientHousehold.locationId, ctx.locationId)
          : isNull(clientHousehold.locationId)
      ),
      orderBy: [desc(clientHousehold.updatedAt), desc(clientHousehold.createdAt)],
      with: {
        client: {
          columns: { id: true, name: true, email: true, phone: true, logo: true },
        },
        clientHouseholdMembers: {
          with: {
            client: {
              columns: {
                id: true,
                name: true,
                email: true,
                phone: true,
                logo: true,
                type: true,
              },
            },
          },
          orderBy: (member, { asc }) => [asc(member.role), asc(member.createdAt)],
        },
      },
    });

    return households.map(({ client: primaryContact, clientHouseholdMembers, ...household }) => ({
      ...household,
      primaryContact,
      members: clientHouseholdMembers,
    }));
  }),

  getForClient: protectedProcedure
    .input(z.object({ clientId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context is required",
        });
      }
      const targetClient = await db.query.client.findFirst({
        where: and(
          eq(client.id, input.clientId),
          eq(client.organizationId, ctx.orgId),
          ctx.locationId
            ? eq(client.locationId, ctx.locationId)
            : undefined,
        ),
        columns: { id: true, locationId: true },
      });
      if (!targetClient) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }
      await requireCapability({
        actor: {
          userId: ctx.auth.user.id,
          organizationId: ctx.orgId,
          locationId: ctx.locationId,
        },
        capability: "customer.view",
        resource: {
          organizationId: ctx.orgId,
          locationId: targetClient.locationId,
        },
      });

      const households = await db.query.clientHousehold.findMany({
        where: and(
          eq(clientHousehold.organizationId, ctx.orgId),
          targetClient.locationId
            ? eq(clientHousehold.locationId, targetClient.locationId)
            : isNull(clientHousehold.locationId),
          or(
            eq(clientHousehold.primaryContactId, input.clientId),
            exists(
              db
                .select({ id: clientHouseholdMember.id })
                .from(clientHouseholdMember)
                .where(
                  and(
                    eq(
                      clientHouseholdMember.householdId,
                      clientHousehold.id,
                    ),
                    eq(clientHouseholdMember.clientId, input.clientId),
                  ),
                ),
            ),
          ),
        ),
        orderBy: [desc(clientHousehold.updatedAt)],
        with: {
          client: {
            columns: { id: true, name: true, email: true, logo: true },
          },
          clientHouseholdMembers: {
            columns: {
              id: true,
              clientId: true,
              role: true,
              relationship: true,
            },
            with: {
              client: {
                columns: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  logo: true,
                },
              },
            },
          },
        },
      });

      return households.map(
        ({ client: primaryContact, clientHouseholdMembers, ...household }) => ({
          ...household,
          primaryContact,
          members: clientHouseholdMembers,
          currentMember:
            clientHouseholdMembers.find(
              (member) => member.clientId === input.clientId,
            ) ?? null,
        }),
      );
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(120),
        primaryContactId: z.string().min(1).optional(),
        notes: z.string().max(1000).optional(),
        members: z.array(householdMemberInput).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context is required",
        });
      }
      const organizationId = ctx.orgId;
      const locationId = ctx.locationId ?? null;

      const memberMap = new Map(input.members.map((member) => [member.clientId, member]));
      if (input.primaryContactId && !memberMap.has(input.primaryContactId)) {
        memberMap.set(input.primaryContactId, {
          clientId: input.primaryContactId,
          role: "PRIMARY",
          relationship: "Primary account holder",
        });
      }

      const members = Array.from(memberMap.values());
      await assertClientsInScope(
        members.map((member) => member.clientId),
        organizationId,
        locationId,
      );

      return db.transaction(async (tx) => {
        const now = new Date();
        const [household] = await tx
          .insert(clientHousehold)
          .values({
            id: createId(),
            organizationId,
            locationId,
            name: input.name.trim(),
            primaryContactId: input.primaryContactId ?? null,
            notes: input.notes?.trim() || null,
            updatedAt: now,
          })
          .returning();

        if (!household) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create household",
          });
        }

        if (members.length > 0) {
          await tx.insert(clientHouseholdMember).values(
            members.map((member) => ({
              id: createId(),
              householdId: household.id,
                clientId: member.clientId,
                role: member.role,
                relationship: member.relationship?.trim() || null,
              updatedAt: now,
            }))
          );
        }

        return household;
      });
    }),

  addMember: protectedProcedure
    .input(z.object({ householdId: z.string(), member: householdMemberInput }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Organization context is required" });
      }

      const household = await db.query.clientHousehold.findFirst({
        where: and(
          eq(clientHousehold.id, input.householdId),
          eq(clientHousehold.organizationId, ctx.orgId),
          ctx.locationId
            ? eq(clientHousehold.locationId, ctx.locationId)
            : isNull(clientHousehold.locationId)
        ),
        columns: { id: true },
      });

      if (!household) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Household not found" });
      }

      await assertClientsInScope([input.member.clientId], ctx.orgId, ctx.locationId ?? null);

      const now = new Date();
      const [member] = await db
        .insert(clientHouseholdMember)
        .values({
          id: createId(),
          householdId: input.householdId,
          clientId: input.member.clientId,
          role: input.member.role,
          relationship: input.member.relationship?.trim() || null,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [clientHouseholdMember.householdId, clientHouseholdMember.clientId],
          set: {
          role: input.member.role,
          relationship: input.member.relationship?.trim() || null,
            updatedAt: now,
          },
        })
        .returning();

      return member;
    }),

  removeMember: protectedProcedure
    .input(z.object({ householdId: z.string(), clientId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Organization context is required" });
      }

      const [member] = await db
        .select({ id: clientHouseholdMember.id })
        .from(clientHouseholdMember)
        .innerJoin(
          clientHousehold,
          eq(clientHousehold.id, clientHouseholdMember.householdId)
        )
        .where(
          and(
            eq(clientHouseholdMember.householdId, input.householdId),
            eq(clientHouseholdMember.clientId, input.clientId),
            eq(clientHousehold.organizationId, ctx.orgId),
            ctx.locationId
              ? eq(clientHousehold.locationId, ctx.locationId)
              : isNull(clientHousehold.locationId)
          )
        )
        .limit(1);

      if (!member) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Household member not found" });
      }

      const [deletedMember] = await db
        .delete(clientHouseholdMember)
        .where(eq(clientHouseholdMember.id, member.id))
        .returning();

      return deletedMember;
    }),
});
