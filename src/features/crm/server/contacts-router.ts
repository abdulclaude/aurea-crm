import { TRPCError } from "@trpc/server";
import z from "zod";

import { CRM_PAGE_SIZE } from "@/features/crm/constants";
import { ContactType, LifecycleStage } from "@prisma/client";
import type { Prisma } from "@prisma/client";

import prisma from "@/lib/db";
import { getUsersActivityStatus } from "@/lib/activity-tracker";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { createNotification } from "@/lib/notifications";
import { logAnalytics, getChangedFields } from "@/lib/analytics-logger";
import { ActivityAction } from "@prisma/client";

const contactInclude = {
  contactAssignee: {
    include: {
      subaccountMember: {
        include: {
          user: true,
        },
      },
    },
  },
} satisfies Prisma.ContactInclude;

type ContactResult = Prisma.ContactGetPayload<{
  include: typeof contactInclude;
}>;

const mapContact = (
  contact: ContactResult,
  activityStatus?: Map<
    string,
    {
      isOnline: boolean;
      lastActivityAt: Date | null;
      lastLoginAt: Date;
      status: string;
      statusMessage: string | null;
    }
  >
) => {
  return {
    id: contact.id,
    name: contact.name,
    logo: contact.logo,
    companyName: contact.companyName,
    email: contact.email,
    position: contact.position,
    phone: contact.phone,
    country: contact.country,
    city: contact.city,
    score: contact.score ?? 0,
    type: contact.type,
    source: contact.source,
    lifecycleStage: contact.lifecycleStage,
    website: contact.website,
    linkedin: contact.linkedin,
    lastInteractionAt: contact.lastInteractionAt,
    tags: contact.tags,
    notes: contact.notes,
    metadata: contact.metadata,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
    assignees: contact.contactAssignee.map((assignee) => {
      const userId = assignee.subaccountMember.user?.id;
      const activity =
        userId && activityStatus ? activityStatus.get(userId) : undefined;

      return {
        id: assignee.subaccountMemberId,
        userId: userId ?? null,
        name: assignee.subaccountMember.user?.name ?? "Unknown",
        email: assignee.subaccountMember.user?.email ?? null,
        image: assignee.subaccountMember.user?.image ?? null,
        role: assignee.subaccountMember.role,
        isOnline: activity?.isOnline ?? false,
        lastActivityAt: activity?.lastActivityAt ?? null,
        lastLoginAt: activity?.lastLoginAt ?? null,
        status: activity?.status ?? "OFFLINE",
        statusMessage: activity?.statusMessage ?? null,
      };
    }),
  };
};

