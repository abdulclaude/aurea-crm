import { TRPCError } from "@trpc/server";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  or,
  type SQL,
} from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  client as clientTable,
  clientAccountBalance,
  commerceLedgerEntry,
  giftCard,
  instructor,
  invoice,
  invoiceLineItem,
  payrollRun,
  payrollRunInstructor,
  pricingOption,
  rota,
  studioClass,
  studioMembership,
  studioPayment,
  studioPaymentLineItem,
  studioProduct,
  studioStaffMember,
  task,
  timeLog,
} from "@/db/schema";
import { getClassReportRows, getInvoiceReportRows, getOperationalStaffReportRows } from "@/features/reports/server/domain-report-rows";
import { getReportById } from "@/features/reports/helpers";
import {
  formatReportDateInTimezone,
  reportBucketKey,
} from "@/features/reports/lib/report-time";
import { buildPlainCsv } from "@/features/reports/lib/report-csv";
import { minorUnitsToDecimal } from "@/features/commerce/lib/money";
import {
  addReportMoney,
  averageReportMoney,
  multiplyReportMoney,
  normalizeReportMoney,
  prorateReportMoney,
  reportMoneyToMinor,
  signedReportMoney,
  subtractReportMoney,
} from "@/features/reports/lib/report-money";
import {
  isLedgerEntryVisibleInTransactionReport,
  reportLedgerStatus,
  resolveReportCurrency,
} from "@/features/reports/lib/report-row-policy";
import {
  reportExportProcedure,
  reportViewProcedure,
} from "@/features/reports/server/report-procedures";
import { getReportLocale } from "@/features/reports/server/report-scope";
import type { ReportDataRow } from "@/features/reports/types";
import type { ReportGroupId } from "@/features/reports/types";
import { createTRPCRouter } from "@/trpc/init";

const REPORT_ROW_LIMIT = 500;

const ReportGroupIdSchema = z.enum([
  "sales",
  "payment-processing",
  "clients",
  "staff",
  "inventory",
]);
const reportDataValueSchema = z.union([z.string(), z.number(), z.null()]);
const reportDataRowSchema = z.record(z.string(), reportDataValueSchema);

function requireOrg(ctx: { orgId: string | null }) {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No active organization",
    });
  }
  return ctx.orgId;
}

function requireOrgAndLocation(ctx: {
  locationId: string | null;
  orgId: string | null;
}) {
  const orgId = requireOrg(ctx);
  if (!ctx.locationId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select a location before opening reports.",
    });
  }

  return { locationId: ctx.locationId, orgId };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function pricingOptionIdFromMetadata(metadata: unknown): string | null {
  if (!isRecord(metadata)) return null;
  return typeof metadata.pricingOptionId === "string"
    ? metadata.pricingOptionId
    : null;
}

async function getPricingOptionNameById(
  orgId: string,
  ids: readonly string[],
): Promise<Map<string, string>> {
  const uniqueIds = Array.from(new Set(ids));
  if (uniqueIds.length === 0) return new Map();

  const rows = await db
    .select({ id: pricingOption.id, name: pricingOption.name })
    .from(pricingOption)
    .where(
      and(
        eq(pricingOption.organizationId, orgId),
        inArray(pricingOption.id, uniqueIds),
      ),
    );

  return new Map(rows.map((row) => [row.id, row.name]));
}

function scopePayment(
  orgId: string,
  locationId: string,
  startDate?: Date,
  endDate?: Date,
) {
  return and(
    eq(studioPayment.organizationId, orgId),
    eq(studioPayment.locationId, locationId),
    eq(studioPayment.status, "SUCCEEDED"),
    startDate ? gte(studioPayment.createdAt, startDate) : undefined,
    endDate ? lte(studioPayment.createdAt, endDate) : undefined,
  );
}

function transactionLedgerCondition(reportId: string): SQL {
  if (reportId === "pending-transactions") {
    return and(
      inArray(commerceLedgerEntry.kind, ["PAYMENT", "REFUND"]),
      eq(commerceLedgerEntry.status, "PENDING"),
    )!;
  }
  if (reportId === "voided-rejected-transactions") {
    return and(
      inArray(commerceLedgerEntry.kind, ["PAYMENT", "REFUND"]),
      inArray(commerceLedgerEntry.status, ["FAILED", "CANCELLED"]),
    )!;
  }
  return or(
    and(
      eq(commerceLedgerEntry.kind, "PAYMENT"),
      inArray(commerceLedgerEntry.status, [
        "SUCCEEDED",
        "PARTIALLY_REFUNDED",
        "REFUNDED",
      ]),
    ),
    and(
      eq(commerceLedgerEntry.kind, "REFUND"),
      eq(commerceLedgerEntry.status, "SUCCEEDED"),
    ),
  )!;
}

