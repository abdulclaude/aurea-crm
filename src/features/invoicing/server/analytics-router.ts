import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import prisma from "@/lib/db";

import { Prisma, InvoiceStatus } from "@prisma/client";
const Decimal = Prisma.Decimal;

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
      const subaccountId = ctx.subaccountId;

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
          ? {
              issueDate: {
                ...(input?.dateFrom && { gte: input.dateFrom }),
                ...(input?.dateTo && { lte: input.dateTo }),
              },
            }
          : {};

      const baseWhere = {
        organizationId: orgId,
        ...(subaccountId && { subaccountId }),
        ...dateFilter,
      };

      const now = new Date();

      // Total invoices
      const totalInvoices = await prisma.invoice.count({
        where: baseWhere,
      });

      // Aggregate revenue by status
      const totalAggregates = await prisma.invoice.aggregate({
        where: baseWhere,
        _sum: {
          total: true,
          amountPaid: true,
          amountDue: true,
        },
        _avg: {
          total: true,
        },
      });

      // Paid invoices
      const paidInvoices = await prisma.invoice.count({
        where: {
          ...baseWhere,
          status: InvoiceStatus.PAID,
        },
      });

      const paidAggregates = await prisma.invoice.aggregate({
        where: {
          ...baseWhere,
          status: InvoiceStatus.PAID,
        },
        _sum: {
          total: true,
        },
      });

      // Overdue invoices (unpaid past due date)
      const overdueInvoices = await prisma.invoice.count({
        where: {
          ...baseWhere,
          status: {
            in: [
              InvoiceStatus.SENT,
              InvoiceStatus.VIEWED,
              InvoiceStatus.PARTIALLY_PAID,
              InvoiceStatus.OVERDUE,
            ],
          },
          dueDate: { lt: now },
        },
      });

      const overdueAggregates = await prisma.invoice.aggregate({
        where: {
          ...baseWhere,
          status: {
            in: [
              InvoiceStatus.SENT,
              InvoiceStatus.VIEWED,
              InvoiceStatus.PARTIALLY_PAID,
              InvoiceStatus.OVERDUE,
            ],
          },
          dueDate: { lt: now },
        },
        _sum: {
          amountDue: true,
        },
      });

      // Outstanding (sent but not overdue yet)
      const outstandingAggregates = await prisma.invoice.aggregate({
        where: {
          ...baseWhere,
          status: {
            in: [
              InvoiceStatus.SENT,
              InvoiceStatus.VIEWED,
              InvoiceStatus.PARTIALLY_PAID,
            ],
          },
          dueDate: { gte: now },
        },
        _sum: {
          amountDue: true,
        },
      });

      // Draft invoices
      const draftAggregates = await prisma.invoice.aggregate({
        where: {
          ...baseWhere,
          status: InvoiceStatus.DRAFT,
        },
        _sum: {
          total: true,
        },
      });

      // Calculate average payment time
      const paidInvoicesWithDates = await prisma.invoice.findMany({
        where: {
          ...baseWhere,
          status: InvoiceStatus.PAID,
          paidAt: { not: null },
        },
        select: {
          issueDate: true,
          paidAt: true,
        },
        take: 1000, // Limit for performance
      });

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
        totalRevenue: Number(totalAggregates._sum.total || 0),
        paidRevenue: Number(paidAggregates._sum.total || 0),
        outstandingRevenue: Number(outstandingAggregates._sum.amountDue || 0),
        overdueRevenue: Number(overdueAggregates._sum.amountDue || 0),
        draftRevenue: Number(draftAggregates._sum.total || 0),
        totalInvoices,
        paidInvoices,
        overdueInvoices,
        averageInvoiceValue: Number(totalAggregates._avg.total || 0),
        averagePaymentTime: Math.round(avgPaymentTime),
      };
    }),

  /**
   * Get invoice aging report (grouped by age buckets)
   */
  getAgingReport: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.orgId;
    const subaccountId = ctx.subaccountId;

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
    const baseWhere = {
      organizationId: orgId,
      ...(subaccountId && { subaccountId }),
      status: {
        in: [
          InvoiceStatus.SENT,
          InvoiceStatus.VIEWED,
          InvoiceStatus.PARTIALLY_PAID,
          InvoiceStatus.OVERDUE,
        ],
      },
    };

    // Current (not overdue)
    const current = await prisma.invoice.aggregate({
      where: {
        ...baseWhere,
        dueDate: { gte: now },
      },
      _sum: { amountDue: true },
      _count: true,
    });

    // Helper to calculate date N days ago
    const daysAgo = (days: number) => {
      const date = new Date(now);
      date.setDate(date.getDate() - days);
      return date;
    };

    // 1-30 days overdue
    const days1to30 = await prisma.invoice.aggregate({
      where: {
        ...baseWhere,
        dueDate: {
          gte: daysAgo(30),
          lt: now,
        },
      },
      _sum: { amountDue: true },
      _count: true,
    });

    // 31-60 days overdue
    const days31to60 = await prisma.invoice.aggregate({
      where: {
        ...baseWhere,
        dueDate: {
          gte: daysAgo(60),
          lt: daysAgo(30),
        },
      },
      _sum: { amountDue: true },
      _count: true,
    });

    // 61-90 days overdue
    const days61to90 = await prisma.invoice.aggregate({
      where: {
        ...baseWhere,
        dueDate: {
          gte: daysAgo(90),
          lt: daysAgo(60),
        },
      },
      _sum: { amountDue: true },
      _count: true,
    });

    // 90+ days overdue
    const days90plus = await prisma.invoice.aggregate({
      where: {
        ...baseWhere,
        dueDate: {
          lt: daysAgo(90),
        },
      },
      _sum: { amountDue: true },
      _count: true,
    });

    return {
      current: {
        count: current._count,
        total: Number(current._sum.amountDue || 0),
      },
      days1to30: {
        count: days1to30._count,
        total: Number(days1to30._sum.amountDue || 0),
      },
      days31to60: {
        count: days31to60._count,
        total: Number(days31to60._sum.amountDue || 0),
      },
      days61to90: {
        count: days61to90._count,
        total: Number(days61to90._sum.amountDue || 0),
      },
      days90plus: {
        count: days90plus._count,
        total: Number(days90plus._sum.amountDue || 0),
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
      const subaccountId = ctx.subaccountId;

      if (!orgId) {
        return [];
      }

      const now = new Date();
      const startDate = new Date(
        now.getFullYear(),
        now.getMonth() - input.months,
        1
      );

      const invoices = await prisma.invoice.findMany({
        where: {
          organizationId: orgId,
          ...(subaccountId && { subaccountId }),
          issueDate: { gte: startDate },
        },
        select: {
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
      const subaccountId = ctx.subaccountId;

      if (!orgId) {
        return [];
      }

      const dateFilter =
        input.dateFrom || input.dateTo
          ? {
              issueDate: {
                ...(input.dateFrom && { gte: input.dateFrom }),
                ...(input.dateTo && { lte: input.dateTo }),
              },
            }
          : {};

      const clientRevenue = await prisma.invoice.groupBy({
        by: ["contactName", "contactEmail"],
        where: {
          organizationId: orgId,
          ...(subaccountId && { subaccountId }),
          ...dateFilter,
        },
        _sum: {
          total: true,
          amountPaid: true,
        },
        _count: true,
        orderBy: {
          _sum: {
            total: "desc",
          },
        },
        take: input.limit,
      });

      return clientRevenue.map((client) => ({
        name: client.contactName,
        email: client.contactEmail,
        totalRevenue: Number(client._sum.total || 0),
        paidRevenue: Number(client._sum.amountPaid || 0),
        invoiceCount: client._count,
      }));
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
      const subaccountId = ctx.subaccountId;

      if (!orgId) {
        return [];
      }

      const dateFilter =
        input?.dateFrom || input?.dateTo
          ? {
              paidAt: {
                ...(input?.dateFrom && { gte: input.dateFrom }),
                ...(input?.dateTo && { lte: input.dateTo }),
              },
            }
          : {};

      const paymentsByMethod = await prisma.invoicePayment.groupBy({
        by: ["method"],
        where: {
          invoice: {
            organizationId: orgId,
            ...(subaccountId && { subaccountId }),
          },
          ...dateFilter,
        },
        _sum: {
          amount: true,
        },
        _count: true,
      });

      return paymentsByMethod.map((pm) => ({
        method: pm.method,
        total: Number(pm._sum.amount || 0),
        count: pm._count,
      }));
    }),

  /**
   * Get invoice status breakdown
   */
  getStatusBreakdown: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.orgId;
    const subaccountId = ctx.subaccountId;

    if (!orgId) {
      return [];
    }

    const statusBreakdown = await prisma.invoice.groupBy({
      by: ["status"],
      where: {
        organizationId: orgId,
        ...(subaccountId && { subaccountId }),
      },
      _sum: {
        total: true,
        amountDue: true,
      },
      _count: true,
    });

    return statusBreakdown.map((status) => ({
      status: status.status,
      count: status._count,
      totalValue: Number(status._sum.total || 0),
      amountDue: Number(status._sum.amountDue || 0),
    }));
  }),
});
