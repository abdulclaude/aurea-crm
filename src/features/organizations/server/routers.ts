import type { OrganizationMemberRole, Prisma } from "@prisma/client";
import { ActivityAction } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import z from "zod";

import {
  CLIENTS_DEFAULT_SORT,
  CLIENTS_PAGE_SIZE,
} from "@/features/organizations/clients/constants";
import prisma from "@/lib/db";
import { sendInvitationEmail } from "@/lib/resend";
import {
  authenticatedProcedure,
  baseProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "@/trpc/init";
import { createNotification } from "@/lib/notifications";
import { logAnalytics } from "@/lib/analytics-logger";

const clientInclude = {
  organization: {
    include: {
      invitation: true,
      member: {
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
      },
    },
  },
  subaccountMember: {
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
  },
  Workflows: {
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  },
  _count: {
    select: {
      Workflows: true,
    },
  },
};

type SubaccountClientPayload = Prisma.SubaccountGetPayload<{
  include: typeof clientInclude;
}>;

type ClientFilterOptions = {
  countries: string[];
  industries: string[];
};

const CLIENT_SORT_ORDER: Record<
  string,
  Prisma.SubaccountOrderByWithRelationInput[]
> = {
  "company.asc": [{ companyName: "asc" }, { createdAt: "desc" }],
  "company.desc": [{ companyName: "desc" }, { createdAt: "desc" }],
  "workflowsCount.desc": [
    { Workflows: { _count: "desc" } },
    { createdAt: "desc" },
  ],
  "workflowsCount.asc": [
    { Workflows: { _count: "asc" } },
    { createdAt: "desc" },
  ],
  "country.asc": [{ country: "asc" }, { companyName: "asc" }],
  "country.desc": [{ country: "desc" }, { companyName: "asc" }],
  "createdAt.asc": [{ createdAt: "asc" }],
  "createdAt.desc": [{ createdAt: "desc" }],
};

export const organizationsRouter = createTRPCRouter({
  /**
   * Create an agency (personal/main org) with extended profile.
   * Returns created organization id.
   */
  createAgency: protectedProcedure
    .input(
      z.object({
        companyName: z.string().min(2),
        logo: z.url().optional(),
        website: z.url().optional(),
        billingEmail: z.email().optional(),
        phone: z.string().optional(),
        addressLine1: z.string().optional(),
        addressLine2: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postalCode: z.string().optional(),
        country: z.string().optional(),
        timezone: z.string().optional(),
        industry: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { companyName, logo } = input;

      const slug = companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const organizationId = crypto.randomUUID();

      await prisma.organization.create({
        data: {
          id: organizationId,
          name: companyName,
          slug,
          logo: logo || null,
          createdAt: new Date(),
        },
      });

      await prisma.member.create({
        data: {
          id: crypto.randomUUID(),
          organizationId,
          userId: ctx.auth.user.id,
          role: "owner",
          createdAt: new Date(),
        },
      });

      // Do not create a Subaccount for the agency itself; it's a first-class organization.

      return { organizationId };
    }),
  /**
   * Ensure the current user has a personal/main organization.
   * Returns the organization after ensuring it exists.
   */
  ensureMain: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.auth.user.id;
    const existing = await prisma.member.findFirst({
      where: { userId },
      include: { organization: true },
      orderBy: { createdAt: "asc" },
    });
    if (existing) {
      return existing.organization;
    }

    const baseName =
      ctx.auth.user.name || `${ctx.auth.user.email.split("@")[0]}'s Workspace`;
    const slug = baseName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const organization = await prisma.organization.create({
      data: {
        id: crypto.randomUUID(),
        name: baseName,
        slug,
        createdAt: new Date(),
      },
    });

    await prisma.member.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: organization.id,
        userId,
        role: "owner",
        createdAt: new Date(),
      },
    });

    // Do not create a Subaccount for the agency itself.

    return organization;
  }),
  /**
   * Return the active organization id from the session.
   */
  getActive: protectedProcedure.query(async ({ ctx }) => {
    return {
      activeOrganizationId: ctx.orgId ?? null,
      activeSubaccountId: ctx.subaccountId ?? null,
      activeSubaccount: ctx.subaccount
        ? {
            id: ctx.subaccount.id,
            companyName: ctx.subaccount.companyName,
            logo: ctx.subaccount.logo,
            slug: ctx.subaccount.slug,
          }
        : null,
    };
  }),
  /**
   * Organizations where the current user is a member.
   */
  getMyOrganizations: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await prisma.member.findMany({
      where: { userId: ctx.auth.user.id },
      include: {
        organization: {
          include: {
            subaccount: true,
            member: {
              include: { user: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      logo: m.organization.logo,
      ownerName: m.organization.member[0]?.user?.name ?? null,
      ownerEmail: m.organization.member[0]?.user?.email ?? null,
      role: m.role,
      subaccount: m.organization.subaccount?.[0] ?? null,
    }));
  }),
  /**
   * Toggle the active subaccount (client) context for the current session.
   */
  setActiveSubaccount: protectedProcedure
    .input(
      z.object({
        subaccountId: z.string().cuid().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization found.",
        });
      }

      const sessionToken = ctx.auth.session.token;

      if (!input.subaccountId) {
        await prisma.session.update({
          where: { token: sessionToken },
          data: { activeSubaccountId: null },
        });

        return {
          activeSubaccountId: null,
          activeSubaccount: null,
        };
      }

      const subaccount = await prisma.subaccount.findFirst({
        where: {
          id: input.subaccountId,
          organizationId: ctx.orgId,
        },
      });

      if (!subaccount) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subaccount not found for this organization.",
        });
      }

      await prisma.session.update({
        where: { token: sessionToken },
        data: { activeSubaccountId: subaccount.id },
      });

      return {
        activeSubaccountId: subaccount.id,
        activeSubaccount: {
          id: subaccount.id,
          companyName: subaccount.companyName,
          logo: subaccount.logo,
          slug: subaccount.slug,
        },
      };
    }),

  /**
   * Create a subaccount (client) under the active or provided organization.
   */
  createSubaccount: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().optional(),
        companyName: z.string().min(2),
        logo: z.url().optional(),
        website: z.url().optional(),
        billingEmail: z.email().optional(),
        phone: z.string().optional(),
        addressLine1: z.string().optional(),
        addressLine2: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postalCode: z.string().optional(),
        country: z.string().optional(),
        timezone: z.string().optional(),
        industry: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = input.organizationId ?? ctx.orgId;
      if (!organizationId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization found.",
        });
      }

      const slugBase = input.companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const slugSuffix = crypto.randomUUID().slice(0, 6);
      const slug = `${slugBase}-${slugSuffix}`;

      const sub = await prisma.subaccount.create({
        data: {
          id: crypto.randomUUID(),
          organizationId,
          companyName: input.companyName,
          logo: input.logo || null,
          website: input.website || null,
          billingEmail: input.billingEmail || null,
          phone: input.phone || null,
          addressLine1: input.addressLine1 || null,
          addressLine2: input.addressLine2 || null,
          city: input.city || null,
          state: input.state || null,
          postalCode: input.postalCode || null,
          country: input.country || null,
          timezone: input.timezone || undefined,
          industry: input.industry || null,
          createdByUserId: ctx.auth.user.id,
          slug,
          createdAt: new Date(),
          updatedAt: new Date(),
          subaccountMember: {
            create: [
              {
                id: crypto.randomUUID(),
                userId: ctx.auth.user.id,
                role: "AGENCY",
                updatedAt: new Date(),
              },
            ],
          },
        },
        include: clientInclude,
      });
      return sub;
    }),

  /**
   * Organizations (clients) - visible to ALL agency members.
   * - Agency Staff sees only assigned subaccounts
   * - All other roles see all subaccounts in the organization
   */
  getClients: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.orgId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No active organization found.",
      });
    }

    const membership = await prisma.member.findFirst({
      where: {
        organizationId: ctx.orgId,
        userId: ctx.auth.user.id,
      },
    });

    if (!membership) {
      return [];
    }

    // Agency Staff can only see subaccounts they are assigned to
    if (membership.role === "staff") {
      const assignedSubaccounts = await prisma.subaccount.findMany({
        where: {
          organizationId: ctx.orgId,
          subaccountMember: {
            some: {
              userId: ctx.auth.user.id,
            },
          },
        },
        include: clientInclude,
        orderBy: [{ createdAt: "desc" }],
      });

      return assignedSubaccounts.map((subaccount) =>
        mapSubaccountToClient(subaccount, ctx.subaccountId)
      );
    }

    // All other roles (owner, admin, manager, viewer) see all subaccounts
    const subaccounts = await prisma.subaccount.findMany({
      where: {
        organizationId: ctx.orgId,
      },
      include: clientInclude,
      orderBy: [{ createdAt: "desc" }],
    });

    return subaccounts.map((subaccount) =>
      mapSubaccountToClient(subaccount, ctx.subaccountId)
    );
  }),

  getClientsInfinite: protectedProcedure
    .input(
      z.object({
        cursor: z.string().nullish(),
        limit: z.number().min(5).max(100).optional(),
        search: z.string().optional(),
        sort: z.string().optional(),
        countries: z.array(z.string()).optional(),
        industries: z.array(z.string()).optional(),
        attention: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization found.",
        });
      }

      const membership = await prisma.member.findFirst({
        where: {
          organizationId: ctx.orgId,
          userId: ctx.auth.user.id,
        },
      });

      if (!membership) {
        return { items: [], nextCursor: null, total: 0, filters: undefined };
      }

      const take = Math.min(
        input.limit ?? CLIENTS_PAGE_SIZE,
        CLIENTS_PAGE_SIZE
      );
      const cursorValue = input.cursor ? Number(input.cursor) : 0;
      const skip =
        Number.isFinite(cursorValue) && cursorValue > 0 ? cursorValue : 0;

      // Base where clause
      let where = buildClientsWhere({
        organizationId: ctx.orgId,
        countries: input.countries,
        industries: input.industries,
        search: input.search,
        attention: input.attention,
      });

      // Agency Staff: only see assigned subaccounts
      if (membership.role === "staff") {
        where = {
          ...where,
          subaccountMember: {
            some: {
              userId: ctx.auth.user.id,
            },
          },
        };
      }

      const sortKey = input.sort ?? CLIENTS_DEFAULT_SORT;
      const orderBy =
        CLIENT_SORT_ORDER[sortKey] ?? CLIENT_SORT_ORDER[CLIENTS_DEFAULT_SORT];

      const subaccounts = await prisma.subaccount.findMany({
        where,
        include: clientInclude,
        orderBy,
        skip,
        take: take + 1,
      });

      const hasMore = subaccounts.length > take;
      const items = (hasMore ? subaccounts.slice(0, take) : subaccounts).map(
        (subaccount) => mapSubaccountToClient(subaccount, ctx.subaccountId)
      );

      const total = await prisma.subaccount.count({ where });
      let filters: ClientFilterOptions | undefined;
      if (!input.cursor) {
        filters = await fetchClientFilters(ctx.orgId);
      }

      return {
        items,
        nextCursor: hasMore ? String(skip + take) : null,
        total,
        filters,
      };
    }),

  /**
   * Upsert subaccount profile for an organization.
   */
  upsertSubaccount: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        companyName: z.string().min(1),
        website: z.string().url().optional().or(z.literal("")),
        billingEmail: z.string().email().optional().or(z.literal("")),
        phone: z.string().optional().or(z.literal("")),
        addressLine1: z.string().optional().or(z.literal("")),
        addressLine2: z.string().optional().or(z.literal("")),
        city: z.string().optional().or(z.literal("")),
        state: z.string().optional().or(z.literal("")),
        postalCode: z.string().optional().or(z.literal("")),
        country: z.string().optional().or(z.literal("")),
        timezone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const {
        organizationId,
        companyName,
        website,
        billingEmail,
        phone,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        country,
        timezone,
      } = input;

      const subaccount = await prisma.subaccount.upsert({
        where: { id: organizationId },
        update: {
          companyName,
          website: website || null,
          billingEmail: billingEmail || null,
          phone: phone || null,
          addressLine1: addressLine1 || null,
          addressLine2: addressLine2 || null,
          city: city || null,
          state: state || null,
          postalCode: postalCode || null,
          country: country || null,
          timezone: timezone || undefined,
        },
        create: {
          id: crypto.randomUUID(),
          organizationId,
          companyName,
          website: website || null,
          billingEmail: billingEmail || null,
          phone: phone || null,
          addressLine1: addressLine1 || null,
          addressLine2: addressLine2 || null,
          city: city || null,
          state: state || null,
          postalCode: postalCode || null,
          country: country || null,
          timezone: timezone || undefined,
          createdByUserId: ctx.auth.user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return subaccount;
    }),

  /**
   * List all members of the active subaccount
   */
  listSubaccountMembers: protectedProcedure.query(async ({ ctx }) => {
    const subaccountId = ctx.subaccountId;
    if (!subaccountId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This endpoint is only available inside a client workspace.",
      });
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
      orderBy: {
        createdAt: "asc",
      },
    });

    return members.map((member) => ({
      id: member.id,
      userId: member.user.id,
      name: member.user.name,
      email: member.user.email,
      image: member.user.image,
      role: member.role,
      createdAt: member.createdAt,
    }));
  }),

  /**
   * List members with filtering, sorting, and user activity tracking (for data table)
   */
  listMembers: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        // Agency roles: owner, admin, manager, staff, viewer
        // Subaccount roles: AGENCY, ADMIN, MANAGER, STANDARD, LIMITED, VIEWER
        roles: z
          .array(
            z.enum([
              "owner",
              "admin",
              "manager",
              "staff",
              "viewer",
              "AGENCY",
              "ADMIN",
              "MANAGER",
              "STANDARD",
              "LIMITED",
              "VIEWER",
            ])
          )
          .optional(),
        status: z
          .array(
            z.enum(["ONLINE", "WORKING", "DO_NOT_DISTURB", "AWAY", "OFFLINE"])
          )
          .optional(),
        sort: z.string().optional(),
        hiddenColumns: z.array(z.string()).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization found.",
        });
      }

      const isSubaccountContext = !!ctx.subaccountId;

      // Build where clause
      const where: any = {};

      if (input.search) {
        where.OR = [
          { user: { name: { contains: input.search, mode: "insensitive" } } },
          { user: { email: { contains: input.search, mode: "insensitive" } } },
        ];
      }

      if (input.roles && input.roles.length > 0) {
        where.role = { in: input.roles };
      }

      if (input.status && input.status.length > 0) {
        where.user = {
          ...where.user,
          status: { in: input.status },
        };
      }

      // Determine sort order
      const sortKey = input.sort || "name.asc";
      const [sortField, sortDir] = sortKey.split(".");

      let orderBy: any = {};
      if (sortField === "name") {
        orderBy = { user: { name: sortDir === "desc" ? "desc" : "asc" } };
      } else if (sortField === "email") {
        orderBy = { user: { email: sortDir === "desc" ? "desc" : "asc" } };
      } else if (sortField === "role") {
        orderBy = { role: sortDir === "desc" ? "desc" : "asc" };
      } else if (sortField === "createdAt") {
        orderBy = { createdAt: sortDir === "desc" ? "desc" : "asc" };
      } else {
        orderBy = { user: { name: "asc" } };
      }

      let items: any[] = [];
      let totalItems = 0;

      if (isSubaccountContext) {
        // Get total count for pagination
        totalItems = await prisma.subaccountMember.count({
          where: {
            subaccountId: ctx.subaccountId,
            ...where,
          },
        });

        // Subaccount members
        const subaccountMembers = await prisma.subaccountMember.findMany({
          where: {
            subaccountId: ctx.subaccountId,
            ...where,
          },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                status: true,
                statusMessage: true,
                createdAt: true,
              },
            },
          },
          orderBy,
        });

        // Get activity tracking from sessions
        const userIds = subaccountMembers.map((m) => m.user.id);
        const sessions = await prisma.session.findMany({
          where: {
            userId: { in: userIds },
            activeSubaccountId: ctx.subaccountId,
          },
          orderBy: { lastActivityAt: "desc" },
          distinct: ["userId"],
        });

        const sessionMap = new Map(
          sessions.map((s) => [
            s.userId,
            {
              lastActivityAt: s.lastActivityAt,
              isOnline: s.isOnline,
            },
          ])
        );

        // Get subaccount's organization to check for agency team members
        const subaccount = await prisma.subaccount.findUnique({
          where: { id: ctx.subaccountId! },
          select: { organizationId: true },
        });

        // Check which users are also organization members (agency team)
        const orgMembers = await prisma.member.findMany({
          where: {
            organizationId: subaccount?.organizationId,
            userId: { in: userIds },
          },
          select: {
            userId: true,
            role: true,
          },
        });

        const orgMemberMap = new Map(orgMembers.map((m) => [m.userId, m.role]));

        items = subaccountMembers.map((member) => {
          const sessionData = sessionMap.get(member.user.id);
          const agencyRole = orgMemberMap.get(member.user.id);
          return {
            id: member.id,
            userId: member.user.id,
            name: member.user.name,
            email: member.user.email,
            image: member.user.image,
            role: member.role,
            agencyRole: agencyRole || null, // Agency team indicator
            status: member.user.status,
            statusMessage: member.user.statusMessage,
            isOnline: sessionData?.isOnline ?? false,
            lastActivityAt: sessionData?.lastActivityAt ?? member.createdAt,
            createdAt: member.createdAt,
            updatedAt: member.updatedAt,
            memberType: "subaccount" as const,
          };
        });
      } else {
        // Get total count for pagination
        totalItems = await prisma.member.count({
          where: {
            organizationId: ctx.orgId,
            ...where,
          },
        });

        // Organization members
        const orgMembers = await prisma.member.findMany({
          where: {
            organizationId: ctx.orgId,
            ...where,
          },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                status: true,
                statusMessage: true,
                createdAt: true,
              },
            },
          },
          orderBy,
        });

        // Get activity tracking from sessions
        const userIds = orgMembers.map((m) => m.user.id);
        const sessions = await prisma.session.findMany({
          where: {
            userId: { in: userIds },
            activeOrganizationId: ctx.orgId,
          },
          orderBy: { lastActivityAt: "desc" },
          distinct: ["userId"],
        });

        const sessionMap = new Map(
          sessions.map((s) => [
            s.userId,
            {
              lastActivityAt: s.lastActivityAt,
              isOnline: s.isOnline,
            },
          ])
        );

        items = orgMembers.map((member) => {
          const sessionData = sessionMap.get(member.user.id);
          return {
            id: member.id,
            userId: member.user.id,
            name: member.user.name,
            email: member.user.email,
            image: member.user.image,
            role: member.role,
            status: member.user.status,
            statusMessage: member.user.statusMessage,
            isOnline: sessionData?.isOnline ?? false,
            lastActivityAt: sessionData?.lastActivityAt ?? member.createdAt,
            createdAt: member.createdAt,
            updatedAt: new Date(),
            memberType: "organization" as const,
          };
        });
      }

      const totalPages = Math.ceil(totalItems / input.pageSize);

      return {
        items,
        pagination: {
          currentPage: input.page,
          totalPages,
          pageSize: input.pageSize,
          totalItems,
        },
      };
    }),

  /**
   * Get agency team members (for dropdowns/selection)
   * Returns simplified list of organization members
   */
  getAgencyTeamMembers: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.orgId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No active organization found.",
      });
    }

    const members = await prisma.member.findMany({
      where: {
        organizationId: ctx.orgId,
      },
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
      orderBy: {
        user: {
          name: "asc",
        },
      },
    });

    return members.map((member) => ({
      userId: member.user.id,
      name: member.user.name,
      email: member.user.email,
      image: member.user.image,
      role: member.role,
    }));
  }),

  /**
   * Invite a user to join an organization (agency level)
   */
  inviteToOrganization: protectedProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email address"),
        role: z
          .enum(["owner", "admin", "manager", "staff", "viewer"])
          .optional()
          .default("viewer"),
        organizationId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = input.organizationId ?? ctx.orgId;
      if (!organizationId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization found.",
        });
      }

      // Check if user has permission to invite (must be owner or admin)
      const membership = await prisma.member.findFirst({
        where: {
          organizationId,
          userId: ctx.auth.user.id,
        },
      });

      if (!membership || !["owner", "admin"].includes(membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You don't have permission to invite users to this organization. Only Agency Owner and Agency Admin can invite members.",
        });
      }

      // Check if user is already a member
      const existingUser = await prisma.user.findUnique({
        where: { email: input.email },
        include: {
          member: {
            where: { organizationId },
          },
        },
      });

      if (existingUser && existingUser.member.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User is already a member of this organization.",
        });
      }

      // Check for existing pending invitation
      const existingInvitation = await prisma.invitation.findFirst({
        where: {
          organizationId,
          email: input.email,
          status: "pending",
        },
      });

      if (existingInvitation) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "An invitation has already been sent to this email.",
        });
      }

      // Get organization details
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found.",
        });
      }

      // Create invitation
      const invitation = await prisma.invitation.create({
        data: {
          id: crypto.randomUUID(),
          organizationId,
          email: input.email,
          role: input.role,
          status: "pending",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          inviterId: ctx.auth.user.id,
        },
      });

      // Send invitation email
      const invitationUrl = `${process.env.APP_URL}/invitation/${invitation.id}`;
      await sendInvitationEmail({
        to: input.email,
        inviterName: ctx.auth.user.name || ctx.auth.user.email,
        organizationName: organization.name,
        invitationUrl,
        role: input.role,
        isSubaccount: false,
      });

      // Send notification
      await createNotification({
        type: "INVITE_SENT",
        title: "Invitation sent",
        message: `${ctx.auth.user.name} invited ${input.email} to join ${organization.name}`,
        actorId: ctx.auth.user.id,
        entityType: "invitation",
        entityId: invitation.id,
        organizationId,
        subaccountId: null,
      });

      // Log analytics
      await logAnalytics({
        organizationId,
        subaccountId: null,
        userId: ctx.auth.user.id,
        action: ActivityAction.CREATED,
        entityType: "invitation",
        entityId: invitation.id,
        entityName: input.email,
        metadata: {
          email: input.email,
          role: input.role,
          invitationType: "organization",
        },
        posthogProperties: {
          email: input.email,
          role: input.role,
          invitation_type: "organization",
          organization_name: organization.name,
        },
      });

      return invitation;
    }),

  /**
   * Invite a user to join a subaccount (client level)
   */
  inviteToSubaccount: protectedProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email address"),
        role: z
          .enum(["AGENCY", "ADMIN", "MANAGER", "STANDARD", "LIMITED", "VIEWER"])
          .optional()
          .default("STANDARD"),
        subaccountId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const subaccountId = input.subaccountId ?? ctx.subaccountId;
      if (!subaccountId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active subaccount found.",
        });
      }

      // Get subaccount with organization
      const subaccount = await prisma.subaccount.findUnique({
        where: { id: subaccountId },
        include: {
          organization: true,
          subaccountMember: {
            where: { userId: ctx.auth.user.id },
          },
        },
      });

      if (!subaccount) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subaccount not found.",
        });
      }

      // Check if user has permission (must be agency member or subaccount admin)
      const isAgencyMember = await prisma.member.findFirst({
        where: {
          organizationId: subaccount.organizationId,
          userId: ctx.auth.user.id,
        },
      });

      const isSubaccountAdmin = subaccount.subaccountMember.some(
        (m) =>
          m.userId === ctx.auth.user.id &&
          (m.role === "ADMIN" || m.role === "AGENCY")
      );

      if (!isAgencyMember && !isSubaccountAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You don't have permission to invite users to this subaccount.",
        });
      }

      // Check if user is already a member
      const existingUser = await prisma.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        const existingMember = await prisma.subaccountMember.findFirst({
          where: {
            subaccountId,
            userId: existingUser.id,
          },
        });

        if (existingMember) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User is already a member of this subaccount.",
          });
        }
      }

      // Check for existing pending invitation
      const existingInvitation = await prisma.invitation.findFirst({
        where: {
          organizationId: subaccount.organizationId,
          email: input.email,
          status: "pending",
        },
      });

      if (existingInvitation) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "An invitation has already been sent to this email.",
        });
      }

      // Create invitation (stored at organization level but with subaccount context in role field)
      const invitation = await prisma.invitation.create({
        data: {
          id: crypto.randomUUID(),
          organizationId: subaccount.organizationId,
          email: input.email,
          role: `${input.role}:${subaccountId}`, // Encode subaccount ID in role field
          status: "pending",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          inviterId: ctx.auth.user.id,
        },
      });

      // Send invitation email
      const invitationUrl = `${process.env.APP_URL}/invitation/${invitation.id}`;
      await sendInvitationEmail({
        to: input.email,
        inviterName: ctx.auth.user.name || ctx.auth.user.email,
        organizationName: `${subaccount.companyName} (${subaccount.organization.name})`,
        invitationUrl,
        role: input.role,
        isSubaccount: true,
      });

      // Log analytics
      await logAnalytics({
        organizationId: subaccount.organizationId,
        subaccountId,
        userId: ctx.auth.user.id,
        action: ActivityAction.CREATED,
        entityType: "invitation",
        entityId: invitation.id,
        entityName: input.email,
        metadata: {
          email: input.email,
          role: input.role,
          invitationType: "subaccount",
        },
        posthogProperties: {
          email: input.email,
          role: input.role,
          invitation_type: "subaccount",
          subaccount_name: subaccount.companyName,
        },
      });

      return invitation;
    }),

  /**
   * List pending invitations for current organization
   */
  listInvitations: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.orgId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No active organization found.",
      });
    }

    const invitations = await prisma.invitation.findMany({
      where: {
        organizationId: ctx.orgId,
      },
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
      orderBy: { expiresAt: "desc" },
    });

    return invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      status: inv.status,
      expiresAt: inv.expiresAt,
      inviter: {
        id: inv.user.id,
        name: inv.user.name,
        email: inv.user.email,
        image: inv.user.image,
      },
    }));
  }),

  /**
   * Cancel/revoke an invitation
   */
  revokeInvitation: protectedProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization found.",
        });
      }

      const invitation = await prisma.invitation.findFirst({
        where: {
          id: input.invitationId,
          organizationId: ctx.orgId,
        },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found.",
        });
      }

      // Check permission
      const membership = await prisma.member.findFirst({
        where: {
          organizationId: ctx.orgId,
          userId: ctx.auth.user.id,
        },
      });

      if (!membership || !["owner", "admin"].includes(membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You don't have permission to revoke invitations. Only Agency Owner and Agency Admin can revoke invitations.",
        });
      }

      await prisma.invitation.update({
        where: { id: input.invitationId },
        data: { status: "declined" },
      });

      return { success: true };
    }),

  /**
   * Get invitation details (public endpoint for viewing invitations)
   */
  getInvitation: baseProcedure
    .input(z.object({ invitationId: z.string() }))
    .query(async ({ input }) => {
      const invitation = await prisma.invitation.findUnique({
        where: { id: input.invitationId },
        include: {
          organization: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found.",
        });
      }

      if (invitation.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invitation has already been used or declined.",
        });
      }

      if (invitation.expiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invitation has expired.",
        });
      }

      // Check if invitation is for subaccount (role contains colon)
      const isSubaccountInvite = invitation.role?.includes(":");
      let subaccount = null;

      if (isSubaccountInvite && invitation.role) {
        const [, subaccountId] = invitation.role.split(":");
        subaccount = await prisma.subaccount.findUnique({
          where: { id: subaccountId },
          select: {
            id: true,
            companyName: true,
            logo: true,
          },
        });
      }

      return {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        organization: {
          id: invitation.organization.id,
          name: invitation.organization.name,
          logo: invitation.organization.logo,
        },
        subaccount,
        inviter: {
          name: invitation.user.name,
          email: invitation.user.email,
          image: invitation.user.image,
        },
      };
    }),

  /**
   * Accept an invitation
   */
  acceptInvitation: authenticatedProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invitation = await prisma.invitation.findUnique({
        where: { id: input.invitationId },
        include: {
          organization: true,
        },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found.",
        });
      }

      if (invitation.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invitation has already been used or declined.",
        });
      }

      if (invitation.expiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invitation has expired.",
        });
      }

      // Verify email matches
      if (invitation.email !== ctx.auth.user.email) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This invitation is for a different email address.",
        });
      }

      // Check if invitation is for subaccount
      const isSubaccountInvite = invitation.role?.includes(":");

      if (isSubaccountInvite && invitation.role) {
        // Subaccount invitation
        const [role, subaccountId] = invitation.role.split(":");

        // Check if already a member
        const existingMember = await prisma.subaccountMember.findFirst({
          where: {
            subaccountId,
            userId: ctx.auth.user.id,
          },
        });

        if (existingMember) {
          // Already a member, just mark invitation as accepted
          await prisma.invitation.update({
            where: { id: input.invitationId },
            data: { status: "accepted" },
          });

          return {
            success: true,
            organizationId: invitation.organizationId,
            subaccountId,
          };
        }

        // Add user to subaccount
        await prisma.subaccountMember.create({
          data: {
            id: crypto.randomUUID(),
            subaccountId,
            userId: ctx.auth.user.id,
            role: role as
              | "AGENCY"
              | "ADMIN"
              | "MANAGER"
              | "STANDARD"
              | "LIMITED"
              | "VIEWER",
            updatedAt: new Date(),
          },
        });

        // Mark invitation as accepted
        await prisma.invitation.update({
          where: { id: input.invitationId },
          data: { status: "accepted" },
        });

        // Send notification
        await createNotification({
          type: "INVITE_ACCEPTED",
          title: "Invitation accepted",
          message: `${ctx.auth.user.name} accepted the invitation to join`,
          actorId: ctx.auth.user.id,
          entityType: "invitation",
          entityId: invitation.id,
          organizationId: invitation.organizationId,
          subaccountId,
        });

        // Log analytics
        await logAnalytics({
          organizationId: invitation.organizationId,
          subaccountId,
          userId: ctx.auth.user.id,
          action: ActivityAction.UPDATED,
          entityType: "invitation",
          entityId: invitation.id,
          entityName: ctx.auth.user.email,
          metadata: {
            status: "accepted",
            role,
            invitationType: "subaccount",
          },
          posthogProperties: {
            status: "accepted",
            role,
            invitation_type: "subaccount",
          },
        });

        return {
          success: true,
          organizationId: invitation.organizationId,
          subaccountId,
        };
      } else {
        // Organization invitation
        const existingMember = await prisma.member.findFirst({
          where: {
            organizationId: invitation.organizationId,
            userId: ctx.auth.user.id,
          },
        });

        if (existingMember) {
          // Already a member, just mark invitation as accepted
          await prisma.invitation.update({
            where: { id: input.invitationId },
            data: { status: "accepted" },
          });

          return {
            success: true,
            organizationId: invitation.organizationId,
            subaccountId: null,
          };
        }

        // Add user to organization
        await prisma.member.create({
          data: {
            id: crypto.randomUUID(),
            organizationId: invitation.organizationId,
            userId: ctx.auth.user.id,
            role: invitation.role as OrganizationMemberRole,
            createdAt: new Date(),
          },
        });

        // Mark invitation as accepted
        await prisma.invitation.update({
          where: { id: input.invitationId },
          data: { status: "accepted" },
        });

        // Send notification
        await createNotification({
          type: "INVITE_ACCEPTED",
          title: "Invitation accepted",
          message: `${ctx.auth.user.name} accepted the invitation to join ${invitation.organization.name}`,
          actorId: ctx.auth.user.id,
          entityType: "invitation",
          entityId: invitation.id,
          organizationId: invitation.organizationId,
          subaccountId: null,
        });

        // Log analytics
        await logAnalytics({
          organizationId: invitation.organizationId,
          subaccountId: null,
          userId: ctx.auth.user.id,
          action: ActivityAction.UPDATED,
          entityType: "invitation",
          entityId: invitation.id,
          entityName: ctx.auth.user.email,
          metadata: {
            status: "accepted",
            role: invitation.role,
            invitationType: "organization",
          },
          posthogProperties: {
            status: "accepted",
            role: invitation.role,
            invitation_type: "organization",
            organization_name: invitation.organization.name,
          },
        });

        return {
          success: true,
          organizationId: invitation.organizationId,
          subaccountId: null,
        };
      }
    }),

  /**
   * Update organization details (agency/workspace)
   */
  updateOrganization: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().min(2).optional(),
        logo: z.string().url().optional().nullable(),
        businessEmail: z.string().email().optional().nullable(),
        businessPhone: z.string().optional().nullable(),
        businessAddress: z
          .object({
            street: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            zip: z.string().optional(),
            country: z.string().optional(),
          })
          .optional()
          .nullable(),
        website: z.string().url().optional().nullable(),
        taxId: z.string().optional().nullable(),
        brandColor: z.string().optional().nullable(),
        accentColor: z.string().optional().nullable(),
        // Dunning settings
        dunningEnabled: z.boolean().optional(),
        dunningDays: z.array(z.number().int().positive()).optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const {
        organizationId,
        name,
        logo,
        businessEmail,
        businessPhone,
        businessAddress,
        website,
        taxId,
        brandColor,
        accentColor,
      } = input;

      // Check if user has permission (must be owner or admin)
      const member = await prisma.member.findFirst({
        where: {
          organizationId,
          userId: ctx.auth.user.id,
          role: { in: ["owner", "admin"] },
        },
      });

      if (!member) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to update this organization",
        });
      }

      // Update organization
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (logo !== undefined) updateData.logo = logo;
      if (businessEmail !== undefined) updateData.businessEmail = businessEmail;
      if (businessPhone !== undefined) updateData.businessPhone = businessPhone;
      if (businessAddress !== undefined) updateData.businessAddress = businessAddress;
      if (website !== undefined) updateData.website = website;
      if (taxId !== undefined) updateData.taxId = taxId;
      if (brandColor !== undefined) updateData.brandColor = brandColor;
      if (accentColor !== undefined) updateData.accentColor = accentColor;
      if (input.dunningEnabled !== undefined) updateData.dunningEnabled = input.dunningEnabled;
      if (input.dunningDays !== undefined) updateData.dunningDays = input.dunningDays;

      const organization = await prisma.organization.update({
        where: { id: organizationId },
        data: updateData,
      });

      return organization;
    }),

  /**
   * Update subaccount/client details
   */
  updateSubaccount: protectedProcedure
    .input(
      z.object({
        subaccountId: z.string(),
        companyName: z.string().min(2).optional(),
        logo: z.string().url().optional().nullable(),
        website: z.string().url().optional().nullable(),
        billingEmail: z.string().email().optional().nullable(),
        phone: z.string().optional().nullable(),
        addressLine1: z.string().optional().nullable(),
        addressLine2: z.string().optional().nullable(),
        city: z.string().optional().nullable(),
        state: z.string().optional().nullable(),
        postalCode: z.string().optional().nullable(),
        country: z.string().optional().nullable(),
        timezone: z.string().optional().nullable(),
        industry: z.string().optional().nullable(),
        // Branding fields
        businessEmail: z.string().email().optional().nullable(),
        businessPhone: z.string().optional().nullable(),
        taxId: z.string().optional().nullable(),
        brandColor: z.string().optional().nullable(),
        accentColor: z.string().optional().nullable(),
        // Dunning settings
        dunningEnabled: z.boolean().optional(),
        dunningDays: z.array(z.number().int().positive()).optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { subaccountId, ...updates } = input;

      // Get subaccount to check permissions
      const subaccount = await prisma.subaccount.findUnique({
        where: { id: subaccountId },
        include: {
          organization: {
            include: {
              member: {
                where: { userId: ctx.auth.user.id },
              },
            },
          },
        },
      });

      if (!subaccount) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subaccount not found",
        });
      }

      // Check if user is org member or admin
      const hasPermission =
        subaccount.organization.member.length > 0 &&
        ["owner", "admin"].includes(subaccount.organization.member[0].role);

      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to update this subaccount",
        });
      }

      // Update subaccount
      const updatedSubaccount = await prisma.subaccount.update({
        where: { id: subaccountId },
        data: {
          ...(updates.companyName !== undefined && {
            companyName: updates.companyName,
          }),
          ...(updates.logo !== undefined && { logo: updates.logo }),
          ...(updates.website !== undefined && { website: updates.website }),
          ...(updates.billingEmail !== undefined && {
            billingEmail: updates.billingEmail,
          }),
          ...(updates.phone !== undefined && { phone: updates.phone }),
          ...(updates.addressLine1 !== undefined && {
            addressLine1: updates.addressLine1,
          }),
          ...(updates.addressLine2 !== undefined && {
            addressLine2: updates.addressLine2,
          }),
          ...(updates.city !== undefined && { city: updates.city }),
          ...(updates.state !== undefined && { state: updates.state }),
          ...(updates.postalCode !== undefined && {
            postalCode: updates.postalCode,
          }),
          ...(updates.country !== undefined && { country: updates.country }),
          ...(updates.timezone !== undefined && { timezone: updates.timezone }),
          ...(updates.industry !== undefined && { industry: updates.industry }),
        },
      });

      return updatedSubaccount;
    }),

  /**
   * Get current workspace details (organization or subaccount)
   */
  getWorkspaceDetails: protectedProcedure.query(async ({ ctx }) => {
    // If subaccount is active, return subaccount details
    if (ctx.subaccountId) {
      const subaccount = await prisma.subaccount.findUnique({
        where: { id: ctx.subaccountId },
        include: {
          organization: true,
          subaccountMember: {
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
          },
        },
      });

      return {
        type: "subaccount" as const,
        data: subaccount,
      };
    }

    // Otherwise return organization details
    if (ctx.orgId) {
      const organization = await prisma.organization.findUnique({
        where: { id: ctx.orgId },
        include: {
          member: {
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
          },
        },
      });

      return {
        type: "organization" as const,
        data: organization,
      };
    }

    return null;
  }),
});

