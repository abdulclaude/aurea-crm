import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { invoice as invoiceTable, invoiceLineItem } from "@/db/schema";
import { InvoiceStatus } from "@/db/enums";
import { renderInvoiceHTML } from "@/features/invoicing/lib/template-renderer";
import { PRESET_TEMPLATES, type InvoiceTemplatePreset } from "@/features/invoicing/lib/template-presets";

interface InvoiceViewPageProps {
  params: Promise<{
    invoiceId: string;
  }>;
}

export default async function InvoiceViewPage({
  params,
}: InvoiceViewPageProps) {
  const { invoiceId } = await params;

  const invoice = await db.query.invoice.findFirst({
    where: eq(invoiceTable.id, invoiceId),
    with: {
      invoiceLineItems: {
        orderBy: [asc(invoiceLineItem.order)],
      },
      invoiceTemplate: true,
    },
  });

  if (!invoice) {
    notFound();
  }

  // Mark invoice as viewed if not already
  if (invoice.status === InvoiceStatus.SENT) {
    await db
      .update(invoiceTable)
      .set({ status: InvoiceStatus.VIEWED, updatedAt: new Date() })
      .where(eq(invoiceTable.id, invoiceId));
  }

  const template = invoice.invoiceTemplate
    ? {
        name: invoice.invoiceTemplate.name,
        description: invoice.invoiceTemplate.description || "",
        layout: invoice.invoiceTemplate.layout as InvoiceTemplatePreset["layout"],
        styles: invoice.invoiceTemplate.styles as InvoiceTemplatePreset["styles"],
      }
    : PRESET_TEMPLATES.minimal;

  const invoiceData = {
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    clientName: invoice.clientName,
    clientEmail: invoice.clientEmail,
    clientAddress: invoice.clientAddress as Record<string, unknown> | null,
    lineItems: invoice.invoiceLineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      amount: item.amount.toString(),
    })),
    subtotal: invoice.subtotal.toString(),
    taxRate: invoice.taxRate?.toString(),
    taxAmount: invoice.taxAmount.toString(),
    discountAmount: invoice.discountAmount.toString(),
    total: invoice.total.toString(),
    currency: invoice.currency,
    notes: invoice.notes,
    termsConditions: invoice.termsConditions,
    businessName: "Your Business Name",
    businessEmail: "client@yourbusiness.com",
  };

  const html = renderInvoiceHTML(invoiceData, template);

  return (
    <div dangerouslySetInnerHTML={{ __html: html }} />
  );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
