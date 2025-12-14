import prisma from "@/lib/db";

/**
 * Generate a unique invoice number
 * Format: INV-YYYY-NNNN (e.g., INV-2024-0001) or INV-JOHN-DOE-YYYY-NNNN for worker-specific invoices
 *
 * @param organizationId - Organization ID
 * @param subaccountId - Optional subaccount ID for client-specific numbering
 * @param workerName - Optional worker/contact name for worker-specific numbering
 */
export async function generateInvoiceNumber(
  organizationId: string,
  subaccountId?: string,
  workerName?: string
): Promise<string> {
  const year = new Date().getFullYear();

  // If worker name is provided, format it for the invoice number
  let workerSlug = "";
  if (workerName) {
    // Convert name to uppercase slug: "John Doe" -> "JOHN-DOE"
    workerSlug = workerName
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, "") // Remove special characters
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .substring(0, 20); // Limit length

    workerSlug = workerSlug ? `${workerSlug}-` : "";
  }

  const prefix = `INV-${workerSlug}${year}`;

  // Find the last invoice for this org/subaccount/worker in the current year
  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      organizationId,
      subaccountId: subaccountId ?? null,
      invoiceNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      invoiceNumber: "desc",
    },
    select: {
      invoiceNumber: true,
    },
  });

  let nextNumber = 1;

  if (lastInvoice) {
    // Extract the number part from "INV-JOHN-DOE-2024-0001" -> "0001"
    const parts = lastInvoice.invoiceNumber.split("-");
    const lastNumber = parseInt(parts[parts.length - 1], 10);
    nextNumber = lastNumber + 1;
  }

  // Format with leading zeros (4 digits)
  const formattedNumber = nextNumber.toString().padStart(4, "0");

  return `${prefix}-${formattedNumber}`;
}

/**
 * Validate invoice number format
 */
export function validateInvoiceNumber(invoiceNumber: string): boolean {
  // Format: INV-YYYY-NNNN or INV-WORKER-NAME-YYYY-NNNN
  const pattern = /^INV-([A-Z0-9-]+-)??\d{4}-\d{4}$/;
  return pattern.test(invoiceNumber);
}

/**
 * Check if invoice number is unique
 */
export async function isInvoiceNumberUnique(
  invoiceNumber: string,
  excludeId?: string
): Promise<boolean> {
  const existing = await prisma.invoice.findFirst({
    where: {
      invoiceNumber,
      ...(excludeId && { id: { not: excludeId } }),
    },
  });

  return !existing;
}