async function getSalesRows(
  orgId: string,
  locationId: string,
  reportId: string,
  timezone: string,
  fallbackCurrency: string,
): Promise<ReportDataRow[]> {
  if (
    [
      "contract-sales",
      "outstanding-series",
      "average-revenue-analysis",
    ].includes(reportId)
  ) {
    return getMembershipRows(orgId, locationId, timezone, fallbackCurrency);
  }

  if (["gift-cards", "gift-card-analysis"].includes(reportId)) {
    return getGiftCardRows(orgId, locationId, timezone);
  }

  if (reportId === "revenue-by-class") {
    return getClassReportRows(orgId, locationId, timezone, fallbackCurrency);
  }

  if (reportId === "invoice") {
    return getInvoiceReportRows(orgId, locationId, timezone);
  }

  const lineItems = await db.query.studioPaymentLineItem.findMany({
    where: and(
      eq(studioPaymentLineItem.organizationId, orgId),
      eq(studioPaymentLineItem.locationId, locationId),
      isNull(studioPaymentLineItem.deletedAt),
    ),
    with: {
      client: { columns: { name: true } },
      studioPayment: {
        columns: {
          currency: true,
          discountAmount: true,
          paymentMethod: true,
          status: true,
          taxAmount: true,
          type: true,
          metadata: true,
        },
        with: {
          promoCode: { columns: { code: true } },
        },
      },
      studioProduct: {
        columns: {
          category: true,
          cost: true,
          currency: true,
          name: true,
          type: true,
        },
      },
    },
    orderBy: desc(studioPaymentLineItem.soldAt),
    limit: REPORT_ROW_LIMIT,
  });
  const netTotalByPaymentAndCurrency = new Map<string, number>();
  const pricingOptionNameById = await getPricingOptionNameById(
    orgId,
    lineItems
      .map((lineItem) =>
        pricingOptionIdFromMetadata(lineItem.studioPayment?.metadata),
      )
      .filter((id): id is string => Boolean(id)),
  );

  for (const lineItem of lineItems) {
    if (!lineItem.paymentId) continue;
    const key = `${lineItem.paymentId}:${lineItem.currency.toUpperCase()}`;
    netTotalByPaymentAndCurrency.set(
      key,
      (netTotalByPaymentAndCurrency.get(key) ?? 0) +
        Math.abs(reportMoneyToMinor(lineItem.amount, lineItem.currency)),
    );
  }

  const rows = lineItems.map((lineItem) => {
    const currency = lineItem.currency;
    const quantity = lineItem.quantity;
    const gross = signedReportMoney(
      multiplyReportMoney(lineItem.unitPrice, quantity, currency),
      lineItem.returned,
      currency,
    );
    const discount = signedReportMoney(
      lineItem.discountAmount,
      lineItem.returned,
      currency,
    );
    const net = signedReportMoney(lineItem.amount, lineItem.returned, currency);
    const rawNetMinor = Math.abs(reportMoneyToMinor(lineItem.amount, currency));
    const paymentCurrency = lineItem.studioPayment?.currency;
    const paymentNetTotal = lineItem.paymentId
      ? netTotalByPaymentAndCurrency.get(
          `${lineItem.paymentId}:${currency.toUpperCase()}`,
        )
      : null;
    const proratedTax =
      paymentCurrency?.toUpperCase() === currency.toUpperCase() &&
      lineItem.studioPayment &&
      paymentNetTotal &&
      paymentNetTotal > 0
        ? prorateReportMoney({
            total: lineItem.studioPayment.taxAmount ?? "0",
            numerator: rawNetMinor,
            denominator: paymentNetTotal,
            currency,
          })
        : null;
    const tax = proratedTax
      ? signedReportMoney(proratedTax, lineItem.returned, currency)
      : null;
    const productCurrency = lineItem.studioProduct?.currency;
    const cost =
      lineItem.studioProduct?.cost &&
      productCurrency?.toUpperCase() === currency.toUpperCase()
        ? signedReportMoney(
            multiplyReportMoney(
              lineItem.studioProduct.cost,
              quantity,
              currency,
            ),
            lineItem.returned,
            currency,
          )
        : null;
    const profit = cost ? subtractReportMoney(net, cost, currency) : null;
    const productName =
      lineItem.studioProduct?.name ?? lineItem.description ?? "Sale";
    const productType = lineItem.studioProduct?.type ?? null;
    const category =
      lineItem.studioProduct?.category ?? lineItem.category ?? productType;
    const pricingOptionId = pricingOptionIdFromMetadata(
      lineItem.studioPayment?.metadata,
    );

    return {
      amount: net,
      category,
      client: lineItem.client?.name ?? null,
      currency,
      date: formatReportDateInTimezone(
        lineItem.soldAt ?? lineItem.createdAt,
        timezone,
      ),
      discount,
      gross,
      item: productName,
      margin:
        profit && reportMoneyToMinor(net, currency) !== 0
          ? Math.round(
              (reportMoneyToMinor(profit, currency) /
                reportMoneyToMinor(net, currency)) *
                1_000,
            ) / 10
          : null,
      method:
        lineItem.studioPayment?.paymentMethod ??
        lineItem.studioPayment?.type ??
        null,
      net,
      product: productType === "RETAIL" ? productName : null,
      profit,
      pricingOption: pricingOptionId
        ? (pricingOptionNameById.get(pricingOptionId) ?? pricingOptionId)
        : null,
      promotion: lineItem.studioPayment?.promoCode?.code ?? null,
      quantity,
      reason: lineItem.returned ? "Returned item" : null,
      revenue: net,
      service: productType === "RETAIL" ? null : productName,
      staff: null,
      status: lineItem.returned
        ? "REFUNDED"
        : (lineItem.studioPayment?.status ?? "SUCCEEDED"),
      supplier: category,
      tax,
      transactions: 1,
    };
  });

  if (reportId === "returns") {
    return rows.filter((row) => row.status === "REFUNDED");
  }

  if (reportId === "voided-sales") {
    return rows.filter((row) =>
      ["CANCELLED", "FAILED"].includes(String(row.status ?? "")),
    );
  }

  const finalRows = rows.filter((row) =>
    ["SUCCEEDED", "REFUNDED"].includes(String(row.status ?? "")),
  );

  if (reportId === "daily-closeout") {
    return aggregateRows(finalRows, ["date"]);
  }

  if (reportId === "cash-drawer") {
    return aggregateRows(finalRows, ["date", "method"]);
  }

  if (reportId === "sales-by-category") {
    return aggregateRows(finalRows, ["category"]);
  }

  if (reportId === "sales-tax") {
    return aggregateRows(finalRows, ["date", "category"]);
  }

  if (reportId === "sales-by-service" || reportId === "earned-revenue") {
    return aggregateRows(finalRows, ["service", "category"]);
  }

  if (reportId === "sales-by-product" || reportId === "best-sellers") {
    return aggregateRows(finalRows, ["product", "category"]);
  }

  if (reportId === "sales-by-supplier") {
    return aggregateRows(finalRows, ["supplier", "product"]);
  }

  if (reportId === "sales-promotions") {
    return aggregateRows(
      finalRows.filter((row) => row.promotion),
      ["promotion", "pricingOption"],
    );
  }

  return finalRows;
}

