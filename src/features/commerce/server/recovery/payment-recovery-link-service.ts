import "server-only";

import { createHash, createHmac, randomUUID } from "crypto";
import { and, eq, gt, isNull } from "drizzle-orm";

import { db } from "@/db";
import { paymentRecoveryCase, paymentRecoveryLink } from "@/db/schema";

function recoveryTokenSecret(): string {
  const secret =
    process.env.RECOVERY_TOKEN_SECRET ?? process.env.ENCRYPTION_KEY;
  if (!secret || secret.length < 16) {
    throw new Error("Recovery token encryption key is not configured");
  }
  return secret;
}

function deterministicToken(actionId: string): string {
  return createHmac("sha256", recoveryTokenSecret())
    .update(`payment-recovery:${actionId}`)
    .digest("base64url");
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function issuePaymentRecoveryLink(input: {
  actionId: string;
  caseId: string;
  organizationId: string;
  locationId: string | null;
  purpose: "UPDATE_PAYMENT" | "RETRY_CHECKOUT";
  expiresAt: Date;
}): Promise<{ token: string; expiresAt: Date }> {
  const token = deterministicToken(input.actionId);
  const hash = tokenHash(token);
  const [created] = await db
    .insert(paymentRecoveryLink)
    .values({
      id: randomUUID(),
      organizationId: input.organizationId,
      locationId: input.locationId,
      caseId: input.caseId,
      tokenHash: hash,
      purpose: input.purpose,
      expiresAt: input.expiresAt,
    })
    .onConflictDoNothing({ target: paymentRecoveryLink.tokenHash })
    .returning({ expiresAt: paymentRecoveryLink.expiresAt });
  if (created) return { token, expiresAt: created.expiresAt };

  const [existing] = await db
    .select({
      organizationId: paymentRecoveryLink.organizationId,
      locationId: paymentRecoveryLink.locationId,
      caseId: paymentRecoveryLink.caseId,
      purpose: paymentRecoveryLink.purpose,
      expiresAt: paymentRecoveryLink.expiresAt,
    })
    .from(paymentRecoveryLink)
    .where(eq(paymentRecoveryLink.tokenHash, hash))
    .limit(1);
  if (
    !existing ||
    existing.organizationId !== input.organizationId ||
    existing.locationId !== input.locationId ||
    existing.caseId !== input.caseId ||
    existing.purpose !== input.purpose
  ) {
    throw new Error("Payment recovery link identity conflict");
  }
  return { token, expiresAt: existing.expiresAt };
}

export async function getPaymentRecoveryLink(token: string) {
  const selected = await db
    .select({
      linkId: paymentRecoveryLink.id,
      organizationId: paymentRecoveryLink.organizationId,
      locationId: paymentRecoveryLink.locationId,
      caseId: paymentRecoveryLink.caseId,
      purpose: paymentRecoveryLink.purpose,
      expiresAt: paymentRecoveryLink.expiresAt,
      usedAt: paymentRecoveryLink.usedAt,
      target: paymentRecoveryCase.target,
      status: paymentRecoveryCase.status,
      clientId: paymentRecoveryCase.clientId,
      invoiceId: paymentRecoveryCase.invoiceId,
      membershipId: paymentRecoveryCase.membershipId,
      bookingId: paymentRecoveryCase.bookingId,
      studioBookingId: paymentRecoveryCase.studioBookingId,
      commerceOperationId: paymentRecoveryCase.commerceOperationId,
      stripeConnectionId: paymentRecoveryCase.stripeConnectionId,
      providerAccountRef: paymentRecoveryCase.providerAccountRef,
      amountMinor: paymentRecoveryCase.amountMinor,
      currency: paymentRecoveryCase.currency,
      currencyExponent: paymentRecoveryCase.currencyExponent,
    })
    .from(paymentRecoveryLink)
    .innerJoin(
      paymentRecoveryCase,
      eq(paymentRecoveryCase.id, paymentRecoveryLink.caseId),
    )
    .where(
      and(
        eq(paymentRecoveryLink.tokenHash, tokenHash(token)),
        gt(paymentRecoveryLink.expiresAt, new Date()),
        isNull(paymentRecoveryLink.revokedAt),
      ),
    )
    .limit(1);
  return selected[0] ?? null;
}
