import "server-only";

import {
  classifyOAuthHealthPayload,
  getOAuthHealthEndpoint,
} from "@/features/apps/lib/oauth-health-contract";
import type { OAuthProviderAccount } from "@/features/provider-accounts/contracts";
import {
  oauthAuthenticatedFetch,
  recordOAuthProviderAuthenticationFailure,
} from "@/features/provider-accounts/server/oauth-authenticated-fetch";
import { oauthProviderHealthErrorCodes } from "@/features/provider-accounts/lib/oauth-provider-health";
import { recordOAuthProviderHealthFailure } from "@/features/provider-accounts/server/oauth-provider-health";
import type { ResolvedOAuthGrant } from "@/features/provider-accounts/server/oauth-resolver";

function recordTransientFailure(grant: ResolvedOAuthGrant): Promise<void> {
  return recordOAuthProviderHealthFailure({
    target: grant.healthTarget,
    failure: {
      kind: "TRANSIENT",
      errorCode: oauthProviderHealthErrorCodes.tokenTemporarilyUnavailable,
    },
  });
}

export async function verifyOAuthConnection(input: {
  provider: OAuthProviderAccount;
  grant: ResolvedOAuthGrant;
}): Promise<boolean> {
  const response = await oauthAuthenticatedFetch(
    input.grant,
    getOAuthHealthEndpoint(input.provider),
    {
      headers: { Authorization: `Bearer ${input.grant.accessToken}` },
      cache: "no-store",
    },
  );
  if (!response.ok) {
    await recordTransientFailure(input.grant);
    return false;
  }

  const payload: unknown = await response.json().catch(() => null);
  const state = classifyOAuthHealthPayload(input.provider, payload);
  if (state === "HEALTHY") return true;
  if (state === "REAUTHORIZATION_REQUIRED") {
    await recordOAuthProviderAuthenticationFailure(input.grant);
    return false;
  }
  await recordTransientFailure(input.grant);
  return false;
}
