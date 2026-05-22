import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { and, desc, eq, gte, inArray, isNull, lt, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  instructorPayment,
  payrollRun,
  payrollRunInstructor,
  timeLog,
} from "@/db/schema";
import { TRPCError } from "@trpc/server";
import { generatePayslipHTML, getPayslipData } from "../lib/payslip-generator";
import { calculateUKTax } from "../lib/uk-tax-calculator";
import { startOfYear } from "date-fns";
import type { JsonObject } from "@/db/json";

type PayrollCalculation = {
  instructorId: string;
  instructor: NonNullable<Awaited<ReturnType<typeof fetchPayrollTimeLogs>>[number]["instructor"]>;
  regularHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  bonuses: number;
  grossPay: number;
  housingAllowance?: number;
  transportAllowance?: number;
  mealAllowance?: number;
  otherAllowances?: number;
  incomeTax?: number;
  nationalInsurance?: number;
  pensionContribution?: number;
  studentLoan?: number;
  otherDeductions?: number;
  deductions?: number;
  netPay?: number;
  ytdGrossPay?: number;
  ytdTax?: number;
  ytdNI?: number;
  ytdNetPay?: number;
};

const scopedPayrollWhere = (organizationId: string, locationId: string | null | undefined) =>
  and(
    eq(payrollRun.organizationId, organizationId),
    locationId ? eq(payrollRun.locationId, locationId) : isNull(payrollRun.locationId),
  );

async function fetchPayrollTimeLogs({
  organizationId,
  locationId,
  periodStart,
  periodEnd,
  instructorIds,
}: {
  organizationId: string;
  locationId: string | null | undefined;
  periodStart: Date;
  periodEnd: Date;
  instructorIds?: string[];
}) {
  return await db.query.timeLog.findMany({
    where: and(
      eq(timeLog.organizationId, organizationId),
      locationId ? eq(timeLog.locationId, locationId) : isNull(timeLog.locationId),
      gte(timeLog.startTime, periodStart),
      lte(timeLog.startTime, periodEnd),
      eq(timeLog.status, "APPROVED"),
      instructorIds && instructorIds.length > 0
        ? inArray(timeLog.instructorId, instructorIds)
        : undefined,
    ),
    with: {
      instructor: true,
    },
  });
}

const money = (value: number | string | null | undefined): string =>
  String(Number(value ?? 0));