export const contactsRouter = createTRPCRouter({
  getSubaccountMembers: protectedProcedure.query(async ({ ctx }) => {
    const subaccountId = ctx.subaccountId;
    if (!subaccountId) {
      // Return empty array for agency level (no members to assign)
      return [];
    }

    const members = await prisma.subaccountMember.findMany({
      where: { subaccountId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return members.map((member) => ({
      id: member.id,
      userId: member.user?.id ?? null,
      name: member.user?.name ?? "Unknown",
      email: member.user?.email ?? null,
      image: member.user?.image ?? null,
      role: member.role,
    }));
  }),

  count: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.orgId;
    const subaccountId = ctx.subaccountId;

    if (!orgId) {
      return 0;
    }

    return await prisma.contact.count({
      where: {
        organizationId: orgId,
        ...(subaccountId && { subaccountId }),
      },
    });
  }),

  dateRange: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.orgId;
    const subaccountId = ctx.subaccountId;

    if (!orgId) {
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return { minDate: thirtyDaysAgo, maxDate: now };
    }

    const result = await prisma.contact.aggregate({
      where: {
        organizationId: orgId,
        ...(subaccountId && { subaccountId }),
      },
      _min: {
        createdAt: true,
        lastInteractionAt: true,
        updatedAt: true,
      },
      _max: {
        createdAt: true,
        lastInteractionAt: true,
        updatedAt: true,
      },
    });

    // Find the earliest and latest dates across all fields
    const allDates = [
      result._min.createdAt,
      result._min.lastInteractionAt,
      result._min.updatedAt,
      result._max.createdAt,
      result._max.lastInteractionAt,
      result._max.updatedAt,
    ].filter((d): d is Date => d !== null);

    if (allDates.length === 0) {
      // No contacts yet, return default range
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return {
        minDate: thirtyDaysAgo,
        maxDate: now,
      };
    }

    const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

    return {
      minDate,
      maxDate,
    };
  }),

  list: protectedProcedure
    .input(
      z
        .object({
          page: z.number().min(1).default(1),
          pageSize: z.number().min(1).max(100).default(20),
          search: z.string().optional(),
          types: z.array(z.enum(ContactType)).optional(),
          tags: z.array(z.string()).optional(),
          assignedTo: z.array(z.string()).optional(),
          createdAtStart: z.date().optional(),
          createdAtEnd: z.date().optional(),
          lastActivityStart: z.date().optional(),
          lastActivityEnd: z.date().optional(),
          updatedAtStart: z.date().optional(),
          updatedAtEnd: z.date().optional(),
          cursor: z.number().optional(),
          limit: z.number().optional(),
          subaccountId: z.string().optional(), // Override for "all-clients" view
          includeAllClients: z.boolean().optional(), // Flag to include all clients
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      // Use input subaccountId if provided, otherwise use context subaccountId
      const subaccountId = input?.subaccountId !== undefined
        ? (input.subaccountId || null)
        : ctx.subaccountId;

      if (!orgId) {
        return {
          items: [],
          nextCursor: null,
          total: 0,
          pagination: {
            currentPage: 1,
            totalPages: 0,
            pageSize: input?.pageSize ?? 20,
            totalItems: 0,
          },
        };
      }

      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 20;
      const take = Math.min(input?.limit ?? CRM_PAGE_SIZE, CRM_PAGE_SIZE);
      const skip = input?.cursor ?? (page - 1) * pageSize;

      const where: Prisma.ContactWhereInput = {
        organizationId: orgId,
        // Only filter by subaccount if not viewing all clients
        ...(input?.includeAllClients
          ? {}
          : subaccountId
            ? { subaccountId }
            : { subaccountId: null }
        ),
      };

      if (input?.types && input.types.length > 0) {
        where.type = { in: input.types };
      }

      if (input?.tags && input.tags.length > 0) {
        where.tags = {
          hasSome: input.tags,
        };
      }

      if (input?.assignedTo && input.assignedTo.length > 0) {
        where.contactAssignee = {
          some: {
            subaccountMemberId: {
              in: input.assignedTo,
            },
          },
        };
      }

      if (input?.createdAtStart || input?.createdAtEnd) {
        where.createdAt = {};
        if (input.createdAtStart) {
          where.createdAt.gte = input.createdAtStart;
        }
        if (input.createdAtEnd) {
          // Set to end of day
          const endOfDay = new Date(input.createdAtEnd);
          endOfDay.setHours(23, 59, 59, 999);
          where.createdAt.lte = endOfDay;
        }
      }

      if (input?.lastActivityStart || input?.lastActivityEnd) {
        where.lastInteractionAt = {};
        if (input.lastActivityStart) {
          where.lastInteractionAt.gte = input.lastActivityStart;
        }
        if (input.lastActivityEnd) {
          const endOfDay = new Date(input.lastActivityEnd);
          endOfDay.setHours(23, 59, 59, 999);
          where.lastInteractionAt.lte = endOfDay;
        }
      }

      if (input?.updatedAtStart || input?.updatedAtEnd) {
        where.updatedAt = {};
        if (input.updatedAtStart) {
          where.updatedAt.gte = input.updatedAtStart;
        }
        if (input.updatedAtEnd) {
          const endOfDay = new Date(input.updatedAtEnd);
          endOfDay.setHours(23, 59, 59, 999);
          where.updatedAt.lte = endOfDay;
        }
      }

      if (input?.search?.trim()) {
        const search = input.search.trim();
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { companyName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
          { country: { contains: search, mode: "insensitive" } },
          { position: { contains: search, mode: "insensitive" } },
        ];
      }

      const [items, totalItems] = await Promise.all([
        prisma.contact.findMany({
          where,
          include: contactInclude,
          orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
          skip,
          take: pageSize,
        }),
        prisma.contact.count({ where }),
      ]);

      // Collect all unique user IDs from assignees
      const userIds = new Set<string>();
      for (const contact of items) {
        for (const assignee of contact.contactAssignee) {
          const userId = assignee.subaccountMember.user?.id;
          if (userId) {
            userIds.add(userId);
          }
        }
      }

      // Fetch activity status for all users
      const activityStatus =
        userIds.size > 0
          ? await getUsersActivityStatus(Array.from(userIds))
          : new Map();

      const nextCursor = skip + items.length < totalItems ? skip + take : null;
      const totalPages = Math.ceil(totalItems / pageSize);

      return {
        items: items.map((contact) => mapContact(contact, activityStatus)),
        nextCursor,
        total: totalItems,
        pagination: {
          currentPage: page,
          totalPages,
          pageSize,
          totalItems,
        },
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        logo: z.string().optional(),
        companyName: z.string().optional(),
        email: z
          .string()
          .email({ message: "Invalid email" })
          .optional()
          .or(z.literal("")),
        position: z.string().optional(),
        phone: z.string().optional(),
        country: z.string().optional(),
        city: z.string().optional(),
        score: z.number().optional(),
        type: z.enum(ContactType).optional(),
        lifecycleStage: z.nativeEnum(LifecycleStage).optional(),
        source: z.string().optional(),
        website: z.string().optional(),
        linkedin: z.string().optional(),
        tags: z.array(z.string()).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      const subaccountId = ctx.subaccountId;

      if (!orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization context required to create contacts",
        });
      }

      const contact = await prisma.contact.create({
        data: {
          id: crypto.randomUUID(),
          organizationId: orgId,
          subaccountId: subaccountId ?? null,
          name: input.name,
          logo: input.logo,
          companyName: input.companyName,
          email: input.email || null,
          position: input.position,
          phone: input.phone,
          country: input.country,
          city: input.city,
          score: input.score ?? 0,
          type: input.type ?? ContactType.LEAD,
          lifecycleStage: input.lifecycleStage,
          source: input.source,
          website: input.website,
          linkedin: input.linkedin,
          tags: input.tags ?? [],
          notes: input.notes,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        include: contactInclude,
      });

      // Send notification
      await createNotification({
        type: "CONTACT_CREATED",
        title: "Contact created",
        message: `${ctx.auth.user.name} created a new contact: ${contact.name}`,
        actorId: ctx.auth.user.id,
        entityType: "contact",
        entityId: contact.id,
        organizationId: orgId,
        subaccountId: subaccountId ?? undefined,
      });

      // Log activity and PostHog analytics
      await logAnalytics({
        organizationId: orgId,
        subaccountId: subaccountId ?? null,
        userId: ctx.auth.user.id,
        action: ActivityAction.CREATED,
        entityType: "contact",
        entityId: contact.id,
        entityName: contact.name,
        metadata: {
          email: contact.email,
          companyName: contact.companyName,
          type: contact.type,
        },
        posthogProperties: {
          email: contact.email,
          company_name: contact.companyName,
          contact_type: contact.type,
          lifecycle_stage: contact.lifecycleStage,
          score: contact.score,
        },
      });

      return mapContact(contact as ContactResult);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, "Name is required").optional(),
        logo: z.string().optional(),
        companyName: z.string().optional(),
        email: z
          .string()
          .email({ message: "Invalid email" })
          .optional()
          .or(z.literal("")),
        position: z.string().optional(),
        phone: z.string().optional(),
        country: z.string().optional(),
        city: z.string().optional(),
        score: z.number().optional(),
        type: z.nativeEnum(ContactType).optional(),
        lifecycleStage: z.nativeEnum(LifecycleStage).optional(),
        source: z.string().optional(),
        website: z.string().optional(),
        linkedin: z.string().optional(),
        tags: z.array(z.string()).optional(),
        notes: z.string().optional(),
        assigneeIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      const subaccountId = ctx.subaccountId;

      if (!orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization context required to update contacts",
        });
      }

      const { id, assigneeIds, ...data } = input;

      // Fetch old contact data for change tracking
      const oldContact = await prisma.contact.findUnique({
        where: { id },
        select: {
          name: true,
          email: true,
          companyName: true,
          type: true,
          lifecycleStage: true,
          score: true,
          phone: true,
          position: true,
        },
      });

      if (!oldContact) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Contact not found",
        });
      }

      // Validate assigneeIds belong to the same subaccount (only if in subaccount context)
      if (assigneeIds && assigneeIds.length > 0 && subaccountId) {
        const validMembers = await prisma.subaccountMember.findMany({
          where: {
            id: { in: assigneeIds },
            subaccountId,
          },
          select: { id: true },
        });

        const validMemberIds = validMembers.map((m) => m.id);
        const invalidIds = assigneeIds.filter(
          (id) => !validMemberIds.includes(id)
        );

        if (invalidIds.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Invalid member IDs: ${invalidIds.join(", ")}`,
          });
        }
      }

      const contact = await prisma.contact.update({
        where: {
          id,
          organizationId: orgId,
          ...(subaccountId && { subaccountId }),
        },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.logo !== undefined && { logo: data.logo || null }),
          ...(data.companyName !== undefined && {
            companyName: data.companyName || null,
          }),
          ...(data.email !== undefined && { email: data.email || null }),
          ...(data.position !== undefined && {
            position: data.position || null,
          }),
          ...(data.phone !== undefined && { phone: data.phone || null }),
          ...(data.country !== undefined && { country: data.country || null }),
          ...(data.city !== undefined && { city: data.city || null }),
          ...(data.score !== undefined && { score: data.score }),
          ...(data.type && { type: data.type }),
          ...(data.lifecycleStage !== undefined && {
            lifecycleStage: data.lifecycleStage || null,
          }),
          ...(data.source !== undefined && { source: data.source || null }),
          ...(data.website !== undefined && { website: data.website || null }),
          ...(data.linkedin !== undefined && {
            linkedin: data.linkedin || null,
          }),
          ...(data.tags !== undefined && { tags: data.tags }),
          ...(data.notes !== undefined && { notes: data.notes || null }),
          ...(assigneeIds !== undefined && {
            assignees: {
              deleteMany: {},
              create: assigneeIds.map((subaccountMemberId) => ({
                subaccountMemberId,
              })),
            },
          }),
        },
        include: contactInclude,
      });

      // Log activity with changes
      const changes = getChangedFields(oldContact, data);
      const isLifecycleChange = data.lifecycleStage !== undefined &&
        data.lifecycleStage !== oldContact.lifecycleStage;

      await logAnalytics({
        organizationId: orgId,
        subaccountId: subaccountId ?? null,
        userId: ctx.auth.user.id,
        action: ActivityAction.UPDATED,
        entityType: "contact",
        entityId: contact.id,
        entityName: contact.name,
        changes,
        metadata: {
          fieldsChanged: changes ? Object.keys(changes) : [],
          isLifecycleChange,
          ...(isLifecycleChange && {
            oldLifecycleStage: oldContact.lifecycleStage,
            newLifecycleStage: data.lifecycleStage,
          }),
        },
        posthogProperties: {
          fields_changed: changes ? Object.keys(changes) : [],
          is_lifecycle_change: isLifecycleChange,
          ...(isLifecycleChange && {
            old_lifecycle_stage: oldContact.lifecycleStage,
            new_lifecycle_stage: data.lifecycleStage,
          }),
          lifecycle_stage: contact.lifecycleStage,
          score: contact.score,
        },
      });

      return mapContact(contact);
    }),
});
