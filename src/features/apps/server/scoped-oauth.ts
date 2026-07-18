import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";
import { headers } from "next/headers";

import { db } from "@/db";
import { AppProvider, type AppProvider as AppProviderType } from "@/db/enums";
import { providerAccount, providerOAuthGrant } from "@/db/schema";
import {
  oauthProviderConfigSchema,
  type OAuthProviderAccount,
} from "@/features/provider-accounts/contracts";
import {
  redactOAuthAccountIdentifier,
  selectOAuthCatalogAccount,
  selectOAuthAccountBinding,
} from "@/features/apps/lib/oauth-account-selection";
import { resolveOAuthProviderGrant } from "@/features/provider-accounts/server/oauth-resolver";
import { requireCapability } from "@/features/permissions/server/authorization";
import { auth } from "@/lib/auth";
import { verifyOAuthConnection } from "./oauth-connection-verifier";

export type ScopedAppContext = {
  auth: { user: { id: string } };
  orgId: string | null;
  locationId: string | null;
};

export type OAuthAppSpec = {
  provider: OAuthProviderAccount;
  authProviderId: "google" | "microsoft" | "slack" | "discord";
  appProvider: AppProviderType;
  displayName: string;
  requiredScopes: readonly string[];
};

const OAUTH_PROVIDERS: OAuthProviderAccount[] = [
  "GOOGLE_WORKSPACE",
  "MICROSOFT_365",
  "SLACK_OAUTH",
  "DISCORD_OAUTH",
];

const APP_PROVIDER_BY_ACCOUNT: Record<OAuthProviderAccount, AppProviderType> = {
  GOOGLE_WORKSPACE: AppProvider.GOOGLE,
  MICROSOFT_365: AppProvider.MICROSOFT,
  SLACK_OAUTH: AppProvider.SLACK,
  DISCORD_OAUTH: AppProvider.DISCORD,
};

function requireOrganization(ctx: ScopedAppContext): string {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select an organization before managing connected apps.",
    });
  }
  return ctx.orgId;
}

function exactLocationCondition(locationId: string | null) {
  return locationId
    ? eq(providerAccount.locationId, locationId)
    : isNull(providerAccount.locationId);
}

async function listExactAccounts(
  ctx: ScopedAppContext,
  provider: OAuthProviderAccount,
) {
  const organizationId = requireOrganization(ctx);
  return db
    .select({ account: providerAccount, grant: providerOAuthGrant })
    .from(providerAccount)
    .leftJoin(
      providerOAuthGrant,
      eq(providerOAuthGrant.providerAccountId, providerAccount.id),
    )
    .where(
      and(
        eq(providerAccount.organizationId, organizationId),
        exactLocationCondition(ctx.locationId),
        eq(providerAccount.provider, provider),
      ),
    )
    .orderBy(asc(providerAccount.createdAt), asc(providerAccount.id));
}

async function listVisibleAccounts(
  ctx: ScopedAppContext,
  provider: OAuthProviderAccount,
) {
  const organizationId = requireOrganization(ctx);
  const rows = await db
    .select({ account: providerAccount, grant: providerOAuthGrant })
    .from(providerAccount)
    .leftJoin(
      providerOAuthGrant,
      eq(providerOAuthGrant.providerAccountId, providerAccount.id),
    )
    .where(
      and(
        eq(providerAccount.organizationId, organizationId),
        eq(providerAccount.provider, provider),
        ctx.locationId
          ? or(
              eq(providerAccount.locationId, ctx.locationId),
              isNull(providerAccount.locationId),
            )
          : isNull(providerAccount.locationId),
      ),
    )
    .orderBy(asc(providerAccount.createdAt), asc(providerAccount.id));

  return rows.filter((row) => {
    if (row.account.locationId === ctx.locationId) return true;
    const config = oauthProviderConfigSchema.safeParse(row.account.config);
    return Boolean(
      ctx.locationId && config.success && config.data.inheritToLocations,
    );
  });
}

async function listLinkedAccounts(spec: OAuthAppSpec) {
  return (await auth.api.listUserAccounts({ headers: await headers() }))
    .filter((account) => account.providerId === spec.authProviderId)
    .sort((left, right) => left.id.localeCompare(right.id));
}

