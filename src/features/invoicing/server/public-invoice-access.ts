import "server-only";

import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import {
  bankTransferSettings,
  invoice,
  invoiceAccessToken,
  invoiceLineItem,
  location,
  organization,
} from "@/db/schema";
import type { InvoiceAccessGrant, InvoiceAccessPurpose } from "@/features/invoicing/lib/public-invoice-access";
import {
  assertInvoiceAccessGrant,
  InvoiceAccessValidationError,
} from "@/features/invoicing/lib/public-invoice-access";
import type {
  PublicBankTransferDetails,
  PublicInvoice,
} from "@/features/invoicing/lib/public-invoice-contract";
import {
  hashInvoiceAccessToken,
  isInvoiceAccessToken,
  PublicInvoiceAccessNotFoundError,
} from "./invoice-access-tokens";

export type ResolvedPublicInvoiceContext = {
  grant: InvoiceAccessGrant;
  invoice: PublicInvoice;
  privateInvoice: {
    id: string;
    organizationId: string;
    locationId: string | null;
    clientId: string | null;
    clientEmail: string | null;
    paymentMethods: string[] | null;
  };
};

export async function getPublicInvoice(input: {
  token: string;
  purpose: InvoiceAccessPurpose;
  now?: Date;
}): Promise<PublicInvoice> {
  const context = await resolvePublicInvoiceContext(input);
  return context.invoice;
}

export async function getPublicBankTransferDetails(input: {
  token: string;
  now?: Date;
}): Promise<PublicBankTransferDetails> {
  const context = await resolvePublicInvoiceContext({
    token: input.token,
    purpose: "PAY",
    now: input.now,
  });

  if (!context.privateInvoice.paymentMethods?.includes("BANK_TRANSFER")) {
    return null;
  }

  const scopeCondition = context.privateInvoice.locationId
    ? eq(bankTransferSettings.locationId, context.privateInvoice.locationId)
    : isNull(bankTransferSettings.locationId);
  const [settings] = await db
    .select({
      bankName: bankTransferSettings.bankName,
      accountName: bankTransferSettings.accountName,
      accountNumber: bankTransferSettings.accountNumber,
      sortCode: bankTransferSettings.sortCode,
      routingNumber: bankTransferSettings.routingNumber,
      iban: bankTransferSettings.iban,
      swiftBic: bankTransferSettings.swiftBic,
      accountType: bankTransferSettings.accountType,
      currency: bankTransferSettings.currency,
      instructions: bankTransferSettings.instructions,
      referenceFormat: bankTransferSettings.referenceFormat,
    })
    .from(bankTransferSettings)
    .where(
      and(
        eq(
          bankTransferSettings.organizationId,
          context.privateInvoice.organizationId,
        ),
        scopeCondition,
        eq(bankTransferSettings.enabled, true),
      ),
    )
    .limit(1);

  return settings ? { ...settings, currency: settings.currency ?? context.invoice.currency } : null;
}

