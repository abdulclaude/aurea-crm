import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { AppProvider } from "@/db/enums";
import { z } from "zod";
import {
  GMAIL_REQUIRED_SCOPES,
  GOOGLE_CALENDAR_REQUIRED_SCOPES,
  GOOGLE_FULL_REQUIRED_SCOPES,
  MICROSOFT_REQUIRED_SCOPES,
  SLACK_REQUIRED_SCOPES,
  DISCORD_REQUIRED_SCOPES,
} from "@/features/apps/constants";
import {
  getScopedConnectedProviders,
  listScopedOAuthAccountOptions,
  listScopedOAuthApps,
  resolveScopedAppGrant,
  syncScopedOAuthAccount,
  updateScopedOAuthConfig,
  type OAuthAppSpec,
} from "@/features/apps/server/scoped-oauth";
import {
  oauthAuthenticatedFetch,
  recordOAuthProviderAuthenticationFailure,
} from "@/features/provider-accounts/server/oauth-authenticated-fetch";

const oauthAppProviderSchema = z.enum([
  AppProvider.GOOGLE,
  AppProvider.MICROSOFT,
  AppProvider.SLACK,
  AppProvider.DISCORD,
]);

const oauthSelectionSchema = z.object({
  providerAccountId: z.string().trim().min(1).optional(),
  linkedAccountId: z.string().trim().min(1).optional(),
});

const GOOGLE_WORKSPACE_SPEC = {
  provider: "GOOGLE_WORKSPACE",
  authProviderId: "google",
  appProvider: AppProvider.GOOGLE,
  displayName: "Google Workspace",
  requiredScopes: GOOGLE_FULL_REQUIRED_SCOPES,
} as const satisfies OAuthAppSpec;

const MICROSOFT_SPEC = {
  provider: "MICROSOFT_365",
  authProviderId: "microsoft",
  appProvider: AppProvider.MICROSOFT,
  displayName: "Microsoft 365",
  requiredScopes: MICROSOFT_REQUIRED_SCOPES,
} as const satisfies OAuthAppSpec;

const SLACK_SPEC = {
  provider: "SLACK_OAUTH",
  authProviderId: "slack",
  appProvider: AppProvider.SLACK,
  displayName: "Slack",
  requiredScopes: SLACK_REQUIRED_SCOPES,
} as const satisfies OAuthAppSpec;

const DISCORD_SPEC = {
  provider: "DISCORD_OAUTH",
  authProviderId: "discord",
  appProvider: AppProvider.DISCORD,
  displayName: "Discord",
  requiredScopes: DISCORD_REQUIRED_SCOPES,
} as const satisfies OAuthAppSpec;

function getOAuthAppSpec(provider: z.infer<typeof oauthAppProviderSchema>) {
  switch (provider) {
    case AppProvider.GOOGLE:
      return GOOGLE_WORKSPACE_SPEC;
    case AppProvider.MICROSOFT:
      return MICROSOFT_SPEC;
    case AppProvider.SLACK:
      return SLACK_SPEC;
    case AppProvider.DISCORD:
      return DISCORD_SPEC;
  }
}

const googleCalendarListSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().optional(),
        summary: z.string().optional(),
        summaryOverride: z.string().optional(),
        description: z.string().optional(),
        accessRole: z.string().optional(),
        timeZone: z.string().optional(),
        primary: z.boolean().optional(),
        selected: z.boolean().optional(),
        backgroundColor: z.string().optional(),
      }),
    )
    .default([]),
});

const slackTeamResponseSchema = z.object({
  ok: z.boolean().optional(),
  error: z.string().optional(),
  team: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
      domain: z.string().optional(),
      icon: z.object({ image_68: z.string().optional() }).optional(),
    })
    .optional(),
});

const slackChannelsResponseSchema = z.object({
  ok: z.boolean().optional(),
  error: z.string().optional(),
  channels: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().optional(),
        is_private: z.boolean().optional(),
        is_archived: z.boolean().optional(),
      }),
    )
    .default([]),
});

const SLACK_AUTH_ERRORS = new Set([
  "account_inactive",
  "invalid_auth",
  "not_authed",
  "token_expired",
  "token_revoked",
]);

