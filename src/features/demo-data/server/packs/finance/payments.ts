import {
  currencyExponent,
  decimalToMinorUnits,
  minorUnitsToDecimal,
  normalizeCurrency,
} from "@/features/commerce/lib/money";
import {
  demoMetadata,
  deterministicDemoId,
  type DemoSeedContext,
} from "@/features/demo-data/server/types";
import {
  DEMO_FINANCE_PROVIDER,
  PAYMENT_STATUSES,
  PAYMENT_TYPES,
} from "./constants";
import {
  addLedger,
  addTender,
  before,
  operationStatus,
  pick,
  studioStatus,
} from "./helpers";
import type { FinanceFixturePlan, FinancePackDependencies } from "./types";

export function buildPaymentFixtures(
  plan: FinanceFixturePlan,
  context: DemoSeedContext,
  dependencies: FinancePackDependencies,
): void {
  const exponent = currencyExponent(context.currency);
  const currency = normalizeCurrency(context.currency);
  const scope = {
    organizationId: context.organizationId,
    locationId: context.locationId,
  };
  const saleables = [...dependencies.products, ...dependencies.pricingOptions];

  for (let index = 0; index < context.profileConfig.paymentsCount; index += 1) {
    const client = pick(dependencies.clients, index * 7, "client");
    const occurredAt = before(
      context.referenceDate,
      (index * 17) % (context.profileConfig.historyMonths * 30),
    );
    const ledgerStatus = PAYMENT_STATUSES[index % PAYMENT_STATUSES.length];
    const paymentId = deterministicDemoId(
      context.runId,
      "studio-payment",
      index,
    );
    const lineCount = index % 3 === 0 ? 2 : 1;
    let subtotal = 0;
    let discount = 0;

    for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
      const item = pick(saleables, index + lineIndex * 5, "catalogue item");
      const unit = decimalToMinorUnits(item.price, exponent);
      const lineDiscount = index % 6 === 0 ? Math.trunc(unit / 10) : 0;
      subtotal += unit - lineDiscount;
      discount += lineDiscount;
      plan.paymentLines.push({
        id: deterministicDemoId(
          context.runId,
          "studio-payment-line",
          `${index}-${lineIndex}`,
        ),
        ...scope,
        paymentId,
        clientId: client.id,
        productId: dependencies.products.some(({ id }) => id === item.id)
          ? item.id
          : null,
        externalId: `demo-line-${context.runId}-${index}-${lineIndex}`,
        description: item.name,
        category: "Demo sale",
        quantity: 1,
        unitPrice: minorUnitsToDecimal(unit, exponent),
        discountAmount: minorUnitsToDecimal(lineDiscount, exponent),
        amount: minorUnitsToDecimal(unit - lineDiscount, exponent),
        currency,
        returned: ledgerStatus === "REFUNDED",
        soldAt: occurredAt,
        metadata: demoMetadata(context, { synthetic: true }),
        createdAt: occurredAt,
        updatedAt: occurredAt,
      });
    }

    const tax = index % 5 === 0 ? Math.trunc(subtotal / 5) : 0;
    const total = subtotal + tax;
    plan.payments.push({
      id: paymentId,
      ...scope,
      clientId: client.id,
      externalId: `demo-payment-${context.runId}-${index}`,
      paymentMethod: [
        "Aurea demo card",
        "Manual",
        "Bank transfer",
        "Gift card",
        "Account credit",
      ][index % 5],
      amount: minorUnitsToDecimal(total, exponent),
      currency,
      status: studioStatus(ledgerStatus),
      type: PAYMENT_TYPES[index % PAYMENT_TYPES.length],
      description: `Demo ${PAYMENT_TYPES[index % PAYMENT_TYPES.length].toLowerCase().replaceAll("_", " ")} sale`,
      discountAmount: minorUnitsToDecimal(discount, exponent),
      taxAmount: minorUnitsToDecimal(tax, exponent),
      metadata: demoMetadata(context, { synthetic: true, ledgerStatus }),
      createdAt: occurredAt,
      updatedAt: occurredAt,
    });

    const operationId = deterministicDemoId(
      context.runId,
      "finance-operation",
      `checkout-${index}`,
    );
    plan.operations.push({
      id: operationId,
      ...scope,
      clientId: client.id,
      type: "CHECKOUT",
      status: operationStatus(ledgerStatus),
      provider: DEMO_FINANCE_PROVIDER,
      providerAccountId: null,
      stripeConnectionId: null,
      idempotencyKey: `demo:${context.runId}:checkout:${index}`,
      amountMinor: total,
      currency,
      currencyExponent: exponent,
      studioPaymentId: paymentId,
      requestedBy: context.actorUserId,
      completedAt: ledgerStatus === "PENDING" ? null : occurredAt,
      metadata: demoMetadata(context, { synthetic: true }),
      createdAt: occurredAt,
      updatedAt: occurredAt,
    });
    const entry = addLedger(plan, context, {
      index: `payment-${index}`,
      kind: "PAYMENT",
      status: ledgerStatus,
      amount: total,
      occurredAt,
      clientId: client.id,
      studioPaymentId: paymentId,
      operationId,
    });
    addTender(plan, context, entry, index);

    if (ledgerStatus === "PARTIALLY_REFUNDED" || ledgerStatus === "REFUNDED") {
      const refundAmount =
        ledgerStatus === "REFUNDED"
          ? total
          : Math.max(1, Math.trunc(total / 2));
      const refundOperationId = deterministicDemoId(
        context.runId,
        "finance-operation",
        `refund-${index}`,
      );
      plan.operations.push({
        id: refundOperationId,
        ...scope,
        clientId: client.id,
        type: "REFUND",
        status: "SUCCEEDED",
        provider: DEMO_FINANCE_PROVIDER,
        providerAccountId: null,
        stripeConnectionId: null,
        idempotencyKey: `demo:${context.runId}:refund:${index}`,
        amountMinor: refundAmount,
        currency,
        currencyExponent: exponent,
        studioPaymentId: paymentId,
        requestedBy: context.actorUserId,
        completedAt: occurredAt,
        metadata: demoMetadata(context, { originalLedgerEntryId: entry.id }),
        createdAt: occurredAt,
        updatedAt: occurredAt,
      });
      const refund = addLedger(plan, context, {
        index: `refund-${index}`,
        kind: "REFUND",
        status: "SUCCEEDED",
        amount: refundAmount,
        occurredAt,
        clientId: client.id,
        studioPaymentId: paymentId,
        operationId: refundOperationId,
      });
      addTender(plan, context, refund, index + 1);
    }

    if (ledgerStatus === "DISPUTED" || ledgerStatus === "LOST") {
      addLedger(plan, context, {
        index: `dispute-${index}`,
        kind: "DISPUTE",
        status: ledgerStatus,
        amount: total,
        occurredAt,
        clientId: client.id,
        studioPaymentId: paymentId,
      });
    }

    const lineItem = plan.paymentLines.find(
      ({ paymentId: linePaymentId }) => linePaymentId === paymentId,
    );
    if (
      studioStatus(ledgerStatus) === "SUCCEEDED" &&
      lineItem &&
      dependencies.bookings.length > 0 &&
      index % 3 === 0
    ) {
      const booking = pick(dependencies.bookings, index * 7, "booking");
      plan.bookingPayments.push({
        id: deterministicDemoId(context.runId, "studio-booking-payment", index),
        ...scope,
        bookingId: booking.id,
        paymentId,
        lineItemId: lineItem.id,
        visitRefNo: `DEMO-VISIT-${context.runId}-${index}`,
        mindbodyPmtRefNo: `DEMO-PAYMENT-${context.runId}-${index}`,
        metadata: demoMetadata(context, {
          synthetic: true,
          classId: booking.classId,
        }),
        createdAt: occurredAt,
        updatedAt: occurredAt,
      });
    }
  }
}
