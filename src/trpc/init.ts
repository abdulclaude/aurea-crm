import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { polarClient } from "@/lib/polar";
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
export const protectedProcedure = baseProcedure.use(async ({ ctx, next }) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Unauthorized.",
    });
  }

  const sessionRecord = await prisma.session.findUnique({
    where: { token: session.session.token },
    select: {
      activeOrganizationId: true,
      activeSubaccountId: true,
    },
  });

  let orgId =
    sessionRecord?.activeOrganizationId ??
    session.session.activeOrganizationId ??
    null;
  const activeSubaccountId = sessionRecord?.activeSubaccountId ?? null;

  if (!orgId) {
    const fallbackMembership = await prisma.member.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
    });

    if (fallbackMembership) {
      orgId = fallbackMembership.organizationId;
      await prisma.session.update({
        where: { token: session.session.token },
        data: { activeOrganizationId: orgId },
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
        where: { token: session.session.token },
        data: { activeSubaccountId: null },
      });
    }
  }

  return next({
    ctx: {
      ...ctx,
      auth: session,
      orgId,
      subaccountId: activeSubaccount?.id ?? null,
      subaccount: activeSubaccount,
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
