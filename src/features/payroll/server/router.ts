import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { prisma } from "@/lib/db";
import { TRPCError } from "@trpc/server";
import { generatePayslipHTML, getPayslipData } from "../lib/payslip-generator";
import { calculateUKTax } from "../lib/uk-tax-calculator";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear } from "date-fns";

export const payrollRouter = createTRPCRouter({
  // List payroll runs
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["DRAFT", "PENDING_APPROVAL", "APPROVED", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"]).optional(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      const { status, limit, cursor } = input;

      const payrollRuns = await prisma.payrollRun.findMany({
        where: {
          organizationId: ctx.orgId,
          subaccountId: ctx.subaccountId ?? null,
          ...(status && { status }),
        },
        include: {
          payrollRunWorkers: {
            include: {
              worker: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          workerPayments: {
            select: {
              id: true,
              paymentStatus: true,
              netAmount: true,
            },
          },
          _count: {
            select: {
              payrollRunWorkers: true,
              workerPayments: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit + 1,
        ...(cursor && {
          cursor: {
            id: cursor,
          },
          skip: 1,
        }),
      });

      let nextCursor: string | undefined = undefined;
      if (payrollRuns.length > limit) {
        const nextItem = payrollRuns.pop();
        nextCursor = nextItem!.id;
      }

      return {
        payrollRuns,
        nextCursor,
      };
    }),

  // Get single payroll run with full details
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      const payrollRun = await prisma.payrollRun.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
        },
        include: {
          payrollRunWorkers: {
            include: {
              worker: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  bankAccountName: true,
                  bankAccountNumber: true,
                  bankSortCode: true,
                },
              },
            },
          },
          workerPayments: {
            include: {
              worker: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!payrollRun) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payroll run not found",
        });
      }

      return payrollRun;
    }),

  // Calculate payroll for a period (preview before creating)
  calculatePayroll: protectedProcedure
    .input(
      z.object({
        periodStart: z.date(),
        periodEnd: z.date(),
        workerIds: z.array(z.string()).optional(), // If not provided, calculate for all workers
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      const { periodStart, periodEnd, workerIds } = input;

      // Fetch approved time logs for the period
      const timeLogs = await prisma.timeLog.findMany({
        where: {
          organizationId: ctx.orgId,
          subaccountId: ctx.subaccountId ?? null,
          startTime: {
            gte: periodStart,
            lte: periodEnd,
          },
          status: "APPROVED",
          ...(workerIds && {
            workerId: {
              in: workerIds,
            },
          }),
        },
        include: {
          worker: {
            select: {
              id: true,
              name: true,
              email: true,
              hourlyRate: true,
              currency: true,
              bankAccountName: true,
              bankAccountNumber: true,
              bankSortCode: true,
            },
          },
        },
      });

      // Group by worker and calculate totals
      const workerCalculations = new Map<
        string,
        {
          workerId: string;
          workerName: string;
          workerEmail: string | null;
          regularHours: number;
          overtimeHours: number;
          regularPay: number;
          overtimePay: number;
          grossPay: number;
          netPay: number;
          bankAccountName: string | null;
          bankAccountNumber: string | null;
          bankSortCode: string | null;
          timeLogCount: number;
        }
      >();

      for (const log of timeLogs) {
        if (!log.workerId) continue;

        const workerId = log.workerId;
        const existing = workerCalculations.get(workerId) || {
          workerId,
          workerName: log.worker?.name || "Unknown",
          workerEmail: log.worker?.email || null,
          regularHours: 0,
          overtimeHours: 0,
          regularPay: 0,
          overtimePay: 0,
          grossPay: 0,
          netPay: 0,
          bankAccountName: log.worker?.bankAccountName || null,
          bankAccountNumber: log.worker?.bankAccountNumber || null,
          bankSortCode: log.worker?.bankSortCode || null,
          timeLogCount: 0,
        };

        const hours = (log.duration || 0) / 60; // Convert minutes to hours
        const amount = Number(log.totalAmount || 0);

        if (log.isOvertime) {
          existing.overtimeHours += hours;
          existing.overtimePay += amount;
        } else {
          existing.regularHours += hours;
          existing.regularPay += amount;
        }

        existing.grossPay += amount;
        existing.netPay += amount; // No deductions for now
        existing.timeLogCount += 1;

        workerCalculations.set(workerId, existing);
      }

      const calculations = Array.from(workerCalculations.values());

      const summary = {
        totalWorkers: calculations.length,
        totalRegularHours: calculations.reduce((sum, w) => sum + w.regularHours, 0),
        totalOvertimeHours: calculations.reduce((sum, w) => sum + w.overtimeHours, 0),
        totalGrossPay: calculations.reduce((sum, w) => sum + w.grossPay, 0),
        totalNetPay: calculations.reduce((sum, w) => sum + w.netPay, 0),
      };

      return {
        periodStart,
        periodEnd,
        workers: calculations,
        summary,
      };
    }),

  // Create payroll run
  create: protectedProcedure
    .input(
      z.object({
        periodStart: z.date(),
        periodEnd: z.date(),
        paymentDate: z.date(),
        notes: z.string().optional(),
        workerIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      if (!ctx.auth.user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const { periodStart, periodEnd, paymentDate, notes, workerIds } = input;

      // Calculate payroll first
      const timeLogs = await prisma.timeLog.findMany({
        where: {
          organizationId: ctx.orgId,
          subaccountId: ctx.subaccountId ?? null,
          startTime: {
            gte: periodStart,
            lte: periodEnd,
          },
          status: "APPROVED",
          ...(workerIds && {
            workerId: {
              in: workerIds,
            },
          }),
        },
        include: {
          worker: true,
        },
      });

      // Group by worker and calculate gross pay
      const workerCalculations = new Map<string, any>();
      for (const log of timeLogs) {
        if (!log.workerId) continue;

        const workerId = log.workerId;
        const existing = workerCalculations.get(workerId) || {
          workerId,
          worker: log.worker,
          regularHours: 0,
          overtimeHours: 0,
          regularPay: 0,
          overtimePay: 0,
          bonuses: 0,
          grossPay: 0,
        };

        const hours = (log.duration || 0) / 60;
        const amount = Number(log.totalAmount || 0);

        if (log.isOvertime) {
          existing.overtimeHours += hours;
          existing.overtimePay += amount;
        } else {
          existing.regularHours += hours;
          existing.regularPay += amount;
        }

        existing.grossPay += amount;

        workerCalculations.set(workerId, existing);
      }

      // Calculate tax, NI, and deductions for each worker
      const yearStart = startOfYear(periodStart);

      const calculations = await Promise.all(
        Array.from(workerCalculations.values()).map(async (calc) => {
          // Get YTD totals from previous payroll runs this year
          const ytdData = await prisma.payrollRunWorker.aggregate({
            where: {
              workerId: calc.workerId,
              payrollRun: {
                periodStart: { gte: yearStart },
                periodEnd: { lt: periodStart },
                status: { in: ["COMPLETED", "PROCESSING", "APPROVED"] },
              },
            },
            _sum: {
              grossPay: true,
              incomeTax: true,
              nationalInsurance: true,
            },
          });

          const ytdGrossPay = Number(ytdData._sum.grossPay || 0);
          const ytdTax = Number(ytdData._sum.incomeTax || 0);
          const ytdNI = Number(ytdData._sum.nationalInsurance || 0);

          // Add worker's allowances to gross pay
          const workerAllowances =
            Number(calc.worker.housingAllowance || 0) +
            Number(calc.worker.transportAllowance || 0) +
            Number(calc.worker.mealAllowance || 0) +
            Number(calc.worker.otherAllowances || 0);

          calc.housingAllowance = Number(calc.worker.housingAllowance || 0);
          calc.transportAllowance = Number(calc.worker.transportAllowance || 0);
          calc.mealAllowance = Number(calc.worker.mealAllowance || 0);
          calc.otherAllowances = Number(calc.worker.otherAllowances || 0);

          calc.grossPay += workerAllowances;

          // Calculate UK tax and deductions
          const taxCalc = calculateUKTax({
            grossPay: calc.grossPay,
            taxCode: calc.worker.taxCode || "1257L",
            pensionContributionRate: calc.worker.pensionSchemeEnrolled
              ? Number(calc.worker.pensionContributionRate || 5)
              : 0,
            studentLoanPlan: calc.worker.studentLoanPlan || null,
            ytdGrossPay,
            ytdTax,
            ytdNI,
          });

          // Set calculated tax and deductions
          calc.incomeTax = taxCalc.incomeTax;
          calc.nationalInsurance = taxCalc.nationalInsurance;
          calc.pensionContribution = taxCalc.pensionContribution;
          calc.studentLoan = taxCalc.studentLoan;
          calc.otherDeductions = 0;
          calc.deductions = taxCalc.totalDeductions;
          calc.netPay = taxCalc.netPay;
          calc.ytdGrossPay = taxCalc.ytdGrossPay;
          calc.ytdTax = taxCalc.ytdTax;
          calc.ytdNI = taxCalc.ytdNI;
          calc.ytdNetPay = taxCalc.ytdNetPay;

          return calc;
        })
      );

      if (calculations.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No approved time logs found for the selected period",
        });
      }

      const totalGrossPay = calculations.reduce((sum, w) => sum + w.grossPay, 0);
      const totalDeductions = calculations.reduce((sum, w) => sum + w.deductions, 0);
      const totalNetPay = calculations.reduce((sum, w) => sum + w.netPay, 0);

      // Create payroll run with workers in a transaction
      const payrollRun = await prisma.payrollRun.create({
        data: {
          organizationId: ctx.orgId,
          subaccountId: ctx.subaccountId ?? null,
          periodStart,
          periodEnd,
          paymentDate,
          totalGrossPay,
          totalDeductions,
          totalNetPay,
          currency: "GBP",
          notes,
          createdBy: ctx.auth.user.id,
          payrollRunWorkers: {
            create: calculations.map((calc) => ({
              workerId: calc.workerId,
              regularHours: calc.regularHours,
              overtimeHours: calc.overtimeHours,
              regularPay: calc.regularPay,
              overtimePay: calc.overtimePay,
              bonuses: calc.bonuses,
              housingAllowance: calc.housingAllowance,
              transportAllowance: calc.transportAllowance,
              mealAllowance: calc.mealAllowance,
              otherAllowances: calc.otherAllowances,
              incomeTax: calc.incomeTax,
              nationalInsurance: calc.nationalInsurance,
              pensionContribution: calc.pensionContribution,
              studentLoan: calc.studentLoan,
              otherDeductions: calc.otherDeductions,
              deductions: calc.deductions,
              grossPay: calc.grossPay,
              netPay: calc.netPay,
              ytdGrossPay: calc.ytdGrossPay,
              ytdTax: calc.ytdTax,
              ytdNI: calc.ytdNI,
              ytdNetPay: calc.ytdNetPay,
            })),
          },
        },
        include: {
          payrollRunWorkers: {
            include: {
              worker: true,
            },
          },
        },
      });

      return payrollRun;
    }),

  // Approve payroll run
  approve: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      if (!ctx.auth.user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const payrollRun = await prisma.payrollRun.update({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
        },
        data: {
          status: "APPROVED",
          approvedBy: ctx.auth.user.id,
          approvedAt: new Date(),
        },
      });

      return payrollRun;
    }),

  // Process payments (mark as processing)
  processPayments: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      if (!ctx.auth.user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      // Get payroll run with workers
      const payrollRun = await prisma.payrollRun.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
        },
        include: {
          payrollRunWorkers: {
            include: {
              worker: true,
            },
          },
        },
      });

      if (!payrollRun) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payroll run not found",
        });
      }

      if (payrollRun.status !== "APPROVED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Payroll run must be approved before processing",
        });
      }

      // Create worker payment records
      await prisma.$transaction([
        // Update payroll run status
        prisma.payrollRun.update({
          where: { id: input.id },
          data: {
            status: "PROCESSING",
            processedBy: ctx.auth.user.id,
            processedAt: new Date(),
          },
        }),
        // Create payment records
        ...payrollRun.payrollRunWorkers.map((prw) =>
          prisma.workerPayment.create({
            data: {
              workerId: prw.workerId,
              payrollRunId: payrollRun.id,
              organizationId: ctx.orgId!,
              subaccountId: ctx.subaccountId ?? null,
              periodStart: payrollRun.periodStart,
              periodEnd: payrollRun.periodEnd,
              paymentDate: payrollRun.paymentDate,
              grossAmount: prw.grossPay,
              deductions: prw.deductions,
              netAmount: prw.netPay,
              currency: payrollRun.currency,
              paymentMethod: "BANK_TRANSFER",
              paymentStatus: "PENDING",
              bankAccountName: prw.worker.bankAccountName,
              bankAccountNumber: prw.worker.bankAccountNumber,
              bankSortCode: prw.worker.bankSortCode,
              metadata: {
                regularHours: Number(prw.regularHours),
                overtimeHours: Number(prw.overtimeHours),
                regularPay: Number(prw.regularPay),
                overtimePay: Number(prw.overtimePay),
                bonuses: Number(prw.bonuses),
              },
            },
          })
        ),
      ]);

      return {
        success: true,
        paymentsCreated: payrollRun.payrollRunWorkers.length,
      };
    }),

  // Mark individual payment as completed
  markPaymentCompleted: protectedProcedure
    .input(
      z.object({
        paymentId: z.string(),
        paymentReference: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      if (!ctx.auth.user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const payment = await prisma.workerPayment.update({
        where: {
          id: input.paymentId,
          organizationId: ctx.orgId,
        },
        data: {
          paymentStatus: "COMPLETED",
          paymentReference: input.paymentReference,
          notes: input.notes,
          paidBy: ctx.auth.user.id,
          paidAt: new Date(),
        },
      });

      // Check if all payments in the run are completed
      if (payment.payrollRunId) {
        const allPayments = await prisma.workerPayment.findMany({
          where: {
            payrollRunId: payment.payrollRunId,
          },
        });

        const allCompleted = allPayments.every(
          (p) => p.paymentStatus === "COMPLETED"
        );

        if (allCompleted) {
          await prisma.payrollRun.update({
            where: { id: payment.payrollRunId },
            data: {
              status: "COMPLETED",
              completedAt: new Date(),
            },
          });
        }
      }

      return payment;
    }),

  // Bulk mark payments as completed
  bulkMarkCompleted: protectedProcedure
    .input(
      z.object({
        payrollRunId: z.string(),
        paymentReference: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      if (!ctx.auth.user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      await prisma.$transaction([
        // Update all payments
        prisma.workerPayment.updateMany({
          where: {
            payrollRunId: input.payrollRunId,
            organizationId: ctx.orgId,
          },
          data: {
            paymentStatus: "COMPLETED",
            paymentReference: input.paymentReference,
            paidBy: ctx.auth.user.id,
            paidAt: new Date(),
          },
        }),
        // Update payroll run
        prisma.payrollRun.update({
          where: {
            id: input.payrollRunId,
            organizationId: ctx.orgId!,
          },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
          },
        }),
      ]);

      return { success: true };
    }),

  // Get worker payment history
  getWorkerPayments: protectedProcedure
    .input(
      z.object({
        workerId: z.string(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      const payments = await prisma.workerPayment.findMany({
        where: {
          workerId: input.workerId,
          organizationId: ctx.orgId,
        },
        include: {
          payrollRun: {
            select: {
              id: true,
              status: true,
              periodStart: true,
              periodEnd: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: input.limit + 1,
        ...(input.cursor && {
          cursor: {
            id: input.cursor,
          },
          skip: 1,
        }),
      });

      let nextCursor: string | undefined = undefined;
      if (payments.length > input.limit) {
        const nextItem = payments.pop();
        nextCursor = nextItem!.id;
      }

      return {
        payments,
        nextCursor,
      };
    }),

  // Delete payroll run (only if draft)
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      const payrollRun = await prisma.payrollRun.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
        },
      });

      if (!payrollRun) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payroll run not found",
        });
      }

      if (payrollRun.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only delete draft payroll runs",
        });
      }

      await prisma.payrollRun.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Generate payslip HTML for a worker in a payroll run
  generatePayslip: protectedProcedure
    .input(
      z.object({
        payrollRunId: z.string(),
        workerId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const payslipData = await getPayslipData(
        input.payrollRunId,
        input.workerId
      );

      if (!payslipData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payslip data not found",
        });
      }

      const html = generatePayslipHTML(payslipData);

      return {
        html,
        workerName: payslipData.worker.name,
      };
    }),

  // Get payslip data for download
  getPayslip: protectedProcedure
    .input(
      z.object({
        payrollRunId: z.string(),
        workerId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const payslipData = await getPayslipData(
        input.payrollRunId,
        input.workerId
      );

      if (!payslipData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payslip data not found",
        });
      }

      return {
        worker: {
          id: payslipData.worker.id,
          name: payslipData.worker.name,
          email: payslipData.worker.email,
        },
        payrollRun: {
          id: payslipData.payrollRun.id,
          periodStart: payslipData.payrollRun.periodStart,
          periodEnd: payslipData.payrollRun.periodEnd,
          paymentDate: payslipData.payrollRun.paymentDate,
        },
        payslipUrl: payslipData.payrollWorker.payslipUrl,
        payslipSentAt: payslipData.payrollWorker.payslipSentAt,
      };
    }),
});
