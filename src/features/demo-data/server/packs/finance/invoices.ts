import {
  decimalToMinorUnits,
  minorUnitsToDecimal,
} from "@/features/commerce/lib/money";
import {
  demoMetadata,
  deterministicDemoId,
  type DemoSeedContext,
} from "@/features/demo-data/server/types";
import { DAY, DEMO_FINANCE_PROVIDER, INVOICE_STATUSES } from "./constants";
import { addLedger, addTender, before, pick } from "./helpers";
import type {
  FinanceFixturePlan,
  FinancePackDependencies,
  InvoiceSeed,
} from "./types";

export function buildInvoiceFixtures(
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
  const templateNames = [
    "Studio standard",
    "Private coaching",
    "Corporate wellness",
    "Retail supply",
    "Event hire",
  ];
  const templateCount = context.profile === "QA_EXHAUSTIVE" ? 5 : 3;
  for (let index = 0; index < templateCount; index += 1) {
    plan.invoiceTemplates.push({
      id: deterministicDemoId(context.runId, "invoice-template", index),
      ...scope,
      name: templateNames[index] ?? `Demo template ${index + 1}`,
      description: "Synthetic demo invoice template",
      isDefault: index === 0,
      isSystem: false,
      layout: {
        sections: ["header", "client", "lineItems", "totals", "footer"],
      },
      styles: { accent: ["#167D74", "#3366AA", "#B26A2C"][index % 3] },
      variables: {},
      metadata: demoMetadata(context),
      createdAt: context.referenceDate,
      updatedAt: context.referenceDate,
    });
  }

  const items = [...dependencies.pricingOptions, ...dependencies.products];
  const invoiceCount = context.profile === "QA_EXHAUSTIVE" ? 160 : 48;
  for (let index = 0; index < invoiceCount; index += 1) {
    const client = pick(dependencies.clients, index * 11, "client");
    const status = INVOICE_STATUSES[index % INVOICE_STATUSES.length];
    const issueDate = before(
      context.referenceDate,
      (index * 19) % (context.profileConfig.historyMonths * 30),
    );
    const invoiceId = deterministicDemoId(context.runId, "invoice", index);
    let subtotal = 0;
    for (let lineIndex = 0; lineIndex < 1 + (index % 3); lineIndex += 1) {
      const item = pick(items, index + lineIndex, "catalogue item");
      const amount = decimalToMinorUnits(item.price, exponent);
      subtotal += amount;
      plan.invoiceLines.push({
        id: deterministicDemoId(
          context.runId,
          "invoice-line",
          `${index}-${lineIndex}`,
        ),
        invoiceId,
        description: item.name,
        quantity: "1.00",
        unitPrice: minorUnitsToDecimal(amount, exponent),
        amount: minorUnitsToDecimal(amount, exponent),
        order: lineIndex,
        metadata: demoMetadata(context),
        createdAt: issueDate,
        updatedAt: issueDate,
      });
    }

    const discount = index % 4 === 0 ? Math.trunc(subtotal / 10) : 0;
    const taxable = subtotal - discount;
    const tax = index % 3 === 0 ? Math.trunc(taxable / 5) : 0;
    const total = taxable + tax;
    const paid =
      status === "PAID"
        ? total
        : status === "PARTIALLY_PAID"
          ? Math.trunc(total / 2)
          : 0;
    const dueDate = new Date(issueDate.getTime() + 30 * DAY);
    const reminder = ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"].includes(
      status,
    );
    const openedReminder = status === "VIEWED" || status === "PARTIALLY_PAID";
    const reminderDeliveryStatus = openedReminder
      ? ("DELIVERED" as const)
      : (
          ["QUEUED", "ACCEPTED", "DELIVERED", "BOUNCED", "DEAD_LETTER"] as const
        )[index % 5]!;
    const reminderAccepted = ["ACCEPTED", "DELIVERED", "BOUNCED"].includes(
      reminderDeliveryStatus,
    );
    plan.invoices.push({
      id: invoiceId,
      ...scope,
      invoiceNumber: `DEMO-${context.runId.slice(0, 8).toUpperCase()}-${String(index + 1).padStart(4, "0")}`,
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email,
      title:
        index % 4 === 3 ? "Corporate wellness services" : "Studio services",
      status,
      billingModel: ["CUSTOM", "RETAINER", "SUBSCRIPTION"][
        index % 3
      ] as InvoiceSeed["billingModel"],
      issueDate,
      dueDate,
      paidAt: status === "PAID" ? issueDate : null,
      subtotal: minorUnitsToDecimal(subtotal, exponent),
      taxRate: tax > 0 ? "20.00" : "0.00",
      taxAmount: minorUnitsToDecimal(tax, exponent),
      discountAmount: minorUnitsToDecimal(discount, exponent),
      total: minorUnitsToDecimal(total, exponent),
      amountPaid: minorUnitsToDecimal(paid, exponent),
      amountDue: minorUnitsToDecimal(total - paid, exponent),
      currency,
      notes: "Synthetic demo invoice. No message was sent.",
      termsConditions: "Demo terms only",
      reminderCount: reminder && reminderAccepted ? 1 : 0,
      lastReminderSentAt: reminder && reminderAccepted ? dueDate : null,
      metadata: demoMetadata(context, { synthetic: true }),
      templateId:
        plan.invoiceTemplates[index % plan.invoiceTemplates.length]?.id,
      paymentMethods: ["MANUAL", "BANK_TRANSFER"],
      type: index % 4 === 3 ? "RECEIVED" : "SENT",
      createdAt: issueDate,
      updatedAt: issueDate,
    });
    if (paid > 0)
      addInvoicePayment(plan, context, {
        index,
        invoiceId,
        clientId: client.id,
        paid,
        issueDate,
        currency,
        exponent,
      });
    if (reminder)
      plan.invoiceReminders.push({
        id: deterministicDemoId(context.runId, "invoice-reminder", index),
        ...scope,
        invoiceId,
        sentAt: reminderAccepted ? dueDate : null,
        sentTo: client.email,
        subject: "Demo invoice reminder",
        message: "This is synthetic historical demo data; no email was sent.",
        deliveryStatus: reminderDeliveryStatus,
        queuedAt: dueDate,
        deliveredAt: reminderDeliveryStatus === "DELIVERED" ? dueDate : null,
        failedAt:
          reminderDeliveryStatus === "BOUNCED" ||
          reminderDeliveryStatus === "DEAD_LETTER"
            ? dueDate
            : null,
        failureMessage:
          reminderDeliveryStatus === "BOUNCED"
            ? "Synthetic hard bounce"
            : reminderDeliveryStatus === "DEAD_LETTER"
              ? "Synthetic terminal delivery failure"
              : null,
        opened: openedReminder,
        openedAt: openedReminder ? dueDate : null,
        metadata: demoMetadata(context, {
          delivery: "synthetic-not-sent",
          deliveryStatus: reminderDeliveryStatus,
        }),
        createdAt: dueDate,
        daysOverdue: status === "OVERDUE" ? 14 : 0,
        isDunning: status === "OVERDUE",
      });
  }
}