const mapSubaccountToClient = (
  subaccount: SubaccountClientPayload,
  activeSubaccountId: string | null | undefined
) => {
  const pendingInvites = (subaccount.organization.invitation || []).filter(
    (invitation) =>
      invitation.status !== "accepted" && invitation.status !== "declined"
  ).length;

  return {
    id: subaccount.organizationId,
    subaccountId: subaccount.id,
    name: subaccount.companyName || subaccount.organization.name,
    slug: subaccount.slug ?? subaccount.organization.slug,
    logo: subaccount.logo ?? subaccount.organization.logo,
    profile: {
      billingEmail: subaccount.billingEmail ?? null,
      website: subaccount.website ?? null,
      phone: subaccount.phone ?? null,
      country: subaccount.country ?? null,
      addressLine1: subaccount.addressLine1 ?? null,
      addressLine2: subaccount.addressLine2 ?? null,
      city: subaccount.city ?? null,
      state: subaccount.state ?? null,
      postalCode: subaccount.postalCode ?? null,
      timezone: subaccount.timezone ?? null,
      industry: subaccount.industry ?? null,
    },
    pendingInvites,
    isActive: activeSubaccountId === subaccount.id,
    members: buildMembers(
      subaccount.organization.member,
      subaccount.subaccountMember,
      subaccount.Workflows,
      subaccount.createdByUserId
    ),
    workflowsCount: subaccount._count.Workflows,
  };
};

