import type { recurringInvoice } from "@/db/schema";
import {
  decimalToMinorUnits,
  minorUnitsToDecimal,
} from "@/features/commerce/lib/money";
import {
  demoMetadata,
  deterministicDemoId,
  type DemoSeedContext,
} from "@/features/demo-data/server/types";
import { DAY } from "./constants";
import { before, pick } from "./helpers";
import type { FinanceFixturePlan, FinancePackDependencies } from "./types";

export function buildRecurringInvoiceFixtures(
  plan: FinanceFixturePlan,
  context: DemoSeedContext,
  dependencies: FinancePackDependencies,
  currency: string,
  exponent: number,
): void {
  const scope = {
    organizationId: context.organizationId,
    locationId: context.locationId,
  };
  const recurringCount = context.profile === "QA_EXHAUSTIVE" ? 24 : 8;
  const items =
    dependencies.pricingOptions.length > 0
      ? dependencies.pricingOptions
      : dependencies.products;
  for (let index = 0; index < recurringCount; index += 1) {
    const client = pick(dependencies.clients, index * 13, "client");
    const item = pick(items, index, "recurring item");
    const total = decimalToMinorUnits(item.price, exponent);
    const recurringId = deterministicDemoId(
      context.runId,
      "recurring-invoice",
      index,
    );
    plan.recurringInvoices.push({
      id: recurringId,
      ...scope,
      name: `${item.name} recurring billing`,
      description: "Synthetic inactive-safe recurring invoice",
      status: ["ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"][
        index % 4
      ] as typeof recurringInvoice.$inferInsert.status,
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email,
      billingModel: "RETAINER",
      templateId:
        plan.invoiceTemplates[index % plan.invoiceTemplates.length]?.id,
      frequency: ["MONTHLY", "QUARTERLY", "ANNUALLY", "WEEKLY"][
        index % 4
      ] as typeof recurringInvoice.$inferInsert.frequency,
      interval: 1,
      startDate: before(context.referenceDate, 180 + index * 3),
      endDate: index % 4 > 1 ? before(context.referenceDate, 30) : null,
      nextRunDate: new Date(
        context.referenceDate.getTime() + (15 + index) * DAY,
      ),
      dayOfMonth: 15,
      lineItems: [
        { description: item.name, quantity: 1, unitPrice: item.price },
      ],
      subtotal: minorUnitsToDecimal(total, exponent),
      taxRate: "0.00",
      taxAmount: minorUnitsToDecimal(0, exponent),
      discountAmount: minorUnitsToDecimal(0, exponent),
      total: minorUnitsToDecimal(total, exponent),
      currency,
      dueDays: 30,
      notes: "Demo schedule only; auto-send disabled.",
      autoSend: false,
      sendReminders: false,
      lastRunDate: before(context.referenceDate, 15),
      invoicesGenerated: 1,
      metadata: demoMetadata(context, { externalDeliveryDisabled: true }),
      createdAt: context.referenceDate,
      updatedAt: context.referenceDate,
    });
    const linkedInvoice = plan.invoices[index];
    const generatedAt = linkedInvoice?.issueDate;
    if (linkedInvoice && generatedAt)
      plan.recurringGenerations.push({
        id: deterministicDemoId(context.runId, "recurring-generation", index),
        recurringInvoiceId: recurringId,
        invoiceId: linkedInvoice.id,
        generatedAt,
        periodStart: before(generatedAt, 30),
        periodEnd: generatedAt,
      });
  }
}