function addInvoicePayment(
  plan: FinanceFixturePlan,
  context: DemoSeedContext,
  input: {
    index: number;
    invoiceId: string;
    clientId: string;
    paid: number;
    issueDate: Date;
    currency: string;
    exponent: number;
  },
): void {
  const scope = {
    organizationId: context.organizationId,
    locationId: context.locationId,
  };
  const invoicePaymentId = deterministicDemoId(
    context.runId,
    "invoice-payment",
    input.index,
  );
  plan.invoicePayments.push({
    id: invoicePaymentId,
    invoiceId: input.invoiceId,
    amount: minorUnitsToDecimal(input.paid, input.exponent),
    currency: input.currency,
    method: input.index % 2 === 0 ? "MANUAL" : "BANK_TRANSFER",
    paidAt: input.issueDate,
    referenceNumber: `DEMO-RECEIPT-${input.index + 1}`,
    notes: "Synthetic payment",
    metadata: demoMetadata(context),
    createdAt: input.issueDate,
    updatedAt: input.issueDate,
  });
  const operationId = deterministicDemoId(
    context.runId,
    "finance-operation",
    `invoice-${input.index}`,
  );
  plan.operations.push({
    id: operationId,
    ...scope,
    clientId: input.clientId,
    type: "CHECKOUT",
    status: "SUCCEEDED",
    provider: DEMO_FINANCE_PROVIDER,
    providerAccountId: null,
    stripeConnectionId: null,
    idempotencyKey: `demo:${context.runId}:invoice:${input.index}`,
    amountMinor: input.paid,
    currency: input.currency,
    currencyExponent: input.exponent,
    invoiceId: input.invoiceId,
    requestedBy: context.actorUserId,
    completedAt: input.issueDate,
    metadata: demoMetadata(context),
    createdAt: input.issueDate,
    updatedAt: input.issueDate,
  });
  const entry = addLedger(plan, context, {
    index: `invoice-${input.index}`,
    kind: "PAYMENT",
    status: "SUCCEEDED",
    amount: input.paid,
    occurredAt: input.issueDate,
    clientId: input.clientId,
    invoiceId: input.invoiceId,
    invoicePaymentId,
    operationId,
  });
  addTender(plan, context, entry, input.index + 1000);
}
