import { TRPCError } from "@trpc/server";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  type SQL,
} from "drizzle-orm";
import { z } from "zod";
import { ActivityAction, ActivityType } from "@/db/enums";
import { db } from "@/db";
import { studioStaffMember } from "@/db/schema";
import {
  STAFF_ROLE_VALUES,
  STAFF_TYPE_VALUES,
  type StaffRoleValue,
  type StaffTypeValue,
} from "@/features/staff/constants";
import { logAnalytics } from "@/lib/analytics-logger";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

const staffMetadataSchema = z.object({
  profilePhoto: z.string().nullable().optional(),
}).passthrough();

const staffRoleSchema = z.enum(STAFF_ROLE_VALUES);
const staffTypeSchema = z.enum(STAFF_TYPE_VALUES);

const staffSortSchema = z
  .enum([
    "createdAt.desc",
    "createdAt.asc",
    "name.asc",
    "name.desc",
    "role.asc",
    "role.desc",
    "staffType.asc",
    "staffType.desc",
  ])
  .optional();

const staffListInputSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
  search: z.string().optional(),
  roles: z.array(staffRoleSchema).optional(),
  staffTypes: z.array(z.string().min(1)).optional(),
  isActive: z.boolean().optional(),
  sort: staffSortSchema,
  locationId: z.string().optional(),
  includeAllLocations: z.boolean().optional(),
});

const optionalTextSchema = z.string().trim().optional();
const optionalUrlSchema = z
  .union([z.string().url("Enter a valid image URL"), z.literal(""), z.null()])
  .optional();

const staffMutationSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.union([z.string().email("Invalid email"), z.literal("")]).optional(),
  phone: optionalTextSchema,
  employeeId: optionalTextSchema,
  role: staffRoleSchema,
  staffType: staffTypeSchema,
  hourlyRate: z.number().min(0).optional(),
  currency: z.string().trim().min(1).default("GBP"),
  profilePhoto: optionalUrlSchema,
});

function getScopedLocationId(
  input: { locationId?: string; includeAllLocations?: boolean },
  contextLocationId: string | null,
): string | null | undefined {
  if (input.includeAllLocations) return undefined;
  if (input.locationId !== undefined) return input.locationId || null;
  return contextLocationId;
}

function buildStaffWhereConditions({
  organizationId,
  locationId,
  includeAllLocations,
  search,
  roles,
  staffTypes,
  isActive,
}: {
  organizationId: string;
  locationId: string | null | undefined;
  includeAllLocations?: boolean;
  search?: string;
  roles?: readonly StaffRoleValue[];
  staffTypes?: readonly string[];
  isActive?: boolean;
}): SQL[] {
  const conditions: SQL[] = [
    eq(studioStaffMember.organizationId, organizationId),
    isNull(studioStaffMember.deletedAt),
  ];

  if (!includeAllLocations) {
    conditions.push(
      locationId
        ? eq(studioStaffMember.locationId, locationId)
        : isNull(studioStaffMember.locationId),
    );
  }

  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    const searchCondition = or(
      ilike(studioStaffMember.name, term),
      ilike(studioStaffMember.email, term),
      ilike(studioStaffMember.phone, term),
      ilike(studioStaffMember.employeeId, term),
      ilike(studioStaffMember.role, term),
      ilike(studioStaffMember.staffType, term),
    );
    if (searchCondition) conditions.push(searchCondition);
  }

  if (roles && roles.length > 0) {
    conditions.push(inArray(studioStaffMember.role, [...roles]));
  }

  if (staffTypes && staffTypes.length > 0) {
    conditions.push(inArray(studioStaffMember.staffType, [...staffTypes]));
  }

  if (isActive !== undefined) {
    conditions.push(eq(studioStaffMember.isActive, isActive));
  }

  return conditions;
}

function getStaffOrderBy(sort?: z.infer<typeof staffSortSchema>) {
  switch (sort) {
    case "createdAt.asc":
      return asc(studioStaffMember.createdAt);
    case "name.asc":
      return asc(studioStaffMember.name);
    case "name.desc":
      return desc(studioStaffMember.name);
    case "role.asc":
      return asc(studioStaffMember.role);
    case "role.desc":
      return desc(studioStaffMember.role);
    case "staffType.asc":
      return asc(studioStaffMember.staffType);
    case "staffType.desc":
      return desc(studioStaffMember.staffType);
    case "createdAt.desc":
    default:
      return desc(studioStaffMember.createdAt);
  }
}