async function getPaymentRows(
  orgId: string,
  locationId: string,
  reportId: string,
  timezone: string,
  fallbackCurrency: string,
): Promise<ReportDataRow[]> {
  if (
    [
      "autopay-cc-expirations",
      "autopay-detail",
      "autopay-expirations",
      "autopay-summary",
    ].includes(reportId)
  ) {
    return getMembershipRows(orgId, locationId, timezone, fallbackCurrency);
  }

  if (
    ["approved-transactions", "settled-transactions", "card-updater"].includes(
      reportId,
    )
  ) {
    return [];
  }

  const payments = await db
    .select({
      amountMinor: commerceLedgerEntry.amountMinor,
      clientName: clientTable.name,
      currency: commerceLedgerEntry.currency,
      currencyExponent: commerceLedgerEntry.currencyExponent,
      kind: commerceLedgerEntry.kind,
      occurredAt: commerceLedgerEntry.occurredAt,
      paymentMethod: studioPayment.paymentMethod,
      paymentMetadata: studioPayment.metadata,
      provider: commerceLedgerEntry.provider,
      status: commerceLedgerEntry.status,
    })
    .from(commerceLedgerEntry)
    .leftJoin(
      clientTable,
      and(
        eq(clientTable.id, commerceLedgerEntry.clientId),
        eq(clientTable.organizationId, commerceLedgerEntry.organizationId),
        eq(clientTable.locationId, commerceLedgerEntry.locationId),
      ),
    )
    .leftJoin(
      studioPayment,
      and(
        eq(studioPayment.id, commerceLedgerEntry.studioPaymentId),
        eq(studioPayment.organizationId, commerceLedgerEntry.organizationId),
        eq(studioPayment.locationId, commerceLedgerEntry.locationId),
      ),
    )
    .where(
      and(
        eq(commerceLedgerEntry.organizationId, orgId),
        eq(commerceLedgerEntry.locationId, locationId),
        transactionLedgerCondition(reportId),
      ),
    )
    .orderBy(desc(commerceLedgerEntry.occurredAt))
    .limit(REPORT_ROW_LIMIT);
  const visiblePayments = payments.filter((payment) => {
    if (payment.kind !== "PAYMENT" && payment.kind !== "REFUND") return false;
    return isLedgerEntryVisibleInTransactionReport({
      reportId,
      kind: payment.kind,
      status: payment.status,
    });
  });
  const pricingOptionNameById = await getPricingOptionNameById(
    orgId,
    visiblePayments
      .map((payment) => pricingOptionIdFromMetadata(payment.paymentMetadata))
      .filter((id): id is string => Boolean(id)),
  );

  const rows = visiblePayments.map((payment) => {
    const signedAmount =
      payment.kind === "REFUND"
        ? -Math.abs(payment.amountMinor)
        : payment.amountMinor;
    const amount = minorUnitsToDecimal(signedAmount, payment.currencyExponent);
    const pricingOptionId = pricingOptionIdFromMetadata(
      payment.paymentMetadata,
    );

    return {
      amount,
      cardBrand: inferCardBrand(payment.paymentMethod),
      client: payment.clientName,
      currency: payment.currency,
      date: formatReportDateInTimezone(payment.occurredAt, timezone),
      method: payment.paymentMethod ?? payment.provider,
      pricingOption: pricingOptionId
        ? (pricingOptionNameById.get(pricingOptionId) ?? pricingOptionId)
        : null,
      status:
        payment.kind === "REFUND"
          ? reportLedgerStatus({ kind: payment.kind, status: payment.status })
          : payment.status,
      transactions: 1,
    };
  });
  return rows;
}

async function getClientRows(
  orgId: string,
  locationId: string,
  reportId: string,
  timezone: string,
  fallbackCurrency: string,
): Promise<ReportDataRow[]> {
  if (
    [
      "event-payments",
      "membership",
      "new-members",
      "pricing-option-expirations",
      "visits-remaining",
    ].includes(reportId)
  ) {
    return getMembershipRows(orgId, locationId, timezone, fallbackCurrency);
  }

  if (
    [
      "attendance-analysis",
      "attendance-without-revenue",
      "client-arrivals",
      "client-schedule-at-a-glance",
      "clients-per-teacher",
      "no-shows",
    ].includes(reportId)
  ) {
    return getClassReportRows(orgId, locationId, timezone, fallbackCurrency);
  }

  if (reportId === "client-promotions") {
    return getPaymentRows(
      orgId,
      locationId,
      "transactions",
      timezone,
      fallbackCurrency,
    ).then((rows) => rows.filter((row) => row.promotion));
  }

  const [clients, memberships, balances] = await Promise.all([
    db.query.client.findMany({
      where: and(
        eq(clientTable.organizationId, orgId),
        eq(clientTable.locationId, locationId),
      ),
      with: {
        clientInstructors: {
          with: {
            instructor: { columns: { name: true } },
          },
        },
      },
      orderBy: desc(clientTable.updatedAt),
      limit: REPORT_ROW_LIMIT,
    }),
    db.query.studioMembership.findMany({
      where: and(
        eq(studioMembership.organizationId, orgId),
        eq(studioMembership.locationId, locationId),
      ),
      with: { membershipPlan: { columns: { name: true, price: true } } },
    }),
    db.query.clientAccountBalance.findMany({
      where: and(
        eq(clientAccountBalance.organizationId, orgId),
        eq(clientAccountBalance.locationId, locationId),
      ),
      columns: { balance: true, clientId: true, currency: true },
    }),
  ]);
  const membershipByClient = new Map(
    memberships.map((membership) => [
      membership.clientId,
      membership.membershipPlan?.name ?? membership.name,
    ]),
  );
  const accountBalanceByClient = new Map(
    balances.map((balance) => [
      balance.clientId,
      {
        balance: normalizeReportMoney(balance.balance, balance.currency),
        currency: balance.currency,
      },
    ]),
  );

  const rows = clients.map((client) => ({
    balance: accountBalanceByClient.get(client.id)?.balance ?? null,
    category: client.source ?? client.type,
    client: client.name,
    contract: membershipByClient.get(client.id) ?? null,
    currency: accountBalanceByClient.get(client.id)?.currency ?? null,
    date: formatReportDateInTimezone(client.createdAt, timezone),
    email: client.email,
    lastVisit: formatReportDateInTimezone(
      client.lastInteractionAt ?? client.updatedAt,
      timezone,
    ),
    phone:
      client.phone ??
      client.mobilePhone ??
      client.homePhone ??
      client.workPhone,
    referrals: 0,
    service: membershipByClient.get(client.id) ?? null,
    staff:
      client.clientInstructors
        .map((assignment) => assignment.instructor.name)
        .join(", ") || null,
    status: client.lifecycleStage ?? client.type,
    updatedAt: formatReportDateInTimezone(client.updatedAt, timezone),
    visits: client.attendanceCount,
  }));

  if (reportId === "account-balances") {
    return rows.filter((row) => {
      if (typeof row.balance !== "string" || typeof row.currency !== "string") {
        return false;
      }
      return reportMoneyToMinor(row.balance, row.currency) !== 0;
    });
  }

  return rows;
}