const buildMembers = (
  organizationMembers: SubaccountClientPayload["organization"]["member"],
  subaccountMembers: SubaccountClientPayload["subaccountMember"],
  workflows: SubaccountClientPayload["Workflows"],
  createdByUserId?: string | null
) => {
  const workflowStats = new Map<
    string,
    {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
      workflows: number;
      lastActiveAt: string | null;
    }
  >();

  for (const workflow of workflows) {
    const user = workflow.user;
    if (!user) continue;
    const existing = workflowStats.get(user.id) ?? {
      id: user.id,
      name: user.name ?? null,
      email: user.email ?? null,
      image: user.image ?? null,
      workflows: 0,
      lastActiveAt: null,
    };
    existing.workflows += 1;
    const activityDate = workflow.updatedAt ?? workflow.createdAt;
    if (activityDate) {
      const iso = activityDate.toISOString();
      if (
        !existing.lastActiveAt ||
        Date.parse(iso) > Date.parse(existing.lastActiveAt)
      ) {
        existing.lastActiveAt = iso;
      }
    }
    workflowStats.set(user.id, existing);
  }

  const organizationMemberIds = new Set(
    organizationMembers
      .map((member) => member.user?.id)
      .filter(Boolean) as string[]
  );

  const members: Array<{
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    workflows: number;
    lastActiveAt: string | null;
    role?: string | null;
    roleKind: "agency" | "client-owner" | "member";
    roleLabel: string;
  }> = [];

  for (const membership of subaccountMembers) {
    const user = membership.user;
    if (!user) continue;
    const stats = workflowStats.get(user.id);
    workflowStats.delete(user.id);

    const normalizedRole = (membership.role ?? "MEMBER")
      .toString()
      .toUpperCase();
    const isAgencyMember = organizationMemberIds.has(user.id);
    const isClientOwner =
      !isAgencyMember &&
      createdByUserId !== null &&
      createdByUserId === user.id;

    let roleKind: "agency" | "client-owner" | "member" = "member";
    let roleLabel = "Member";

    if (isAgencyMember) {
      roleKind = "agency";
      roleLabel = "Agency member";
    } else if (isClientOwner) {
      roleKind = "client-owner";
      roleLabel = "Client owner";
    } else if (normalizedRole === "ADMIN") {
      roleLabel = "Admin";
    }

    members.push({
      id: user.id,
      name: user.name ?? null,
      email: user.email ?? null,
      image: user.image ?? null,
      workflows: stats?.workflows ?? 0,
      lastActiveAt: stats?.lastActiveAt ?? null,
      role: membership.role,
      roleKind,
      roleLabel,
    });
  }

  for (const stats of workflowStats.values()) {
    const isAgencyMember = organizationMemberIds.has(stats.id);
    const isClientOwner =
      !isAgencyMember &&
      createdByUserId !== null &&
      createdByUserId === stats.id;

    let roleKind: "agency" | "client-owner" | "member" = "member";
    let roleLabel = "Member";

    if (isAgencyMember) {
      roleKind = "agency";
      roleLabel = "Agency member";
    } else if (isClientOwner) {
      roleKind = "client-owner";
      roleLabel = "Client owner";
    }

    members.push({
      ...stats,
      role: null,
      roleKind,
      roleLabel,
    });
  }

  return members.sort((a, b) => {
    const aTime = a.lastActiveAt ? Date.parse(a.lastActiveAt) : 0;
    const bTime = b.lastActiveAt ? Date.parse(b.lastActiveAt) : 0;
    return bTime - aTime;
  });
};

