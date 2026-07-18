import "server-only";

import { and, eq, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import { providerAccount, smsConfig } from "@/db/schema";
import {
  smsProviderConfigSchema,
  smsProviderSchema,
  type SmsProvider,
} from "@/features/provider-accounts/contracts";
import { providerAccountMatchesScope } from "@/features/provider-accounts/lib/scope-policy";

export type ScopedSmsConfig = {
  id: string;
  organizationId: string;
  locationId: string | null;
  providerAccountId: string;
  provider: SmsProvider;
  displayName: string;
  externalAccountId: string | null;
  fromNumber: string;
  isActive: boolean;
  monthlyLimit: number;
  sentThisMonth: number;
  lastResetAt: Date;
  createdAt: Date;
  updatedAt: Date;
  inherited: boolean;
  inheritToLocations: boolean;
};

export async function findScopedSmsConfig(input: {
  organizationId: string;
  locationId: string | null;
  includeInactive?: boolean;
}): Promise<ScopedSmsConfig | null> {
  const rows = await db
    .select({
      id: smsConfig.id,
      organizationId: smsConfig.organizationId,
      locationId: smsConfig.locationId,
      providerAccountId: smsConfig.providerAccountId,
      fromNumber: smsConfig.fromNumber,
      isActive: smsConfig.isActive,
      monthlyLimit: smsConfig.monthlyLimit,
      sentThisMonth: smsConfig.sentThisMonth,
      lastResetAt: smsConfig.lastResetAt,
      createdAt: smsConfig.createdAt,
      updatedAt: smsConfig.updatedAt,
      accountProvider: providerAccount.provider,
      accountDisplayName: providerAccount.displayName,
      externalAccountId: providerAccount.externalAccountId,
      accountStatus: providerAccount.status,
      accountConfig: providerAccount.config,
    })
    .from(smsConfig)
    .innerJoin(
      providerAccount,
      and(
        eq(providerAccount.id, smsConfig.providerAccountId),
        eq(providerAccount.organizationId, smsConfig.organizationId),
        or(
          and(
            isNull(providerAccount.locationId),
            isNull(smsConfig.locationId),
          ),
          eq(providerAccount.locationId, smsConfig.locationId),
        ),
      ),
    )
    .where(
      and(
        eq(smsConfig.organizationId, input.organizationId),
        input.locationId
          ? or(
              eq(smsConfig.locationId, input.locationId),
              isNull(smsConfig.locationId),
            )
          : isNull(smsConfig.locationId),
      ),
    );

  const candidates = rows.flatMap((row) => {
    const provider = smsProviderSchema.safeParse(row.accountProvider);
    const config = smsProviderConfigSchema.safeParse(row.accountConfig);
    if (!provider.success || !config.success) return [];
    if (
      !providerAccountMatchesScope(
        {
          organizationId: row.organizationId,
          locationId: row.locationId,
          inheritToLocations: config.data.inheritToLocations,
        },
        input,
      )
    ) {
      return [];
    }
    if (
      !input.includeInactive &&
      (!row.isActive || row.accountStatus !== "ACTIVE")
    ) {
      return [];
    }
    return [{ row, provider: provider.data, config: config.data }];
  });
  const selected =
    candidates.find(({ row }) => row.locationId === input.locationId) ??
    candidates.find(({ row }) => row.locationId === null);
  if (!selected) return null;

  return {
    id: selected.row.id,
    organizationId: selected.row.organizationId,
    locationId: selected.row.locationId,
    providerAccountId: selected.row.providerAccountId,
    provider: selected.provider,
    displayName: selected.row.accountDisplayName,
    externalAccountId: selected.row.externalAccountId,
    fromNumber: selected.row.fromNumber,
    isActive: selected.row.isActive,
    monthlyLimit: selected.row.monthlyLimit,
    sentThisMonth: selected.row.sentThisMonth,
    lastResetAt: selected.row.lastResetAt,
    createdAt: selected.row.createdAt,
    updatedAt: selected.row.updatedAt,
    inherited: Boolean(input.locationId && selected.row.locationId === null),
    inheritToLocations: selected.config.inheritToLocations,
  };
}