async function requireProviderManager(ctx: ScopedAppContext) {
  const organizationId = requireOrganization(ctx);
  await requireCapability({
    actor: {
      userId: ctx.auth.user.id,
      organizationId,
      locationId: ctx.locationId,
    },
    capability: "provider.manage",
  });
  return organizationId;
}

const RETRYABLE_OAUTH_ACCOUNT_CONSTRAINTS = new Set([
  "ProviderAccount_org_oauth_identity_key",
  "ProviderAccount_location_oauth_identity_key",
  "ProviderAccount_org_default_key",
  "ProviderAccount_location_default_key",
]);

function getPostgresConstraint(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const candidate = error as {
    code?: unknown;
    constraint?: unknown;
    cause?: unknown;
  };
  if (candidate.code === "23505" && typeof candidate.constraint === "string") {
    return candidate.constraint;
  }
  return candidate.cause === error
    ? null
    : getPostgresConstraint(candidate.cause);
}

export async function listScopedOAuthApps(ctx: ScopedAppContext) {
  if (!ctx.orgId) return [];
  const organizationId = ctx.orgId;
  const rows = await db
    .select({ account: providerAccount, grant: providerOAuthGrant })
    .from(providerAccount)
    .leftJoin(
      providerOAuthGrant,
      eq(providerOAuthGrant.providerAccountId, providerAccount.id),
    )
    .where(
      and(
        eq(providerAccount.organizationId, organizationId),
        inArray(providerAccount.provider, OAUTH_PROVIDERS),
        ctx.locationId
          ? or(
              eq(providerAccount.locationId, ctx.locationId),
              isNull(providerAccount.locationId),
            )
          : isNull(providerAccount.locationId),
      ),
    )
    .orderBy(asc(providerAccount.createdAt), asc(providerAccount.id));

  return OAUTH_PROVIDERS.flatMap((provider) => {
    const candidates = rows
      .filter((row) => row.account.provider === provider)
      .map((row) => {
        const config = oauthProviderConfigSchema.safeParse(row.account.config);
        return {
          ...row,
          organizationId: row.account.organizationId,
          locationId: row.account.locationId,
          inheritToLocations: config.success
            ? config.data.inheritToLocations
            : false,
          config: config.success ? config.data : null,
        };
      });
    const selected = selectOAuthCatalogAccount(
      candidates.map((candidate) => ({
        ...candidate,
        isDefault: candidate.account.isDefault,
      })),
      ctx.locationId,
    );
    if (!selected) return [];
    return [
      {
        id: selected.account.id,
        provider: APP_PROVIDER_BY_ACCOUNT[provider],
        status: selected.grant ? selected.account.status : "DISCONNECTED",
        scopes: selected.grant?.scopes ?? [],
        metadata: {
          providerAccountId: selected.account.id,
          externalAccountId: selected.account.externalAccountId,
          channelId: selected.config?.channelId ?? null,
          guildId: selected.config?.guildId ?? null,
        },
      },
    ];
  });
}

