import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { providerAccount } from "@/db/schema";
import { resendProviderConfigSchema } from "@/features/provider-accounts/contracts";
import {
  getPlatformResendApiCredentials,
  getPlatformResendSenderDefaults,
} from "./platform-credentials";

export async function ensurePlatformResendBinding(input: {
  organizationId: string;
  createdByUserId?: string | null;
}): Promise<typeof providerAccount.$inferSelect> {
  const [existing] = await db
    .select()
    .from(providerAccount)
    .where(
      and(
        eq(providerAccount.organizationId, input.organizationId),
        isNull(providerAccount.locationId),
        eq(providerAccount.provider, "RESEND"),
        eq(providerAccount.ownershipMode, "PLATFORM_MANAGED"),
      ),
    )
    .limit(1);
  if (existing) return existing;

  getPlatformResendApiCredentials();
  const senderDefaults = getPlatformResendSenderDefaults();
  const now = new Date();
  const created = await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${`${input.organizationId}:RESEND:PLATFORM_BINDING`}))`,
    );
    const [concurrent] = await tx
      .select()
      .from(providerAccount)
      .where(
        and(
          eq(providerAccount.organizationId, input.organizationId),
          isNull(providerAccount.locationId),
          eq(providerAccount.provider, "RESEND"),
          eq(providerAccount.ownershipMode, "PLATFORM_MANAGED"),
        ),
      )
      .limit(1);
    if (concurrent) return concurrent;
    const [currentDefault] = await tx
      .select({ id: providerAccount.id })
      .from(providerAccount)
      .where(
        and(
          eq(providerAccount.organizationId, input.organizationId),
          isNull(providerAccount.locationId),
          eq(providerAccount.provider, "RESEND"),
          eq(providerAccount.isDefault, true),
        ),
      )
      .limit(1);
    const [row] = await tx
      .insert(providerAccount)
      .values({
        id: createId(),
        organizationId: input.organizationId,
        locationId: null,
        provider: "RESEND",
        displayName: "Aurea managed email",
        ownershipMode: "PLATFORM_MANAGED",
        environment: "live",
        status: "ACTIVE",
        isDefault: !currentDefault,
        capabilities: ["email.send", "domain.manage", "template.read"],
        config: resendProviderConfigSchema.parse({
          ownershipMode: "PLATFORM_MANAGED",
          defaultFromEmail: senderDefaults.fallbackFromEmail ?? null,
          defaultFromName: senderDefaults.fallbackFromName ?? null,
          defaultReplyTo: senderDefaults.fallbackReplyTo ?? null,
          inheritToLocations: true,
        }),
        createdByUserId: input.createdByUserId ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return row ?? null;
  });
  if (created) return created;

  const [concurrent] = await db
    .select()
    .from(providerAccount)
    .where(
      and(
        eq(providerAccount.organizationId, input.organizationId),
        isNull(providerAccount.locationId),
        eq(providerAccount.provider, "RESEND"),
        eq(providerAccount.ownershipMode, "PLATFORM_MANAGED"),
      ),
    )
    .limit(1);
  if (!concurrent) {
    throw new Error("The managed Resend binding could not be initialized.");
  }
  return concurrent;
}
