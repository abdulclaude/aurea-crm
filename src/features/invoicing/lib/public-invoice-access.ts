import { z } from "zod";

export const invoiceAccessPurposeSchema = z.enum(["PAY", "VIEW"]);

export type InvoiceAccessPurpose = z.infer<typeof invoiceAccessPurposeSchema>;

export type InvoiceAccessGrant = {
  id: string;
  invoiceId: string;
  organizationId: string;
  locationId: string | null;
  purpose: InvoiceAccessPurpose;
  expiresAt: Date;
  revokedAt: Date | null;
};

export type InvoiceAccessValidationCode =
  | "WRONG_PURPOSE"
  | "EXPIRED"
  | "REVOKED"
  | "SCOPE_MISMATCH";

export class InvoiceAccessValidationError extends Error {
  readonly code: InvoiceAccessValidationCode;

  constructor(code: InvoiceAccessValidationCode) {
    super("Invoice access is not available");
    this.name = "InvoiceAccessValidationError";
    this.code = code;
  }
}

export function assertInvoiceAccessGrant(input: {
  grant: InvoiceAccessGrant;
  requiredPurpose: InvoiceAccessPurpose;
  invoiceOrganizationId: string;
  invoiceLocationId: string | null;
  now: Date;
}): void {
  if (input.grant.purpose !== input.requiredPurpose) {
    throw new InvoiceAccessValidationError("WRONG_PURPOSE");
  }
  if (input.grant.revokedAt !== null) {
    throw new InvoiceAccessValidationError("REVOKED");
  }
  if (input.grant.expiresAt.getTime() <= input.now.getTime()) {
    throw new InvoiceAccessValidationError("EXPIRED");
  }
  if (
    input.grant.organizationId !== input.invoiceOrganizationId ||
    input.grant.locationId !== input.invoiceLocationId
  ) {
    throw new InvoiceAccessValidationError("SCOPE_MISMATCH");
  }
}

export function buildInvoiceCheckoutIdempotencyKey(input: {
  grantId: string;
  invoiceId: string;
  providerAccountId: string;
  amountMinor: number;
  currency: string;
}): string {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new Error("Invoice checkout amount must be a positive safe integer");
  }

  const currency = input.currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("Invoice checkout currency must be a three-letter ISO code");
  }
  const providerAccountId = input.providerAccountId.trim();
  if (!providerAccountId) {
    throw new Error("Invoice checkout requires a provider account");
  }

  return [
    "invoice-checkout",
    input.grantId,
    input.invoiceId,
    providerAccountId,
    currency,
    input.amountMinor.toString(),
  ].join(":");
}
