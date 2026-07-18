import "server-only";

import { and, eq, isNull, or } from "drizzle-orm";

import { invoiceReminder, outboundDelivery } from "@/db/schema";
import type { DeliveryTransaction } from "@/features/delivery/server/outbox";

const FAILED_DELIVERY_STATUSES = new Set([
  "BOUNCED",
  "DEAD_LETTER",
  "SUPPRESSED",
]);

type ReminderDeliveryState = Pick<
  typeof outboundDelivery.$inferSelect,
  | "id"
  | "sourceType"
  | "status"
  | "providerAccountId"
  | "acceptedAt"
  | "deliveredAt"
  | "bouncedAt"
  | "openedAt"
  | "updatedAt"
  | "lastErrorMessage"
>;

export async function projectInvoiceReminderDelivery(
  tx: DeliveryTransaction,
  delivery: typeof outboundDelivery.$inferSelect,
): Promise<void> {
  const projection = invoiceReminderDeliveryProjection(delivery);
  if (!projection) return;
  await tx
    .update(invoiceReminder)
    .set(projection)
    .where(
      and(
        eq(invoiceReminder.id, delivery.sourceId),
        eq(invoiceReminder.organizationId, delivery.organizationId),
        delivery.locationId
          ? eq(invoiceReminder.locationId, delivery.locationId)
          : isNull(invoiceReminder.locationId),
        or(
          isNull(invoiceReminder.outboundDeliveryId),
          eq(invoiceReminder.outboundDeliveryId, delivery.id),
        ),
      ),
    );
}

export function invoiceReminderDeliveryProjection(
  delivery: ReminderDeliveryState,
): Partial<typeof invoiceReminder.$inferInsert> | null {
  if (delivery.sourceType !== "INVOICE_REMINDER") return null;

  const failed = FAILED_DELIVERY_STATUSES.has(delivery.status);
  const sentAt = delivery.acceptedAt ?? delivery.deliveredAt;
  return {
    outboundDeliveryId: delivery.id,
    providerAccountId: delivery.providerAccountId,
    deliveryStatus: delivery.status,
    sentAt: sentAt ?? undefined,
    deliveredAt: delivery.deliveredAt ?? undefined,
    failedAt: failed ? (delivery.bouncedAt ?? delivery.updatedAt) : undefined,
    failureMessage: failed
      ? (delivery.lastErrorMessage ?? deliveryFailureMessage(delivery.status))
      : sentAt
        ? null
        : undefined,
    opened: delivery.openedAt ? true : undefined,
    openedAt: delivery.openedAt ?? undefined,
  };
}

function deliveryFailureMessage(status: string): string {
  if (status === "BOUNCED") return "The reminder email bounced.";
  if (status === "SUPPRESSED") return "The reminder email was suppressed.";
  return "The reminder email could not be delivered.";
}