async function getStaffRows(
  orgId: string,
  locationId: string,
  reportId: string,
  timezone: string,
  fallbackCurrency: string,
): Promise<ReportDataRow[]> {
  const operationalRows = await getOperationalStaffReportRows(orgId, locationId, reportId, timezone);
  if (operationalRows) return operationalRows;
  const [instructors, staffMembers] = await Promise.all([
    db.query.instructor.findMany({
      where: and(
        eq(instructor.organizationId, orgId),
        eq(instructor.locationId, locationId),
      ),
      orderBy: asc(instructor.name),
      limit: REPORT_ROW_LIMIT,
    }),
    db.query.studioStaffMember.findMany({
      where: and(
        eq(studioStaffMember.organizationId, orgId),
        eq(studioStaffMember.locationId, locationId),
        isNull(studioStaffMember.deletedAt),
      ),
      orderBy: asc(studioStaffMember.name),
      limit: REPORT_ROW_LIMIT,
    }),
  ]);
  const instructorRows = instructors.map((item) => {
    const currency = resolveReportCurrency(item.currency, fallbackCurrency);
    return {
      currency,
      date: formatReportDateInTimezone(item.updatedAt, timezone),
      email: item.email,
      pay: item.hourlyRate
        ? normalizeReportMoney(item.hourlyRate, currency)
        : null,
      role: item.role ?? "Instructor",
      staff: item.name,
      status: item.isActive ? "ACTIVE" : "INACTIVE",
      updatedAt: formatReportDateInTimezone(item.updatedAt, timezone),
    };
  });

  const staffRows = staffMembers
    .filter(
      (item) => !instructors.some((teacher) => teacher.email === item.email),
    )
    .map((item) => {
      const currency = resolveReportCurrency(item.currency, fallbackCurrency);
      return {
        currency,
        date: formatReportDateInTimezone(item.updatedAt, timezone),
        email: item.email,
        pay: item.hourlyRate
          ? normalizeReportMoney(item.hourlyRate, currency)
          : null,
        phone: item.phone,
        role: item.role ?? item.staffType,
        staff: item.name,
        status: item.isActive ? "ACTIVE" : "INACTIVE",
        updatedAt: formatReportDateInTimezone(item.updatedAt, timezone),
      };
    });

  return [...instructorRows, ...staffRows].slice(0, REPORT_ROW_LIMIT);
}

async function getInventoryRows(
  orgId: string,
  locationId: string,
  reportId: string,
  timezone: string,
): Promise<ReportDataRow[]> {
  if (reportId === "inventory-on-hand") {
    const products = await db.query.studioProduct.findMany({
      where: and(
        eq(studioProduct.organizationId, orgId),
        eq(studioProduct.locationId, locationId),
        isNull(studioProduct.deletedAt),
      ),
      orderBy: asc(studioProduct.name),
      limit: REPORT_ROW_LIMIT,
    });

    return products.map((product) => ({
      category: product.category ?? product.type,
      cost: normalizeReportMoney(product.cost ?? "0", product.currency),
      currency: product.currency,
      product: product.name,
      quantity: product.stockQuantity ?? 0,
      status: product.isActive ? "ACTIVE" : "INACTIVE",
      supplier: product.category ?? product.type,
      updatedAt: formatReportDateInTimezone(product.updatedAt, timezone),
    }));
  }

  const lineItems = await db.query.studioPaymentLineItem.findMany({
    where: and(
      eq(studioPaymentLineItem.organizationId, orgId),
      eq(studioPaymentLineItem.locationId, locationId),
      isNull(studioPaymentLineItem.deletedAt),
    ),
    columns: {
      amount: true,
      currency: true,
      discountAmount: true,
      quantity: true,
      returned: true,
      soldAt: true,
      unitPrice: true,
    },
    with: {
      studioProduct: {
        columns: {
          category: true,
          cost: true,
          currency: true,
          id: true,
          isActive: true,
          name: true,
          type: true,
        },
      },
    },
    orderBy: desc(studioPaymentLineItem.soldAt),
    limit: REPORT_ROW_LIMIT,
  });
  type InventorySalesTotal = {
    category: string;
    cost: string | null;
    currency: string;
    discount: string;
    gross: string;
    net: string;
    product: string;
    quantity: number;
    status: string;
    supplier: string;
  };
  const totals = new Map<string, InventorySalesTotal>();

  for (const lineItem of lineItems) {
    const product = lineItem.studioProduct;
    if (!product) continue;
    const currency = lineItem.currency;
    const key = `${product.id}:${currency.toUpperCase()}`;
    const gross = signedReportMoney(
      multiplyReportMoney(lineItem.unitPrice, lineItem.quantity, currency),
      lineItem.returned,
      currency,
    );
    const discount = signedReportMoney(
      lineItem.discountAmount,
      lineItem.returned,
      currency,
    );
    const net = signedReportMoney(lineItem.amount, lineItem.returned, currency);
    const cost =
      product.cost && product.currency.toUpperCase() === currency.toUpperCase()
        ? signedReportMoney(
            multiplyReportMoney(product.cost, lineItem.quantity, currency),
            lineItem.returned,
            currency,
          )
        : null;
    const existing = totals.get(key);

    if (existing) {
      existing.gross = addReportMoney(existing.gross, gross, currency);
      existing.discount = addReportMoney(existing.discount, discount, currency);
      existing.net = addReportMoney(existing.net, net, currency);
      existing.cost =
        existing.cost && cost
          ? addReportMoney(existing.cost, cost, currency)
          : null;
      existing.quantity += lineItem.returned
        ? -lineItem.quantity
        : lineItem.quantity;
      continue;
    }

    totals.set(key, {
      category: product.category ?? product.type,
      cost,
      currency,
      discount,
      gross,
      net,
      product: product.name,
      quantity: lineItem.returned ? -lineItem.quantity : lineItem.quantity,
      status: product.isActive ? "ACTIVE" : "INACTIVE",
      supplier: product.category ?? product.type,
    });
  }

  return Array.from(totals.values()).map((row) => {
    const profit = row.cost
      ? subtractReportMoney(row.net, row.cost, row.currency)
      : null;
    const netMinor = reportMoneyToMinor(row.net, row.currency);
    return {
      ...row,
      amount: row.net,
      margin:
        profit && netMinor !== 0
          ? Math.round(
              (reportMoneyToMinor(profit, row.currency) / netMinor) * 1_000,
            ) / 10
          : null,
      profit,
      revenue: row.net,
    };
  });
}