export async function resolvePublicInvoiceContext(input: {
  token: string;
  purpose: InvoiceAccessPurpose;
  now?: Date;
}): Promise<ResolvedPublicInvoiceContext> {
  if (!isInvoiceAccessToken(input.token)) {
    throw new PublicInvoiceAccessNotFoundError();
  }

  const rows = await db
    .select({
      grantId: invoiceAccessToken.id,
      grantInvoiceId: invoiceAccessToken.invoiceId,
      grantOrganizationId: invoiceAccessToken.organizationId,
      grantLocationId: invoiceAccessToken.locationId,
      grantPurpose: invoiceAccessToken.purpose,
      grantExpiresAt: invoiceAccessToken.expiresAt,
      grantRevokedAt: invoiceAccessToken.revokedAt,
      invoiceId: invoice.id,
      invoiceOrganizationId: invoice.organizationId,
      invoiceLocationId: invoice.locationId,
      clientId: invoice.clientId,
      clientEmail: invoice.clientEmail,
      clientName: invoice.clientName,
      invoiceNumber: invoice.invoiceNumber,
      title: invoice.title,
      status: invoice.status,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      subtotal: invoice.subtotal,
      taxRate: invoice.taxRate,
      taxAmount: invoice.taxAmount,
      discountAmount: invoice.discountAmount,
      total: invoice.total,
      amountPaid: invoice.amountPaid,
      amountDue: invoice.amountDue,
      currency: invoice.currency,
      notes: invoice.notes,
      termsConditions: invoice.termsConditions,
      paymentMethods: invoice.paymentMethods,
      organizationName: organization.name,
      organizationEmail: organization.businessEmail,
      locationName: location.companyName,
      locationEmail: location.businessEmail,
      lineItemId: invoiceLineItem.id,
      lineItemDescription: invoiceLineItem.description,
      lineItemQuantity: invoiceLineItem.quantity,
      lineItemUnitPrice: invoiceLineItem.unitPrice,
      lineItemAmount: invoiceLineItem.amount,
      lineItemOrder: invoiceLineItem.order,
    })
    .from(invoiceAccessToken)
    .innerJoin(invoice, eq(invoiceAccessToken.invoiceId, invoice.id))
    .innerJoin(
      organization,
      and(
        eq(invoice.organizationId, organization.id),
        eq(invoiceAccessToken.organizationId, organization.id),
      ),
    )
    .leftJoin(
      location,
      and(
        eq(invoice.locationId, location.id),
        eq(location.organizationId, invoice.organizationId),
      ),
    )
    .leftJoin(invoiceLineItem, eq(invoiceLineItem.invoiceId, invoice.id))
    .where(eq(invoiceAccessToken.tokenHash, hashInvoiceAccessToken(input.token)))
    .orderBy(asc(invoiceLineItem.order));

  const first = rows[0];
  if (!first) {
    throw new PublicInvoiceAccessNotFoundError();
  }

  const grant: InvoiceAccessGrant = {
    id: first.grantId,
    invoiceId: first.grantInvoiceId,
    organizationId: first.grantOrganizationId,
    locationId: first.grantLocationId,
    purpose: first.grantPurpose,
    expiresAt: first.grantExpiresAt,
    revokedAt: first.grantRevokedAt,
  };

  try {
    assertInvoiceAccessGrant({
      grant,
      requiredPurpose: input.purpose,
      invoiceOrganizationId: first.invoiceOrganizationId,
      invoiceLocationId: first.invoiceLocationId,
      now: input.now ?? new Date(),
    });
  } catch (error) {
    if (error instanceof InvoiceAccessValidationError) {
      throw new PublicInvoiceAccessNotFoundError();
    }
    throw error;
  }

  return {
    grant,
    invoice: {
      invoiceNumber: first.invoiceNumber,
      title: first.title,
      status: first.status,
      issueDate: first.issueDate,
      dueDate: first.dueDate,
      clientName: first.clientName,
      subtotal: first.subtotal,
      taxRate: first.taxRate,
      taxAmount: first.taxAmount,
      discountAmount: first.discountAmount,
      total: first.total,
      amountPaid: first.amountPaid,
      amountDue: first.amountDue,
      currency: first.currency,
      notes: first.notes,
      termsConditions: first.termsConditions,
      lineItems: rows.flatMap((row) =>
        row.lineItemId &&
        row.lineItemDescription !== null &&
        row.lineItemQuantity !== null &&
        row.lineItemUnitPrice !== null &&
        row.lineItemAmount !== null &&
        row.lineItemOrder !== null
          ? [
              {
                id: row.lineItemId,
                description: row.lineItemDescription,
                quantity: row.lineItemQuantity,
                unitPrice: row.lineItemUnitPrice,
                amount: row.lineItemAmount,
                order: row.lineItemOrder,
              },
            ]
          : [],
      ),
      paymentOptions: {
        stripe: first.paymentMethods?.includes("STRIPE") ?? false,
        bankTransfer: first.paymentMethods?.includes("BANK_TRANSFER") ?? false,
      },
      merchant: {
        name: first.locationName ?? first.organizationName,
        supportEmail: first.locationEmail ?? first.organizationEmail,
      },
    },
    privateInvoice: {
      id: first.invoiceId,
      organizationId: first.invoiceOrganizationId,
      locationId: first.invoiceLocationId,
      clientId: first.clientId,
      clientEmail: first.clientEmail,
      paymentMethods: first.paymentMethods,
    },
  };
}
