import "server-only";

import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import { providerAccount } from "@/db/schema";
import {
  type AdConversionConfig,
  type AdConversionProvider,
  type AdConversionSecret,
  adConversionProviderSchema,
  adConversionSecretSchema,
  parseAdConversionConfig,
} from "@/features/provider-accounts/contracts";
import {
  chooseDefaultProviderAccount,
  providerAccountMatchesScope,
  type ProviderAccountScope,
} from "@/features/provider-accounts/lib/scope-policy";
import { decrypt } from "@/lib/encryption";

export type ResolvedAdConversionAccount = {
  id: string;
  organizationId: string;
  locationId: string | null;
  provider: AdConversionProvider;
  config: AdConversionConfig;
  secret: AdConversionSecret;
};

const AD_PROVIDERS = adConversionProviderSchema.options;

export async function resolveAdConversionAccounts(
  scope: ProviderAccountScope,
): Promise<ResolvedAdConversionAccount[]> {
  const rows = await db
    .select()
    .from(providerAccount)
    .where(
      and(
        eq(providerAccount.organizationId, scope.organizationId),
        inArray(providerAccount.provider, AD_PROVIDERS),
        eq(providerAccount.isDefault, true),
        eq(providerAccount.status, "ACTIVE"),
        scope.locationId
          ? or(
              eq(providerAccount.locationId, scope.locationId),
              isNull(providerAccount.locationId),
            )
          : isNull(providerAccount.locationId),
      ),
    );

  return AD_PROVIDERS.flatMap((provider) => {
    const candidates = rows
      .filter((row) => row.provider === provider)
      .map((row) => {
        const config = parseConfigSafely(provider, row.config);
        return {
          row,
          config,
          organizationId: row.organizationId,
          locationId: row.locationId,
          inheritToLocations: config?.inheritToLocations ?? false,
        };
      });
    const selected = chooseDefaultProviderAccount(candidates, scope);
    return selected ? [parseResolvedAccount(selected.row, provider, selected.config)] : [];
  });
}

export async function revalidateAdConversionAccount(input: {
  providerAccountId: string;
  provider: AdConversionProvider;
  scope: ProviderAccountScope;
}): Promise<ResolvedAdConversionAccount> {
  const [row] = await db
    .select()
    .from(providerAccount)
    .where(
      and(
        eq(providerAccount.id, input.providerAccountId),
        eq(providerAccount.organizationId, input.scope.organizationId),
        eq(providerAccount.provider, input.provider),
        eq(providerAccount.status, "ACTIVE"),
      ),
    )
    .limit(1);
  if (!row) throw unavailableAccountError();

  const config = parseConfigSafely(input.provider, row.config);
  if (
    !config ||
    !providerAccountMatchesScope(
      {
        organizationId: row.organizationId,
        locationId: row.locationId,
        inheritToLocations: config.inheritToLocations,
      },
      input.scope,
    )
  ) {
    throw unavailableAccountError();
  }
  return parseResolvedAccount(row, input.provider, config);
}

function parseConfigSafely(
  provider: AdConversionProvider,
  value: unknown,
): AdConversionConfig | null {
  try {
    return parseAdConversionConfig(provider, value);
  } catch {
    return null;
  }
}

function parseResolvedAccount(
  row: typeof providerAccount.$inferSelect,
  provider: AdConversionProvider,
  parsedConfig: AdConversionConfig | null,
): ResolvedAdConversionAccount {
  if (!parsedConfig || !row.encryptedSecret) {
    throw invalidAccountError();
  }

  let decrypted: unknown;
  try {
    decrypted = JSON.parse(decrypt(row.encryptedSecret)) as unknown;
  } catch {
    throw invalidAccountError();
  }
  const secret = adConversionSecretSchema.safeParse(decrypted);
  if (!secret.success || secret.data.provider !== provider) {
    throw invalidAccountError();
  }

  return {
    id: row.id,
    organizationId: row.organizationId,
    locationId: row.locationId,
    provider,
    config: parsedConfig,
    secret: secret.data,
  };
}

function invalidAccountError(): TRPCError {
  return new TRPCError({
    code: "PRECONDITION_FAILED",
    message: "An ad conversion provider account has invalid configuration.",
  });
}

function unavailableAccountError(): TRPCError {
  return new TRPCError({
    code: "PRECONDITION_FAILED",
    message: "The ad conversion provider account is no longer available.",
  });
}
