import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gte, isNull, lte } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  client as clientTable,
  giftCard,
  instructor,
  instructorPayout,
  studioClass,
  studioMembership,
  studioPayment,
  studioPaymentLineItem,
  studioProduct,
  studioStaffMember,
} from "@/db/schema";
import { getReportById } from "@/features/reports/helpers";
import type { ReportDataRow } from "@/features/reports/types";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

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
    throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
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

function formatDate(value: Date | null | undefined): string | null {
  return value ? value.toISOString().split("T")[0] : null;
}

function numberValue(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function scopePayment(orgId: string, locationId: string | null, startDate?: Date, endDate?: Date) {
  return and(
    eq(studioPayment.organizationId, orgId),
    locationId ? eq(studioPayment.locationId, locationId) : undefined,
    eq(studioPayment.status, "SUCCEEDED"),
    startDate ? gte(studioPayment.createdAt, startDate) : undefined,
    endDate ? lte(studioPayment.createdAt, endDate) : undefined,
  );
}

async function getSalesRows(
  orgId: string,
  locationId: string,
  reportId: string,
): Promise<ReportDataRow[]> {
  if (
    [
      "contract-sales",
      "outstanding-series",
      "average-revenue-analysis",
    ].includes(reportId)
  ) {
    return getMembershipRows(orgId, locationId);
  }

  if (["gift-cards", "gift-card-analysis"].includes(reportId)) {
    return getGiftCardRows(orgId, locationId);
  }

  if (reportId === "revenue-by-class") {
    return getClassRows(orgId, locationId);
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
          discountAmount: true,
          paymentMethod: true,
          status: true,
          taxAmount: true,
          type: true,
        },
        with: {
          promoCode: { columns: { code: true } },
        },
      },
      studioProduct: {
        columns: { category: true, cost: true, name: true, type: true },
      },
    },
    orderBy: desc(studioPaymentLineItem.soldAt),
    limit: REPORT_ROW_LIMIT,
  });
  const netTotalByPayment = new Map<string, number>();

  for (const lineItem of lineItems) {
    if (!lineItem.paymentId) continue;
    netTotalByPayment.set(
      lineItem.paymentId,
      (netTotalByPayment.get(lineItem.paymentId) ?? 0) +
        Math.abs(numberValue(lineItem.amount) ?? 0),
    );
  }

  const rows = lineItems.map((lineItem) => {
    const quantity = lineItem.quantity;
    const rawGross = Number(lineItem.unitPrice) * quantity;
    const rawDiscount = numberValue(lineItem.discountAmount) ?? 0;
    const rawNet = numberValue(lineItem.amount) ?? 0;
    const gross = lineItem.returned ? -Math.abs(rawGross) : rawGross;
    const discount = lineItem.returned ? -Math.abs(rawDiscount) : rawDiscount;
    const net = lineItem.returned ? -Math.abs(rawNet) : rawNet;
    const paymentTax = numberValue(lineItem.studioPayment?.taxAmount) ?? 0;
    const paymentNetTotal = lineItem.paymentId
      ? netTotalByPayment.get(lineItem.paymentId)
      : null;
    const proratedTax =
      paymentNetTotal && paymentNetTotal > 0
        ? roundMoney((paymentTax * Math.abs(rawNet)) / paymentNetTotal)
        : 0;
    const tax = lineItem.returned ? -Math.abs(proratedTax) : proratedTax;
    const cost = (numberValue(lineItem.studioProduct?.cost) ?? 0) * quantity;
    const profit = net - cost;
    const productName = lineItem.studioProduct?.name ?? lineItem.description ?? "Sale";
    const productType = lineItem.studioProduct?.type ?? null;
    const category = lineItem.studioProduct?.category ?? lineItem.category ?? productType;

    return {
      amount: lineItem.returned ? -Math.abs(net) : net,
      category,
      client: lineItem.client?.name ?? null,
      date: formatDate(lineItem.soldAt ?? lineItem.createdAt),
      discount,
      gross,
      item: productName,
      margin: net !== 0 ? Math.round((profit / net) * 1000) / 10 : null,
      method: lineItem.studioPayment?.paymentMethod ?? lineItem.studioPayment?.type ?? null,
      net,
      product: productType === "RETAIL" ? productName : null,
      profit,
      promotion: lineItem.studioPayment?.promoCode?.code ?? null,
      quantity,
      reason: lineItem.returned ? "Returned item" : null,
      revenue: net,
      service: productType === "RETAIL" ? null : productName,
      staff: null,
      status: lineItem.returned ? "REFUNDED" : lineItem.studioPayment?.status ?? "SUCCEEDED",
      supplier: category,
      tax,
      transactions: 1,
    };
  });

  if (reportId === "daily-closeout") {
    return aggregateRows(rows, ["date"]);
  }

  if (reportId === "cash-drawer") {
    return aggregateRows(rows, ["date", "method"]);
  }

  if (reportId === "sales-by-category") {
    return aggregateRows(rows, ["category"]);
  }

  if (reportId === "sales-tax") {
    return aggregateRows(rows, ["date", "category"]);
  }

  if (reportId === "sales-by-service" || reportId === "earned-revenue") {
    return aggregateRows(rows, ["service", "category"]);
  }

  if (reportId === "sales-by-product" || reportId === "best-sellers") {
    return aggregateRows(rows, ["product", "category"]);
  }

  if (reportId === "sales-by-supplier") {
    return aggregateRows(rows, ["supplier", "product"]);
  }

  if (reportId === "sales-promotions") {
    return aggregateRows(rows.filter((row) => row.promotion), ["promotion"]);
  }

  if (reportId === "returns") {
    return rows.filter((row) => row.status === "REFUNDED");
  }

  if (reportId === "voided-sales") {
    return rows.filter((row) =>
      ["CANCELLED", "FAILED", "REFUNDED"].includes(String(row.status ?? "")),
    );
  }

  return rows;
}

