import { and, desc, eq, ilike, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { invoice } from "@/db/schema";

/**
 * Generate a unique invoice number
 * Format: INV-YYYY-NNNN (e.g., INV-2024-0001) or INV-JOHN-DOE-YYYY-NNNN for instructor-specific invoices
 *
 * @param organizationId - Organization ID
 * @param locationId - Optional location ID for client-specific numbering
 * @param instructorName - Optional instructor/client name for instructor-specific numbering
 */
export async function generateInvoiceNumber(
  organizationId: string,
  locationId?: string,
  instructorName?: string
): Promise<string> {
  const year = new Date().getFullYear();

  // If instructor name is provided, format it for the invoice number
  let instructorSlug = "";
  if (instructorName) {
    // Convert name to uppercase slug: "John Doe" -> "JOHN-DOE"
    instructorSlug = instructorName
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, "") // Remove special characters
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .substring(0, 20); // Limit length

    instructorSlug = instructorSlug ? `${instructorSlug}-` : "";
  }

  const prefix = `INV-${instructorSlug}${year}`;

  // Find the last invoice for this org/location/instructor in the current year
  const lastInvoice = await db.query.invoice.findFirst({
    where: and(
      eq(invoice.organizationId, organizationId),
      locationId ? eq(invoice.locationId, locationId) : isNull(invoice.locationId),
      ilike(invoice.invoiceNumber, `${prefix}%`)
    ),
    orderBy: [desc(invoice.invoiceNumber)],
    columns: {
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
  // Format: INV-YYYY-NNNN or INV-INSTRUCTOR-NAME-YYYY-NNNN
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
  const existing = await db.query.invoice.findFirst({
    where: and(
      eq(invoice.invoiceNumber, invoiceNumber),
      excludeId ? ne(invoice.id, excludeId) : undefined
    ),
    columns: { id: true },
  });

  return !existing;
}
