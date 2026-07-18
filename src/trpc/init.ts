import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  member,
  session,
  location,
  locationMember,
  instructor as instructorTable,
} from "@/db/schema";
import { updateSessionActivity } from "@/lib/activity-tracker";
import { isActorStaffAccessBlocked } from "@/features/staff-identities/server/access-state";
import { initTRPC, TRPCError } from "@trpc/server";
import { and, asc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { cache } from "react";

import superjson from "superjson";
import { z } from "zod";

type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

type ProtectedScope = {
  orgId: string | null;
  locationId: string | null;
  location: typeof location.$inferSelect | null;
};

type TRPCRequestState = {
  authSessionPromise?: Promise<AuthSession | null>;
  protectedScopePromise?: Promise<ProtectedScope>;
  activityUpdateStarted?: boolean;
};

type TRPCRequestContext = {
  headers: Headers;
  requestState: TRPCRequestState;
};

export function createTRPCRequestContext(
  requestHeaders: Headers,
): TRPCRequestContext {
  return { headers: requestHeaders, requestState: {} };
}

// Used by server.tsx and direct callers — reads headers from Next.js async context
export const createTRPCContext = cache(async () => {
  const reqHeaders = await headers();
  return createTRPCRequestContext(reqHeaders);
});

const t = initTRPC.context<TRPCRequestContext>().create({
  transformer: superjson,
});

const InstructorProcedureInputSchema = z
  .object({
    instructorId: z.string().min(1),
  })
  .passthrough();

// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

export const baseProcedure = t.procedure;

// Authenticated procedure without requiring organization context
export const authenticatedProcedure = baseProcedure.use(
  async ({ ctx, next }) => {
    ctx.requestState.authSessionPromise ??= auth.api.getSession({
      headers: ctx.headers,
    });
    const session = await ctx.requestState.authSessionPromise;

    if (!session) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Unauthorized.",
      });
    }

    if (!ctx.requestState.activityUpdateStarted) {
      ctx.requestState.activityUpdateStarted = true;
      updateSessionActivity(session.session.token).catch((error) => {
        console.error("Failed to update session activity:", error);
      });
    }

    return next({
      ctx: {
        ...ctx,
        auth: session,
      },
    });
  },
);

export const protectedProcedure = authenticatedProcedure.use(
  async ({ ctx, next }) => {
    ctx.requestState.protectedScopePromise ??= (async () => {
      const [sessionRecord] = await db
        .select({
          activeOrganizationId: session.activeOrganizationId,
          activeLocationId: session.activeLocationId,
        })
        .from(session)
        .where(eq(session.token, ctx.auth.session.token))
        .limit(1);

      let orgId =
        sessionRecord?.activeOrganizationId ??
        ctx.auth.session.activeOrganizationId ??
        null;
      let activeLocationId = sessionRecord?.activeLocationId ?? null;

      // If no orgId, try to find a fallback organization membership
      if (!orgId) {
        const [fallbackMembership] = await db
          .select({ organizationId: member.organizationId })
          .from(member)
          .where(eq(member.userId, ctx.auth.user.id))
          .orderBy(asc(member.createdAt))
          .limit(1);

        if (fallbackMembership) {
          orgId = fallbackMembership.organizationId;
          await db
            .update(session)
            .set({ activeOrganizationId: orgId })
            .where(eq(session.token, ctx.auth.session.token));
        }
      }

      // If still no orgId, check for location-only membership
      if (!orgId && !activeLocationId) {
        const [fallbackLocationMembership] = await db
          .select({
            locationId: locationMember.locationId,
            organizationId: location.organizationId,
          })
          .from(locationMember)
          .innerJoin(location, eq(locationMember.locationId, location.id))
          .where(eq(locationMember.userId, ctx.auth.user.id))
          .orderBy(asc(locationMember.createdAt))
          .limit(1);

        if (fallbackLocationMembership) {
          activeLocationId = fallbackLocationMembership.locationId;
          orgId = fallbackLocationMembership.organizationId;
          await db
            .update(session)
            .set({
              activeLocationId,
              activeOrganizationId: orgId,
            })
            .where(eq(session.token, ctx.auth.session.token));
        }
      }

      // Auto-lock instructors to their assigned studio location
      const [instructorRecord] = await db
        .select({
          locationId: instructorTable.locationId,
          organizationId: instructorTable.organizationId,
        })
        .from(instructorTable)
        .where(eq(instructorTable.userId, ctx.auth.user.id))
        .limit(1);

      if (instructorRecord?.locationId) {
        if (activeLocationId !== instructorRecord.locationId) {
          activeLocationId = instructorRecord.locationId;
          orgId = instructorRecord.organizationId;
          await db
            .update(session)
            .set({
              activeLocationId: instructorRecord.locationId,
              activeOrganizationId: instructorRecord.organizationId,
            })
            .where(eq(session.token, ctx.auth.session.token));
        }
      }

      let activeLocation: typeof location.$inferSelect | null = null;

      if (activeLocationId && orgId) {
        [activeLocation = null] = await db
          .select()
          .from(location)
          .where(
            and(
              eq(location.id, activeLocationId),
              eq(location.organizationId, orgId),
            ),
          )
          .limit(1);

        if (!activeLocation) {
          await db
            .update(session)
            .set({ activeLocationId: null })
            .where(eq(session.token, ctx.auth.session.token));
        }
      }

      const staffAccessBlocked = await isActorStaffAccessBlocked({
        userId: ctx.auth.user.id,
        organizationId: orgId,
        locationId: activeLocation?.id ?? null,
      });
      if (staffAccessBlocked) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Your staff access is suspended.",
        });
      }

      return {
        orgId,
        locationId: activeLocation?.id ?? null,
        location: activeLocation,
      };
    })();

    const protectedScope = await ctx.requestState.protectedScopePromise;

    return next({
      ctx: {
        ...ctx,
        ...protectedScope,
      },
    });
  },
);

// Instructor procedure for instructor portal authentication (no Better Auth session)
export const instructorProcedure = baseProcedure.use(
  async ({ ctx, next, input }) => {
    const parsedInput = InstructorProcedureInputSchema.safeParse(input);
    const instructorId = parsedInput.success
      ? parsedInput.data.instructorId
      : null;

    if (!instructorId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Instructor ID is required",
      });
    }

    // Verify the instructor exists
    const [instructor] = await db
      .select({
        id: instructorTable.id,
        name: instructorTable.name,
        locationId: instructorTable.locationId,
        isActive: instructorTable.isActive,
      })
      .from(instructorTable)
      .where(eq(instructorTable.id, instructorId))
      .limit(1);

    if (!instructor) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Instructor not found",
      });
    }

    if (!instructor.isActive) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Instructor account is inactive",
      });
    }

    return next({
      ctx: {
        ...ctx,
        instructor,
        locationId: instructor.locationId,
      },
    });
  },
);
