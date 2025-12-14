import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { AppProvider } from "@prisma/client";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { removeGoogleCalendarSubscriptionsForUser } from "@/features/google-calendar/server/subscriptions";
import {
  GMAIL_REQUIRED_SCOPES,
  GOOGLE_CALENDAR_REQUIRED_SCOPES,
  GOOGLE_FULL_REQUIRED_SCOPES,
  MICROSOFT_REQUIRED_SCOPES,
} from "@/features/apps/constants";

const hasAllScopes = (
  accountScopes: string[] | null | undefined,
  scopes: string[]
) => {
  if (!accountScopes || accountScopes.length === 0) {
    return false;
  }
  const scopeSet = new Set(accountScopes);
  return scopes.every((scope) => scopeSet.has(scope));
};

export const appsRouter = createTRPCRouter({
  getMany: protectedProcedure.query(({ ctx }) => {
    return prisma.apps.findMany({
      where: {
        userId: ctx.auth.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }),
  getConnectedProviders: protectedProcedure.query(async ({ ctx }) => {
    const apps = await prisma.apps.findMany({
      where: {
        userId: ctx.auth.user.id,
      },
      select: {
        provider: true,
      },
    });

    return apps.map((app) => app.provider);
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
      await prisma.apps.deleteMany({
        where: {
          userId: ctx.auth.user.id,
          provider: AppProvider.GOOGLE_CALENDAR,
        },
      });

      return { connected: false };
    }

    if (!hasAllScopes(googleAccount.scopes, GOOGLE_CALENDAR_REQUIRED_SCOPES)) {
      await prisma.apps.deleteMany({
        where: {
          userId: ctx.auth.user.id,
          provider: AppProvider.GOOGLE_CALENDAR,
        },
      });
      return { connected: false, missingScopes: true };
    }

    const existing = await prisma.apps.findFirst({
      where: {
        userId: ctx.auth.user.id,
        provider: AppProvider.GOOGLE_CALENDAR,
      },
    });

    if (existing) {
      await prisma.apps.update({
        where: { id: existing.id },
        data: {
          scopes: googleAccount.scopes ?? [],
          metadata: {
            accountId: googleAccount.accountId,
          },
        },
      });
    } else {
      await prisma.apps.create({
        data: {
          userId: ctx.auth.user.id,
          provider: AppProvider.GOOGLE_CALENDAR,
          scopes: googleAccount.scopes ?? [],
          metadata: {
            accountId: googleAccount.accountId,
          },
        },
      });
    }

    return { connected: true };
  }),
  syncGmail: protectedProcedure.mutation(async ({ ctx }) => {
    const accountResponse = await auth.api.listUserAccounts({
      headers: await headers(),
    });

    const googleAccount = accountResponse.find(
      (account) => account.providerId === "google"
    );

    if (!googleAccount) {
      await prisma.apps.deleteMany({
        where: {
          userId: ctx.auth.user.id,
          provider: AppProvider.GMAIL,
        },
      });

      return { connected: false };
    }

    if (!hasAllScopes(googleAccount.scopes, GMAIL_REQUIRED_SCOPES)) {
      await prisma.apps.deleteMany({
        where: {
          userId: ctx.auth.user.id,
          provider: AppProvider.GMAIL,
        },
      });
      return { connected: false, missingScopes: true };
    }

    const existing = await prisma.apps.findFirst({
      where: {
        userId: ctx.auth.user.id,
        provider: AppProvider.GMAIL,
      },
    });

    if (existing) {
      await prisma.apps.update({
        where: { id: existing.id },
        data: {
          scopes: googleAccount.scopes ?? [],
          metadata: {
            accountId: googleAccount.accountId,
          },
        },
      });
    } else {
      await prisma.apps.create({
        data: {
          userId: ctx.auth.user.id,
          provider: AppProvider.GMAIL,
          scopes: googleAccount.scopes ?? [],
          metadata: {
            accountId: googleAccount.accountId,
          },
        },
      });
    }

    return { connected: true };
  }),
  syncGoogleWorkspace: protectedProcedure.mutation(async ({ ctx }) => {
    const accountResponse = await auth.api.listUserAccounts({
      headers: await headers(),
    });

    const googleAccount = accountResponse.find(
      (account) => account.providerId === "google"
    );

    if (!googleAccount) {
      await prisma.apps.deleteMany({
        where: {
          userId: ctx.auth.user.id,
          provider: AppProvider.GOOGLE,
        },
      });

      return { connected: false };
    }

    if (!hasAllScopes(googleAccount.scopes, GOOGLE_FULL_REQUIRED_SCOPES)) {
      await prisma.apps.deleteMany({
        where: {
          userId: ctx.auth.user.id,
          provider: AppProvider.GOOGLE,
        },
      });
      return { connected: false, missingScopes: true };
    }

    const existing = await prisma.apps.findFirst({
      where: {
        userId: ctx.auth.user.id,
        provider: AppProvider.GOOGLE,
      },
    });

    if (existing) {
      await prisma.apps.update({
        where: { id: existing.id },
        data: {
          scopes: googleAccount.scopes ?? [],
          metadata: {
            accountId: googleAccount.accountId,
          },
        },
      });
    } else {
      await prisma.apps.create({
        data: {
          userId: ctx.auth.user.id,
          provider: AppProvider.GOOGLE,
          scopes: googleAccount.scopes ?? [],
          metadata: {
            accountId: googleAccount.accountId,
          },
        },
      });
    }

    return { connected: true };
  }),
  syncMicrosoft: protectedProcedure.mutation(async ({ ctx }) => {
    const accountResponse = await auth.api.listUserAccounts({
      headers: await headers(),
    });

    const microsoftAccount = accountResponse.find(
      (account) => account.providerId === "microsoft"
    );

    if (!microsoftAccount) {
      await prisma.apps.deleteMany({
        where: {
          userId: ctx.auth.user.id,
          provider: AppProvider.MICROSOFT,
        },
      });

      return { connected: false };
    }

    if (!hasAllScopes(microsoftAccount.scopes, MICROSOFT_REQUIRED_SCOPES)) {
      await prisma.apps.deleteMany({
        where: {
          userId: ctx.auth.user.id,
          provider: AppProvider.MICROSOFT,
        },
      });
      return { connected: false, missingScopes: true };
    }

    const existing = await prisma.apps.findFirst({
      where: {
        userId: ctx.auth.user.id,
        provider: AppProvider.MICROSOFT,
      },
    });

    if (existing) {
      await prisma.apps.update({
        where: { id: existing.id },
        data: {
          scopes: microsoftAccount.scopes ?? [],
          metadata: {
            accountId: microsoftAccount.accountId,
          },
        },
      });
    } else {
      await prisma.apps.create({
        data: {
          userId: ctx.auth.user.id,
          provider: AppProvider.MICROSOFT,
          scopes: microsoftAccount.scopes ?? [],
          metadata: {
            accountId: microsoftAccount.accountId,
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

    type CalendarListItem = {
      id?: string;
      summary?: string;
      summaryOverride?: string;
      description?: string;
      accessRole?: string;
      timeZone?: string;
      primary?: boolean;
      selected?: boolean;
      backgroundColor?: string;
    };

    return items
      .map((calendar: unknown) => (calendar ?? {}) as CalendarListItem)
      .filter((calendar: CalendarListItem) =>
        calendar.accessRole ? allowedRoles.has(calendar.accessRole) : false
      )
      .map((calendar: CalendarListItem) => ({
        id: calendar.id ?? "",
        summary:
          calendar.summaryOverride ?? calendar.summary ?? calendar.id ?? "",
        description: calendar.description,
        accessRole: calendar.accessRole,
        timeZone: calendar.timeZone,
        primary: Boolean(calendar.primary),
        selected: Boolean(calendar.selected),
        backgroundColor: calendar.backgroundColor,
      }));
  }),
});
