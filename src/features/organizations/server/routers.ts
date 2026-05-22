import type { OrganizationMemberRole } from "@/db/enums";
import { ActivityAction } from "@/db/enums";
import { TRPCError } from "@trpc/server";
import z from "zod";
import {
  eq,
  and,
  or,
  inArray,
  notInArray,
  isNotNull,
  ilike,
  sql,
  count,
  desc,
  asc,
} from "drizzle-orm";
import { db } from "@/db";
import {
  organization,
  location,
  locationMember,
  member,
  invitation,
  session as sessionTable,
  user,
  workflows,
  instructor,
} from "@/db/schema";

import {
  CLIENTS_DEFAULT_SORT,
  CLIENTS_PAGE_SIZE,
} from "@/features/organizations/clients/constants";
import { sendInvitationEmail } from "@/lib/resend";
import {
  authenticatedProcedure,
  baseProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "@/trpc/init";
import { createNotification } from "@/lib/notifications";
import { logAnalytics } from "@/lib/analytics-logger";

type ClientFilterOptions = {
  countries: string[];
  industries: string[];
};

function slugifyName(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return slug || "studio";
}

export const organizationsRouter = createTRPCRouter({
  /**
   * Create an agency (personal/main org) with extended profile.
   * Returns created organization id.
   */
  createAgency: protectedProcedure
    .input(
      z.object({
        // Org-level (step 1)
        companyName: z.string().min(2),
        logo: z.url().optional(),
        setupMode: z.enum(["scratch", "mindbody"]).default("scratch"),
        // Location-specific (step 2)
        locationName: z.string().min(2).optional(),
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
      const shouldCreateLocation = input.setupMode !== "mindbody";

      if (shouldCreateLocation && !input.locationName?.trim()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Location name is required",
        });
      }

      const slugBase = slugifyName(companyName);
      const slug = `${slugBase}-${crypto.randomUUID().slice(0, 8)}`;
      const organizationId = crypto.randomUUID();

      const locationId = shouldCreateLocation ? crypto.randomUUID() : null;
      const locationSlug = shouldCreateLocation
        ? `${slug}-main-${crypto.randomUUID().slice(0, 6)}`
        : null;
      const now = new Date();

      await db.transaction(async (tx) => {
        await tx.insert(organization).values({
          id: organizationId,
          name: companyName,
          slug,
          logo: logo || null,
          createdAt: now,
        });

        await tx.insert(member).values({
          id: crypto.randomUUID(),
          organizationId,
          userId: ctx.auth.user.id,
          role: "owner",
          createdAt: now,
        });

        if (shouldCreateLocation && locationId && locationSlug) {
          await tx.insert(location).values({
            id: locationId,
            organizationId,
            companyName: input.locationName?.trim() ?? companyName,
            logo: logo || null,
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
            slug: locationSlug,
            createdAt: now,
            updatedAt: now,
          });

          await tx.insert(locationMember).values({
            id: crypto.randomUUID(),
            locationId,
            userId: ctx.auth.user.id,
            role: "AGENCY",
            updatedAt: now,
          });
        }

        await tx
          .update(sessionTable)
          .set({
            activeOrganizationId: organizationId,
            activeLocationId: locationId,
            updatedAt: now,
          })
          .where(eq(sessionTable.token, ctx.auth.session.token));
      });

      return { organizationId, defaultLocationId: locationId };
    }),
  /**
   * Ensure the current user has a personal/main organization.
   * Returns the organization after ensuring it exists.
   */
  ensureMain: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.auth.user.id;
    const existing = await db.query.member.findFirst({
      where: eq(member.userId, userId),
      with: { organization: true },
      orderBy: asc(member.createdAt),
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

    const [org] = await db
      .insert(organization)
      .values({
        id: crypto.randomUUID(),
        name: baseName,
        slug,
        createdAt: new Date(),
      })
      .returning();

    await db.insert(member).values({
      id: crypto.randomUUID(),
      organizationId: org.id,
      userId,
      role: "owner",
      createdAt: new Date(),
    });

    // Do not create a Location for the agency itself.

    return org;
  }),
  /**
   * Return the active organization id from the session.
   */
  getActive: protectedProcedure.query(async ({ ctx }) => {
    return {
      activeOrganizationId: ctx.orgId ?? null,
      activeLocationId: ctx.locationId ?? null,
      activeLocation: ctx.location
        ? {
            id: ctx.location.id,
            companyName: ctx.location.companyName,
            logo: ctx.location.logo,
            slug: ctx.location.slug,
          }
        : null,
    };
  }),
  /**
   * Organizations where the current user is a member.
   */
  getMyOrganizations: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await db.query.member.findMany({
      where: eq(member.userId, ctx.auth.user.id),
      with: {
        organization: {
          with: {
            locations: true,
            members: {
              with: { user: true },
            },
          },
        },
      },
      orderBy: desc(member.createdAt),
    });

    return memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      logo: m.organization.logo,
      ownerName: m.organization.members[0]?.user?.name ?? null,
      ownerEmail: m.organization.members[0]?.user?.email ?? null,
      role: m.role,
      location: m.organization.locations?.[0] ?? null,
    }));
  }),
  /**
   * Toggle the active location (client) context for the current session.
   */
  setActiveLocation: protectedProcedure
    .input(
      z.object({
        locationId: z.string().min(1).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization found.",
        });
      }

      // Instructors are locked to their assigned studio location
      const instructorRecord = await db.query.instructor.findFirst({
        where: eq(instructor.userId, ctx.auth.user.id),
        columns: { locationId: true },
      });

      if (instructorRecord?.locationId) {
        if (input.locationId !== instructorRecord.locationId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Instructors can only access their assigned studio location.",
          });
        }
      }

      const sessionToken = ctx.auth.session.token;

      if (!input.locationId) {
        await db
          .update(sessionTable)
          .set({ activeLocationId: null })
          .where(eq(sessionTable.token, sessionToken));

        return {
          activeLocationId: null,
          activeLocation: null,
        };
      }

      const loc = await db.query.location.findFirst({
        where: and(
          eq(location.id, input.locationId),
          eq(location.organizationId, ctx.orgId)
        ),
      });

      if (!loc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Location not found for this organization.",
        });
      }

      await db
        .update(sessionTable)
        .set({ activeLocationId: loc.id })
        .where(eq(sessionTable.token, sessionToken));

      return {
        activeLocationId: loc.id,
        activeLocation: {
          id: loc.id,
          companyName: loc.companyName,
          logo: loc.logo,
          slug: loc.slug,
        },
      };
    }),

  /**
   * Create a location (client) under the active or provided organization.
   */
  createLocation: protectedProcedure
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

      const newLocationId = crypto.randomUUID();

      await db.insert(location).values({
        id: newLocationId,
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
      });

      await db.insert(locationMember).values({
        id: crypto.randomUUID(),
        locationId: newLocationId,
        userId: ctx.auth.user.id,
        role: "AGENCY",
        updatedAt: new Date(),
      });

      // Fetch the created location with all related data
      const sub = await fetchLocationWithClientData(newLocationId);
      return sub;
    }),

  /**
   * Organizations (clients) - visible to ALL agency members.
   * - Agency Staff sees only assigned locations
   * - All other roles see all locations in the organization
   */
  getClients: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.orgId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No active organization found.",
      });
    }

    const membership = await db.query.member.findFirst({
      where: and(
        eq(member.organizationId, ctx.orgId),
        eq(member.userId, ctx.auth.user.id)
      ),
    });

    if (!membership) {
      return [];
    }

    // Agency Staff can only see locations they are assigned to
    if (membership.role === "staff") {
      // Get location IDs user is assigned to
      const assignedMemberships = await db.query.locationMember.findMany({
        where: eq(locationMember.userId, ctx.auth.user.id),
        columns: { locationId: true },
      });
      const assignedLocationIds = assignedMemberships.map(
        (m) => m.locationId
      );

      if (assignedLocationIds.length === 0) return [];

      const locations = await db.query.location.findMany({
        where: and(
          eq(location.organizationId, ctx.orgId),
          inArray(location.id, assignedLocationIds)
        ),
        with: clientWith,
        orderBy: desc(location.createdAt),
      });

      return locations.map((loc) =>
        mapLocationToClient(loc, ctx.locationId)
      );
    }

    // All other roles (owner, admin, manager, viewer) see all locations
    const locations = await db.query.location.findMany({
      where: eq(location.organizationId, ctx.orgId),
      with: clientWith,
      orderBy: desc(location.createdAt),
    });

    return locations.map((loc) =>
      mapLocationToClient(loc, ctx.locationId)
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

      const membership = await db.query.member.findFirst({
        where: and(
          eq(member.organizationId, ctx.orgId),
          eq(member.userId, ctx.auth.user.id)
        ),
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

      // Build where conditions
      let whereConditions = buildClientsWhereConditions({
        organizationId: ctx.orgId,
        countries: input.countries,
        industries: input.industries,
        search: input.search,
      });

      // Agency Staff: only see assigned locations
      if (membership.role === "staff") {
        const assignedMemberships = await db.query.locationMember.findMany({
          where: eq(locationMember.userId, ctx.auth.user.id),
          columns: { locationId: true },
        });
        const assignedLocationIds = assignedMemberships.map(
          (m) => m.locationId
        );
        if (assignedLocationIds.length === 0) {
          return { items: [], nextCursor: null, total: 0, filters: undefined };
        }
        whereConditions = and(
          whereConditions,
          inArray(location.id, assignedLocationIds)
        );
      }

      const sortKey = input.sort ?? CLIENTS_DEFAULT_SORT;
      const orderByClause = getClientOrderBy(sortKey);

      const locations = await db.query.location.findMany({
        where: whereConditions,
        with: clientWith,
        orderBy: orderByClause,
        offset: skip,
        limit: take + 1,
      });

      const hasMore = locations.length > take;
      const items = (hasMore ? locations.slice(0, take) : locations).map(
        (loc) => mapLocationToClient(loc, ctx.locationId)
      );

      // Attention filter is harder in Drizzle relational queries,
      // so we post-filter if needed
      let filteredItems = items;
      if (input.attention) {
        filteredItems = items.filter((item) => {
          return item.pendingInvites > 0 || item.workflowsCount === 0;
        });
      }

      const [totalResult] = await db
        .select({ count: count() })
        .from(location)
        .where(whereConditions ?? sql`true`);
      const total = totalResult?.count ?? 0;

      let filters: ClientFilterOptions | undefined;
      if (!input.cursor) {
        filters = await fetchClientFilters(ctx.orgId);
      }

      return {
        items: input.attention ? filteredItems : items,
        nextCursor: hasMore ? String(skip + take) : null,
        total,
        filters,
      };
    }),

  /**
   * Upsert location profile for an organization.
   */
  upsertLocation: protectedProcedure
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

      // Check if the location already exists
      const existing = await db.query.location.findFirst({
        where: eq(location.id, organizationId),
      });

      if (existing) {
        const [updated] = await db
          .update(location)
          .set({
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
          })
          .where(eq(location.id, organizationId))
          .returning();
        return updated;
      }

      const [created] = await db
        .insert(location)
        .values({
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
        })
        .returning();

      return created;
    }),

  /**
   * List all members of the active location
   */
  listLocationMembers: protectedProcedure.query(async ({ ctx }) => {
    const locationId = ctx.locationId;
    if (!locationId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This endpoint is only available inside a client workspace.",
      });
    }

    const members = await db.query.locationMember.findMany({
      where: eq(locationMember.locationId, locationId),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: asc(locationMember.createdAt),
    });

    return members.map((m) => ({
      id: m.id,
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      image: m.user.image,
      role: m.role,
      createdAt: m.createdAt,
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
        // Location roles: AGENCY, ADMIN, MANAGER, STANDARD, LIMITED, VIEWER
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

      const isLocationContext = !!ctx.locationId;

      let items: Array<{
        id: string;
        userId: string;
        name: string;
        email: string;
        image: string | null;
        role: string;
        agencyRole?: string | null;
        status: string;
        statusMessage: string | null;
        isOnline: boolean;
        lastActivityAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        memberType: "organization" | "location";
      }> = [];
      let totalItems = 0;

      if (isLocationContext) {
        // Fetch all location members with user data
        const allLocationMembers = await db.query.locationMember.findMany({
          where: eq(locationMember.locationId, ctx.locationId!),
          with: {
            user: {
              columns: {
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
          orderBy: asc(locationMember.createdAt),
        });

        // Apply filters in-memory for search, roles, status
        let filtered = allLocationMembers;

        if (input.search) {
          const searchLower = input.search.toLowerCase();
          filtered = filtered.filter(
            (m) =>
              m.user.name?.toLowerCase().includes(searchLower) ||
              m.user.email?.toLowerCase().includes(searchLower)
          );
        }

        if (input.roles && input.roles.length > 0) {
          filtered = filtered.filter((m) =>
            input.roles!.some((role) => role === m.role)
          );
        }

        if (input.status && input.status.length > 0) {
          filtered = filtered.filter((m) =>
            input.status!.some((status) => status === m.user.status)
          );
        }

        // Sort
        const sortKey = input.sort || "name.asc";
        const [sortField, sortDir] = sortKey.split(".");
        filtered.sort((a, b) => {
          let cmp = 0;
          if (sortField === "name") {
            cmp = (a.user.name ?? "").localeCompare(b.user.name ?? "");
          } else if (sortField === "email") {
            cmp = (a.user.email ?? "").localeCompare(b.user.email ?? "");
          } else if (sortField === "role") {
            cmp = (a.role ?? "").localeCompare(b.role ?? "");
          } else if (sortField === "createdAt") {
            cmp =
              (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0);
          } else {
            cmp = (a.user.name ?? "").localeCompare(b.user.name ?? "");
          }
          return sortDir === "desc" ? -cmp : cmp;
        });

        totalItems = filtered.length;

        // Paginate
        const paginated = filtered.slice(
          (input.page - 1) * input.pageSize,
          input.page * input.pageSize
        );

        // Get activity tracking from sessions
        const userIds = paginated.map((m) => m.user.id);
        let sessionMap = new Map<
          string,
          { lastActivityAt: Date | null; isOnline: boolean }
        >();

        if (userIds.length > 0) {
          const sessions = await db.query.session.findMany({
            where: and(
              inArray(sessionTable.userId, userIds),
              eq(sessionTable.activeLocationId, ctx.locationId!)
            ),
            orderBy: desc(sessionTable.lastActivityAt),
          });

          // De-duplicate by userId (first per user = most recent)
          for (const s of sessions) {
            if (!sessionMap.has(s.userId)) {
              sessionMap.set(s.userId, {
                lastActivityAt: s.lastActivityAt,
                isOnline: s.isOnline,
              });
            }
          }
        }

        // Get location's organization to check for agency team members
        const loc = await db.query.location.findFirst({
          where: eq(location.id, ctx.locationId!),
          columns: { organizationId: true },
        });

        // Check which users are also organization members (agency team)
        let orgMemberMap = new Map<string, string>();
        if (loc && userIds.length > 0) {
          const orgMembers = await db.query.member.findMany({
            where: and(
              eq(member.organizationId, loc.organizationId),
              inArray(member.userId, userIds)
            ),
            columns: {
              userId: true,
              role: true,
            },
          });
          orgMemberMap = new Map(orgMembers.map((m) => [m.userId, m.role]));
        }

        items = paginated.map((m) => {
          const sessionData = sessionMap.get(m.user.id);
          const agencyRole = orgMemberMap.get(m.user.id);
          return {
            id: m.id,
            userId: m.user.id,
            name: m.user.name,
            email: m.user.email,
            image: m.user.image,
            role: m.role,
            agencyRole: agencyRole || null, // Agency team indicator
            status: m.user.status,
            statusMessage: m.user.statusMessage ?? null,
            isOnline: sessionData?.isOnline ?? false,
            lastActivityAt: sessionData?.lastActivityAt ?? m.createdAt,
            createdAt: m.createdAt,
            updatedAt: m.updatedAt,
            memberType: "location" as const,
          };
        });
      } else {
        // Fetch all org members with user data
        const allOrgMembers = await db.query.member.findMany({
          where: eq(member.organizationId, ctx.orgId),
          with: {
            user: {
              columns: {
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
          orderBy: asc(member.createdAt),
        });

        // Apply filters in-memory for search, roles, status
        let filtered = allOrgMembers;

        if (input.search) {
          const searchLower = input.search.toLowerCase();
          filtered = filtered.filter(
            (m) =>
              m.user.name?.toLowerCase().includes(searchLower) ||
              m.user.email?.toLowerCase().includes(searchLower)
          );
        }

        if (input.roles && input.roles.length > 0) {
          filtered = filtered.filter((m) =>
            input.roles!.some((role) => role === m.role)
          );
        }

        if (input.status && input.status.length > 0) {
          filtered = filtered.filter((m) =>
            input.status!.some((status) => status === m.user.status)
          );
        }

        // Sort
        const sortKey = input.sort || "name.asc";
        const [sortField, sortDir] = sortKey.split(".");
        filtered.sort((a, b) => {
          let cmp = 0;
          if (sortField === "name") {
            cmp = (a.user.name ?? "").localeCompare(b.user.name ?? "");
          } else if (sortField === "email") {
            cmp = (a.user.email ?? "").localeCompare(b.user.email ?? "");
          } else if (sortField === "role") {
            cmp = (a.role ?? "").localeCompare(b.role ?? "");
          } else if (sortField === "createdAt") {
            cmp =
              (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0);
          } else {
            cmp = (a.user.name ?? "").localeCompare(b.user.name ?? "");
          }
          return sortDir === "desc" ? -cmp : cmp;
        });

        totalItems = filtered.length;

        // Paginate
        const paginated = filtered.slice(
          (input.page - 1) * input.pageSize,
          input.page * input.pageSize
        );

        // Get activity tracking from sessions
        const userIds = paginated.map((m) => m.user.id);
        let sessionMap = new Map<
          string,
          { lastActivityAt: Date | null; isOnline: boolean }
        >();

        if (userIds.length > 0) {
          const sessions = await db.query.session.findMany({
            where: and(
              inArray(sessionTable.userId, userIds),
              eq(sessionTable.activeOrganizationId, ctx.orgId)
            ),
            orderBy: desc(sessionTable.lastActivityAt),
          });

          for (const s of sessions) {
            if (!sessionMap.has(s.userId)) {
              sessionMap.set(s.userId, {
                lastActivityAt: s.lastActivityAt,
                isOnline: s.isOnline,
              });
            }
          }
        }

        items = paginated.map((m) => {
          const sessionData = sessionMap.get(m.user.id);
          return {
            id: m.id,
            userId: m.user.id,
            name: m.user.name,
            email: m.user.email,
            image: m.user.image,
            role: m.role,
            status: m.user.status,
            statusMessage: m.user.statusMessage ?? null,
            isOnline: sessionData?.isOnline ?? false,
            lastActivityAt: sessionData?.lastActivityAt ?? m.createdAt,
            createdAt: m.createdAt,
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

  updateMemberRole: protectedProcedure
    .input(
      z.object({
        memberType: z.enum(["organization", "location"]),
        memberId: z.string(),
        role: z.union([
          z.enum(["owner", "admin", "manager", "staff", "viewer"]),
          z.enum(["AGENCY", "ADMIN", "MANAGER", "STANDARD", "LIMITED", "VIEWER"]),
        ]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      const locationId = ctx.locationId;
      const organizationRoles = ["owner", "admin", "manager", "staff", "viewer"];
      const locationRoles = [
        "AGENCY",
        "ADMIN",
        "MANAGER",
        "STANDARD",
        "LIMITED",
        "VIEWER",
      ];

      if (!orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization context required to update member roles",
        });
      }

      const isOrgAdmin = await db.query.member.findFirst({
        where: and(
          eq(member.organizationId, orgId),
          eq(member.userId, ctx.auth.user.id),
          inArray(member.role, ["owner", "admin"])
        ),
      });

      if (!isOrgAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to update member roles",
        });
      }

      if (input.memberType === "organization") {
        if (!organizationRoles.includes(input.role)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid role for organization member",
          });
        }

        const memberRecord = await db.query.member.findFirst({
          where: and(
            eq(member.id, input.memberId),
            eq(member.organizationId, orgId)
          ),
          with: { user: true },
        });

        if (!memberRecord) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Member not found",
          });
        }

        if (memberRecord.role === input.role) {
          return { success: true };
        }

        await db
          .update(member)
          .set({
            role: input.role as "owner" | "admin" | "manager" | "staff" | "viewer",
          })
          .where(eq(member.id, memberRecord.id));

        await createNotification({
          type: "MEMBER_ROLE_CHANGED",
          title: "Member role updated",
          message: `${ctx.auth.user.name} changed ${memberRecord.user.name}'s role to ${input.role}`,
          actorId: ctx.auth.user.id,
          entityType: "organization",
          entityId: orgId,
          organizationId: orgId,
          locationId: null,
          data: {
            memberId: memberRecord.id,
            userId: memberRecord.userId,
            previousRole: memberRecord.role,
            newRole: input.role,
          },
        });

        await logAnalytics({
          organizationId: orgId,
          locationId: null,
          userId: ctx.auth.user.id,
          action: ActivityAction.UPDATED,
          entityType: "organization",
          entityId: orgId,
          entityName: "Organization member role",
          metadata: {
            memberId: memberRecord.id,
            userId: memberRecord.userId,
            previousRole: memberRecord.role,
            newRole: input.role,
          },
        });

        return { success: true };
      }

      if (!locationId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Location context required to update member roles",
        });
      }

      if (!locationRoles.includes(input.role)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid role for location member",
        });
      }

      const locMember = await db.query.locationMember.findFirst({
        where: and(
          eq(locationMember.id, input.memberId),
          eq(locationMember.locationId, locationId)
        ),
        with: { user: true },
      });

      if (!locMember) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member not found",
        });
      }

      if (locMember.role === input.role) {
        return { success: true };
      }

      await db
        .update(locationMember)
        .set({
          role: input.role as
            | "AGENCY"
            | "ADMIN"
            | "MANAGER"
            | "STANDARD"
            | "LIMITED"
            | "VIEWER",
          updatedAt: new Date(),
        })
        .where(eq(locationMember.id, locMember.id));

      await createNotification({
        type: "MEMBER_ROLE_CHANGED",
        title: "Member role updated",
        message: `${ctx.auth.user.name} changed ${locMember.user.name}'s role to ${input.role}`,
        actorId: ctx.auth.user.id,
        entityType: "location",
        entityId: locationId,
        organizationId: orgId,
        locationId,
        data: {
          memberId: locMember.id,
          userId: locMember.userId,
          previousRole: locMember.role,
          newRole: input.role,
        },
      });

      await logAnalytics({
        organizationId: orgId,
        locationId,
        userId: ctx.auth.user.id,
        action: ActivityAction.UPDATED,
        entityType: "location",
        entityId: locationId,
        entityName: "Location member role",
        metadata: {
          memberId: locMember.id,
          userId: locMember.userId,
          previousRole: locMember.role,
          newRole: input.role,
        },
      });

      return { success: true };
    }),

  removeMember: protectedProcedure
    .input(
      z.object({
        memberType: z.enum(["organization", "location"]),
        memberId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      const locationId = ctx.locationId;

      if (!orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization context required to remove members",
        });
      }

      const isOrgAdmin = await db.query.member.findFirst({
        where: and(
          eq(member.organizationId, orgId),
          eq(member.userId, ctx.auth.user.id),
          inArray(member.role, ["owner", "admin"])
        ),
      });

      if (!isOrgAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to remove members",
        });
      }

      if (input.memberType === "organization") {
        const memberRecord = await db.query.member.findFirst({
          where: and(
            eq(member.id, input.memberId),
            eq(member.organizationId, orgId)
          ),
          with: { user: true },
        });

        if (!memberRecord) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Member not found",
          });
        }

        await db.delete(member).where(eq(member.id, memberRecord.id));

        await createNotification({
          type: "MEMBER_REMOVED",
          title: "Member removed",
          message: `${ctx.auth.user.name} removed ${memberRecord.user.name} from the organization`,
          actorId: ctx.auth.user.id,
          entityType: "organization",
          entityId: orgId,
          organizationId: orgId,
          locationId: null,
          data: {
            memberId: memberRecord.id,
            userId: memberRecord.userId,
            role: memberRecord.role,
          },
        });

        await logAnalytics({
          organizationId: orgId,
          locationId: null,
          userId: ctx.auth.user.id,
          action: ActivityAction.DELETED,
          entityType: "organization",
          entityId: orgId,
          entityName: "Organization member removed",
          metadata: {
            memberId: memberRecord.id,
            userId: memberRecord.userId,
            role: memberRecord.role,
          },
        });

        return { success: true };
      }

      if (!locationId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Location context required to remove members",
        });
      }

      const locMember = await db.query.locationMember.findFirst({
        where: and(
          eq(locationMember.id, input.memberId),
          eq(locationMember.locationId, locationId)
        ),
        with: { user: true },
      });

      if (!locMember) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member not found",
        });
      }

      await db
        .delete(locationMember)
        .where(eq(locationMember.id, locMember.id));

      await createNotification({
        type: "MEMBER_REMOVED",
        title: "Member removed",
        message: `${ctx.auth.user.name} removed ${locMember.user.name} from the location`,
        actorId: ctx.auth.user.id,
        entityType: "location",
        entityId: locationId,
        organizationId: orgId,
        locationId,
        data: {
          memberId: locMember.id,
          userId: locMember.userId,
          role: locMember.role,
        },
      });

      await logAnalytics({
        organizationId: orgId,
        locationId,
        userId: ctx.auth.user.id,
        action: ActivityAction.DELETED,
        entityType: "location",
        entityId: locationId,
        entityName: "Location member removed",
        metadata: {
          memberId: locMember.id,
          userId: locMember.userId,
          role: locMember.role,
        },
      });

      return { success: true };
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

    const members = await db.query.member.findMany({
      where: eq(member.organizationId, ctx.orgId),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    // Sort by user name in application code since Drizzle relational queries
    // don't support ordering by nested relation fields
    const sorted = members.sort((a, b) =>
      (a.user.name ?? "").localeCompare(b.user.name ?? "")
    );

    return sorted.map((m) => ({
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      image: m.user.image,
      role: m.role,
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
      const membership = await db.query.member.findFirst({
        where: and(
          eq(member.organizationId, organizationId),
          eq(member.userId, ctx.auth.user.id)
        ),
      });

      if (!membership || !["owner", "admin"].includes(membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You don't have permission to invite users to this organization. Only Agency Owner and Agency Admin can invite members.",
        });
      }

      // Check if user is already a member
      const existingUser = await db.query.user.findFirst({
        where: eq(user.email, input.email),
      });

      if (existingUser) {
        const existingMembership = await db.query.member.findFirst({
          where: and(
            eq(member.organizationId, organizationId),
            eq(member.userId, existingUser.id)
          ),
        });

        if (existingMembership) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User is already a member of this organization.",
          });
        }
      }

      // Check for existing pending invitation
      const existingInvitation = await db.query.invitation.findFirst({
        where: and(
          eq(invitation.organizationId, organizationId),
          eq(invitation.email, input.email),
          eq(invitation.status, "pending")
        ),
      });

      if (existingInvitation) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "An invitation has already been sent to this email.",
        });
      }

      // Get organization details
      const org = await db.query.organization.findFirst({
        where: eq(organization.id, organizationId),
      });

      if (!org) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found.",
        });
      }

      // Create invitation
      const [inv] = await db
        .insert(invitation)
        .values({
          id: crypto.randomUUID(),
          organizationId,
          email: input.email,
          role: input.role,
          status: "pending",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          inviterId: ctx.auth.user.id,
        })
        .returning();

      // Send invitation email
      const invitationUrl = `${process.env.APP_URL}/invitation/${inv.id}`;
      await sendInvitationEmail({
        to: input.email,
        inviterName: ctx.auth.user.name || ctx.auth.user.email,
        organizationName: org.name,
        invitationUrl,
        role: input.role,
        isLocation: false,
      });

      // Send notification
      await createNotification({
        type: "INVITE_SENT",
        title: "Invitation sent",
        message: `${ctx.auth.user.name} invited ${input.email} to join ${org.name}`,
        actorId: ctx.auth.user.id,
        entityType: "invitation",
        entityId: inv.id,
        organizationId,
        locationId: null,
      });

      // Log analytics
      await logAnalytics({
        organizationId,
        locationId: null,
        userId: ctx.auth.user.id,
        action: ActivityAction.CREATED,
        entityType: "invitation",
        entityId: inv.id,
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
          organization_name: org.name,
        },
      });

      return inv;
    }),

  /**
   * Invite a user to join a location (client level)
   */
  inviteToLocation: protectedProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email address"),
        role: z
          .enum(["AGENCY", "ADMIN", "MANAGER", "STANDARD", "LIMITED", "VIEWER"])
          .optional()
          .default("STANDARD"),
        locationId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const locationId = input.locationId ?? ctx.locationId;
      if (!locationId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active location found.",
        });
      }

      // Get location with organization and current user's location membership
      const loc = await db.query.location.findFirst({
        where: eq(location.id, locationId),
        with: {
          organization: true,
          locationMembers: {
            where: eq(locationMember.userId, ctx.auth.user.id),
          },
        },
      });

      if (!loc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Location not found.",
        });
      }

      // Check if user has permission (must be agency member or location admin)
      const isAgencyMember = await db.query.member.findFirst({
        where: and(
          eq(member.organizationId, loc.organizationId),
          eq(member.userId, ctx.auth.user.id)
        ),
      });

      const isLocationAdmin = loc.locationMembers.some(
        (m) =>
          m.userId === ctx.auth.user.id &&
          (m.role === "ADMIN" || m.role === "AGENCY")
      );

      if (!isAgencyMember && !isLocationAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You don't have permission to invite users to this location.",
        });
      }

      // Check if user is already a member
      const existingUser = await db.query.user.findFirst({
        where: eq(user.email, input.email),
      });

      if (existingUser) {
        const existingMember = await db.query.locationMember.findFirst({
          where: and(
            eq(locationMember.locationId, locationId),
            eq(locationMember.userId, existingUser.id)
          ),
        });

        if (existingMember) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User is already a member of this location.",
          });
        }
      }

      // Check for existing pending invitation
      const existingInvitation = await db.query.invitation.findFirst({
        where: and(
          eq(invitation.organizationId, loc.organizationId),
          eq(invitation.email, input.email),
          eq(invitation.status, "pending")
        ),
      });

      if (existingInvitation) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "An invitation has already been sent to this email.",
        });
      }

      // Create invitation (stored at organization level but with location context in role field)
      const [inv] = await db
        .insert(invitation)
        .values({
          id: crypto.randomUUID(),
          organizationId: loc.organizationId,
          email: input.email,
          role: `${input.role}:${locationId}`, // Encode location ID in role field
          status: "pending",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          inviterId: ctx.auth.user.id,
        })
        .returning();

      // Send invitation email
      const invitationUrl = `${process.env.APP_URL}/invitation/${inv.id}`;
      await sendInvitationEmail({
        to: input.email,
        inviterName: ctx.auth.user.name || ctx.auth.user.email,
        organizationName: `${loc.companyName} (${loc.organization.name})`,
        invitationUrl,
        role: input.role,
        isLocation: true,
      });

      await createNotification({
        type: "INVITE_SENT",
        title: "Invitation sent",
        message: `${ctx.auth.user.name} invited ${input.email} to join ${loc.companyName}`,
        actorId: ctx.auth.user.id,
        entityType: "invitation",
        entityId: inv.id,
        organizationId: loc.organizationId,
        locationId,
      });

      // Log analytics
      await logAnalytics({
        organizationId: loc.organizationId,
        locationId,
        userId: ctx.auth.user.id,
        action: ActivityAction.CREATED,
        entityType: "invitation",
        entityId: inv.id,
        entityName: input.email,
        metadata: {
          email: input.email,
          role: input.role,
          invitationType: "location",
        },
        posthogProperties: {
          email: input.email,
          role: input.role,
          invitation_type: "location",
          location_name: loc.companyName,
        },
      });

      return inv;
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

    const invitations = await db.query.invitation.findMany({
      where: eq(invitation.organizationId, ctx.orgId),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: desc(invitation.expiresAt),
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

      const inv = await db.query.invitation.findFirst({
        where: and(
          eq(invitation.id, input.invitationId),
          eq(invitation.organizationId, ctx.orgId)
        ),
      });

      if (!inv) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found.",
        });
      }

      // Check permission
      const membership = await db.query.member.findFirst({
        where: and(
          eq(member.organizationId, ctx.orgId),
          eq(member.userId, ctx.auth.user.id)
        ),
      });

      if (!membership || !["owner", "admin"].includes(membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You don't have permission to revoke invitations. Only Agency Owner and Agency Admin can revoke invitations.",
        });
      }

      await db
        .update(invitation)
        .set({ status: "declined" })
        .where(eq(invitation.id, input.invitationId));

      await createNotification({
        type: "INVITE_DECLINED",
        title: "Invitation revoked",
        message: `${ctx.auth.user.name} revoked an invitation`,
        actorId: ctx.auth.user.id,
        entityType: "invitation",
        entityId: inv.id,
        organizationId: inv.organizationId,
        locationId: inv.role?.includes(":")
          ? inv.role.split(":")[1]
          : null,
      });

      return { success: true };
    }),

  /**
   * Get invitation details (public endpoint for viewing invitations)
   */
  getInvitation: baseProcedure
    .input(z.object({ invitationId: z.string() }))
    .query(async ({ input }) => {
      const inv = await db.query.invitation.findFirst({
        where: eq(invitation.id, input.invitationId),
        with: {
          organization: true,
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });

      if (!inv) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found.",
        });
      }

      if (inv.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invitation has already been used or declined.",
        });
      }

      if (inv.expiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invitation has expired.",
        });
      }

      // Check if invitation is for location (role contains colon)
      const isLocationInvite = inv.role?.includes(":");
      let loc = null;

      if (isLocationInvite && inv.role) {
        const [, locationId] = inv.role.split(":");
        loc = await db.query.location.findFirst({
          where: eq(location.id, locationId),
          columns: {
            id: true,
            companyName: true,
            logo: true,
          },
        });
      }

      return {
        id: inv.id,
        email: inv.email,
        role: inv.role,
        status: inv.status,
        expiresAt: inv.expiresAt,
        organization: {
          id: inv.organization.id,
          name: inv.organization.name,
          logo: inv.organization.logo,
        },
        location: loc,
        inviter: {
          name: inv.user.name,
          email: inv.user.email,
          image: inv.user.image,
        },
      };
    }),

  /**
   * Accept an invitation
   */
  acceptInvitation: authenticatedProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const inv = await db.query.invitation.findFirst({
        where: eq(invitation.id, input.invitationId),
        with: {
          organization: true,
        },
      });

      if (!inv) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found.",
        });
      }

      if (inv.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invitation has already been used or declined.",
        });
      }

      if (inv.expiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invitation has expired.",
        });
      }

      // Verify email matches
      if (inv.email !== ctx.auth.user.email) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This invitation is for a different email address.",
        });
      }

      // Check if invitation is for location
      const isLocationInvite = inv.role?.includes(":");

      if (isLocationInvite && inv.role) {
        // Location invitation
        const [role, locationId] = inv.role.split(":");

        // Check if already a member
        const existingMember = await db.query.locationMember.findFirst({
          where: and(
            eq(locationMember.locationId, locationId),
            eq(locationMember.userId, ctx.auth.user.id)
          ),
        });

        if (existingMember) {
          // Already a member, just mark invitation as accepted
          await db
            .update(invitation)
            .set({ status: "accepted" })
            .where(eq(invitation.id, input.invitationId));

          return {
            success: true,
            organizationId: inv.organizationId,
            locationId,
          };
        }

        // Add user to location
        await db.insert(locationMember).values({
          id: crypto.randomUUID(),
          locationId,
          userId: ctx.auth.user.id,
          role: role as
            | "AGENCY"
            | "ADMIN"
            | "MANAGER"
            | "STANDARD"
            | "LIMITED"
            | "VIEWER",
          updatedAt: new Date(),
        });

        // Mark invitation as accepted
        await db
          .update(invitation)
          .set({ status: "accepted" })
          .where(eq(invitation.id, input.invitationId));

        // Send notification
        await createNotification({
          type: "INVITE_ACCEPTED",
          title: "Invitation accepted",
          message: `${ctx.auth.user.name} accepted the invitation to join`,
          actorId: ctx.auth.user.id,
          entityType: "invitation",
          entityId: inv.id,
          organizationId: inv.organizationId,
          locationId,
        });

        // Log analytics
        await logAnalytics({
          organizationId: inv.organizationId,
          locationId,
          userId: ctx.auth.user.id,
          action: ActivityAction.UPDATED,
          entityType: "invitation",
          entityId: inv.id,
          entityName: ctx.auth.user.email,
          metadata: {
            status: "accepted",
            role,
            invitationType: "location",
          },
          posthogProperties: {
            status: "accepted",
            role,
            invitation_type: "location",
          },
        });

        return {
          success: true,
          organizationId: inv.organizationId,
          locationId,
        };
      } else {
        // Organization invitation
        const existingMember = await db.query.member.findFirst({
          where: and(
            eq(member.organizationId, inv.organizationId),
            eq(member.userId, ctx.auth.user.id)
          ),
        });

        if (existingMember) {
          // Already a member, just mark invitation as accepted
          await db
            .update(invitation)
            .set({ status: "accepted" })
            .where(eq(invitation.id, input.invitationId));

          return {
            success: true,
            organizationId: inv.organizationId,
            locationId: null,
          };
        }

        // Add user to organization
        await db.insert(member).values({
          id: crypto.randomUUID(),
          organizationId: inv.organizationId,
          userId: ctx.auth.user.id,
          role: inv.role as OrganizationMemberRole,
          createdAt: new Date(),
        });

        // Mark invitation as accepted
        await db
          .update(invitation)
          .set({ status: "accepted" })
          .where(eq(invitation.id, input.invitationId));

        // Send notification
        await createNotification({
          type: "INVITE_ACCEPTED",
          title: "Invitation accepted",
          message: `${ctx.auth.user.name} accepted the invitation to join ${inv.organization.name}`,
          actorId: ctx.auth.user.id,
          entityType: "invitation",
          entityId: inv.id,
          organizationId: inv.organizationId,
          locationId: null,
        });

        // Log analytics
        await logAnalytics({
          organizationId: inv.organizationId,
          locationId: null,
          userId: ctx.auth.user.id,
          action: ActivityAction.UPDATED,
          entityType: "invitation",
          entityId: inv.id,
          entityName: ctx.auth.user.email,
          metadata: {
            status: "accepted",
            role: inv.role,
            invitationType: "organization",
          },
          posthogProperties: {
            status: "accepted",
            role: inv.role,
            invitation_type: "organization",
            organization_name: inv.organization.name,
          },
        });

        return {
          success: true,
          organizationId: inv.organizationId,
          locationId: null,
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
      const memberRecord = await db.query.member.findFirst({
        where: and(
          eq(member.organizationId, organizationId),
          eq(member.userId, ctx.auth.user.id),
          inArray(member.role, ["owner", "admin"])
        ),
      });

      if (!memberRecord) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to update this organization",
        });
      }

      // Update organization
      const updateData: Record<string, unknown> = {};
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

      const [org] = await db
        .update(organization)
        .set(updateData)
        .where(eq(organization.id, organizationId))
        .returning();

      return org;
    }),

  /**
   * Update location/client details
   */
  updateLocation: protectedProcedure
    .input(
      z.object({
        locationId: z.string(),
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
      const { locationId: locId, ...updates } = input;

      // Get location to check permissions
      const loc = await db.query.location.findFirst({
        where: eq(location.id, locId),
        with: {
          organization: {
            with: {
              members: {
                where: eq(member.userId, ctx.auth.user.id),
              },
            },
          },
        },
      });

      if (!loc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Location not found",
        });
      }

      // Check if user is org member or admin
      const hasPermission =
        loc.organization.members.length > 0 &&
        ["owner", "admin"].includes(loc.organization.members[0].role);

      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to update this location",
        });
      }

      // Update location
      const [updatedLocation] = await db
        .update(location)
        .set({
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
        })
        .where(eq(location.id, locId))
        .returning();

      return updatedLocation;
    }),

  /**
   * Get current workspace details (organization or location)
   */
  getWorkspaceDetails: protectedProcedure.query(async ({ ctx }) => {
    // If location is active, return location details
    if (ctx.locationId) {
      const loc = await db.query.location.findFirst({
        where: eq(location.id, ctx.locationId),
        with: {
          organization: true,
          locationMembers: {
            with: {
              user: {
                columns: {
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
        type: "location" as const,
        data: loc,
      };
    }

    // Otherwise return organization details
    if (ctx.orgId) {
      const org = await db.query.organization.findFirst({
        where: eq(organization.id, ctx.orgId),
        with: {
          members: {
            with: {
              user: {
                columns: {
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
        data: org,
      };
    }

    return null;
  }),
});

// ── Shared "with" clause for location client queries ──────────────────────────

const clientWith = {
  organization: {
    with: {
      invitations: true,
      members: {
        with: {
          user: {
            columns: {
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
  locationMembers: {
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  },
  workflows: {
    columns: {
      id: true,
      createdAt: true,
      updatedAt: true,
    },
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  },
} as const;

/** Fetch a single location with all the client-card data. */
async function fetchLocationWithClientData(locationId: string) {
  return db.query.location.findFirst({
    where: eq(location.id, locationId),
    with: clientWith,
  });
}

type LocationWithClientData = NonNullable<
  Awaited<ReturnType<typeof fetchLocationWithClientData>>
>;

const mapLocationToClient = (
  loc: LocationWithClientData,
  activeLocationId: string | null | undefined
) => {
  const pendingInvites = (loc.organization.invitations || []).filter(
    (inv) => inv.status !== "accepted" && inv.status !== "declined"
  ).length;

  return {
    id: loc.organizationId,
    locationId: loc.id,
    name: loc.companyName || loc.organization.name,
    slug: loc.slug ?? loc.organization.slug,
    logo: loc.logo ?? loc.organization.logo,
    profile: {
      billingEmail: loc.billingEmail ?? null,
      website: loc.website ?? null,
      phone: loc.phone ?? null,
      country: loc.country ?? null,
      addressLine1: loc.addressLine1 ?? null,
      addressLine2: loc.addressLine2 ?? null,
      city: loc.city ?? null,
      state: loc.state ?? null,
      postalCode: loc.postalCode ?? null,
      timezone: loc.timezone ?? null,
      industry: loc.industry ?? null,
    },
    pendingInvites,
    isActive: activeLocationId === loc.id,
    members: buildMembers(
      loc.organization.members,
      loc.locationMembers,
      loc.workflows,
      loc.createdByUserId
    ),
    workflowsCount: loc.workflows.length,
  };
};

const buildMembers = (
  organizationMembers: LocationWithClientData["organization"]["members"],
  locationMembers: LocationWithClientData["locationMembers"],
  wfs: LocationWithClientData["workflows"],
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

  for (const workflow of wfs) {
    const u = workflow.user;
    if (!u) continue;
    const existing = workflowStats.get(u.id) ?? {
      id: u.id,
      name: u.name ?? null,
      email: u.email ?? null,
      image: u.image ?? null,
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
    workflowStats.set(u.id, existing);
  }

  const organizationMemberIds = new Set(
    organizationMembers
      .map((m) => m.user?.id)
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

  for (const membership of locationMembers) {
    const u = membership.user;
    if (!u) continue;
    const stats = workflowStats.get(u.id);
    workflowStats.delete(u.id);

    const normalizedRole = (membership.role ?? "MEMBER")
      .toString()
      .toUpperCase();
    const isAgencyMember = organizationMemberIds.has(u.id);
    const isClientOwner =
      !isAgencyMember &&
      createdByUserId !== null &&
      createdByUserId === u.id;

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
      id: u.id,
      name: u.name ?? null,
      email: u.email ?? null,
      image: u.image ?? null,
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

// ── Drizzle where-clause helpers ──────────────────────────────────────────────

const buildClientsWhereConditions = ({
  organizationId,
  search,
  countries,
  industries,
}: {
  organizationId: string;
  search?: string;
  countries?: string[];
  industries?: string[];
}) => {
  const conditions = [eq(location.organizationId, organizationId)];

  if (countries && countries.length > 0) {
    conditions.push(inArray(location.country, countries));
  }

  if (industries && industries.length > 0) {
    conditions.push(inArray(location.industry, industries));
  }

  if (search?.trim()) {
    const query = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(location.companyName, query),
        ilike(location.slug, query),
        ilike(location.website, query),
        ilike(location.billingEmail, query),
        ilike(location.phone, query),
        ilike(location.country, query),
        ilike(location.industry, query)
      )!
    );
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return and(...conditions);
};

/** Map sort key strings to Drizzle orderBy expressions for location queries. */
const getClientOrderBy = (sortKey: string) => {
  switch (sortKey) {
    case "company.asc":
      return [asc(location.companyName), desc(location.createdAt)];
    case "company.desc":
      return [desc(location.companyName), desc(location.createdAt)];
    case "country.asc":
      return [asc(location.country), asc(location.companyName)];
    case "country.desc":
      return [desc(location.country), asc(location.companyName)];
    case "createdAt.asc":
      return [asc(location.createdAt)];
    case "createdAt.desc":
      return [desc(location.createdAt)];
    // workflowsCount sort requires a subquery; fall back to createdAt desc
    case "workflowsCount.desc":
    case "workflowsCount.asc":
    default:
      return [desc(location.createdAt)];
  }
};

const fetchClientFilters = async (
  organizationId: string
): Promise<ClientFilterOptions> => {
  const [countriesResult, industriesResult] = await Promise.all([
    db
      .selectDistinct({ country: location.country })
      .from(location)
      .where(
        and(
          eq(location.organizationId, organizationId),
          isNotNull(location.country)
        )
      ),
    db
      .selectDistinct({ industry: location.industry })
      .from(location)
      .where(
        and(
          eq(location.organizationId, organizationId),
          isNotNull(location.industry)
        )
      ),
  ]);

  return {
    countries: countriesResult
      .map((entry) => entry.country)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => a.localeCompare(b)),
    industries: industriesResult
      .map((entry) => entry.industry)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => a.localeCompare(b)),
  };
};
