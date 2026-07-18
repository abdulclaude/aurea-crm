import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { location, organization, stripeConnection } from "@/db/schema";
import type { StripeConnectContext } from "./authorization";

export type StripeConnectAccountSnapshot = {
  stripeAccountId: string;
  accountType: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  email: string | null;
  businessName: string | null;
  country: string | null;
  currency: string | null;
};

export class StripeAccountAlreadyBoundError extends Error {
  public constructor() {
    super("This Stripe account is already connected to another workspace");
    this.name = "StripeAccountAlreadyBoundError";
  }
}

export async function upsertStripeConnectAccount(
  context: StripeConnectContext,
  account: StripeConnectAccountSnapshot,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [lockedOrganization] = await tx
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.id, context.organizationId))
      .for("update")
      .limit(1);

    if (!lockedOrganization) {
      throw new Error("Stripe Connect target organization no longer exists");
    }

    if (context.locationId) {
      const [targetLocation] = await tx
        .select({ id: location.id })
        .from(location)
        .where(
          and(
            eq(location.id, context.locationId),
            eq(location.organizationId, context.organizationId),
          ),
        )
        .for("update")
        .limit(1);

      if (!targetLocation) {
        throw new Error("Stripe Connect target location no longer exists");
      }
    }

    const [accountBinding] = await tx
      .select({
        id: stripeConnection.id,
        organizationId: stripeConnection.organizationId,
        locationId: stripeConnection.locationId,
      })
      .from(stripeConnection)
      .where(eq(stripeConnection.stripeAccountId, account.stripeAccountId))
      .for("update")
      .limit(1);

    if (
      accountBinding &&
      (accountBinding.organizationId !== context.organizationId ||
        accountBinding.locationId !== context.locationId)
    ) {
      throw new StripeAccountAlreadyBoundError();
    }

    const targetScope = context.locationId
      ? and(
          eq(stripeConnection.organizationId, context.organizationId),
          eq(stripeConnection.locationId, context.locationId),
          eq(stripeConnection.isActive, true),
        )
      : and(
          eq(stripeConnection.organizationId, context.organizationId),
          isNull(stripeConnection.locationId),
          eq(stripeConnection.isActive, true),
        );
    const [targetBinding] = await tx
      .select({
        id: stripeConnection.id,
        stripeAccountId: stripeConnection.stripeAccountId,
      })
      .from(stripeConnection)
      .where(targetScope)
      .for("update")
      .limit(1);

    const now = new Date();
    const values = {
      accountType: account.accountType,
      accessToken: null,
      refreshToken: null,
      isActive: true,
      chargesEnabled: account.chargesEnabled,
      payoutsEnabled: account.payoutsEnabled,
      detailsSubmitted: account.detailsSubmitted,
      email: account.email,
      businessName: account.businessName,
      country: account.country,
      currency: account.currency,
      lastSyncedAt: now,
      updatedAt: now,
    };

    if (targetBinding?.stripeAccountId === account.stripeAccountId) {
      await tx
        .update(stripeConnection)
        .set(values)
        .where(eq(stripeConnection.id, targetBinding.id));
      return;
    }

    if (targetBinding) {
      await tx
        .update(stripeConnection)
        .set({ isActive: false, updatedAt: now })
        .where(eq(stripeConnection.id, targetBinding.id));
    }

    if (accountBinding) {
      await tx
        .update(stripeConnection)
        .set(values)
        .where(eq(stripeConnection.id, accountBinding.id));
      return;
    }

    await tx.insert(stripeConnection).values({
      id: createId(),
      organizationId: context.organizationId,
      locationId: context.locationId,
      stripeAccountId: account.stripeAccountId,
      ...values,
      createdAt: now,
    });
  });
}
