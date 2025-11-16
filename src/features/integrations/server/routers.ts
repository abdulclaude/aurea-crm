import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { IntegrationProvider } from "@/generated/prisma/enums";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { removeGoogleCalendarSubscriptionsForUser } from "@/features/google-calendar/server/subscriptions";
import {
  GMAIL_REQUIRED_SCOPES,
  GOOGLE_CALENDAR_REQUIRED_SCOPES,
  GOOGLE_FULL_REQUIRED_SCOPES,
  WHATSAPP_REQUIRED_SCOPES,
} from "@/features/integrations/constants";

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

    if (!hasAllScopes(googleAccount.scopes, GOOGLE_CALENDAR_REQUIRED_SCOPES)) {
      await prisma.integration.deleteMany({
        where: {
          userId: ctx.auth.user.id,
          provider: IntegrationProvider.GOOGLE_CALENDAR,
        },
      });
      return { connected: false, missingScopes: true };
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
  syncGmail: protectedProcedure.mutation(async ({ ctx }) => {
    const accountResponse = await auth.api.listUserAccounts({
      headers: await headers(),
    });

    const googleAccount = accountResponse.find(
      (account) => account.providerId === "google"
    );

    if (!googleAccount) {
      await prisma.integration.deleteMany({
        where: {
          userId: ctx.auth.user.id,
          provider: IntegrationProvider.GMAIL,
        },
      });

      return { connected: false };
    }

    if (!hasAllScopes(googleAccount.scopes, GMAIL_REQUIRED_SCOPES)) {
      await prisma.integration.deleteMany({
        where: {
          userId: ctx.auth.user.id,
          provider: IntegrationProvider.GMAIL,
        },
      });
      return { connected: false, missingScopes: true };
    }

    const existing = await prisma.integration.findFirst({
      where: {
        userId: ctx.auth.user.id,
        provider: IntegrationProvider.GMAIL,
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
          provider: IntegrationProvider.GMAIL,
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
      await prisma.integration.deleteMany({
        where: {
          userId: ctx.auth.user.id,
          provider: IntegrationProvider.GOOGLE,
        },
      });

      return { connected: false };
    }

    if (!hasAllScopes(googleAccount.scopes, GOOGLE_FULL_REQUIRED_SCOPES)) {
      await prisma.integration.deleteMany({
        where: {
          userId: ctx.auth.user.id,
          provider: IntegrationProvider.GOOGLE,
        },
      });
      return { connected: false, missingScopes: true };
    }

    const existing = await prisma.integration.findFirst({
      where: {
        userId: ctx.auth.user.id,
        provider: IntegrationProvider.GOOGLE,
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
          provider: IntegrationProvider.GOOGLE,
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
  syncWhatsApp: protectedProcedure.mutation(async ({ ctx }) => {
    const accountResponse = await auth.api.listUserAccounts({
      headers: await headers(),
    });

    const facebookAccount = accountResponse.find(
      (account) => account.providerId === "facebook"
    );

    if (!facebookAccount) {
      await prisma.integration.deleteMany({
        where: {
          userId: ctx.auth.user.id,
          provider: IntegrationProvider.WHATSAPP,
        },
      });
      return { connected: false };
    }

    if (!hasAllScopes(facebookAccount.scopes, WHATSAPP_REQUIRED_SCOPES)) {
      await prisma.integration.deleteMany({
        where: {
          userId: ctx.auth.user.id,
          provider: IntegrationProvider.WHATSAPP,
        },
      });
      return { connected: false, missingScopes: true };
    }

    const tokenResponse = await auth.api.getAccessToken({
      headers: await headers(),
      body: {
        providerId: "facebook",
        userId: ctx.auth.user.id,
      },
    });

    const accessToken = tokenResponse?.accessToken;
    if (!accessToken) {
      return { connected: false };
    }

    const businessAccountsResponse = await fetch(
      `https://graph.facebook.com/v19.0/me/owned_whatsapp_business_accounts`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    if (!businessAccountsResponse.ok) {
      console.error(
        "[WhatsApp] Failed to list business accounts",
        await businessAccountsResponse.text()
      );
      return { connected: false };
    }

    const businessAccountsPayload = await businessAccountsResponse
      .json()
      .catch(() => ({}));

    const businessAccount = businessAccountsPayload?.data?.[0];

    if (!businessAccount?.id) {
      return { connected: false, missingBusinessAccount: true };
    }

    const phoneNumbersResponse = await fetch(
      `https://graph.facebook.com/v19.0/${businessAccount.id}/phone_numbers`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    if (!phoneNumbersResponse.ok) {
      console.error(
        "[WhatsApp] Failed to list phone numbers",
        await phoneNumbersResponse.text()
      );
      return { connected: false };
    }

    const phoneNumbersPayload = await phoneNumbersResponse
      .json()
      .catch(() => ({}));
    const phoneNumber = phoneNumbersPayload?.data?.[0];

    if (!phoneNumber?.id) {
      return { connected: false, missingPhoneNumber: true };
    }

    const metadata = {
      businessAccountId: businessAccount.id,
      businessAccountName: businessAccount.name,
      phoneNumberId: phoneNumber.id,
      displayPhoneNumber: phoneNumber.display_phone_number,
      verifiedName: phoneNumber.verified_name,
    };

    const existing = await prisma.integration.findFirst({
      where: {
        userId: ctx.auth.user.id,
        provider: IntegrationProvider.WHATSAPP,
      },
    });

    if (existing) {
      await prisma.integration.update({
        where: { id: existing.id },
        data: {
          scopes: WHATSAPP_REQUIRED_SCOPES,
          metadata,
        },
      });
    } else {
      await prisma.integration.create({
        data: {
          userId: ctx.auth.user.id,
          provider: IntegrationProvider.WHATSAPP,
          scopes: WHATSAPP_REQUIRED_SCOPES,
          metadata,
        },
      });
    }

    return { connected: true };
  }),
});
