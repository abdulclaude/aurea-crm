import "server-only";

import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/db";
import {
  invoice,
  instructor,
  payrollRun,
  payrollRunInstructor,
  rota,
  studioBooking,
  studioBookingPayment,
  studioClass,
  studioPayment,
  studioPaymentLineItem,
  task,
  timeLog,
  user,
  client,
} from "@/db/schema";
import { addReportMoney, normalizeReportMoney, prorateReportMoney, reportMoneyToMinor, signedReportMoney } from "@/features/reports/lib/report-money";
import { formatReportDateInTimezone } from "@/features/reports/lib/report-time";
import type { ReportDataRow } from "@/features/reports/types";

const ROW_LIMIT = 500;

export async function getInvoiceReportRows(
  organizationId: string,
  locationId: string,
  timezone: string,
): Promise<ReportDataRow[]> {
  const rows = await db.query.invoice.findMany({
    where: and(eq(invoice.organizationId, organizationId), eq(invoice.locationId, locationId)),
    with: { invoiceLineItems: true },
    orderBy: desc(invoice.issueDate),
    limit: ROW_LIMIT,
  });

  return rows.flatMap((selectedInvoice) =>
    selectedInvoice.invoiceLineItems.map((lineItem) => {
      const amount = normalizeReportMoney(lineItem.amount, selectedInvoice.currency);
      const subtotalMinor = Math.abs(reportMoneyToMinor(selectedInvoice.subtotal, selectedInvoice.currency));
      const lineMinor = Math.abs(reportMoneyToMinor(lineItem.amount, selectedInvoice.currency));
      const tax = subtotalMinor > 0
        ? prorateReportMoney({
            total: selectedInvoice.taxAmount,
            numerator: lineMinor,
            denominator: subtotalMinor,
            currency: selectedInvoice.currency,
          })
        : normalizeReportMoney("0", selectedInvoice.currency);
      return {
        amount,
        client: selectedInvoice.clientName,
        currency: selectedInvoice.currency,
        date: formatReportDateInTimezone(selectedInvoice.issueDate, timezone),
        item: lineItem.description,
        status: selectedInvoice.status,
        tax,
      };
    }),
  ).slice(0, ROW_LIMIT);
}

type ClassRevenue = { currency: string; revenue: string };

export async function getClassReportRows(
  organizationId: string,
  locationId: string,
  timezone: string,
  fallbackCurrency: string,
): Promise<ReportDataRow[]> {
  const [classes, paymentRows] = await Promise.all([
    db.query.studioClass.findMany({
      where: and(eq(studioClass.organizationId, organizationId), eq(studioClass.locationId, locationId)),
      with: {
        checkIns: { columns: { id: true } },
        classType: { columns: { name: true } },
        instructor: { columns: { name: true } },
      },
      orderBy: desc(studioClass.startTime),
      limit: ROW_LIMIT,
    }),
    db.select({
      amount: studioPaymentLineItem.amount,
      classId: studioBooking.classId,
      currency: studioPaymentLineItem.currency,
      returned: studioPaymentLineItem.returned,
    })
      .from(studioBookingPayment)
      .innerJoin(studioBooking, eq(studioBooking.id, studioBookingPayment.bookingId))
      .innerJoin(studioPaymentLineItem, eq(studioPaymentLineItem.id, studioBookingPayment.lineItemId))
      .innerJoin(studioPayment, eq(studioPayment.id, studioBookingPayment.paymentId))
      .where(and(
        eq(studioBookingPayment.organizationId, organizationId),
        eq(studioBookingPayment.locationId, locationId),
        isNull(studioPaymentLineItem.deletedAt),
        eq(studioPayment.status, "SUCCEEDED"),
      )),
  ]);

  const revenueByClass = new Map<string, ClassRevenue[]>();
  for (const row of paymentRows) {
    const signedAmount = signedReportMoney(row.amount, row.returned, row.currency);
    const existing = revenueByClass.get(row.classId) ?? [];
    const currencyTotal = existing.find((item) => item.currency === row.currency);
    if (currencyTotal) currencyTotal.revenue = addReportMoney(currencyTotal.revenue, signedAmount, row.currency);
    else existing.push({ currency: row.currency, revenue: signedAmount });
    revenueByClass.set(row.classId, existing);
  }

  return classes.flatMap((item) => {
    const totals = revenueByClass.get(item.id) ?? [{
      currency: fallbackCurrency,
      revenue: normalizeReportMoney("0", fallbackCurrency),
    }];
    return totals.map(({ currency, revenue }) => ({
      arrivalTime: formatReportDateInTimezone(item.startTime, timezone),
      averageRevenue: item.bookedCount > 0
        ? prorateReportMoney({ total: revenue, numerator: 1, denominator: item.bookedCount, currency })
        : normalizeReportMoney("0", currency),
      booked: item.bookedCount,
      category: item.classType?.name ?? item.location ?? null,
      checkIns: item.checkIns.length,
      className: item.name,
      clientCount: item.bookedCount,
      currency,
      date: formatReportDateInTimezone(item.startTime, timezone),
      revenue,
      service: item.classType?.name ?? item.name,
      staff: item.instructor?.name ?? item.instructorName ?? null,
      status: item.status,
      visits: item.checkIns.length,
    }));
  });
}

