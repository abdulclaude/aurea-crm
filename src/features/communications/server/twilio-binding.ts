import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import {
  communicationProvisioningOperation,
  providerAccount,
} from "@/db/schema";
import { twilioPlatformProviderConfigSchema } from "@/features/provider-accounts/contracts";
import { requestCommunicationProvisioning } from "./provisioning";

export async function ensureTwilioPlatformBinding(input: {
  organizationId: string;
  createdByUserId: string;
}) {
  const [existing] = await db
    .select()
    .from(providerAccount)
    .where(
      and(
        eq(providerAccount.organizationId, input.organizationId),
        isNull(providerAccount.locationId),
        eq(providerAccount.provider, "TWILIO"),
        eq(providerAccount.ownershipMode, "PLATFORM_MANAGED"),
      ),
    )
    .limit(1);
  if (existing) return existing;

  const providerAccountId = createId();
  const operationId = createId();
  const friendlyName = `Aurea ${input.organizationId} ${providerAccountId}`.slice(
    0,
    64,
  );
  const created = await db.transaction(async (tx) => {
    await tx
      .update(providerAccount)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(
        and(
          eq(providerAccount.organizationId, input.organizationId),
          eq(providerAccount.provider, "TWILIO"),
          eq(providerAccount.isDefault, true),
        ),
      );
    const [account] = await tx
      .insert(providerAccount)
      .values({
        id: providerAccountId,
        organizationId: input.organizationId,
        locationId: null,
        provider: "TWILIO",
        displayName: "Aurea managed messaging",
        ownershipMode: "PLATFORM_MANAGED",
        environment: "live",
        status: "PROVISIONING",
        isDefault: true,
        capabilities: ["sms.send", "sms.receive", "voice.call"],
        config: twilioPlatformProviderConfigSchema.parse({
          ownershipMode: "PLATFORM_MANAGED",
          inheritToLocations: true,
        }),
        createdByUserId: input.createdByUserId,
      })
      .onConflictDoNothing()
      .returning();
    if (!account) return null;
    await tx.insert(communicationProvisioningOperation).values({
      id: operationId,
      organizationId: input.organizationId,
      providerAccountId,
      service: "TWILIO_SUBACCOUNT",
      operationType: "CREATE",
      idempotencyKey: `twilio-subaccount:create:${input.organizationId}`,
      safeInput: { kind: "TWILIO_SUBACCOUNT_CREATE", friendlyName },
      requestedByUserId: input.createdByUserId,
      nextAttemptAt: new Date(),
    });
    return account;
  });
  await requestCommunicationProvisioning(input.organizationId);
  if (created) return created;

  const [concurrent] = await db
    .select()
    .from(providerAccount)
    .where(
      and(
        eq(providerAccount.organizationId, input.organizationId),
        isNull(providerAccount.locationId),
        eq(providerAccount.provider, "TWILIO"),
        eq(providerAccount.ownershipMode, "PLATFORM_MANAGED"),
      ),
    )
    .limit(1);
  if (!concurrent) throw new Error("Managed Twilio provisioning could not start.");
  return concurrent;
}
