import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { IntegrationProvider } from "@/generated/prisma/enums";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { removeGoogleCalendarSubscriptionsForUser } from "@/features/google-calendar/server/subscriptions";

export const integrationsRouter = createTRPCRouter({
  getMany: protectedProcedure.query(({ ctx }) => {
    return prisma.integration.findMany({
      where: {
        userId: ctx.auth.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }),
  getConnectedProviders: protectedProcedure.query(async ({ ctx }) => {
    const integrations = await prisma.integration.findMany({
      where: {
        userId: ctx.auth.user.id,
      },
      select: {
        provider: true,
      },
    });

    return integrations.map((integration) => integration.provider);
  }),
  syncGoogleCalendar: protectedProcedure.mutation(async ({ ctx }) => {
    const accountResponse = await auth.api.listUserAccounts({
      headers: await headers(),
    });

    const googleAccount = accountResponse.find(
      (account) => account.providerId === "google"
    );

    if (!googleAccount) {
      await removeGoogleCalendarSubscriptionsForUser(ctx.auth.user.id);
      await prisma.integration.deleteMany({
        where: {
          userId: ctx.auth.user.id,
          provider: IntegrationProvider.GOOGLE_CALENDAR,
        },
      });

      return { connected: false };
    }

    const existing = await prisma.integration.findFirst({
      where: {
        userId: ctx.auth.user.id,
        provider: IntegrationProvider.GOOGLE_CALENDAR,
      },
    });

    if (existing) {
      await prisma.integration.update({
        where: { id: existing.id },
        data: {
          scopes: googleAccount.scopes ?? [],
          metadata: {
            accountId: googleAccount.accountId,
          },
        },
      });
    } else {
      await prisma.integration.create({
        data: {
          userId: ctx.auth.user.id,
          provider: IntegrationProvider.GOOGLE_CALENDAR,
          scopes: googleAccount.scopes ?? [],
          metadata: {
            accountId: googleAccount.accountId,
          },
        },
      });
    }

    return { connected: true };
  }),
  listGoogleCalendars: protectedProcedure.query(async ({ ctx }) => {
    const tokenResponse = await auth.api.getAccessToken({
      headers: await headers(),
      body: {
        providerId: "google",
        userId: ctx.auth.user.id,
      },
    });

    const accessToken = tokenResponse?.accessToken;

    if (!accessToken) {
      return [];
    }

    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=writer",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        next: { revalidate: 0 },
      }
    );

    if (!response.ok) {
      console.warn(
        "[Integrations] Failed to list Google calendars:",
        await response.text()
      );
      return [];
    }

    const payload = await response.json().catch(() => ({}));
    const items = Array.isArray(payload?.items) ? payload.items : [];
    const allowedRoles = new Set(["owner", "writer"]);

    return items
      .filter((calendar: any) => allowedRoles.has(calendar?.accessRole))
      .map((calendar: any) => ({
        id: calendar.id as string,
        summary:
          (calendar.summaryOverride as string | undefined) ||
          (calendar.summary as string | undefined) ||
          (calendar.id as string),
        description: calendar.description as string | undefined,
        accessRole: calendar.accessRole as string | undefined,
        timeZone: calendar.timeZone as string | undefined,
        primary: Boolean(calendar.primary),
        selected: Boolean(calendar.selected),
        backgroundColor: calendar.backgroundColor as string | undefined,
      }));
  }),
});
