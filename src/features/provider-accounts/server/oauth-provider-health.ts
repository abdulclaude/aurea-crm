import "server-only";

import { and, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/db";
import { providerAccount } from "@/db/schema";
import type { OAuthProviderAccount } from "@/features/provider-accounts/contracts";
import {
  getOAuthProviderFailureHealthState,
  getOAuthProviderSuccessHealthState,
  type OAuthProviderHealthFailure,
} from "@/features/provider-accounts/lib/oauth-provider-health";

export type OAuthProviderHealthTarget = {
  id: string;
  organizationId: string;
  locationId: string | null;
  provider: OAuthProviderAccount;
};

function targetCondition(target: OAuthProviderHealthTarget) {
  return and(
    eq(providerAccount.id, target.id),
    eq(providerAccount.organizationId, target.organizationId),
    target.locationId === null
      ? isNull(providerAccount.locationId)
      : eq(providerAccount.locationId, target.locationId),
    eq(providerAccount.provider, target.provider),
    inArray(providerAccount.status, ["ACTIVE", "DEGRADED"]),
  );
}

export async function recordOAuthProviderHealthFailure(input: {
  target: OAuthProviderHealthTarget;
  failure: OAuthProviderHealthFailure;
  checkedAt?: Date;
}): Promise<void> {
  const checkedAt = input.checkedAt ?? new Date();
  await db
    .update(providerAccount)
    .set({
      ...getOAuthProviderFailureHealthState(input.failure, checkedAt),
      updatedAt: checkedAt,
    })
    .where(targetCondition(input.target));
}

export async function recordOAuthProviderHealthSuccess(input: {
  target: OAuthProviderHealthTarget;
  checkedAt?: Date;
}): Promise<boolean> {
  const checkedAt = input.checkedAt ?? new Date();
  const rows = await db
    .update(providerAccount)
    .set({
      ...getOAuthProviderSuccessHealthState(checkedAt),
      updatedAt: checkedAt,
    })
    .where(targetCondition(input.target))
    .returning({ id: providerAccount.id });
  return rows.length === 1;
}