function readProfilePhoto(metadata: unknown): string | null {
  const parsed = staffMetadataSchema.safeParse(metadata);
  if (!parsed.success) return null;
  return parsed.data.profilePhoto ?? null;
}

function buildMetadata(
  metadata: unknown,
  profilePhoto: string | null | undefined,
): Record<string, unknown> | null {
  const parsed = staffMetadataSchema.safeParse(metadata);
  const base = parsed.success ? parsed.data : {};
  const next: Record<string, unknown> = { ...base };

  if (profilePhoto === null || profilePhoto === "") {
    delete next.profilePhoto;
  } else if (profilePhoto !== undefined) {
    next.profilePhoto = profilePhoto;
  }

  return Object.keys(next).length > 0 ? next : null;
}

function staffCapabilities(staffType: StaffTypeValue, role: StaffRoleValue) {
  return {
    canTeachClasses: staffType === "INSTRUCTOR",
    canTakeAppointments: staffType === "INSTRUCTOR" || role === "MANAGER" || role === "ADMIN",
    canHandleReservations: role === "FRONT_DESK" || role === "MANAGER" || role === "ADMIN",
    canLeadWorkshops: staffType === "INSTRUCTOR" || role === "MANAGER" || role === "ADMIN",
  };
}

export const staffRouter = createTRPCRouter({
  list: protectedProcedure
    .input(staffListInputSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in an organization context",
        });
      }

      const scopedLocationId = getScopedLocationId(input, ctx.locationId);
      const conditions = buildStaffWhereConditions({
        organizationId: ctx.orgId,
        locationId: scopedLocationId,
        includeAllLocations: input.includeAllLocations,
        search: input.search,
        roles: input.roles,
        staffTypes: input.staffTypes,
        isActive: input.isActive ?? true,
      });
      const where = and(...conditions);

      const [totalResult] = await db
        .select({ total: count() })
        .from(studioStaffMember)
        .where(where);
      const totalItems = Number(totalResult?.total ?? 0);

      const items = await db
        .select({
          id: studioStaffMember.id,
          organizationId: studioStaffMember.organizationId,
          locationId: studioStaffMember.locationId,
          employeeId: studioStaffMember.employeeId,
          name: studioStaffMember.name,
          email: studioStaffMember.email,
          phone: studioStaffMember.phone,
          role: studioStaffMember.role,
          staffType: studioStaffMember.staffType,
          isActive: studioStaffMember.isActive,
          canTeachClasses: studioStaffMember.canTeachClasses,
          canTakeAppointments: studioStaffMember.canTakeAppointments,
          canHandleReservations: studioStaffMember.canHandleReservations,
          canLeadWorkshops: studioStaffMember.canLeadWorkshops,
          hourlyRate: studioStaffMember.hourlyRate,
          currency: studioStaffMember.currency,
          metadata: studioStaffMember.metadata,
          createdAt: studioStaffMember.createdAt,
          updatedAt: studioStaffMember.updatedAt,
        })
        .from(studioStaffMember)
        .where(where)
        .orderBy(getStaffOrderBy(input.sort))
        .offset((input.page - 1) * input.pageSize)
        .limit(input.pageSize);

      return {
        items: items.map((item) => ({
          ...item,
          profilePhoto: readProfilePhoto(item.metadata),
        })),
        pagination: {
          currentPage: input.page,
          totalPages: Math.ceil(totalItems / input.pageSize),
          pageSize: input.pageSize,
          totalItems,
        },
      };
    }),

  filterOptions: protectedProcedure
    .input(staffListInputSchema.pick({ locationId: true, includeAllLocations: true }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in an organization context",
        });
      }

      const scopedLocationId = getScopedLocationId(input, ctx.locationId);
      const conditions = buildStaffWhereConditions({
        organizationId: ctx.orgId,
        locationId: scopedLocationId,
        includeAllLocations: input.includeAllLocations,
      });

      const rows = await db
        .select({
          role: studioStaffMember.role,
          staffType: studioStaffMember.staffType,
        })
        .from(studioStaffMember)
        .where(and(...conditions))
        .groupBy(studioStaffMember.role, studioStaffMember.staffType);

      return {
        roles: rows
          .map((row) => row.role)
          .filter((role): role is string => Boolean(role))
          .sort(),
        staffTypes: rows
          .map((row) => row.staffType)
          .filter((staffType): staffType is string => Boolean(staffType))
          .sort(),
      };
    }),

  create: protectedProcedure
    .input(staffMutationSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in an organization context",
        });
      }

      const capabilities = staffCapabilities(input.staffType, input.role);
      const [created] = await db
        .insert(studioStaffMember)
        .values({
          id: crypto.randomUUID(),
          organizationId: ctx.orgId,
          locationId: ctx.locationId ?? null,
          name: input.name,
          email: input.email || null,
          phone: input.phone || null,
          employeeId: input.employeeId || null,
          role: input.role,
          staffType: input.staffType,
          hourlyRate:
            input.hourlyRate === undefined ? null : String(input.hourlyRate),
          currency: input.currency,
          metadata: buildMetadata(null, input.profilePhoto),
          ...capabilities,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create staff member",
        });
      }

      await logAnalytics({
        organizationId: ctx.orgId,
        locationId: ctx.locationId ?? null,
        userId: ctx.auth.user.id,
        action: ActivityAction.CREATED,
        type: ActivityType.INSTRUCTOR,
        entityType: "staff",
        entityId: created.id,
        entityName: created.name,
        metadata: {
          role: created.role,
          staffType: created.staffType,
        },
      });

      return {
        ...created,
        profilePhoto: readProfilePhoto(created.metadata),
      };
    }),

  update: protectedProcedure
    .input(
      staffMutationSchema.partial().extend({
        id: z.string(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in an organization context",
        });
      }

      const scopeConditions: SQL[] = [
        eq(studioStaffMember.id, input.id),
        eq(studioStaffMember.organizationId, ctx.orgId),
        isNull(studioStaffMember.deletedAt),
      ];
      if (ctx.locationId) {
        scopeConditions.push(eq(studioStaffMember.locationId, ctx.locationId));
      }

      const existing = await db.query.studioStaffMember.findFirst({
        where: and(...scopeConditions),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Staff member not found",
        });
      }

      const nextRole = input.role ?? (existing.role as StaffRoleValue | null) ?? "INSTRUCTOR";
      const nextStaffType =
        input.staffType ?? (existing.staffType as StaffTypeValue | null) ?? "INSTRUCTOR";
      const capabilities = staffCapabilities(nextStaffType, nextRole);

      const [updated] = await db
        .update(studioStaffMember)
        .set({
          name: input.name,
          email: input.email === undefined ? undefined : input.email || null,
          phone: input.phone === undefined ? undefined : input.phone || null,
          employeeId:
            input.employeeId === undefined ? undefined : input.employeeId || null,
          role: input.role,
          staffType: input.staffType,
          isActive: input.isActive,
          hourlyRate:
            input.hourlyRate === undefined ? undefined : String(input.hourlyRate),
          currency: input.currency,
          metadata:
            input.profilePhoto === undefined
              ? undefined
              : buildMetadata(existing.metadata, input.profilePhoto),
          ...capabilities,
          updatedAt: new Date(),
        })
        .where(eq(studioStaffMember.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update staff member",
        });
      }

      await logAnalytics({
        organizationId: ctx.orgId,
        locationId: ctx.locationId ?? null,
        userId: ctx.auth.user.id,
        action: ActivityAction.UPDATED,
        type: ActivityType.INSTRUCTOR,
        entityType: "staff",
        entityId: updated.id,
        entityName: updated.name,
        metadata: {
          role: updated.role,
          staffType: updated.staffType,
        },
      });

      return {
        ...updated,
        profilePhoto: readProfilePhoto(updated.metadata),
      };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in an organization context",
        });
      }

      const scopeConditions: SQL[] = [
        eq(studioStaffMember.id, input.id),
        eq(studioStaffMember.organizationId, ctx.orgId),
        isNull(studioStaffMember.deletedAt),
      ];
      if (ctx.locationId) {
        scopeConditions.push(eq(studioStaffMember.locationId, ctx.locationId));
      }

      const existing = await db.query.studioStaffMember.findFirst({
        where: and(...scopeConditions),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Staff member not found",
        });
      }

      await db
        .update(studioStaffMember)
        .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
        .where(eq(studioStaffMember.id, existing.id));

      await logAnalytics({
        organizationId: ctx.orgId,
        locationId: ctx.locationId ?? null,
        userId: ctx.auth.user.id,
        action: ActivityAction.DELETED,
        type: ActivityType.INSTRUCTOR,
        entityType: "staff",
        entityId: existing.id,
        entityName: existing.name,
        metadata: {
          role: existing.role,
          staffType: existing.staffType,
        },
      });

      return { success: true };
    }),
});