export async function listScopedOAuthAccountOptions(
  ctx: ScopedAppContext,
  spec: OAuthAppSpec,
) {
  await requireProviderManager(ctx);
  const [scopedAccounts, linkedAccounts] = await Promise.all([
    listVisibleAccounts(ctx, spec.provider),
    listLinkedAccounts(spec),
  ]);
  const accountByLinkedId = new Map(
    scopedAccounts.flatMap((row) => {
      const ids = [row.grant?.oauthAccountId].filter((id): id is string =>
        Boolean(id),
      );
      return ids.map((id) => [id, row.account] as const);
    }),
  );
  const accountByExternalId = new Map(
    scopedAccounts.flatMap((row) =>
      row.account.externalAccountId
        ? [[row.account.externalAccountId, row.account] as const]
        : [],
    ),
  );
  const requiredScopes = new Set(spec.requiredScopes);

  return {
    accounts: scopedAccounts.map((row) => {
      const linkedAccount = linkedAccounts.find(
        (candidate) =>
          candidate.id === row.grant?.oauthAccountId ||
          candidate.accountId === row.account.externalAccountId,
      );
      const linkedScopes = new Set(linkedAccount?.scopes ?? []);
      return {
        id: row.account.id,
        displayName: row.account.displayName,
        accountHint: row.account.externalAccountId
          ? redactOAuthAccountIdentifier(row.account.externalAccountId)
          : "Linked account unavailable",
        status: row.grant ? row.account.status : "DISCONNECTED",
        isDefault: row.account.isDefault,
        inherited: row.account.locationId !== ctx.locationId,
        lastHealthCheckAt: row.account.lastHealthCheckAt,
        lastSuccessAt: row.account.lastSuccessAt,
        lastErrorCode:
          row.account.lastErrorCode ??
          (row.grant ? null : "OAUTH_ACCOUNT_MISSING"),
        linkedAccountId: linkedAccount?.id ?? null,
        canReconnect: Boolean(
          linkedAccount &&
            row.account.locationId === ctx.locationId &&
            Array.from(requiredScopes).every((scope) =>
              linkedScopes.has(scope),
            ),
        ),
      };
    }),
    linkedAccounts: linkedAccounts.map((linkedAccount) => {
      const boundAccount =
        accountByLinkedId.get(linkedAccount.id) ??
        accountByExternalId.get(linkedAccount.accountId) ??
        null;
      const grantedScopes = new Set(linkedAccount.scopes);
      return {
        id: linkedAccount.id,
        accountHint: redactOAuthAccountIdentifier(linkedAccount.accountId),
        boundProviderAccountId: boundAccount?.id ?? null,
        hasRequiredScopes: Array.from(requiredScopes).every((scope) =>
          grantedScopes.has(scope),
        ),
      };
    }),
  };
}

export async function getScopedConnectedProviders(
  ctx: ScopedAppContext,
): Promise<AppProviderType[]> {
  const apps = await listScopedOAuthApps(ctx);
  const activeApps = apps.filter((app) => app.status === "ACTIVE");
  const providers = new Set(activeApps.map((app) => app.provider));
  const google = activeApps.find((app) => app.provider === AppProvider.GOOGLE);
  if (google) {
    providers.add(AppProvider.GOOGLE_CALENDAR);
    providers.add(AppProvider.GMAIL);
    providers.add(AppProvider.GOOGLE_DRIVE);
    providers.add(AppProvider.GOOGLE_FORMS);
  }
  if (providers.has(AppProvider.MICROSOFT)) {
    providers.add(AppProvider.OUTLOOK);
    providers.add(AppProvider.ONEDRIVE);
  }
  return Array.from(providers);
}

