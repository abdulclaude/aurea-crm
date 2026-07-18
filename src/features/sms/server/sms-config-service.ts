import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { providerAccount, smsConfig } from "@/db/schema";
import { smsProviderConfigSchema } from "@/features/provider-accounts/contracts";
import type { SaveSmsConfigInput } from "@/features/sms/contracts";
import { findScopedSmsConfig } from "@/features/sms/server/sms-config";
import { encrypt } from "@/lib/encryption";

type SmsConfigScope = {
  organizationId: string;
  locationId: string | null;
  userId: string;
};

function exactSmsConfigLocation(locationId: string | null) {
  return locationId
    ? eq(smsConfig.locationId, locationId)
    : isNull(smsConfig.locationId);
}

function exactProviderLocation(locationId: string | null) {
  return locationId
    ? eq(providerAccount.locationId, locationId)
    : isNull(providerAccount.locationId);
}

export async function saveSmsConfig(
  scope: SmsConfigScope,
  input: SaveSmsConfigInput,
) {
  const now = new Date();
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({
        configId: smsConfig.id,
        accountId: providerAccount.id,
        provider: providerAccount.provider,
        externalAccountId: providerAccount.externalAccountId,
      })
      .from(smsConfig)
      .innerJoin(
        providerAccount,
        eq(providerAccount.id, smsConfig.providerAccountId),
      )
      .where(
        and(
          eq(smsConfig.organizationId, scope.organizationId),
          exactSmsConfigLocation(scope.locationId),
          eq(providerAccount.organizationId, scope.organizationId),
          exactProviderLocation(scope.locationId),
        ),
      )
      .limit(1)
      .for("update");
    const sameProvider = existing?.provider === input.provider;
    if (!sameProvider && !input.secret) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "A provider secret is required for a new SMS account.",
      });
    }
    const externalAccountId =
      input.accountIdentifier ||
      (sameProvider ? existing?.externalAccountId : null);
    if (input.provider !== "MESSAGEBIRD" && !externalAccountId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "An account identifier is required for this provider.",
      });
    }
    const accountConfig = smsProviderConfigSchema.parse({
      fromNumber: input.fromNumber,
      inheritToLocations: input.inheritToLocations,
    });

    let providerAccountId: string;
    if (existing && sameProvider) {
      providerAccountId = existing.accountId;
      await tx
        .update(providerAccount)
        .set({
          displayName: input.displayName,
          externalAccountId,
          encryptedSecret: input.secret ? encrypt(input.secret) : undefined,
          status: "ACTIVE",
          isDefault: true,
          capabilities: ["sms.send"],
          config: accountConfig,
          lastErrorCode: null,
          updatedAt: now,
        })
        .where(
          and(
            eq(providerAccount.id, existing.accountId),
            eq(providerAccount.organizationId, scope.organizationId),
            exactProviderLocation(scope.locationId),
          ),
        );
    } else {
      if (existing) {
        await tx
          .update(providerAccount)
          .set({ status: "DISCONNECTED", isDefault: false, updatedAt: now })
          .where(eq(providerAccount.id, existing.accountId));
      }
      await tx
        .update(providerAccount)
        .set({ isDefault: false, updatedAt: now })
        .where(
          and(
            eq(providerAccount.organizationId, scope.organizationId),
            eq(providerAccount.provider, input.provider),
            exactProviderLocation(scope.locationId),
            eq(providerAccount.isDefault, true),
          ),
        );
      providerAccountId = createId();
      await tx.insert(providerAccount).values({
        id: providerAccountId,
        organizationId: scope.organizationId,
        locationId: scope.locationId,
        provider: input.provider,
        displayName: input.displayName,
        externalAccountId,
        encryptedSecret: encrypt(input.secret),
        environment: "live",
        status: "ACTIVE",
        isDefault: true,
        capabilities: ["sms.send"],
        config: accountConfig,
        createdByUserId: scope.userId,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (existing) {
      await tx
        .update(smsConfig)
        .set({
          providerAccountId,
          fromNumber: input.fromNumber,
          isActive: true,
          monthlyLimit: input.monthlyLimit,
          updatedAt: now,
        })
        .where(
          and(
            eq(smsConfig.id, existing.configId),
            eq(smsConfig.organizationId, scope.organizationId),
            exactSmsConfigLocation(scope.locationId),
          ),
        );
    } else {
      await tx.insert(smsConfig).values({
        id: createId(),
        organizationId: scope.organizationId,
        locationId: scope.locationId,
        providerAccountId,
        fromNumber: input.fromNumber,
        isActive: true,
        monthlyLimit: input.monthlyLimit,
        createdAt: now,
        updatedAt: now,
      });
    }
  });

  return findScopedSmsConfig({
    organizationId: scope.organizationId,
    locationId: scope.locationId,
    includeInactive: true,
  });
}

export async function disconnectSmsConfig(
  scope: Omit<SmsConfigScope, "userId">,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({
        configId: smsConfig.id,
        providerAccountId: smsConfig.providerAccountId,
      })
      .from(smsConfig)
      .where(
        and(
          eq(smsConfig.organizationId, scope.organizationId),
          exactSmsConfigLocation(scope.locationId),
        ),
      )
      .limit(1)
      .for("update");
    if (!existing) return false;
    const now = new Date();
    await tx
      .update(smsConfig)
      .set({ isActive: false, updatedAt: now })
      .where(eq(smsConfig.id, existing.configId));
    await tx
      .update(providerAccount)
      .set({ status: "DISCONNECTED", updatedAt: now })
      .where(
        and(
          eq(providerAccount.id, existing.providerAccountId),
          eq(providerAccount.organizationId, scope.organizationId),
          exactProviderLocation(scope.locationId),
        ),
      );
    return true;
  });
}