async function getMembershipRows(
  orgId: string,
  locationId: string,
  timezone: string,
  fallbackCurrency: string,
): Promise<ReportDataRow[]> {
  const memberships = await db.query.studioMembership.findMany({
    where: and(
      eq(studioMembership.organizationId, orgId),
      eq(studioMembership.locationId, locationId),
    ),
    with: {
      client: { columns: { email: true, name: true, phone: true } },
      membershipPlan: { columns: { name: true, price: true } },
    },
    orderBy: desc(studioMembership.updatedAt),
    limit: REPORT_ROW_LIMIT,
  });
  const pricingOptionNameById = await getPricingOptionNameById(
    orgId,
    memberships
      .map((membership) => pricingOptionIdFromMetadata(membership.metadata))
      .filter((id): id is string => Boolean(id)),
  );

  return memberships.map((membership) => {
    const currency = membership.currency ?? fallbackCurrency;
    const revenue = normalizeReportMoney(
      membership.price ?? membership.membershipPlan?.price ?? "0",
      currency,
    );
    const totalClasses = membership.totalClasses ?? 0;
    const usedClasses = membership.usedClasses ?? 0;
    const remainingClasses = Math.max(totalClasses - usedClasses, 0);
    const deferredRevenue =
      totalClasses > 0
        ? prorateReportMoney({
            total: revenue,
            numerator: remainingClasses,
            denominator: totalClasses,
            currency,
          })
        : null;
    const pricingOptionId = pricingOptionIdFromMetadata(membership.metadata);
    const pricingOptionName = pricingOptionId
      ? (pricingOptionNameById.get(pricingOptionId) ?? pricingOptionId)
      : null;

    return {
      amount: revenue,
      balance: deferredRevenue,
      client: membership.client.name,
      clientCount: 1,
      contract:
        pricingOptionName ?? membership.membershipPlan?.name ?? membership.name,
      currency,
      deferredRevenue,
      email: membership.client.email,
      endDate: formatReportDateInTimezone(
        membership.endDate ?? membership.cancelledAt,
        timezone,
      ),
      method: membership.paymentMethod ?? membership.paymentFrequency,
      nextBillingDate: formatReportDateInTimezone(
        membership.renewalDate ?? membership.endDate,
        timezone,
      ),
      phone: membership.client.phone,
      pricingOption: pricingOptionName,
      quantity: totalClasses,
      renewalDate: formatReportDateInTimezone(membership.renewalDate, timezone),
      revenue,
      startDate: formatReportDateInTimezone(membership.startDate, timezone),
      status: membership.status,
      transactions: membership.totalPayments ?? 0,
      used: usedClasses,
    };
  });
}

async function getGiftCardRows(
  orgId: string,
  locationId: string,
  timezone: string,
): Promise<ReportDataRow[]> {
  const giftCards = await db.query.giftCard.findMany({
    where: and(
      eq(giftCard.organizationId, orgId),
      eq(giftCard.locationId, locationId),
    ),
    with: {
      client_purchasedByClientId: { columns: { name: true } },
      client_redeemedByClientId: { columns: { name: true } },
    },
    orderBy: desc(giftCard.purchasedAt),
    limit: REPORT_ROW_LIMIT,
  });

  return giftCards.map((item) => {
    const initialValue = normalizeReportMoney(item.initialValue, item.currency);
    const remainingBalance = normalizeReportMoney(
      item.remainingBalance,
      item.currency,
    );
    const used = subtractReportMoney(
      initialValue,
      remainingBalance,
      item.currency,
    );

    return {
      amount: initialValue,
      balance: remainingBalance,
      client:
        item.client_redeemedByClientId?.name ??
        item.client_purchasedByClientId?.name ??
        null,
      currency: item.currency,
      date: formatReportDateInTimezone(item.purchasedAt, timezone),
      endDate: formatReportDateInTimezone(item.expiresAt, timezone),
      revenue: used,
      status: item.isActive ? "ACTIVE" : "INACTIVE",
      used,
    };
  });
}

const AGGREGATE_MONEY_FIELDS = [
  "amount",
  "cost",
  "discount",
  "gross",
  "net",
  "profit",
  "revenue",
  "tax",
] as const;

function aggregateRows(
  rows: readonly ReportDataRow[],
  groupFields: readonly string[],
): ReportDataRow[] {
  const grouped = new Map<
    string,
    ReportDataRow & { clientNames?: Set<string> }
  >();

  for (const row of rows) {
    const effectiveGroupFields = row.currency
      ? [...groupFields, "currency"]
      : groupFields;
    const key = effectiveGroupFields
      .map((field) => String(row[field] ?? "Unassigned"))
      .join("|");
    const existing = grouped.get(key);

    if (existing) {
      existing.transactions =
        Number(existing.transactions ?? 0) + Number(row.transactions ?? 1);
      existing.quantity =
        Number(existing.quantity ?? 0) + Number(row.quantity ?? 0);
      const currency =
        typeof row.currency === "string" ? row.currency : undefined;
      for (const field of AGGREGATE_MONEY_FIELDS) {
        const current = existing[field];
        const incoming = row[field];
        if (
          currency &&
          typeof current === "string" &&
          typeof incoming === "string"
        ) {
          existing[field] = addReportMoney(current, incoming, currency);
        } else if (current === undefined && incoming !== undefined) {
          existing[field] = incoming;
        } else if (current === null || incoming === null) {
          existing[field] = null;
        }
      }
      if (row.client) existing.clientNames?.add(String(row.client));
      continue;
    }

    const nextRow: ReportDataRow & { clientNames?: Set<string> } = {
      ...row,
      transactions: 1,
    };

    if (row.client) {
      nextRow.clientNames = new Set([String(row.client)]);
    }

    grouped.set(key, nextRow);
  }

  return Array.from(grouped.values()).map(({ clientNames, ...row }) => {
    const currency =
      typeof row.currency === "string" ? row.currency : undefined;
    const revenue =
      typeof row.revenue === "string"
        ? row.revenue
        : typeof row.net === "string"
          ? row.net
          : null;
    const profit = typeof row.profit === "string" ? row.profit : null;
    const transactions = Number(row.transactions ?? 0);

    return {
      ...row,
      averageRevenue:
        currency && revenue
          ? averageReportMoney(revenue, transactions, currency)
          : null,
      clientCount: clientNames?.size ?? null,
      margin:
        currency &&
        revenue &&
        profit &&
        reportMoneyToMinor(revenue, currency) !== 0
          ? Math.round(
              (reportMoneyToMinor(profit, currency) /
                reportMoneyToMinor(revenue, currency)) *
                1_000,
            ) / 10
          : null,
    };
  });
}

function inferCardBrand(method: string | null): string | null {
  if (!method) return null;
  const normalized = method.toLowerCase();

  if (normalized.includes("visa")) return "Visa";
  if (normalized.includes("mastercard") || normalized.includes("master"))
    return "Mastercard";
  if (normalized.includes("amex") || normalized.includes("american"))
    return "American Express";
  if (normalized.includes("ach")) return "ACH";
  if (normalized.includes("card")) return "Card";

  return method;
}

function scopeClass(
  orgId: string,
  locationId: string,
  startDate?: Date,
  endDate?: Date,
) {
  return and(
    eq(studioClass.organizationId, orgId),
    eq(studioClass.locationId, locationId),
    startDate ? gte(studioClass.startTime, startDate) : undefined,
    endDate ? lte(studioClass.startTime, endDate) : undefined,
  );
}

async function reportClasses(
  orgId: string,
  locationId: string,
  startDate: Date,
  endDate: Date,
) {
  const classes = await db.query.studioClass.findMany({
    where: scopeClass(orgId, locationId, startDate, endDate),
    with: {
      classType: { columns: { name: true } },
      checkIns: { columns: { id: true } },
    },
    orderBy: asc(studioClass.startTime),
  });

  return classes.map((item) => ({
    ...item,
    _count: { checkIn: item.checkIns.length },
  }));
}

