import { z } from "zod";
import { and, eq, gte, inArray, lt, lte, sql } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { db } from "@/db";
import { invoice, invoicePayment } from "@/db/schema";
import { InvoiceStatus } from "@/db/enums";

/**
 * Invoice Analytics Router
 * Provides revenue metrics, aging reports, and invoice insights
 */
export const invoiceAnalyticsRouter = createTRPCRouter({
  /**
   * Get revenue overview metrics
   */
  getRevenueOverview: protectedProcedure
    .input(
      z
        .object({
          dateFrom: z.date().optional(),
          dateTo: z.date().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      const locationId = ctx.locationId;

      if (!orgId) {
        return {
          totalRevenue: 0,
          paidRevenue: 0,
          outstandingRevenue: 0,
          overdueRevenue: 0,
          draftRevenue: 0,
          totalInvoices: 0,
          paidInvoices: 0,
          overdueInvoices: 0,
          averageInvoiceValue: 0,
          averagePaymentTime: 0, // in days
        };
      }

      const dateFilter =
        input?.dateFrom || input?.dateTo
          ? [
              input?.dateFrom ? gte(invoice.issueDate, input.dateFrom) : undefined,
              input?.dateTo ? lte(invoice.issueDate, input.dateTo) : undefined,
            ]
          : [];

      const baseWhere = and(
        eq(invoice.organizationId, orgId),
        locationId ? eq(invoice.locationId, locationId) : undefined,
        ...dateFilter,
      );

      const now = new Date();

      const invoices = await db.query.invoice.findMany({
        where: baseWhere,
      });

      const totalInvoices = invoices.length;
      const paidInvoices = invoices.filter((item) => item.status === InvoiceStatus.PAID).length;
      const overdueStatuses: InvoiceStatus[] = [
        InvoiceStatus.SENT,
        InvoiceStatus.VIEWED,
        InvoiceStatus.PARTIALLY_PAID,
        InvoiceStatus.OVERDUE,
      ];
      const overdueInvoices = invoices.filter(
        (item) =>
          overdueStatuses.includes(item.status) &&
          item.dueDate !== null &&
          item.dueDate < now,
      ).length;
      const paidInvoicesWithDates = invoices
        .filter((item) => item.status === InvoiceStatus.PAID && item.paidAt !== null)
        .slice(0, 1000);

      const totalPaymentDays = paidInvoicesWithDates.reduce((sum, invoice) => {
        if (invoice.paidAt) {
          const days = Math.floor(
            (invoice.paidAt.getTime() - invoice.issueDate.getTime()) /
              (1000 * 60 * 60 * 24)
          );
          return sum + days;
        }
        return sum;
      }, 0);

      const avgPaymentTime =
        paidInvoicesWithDates.length > 0
          ? totalPaymentDays / paidInvoicesWithDates.length
          : 0;

      return {
        totalRevenue: invoices.reduce((sum, item) => sum + Number(item.total ?? 0), 0),
        paidRevenue: invoices
          .filter((item) => item.status === InvoiceStatus.PAID)
          .reduce((sum, item) => sum + Number(item.total ?? 0), 0),
        outstandingRevenue: invoices
          .filter(
            (item) =>
              ([InvoiceStatus.SENT, InvoiceStatus.VIEWED, InvoiceStatus.PARTIALLY_PAID] as InvoiceStatus[]).includes(item.status) &&
              item.dueDate !== null &&
              item.dueDate >= now,
          )
          .reduce((sum, item) => sum + Number(item.amountDue ?? 0), 0),
        overdueRevenue: invoices
          .filter(
            (item) =>
              overdueStatuses.includes(item.status) &&
              item.dueDate !== null &&
              item.dueDate < now,
          )
          .reduce((sum, item) => sum + Number(item.amountDue ?? 0), 0),
        draftRevenue: invoices
          .filter((item) => item.status === InvoiceStatus.DRAFT)
          .reduce((sum, item) => sum + Number(item.total ?? 0), 0),
        totalInvoices,
        paidInvoices,
        overdueInvoices,
        averageInvoiceValue:
          totalInvoices > 0
            ? invoices.reduce((sum, item) => sum + Number(item.total ?? 0), 0) /
              totalInvoices
            : 0,
        averagePaymentTime: Math.round(avgPaymentTime),
      };
    }),

  /**
   * Get invoice aging report (grouped by age buckets)
   */
  getAgingReport: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.orgId;
    const locationId = ctx.locationId;

    if (!orgId) {
      return {
        current: { count: 0, total: 0 }, // Not due yet
        days1to30: { count: 0, total: 0 }, // 1-30 days overdue
        days31to60: { count: 0, total: 0 }, // 31-60 days overdue
        days61to90: { count: 0, total: 0 }, // 61-90 days overdue
        days90plus: { count: 0, total: 0 }, // 90+ days overdue
      };
    }

    const now = new Date();
    const baseWhere = and(
      eq(invoice.organizationId, orgId),
      locationId ? eq(invoice.locationId, locationId) : undefined,
      inArray(invoice.status, [
        InvoiceStatus.SENT,
        InvoiceStatus.VIEWED,
        InvoiceStatus.PARTIALLY_PAID,
        InvoiceStatus.OVERDUE,
      ]),
    );

    // Current (not overdue)
    const current = await aggregateAgingBucket(and(baseWhere, gte(invoice.dueDate, now)));

    // Helper to calculate date N days ago
    const daysAgo = (days: number) => {
      const date = new Date(now);
      date.setDate(date.getDate() - days);
      return date;
    };

    // 1-30 days overdue
    const days1to30 = await aggregateAgingBucket(
      and(baseWhere, gte(invoice.dueDate, daysAgo(30)), lt(invoice.dueDate, now)),
    );

    // 31-60 days overdue
    const days31to60 = await aggregateAgingBucket(
      and(baseWhere, gte(invoice.dueDate, daysAgo(60)), lt(invoice.dueDate, daysAgo(30))),
    );

    // 61-90 days overdue
    const days61to90 = await aggregateAgingBucket(
      and(baseWhere, gte(invoice.dueDate, daysAgo(90)), lt(invoice.dueDate, daysAgo(60))),
    );

    // 90+ days overdue
    const days90plus = await aggregateAgingBucket(
      and(baseWhere, lt(invoice.dueDate, daysAgo(90))),
    );

    return {
      current: {
        count: current.count,
        total: current.total,
      },
      days1to30: {
        count: days1to30.count,
        total: days1to30.total,
      },
      days31to60: {
        count: days31to60.count,
        total: days31to60.total,
      },
      days61to90: {
        count: days61to90.count,
        total: days61to90.total,
      },
      days90plus: {
        count: days90plus.count,
        total: days90plus.total,
      },
    };
  }),

  /**
   * Get revenue trends over time (monthly breakdown)
   */
  getRevenueTrends: protectedProcedure
    .input(
      z.object({
        months: z.number().min(1).max(24).default(6), // Last N months
      })
    )
    .query(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      const locationId = ctx.locationId;

      if (!orgId) {
        return [];
      }

      const now = new Date();
      const startDate = new Date(
        now.getFullYear(),
        now.getMonth() - input.months,
        1
      );

      const invoices = await db.query.invoice.findMany({
        where: and(
          eq(invoice.organizationId, orgId),
          locationId ? eq(invoice.locationId, locationId) : undefined,
          gte(invoice.issueDate, startDate),
        ),
        columns: {
          issueDate: true,
          total: true,
          amountPaid: true,
          status: true,
        },
      });

      // Group by month
      const monthlyData: Record<
        string,
        { month: string; total: number; paid: number; count: number }
      > = {};

      for (let i = 0; i < input.months; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;
        monthlyData[monthKey] = {
          month: date.toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          }),
          total: 0,
          paid: 0,
          count: 0,
        };
      }

      // Aggregate invoices by month
      invoices.forEach((invoice) => {
        const monthKey = `${invoice.issueDate.getFullYear()}-${String(
          invoice.issueDate.getMonth() + 1
        ).padStart(2, "0")}`;
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].total += Number(invoice.total);
          monthlyData[monthKey].paid += Number(invoice.amountPaid);
          monthlyData[monthKey].count += 1;
        }
      });

      return Object.values(monthlyData).reverse(); // Oldest to newest
    }),

  /**
   * Get top clients by revenue
   */
  getTopClients: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      const locationId = ctx.locationId;

      if (!orgId) {
        return [];
      }

      const dateFilter =
        input.dateFrom || input.dateTo
          ? [
              input.dateFrom ? gte(invoice.issueDate, input.dateFrom) : undefined,
              input.dateTo ? lte(invoice.issueDate, input.dateTo) : undefined,
            ]
          : [];

      const invoices = await db.query.invoice.findMany({
        where: and(
          eq(invoice.organizationId, orgId),
          locationId ? eq(invoice.locationId, locationId) : undefined,
          ...dateFilter,
        ),
        columns: {
          clientName: true,
          clientEmail: true,
          total: true,
          amountPaid: true,
        },
      });

      const clientRevenue = new Map<
        string,
        { name: string | null; email: string | null; totalRevenue: number; paidRevenue: number; invoiceCount: number }
      >();
      for (const item of invoices) {
        const key = `${item.clientName ?? ""}\t${item.clientEmail ?? ""}`;
        const current = clientRevenue.get(key) ?? {
          name: item.clientName,
          email: item.clientEmail,
          totalRevenue: 0,
          paidRevenue: 0,
          invoiceCount: 0,
        };
        current.totalRevenue += Number(item.total ?? 0);
        current.paidRevenue += Number(item.amountPaid ?? 0);
        current.invoiceCount += 1;
        clientRevenue.set(key, current);
      }

      return Array.from(clientRevenue.values())
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, input.limit);
    }),

  /**
   * Get payment method breakdown
   */
  getPaymentMethodBreakdown: protectedProcedure
    .input(
      z
        .object({
          dateFrom: z.date().optional(),
          dateTo: z.date().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      const locationId = ctx.locationId;

      if (!orgId) {
        return [];
      }

      const dateFilter =
        input?.dateFrom || input?.dateTo
          ? [
              input?.dateFrom ? gte(invoicePayment.paidAt, input.dateFrom) : undefined,
              input?.dateTo ? lte(invoicePayment.paidAt, input.dateTo) : undefined,
            ]
          : [];

      const payments = await db
        .select({
          method: invoicePayment.method,
          amount: invoicePayment.amount,
        })
        .from(invoicePayment)
        .innerJoin(invoice, eq(invoicePayment.invoiceId, invoice.id))
        .where(
          and(
            eq(invoice.organizationId, orgId),
            locationId ? eq(invoice.locationId, locationId) : undefined,
            ...dateFilter,
          ),
        );

      const byMethod = new Map<string, { method: string; total: number; count: number }>();
      for (const payment of payments) {
        const current = byMethod.get(payment.method) ?? {
          method: payment.method,
          total: 0,
          count: 0,
        };
        current.total += Number(payment.amount ?? 0);
        current.count += 1;
        byMethod.set(payment.method, current);
      }

      return Array.from(byMethod.values());
    }),

  /**
   * Get invoice status breakdown
   */
  getStatusBreakdown: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.orgId;
    const locationId = ctx.locationId;

    if (!orgId) {
      return [];
    }

    const invoices = await db.query.invoice.findMany({
      where: and(
        eq(invoice.organizationId, orgId),
        locationId ? eq(invoice.locationId, locationId) : undefined,
      ),
      columns: {
        status: true,
        total: true,
        amountDue: true,
      },
    });

    const byStatus = new Map<
      InvoiceStatus,
      { status: InvoiceStatus; count: number; totalValue: number; amountDue: number }
    >();
    for (const item of invoices) {
      const current = byStatus.get(item.status) ?? {
        status: item.status,
        count: 0,
        totalValue: 0,
        amountDue: 0,
      };
      current.count += 1;
      current.totalValue += Number(item.total ?? 0);
      current.amountDue += Number(item.amountDue ?? 0);
      byStatus.set(item.status, current);
    }

    return Array.from(byStatus.values());
  }),
});

async function aggregateAgingBucket(where: ReturnType<typeof and>): Promise<{
  count: number;
  total: number;
}> {
  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`,
      total: sql<string | null>`sum(${invoice.amountDue})`,
    })
    .from(invoice)
    .where(where);

  return {
    count: row?.count ?? 0,
    total: Number(row?.total ?? 0),
  };
}
