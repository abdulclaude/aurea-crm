import { notFound } from "next/navigation";
import prisma from "@/lib/db";
import { InvoiceStatus } from "@prisma/client";
import { renderInvoiceHTML } from "@/features/invoicing/lib/template-renderer";
import { PRESET_TEMPLATES } from "@/features/invoicing/lib/template-presets";

interface InvoiceViewPageProps {
  params: Promise<{
    invoiceId: string;
  }>;
}

export default async function InvoiceViewPage({
  params,
}: InvoiceViewPageProps) {
  const { invoiceId } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      invoiceLineItem: {
        orderBy: { order: "asc" },
      },
      invoiceTemplate: true,
    },
  });

  if (!invoice) {
    notFound();
  }

  // Mark invoice as viewed if not already
  if (invoice.status === InvoiceStatus.SENT) {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: InvoiceStatus.VIEWED },
    });
  }

  // Get template (use invoice's template or default to minimal)
  const template = invoice.invoiceTemplate
    ? {
        name: invoice.invoiceTemplate.name,
        description: invoice.invoiceTemplate.description || "",
        layout: invoice.invoiceTemplate.layout as any,
        styles: invoice.invoiceTemplate.styles as any,
      }
    : PRESET_TEMPLATES.minimal;

  // Prepare invoice data for renderer
  const invoiceData = {
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    contactName: invoice.contactName,
    contactEmail: invoice.contactEmail,
    contactAddress: invoice.contactAddress as Record<string, unknown> | null,
    lineItems: invoice.invoiceLineItem.map((item: any) => ({
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
    // TODO: Get these from organization
    businessName: "Your Business Name",
    businessEmail: "contact@yourbusiness.com",
  };

  // Render invoice HTML
  const html = renderInvoiceHTML(invoiceData, template);

  // Return raw HTML
  return (
    <div dangerouslySetInnerHTML={{ __html: html }} />
  );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