export async function getReportRowsForScope(input: {
  organizationId: string;
  locationId: string;
  groupId: ReportGroupId;
  reportId: string;
}): Promise<{ rows: ReportDataRow[]; sourceLimitReached: boolean }> {
  if (!getReportById(input.groupId, input.reportId)) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
  }
  const locale = await getReportLocale({
    organizationId: input.organizationId,
    locationId: input.locationId,
  });
  let rows: ReportDataRow[];
  if (input.groupId === "sales") {
    rows = await getSalesRows(
      input.organizationId,
      input.locationId,
      input.reportId,
      locale.timezone,
      locale.currency,
    );
  } else if (input.groupId === "payment-processing") {
    rows = await getPaymentRows(
      input.organizationId,
      input.locationId,
      input.reportId,
      locale.timezone,
      locale.currency,
    );
  } else if (input.groupId === "clients") {
    rows = await getClientRows(
      input.organizationId,
      input.locationId,
      input.reportId,
      locale.timezone,
      locale.currency,
    );
  } else if (input.groupId === "staff") {
    rows = await getStaffRows(
      input.organizationId,
      input.locationId,
      input.reportId,
      locale.timezone,
      locale.currency,
    );
  } else {
    rows = await getInventoryRows(
      input.organizationId,
      input.locationId,
      input.reportId,
      locale.timezone,
    );
  }
  const sourceCount = await getReportSourceCount(input);
  return { rows, sourceLimitReached: sourceCount > REPORT_ROW_LIMIT };
}

async function getReportSourceCount(input: {
  organizationId: string;
  locationId: string;
  groupId: ReportGroupId;
  reportId: string;
}): Promise<number> {
  if (input.groupId === "sales") {
    if (["gift-cards", "gift-card-analysis"].includes(input.reportId)) {
      const [row] = await db
        .select({ value: count() })
        .from(giftCard)
        .where(
          and(
            eq(giftCard.organizationId, input.organizationId),
            eq(giftCard.locationId, input.locationId),
          ),
        );
      return row?.value ?? 0;
    }
    if (["contract-sales", "outstanding-series"].includes(input.reportId)) {
      const [row] = await db
        .select({ value: count() })
        .from(studioMembership)
        .where(
          and(
            eq(studioMembership.organizationId, input.organizationId),
            eq(studioMembership.locationId, input.locationId),
          ),
        );
      return row?.value ?? 0;
    }
    if (input.reportId === "revenue-by-class") {
      const [row] = await db.select({ value: count() }).from(studioClass).where(and(
        eq(studioClass.organizationId, input.organizationId),
        eq(studioClass.locationId, input.locationId),
      ));
      return row?.value ?? 0;
    }
    if (input.reportId === "invoice") {
      const [row] = await db.select({ value: count() })
        .from(invoiceLineItem)
        .innerJoin(invoice, eq(invoice.id, invoiceLineItem.invoiceId))
        .where(and(
          eq(invoice.organizationId, input.organizationId),
          eq(invoice.locationId, input.locationId),
        ));
      return row?.value ?? 0;
    }
    const [row] = await db
      .select({ value: count() })
      .from(studioPaymentLineItem)
      .where(
        and(
          eq(studioPaymentLineItem.organizationId, input.organizationId),
          eq(studioPaymentLineItem.locationId, input.locationId),
          isNull(studioPaymentLineItem.deletedAt),
        ),
      );
    return row?.value ?? 0;
  }
  if (input.groupId === "payment-processing") {
    const [row] = await db
      .select({ value: count() })
      .from(commerceLedgerEntry)
      .where(
        and(
          eq(commerceLedgerEntry.organizationId, input.organizationId),
          eq(commerceLedgerEntry.locationId, input.locationId),
          transactionLedgerCondition(input.reportId),
        ),
      );
    return row?.value ?? 0;
  }
  if (input.groupId === "clients") {
    const table = [
      "membership",
      "pricing-option-expirations",
      "new-members",
      "visits-remaining",
    ].includes(input.reportId)
      ? studioMembership
      : [
          "attendance-analysis",
          "attendance-without-revenue",
          "client-arrivals",
          "client-schedule-at-a-glance",
          "clients-per-teacher",
          "no-shows",
        ].includes(input.reportId)
        ? studioClass
        : clientTable;
    const [row] = await db
      .select({ value: count() })
      .from(table)
      .where(
        and(
          eq(table.organizationId, input.organizationId),
          eq(table.locationId, input.locationId),
        ),
      );
    return row?.value ?? 0;
  }
  if (input.groupId === "staff") {
    if (input.reportId === "payroll") {
      const [row] = await db.select({ value: count() })
        .from(payrollRunInstructor)
        .innerJoin(payrollRun, eq(payrollRun.id, payrollRunInstructor.payrollRunId))
        .where(and(eq(payrollRun.organizationId, input.organizationId), eq(payrollRun.locationId, input.locationId)));
      return row?.value ?? 0;
    }
    const operationalTable = input.reportId === "time-clock"
      ? timeLog
      : ["staff-schedule", "staff-schedule-at-a-glance"].includes(input.reportId)
        ? rota
        : input.reportId === "tasks"
          ? task
          : null;
    if (operationalTable) {
      const [row] = await db.select({ value: count() }).from(operationalTable).where(and(
        eq(operationalTable.organizationId, input.organizationId),
        eq(operationalTable.locationId, input.locationId),
      ));
      return row?.value ?? 0;
    }
    const [teachers, staff] = await Promise.all([
      db
        .select({ value: count() })
        .from(instructor)
        .where(
          and(
            eq(instructor.organizationId, input.organizationId),
            eq(instructor.locationId, input.locationId),
          ),
        ),
      db
        .select({ value: count() })
        .from(studioStaffMember)
        .where(
          and(
            eq(studioStaffMember.organizationId, input.organizationId),
            eq(studioStaffMember.locationId, input.locationId),
            isNull(studioStaffMember.deletedAt),
          ),
        ),
    ]);
    return (teachers[0]?.value ?? 0) + (staff[0]?.value ?? 0);
  }
  const inventorySales = [
    "inventory-sales-by-product",
    "cost-of-goods-sold",
    "inventory-sales-by-supplier",
  ].includes(input.reportId);
  if (inventorySales) {
    const [row] = await db
      .select({ value: count() })
      .from(studioPaymentLineItem)
      .where(
        and(
          eq(studioPaymentLineItem.organizationId, input.organizationId),
          eq(studioPaymentLineItem.locationId, input.locationId),
          isNull(studioPaymentLineItem.deletedAt),
        ),
      );
    return row?.value ?? 0;
  }
  const [row] = await db
    .select({ value: count() })
    .from(studioProduct)
    .where(
      and(
        eq(studioProduct.organizationId, input.organizationId),
        eq(studioProduct.locationId, input.locationId),
        isNull(studioProduct.deletedAt),
      ),
    );
  return row?.value ?? 0;
}