function hoursBetween(start: Date, end: Date | null): number | null {
  if (!end) return null;
  return Math.round(((end.getTime() - start.getTime()) / 3_600_000) * 100) / 100;
}

export async function getOperationalStaffReportRows(
  organizationId: string,
  locationId: string,
  reportId: string,
  timezone: string,
): Promise<ReportDataRow[] | null> {
  if (reportId === "payroll") {
    const rows = await db.select({
      currency: payrollRun.currency,
      instructorName: instructor.name,
      netPay: payrollRunInstructor.netPay,
      overtimeHours: payrollRunInstructor.overtimeHours,
      regularHours: payrollRunInstructor.regularHours,
      role: instructor.role,
      status: payrollRun.status,
    }).from(payrollRunInstructor)
      .innerJoin(payrollRun, eq(payrollRun.id, payrollRunInstructor.payrollRunId))
      .innerJoin(instructor, eq(instructor.id, payrollRunInstructor.instructorId))
      .where(and(eq(payrollRun.organizationId, organizationId), eq(payrollRun.locationId, locationId)))
      .orderBy(desc(payrollRun.periodEnd))
      .limit(ROW_LIMIT);
    return rows.map((row) => ({
      currency: row.currency,
      pay: normalizeReportMoney(row.netPay, row.currency),
      role: row.role ?? "Instructor",
      staff: row.instructorName,
      status: row.status,
      worked: Math.round((Number(row.regularHours) + Number(row.overtimeHours)) * 100) / 100,
    }));
  }

  if (reportId === "time-clock") {
    const rows = await db.select({
      currency: timeLog.currency,
      endTime: timeLog.endTime,
      instructorName: instructor.name,
      startTime: timeLog.startTime,
      status: timeLog.status,
      totalAmount: timeLog.totalAmount,
    }).from(timeLog)
      .leftJoin(instructor, eq(instructor.id, timeLog.instructorId))
      .where(and(eq(timeLog.organizationId, organizationId), eq(timeLog.locationId, locationId)))
      .orderBy(desc(timeLog.startTime))
      .limit(ROW_LIMIT);
    return rows.map((row) => ({
      currency: row.currency,
      date: formatReportDateInTimezone(row.startTime, timezone),
      pay: row.totalAmount && row.currency ? normalizeReportMoney(row.totalAmount, row.currency) : null,
      scheduled: hoursBetween(row.startTime, row.endTime),
      staff: row.instructorName ?? "Unassigned",
      status: row.status,
      worked: hoursBetween(row.startTime, row.endTime),
    }));
  }

  if (["staff-schedule", "staff-schedule-at-a-glance"].includes(reportId)) {
    const rows = await db.select({
      endTime: rota.endTime,
      instructorName: instructor.name,
      service: rota.title,
      startTime: rota.startTime,
      status: rota.status,
    }).from(rota)
      .innerJoin(instructor, eq(instructor.id, rota.instructorId))
      .where(and(eq(rota.organizationId, organizationId), eq(rota.locationId, locationId)))
      .orderBy(desc(rota.startTime))
      .limit(ROW_LIMIT);
    return rows.map((row) => ({
      date: formatReportDateInTimezone(row.startTime, timezone),
      scheduled: hoursBetween(row.startTime, row.endTime),
      service: row.service ?? "Scheduled shift",
      staff: row.instructorName,
      status: row.status,
    }));
  }

  if (reportId === "tasks") {
    const rows = await db.select({
      assigneeName: user.name,
      clientName: client.name,
      description: task.description,
      dueDate: task.dueDate,
      status: task.status,
      title: task.title,
    }).from(task)
      .leftJoin(user, eq(user.id, task.assigneeId))
      .leftJoin(client, eq(client.id, task.clientId))
      .where(and(eq(task.organizationId, organizationId), eq(task.locationId, locationId)))
      .orderBy(desc(task.createdAt))
      .limit(ROW_LIMIT);
    return rows.map((row) => ({
      client: row.clientName,
      date: formatReportDateInTimezone(row.dueDate, timezone),
      reason: row.description ?? row.title,
      staff: row.assigneeName ?? "Unassigned",
      status: row.status,
    }));
  }

  return null;
}