async function getPaymentRows(
  orgId: string,
  locationId: string,
  reportId: string,
): Promise<ReportDataRow[]> {
  if (
    [
      "autopay-cc-expirations",
      "autopay-detail",
      "autopay-expirations",
      "autopay-summary",
    ].includes(reportId)
  ) {
    return getMembershipRows(orgId, locationId);
  }

  const payments = await db.query.studioPayment.findMany({
    where: and(
      eq(studioPayment.organizationId, orgId),
      eq(studioPayment.locationId, locationId),
      isNull(studioPayment.deletedAt),
    ),
    with: {
      client: { columns: { name: true } },
      promoCode: { columns: { code: true } },
      studioMembership: { columns: { endDate: true, name: true, renewalDate: true } },
      studioProduct: { columns: { category: true, name: true, type: true } },
    },
    orderBy: desc(studioPayment.createdAt),
    limit: REPORT_ROW_LIMIT,
  });

  const rows = payments.map((payment) => {
    const amount = numberValue(payment.amount) ?? 0;
    const discount = numberValue(payment.discountAmount) ?? 0;
    const tax = numberValue(payment.taxAmount) ?? 0;

    return {
      amount,
      cardBrand: inferCardBrand(payment.paymentMethod),
      category: payment.studioProduct?.category ?? payment.type,
      client: payment.client?.name ?? null,
      contract: payment.studioMembership?.name ?? null,
      date: formatDate(payment.createdAt),
      discount,
      gross: amount + discount,
      item: payment.studioProduct?.name ?? payment.description ?? payment.type,
      method: payment.paymentMethod ?? payment.type,
      net: amount,
      nextBillingDate: formatDate(payment.studioMembership?.renewalDate),
      product: payment.studioProduct?.type === "RETAIL" ? payment.studioProduct.name : null,
      promotion: payment.promoCode?.code ?? null,
      revenue: amount,
      status: payment.status,
      tax,
      transactions: 1,
    };
  });

  if (reportId === "approved-transactions") {
    return rows.filter((row) => row.status === "PENDING");
  }

  if (reportId === "settled-transactions") {
    return rows.filter((row) => row.status === "SUCCEEDED");
  }

  if (reportId === "pending-transactions") {
    return rows.filter((row) => row.status === "PENDING");
  }

  if (reportId === "voided-rejected-transactions") {
    return rows.filter((row) =>
      ["CANCELLED", "FAILED", "REFUNDED"].includes(String(row.status ?? "")),
    );
  }

  if (reportId === "card-updater") {
    return rows.map((row) => ({ ...row, status: "UPDATED" }));
  }

  return rows;
}