export const appsRouter = createTRPCRouter({
  getMany: protectedProcedure.query(({ ctx }) => listScopedOAuthApps(ctx)),
  getConnectedProviders: protectedProcedure.query(({ ctx }) =>
    getScopedConnectedProviders(ctx),
  ),
  listOAuthAccounts: protectedProcedure
    .input(z.object({ provider: oauthAppProviderSchema }))
    .query(({ ctx, input }) =>
      listScopedOAuthAccountOptions(ctx, getOAuthAppSpec(input.provider)),
    ),
  syncOAuthAccount: protectedProcedure
    .input(oauthSelectionSchema.extend({ provider: oauthAppProviderSchema }))
    .mutation(({ ctx, input }) =>
      syncScopedOAuthAccount(ctx, getOAuthAppSpec(input.provider), input),
    ),
  syncGoogleCalendar: protectedProcedure
    .input(oauthSelectionSchema.optional())
    .mutation(({ ctx, input }) =>
      syncScopedOAuthAccount(
        ctx,
        {
          ...GOOGLE_WORKSPACE_SPEC,
          appProvider: AppProvider.GOOGLE_CALENDAR,
          requiredScopes: GOOGLE_CALENDAR_REQUIRED_SCOPES,
        },
        input,
      ),
    ),
  syncGmail: protectedProcedure
    .input(oauthSelectionSchema.optional())
    .mutation(({ ctx, input }) =>
      syncScopedOAuthAccount(
        ctx,
        {
          ...GOOGLE_WORKSPACE_SPEC,
          appProvider: AppProvider.GMAIL,
          requiredScopes: GMAIL_REQUIRED_SCOPES,
        },
        input,
      ),
    ),
  syncGoogleWorkspace: protectedProcedure
    .input(oauthSelectionSchema.optional())
    .mutation(({ ctx, input }) =>
      syncScopedOAuthAccount(ctx, GOOGLE_WORKSPACE_SPEC, input),
    ),
  syncMicrosoft: protectedProcedure
    .input(oauthSelectionSchema.optional())
    .mutation(({ ctx, input }) =>
      syncScopedOAuthAccount(ctx, MICROSOFT_SPEC, input),
    ),
  listGoogleCalendars: protectedProcedure
    .input(z.object({ providerAccountId: z.string().trim().min(1) }))
    .query(async ({ ctx, input }) => {
      const grant = await resolveScopedAppGrant(
        ctx,
        "GOOGLE_WORKSPACE",
        GOOGLE_CALENDAR_REQUIRED_SCOPES,
        input.providerAccountId,
      );
      const { accessToken } = grant;

      const response = await oauthAuthenticatedFetch(
        grant,
        "https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=writer",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          next: { revalidate: 0 },
        },
      );

      if (!response.ok) {
        console.warn(
          "[Integrations] Failed to list Google calendars:",
          response.status,
        );
        return [];
      }

      const payload: unknown = await response.json().catch(() => ({}));
      const parsed = googleCalendarListSchema.safeParse(payload);
      const items = parsed.success ? parsed.data.items : [];
      const allowedRoles = new Set(["owner", "writer"]);

      return items
        .filter((calendar) =>
          calendar.accessRole ? allowedRoles.has(calendar.accessRole) : false,
        )
        .map((calendar) => ({
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
  syncSlack: protectedProcedure
    .input(oauthSelectionSchema.optional())
    .mutation(({ ctx, input }) =>
      syncScopedOAuthAccount(ctx, SLACK_SPEC, input),
    ),
  syncDiscord: protectedProcedure
    .input(oauthSelectionSchema.optional())
    .mutation(({ ctx, input }) =>
      syncScopedOAuthAccount(ctx, DISCORD_SPEC, input),
    ),
  listDiscordGuilds: protectedProcedure
    .input(z.object({ providerAccountId: z.string().trim().min(1) }))
    .query(async ({ ctx, input }) => {
      const grant = await resolveScopedAppGrant(
        ctx,
        "DISCORD_OAUTH",
        DISCORD_REQUIRED_SCOPES,
        input.providerAccountId,
      );
      const { accessToken } = grant;

      const response = await oauthAuthenticatedFetch(
        grant,
        "https://discord.com/api/v10/users/@me/guilds",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          next: { revalidate: 0 },
        },
      );

      if (!response.ok) {
        console.warn(
          "[Apps] Failed to list Discord guilds:",
          response.status,
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
  listSlackWorkspaces: protectedProcedure
    .input(z.object({ providerAccountId: z.string().trim().min(1) }))
    .query(async ({ ctx, input }) => {
      const grant = await resolveScopedAppGrant(
        ctx,
        "SLACK_OAUTH",
        SLACK_REQUIRED_SCOPES,
        input.providerAccountId,
      );
      const { accessToken } = grant;

      // Get team info
      const teamResponse = await oauthAuthenticatedFetch(grant, "https://slack.com/api/team.info", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        next: { revalidate: 0 },
      });

      if (!teamResponse.ok) {
        console.warn(
          "[Apps] Failed to fetch Slack team info:",
          teamResponse.status,
        );
        return [];
      }

      const teamData = slackTeamResponseSchema.parse(
        await teamResponse.json().catch(() => ({})),
      );
      if (teamData.ok === false && teamData.error && SLACK_AUTH_ERRORS.has(teamData.error)) {
        await recordOAuthProviderAuthenticationFailure(grant);
      }
      const team = teamData.team;

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
  listSlackChannels: protectedProcedure
    .input(z.object({ providerAccountId: z.string().trim().min(1) }))
    .query(async ({ ctx, input }) => {
      const grant = await resolveScopedAppGrant(
        ctx,
        "SLACK_OAUTH",
        SLACK_REQUIRED_SCOPES,
        input.providerAccountId,
      );
      const { accessToken } = grant;

      const response = await oauthAuthenticatedFetch(
        grant,
        "https://slack.com/api/conversations.list?types=public_channel,private_channel",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          next: { revalidate: 0 },
        },
      );

      if (!response.ok) {
        console.warn(
          "[Apps] Failed to list Slack channels:",
          response.status,
        );
        return [];
      }

      const data = slackChannelsResponseSchema.parse(
        await response.json().catch(() => ({})),
      );
      if (data.ok === false && data.error && SLACK_AUTH_ERRORS.has(data.error)) {
        await recordOAuthProviderAuthenticationFailure(grant);
      }

      return data.channels
        .filter((channel) => !channel.is_archived)
        .map((channel) => ({
          id: channel.id ?? "",
          name: channel.name ?? "",
          isPrivate: Boolean(channel.is_private),
        }));
    }),
  listDiscordChannels: protectedProcedure
    .input(
      z.object({
        providerAccountId: z.string().trim().min(1),
        guildId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const grant = await resolveScopedAppGrant(
        ctx,
        "DISCORD_OAUTH",
        DISCORD_REQUIRED_SCOPES,
        input.providerAccountId,
      );
      const { accessToken } = grant;

      // First, verify the user has access to this guild
      const guildsResponse = await oauthAuthenticatedFetch(
        grant,
        "https://discord.com/api/v10/users/@me/guilds",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          next: { revalidate: 0 },
        },
      );

      if (!guildsResponse.ok) {
        console.warn(
          "[Apps] Failed to verify guild access:",
          guildsResponse.status,
        );
        return [];
      }

      const guilds = await guildsResponse.json().catch(() => []);
      const hasAccess =
        Array.isArray(guilds) &&
        guilds.some((guild: unknown) => {
          const parsedGuild = guild as { id?: unknown };
          return parsedGuild.id === input.guildId;
        });

      if (!hasAccess) {
        console.warn(
          "[Apps] User does not have access to guild:",
          input.guildId,
        );
        return [];
      }

      // Try to get channels - this requires bot scope or admin permissions
      const response = await oauthAuthenticatedFetch(
        grant,
        `https://discord.com/api/v10/guilds/${input.guildId}/channels`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          next: { revalidate: 0 },
        },
      );

      if (!response.ok) {
        console.warn("[Apps] Failed to list Discord channels:", response.status);

        // Return a helpful message if permissions are insufficient
        if (response.status === 403) {
          console.warn(
            "[Apps] Insufficient permissions to list channels. User needs 'bot' scope or admin permissions.",
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
                channel.type === 0 || channel.type === 5,
            )
            .map((channel: DiscordChannel) => ({
              id: channel.id ?? "",
              name: channel.name ?? "",
              type: channel.type,
            }))
        : [];
    }),
  updateDiscordMetadata: protectedProcedure
    .input(
      z.object({
        providerAccountId: z.string().trim().min(1),
        guildId: z.string().min(1),
        channelId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await updateScopedOAuthConfig({
        ctx,
        provider: "DISCORD_OAUTH",
        providerAccountId: input.providerAccountId,
        config: { guildId: input.guildId, channelId: input.channelId },
      });
      return { success: true };
    }),
  updateSlackMetadata: protectedProcedure
    .input(
      z.object({
        providerAccountId: z.string().trim().min(1),
        channelId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await updateScopedOAuthConfig({
        ctx,
        provider: "SLACK_OAUTH",
        providerAccountId: input.providerAccountId,
        config: { channelId: input.channelId },
      });
      return { success: true };
    }),
});
