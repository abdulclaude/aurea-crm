import "server-only";

import { TRPCError } from "@trpc/server";
import { and, eq, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import { providerAccount } from "@/db/schema";
import {
  resendProviderConfigSchema,
  type ResendProviderConfig,
  smsProviderConfigSchema,
  smsProviderSchema,
  type SmsProvider,
  type SmsProviderConfig,
} from "@/features/provider-accounts/contracts";
import { decrypt } from "@/lib/encryption";
import { getPlatformResendApiCredentials } from "@/features/communications/server/platform-credentials";
import {
  chooseDefaultProviderAccount,
  providerAccountMatchesScope,
  type ProviderAccountScope,
} from "@/features/provider-accounts/lib/scope-policy";

export type ResolvedProviderAccount = {
  id: string;
  organizationId: string;
  locationId: string | null;
  provider: "RESEND";
  ownershipMode: "PLATFORM_MANAGED" | "TENANT_MANAGED_LEGACY";
  secret: string;
  webhookSecret: string | null;
  config: ResendProviderConfig;
};

export type ResolvedSmsProviderAccount = {
  id: string;
  organizationId: string;
  locationId: string | null;
  provider: SmsProvider;
  externalAccountId: string | null;
  secret: string;
  config: SmsProviderConfig;
};

function parseResolvedAccount(
  row: typeof providerAccount.$inferSelect,
  requestedScope: ProviderAccountScope,
  allowInactive: boolean,
): ResolvedProviderAccount {
  const config = resendProviderConfigSchema.safeParse(row.config);
  if (row.provider !== "RESEND" || !config.success) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The provider account configuration is invalid.",
    });
  }
  if (
    row.ownershipMode === "TENANT_MANAGED_LEGACY" &&
    !row.encryptedSecret
  ) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The provider account secret is missing.",
    });
  }
  if (!allowInactive && row.status !== "ACTIVE") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The provider account is not active.",
    });
  }
  if (
    !providerAccountMatchesScope(
      {
        organizationId: row.organizationId,
        locationId: row.locationId,
        inheritToLocations: config.data.inheritToLocations,
      },
      requestedScope,
    )
  ) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Provider account not found in this workspace.",
    });
  }

  const platformCredentials =
    row.ownershipMode === "PLATFORM_MANAGED"
      ? getPlatformResendApiCredentials()
      : null;
  return {
    id: row.id,
    organizationId: row.organizationId,
    locationId: row.locationId,
    provider: "RESEND",
    ownershipMode: row.ownershipMode,
    secret: platformCredentials?.apiKey ?? decrypt(row.encryptedSecret!),
    webhookSecret:
      row.ownershipMode === "PLATFORM_MANAGED"
        ? null
        : row.encryptedWebhookSecret
        ? decrypt(row.encryptedWebhookSecret)
        : null,
    config: config.data,
  };
}

function parseResolvedSmsAccount(
  row: typeof providerAccount.$inferSelect,
  requestedScope: ProviderAccountScope,
  allowInactive: boolean,
): ResolvedSmsProviderAccount {
  const provider = smsProviderSchema.safeParse(row.provider);
  const config = smsProviderConfigSchema.safeParse(row.config);
  if (!provider.success || !config.success) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The SMS provider account configuration is invalid.",
    });
  }
  if (!row.encryptedSecret) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The SMS provider account secret is missing.",
    });
  }
  if (!allowInactive && row.status !== "ACTIVE") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The SMS provider account is not active.",
    });
  }
  if (
    !providerAccountMatchesScope(
      {
        organizationId: row.organizationId,
        locationId: row.locationId,
        inheritToLocations: config.data.inheritToLocations,
      },
      requestedScope,
    )
  ) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "SMS provider account not found in this workspace.",
    });
  }

  return {
    id: row.id,
    organizationId: row.organizationId,
    locationId: row.locationId,
    provider: provider.data,
    externalAccountId: row.externalAccountId,
    secret: decrypt(row.encryptedSecret),
    config: config.data,
  };
}

export async function resolveProviderAccount(input: {
  providerAccountId?: string | null;
  provider: "RESEND";
  scope: ProviderAccountScope;
  allowInactive?: boolean;
}): Promise<ResolvedProviderAccount> {
  const allowInactive = input.allowInactive ?? false;
  if (input.providerAccountId) {
    const [row] = await db
      .select()
      .from(providerAccount)
      .where(
        and(
          eq(providerAccount.id, input.providerAccountId),
          eq(providerAccount.organizationId, input.scope.organizationId),
          eq(providerAccount.provider, input.provider),
        ),
      )
      .limit(1);
    if (!row) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Provider account not found in this workspace.",
      });
    }
    return parseResolvedAccount(row, input.scope, allowInactive);
  }

  const candidates = await db
    .select()
    .from(providerAccount)
    .where(
      and(
        eq(providerAccount.organizationId, input.scope.organizationId),
        eq(providerAccount.provider, input.provider),
        eq(providerAccount.isDefault, true),
        input.scope.locationId
          ? or(
              eq(providerAccount.locationId, input.scope.locationId),
              isNull(providerAccount.locationId),
            )
          : isNull(providerAccount.locationId),
      ),
    );
  const parsedCandidates = candidates.map((candidate) => {
    const config = resendProviderConfigSchema.safeParse(candidate.config);
    return {
      row: candidate,
      organizationId: candidate.organizationId,
      locationId: candidate.locationId,
      inheritToLocations: config.success
        ? config.data.inheritToLocations
        : false,
    };
  });
  const row = chooseDefaultProviderAccount(parsedCandidates, input.scope)?.row;
  if (!row) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `Configure a ${input.provider} account for this workspace first.`,
    });
  }
  return parseResolvedAccount(row, input.scope, allowInactive);
}

export async function resolveSmsProviderAccount(input: {
  providerAccountId: string;
  scope: ProviderAccountScope;
  allowInactive?: boolean;
}): Promise<ResolvedSmsProviderAccount> {
  const [row] = await db
    .select()
    .from(providerAccount)
    .where(
      and(
        eq(providerAccount.id, input.providerAccountId),
        eq(providerAccount.organizationId, input.scope.organizationId),
      ),
    )
    .limit(1);
  if (!row) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "SMS provider account not found in this workspace.",
    });
  }
  return parseResolvedSmsAccount(
    row,
    input.scope,
    input.allowInactive ?? false,
  );
}

export async function resolveProviderAccountForWebhook(input: {
  providerAccountId: string;
  provider: "RESEND";
}): Promise<ResolvedProviderAccount> {
  const [row] = await db
    .select()
    .from(providerAccount)
    .where(
      and(
        eq(providerAccount.id, input.providerAccountId),
        eq(providerAccount.provider, input.provider),
      ),
    )
    .limit(1);
  if (!row) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Provider account not found.",
    });
  }
  return parseResolvedAccount(
    row,
    { organizationId: row.organizationId, locationId: row.locationId },
    true,
  );
}
