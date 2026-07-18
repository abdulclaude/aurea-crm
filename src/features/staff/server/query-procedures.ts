import { and, count } from "drizzle-orm";

import { db } from "@/db";
import { studioStaffMember } from "@/db/schema";
import {
  authorizeStaffAccess,
  getScopedStaffLocationId,
  validateRequestedStaffLocation,
} from "@/features/staff/server/authorization";
import {
  buildStaffWhereConditions,
  getStaffOrderBy,
  readStaffEmploymentType,
  readStaffProfilePhoto,
} from "@/features/staff/server/query-utils";
import { staffListInputSchema } from "@/features/staff/server/schemas";
import { protectedProcedure } from "@/trpc/init";

export const staffListProcedure = protectedProcedure
  .input(staffListInputSchema)
  .query(async ({ ctx, input }) => {
    const organizationId = await authorizeStaffAccess({
      userId: ctx.auth.user.id,
      organizationId: ctx.orgId,
      locationId: ctx.locationId,
      capability: "team.view",
    });
    await validateRequestedStaffLocation({
      organizationId,
      activeLocationId: ctx.locationId,
      requestedLocationId: input.locationId,
      includeAllLocations: input.includeAllLocations,
    });

    const conditions = buildStaffWhereConditions({
      organizationId,
      locationId: getScopedStaffLocationId(input, ctx.locationId),
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
        employmentType: readStaffEmploymentType(item.metadata, item.employeeId),
        profilePhoto: readStaffProfilePhoto(item.metadata),
      })),
      pagination: {
        currentPage: input.page,
        totalPages: Math.ceil(totalItems / input.pageSize),
        pageSize: input.pageSize,
        totalItems,
      },
    };
  });

export const staffFilterOptionsProcedure = protectedProcedure
  .input(
    staffListInputSchema.pick({
      locationId: true,
      includeAllLocations: true,
    }),
  )
  .query(async ({ ctx, input }) => {
    const organizationId = await authorizeStaffAccess({
      userId: ctx.auth.user.id,
      organizationId: ctx.orgId,
      locationId: ctx.locationId,
      capability: "team.view",
    });
    await validateRequestedStaffLocation({
      organizationId,
      activeLocationId: ctx.locationId,
      requestedLocationId: input.locationId,
      includeAllLocations: input.includeAllLocations,
    });
    const rows = await db
      .select({
        role: studioStaffMember.role,
        staffType: studioStaffMember.staffType,
      })
      .from(studioStaffMember)
      .where(
        and(
          ...buildStaffWhereConditions({
            organizationId,
            locationId: getScopedStaffLocationId(input, ctx.locationId),
            includeAllLocations: input.includeAllLocations,
          }),
        ),
      )
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
  });
