import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { NodeType } from "@/db/enums";
import {
  commerceLedgerEntry,
  pricingOption,
  studioMembership,
  studioPayment,
} from "@/db/schema";
import {
  pricingOptionPurchasedTriggerConfigSchema,
  pricingOptionTriggerMatches,
} from "@/features/workflows/lib/studio-trigger-config";
import { triggerWorkflowsForNodeType } from "@/lib/workflow-triggers";

type PricingOptionPurchase = {
  occurrenceId: string;
  organizationId: string;
  locationId: string | null;
  clientId: string | null;
  pricingOptionId: string;
  pricingOptionName: string;
  paymentId: string | null;
  membershipId: string | null;
  amount: string | null;
  currency: string | null;
  purchasedAt: Date;
};

export async function triggerPricingOptionPurchasedWorkflowsForReceipt(
  receiptId: string,
): Promise<number> {
  const purchases = await loadPurchases(receiptId);
  let triggered = 0;
  for (const purchase of purchases) {
    triggered += await triggerWorkflowsForNodeType({
      nodeType: NodeType.PRICING_OPTION_PURCHASED_TRIGGER,
      organizationId: purchase.organizationId,
      locationId: purchase.locationId,
      idempotencyKey: `pricing-option-purchased:${purchase.occurrenceId}`,
      triggerData: {
        purchase: {
          pricingOptionId: purchase.pricingOptionId,
          pricingOptionName: purchase.pricingOptionName,
          paymentId: purchase.paymentId,
          membershipId: purchase.membershipId,
          clientId: purchase.clientId,
          amount: purchase.amount,
          currency: purchase.currency,
          purchasedAt: purchase.purchasedAt.toISOString(),
        },
      },
      shouldTriggerNode: (node) => {
        const parsed = pricingOptionPurchasedTriggerConfigSchema.safeParse(
          node.data,
        );
        return (
          parsed.success &&
          pricingOptionTriggerMatches(
            parsed.data.pricingOptionIds,
            purchase.pricingOptionId,
          )
        );
      },
    });
  }
  return triggered;
}

async function loadPurchases(
  receiptId: string,
): Promise<PricingOptionPurchase[]> {
  const paymentRows = await db
    .select({
      occurrenceId: commerceLedgerEntry.id,
      organizationId: studioPayment.organizationId,
      locationId: studioPayment.locationId,
      clientId: studioPayment.clientId,
      paymentId: studioPayment.id,
      membershipId: studioPayment.membershipId,
      amount: studioPayment.amount,
      currency: studioPayment.currency,
      purchasedAt: commerceLedgerEntry.occurredAt,
      pricingOptionId: sql<
        string | null
      >`${studioPayment.metadata} ->> 'pricingOptionId'`,
    })
    .from(commerceLedgerEntry)
    .innerJoin(
      studioPayment,
      eq(studioPayment.id, commerceLedgerEntry.studioPaymentId),
    )
    .where(
      and(
        eq(commerceLedgerEntry.stripeEventId, receiptId),
        eq(studioPayment.status, "SUCCEEDED"),
      ),
    );

  const membershipRows = await db
    .select({
      occurrenceId: studioMembership.id,
      organizationId: studioMembership.organizationId,
      locationId: studioMembership.locationId,
      clientId: studioMembership.clientId,
      paymentId: sql<null>`null`,
      membershipId: studioMembership.id,
      amount: studioMembership.price,
      currency: studioMembership.currency,
      purchasedAt: studioMembership.startDate,
      pricingOptionId: sql<
        string | null
      >`${studioMembership.metadata} ->> 'pricingOptionId'`,
    })
    .from(studioMembership)
    .where(
      sql`${studioMembership.metadata} ->> 'purchaseReceiptId' = ${receiptId}`,
    );

  const paidMembershipIds = new Set(
    paymentRows.flatMap((row) => (row.membershipId ? [row.membershipId] : [])),
  );
  const merged = [
    ...paymentRows,
    ...membershipRows.filter((row) => !paidMembershipIds.has(row.membershipId)),
  ].filter((row): row is typeof row & { pricingOptionId: string } =>
    Boolean(row.pricingOptionId),
  );
  if (merged.length === 0) return [];
  const optionIds = Array.from(
    new Set(merged.map((row) => row.pricingOptionId)),
  );
  const options = await db
    .select({
      id: pricingOption.id,
      name: pricingOption.name,
      organizationId: pricingOption.organizationId,
    })
    .from(pricingOption)
    .where(inArray(pricingOption.id, optionIds));
  const optionById = new Map(options.map((option) => [option.id, option]));

  return merged.flatMap((row) => {
    const option = optionById.get(row.pricingOptionId);
    if (
      !row.organizationId ||
      !option ||
      option.organizationId !== row.organizationId
    )
      return [];
    return [
      {
        ...row,
        organizationId: row.organizationId,
        pricingOptionName: option.name,
      },
    ];
  });
}
