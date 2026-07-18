import { TRPCError } from "@trpc/server";

export type InvoiceResourceScope = {
  organizationId: string;
  locationId: string | null;
};

export type ActiveInvoiceScope = {
  organizationId: string | null;
  locationId: string | null;
};

export function assertInvoiceScopeAccess(
  resource: InvoiceResourceScope,
  activeScope: ActiveInvoiceScope,
): void {
  const organizationMatches =
    activeScope.organizationId !== null &&
    resource.organizationId === activeScope.organizationId;
  const locationMatches =
    activeScope.locationId === null ||
    resource.locationId === activeScope.locationId;

  if (!organizationMatches || !locationMatches) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Invoice not found",
    });
  }
}