export async function syncScopedOAuthAccount(
  ctx: ScopedAppContext,
  spec: OAuthAppSpec,
  selection: { providerAccountId?: string; linkedAccountId?: string } = {},
  retryUniqueConflict = true,
): Promise<{ connected: boolean; missingScopes?: boolean }> {
  const organizationId = await requireProviderManager(ctx);
  const [existingAccounts, linkedAccounts] = await Promise.all([
    listExactAccounts(ctx, spec.provider),
    listLinkedAccounts(spec),
  ]);
  const selected = selectOAuthAccountBinding({
    scopedAccounts: existingAccounts.map((row) => ({
      id: row.account.id,
      externalAccountId: row.account.externalAccountId,
      grant: row.grant ? { oauthAccountId: row.grant.oauthAccountId } : null,
    })),
    linkedAccounts,
    ...selection,
  });

  if (selected.kind === "missing") {
    if (selected.account) {
      await db
        .update(providerAccount)
        .set({
          status: "DISCONNECTED",
          lastErrorCode: "OAUTH_ACCOUNT_MISSING",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(providerAccount.id, selected.account.id),
            eq(providerAccount.organizationId, organizationId),
            exactLocationCondition(ctx.locationId),
            eq(providerAccount.provider, spec.provider),
          ),
        );
    }
    return { connected: false };
  }
  if (selected.kind === "ambiguous") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `Choose which ${spec.displayName} account belongs to this workspace.`,
    });
  }
  const linkedAccount = selected.linkedAccount;
  const existing =
    selected.kind === "existing"
      ? (existingAccounts.find(
          (row) => row.account.id === selected.account.id,
        ) ?? null)
      : null;
  const scopeSet = new Set(linkedAccount.scopes);
  if (spec.requiredScopes.some((scope) => !scopeSet.has(scope))) {
    if (existing) {
      await db
        .update(providerAccount)
        .set({
          status: "DISCONNECTED",
          lastErrorCode: "OAUTH_SCOPES_MISSING",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(providerAccount.id, existing.account.id),
            eq(providerAccount.organizationId, organizationId),
            exactLocationCondition(ctx.locationId),
            eq(providerAccount.provider, spec.provider),
          ),
        );
    }
    return { connected: false, missingScopes: true };
  }
  const providerAccountId = existing?.account.id ?? createId();

  try {
    await db.transaction(async (tx) => {
      const currentConfig = existing
        ? oauthProviderConfigSchema.safeParse(existing.account.config)
        : null;
      if (existing) {
        await tx
          .update(providerAccount)
          .set({
            displayName: spec.displayName,
            externalAccountId: linkedAccount.accountId,
            capabilities: [spec.appProvider],
            config: currentConfig?.success
              ? currentConfig.data
              : oauthProviderConfigSchema.parse({}),
            status: "ACTIVE",
            lastErrorCode: null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(providerAccount.id, providerAccountId),
              eq(providerAccount.organizationId, organizationId),
              exactLocationCondition(ctx.locationId),
              eq(providerAccount.provider, spec.provider),
            ),
          );
      } else {
        await tx.insert(providerAccount).values({
          id: providerAccountId,
          organizationId,
          locationId: ctx.locationId,
          provider: spec.provider,
          displayName: spec.displayName,
          externalAccountId: linkedAccount.accountId,
          encryptedSecret: null,
          capabilities: [spec.appProvider],
          config: oauthProviderConfigSchema.parse({}),
          createdByUserId: ctx.auth.user.id,
          isDefault: !existingAccounts.some((row) => row.account.isDefault),
        });
      }
      await tx
        .insert(providerOAuthGrant)
        .values({
          providerAccountId,
          oauthAccountId: linkedAccount.id,
          oauthProviderId: spec.authProviderId,
          authorizedByUserId: ctx.auth.user.id,
          scopes: linkedAccount.scopes,
        })
        .onConflictDoUpdate({
          target: providerOAuthGrant.providerAccountId,
          set: {
            oauthAccountId: linkedAccount.id,
            oauthProviderId: spec.authProviderId,
            authorizedByUserId: ctx.auth.user.id,
            scopes: linkedAccount.scopes,
            updatedAt: new Date(),
          },
        });
    });
  } catch (error) {
    const constraint = getPostgresConstraint(error);
    if (
      retryUniqueConflict &&
      constraint &&
      RETRYABLE_OAUTH_ACCOUNT_CONSTRAINTS.has(constraint)
    ) {
      return syncScopedOAuthAccount(
        ctx,
        spec,
        { linkedAccountId: linkedAccount.id },
        false,
      );
    }
    throw error;
  }
  const grant = await resolveOAuthProviderGrant({
    providerAccountId,
    provider: spec.provider,
    scope: { organizationId, locationId: ctx.locationId },
    requiredScopes: spec.requiredScopes,
  });
  const connected = await verifyOAuthConnection({
    provider: spec.provider,
    grant,
  });
  return { connected };
}

export async function resolveScopedAppGrant(
  ctx: ScopedAppContext,
  provider: OAuthProviderAccount,
  requiredScopes: readonly string[] = [],
  providerAccountId?: string,
) {
  const organizationId = requireOrganization(ctx);
  const grant = await resolveOAuthProviderGrant({
    providerAccountId,
    provider,
    scope: { organizationId, locationId: ctx.locationId },
    requiredScopes,
  });
  return grant;
}

export async function updateScopedOAuthConfig(input: {
  ctx: ScopedAppContext;
  provider: OAuthProviderAccount;
  providerAccountId: string;
  config: { channelId?: string; guildId?: string };
}): Promise<void> {
  const organizationId = await requireProviderManager(input.ctx);
  const row = (await listExactAccounts(input.ctx, input.provider)).find(
    (candidate) => candidate.account.id === input.providerAccountId,
  );
  if (!row) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Connected app not found",
    });
  }
  const current = oauthProviderConfigSchema.parse(row.account.config);
  await db
    .update(providerAccount)
    .set({
      config: { ...current, ...input.config },
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(providerAccount.id, row.account.id),
        eq(providerAccount.organizationId, organizationId),
        exactLocationCondition(input.ctx.locationId),
        eq(providerAccount.provider, input.provider),
      ),
    );
}
