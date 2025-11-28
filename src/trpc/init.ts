import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { polarClient } from "@/lib/polar";
import { updateSessionActivity } from "@/lib/activity-tracker";
import { initTRPC, TRPCError } from "@trpc/server";
import { headers } from "next/headers";
import { cache } from "react";

import superjson from "superjson";

export const createTRPCContext = cache(async () => {
  /**
   * @see: https://trpc.io/docs/server/context
   */
  return { userId: "user_123" };
});
// Avoid exporting the entire t-object
// since it's not very descriptive.
// For instance, the use of a t variable
// is common in i18n libraries.

const t = initTRPC.create({
  /**
   * @see https://trpc.io/docs/server/data-transformers
   */
  transformer: superjson,
});

// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

export const baseProcedure = t.procedure;

// Authenticated procedure without requiring organization context
export const authenticatedProcedure = baseProcedure.use(async ({ ctx, next }) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Unauthorized.",
    });
  }

  // Update session activity in the background (don't await to avoid slowing down requests)
  updateSessionActivity(session.session.token).catch((error) => {
    console.error("Failed to update session activity:", error);
  });

  return next({
    ctx: {
      ...ctx,
      auth: session,
    },
  });
});

export const protectedProcedure = authenticatedProcedure.use(async ({ ctx, next }) => {
  const sessionRecord = await prisma.session.findUnique({
    where: { token: ctx.auth.session.token },
    select: {
      activeOrganizationId: true,
      activeSubaccountId: true,
    },
  });

  let orgId =
    sessionRecord?.activeOrganizationId ??
    ctx.auth.session.activeOrganizationId ??
    null;
  let activeSubaccountId = sessionRecord?.activeSubaccountId ?? null;

  // If no orgId, try to find a fallback organization membership
  if (!orgId) {
    const fallbackMembership = await prisma.member.findFirst({
      where: { userId: ctx.auth.user.id },
      orderBy: { createdAt: "asc" },
    });

    if (fallbackMembership) {
      orgId = fallbackMembership.organizationId;
      await prisma.session.update({
        where: { token: ctx.auth.session.token },
        data: { activeOrganizationId: orgId },
      });
    }
  }

  // If still no orgId, check for subaccount-only membership
  if (!orgId && !activeSubaccountId) {
    const fallbackSubaccountMembership = await prisma.subaccountMember.findFirst({
      where: { userId: ctx.auth.user.id },
      include: { subaccount: true },
      orderBy: { createdAt: "asc" },
    });

    if (fallbackSubaccountMembership) {
      activeSubaccountId = fallbackSubaccountMembership.subaccountId;
      orgId = fallbackSubaccountMembership.subaccount.organizationId;
      await prisma.session.update({
        where: { token: ctx.auth.session.token },
        data: {
          activeSubaccountId,
          activeOrganizationId: orgId,
        },
      });
    }
  }

  let activeSubaccount: Awaited<
    ReturnType<typeof prisma.subaccount.findFirst>
  > | null = null;

  if (activeSubaccountId && orgId) {
    activeSubaccount = await prisma.subaccount.findFirst({
      where: {
        id: activeSubaccountId,
        organizationId: orgId,
      },
    });

    if (!activeSubaccount) {
      await prisma.session.update({
        where: { token: ctx.auth.session.token },
        data: { activeSubaccountId: null },
      });
    }
  }

  return next({
    ctx: {
      ...ctx,
      orgId,
      subaccountId: activeSubaccount?.id ?? null,
      subaccount: activeSubaccount,
    },
  });
});

// Worker procedure for worker portal authentication (no Better Auth session)
export const workerProcedure = baseProcedure.use(async ({ ctx, next, input }) => {
  // Extract workerId from input - procedures using this MUST have workerId in their input
  const workerId = (input as any)?.workerId;

  if (!workerId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Worker ID is required",
    });
  }

  // Verify the worker exists
  const worker = await prisma.worker.findUnique({
    where: { id: workerId },
    select: {
      id: true,
      name: true,
      subaccountId: true,
      isActive: true,
    },
  });

  if (!worker) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Worker not found",
    });
  }

  if (!worker.isActive) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Worker account is inactive",
    });
  }

  return next({
    ctx: {
      ...ctx,
      worker,
      subaccountId: worker.subaccountId,
    },
  });
});

export const premiumProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    const customer = await polarClient.customers.getStateExternal({
      externalId: ctx.auth.user.id,
    });

    if (
      !customer.activeSubscriptions ||
      customer.activeSubscriptions.length === 0
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Active subscription required.",
      });
    }
    return next({ ctx: { ...ctx, customer } });
  }
);