async function getClientRows(
  orgId: string,
  locationId: string,
  reportId: string,
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
    return getMembershipRows(orgId, locationId);
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
    return getClassRows(orgId, locationId);
  }

  if (reportId === "client-promotions") {
    return getPaymentRows(orgId, locationId, "transactions").then((rows) =>
      rows.filter((row) => row.promotion),
    );
  }

  const [clients, memberships, payments] = await Promise.all([
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
    db.query.studioPayment.findMany({
      where: and(
        eq(studioPayment.organizationId, orgId),
        eq(studioPayment.locationId, locationId),
        isNull(studioPayment.deletedAt),
      ),
      columns: { amount: true, clientId: true, createdAt: true, status: true },
    }),
  ]);
  const membershipByClient = new Map(
    memberships.map((membership) => [
      membership.clientId,
      membership.membershipPlan?.name ?? membership.name,
    ]),
  );
  const balanceByClient = new Map<string, number>();

  for (const payment of payments) {
    if (!payment.clientId || payment.status !== "SUCCEEDED") continue;
    balanceByClient.set(
      payment.clientId,
      (balanceByClient.get(payment.clientId) ?? 0) + Number(payment.amount),
    );
  }

  const rows = clients.map((client) => ({
    balance: balanceByClient.get(client.id) ?? null,
    category: client.source ?? client.type,
    client: client.name,
    contract: membershipByClient.get(client.id) ?? null,
    date: formatDate(client.createdAt),
    email: client.email,
    lastVisit: formatDate(client.lastInteractionAt ?? client.updatedAt),
    phone: client.phone ?? client.mobilePhone ?? client.homePhone ?? client.workPhone,
    referrals: 0,
    revenue: balanceByClient.get(client.id) ?? 0,
    service: membershipByClient.get(client.id) ?? null,
    staff:
      client.clientInstructors
        .map((assignment) => assignment.instructor.name)
        .join(", ") || null,
    status: client.lifecycleStage ?? client.type,
    transactions: payments.filter((payment) => payment.clientId === client.id).length,
    updatedAt: formatDate(client.updatedAt),
    visits: client.attendanceCount,
  }));

  if (reportId === "big-spenders") {
    return rows.sort((first, second) => Number(second.revenue) - Number(first.revenue));
  }

  if (reportId === "account-balances" || reportId === "unpaid-visits") {
    return rows.filter((row) => Number(row.balance ?? 0) !== 0);
  }

  return rows;
}