const parseStudentLoanPlan = (
  value: string | null,
): "plan1" | "plan2" | "plan4" | "postgraduate" | null => {
  if (
    value === "plan1" ||
    value === "plan2" ||
    value === "plan4" ||
    value === "postgraduate"
  ) {
    return value;
  }
  return null;
};

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

      const payrollRuns = await db.query.payrollRun.findMany({
        where: and(
          scopedPayrollWhere(ctx.orgId, ctx.locationId),
          status ? eq(payrollRun.status, status) : undefined,
          cursor ? lt(payrollRun.id, cursor) : undefined,
        ),
        with: {
          payrollRunInstructors: {
            with: {
              instructor: {
                columns: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          instructorPayments: {
            columns: {
              id: true,
              paymentStatus: true,
              netAmount: true,
            },
          },
        },
        orderBy: [desc(payrollRun.createdAt)],
        limit: limit + 1,
      });

      let nextCursor: string | undefined = undefined;
      if (payrollRuns.length > limit) {
        const nextItem = payrollRuns.pop();
        nextCursor = nextItem!.id;
      }

      return {
        payrollRuns: payrollRuns.map((run) => ({
          ...run,
          _count: {
            payrollRunInstructors: run.payrollRunInstructors.length,
            instructorPayments: run.instructorPayments.length,
          },
        })),
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

      const selectedPayrollRun = await db.query.payrollRun.findFirst({
        where: and(eq(payrollRun.id, input.id), eq(payrollRun.organizationId, ctx.orgId)),
        with: {
          payrollRunInstructors: {
            with: {
              instructor: {
                columns: {
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
          instructorPayments: {
            with: {
              instructor: {
                columns: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!selectedPayrollRun) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payroll run not found",
        });
      }

      return {
        ...selectedPayrollRun,
        _count: {
          payrollRunInstructors: selectedPayrollRun.payrollRunInstructors.length,
          instructorPayments: selectedPayrollRun.instructorPayments.length,
        },
      };
    }),

  // Calculate payroll for a period (preview before creating)
  calculatePayroll: protectedProcedure
    .input(
      z.object({
        periodStart: z.date(),
        periodEnd: z.date(),
        instructorIds: z.array(z.string()).optional(), // If not provided, calculate for all instructors
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      const { periodStart, periodEnd, instructorIds } = input;

      // Fetch approved time logs for the period
      const timeLogs = await fetchPayrollTimeLogs({
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
        periodStart,
        periodEnd,
        instructorIds,
      });

      // Group by instructor and calculate totals
      const instructorCalculations = new Map<
        string,
        {
          instructorId: string;
          instructorName: string;
          instructorEmail: string | null;
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
        if (!log.instructorId) continue;

        const instructorId = log.instructorId;
        const existing = instructorCalculations.get(instructorId) || {
          instructorId,
          instructorName: log.instructor?.name || "Unknown",
          instructorEmail: log.instructor?.email || null,
          regularHours: 0,
          overtimeHours: 0,
          regularPay: 0,
          overtimePay: 0,
          grossPay: 0,
          netPay: 0,
          bankAccountName: log.instructor?.bankAccountName || null,
          bankAccountNumber: log.instructor?.bankAccountNumber || null,
          bankSortCode: log.instructor?.bankSortCode || null,
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

        instructorCalculations.set(instructorId, existing);
      }

      const calculations = Array.from(instructorCalculations.values());

      const summary = {
        totalInstructors: calculations.length,
        totalRegularHours: calculations.reduce((sum, w) => sum + w.regularHours, 0),
        totalOvertimeHours: calculations.reduce((sum, w) => sum + w.overtimeHours, 0),
        totalGrossPay: calculations.reduce((sum, w) => sum + w.grossPay, 0),
        totalNetPay: calculations.reduce((sum, w) => sum + w.netPay, 0),
      };

      return {
        periodStart,
        periodEnd,
        instructors: calculations,
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
        instructorIds: z.array(z.string()).optional(),
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

      const { periodStart, periodEnd, paymentDate, notes, instructorIds } = input;
      const organizationId = ctx.orgId;

      // Calculate payroll first
      const timeLogs = await fetchPayrollTimeLogs({
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
        periodStart,
        periodEnd,
        instructorIds,
      });

      // Group by instructor and calculate gross pay
      const instructorCalculations = new Map<string, PayrollCalculation>();
      for (const log of timeLogs) {
        if (!log.instructorId || !log.instructor) continue;

        const instructorId = log.instructorId;
        const existing = instructorCalculations.get(instructorId) || {
          instructorId,
          instructor: log.instructor,
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

        instructorCalculations.set(instructorId, existing);
      }

      // Calculate tax, NI, and deductions for each instructor
      const yearStart = startOfYear(periodStart);

      const calculations = await Promise.all(
        Array.from(instructorCalculations.values()).map(async (calc) => {
          // Get YTD totals from previous payroll runs this year
          const [ytdData] = await db
            .select({
              grossPay: sql<string | null>`sum(${payrollRunInstructor.grossPay})`,
              incomeTax: sql<string | null>`sum(${payrollRunInstructor.incomeTax})`,
              nationalInsurance: sql<string | null>`sum(${payrollRunInstructor.nationalInsurance})`,
            })
            .from(payrollRunInstructor)
            .innerJoin(payrollRun, eq(payrollRunInstructor.payrollRunId, payrollRun.id))
            .where(
              and(
                eq(payrollRunInstructor.instructorId, calc.instructorId),
                gte(payrollRun.periodStart, yearStart),
                lt(payrollRun.periodEnd, periodStart),
                inArray(payrollRun.status, ["COMPLETED", "PROCESSING", "APPROVED"]),
              ),
            );

          const ytdGrossPay = Number(ytdData?.grossPay || 0);
          const ytdTax = Number(ytdData?.incomeTax || 0);
          const ytdNI = Number(ytdData?.nationalInsurance || 0);

          // Add instructor's allowances to gross pay
          const instructorAllowances =
            Number(calc.instructor.housingAllowance || 0) +
            Number(calc.instructor.transportAllowance || 0) +
            Number(calc.instructor.mealAllowance || 0) +
            Number(calc.instructor.otherAllowances || 0);

          calc.housingAllowance = Number(calc.instructor.housingAllowance || 0);
          calc.transportAllowance = Number(calc.instructor.transportAllowance || 0);
          calc.mealAllowance = Number(calc.instructor.mealAllowance || 0);
          calc.otherAllowances = Number(calc.instructor.otherAllowances || 0);

          calc.grossPay += instructorAllowances;

          // Calculate UK tax and deductions
          const taxCalc = calculateUKTax({
            grossPay: calc.grossPay,
            taxCode: calc.instructor.taxCode || "1257L",
            pensionContributionRate: calc.instructor.pensionSchemeEnrolled
              ? Number(calc.instructor.pensionContributionRate || 5)
              : 0,
            studentLoanPlan: parseStudentLoanPlan(calc.instructor.studentLoanPlan),
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
      const totalDeductions = calculations.reduce((sum, w) => sum + (w.deductions ?? 0), 0);
      const totalNetPay = calculations.reduce((sum, w) => sum + (w.netPay ?? 0), 0);

      // Create payroll run with instructors in a transaction
      const createdPayrollRun = await db.transaction(async (tx) => {
        const [run] = await tx
          .insert(payrollRun)
          .values({
          id: crypto.randomUUID(),
          organizationId,
          locationId: ctx.locationId ?? null,
          periodStart,
          periodEnd,
          paymentDate,
          totalGrossPay: money(totalGrossPay),
          totalDeductions: money(totalDeductions),
          totalNetPay: money(totalNetPay),
          currency: "GBP",
          notes,
          createdBy: ctx.auth.user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
          })
          .returning();

        await tx.insert(payrollRunInstructor).values(
          calculations.map((calc) => ({
              id: crypto.randomUUID(),
              payrollRunId: run.id,
              instructorId: calc.instructorId,
              regularHours: money(calc.regularHours),
              overtimeHours: money(calc.overtimeHours),
              regularPay: money(calc.regularPay),
              overtimePay: money(calc.overtimePay),
              bonuses: money(calc.bonuses),
              housingAllowance: money(calc.housingAllowance),
              transportAllowance: money(calc.transportAllowance),
              mealAllowance: money(calc.mealAllowance),
              otherAllowances: money(calc.otherAllowances),
              incomeTax: money(calc.incomeTax),
              nationalInsurance: money(calc.nationalInsurance),
              pensionContribution: money(calc.pensionContribution),
              studentLoan: money(calc.studentLoan),
              otherDeductions: money(calc.otherDeductions),
              deductions: money(calc.deductions),
              grossPay: money(calc.grossPay),
              netPay: money(calc.netPay),
              ytdGrossPay: money(calc.ytdGrossPay),
              ytdTax: money(calc.ytdTax),
              ytdNi: money(calc.ytdNI),
              ytdNetPay: money(calc.ytdNetPay),
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
        );

        return run;
      });

      return await db.query.payrollRun.findFirst({
        where: eq(payrollRun.id, createdPayrollRun.id),
        with: {
          payrollRunInstructors: {
            with: { instructor: true },
          },
        },
      });
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

      const [updatedRun] = await db
        .update(payrollRun)
        .set({
          status: "APPROVED",
          approvedBy: ctx.auth.user.id,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(payrollRun.id, input.id), eq(payrollRun.organizationId, ctx.orgId)))
        .returning();

      return updatedRun;
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

      // Get payroll run with instructors
      const selectedPayrollRun = await db.query.payrollRun.findFirst({
        where: and(eq(payrollRun.id, input.id), eq(payrollRun.organizationId, ctx.orgId)),
        with: {
          payrollRunInstructors: {
            with: {
              instructor: true,
            },
          },
        },
      });

      if (!selectedPayrollRun) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payroll run not found",
        });
      }

      if (selectedPayrollRun.status !== "APPROVED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Payroll run must be approved before processing",
        });
      }

      // Create instructor payment records
      await db.transaction(async (tx) => {
        await tx
          .update(payrollRun)
          .set({
            status: "PROCESSING",
            processedBy: ctx.auth.user.id,
            processedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(payrollRun.id, input.id));

        await tx.insert(instructorPayment).values(
          selectedPayrollRun.payrollRunInstructors.map((prw) => ({
              id: crypto.randomUUID(),
              instructorId: prw.instructorId,
              payrollRunId: selectedPayrollRun.id,
              organizationId: ctx.orgId!,
              locationId: ctx.locationId ?? null,
              periodStart: selectedPayrollRun.periodStart,
              periodEnd: selectedPayrollRun.periodEnd,
              paymentDate: selectedPayrollRun.paymentDate,
              grossAmount: prw.grossPay,
              deductions: prw.deductions,
              netAmount: prw.netPay,
              currency: selectedPayrollRun.currency,
              paymentMethod: "BANK_TRANSFER" as const,
              paymentStatus: "PENDING" as const,
              bankAccountName: prw.instructor.bankAccountName,
              bankAccountNumber: prw.instructor.bankAccountNumber,
              bankSortCode: prw.instructor.bankSortCode,
              metadata: {
                regularHours: Number(prw.regularHours),
                overtimeHours: Number(prw.overtimeHours),
                regularPay: Number(prw.regularPay),
                overtimePay: Number(prw.overtimePay),
                bonuses: Number(prw.bonuses),
              } satisfies JsonObject,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
        );
      });

      return {
        success: true,
        paymentsCreated: selectedPayrollRun.payrollRunInstructors.length,
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

      const [payment] = await db
        .update(instructorPayment)
        .set({
          paymentStatus: "COMPLETED",
          paymentReference: input.paymentReference,
          notes: input.notes,
          paidBy: ctx.auth.user.id,
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(instructorPayment.id, input.paymentId),
            eq(instructorPayment.organizationId, ctx.orgId),
          ),
        )
        .returning();

      // Check if all payments in the run are completed
      if (payment.payrollRunId) {
        const allPayments = await db.query.instructorPayment.findMany({
          where: eq(instructorPayment.payrollRunId, payment.payrollRunId),
        });

        const allCompleted = allPayments.every(
          (p) => p.paymentStatus === "COMPLETED"
        );

        if (allCompleted) {
          await db
            .update(payrollRun)
            .set({
              status: "COMPLETED",
              completedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(payrollRun.id, payment.payrollRunId));
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
      const organizationId = ctx.orgId;

      await db.transaction(async (tx) => {
        await tx
          .update(instructorPayment)
          .set({
            paymentStatus: "COMPLETED",
            paymentReference: input.paymentReference,
            paidBy: ctx.auth.user.id,
            paidAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(instructorPayment.payrollRunId, input.payrollRunId),
              eq(instructorPayment.organizationId, organizationId),
            ),
          );

        await tx
          .update(payrollRun)
          .set({
            status: "COMPLETED",
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(payrollRun.id, input.payrollRunId),
              eq(payrollRun.organizationId, organizationId),
            ),
          );
      });

      return { success: true };
    }),

  // Get instructor payment history
  getInstructorPayments: protectedProcedure
    .input(
      z.object({
        instructorId: z.string(),
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

      const payments = await db.query.instructorPayment.findMany({
        where: and(
          eq(instructorPayment.instructorId, input.instructorId),
          eq(instructorPayment.organizationId, ctx.orgId),
          input.cursor ? lt(instructorPayment.id, input.cursor) : undefined,
        ),
        with: {
          payrollRun: {
            columns: {
              id: true,
              status: true,
              periodStart: true,
              periodEnd: true,
            },
          },
        },
        orderBy: [desc(instructorPayment.createdAt)],
        limit: input.limit + 1,
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

      const selectedPayrollRun = await db.query.payrollRun.findFirst({
        where: and(eq(payrollRun.id, input.id), eq(payrollRun.organizationId, ctx.orgId)),
      });

      if (!selectedPayrollRun) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payroll run not found",
        });
      }

      if (selectedPayrollRun.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only delete draft payroll runs",
        });
      }

      await db.delete(payrollRun).where(eq(payrollRun.id, input.id));

      return { success: true };
    }),

  // Generate payslip HTML for a instructor in a payroll run
  generatePayslip: protectedProcedure
    .input(
      z.object({
        payrollRunId: z.string(),
        instructorId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const payslipData = await getPayslipData(
        input.payrollRunId,
        input.instructorId
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
        instructorName: payslipData.instructor.name,
      };
    }),

  // Get payslip data for download
  getPayslip: protectedProcedure
    .input(
      z.object({
        payrollRunId: z.string(),
        instructorId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const payslipData = await getPayslipData(
        input.payrollRunId,
        input.instructorId
      );

      if (!payslipData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payslip data not found",
        });
      }

      return {
        instructor: {
          id: payslipData.instructor.id,
          name: payslipData.instructor.name,
          email: payslipData.instructor.email,
        },
        payrollRun: {
          id: payslipData.payrollRun.id,
          periodStart: payslipData.payrollRun.periodStart,
          periodEnd: payslipData.payrollRun.periodEnd,
          paymentDate: payslipData.payrollRun.paymentDate,
        },
        payslipUrl: payslipData.payrollInstructor.payslipUrl,
        payslipSentAt: payslipData.payrollInstructor.payslipSentAt,
      };
    }),
});
