import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { createId } from "@paralleldrive/cuid2";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { invoice, invoiceAccessToken } from "@/db/schema";
import type { InvoiceAccessPurpose } from "@/features/invoicing/lib/public-invoice-access";

const ACCESS_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const ACCESS_TOKEN_BYTES = 32;
const ACCESS_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export class PublicInvoiceAccessNotFoundError extends Error {
  constructor() {
    super("Invoice access is not available");
    this.name = "PublicInvoiceAccessNotFoundError";
  }
}

export async function issueInvoiceAccessToken(input: {
  invoiceId: string;
  organizationId: string;
  locationId: string | null;
  purpose: InvoiceAccessPurpose;
  createdBy: string | null;
  now?: Date;
}): Promise<{ token: string; expiresAt: Date }> {
  const now = input.now ?? new Date();
  const token = randomBytes(ACCESS_TOKEN_BYTES).toString("base64url");
  const tokenHash = hashInvoiceAccessToken(token);

  const expiresAt = await db.transaction(async (tx) => {
    const locationCondition = input.locationId
      ? eq(invoice.locationId, input.locationId)
      : isNull(invoice.locationId);
    const [ownedInvoice] = await tx
      .select({ id: invoice.id })
      .from(invoice)
      .where(
        and(
          eq(invoice.id, input.invoiceId),
          eq(invoice.organizationId, input.organizationId),
          locationCondition,
        ),
      )
      .limit(1)
      .for("share");

    if (!ownedInvoice) {
      throw new PublicInvoiceAccessNotFoundError();
    }

    const tokenExpiresAt = new Date(now.getTime() + ACCESS_TOKEN_TTL_MS);
    await tx.insert(invoiceAccessToken).values({
      id: createId(),
      invoiceId: input.invoiceId,
      organizationId: input.organizationId,
      locationId: input.locationId,
      purpose: input.purpose,
      tokenHash,
      expiresAt: tokenExpiresAt,
      createdBy: input.createdBy,
      updatedAt: now,
    });

    return tokenExpiresAt;
  });

  return { token, expiresAt };
}

export async function revokeInvoiceAccessTokens(input: {
  invoiceId: string;
  organizationId: string;
  locationId: string | null;
  revokedBy: string;
  purpose?: InvoiceAccessPurpose;
  now?: Date;
}): Promise<number> {
  const now = input.now ?? new Date();

  return db.transaction(async (tx) => {
    const locationCondition = input.locationId
      ? eq(invoice.locationId, input.locationId)
      : isNull(invoice.locationId);
    const [ownedInvoice] = await tx
      .select({ id: invoice.id })
      .from(invoice)
      .where(
        and(
          eq(invoice.id, input.invoiceId),
          eq(invoice.organizationId, input.organizationId),
          locationCondition,
        ),
      )
      .limit(1)
      .for("share");

    if (!ownedInvoice) {
      throw new PublicInvoiceAccessNotFoundError();
    }

    const conditions = [
      eq(invoiceAccessToken.invoiceId, input.invoiceId),
      eq(invoiceAccessToken.organizationId, input.organizationId),
      input.locationId
        ? eq(invoiceAccessToken.locationId, input.locationId)
        : isNull(invoiceAccessToken.locationId),
      isNull(invoiceAccessToken.revokedAt),
    ];
    if (input.purpose) {
      conditions.push(eq(invoiceAccessToken.purpose, input.purpose));
    }

    const revoked = await tx
      .update(invoiceAccessToken)
      .set({ revokedAt: now, revokedBy: input.revokedBy, updatedAt: now })
      .where(and(...conditions))
      .returning({ id: invoiceAccessToken.id });

    return revoked.length;
  });
}

export function buildPublicInvoiceUrl(input: {
  baseUrl: string;
  token: string;
  purpose: InvoiceAccessPurpose;
}): string {
  const baseUrl = new URL(input.baseUrl);
  const localHostnames = new Set(["localhost", "127.0.0.1", "::1"]);
  if (baseUrl.protocol !== "https:" && !localHostnames.has(baseUrl.hostname)) {
    throw new Error("Public invoice links require an HTTPS application URL");
  }
  const path = input.purpose === "PAY" ? "invoices/pay" : "invoices/view";
  return new URL(
    `/${path}/${encodeURIComponent(input.token)}`,
    baseUrl,
  ).toString();
}

export function isInvoiceAccessToken(value: string): boolean {
  return ACCESS_TOKEN_PATTERN.test(value);
}

export function hashInvoiceAccessToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
