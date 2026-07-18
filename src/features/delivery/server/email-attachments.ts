import "server-only";

import type { Attachment } from "resend";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { invoice } from "@/db/schema";
import type { EmailAttachmentReference } from "@/features/delivery/lib/payload-schemas";
import { generatePDF } from "@/features/invoicing/lib/pdf-generator";
import {
  invoiceTemplatePresetSchema,
  PRESET_TEMPLATES,
} from "@/features/invoicing/lib/template-presets";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const recordSchema = z.record(z.string(), z.unknown());

type AttachmentFailureClass = "terminal" | "retryable";

export class EmailAttachmentResolutionError extends Error {
  constructor(
    readonly failureClass: AttachmentFailureClass,
    readonly code: string,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "EmailAttachmentResolutionError";
  }
}

type ResolveEmailAttachmentsInput = {
  organizationId: string;
  locationId: string | null;
  attachments: EmailAttachmentReference[];
};

function parseClientAddress(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = recordSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

async function resolveInvoicePdf(
  reference: Extract<EmailAttachmentReference, { kind: "INVOICE_PDF" }>,
  scope: Pick<ResolveEmailAttachmentsInput, "organizationId" | "locationId">,
): Promise<Attachment> {
  const scopedInvoice = await db.query.invoice.findFirst({
    where: and(
      eq(invoice.id, reference.invoiceId),
      eq(invoice.organizationId, scope.organizationId),
      scope.locationId
        ? eq(invoice.locationId, scope.locationId)
        : isNull(invoice.locationId),
    ),
    with: {
      invoiceLineItems: true,
      invoiceTemplate: true,
      organization: { columns: { name: true } },
    },
  });

  if (!scopedInvoice) {
    throw new EmailAttachmentResolutionError(
      "terminal",
      "ATTACHMENT_SCOPE_INVALID",
      "The referenced invoice attachment is not available in this workspace",
    );
  }

  const template = scopedInvoice.invoiceTemplate
    ? invoiceTemplatePresetSchema.safeParse({
        name: scopedInvoice.invoiceTemplate.name,
        description: scopedInvoice.invoiceTemplate.description ?? "",
        layout: scopedInvoice.invoiceTemplate.layout,
        styles: scopedInvoice.invoiceTemplate.styles,
      })
    : null;
  if (template && !template.success) {
    throw new EmailAttachmentResolutionError(
      "terminal",
      "ATTACHMENT_TEMPLATE_INVALID",
      "The invoice attachment template is invalid",
    );
  }

  let content: Buffer;
  try {
    content = await generatePDF(
      {
        invoiceNumber: scopedInvoice.invoiceNumber,
        issueDate: scopedInvoice.issueDate,
        dueDate: scopedInvoice.dueDate,
        clientName: scopedInvoice.clientName,
        clientEmail: scopedInvoice.clientEmail,
        clientAddress: parseClientAddress(scopedInvoice.clientAddress),
        lineItems: scopedInvoice.invoiceLineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
        })),
        subtotal: scopedInvoice.subtotal,
        taxRate: scopedInvoice.taxRate,
        taxAmount: scopedInvoice.taxAmount,
        discountAmount: scopedInvoice.discountAmount,
        total: scopedInvoice.total,
        currency: scopedInvoice.currency,
        notes: scopedInvoice.notes,
        termsConditions: scopedInvoice.termsConditions,
        businessName: scopedInvoice.organization.name,
      },
      template?.success ? template.data : PRESET_TEMPLATES.minimal,
    );
  } catch (error) {
    if (error instanceof EmailAttachmentResolutionError) {
      throw error;
    }
    throw new EmailAttachmentResolutionError(
      "retryable",
      "ATTACHMENT_RENDER_FAILED",
      "The invoice attachment could not be rendered",
      { cause: error },
    );
  }

  if (content.byteLength > MAX_ATTACHMENT_BYTES) {
    throw new EmailAttachmentResolutionError(
      "terminal",
      "ATTACHMENT_TOO_LARGE",
      "The invoice attachment exceeds the 10 MB delivery limit",
    );
  }

  return {
    filename: reference.filename,
    contentType: reference.contentType,
    content,
  };
}

export async function resolveEmailAttachments(
  input: ResolveEmailAttachmentsInput,
): Promise<Attachment[]> {
  const resolved: Attachment[] = [];
  let totalBytes = 0;

  for (const reference of input.attachments) {
    if (!("kind" in reference) || reference.kind !== "INVOICE_PDF") {
      throw new EmailAttachmentResolutionError(
        "terminal",
        "ATTACHMENT_RESOLVER_UNAVAILABLE",
        "The referenced attachment type is not supported by the delivery worker",
      );
    }
    const attachment = await resolveInvoicePdf(reference, input);
    totalBytes += Buffer.isBuffer(attachment.content)
      ? attachment.content.byteLength
      : Buffer.byteLength(attachment.content ?? "", "utf8");
    if (totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
      throw new EmailAttachmentResolutionError(
        "terminal",
        "ATTACHMENTS_TOO_LARGE",
        "Email attachments exceed the 20 MB delivery limit",
      );
    }
    resolved.push(attachment);
  }

  return resolved;
}