export const reportsRouter = createTRPCRouter({
  rows: reportViewProcedure
    .input(z.object({ groupId: ReportGroupIdSchema, reportId: z.string() }))
    .output(
      z.object({
        rows: z.array(reportDataRowSchema),
        sourceLimitReached: z.boolean(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { locationId, orgId } = requireOrgAndLocation(ctx);
      return getReportRowsForScope({
        organizationId: orgId,
        locationId,
        groupId: input.groupId,
        reportId: input.reportId,
      });
    }),

  revenue: reportViewProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
        groupBy: z.enum(["day", "week", "month"]).default("day"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { locationId, orgId } = requireOrgAndLocation(ctx);
      const [payments, locale] = await Promise.all([
        db.query.studioPayment.findMany({
          where: scopePayment(
            orgId,
            locationId,
            new Date(input.startDate),
            new Date(input.endDate),
          ),
          columns: { amount: true, type: true, createdAt: true, currency: true },
          orderBy: asc(studioPayment.createdAt),
        }),
        getReportLocale({ organizationId: orgId, locationId }),
      ]);

      const totalRevenue = payments.reduce(
        (sum, payment) => sum + Number(payment.amount),
        0,
      );
      const byType: Record<string, number> = {};
      for (const payment of payments) {
        byType[payment.type] =
          (byType[payment.type] ?? 0) + Number(payment.amount);
      }

      return {
        totalRevenue,
        byType,
        transactionCount: payments.length,
        averageTransaction:
          payments.length > 0 ? totalRevenue / payments.length : 0,
        currency: payments[0]?.currency ?? locale.currency,
        locale: locale.locale,
        payments,
      };
    }),

  attendance: reportViewProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .query(async ({ ctx, input }) => {
      const { locationId, orgId } = requireOrgAndLocation(ctx);
      const classes = await reportClasses(
        orgId,
        locationId,
        new Date(input.startDate),
        new Date(input.endDate),
      );

      const totalClasses = classes.length;
      const totalCapacity = classes.reduce(
        (sum, item) => sum + (item.maxCapacity ?? 0),
        0,
      );
      const totalBooked = classes.reduce(
        (sum, item) => sum + item.bookedCount,
        0,
      );
      const totalCheckedIn = classes.reduce(
        (sum, item) => sum + item._count.checkIn,
        0,
      );
      const avgUtilization =
        totalCapacity > 0 ? (totalBooked / totalCapacity) * 100 : 0;
      const noShowRate =
        totalBooked > 0
          ? ((totalBooked - totalCheckedIn) / totalBooked) * 100
          : 0;

      const byClassType: Record<
        string,
        { classes: number; booked: number; capacity: number; checkedIn: number }
      > = {};
      for (const item of classes) {
        const typeName = item.classType?.name ?? "Uncategorized";
        byClassType[typeName] ??= {
          classes: 0,
          booked: 0,
          capacity: 0,
          checkedIn: 0,
        };
        byClassType[typeName].classes++;
        byClassType[typeName].booked += item.bookedCount;
        byClassType[typeName].capacity += item.maxCapacity ?? 0;
        byClassType[typeName].checkedIn += item._count.checkIn;
      }

      return {
        totalClasses,
        totalCapacity,
        totalBooked,
        totalCheckedIn,
        avgUtilization: Math.round(avgUtilization * 10) / 10,
        noShowRate: Math.round(noShowRate * 10) / 10,
        byClassType,
      };
    }),

  membership: reportViewProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .query(async ({ ctx, input }) => {
      const { locationId, orgId } = requireOrgAndLocation(ctx);
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);
      const memberships = await db.query.studioMembership.findMany({
        where: and(
          eq(studioMembership.organizationId, orgId),
          eq(studioMembership.locationId, locationId),
        ),
        with: { membershipPlan: { columns: { name: true, price: true } } },
      });

      const active = memberships.filter(
        (membership) => membership.status === "ACTIVE",
      );
      const cancelled = memberships.filter(
        (membership) =>
          membership.status === "CANCELLED" &&
          membership.updatedAt >= startDate &&
          membership.updatedAt <= endDate,
      );
      const newMembers = memberships.filter(
        (membership) =>
          membership.createdAt >= startDate && membership.createdAt <= endDate,
      );
      const mrr = active.reduce(
        (sum, membership) =>
          sum + Number(membership.membershipPlan?.price ?? 0),
        0,
      );

      const byPlan: Record<string, number> = {};
      for (const membership of active) {
        const planName = membership.membershipPlan?.name ?? "Unknown";
        byPlan[planName] = (byPlan[planName] ?? 0) + 1;
      }

      const churnRate =
        active.length > 0
          ? (cancelled.length / (active.length + cancelled.length)) * 100
          : 0;

      return {
        totalActive: active.length,
        newInPeriod: newMembers.length,
        cancelledInPeriod: cancelled.length,
        churnRate: Math.round(churnRate * 10) / 10,
        mrr,
        byPlan,
      };
    }),

  instructorPerformance: reportViewProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .query(async ({ ctx, input }) => {
      const { locationId, orgId } = requireOrgAndLocation(ctx);
      const classes = await reportClasses(
        orgId,
        locationId,
        new Date(input.startDate),
        new Date(input.endDate),
      );
      const byInstructor: Record<
        string,
        {
          classesCount: number;
          totalBooked: number;
          totalCapacity: number;
          totalCheckedIn: number;
        }
      > = {};

      for (const item of classes) {
        const name = item.instructorName ?? "Unassigned";
        byInstructor[name] ??= {
          classesCount: 0,
          totalBooked: 0,
          totalCapacity: 0,
          totalCheckedIn: 0,
        };
        byInstructor[name].classesCount++;
        byInstructor[name].totalBooked += item.bookedCount;
        byInstructor[name].totalCapacity += item.maxCapacity ?? 0;
        byInstructor[name].totalCheckedIn += item._count.checkIn;
      }

      return Object.entries(byInstructor)
        .map(([name, stats]) => ({
          instructor: name,
          ...stats,
          fillRate:
            stats.totalCapacity > 0
              ? Math.round((stats.totalBooked / stats.totalCapacity) * 1000) /
                10
              : 0,
        }))
        .sort((a, b) => b.fillRate - a.fillRate);
    }),

  revenueTrend: reportViewProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
        groupBy: z.enum(["day", "week", "month"]).default("day"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { locationId, orgId } = requireOrgAndLocation(ctx);
      const [payments, locale] = await Promise.all([
        db.query.studioPayment.findMany({
          where: scopePayment(
            orgId,
            locationId,
            new Date(input.startDate),
            new Date(input.endDate),
          ),
          columns: { amount: true, createdAt: true },
          orderBy: asc(studioPayment.createdAt),
        }),
        getReportLocale({ organizationId: orgId, locationId }),
      ]);

      const grouped: Record<string, number> = {};
      for (const payment of payments) {
        const key = reportBucketKey({
          value: payment.createdAt,
          timezone: locale.timezone,
          weekStart: locale.weekStart,
          groupBy: input.groupBy,
        });
        grouped[key] = (grouped[key] ?? 0) + Number(payment.amount);
      }

      return Object.entries(grouped).map(([date, amount]) => ({
        date,
        amount,
        currency: locale.currency,
        locale: locale.locale,
      }));
    }),

  revenueForecast: reportViewProcedure
    .input(z.object({ months: z.number().min(1).max(12).default(3) }))
    .query(async ({ ctx, input }) => {
      const { locationId, orgId } = requireOrgAndLocation(ctx);
      const [activeMemberships, locale] = await Promise.all([
        db.query.studioMembership.findMany({
          where: and(
            eq(studioMembership.organizationId, orgId),
            eq(studioMembership.locationId, locationId),
            eq(studioMembership.status, "ACTIVE"),
          ),
          with: {
            membershipPlan: { columns: { price: true, billingInterval: true } },
          },
        }),
        getReportLocale({ organizationId: orgId, locationId }),
      ]);

      const monthlyRecurring = activeMemberships.reduce((sum, membership) => {
        const price = Number(membership.membershipPlan?.price ?? 0);
        const interval =
          membership.membershipPlan?.billingInterval ?? "MONTHLY";
        if (interval === "ANNUALLY") return sum + price / 12;
        if (interval === "WEEKLY") return sum + price * 4.33;
        return sum + price;
      }, 0);

      const expiringByMonth: Record<string, number> = {};
      for (const membership of activeMemberships) {
        if (membership.endDate) {
          const key = `${membership.endDate.getFullYear()}-${String(membership.endDate.getMonth() + 1).padStart(2, "0")}`;
          expiringByMonth[key] =
            (expiringByMonth[key] ?? 0) +
            Number(membership.membershipPlan?.price ?? 0);
        }
      }

      const forecast: { month: string; projected: number; atRisk: number }[] =
        [];
      const now = new Date();
      for (let index = 1; index <= input.months; index++) {
        const futureDate = new Date(
          now.getFullYear(),
          now.getMonth() + index,
          1,
        );
        const key = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, "0")}`;
        const atRisk = expiringByMonth[key] ?? 0;
        forecast.push({
          month: key,
          projected: Math.round((monthlyRecurring - atRisk) * 100) / 100,
          atRisk: Math.round(atRisk * 100) / 100,
        });
      }

      return {
        currentMrr: Math.round(monthlyRecurring * 100) / 100,
        forecast,
        currency: locale.currency,
        locale: locale.locale,
      };
    }),

  attendanceTrend: reportViewProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .query(async ({ ctx, input }) => {
      const { locationId, orgId } = requireOrgAndLocation(ctx);
      const [classes, locale] = await Promise.all([
        reportClasses(
          orgId,
          locationId,
          new Date(input.startDate),
          new Date(input.endDate),
        ),
        getReportLocale({ organizationId: orgId, locationId }),
      ]);

      const grouped: Record<
        string,
        { booked: number; checkedIn: number; capacity: number }
      > = {};
      for (const item of classes) {
        const key = reportBucketKey({
          value: item.startTime,
          timezone: locale.timezone,
          weekStart: locale.weekStart,
          groupBy: "day",
        });
        grouped[key] ??= { booked: 0, checkedIn: 0, capacity: 0 };
        grouped[key].booked += item.bookedCount;
        grouped[key].checkedIn += item._count.checkIn;
        grouped[key].capacity += item.maxCapacity ?? 0;
      }

      return Object.entries(grouped).map(([date, stats]) => ({
        date,
        ...stats,
      }));
    }),

  exportCsv: reportExportProcedure
    .input(
      z.object({
        reportType: z.enum([
          "revenue",
          "attendance",
          "membership",
          "instructor",
        ]),
        startDate: z.string(),
        endDate: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { locationId, orgId } = requireOrgAndLocation(ctx);
      let rows: string[][] = [];
      let headers: string[] = [];

      if (input.reportType === "revenue") {
        headers = ["Date", "Type", "Amount", "Currency"];
        const payments = await db.query.studioPayment.findMany({
          where: scopePayment(
            orgId,
            locationId,
            new Date(input.startDate),
            new Date(input.endDate),
          ),
          orderBy: asc(studioPayment.createdAt),
        });
        rows = payments.map((payment) => [
          payment.createdAt.toISOString().split("T")[0],
          payment.type,
          String(payment.amount),
          payment.currency,
        ]);
      } else if (input.reportType === "attendance") {
        headers = ["Date", "Class", "Capacity", "Booked", "Checked In"];
        const classes = await reportClasses(
          orgId,
          locationId,
          new Date(input.startDate),
          new Date(input.endDate),
        );
        rows = classes.map((item) => [
          item.startTime.toISOString().split("T")[0],
          item.name,
          String(item.maxCapacity ?? 0),
          String(item.bookedCount),
          String(item._count.checkIn),
        ]);
      } else if (input.reportType === "membership") {
        headers = [
          "Member",
          "Plan",
          "Status",
          "Started",
          "Credits Used",
          "Credits Total",
        ];
        const memberships = await db.query.studioMembership.findMany({
          where: and(
            eq(studioMembership.organizationId, orgId),
            eq(studioMembership.locationId, locationId),
          ),
          with: {
            membershipPlan: { columns: { name: true } },
            client: { columns: { name: true } },
          },
        });
        rows = memberships.map((membership) => [
          membership.client?.name ?? "Unknown",
          membership.membershipPlan?.name ?? "Unknown",
          membership.status,
          membership.createdAt.toISOString().split("T")[0],
          String(membership.usedClasses ?? 0),
          String(membership.totalClasses ?? "Unlimited"),
        ]);
      }

      const csvContent = buildPlainCsv([headers, ...rows]);

      return {
        csv: csvContent,
        filename: `${input.reportType}-report-${input.startDate}-${input.endDate}.csv`,
      };
    }),
});
