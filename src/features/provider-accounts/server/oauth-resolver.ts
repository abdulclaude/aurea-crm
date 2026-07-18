import "server-only";

import { TRPCError } from "@trpc/server";
import { and, eq, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import { providerAccount, providerOAuthGrant } from "@/db/schema";
import {
  oauthProviderAccountSchema,
  oauthProviderConfigSchema,
  type OAuthProviderAccount,
} from "@/features/provider-accounts/contracts";
import {
  chooseDefaultProviderAccount,
  providerAccountMatchesExactScope,
  providerAccountMatchesScope,
  type ProviderAccountScope,
} from "@/features/provider-accounts/lib/scope-policy";
import {
  classifyOAuthProviderTokenFailure,
  oauthProviderHealthErrorCodes,
} from "@/features/provider-accounts/lib/oauth-provider-health";
import {
  recordOAuthProviderHealthFailure,
  type OAuthProviderHealthTarget,
} from "@/features/provider-accounts/server/oauth-provider-health";
import { auth } from "@/lib/auth";

export type ResolvedOAuthGrant = {
  providerAccountId: string;
  accessToken: string;
  scopes: string[];
  healthTarget: OAuthProviderHealthTarget;
};

export async function resolveOAuthProviderGrant(input: {
  providerAccountId?: string | null;
  provider: OAuthProviderAccount;
  scope: ProviderAccountScope;
  requiredScopes?: readonly string[];
  allowInherited?: boolean;
}): Promise<ResolvedOAuthGrant> {
  oauthProviderAccountSchema.parse(input.provider);
  const rows = await db
    .select({ account: providerAccount, grant: providerOAuthGrant })
    .from(providerAccount)
    .innerJoin(
      providerOAuthGrant,
      eq(providerOAuthGrant.providerAccountId, providerAccount.id),
    )
    .where(
      and(
        eq(providerAccount.organizationId, input.scope.organizationId),
        eq(providerAccount.provider, input.provider),
        input.providerAccountId
          ? eq(providerAccount.id, input.providerAccountId)
          : eq(providerAccount.isDefault, true),
        input.scope.locationId
          ? or(
              eq(providerAccount.locationId, input.scope.locationId),
              isNull(providerAccount.locationId),
            )
          : isNull(providerAccount.locationId),
      ),
    );

  const candidates = rows.map((row) => {
    const config = oauthProviderConfigSchema.safeParse(row.account.config);
    return {
      ...row,
      organizationId: row.account.organizationId,
      locationId: row.account.locationId,
      inheritToLocations: config.success
        ? config.data.inheritToLocations
        : false,
    };
  });
  const matchesRequestedScope = input.allowInherited === false
    ? providerAccountMatchesExactScope
    : providerAccountMatchesScope;
  const selected = input.providerAccountId
    ? candidates.find((candidate) =>
        matchesRequestedScope(candidate, input.scope),
      ) ?? null
    : input.allowInherited === false
      ? candidates.find((candidate) =>
          providerAccountMatchesExactScope(candidate, input.scope),
        ) ?? null
      : chooseDefaultProviderAccount(candidates, input.scope);

  if (
    !selected ||
    !["ACTIVE", "DEGRADED"].includes(selected.account.status)
  ) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `Connect a ${input.provider} account for this workspace first.`,
    });
  }

  const healthTarget: OAuthProviderHealthTarget = {
    id: selected.account.id,
    organizationId: selected.account.organizationId,
    locationId: selected.account.locationId,
    provider: input.provider,
  };

  const grantedScopes = new Set(selected.grant.scopes);
  const missingScopes = (input.requiredScopes ?? []).filter(
    (scope) => !grantedScopes.has(scope),
  );
  if (missingScopes.length > 0) {
    await recordOAuthProviderHealthFailure({
      target: healthTarget,
      failure: {
        kind: "REAUTHORIZATION_REQUIRED",
        errorCode: oauthProviderHealthErrorCodes.scopesMissing,
      },
    });
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The connected account is missing required permissions.",
    });
  }

  let token: Awaited<ReturnType<typeof auth.api.getAccessToken>>;
  try {
    token = await auth.api.getAccessToken({
      body: {
        providerId: selected.grant.oauthProviderId,
        accountId: selected.grant.oauthAccountId,
        userId: selected.grant.authorizedByUserId,
      },
    });
  } catch (error) {
    const failure = classifyOAuthProviderTokenFailure(error);
    await recordOAuthProviderHealthFailure({ target: healthTarget, failure });
    throw new TRPCError({
      code:
        failure.kind === "REAUTHORIZATION_REQUIRED"
          ? "PRECONDITION_FAILED"
          : "SERVICE_UNAVAILABLE",
      message:
        failure.kind === "REAUTHORIZATION_REQUIRED"
          ? "The connected account must be reauthorized."
          : "The connected account is temporarily unavailable. Try again shortly.",
    });
  }
  if (!token?.accessToken) {
    await recordOAuthProviderHealthFailure({
      target: healthTarget,
      failure: {
        kind: "REAUTHORIZATION_REQUIRED",
        errorCode: oauthProviderHealthErrorCodes.reauthorizationRequired,
      },
    });
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The connected account must be reauthorized.",
    });
  }

  return {
    providerAccountId: selected.account.id,
    accessToken: token.accessToken,
    scopes: selected.grant.scopes,
    healthTarget,
  };
}