async function getStaffRows(
  orgId: string,
  locationId: string,
  reportId: string,
): Promise<ReportDataRow[]> {
  if (
    [
      "appointment-metrics",
      "staff-clients-per-teacher",
      "staff-schedule",
      "staff-schedule-at-a-glance",
    ].includes(reportId)
  ) {
    return getClassRows(orgId, locationId);
  }

  const [instructors, classes, payouts, staffMembers] = await Promise.all([
    db.query.instructor.findMany({
      where: and(
        eq(instructor.organizationId, orgId),
        eq(instructor.locationId, locationId),
      ),
      orderBy: asc(instructor.name),
      limit: REPORT_ROW_LIMIT,
    }),
    db.query.studioClass.findMany({
      where: and(
        eq(studioClass.organizationId, orgId),
        eq(studioClass.locationId, locationId),
      ),
      columns: {
        bookedCount: true,
        endTime: true,
        instructorId: true,
        startTime: true,
        status: true,
        name: true,
      },
    }),
    db.query.instructorPayout.findMany({
      where: and(
        eq(instructorPayout.organizationId, orgId),
        eq(instructorPayout.locationId, locationId),
        isNull(instructorPayout.deletedAt),
      ),
      columns: { amount: true, instructorId: true },
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
  const classesByInstructor = new Map<string, typeof classes>();
  const payByInstructor = new Map<string, number>();

  for (const item of classes) {
    if (!item.instructorId) continue;
    classesByInstructor.set(item.instructorId, [
      ...(classesByInstructor.get(item.instructorId) ?? []),
      item,
    ]);
  }

  for (const payout of payouts) {
    payByInstructor.set(
      payout.instructorId,
      (payByInstructor.get(payout.instructorId) ?? 0) + Number(payout.amount),
    );
  }

  const instructorRows = instructors.map((item) => {
    const assignedClasses = classesByInstructor.get(item.id) ?? [];
    const worked = assignedClasses.reduce(
      (total, assignedClass) =>
        total +
        (assignedClass.endTime.getTime() - assignedClass.startTime.getTime()) /
          3_600_000,
      0,
    );

    return {
      clientCount: assignedClasses.reduce(
        (total, assignedClass) => total + assignedClass.bookedCount,
        0,
      ),
      date: assignedClasses[0] ? formatDate(assignedClasses[0].startTime) : formatDate(item.updatedAt),
      email: item.email,
      pay: payByInstructor.get(item.id) ?? numberValue(item.hourlyRate),
      role: item.role ?? "Instructor",
      scheduled: assignedClasses.length,
      service: assignedClasses[0]?.name ?? null,
      staff: item.name,
      status: item.isActive ? "ACTIVE" : "INACTIVE",
      updatedAt: formatDate(item.updatedAt),
      worked: Math.round(worked * 10) / 10,
    };
  });

  const staffRows = staffMembers
    .filter((item) => !instructors.some((teacher) => teacher.email === item.email))
    .map((item) => ({
      clientCount: null,
      date: formatDate(item.updatedAt),
      email: item.email,
      pay: numberValue(item.hourlyRate),
      phone: item.phone,
      role: item.role ?? item.staffType,
      scheduled: null,
      staff: item.name,
      status: item.isActive ? "ACTIVE" : "INACTIVE",
      updatedAt: formatDate(item.updatedAt),
      worked: null,
    }));

  return [...instructorRows, ...staffRows].slice(0, REPORT_ROW_LIMIT);
}

async function getInventoryRows(
  orgId: string,
  locationId: string,
  reportId: string,
): Promise<ReportDataRow[]> {
  const [products, lineItems] = await Promise.all([
    db.query.studioProduct.findMany({
      where: and(
        eq(studioProduct.organizationId, orgId),
        eq(studioProduct.locationId, locationId),
        isNull(studioProduct.deletedAt),
      ),
      orderBy: asc(studioProduct.name),
      limit: REPORT_ROW_LIMIT,
    }),
    db.query.studioPaymentLineItem.findMany({
      where: and(
        eq(studioPaymentLineItem.organizationId, orgId),
        eq(studioPaymentLineItem.locationId, locationId),
        isNull(studioPaymentLineItem.deletedAt),
      ),
      columns: { amount: true, productId: true, quantity: true, soldAt: true },
      with: {
        client: { columns: { name: true } },
      },
    }),
  ]);
  const revenueByProduct = new Map<string, number>();
  const quantityByProduct = new Map<string, number>();

  for (const lineItem of lineItems) {
    if (!lineItem.productId) continue;
    revenueByProduct.set(
      lineItem.productId,
      (revenueByProduct.get(lineItem.productId) ?? 0) + Number(lineItem.amount),
    );
    quantityByProduct.set(
      lineItem.productId,
      (quantityByProduct.get(lineItem.productId) ?? 0) + lineItem.quantity,
    );
  }

  const rows = products.map((product) => {
    const cost = numberValue(product.cost) ?? 0;
    const revenue = revenueByProduct.get(product.id) ?? 0;
    const quantity = product.stockQuantity ?? quantityByProduct.get(product.id) ?? 0;
    const profit = revenue - cost * quantity;

    return {
      amount: revenue,
      category: product.category ?? product.type,
      cost,
      date: formatDate(product.updatedAt),
      margin: revenue !== 0 ? Math.round((profit / revenue) * 1000) / 10 : null,
      orderStatus: product.isPublic ? "OPEN" : "CLOSED",
      product: product.name,
      profit,
      quantity,
      revenue,
      status: product.isActive ? "ACTIVE" : "INACTIVE",
      supplier: product.category ?? product.type,
      updatedAt: formatDate(product.updatedAt),
    };
  });

  if (reportId === "inventory-manage-online-orders") {
    return lineItems.map((lineItem) => ({
      amount: numberValue(lineItem.amount),
      client: lineItem.client?.name ?? null,
      date: formatDate(lineItem.soldAt),
      orderStatus: "OPEN",
      product: products.find((product) => product.id === lineItem.productId)?.name ?? "Product",
      quantity: lineItem.quantity,
      status: "OPEN",
    }));
  }

  if (reportId === "inventory-retail-sales-performance") {
    return lineItems.map((lineItem) => {
      const product = products.find((item) => item.id === lineItem.productId);
      const revenue = numberValue(lineItem.amount) ?? 0;
      const cost = (numberValue(product?.cost) ?? 0) * lineItem.quantity;
      const profit = revenue - cost;

      return {
        margin: revenue !== 0 ? Math.round((profit / revenue) * 1000) / 10 : null,
        product: product?.name ?? "Product",
        profit,
        quantity: lineItem.quantity,
        revenue,
        staff: null,
        status: "SUCCEEDED",
      };
    });
  }

  return rows;
}

async function getMembershipRows(
  orgId: string,
  locationId: string,
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

  return memberships.map((membership) => {
    const revenue =
      numberValue(membership.price) ??
      numberValue(membership.membershipPlan?.price) ??
      0;
    const totalClasses = membership.totalClasses ?? 0;
    const usedClasses = membership.usedClasses ?? 0;
    const remainingClasses = Math.max(totalClasses - usedClasses, 0);
    const deferredRevenue =
      totalClasses > 0 ? Math.round((revenue * remainingClasses * 100) / totalClasses) / 100 : null;

    return {
      amount: revenue,
      balance: deferredRevenue,
      client: membership.client.name,
      clientCount: 1,
      contract: membership.membershipPlan?.name ?? membership.name,
      deferredRevenue,
      email: membership.client.email,
      endDate: formatDate(membership.endDate ?? membership.cancelledAt),
      method: membership.paymentMethod ?? membership.paymentFrequency,
      nextBillingDate: formatDate(membership.renewalDate ?? membership.endDate),
      phone: membership.client.phone,
      quantity: totalClasses,
      renewalDate: formatDate(membership.renewalDate),
      revenue,
      startDate: formatDate(membership.startDate),
      status: membership.status,
      transactions: membership.totalPayments ?? 0,
      used: usedClasses,
    };
  });
}

async function getClassRows(
  orgId: string,
  locationId: string,
): Promise<ReportDataRow[]> {
  const classes = await db.query.studioClass.findMany({
    where: and(
      eq(studioClass.organizationId, orgId),
      eq(studioClass.locationId, locationId),
    ),
    with: {
      checkIns: { columns: { id: true } },
      classType: { columns: { name: true } },
      instructor: { columns: { name: true } },
    },
    orderBy: desc(studioClass.startTime),
    limit: REPORT_ROW_LIMIT,
  });

  return classes.map((item) => {
    const checkIns = item.checkIns.length;
    const revenue = 0;

    return {
      arrivalTime: formatDate(item.startTime),
      booked: item.bookedCount,
      category: item.classType?.name ?? item.location ?? null,
      checkIns,
      className: item.name,
      clientCount: item.bookedCount,
      date: formatDate(item.startTime),
      revenue,
      service: item.classType?.name ?? item.name,
      staff: item.instructor?.name ?? item.instructorName ?? null,
      status: item.status,
      visits: checkIns,
    };
  });
}

async function getGiftCardRows(
  orgId: string,
  locationId: string,
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
    const initialValue = numberValue(item.initialValue) ?? 0;
    const remainingBalance = numberValue(item.remainingBalance) ?? 0;

    return {
      amount: initialValue,
      balance: remainingBalance,
      client:
        item.client_redeemedByClientId?.name ??
        item.client_purchasedByClientId?.name ??
        null,
      date: formatDate(item.purchasedAt),
      endDate: formatDate(item.expiresAt),
      revenue: initialValue - remainingBalance,
      status: item.isActive ? "ACTIVE" : "INACTIVE",
      used: initialValue - remainingBalance,
    };
  });
}

function aggregateRows(
  rows: readonly ReportDataRow[],
  groupFields: readonly string[],
): ReportDataRow[] {
  const grouped = new Map<string, ReportDataRow & { clientNames?: Set<string> }>();

  for (const row of rows) {
    const key = groupFields.map((field) => String(row[field] ?? "Unassigned")).join("|");
    const existing = grouped.get(key);

    if (existing) {
      existing.transactions = Number(existing.transactions ?? 0) + 1;
      existing.quantity = Number(existing.quantity ?? 0) + Number(row.quantity ?? 0);
      existing.gross = Number(existing.gross ?? 0) + Number(row.gross ?? 0);
      existing.discount = Number(existing.discount ?? 0) + Number(row.discount ?? 0);
      existing.tax = Number(existing.tax ?? 0) + Number(row.tax ?? 0);
      existing.net = Number(existing.net ?? 0) + Number(row.net ?? 0);
      existing.revenue = Number(existing.revenue ?? 0) + Number(row.revenue ?? 0);
      existing.profit = Number(existing.profit ?? 0) + Number(row.profit ?? 0);
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
    const revenue = Number(row.revenue ?? row.net ?? 0);
    const profit = Number(row.profit ?? 0);

    return {
      ...row,
      averageRevenue:
        Number(row.transactions ?? 0) > 0
          ? Math.round((revenue / Number(row.transactions)) * 100) / 100
          : null,
      clientCount: clientNames?.size ?? null,
      margin: revenue !== 0 ? Math.round((profit / revenue) * 1000) / 10 : null,
    };
  });
}

function inferCardBrand(method: string | null): string | null {
  if (!method) return null;
  const normalized = method.toLowerCase();

  if (normalized.includes("visa")) return "Visa";
  if (normalized.includes("mastercard") || normalized.includes("master")) return "Mastercard";
  if (normalized.includes("amex") || normalized.includes("american")) return "American Express";
  if (normalized.includes("ach")) return "ACH";
  if (normalized.includes("card")) return "Card";

  return method;
}

function scopeClass(orgId: string, locationId: string | null, startDate?: Date, endDate?: Date) {
  return and(
    eq(studioClass.organizationId, orgId),
    locationId ? eq(studioClass.locationId, locationId) : undefined,
    startDate ? gte(studioClass.startTime, startDate) : undefined,
    endDate ? lte(studioClass.startTime, endDate) : undefined,
  );
}

async function reportClasses(orgId: string, locationId: string | null, startDate: Date, endDate: Date) {
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

export const reportsRouter = createTRPCRouter({
  rows: protectedProcedure
    .input(z.object({ groupId: ReportGroupIdSchema, reportId: z.string() }))
    .output(z.object({ rows: z.array(reportDataRowSchema) }))
    .query(async ({ ctx, input }) => {
      if (!getReportById(input.groupId, input.reportId)) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Report not found",
        });
      }

      const { locationId, orgId } = requireOrgAndLocation(ctx);

      if (input.groupId === "sales") {
        return { rows: await getSalesRows(orgId, locationId, input.reportId) };
      }
      if (input.groupId === "payment-processing") {
        return { rows: await getPaymentRows(orgId, locationId, input.reportId) };
      }
      if (input.groupId === "clients") {
        return { rows: await getClientRows(orgId, locationId, input.reportId) };
      }
      if (input.groupId === "staff") {
        return { rows: await getStaffRows(orgId, locationId, input.reportId) };
      }

      return { rows: await getInventoryRows(orgId, locationId, input.reportId) };
    }),

  revenue: protectedProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
        groupBy: z.enum(["day", "week", "month"]).default("day"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const orgId = requireOrg(ctx);
      const payments = await db.query.studioPayment.findMany({
        where: scopePayment(orgId, ctx.locationId, new Date(input.startDate), new Date(input.endDate)),
        columns: { amount: true, type: true, createdAt: true, currency: true },
        orderBy: asc(studioPayment.createdAt),
      });

      const totalRevenue = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
      const byType: Record<string, number> = {};
      for (const payment of payments) {
        byType[payment.type] = (byType[payment.type] ?? 0) + Number(payment.amount);
      }

      return {
        totalRevenue,
        byType,
        transactionCount: payments.length,
        averageTransaction: payments.length > 0 ? totalRevenue / payments.length : 0,
        currency: payments[0]?.currency ?? "GBP",
        payments,
      };
    }),

  attendance: protectedProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .query(async ({ ctx, input }) => {
      const orgId = requireOrg(ctx);
      const classes = await reportClasses(
        orgId,
        ctx.locationId,
        new Date(input.startDate),
        new Date(input.endDate),
      );

      const totalClasses = classes.length;
      const totalCapacity = classes.reduce((sum, item) => sum + (item.maxCapacity ?? 0), 0);
      const totalBooked = classes.reduce((sum, item) => sum + item.bookedCount, 0);
      const totalCheckedIn = classes.reduce((sum, item) => sum + item._count.checkIn, 0);
      const avgUtilization = totalCapacity > 0 ? (totalBooked / totalCapacity) * 100 : 0;
      const noShowRate = totalBooked > 0 ? ((totalBooked - totalCheckedIn) / totalBooked) * 100 : 0;

      const byClassType: Record<string, { classes: number; booked: number; capacity: number; checkedIn: number }> = {};
      for (const item of classes) {
        const typeName = item.classType?.name ?? "Uncategorized";
        byClassType[typeName] ??= { classes: 0, booked: 0, capacity: 0, checkedIn: 0 };
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

  membership: protectedProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .query(async ({ ctx, input }) => {
      const orgId = requireOrg(ctx);
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);
      const memberships = await db.query.studioMembership.findMany({
        where: and(
          eq(studioMembership.organizationId, orgId),
          ctx.locationId ? eq(studioMembership.locationId, ctx.locationId) : undefined,
        ),
        with: { membershipPlan: { columns: { name: true, price: true } } },
      });

      const active = memberships.filter((membership) => membership.status === "ACTIVE");
      const cancelled = memberships.filter(
        (membership) =>
          membership.status === "CANCELLED" &&
          membership.updatedAt >= startDate &&
          membership.updatedAt <= endDate,
      );
      const newMembers = memberships.filter(
        (membership) => membership.createdAt >= startDate && membership.createdAt <= endDate,
      );
      const mrr = active.reduce(
        (sum, membership) => sum + Number(membership.membershipPlan?.price ?? 0),
        0,
      );

      const byPlan: Record<string, number> = {};
      for (const membership of active) {
        const planName = membership.membershipPlan?.name ?? "Unknown";
        byPlan[planName] = (byPlan[planName] ?? 0) + 1;
      }

      const churnRate =
        active.length > 0 ? (cancelled.length / (active.length + cancelled.length)) * 100 : 0;

      return {
        totalActive: active.length,
        newInPeriod: newMembers.length,
        cancelledInPeriod: cancelled.length,
        churnRate: Math.round(churnRate * 10) / 10,
        mrr,
        byPlan,
      };
    }),

  instructorPerformance: protectedProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .query(async ({ ctx, input }) => {
      const orgId = requireOrg(ctx);
      const classes = await reportClasses(
        orgId,
        ctx.locationId,
        new Date(input.startDate),
        new Date(input.endDate),
      );
      const byInstructor: Record<string, { classesCount: number; totalBooked: number; totalCapacity: number; totalCheckedIn: number }> = {};

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
              ? Math.round((stats.totalBooked / stats.totalCapacity) * 1000) / 10
              : 0,
        }))
        .sort((a, b) => b.fillRate - a.fillRate);
    }),

  revenueTrend: protectedProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
        groupBy: z.enum(["day", "week", "month"]).default("day"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const orgId = requireOrg(ctx);
      const payments = await db.query.studioPayment.findMany({
        where: scopePayment(orgId, ctx.locationId, new Date(input.startDate), new Date(input.endDate)),
        columns: { amount: true, createdAt: true },
        orderBy: asc(studioPayment.createdAt),
      });

      const grouped: Record<string, number> = {};
      for (const payment of payments) {
        const date = payment.createdAt;
        const key =
          input.groupBy === "month"
            ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
            : input.groupBy === "week"
              ? new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay())
                  .toISOString()
                  .split("T")[0]
              : date.toISOString().split("T")[0];
        grouped[key] = (grouped[key] ?? 0) + Number(payment.amount);
      }

      return Object.entries(grouped).map(([date, amount]) => ({ date, amount }));
    }),

  revenueForecast: protectedProcedure
    .input(z.object({ months: z.number().min(1).max(12).default(3) }))
    .query(async ({ ctx, input }) => {
      const orgId = requireOrg(ctx);
      const activeMemberships = await db.query.studioMembership.findMany({
        where: and(
          eq(studioMembership.organizationId, orgId),
          ctx.locationId ? eq(studioMembership.locationId, ctx.locationId) : undefined,
          eq(studioMembership.status, "ACTIVE"),
        ),
        with: { membershipPlan: { columns: { price: true, billingInterval: true } } },
      });

      const monthlyRecurring = activeMemberships.reduce((sum, membership) => {
        const price = Number(membership.membershipPlan?.price ?? 0);
        const interval = membership.membershipPlan?.billingInterval ?? "MONTHLY";
        if (interval === "ANNUALLY") return sum + price / 12;
        if (interval === "WEEKLY") return sum + price * 4.33;
        return sum + price;
      }, 0);

      const expiringByMonth: Record<string, number> = {};
      for (const membership of activeMemberships) {
        if (membership.endDate) {
          const key = `${membership.endDate.getFullYear()}-${String(membership.endDate.getMonth() + 1).padStart(2, "0")}`;
          expiringByMonth[key] =
            (expiringByMonth[key] ?? 0) + Number(membership.membershipPlan?.price ?? 0);
        }
      }

      const forecast: { month: string; projected: number; atRisk: number }[] = [];
      const now = new Date();
      for (let index = 1; index <= input.months; index++) {
        const futureDate = new Date(now.getFullYear(), now.getMonth() + index, 1);
        const key = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, "0")}`;
        const atRisk = expiringByMonth[key] ?? 0;
        forecast.push({
          month: key,
          projected: Math.round((monthlyRecurring - atRisk) * 100) / 100,
          atRisk: Math.round(atRisk * 100) / 100,
        });
      }

      return { currentMrr: Math.round(monthlyRecurring * 100) / 100, forecast };
    }),

  attendanceTrend: protectedProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .query(async ({ ctx, input }) => {
      const orgId = requireOrg(ctx);
      const classes = await reportClasses(
        orgId,
        ctx.locationId,
        new Date(input.startDate),
        new Date(input.endDate),
      );

      const grouped: Record<string, { booked: number; checkedIn: number; capacity: number }> = {};
      for (const item of classes) {
        const key = item.startTime.toISOString().split("T")[0];
        grouped[key] ??= { booked: 0, checkedIn: 0, capacity: 0 };
        grouped[key].booked += item.bookedCount;
        grouped[key].checkedIn += item._count.checkIn;
        grouped[key].capacity += item.maxCapacity ?? 0;
      }

      return Object.entries(grouped).map(([date, stats]) => ({ date, ...stats }));
    }),

  exportCsv: protectedProcedure
    .input(
      z.object({
        reportType: z.enum(["revenue", "attendance", "membership", "instructor"]),
        startDate: z.string(),
        endDate: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrg(ctx);
      let rows: string[][] = [];
      let headers: string[] = [];

      if (input.reportType === "revenue") {
        headers = ["Date", "Type", "Amount", "Currency"];
        const payments = await db.query.studioPayment.findMany({
          where: scopePayment(orgId, ctx.locationId, new Date(input.startDate), new Date(input.endDate)),
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
          ctx.locationId,
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
        headers = ["Member", "Plan", "Status", "Started", "Credits Used", "Credits Total"];
        const memberships = await db.query.studioMembership.findMany({
          where: and(
            eq(studioMembership.organizationId, orgId),
            ctx.locationId ? eq(studioMembership.locationId, ctx.locationId) : undefined,
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

      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
        .join("\n");

      return {
        csv: csvContent,
        filename: `${input.reportType}-report-${input.startDate}-${input.endDate}.csv`,
      };
    }),
});