const buildClientsWhere = ({
  organizationId,
  search,
  countries,
  industries,
  attention,
}: {
  organizationId: string;
  search?: string;
  countries?: string[];
  industries?: string[];
  attention?: boolean;
}): Prisma.SubaccountWhereInput => {
  const filters: Prisma.SubaccountWhereInput[] = [{ organizationId }];

  if (countries && countries.length > 0) {
    filters.push({
      country: {
        in: countries,
      },
    });
  }

  if (industries && industries.length > 0) {
    filters.push({
      industry: {
        in: industries,
      },
    });
  }

  if (search?.trim()) {
    const query = search.trim();
    filters.push({
      OR: [
        { companyName: { contains: query, mode: "insensitive" } },
        { slug: { contains: query, mode: "insensitive" } },
        { website: { contains: query, mode: "insensitive" } },
        { billingEmail: { contains: query, mode: "insensitive" } },
        { phone: { contains: query, mode: "insensitive" } },
        { country: { contains: query, mode: "insensitive" } },
        { industry: { contains: query, mode: "insensitive" } },
      ],
    });
  }

  if (attention) {
    filters.push({
      OR: [
        {
          organization: {
            invitation: {
              some: {
                status: {
                  notIn: ["accepted", "declined"],
                },
              },
            },
          },
        },
        {
          Workflows: {
            none: {},
          },
        },
      ],
    });
  }

  if (filters.length === 1) {
    return filters[0];
  }

  return {
    AND: filters,
  };
};

const fetchClientFilters = async (
  organizationId: string
): Promise<ClientFilterOptions> => {
  const [countries, industries] = await Promise.all([
    prisma.subaccount.findMany({
      where: {
        organizationId,
        country: {
          not: null,
        },
      },
      select: { country: true },
      distinct: ["country"],
    }),
    prisma.subaccount.findMany({
      where: {
        organizationId,
        industry: {
          not: null,
        },
      },
      select: { industry: true },
      distinct: ["industry"],
    }),
  ]);

  return {
    countries: countries
      .map((entry) => entry.country)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => a.localeCompare(b)),
    industries: industries
      .map((entry) => entry.industry)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => a.localeCompare(b)),
  };
};
