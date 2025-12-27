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
  SLACK_REQUIRED_SCOPES,
  DISCORD_REQUIRED_SCOPES,
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
          id: crypto.randomUUID(),
          userId: ctx.auth.user.id,
          provider: AppProvider.GOOGLE_CALENDAR,
          scopes: googleAccount.scopes ?? [],
          metadata: {
            accountId: googleAccount.accountId,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
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
          id: crypto.randomUUID(),
          userId: ctx.auth.user.id,
          provider: AppProvider.GMAIL,
          scopes: googleAccount.scopes ?? [],
          metadata: {
            accountId: googleAccount.accountId,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
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
          id: crypto.randomUUID(),
          userId: ctx.auth.user.id,
          provider: AppProvider.GOOGLE,
          scopes: googleAccount.scopes ?? [],
          createdAt: new Date(),
          updatedAt: new Date(),
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
          id: crypto.randomUUID(),
          userId: ctx.auth.user.id,
          provider: AppProvider.MICROSOFT,
          scopes: microsoftAccount.scopes ?? [],
          metadata: {
            accountId: microsoftAccount.accountId,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
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
  syncSlack: protectedProcedure.mutation(async ({ ctx }) => {
    const accountResponse = await auth.api.listUserAccounts({
      headers: await headers(),
    });

    const slackAccount = accountResponse.find(
      (account) => account.providerId === "slack"
    );

    if (!slackAccount) {
      await prisma.apps.deleteMany({
        where: {
          userId: ctx.auth.user.id,
          provider: AppProvider.SLACK,
        },
      });

      return { connected: false };
    }

    if (!hasAllScopes(slackAccount.scopes, SLACK_REQUIRED_SCOPES)) {
      await prisma.apps.deleteMany({
        where: {
          userId: ctx.auth.user.id,
          provider: AppProvider.SLACK,
        },
      });
      return { connected: false, missingScopes: true };
    }

    const existing = await prisma.apps.findFirst({
      where: {
        userId: ctx.auth.user.id,
        provider: AppProvider.SLACK,
      },
    });

    if (existing) {
      await prisma.apps.update({
        where: { id: existing.id },
        data: {
          scopes: slackAccount.scopes ?? [],
          metadata: {
            accountId: slackAccount.accountId,
          },
        },
      });
    } else {
      await prisma.apps.create({
        data: {
          id: crypto.randomUUID(),
          userId: ctx.auth.user.id,
          provider: AppProvider.SLACK,
          scopes: slackAccount.scopes ?? [],
          metadata: {
            accountId: slackAccount.accountId,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    return { connected: true };
  }),
  syncDiscord: protectedProcedure.mutation(async ({ ctx }) => {
    const accountResponse = await auth.api.listUserAccounts({
      headers: await headers(),
    });

    const discordAccount = accountResponse.find(
      (account) => account.providerId === "discord"
    );

    if (!discordAccount) {
      await prisma.apps.deleteMany({
        where: {
          userId: ctx.auth.user.id,
          provider: AppProvider.DISCORD,
        },
      });

      return { connected: false };
    }

    if (!hasAllScopes(discordAccount.scopes, DISCORD_REQUIRED_SCOPES)) {
      await prisma.apps.deleteMany({
        where: {
          userId: ctx.auth.user.id,
          provider: AppProvider.DISCORD,
        },
      });
      return { connected: false, missingScopes: true };
    }

    const existing = await prisma.apps.findFirst({
      where: {
        userId: ctx.auth.user.id,
        provider: AppProvider.DISCORD,
      },
    });

    if (existing) {
      await prisma.apps.update({
        where: { id: existing.id },
        data: {
          scopes: discordAccount.scopes ?? [],
          metadata: {
            accountId: discordAccount.accountId,
          },
        },
      });
    } else {
      await prisma.apps.create({
        data: {
          id: crypto.randomUUID(),
          userId: ctx.auth.user.id,
          provider: AppProvider.DISCORD,
          scopes: discordAccount.scopes ?? [],
          metadata: {
            accountId: discordAccount.accountId,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    return { connected: true };
  }),
  listDiscordGuilds: protectedProcedure.query(async ({ ctx }) => {
    const tokenResponse = await auth.api.getAccessToken({
      headers: await headers(),
      body: {
        providerId: "discord",
        userId: ctx.auth.user.id,
      },
    });

    const accessToken = tokenResponse?.accessToken;

    if (!accessToken) {
      return [];
    }

    const response = await fetch("https://discord.com/api/v10/users/@me/guilds", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      console.warn(
        "[Apps] Failed to list Discord guilds:",
        await response.text()
      );
      return [];
    }

    const guilds = await response.json().catch(() => []);

    type DiscordGuild = {
      id?: string;
      name?: string;
      icon?: string;
      owner?: boolean;
      permissions?: string;
    };

    return Array.isArray(guilds)
      ? guilds.map((guild: unknown) => {
          const g = (guild ?? {}) as DiscordGuild;
          return {
            id: g.id ?? "",
            name: g.name ?? "",
            icon: g.icon,
            owner: Boolean(g.owner),
            permissions: g.permissions,
          };
        })
      : [];
  }),
  listSlackWorkspaces: protectedProcedure.query(async ({ ctx }) => {
    const tokenResponse = await auth.api.getAccessToken({
      headers: await headers(),
      body: {
        providerId: "slack",
        userId: ctx.auth.user.id,
      },
    });

    const accessToken = tokenResponse?.accessToken;

    if (!accessToken) {
      return [];
    }

    // Get team info
    const teamResponse = await fetch("https://slack.com/api/team.info", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      next: { revalidate: 0 },
    });

    if (!teamResponse.ok) {
      console.warn(
        "[Apps] Failed to fetch Slack team info:",
        await teamResponse.text()
      );
      return [];
    }

    const teamData = await teamResponse.json().catch(() => ({}));

    type SlackTeam = {
      id?: string;
      name?: string;
      domain?: string;
      icon?: {
        image_68?: string;
        image_132?: string;
      };
    };

    const team = teamData?.team as SlackTeam | undefined;

    if (!team?.id) {
      return [];
    }

    return [
      {
        id: team.id,
        name: team.name ?? "",
        domain: team.domain,
        icon: team.icon?.image_68,
      },
    ];
  }),
  listSlackChannels: protectedProcedure.query(async ({ ctx }) => {
    const tokenResponse = await auth.api.getAccessToken({
      headers: await headers(),
      body: {
        providerId: "slack",
        userId: ctx.auth.user.id,
      },
    });

    const accessToken = tokenResponse?.accessToken;

    if (!accessToken) {
      return [];
    }

    const response = await fetch(
      "https://slack.com/api/conversations.list?types=public_channel,private_channel",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        next: { revalidate: 0 },
      }
    );

    if (!response.ok) {
      console.warn(
        "[Apps] Failed to list Slack channels:",
        await response.text()
      );
      return [];
    }

    const data = await response.json().catch(() => ({}));
    const channels = Array.isArray(data?.channels) ? data.channels : [];

    type SlackChannel = {
      id?: string;
      name?: string;
      is_private?: boolean;
      is_archived?: boolean;
    };

    return channels
      .map((channel: unknown) => (channel ?? {}) as SlackChannel)
      .filter((channel: SlackChannel) => !channel.is_archived)
      .map((channel: SlackChannel) => ({
        id: channel.id ?? "",
        name: channel.name ?? "",
        isPrivate: Boolean(channel.is_private),
      }));
  }),
  listDiscordChannels: protectedProcedure
    .input((input: unknown) => {
      if (
        typeof input === "object" &&
        input !== null &&
        "guildId" in input &&
        typeof input.guildId === "string"
      ) {
        return { guildId: input.guildId };
      }
      throw new Error("Invalid input: guildId is required");
    })
    .query(async ({ ctx, input }) => {
      const tokenResponse = await auth.api.getAccessToken({
        headers: await headers(),
        body: {
          providerId: "discord",
          userId: ctx.auth.user.id,
        },
      });

      const accessToken = tokenResponse?.accessToken;

      if (!accessToken) {
        return [];
      }

      // First, verify the user has access to this guild
      const guildsResponse = await fetch(
        "https://discord.com/api/v10/users/@me/guilds",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          next: { revalidate: 0 },
        }
      );

      if (!guildsResponse.ok) {
        console.warn(
          "[Apps] Failed to verify guild access:",
          await guildsResponse.text()
        );
        return [];
      }

      const guilds = await guildsResponse.json().catch(() => []);
      const hasAccess = Array.isArray(guilds) && guilds.some((g: any) => g.id === input.guildId);

      if (!hasAccess) {
        console.warn("[Apps] User does not have access to guild:", input.guildId);
        return [];
      }

      // Try to get channels - this requires bot scope or admin permissions
      const response = await fetch(
        `https://discord.com/api/v10/guilds/${input.guildId}/channels`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          next: { revalidate: 0 },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(
          "[Apps] Failed to list Discord channels:",
          errorText
        );

        // Return a helpful message if permissions are insufficient
        if (response.status === 403) {
          console.warn(
            "[Apps] Insufficient permissions to list channels. User needs 'bot' scope or admin permissions."
          );
        }
        return [];
      }

      const channels = await response.json().catch(() => []);

      type DiscordChannel = {
        id?: string;
        name?: string;
        type?: number;
      };

      // Filter for text channels (type 0) and announcement channels (type 5)
      return Array.isArray(channels)
        ? channels
            .map((channel: unknown) => (channel ?? {}) as DiscordChannel)
            .filter(
              (channel: DiscordChannel) =>
                channel.type === 0 || channel.type === 5
            )
            .map((channel: DiscordChannel) => ({
              id: channel.id ?? "",
              name: channel.name ?? "",
              type: channel.type,
            }))
        : [];
    }),
  updateDiscordMetadata: protectedProcedure
    .input((input: unknown) => {
      if (
        typeof input === "object" &&
        input !== null &&
        "guildId" in input &&
        typeof input.guildId === "string" &&
        "channelId" in input &&
        typeof input.channelId === "string"
      ) {
        return {
          guildId: input.guildId,
          channelId: input.channelId,
        };
      }
      throw new Error("Invalid input: guildId and channelId are required");
    })
    .mutation(async ({ ctx, input }) => {
      const app = await prisma.apps.findFirst({
        where: {
          userId: ctx.auth.user.id,
          provider: AppProvider.DISCORD,
        },
      });

      if (!app) {
        throw new Error("Discord app not found");
      }

      const currentMetadata =
        typeof app.metadata === "object" && app.metadata !== null
          ? app.metadata
          : {};

      await prisma.apps.update({
        where: { id: app.id },
        data: {
          metadata: {
            ...(currentMetadata as Record<string, unknown>),
            guildId: input.guildId,
            channelId: input.channelId,
          },
        },
      });

      return { success: true };
    }),
  updateSlackMetadata: protectedProcedure
    .input((input: unknown) => {
      if (
        typeof input === "object" &&
        input !== null &&
        "channelId" in input &&
        typeof input.channelId === "string"
      ) {
        return {
          channelId: input.channelId,
        };
      }
      throw new Error("Invalid input: channelId is required");
    })
    .mutation(async ({ ctx, input }) => {
      const app = await prisma.apps.findFirst({
        where: {
          userId: ctx.auth.user.id,
          provider: AppProvider.SLACK,
        },
      });

      if (!app) {
        throw new Error("Slack app not found");
      }

      const currentMetadata =
        typeof app.metadata === "object" && app.metadata !== null
          ? app.metadata
          : {};

      await prisma.apps.update({
        where: { id: app.id },
        data: {
          metadata: {
            ...(currentMetadata as Record<string, unknown>),
            channelId: input.channelId,
          },
        },
      });

      return { success: true };
    }),
});
