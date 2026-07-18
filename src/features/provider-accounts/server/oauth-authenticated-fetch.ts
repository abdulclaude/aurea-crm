import "server-only";

import type { ResolvedOAuthGrant } from "./oauth-resolver";
import {
  classifyOAuthProviderResponseFailure,
  oauthProviderHealthErrorCodes,
} from "../lib/oauth-provider-health";
import {
  recordOAuthProviderHealthFailure,
  recordOAuthProviderHealthSuccess,
} from "./oauth-provider-health";

export async function oauthAuthenticatedFetch(
  grant: Pick<ResolvedOAuthGrant, "healthTarget">,
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch (error) {
    await recordOAuthProviderHealthFailure({
      target: grant.healthTarget,
      failure: {
        kind: "TRANSIENT",
        errorCode: oauthProviderHealthErrorCodes.tokenTemporarilyUnavailable,
      },
    });
    throw error;
  }

  const failure = classifyOAuthProviderResponseFailure(response.status);
  if (failure) {
    await recordOAuthProviderHealthFailure({
      target: grant.healthTarget,
      failure,
    });
  } else {
    const remainedConnected = await recordOAuthProviderHealthSuccess({
      target: grant.healthTarget,
    });
    if (!remainedConnected) {
      throw new Error("The connected provider account is no longer available.");
    }
  }
  return response;
}

export function recordOAuthProviderAuthenticationFailure(
  grant: Pick<ResolvedOAuthGrant, "healthTarget">,
): Promise<void> {
  return recordOAuthProviderHealthFailure({
    target: grant.healthTarget,
    failure: {
      kind: "REAUTHORIZATION_REQUIRED",
      errorCode: oauthProviderHealthErrorCodes.reauthorizationRequired,
    },
  });
}
