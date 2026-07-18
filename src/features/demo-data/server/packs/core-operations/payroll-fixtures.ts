import type {
  instructorPayment,
  payrollRun,
  payrollRunInstructor,
} from "@/db/schema";
import type { DemoSeedContext } from "@/features/demo-data/server/types";
import {
  PAYROLL_STATUSES,
  PROFILE_COUNTS,
} from "@/features/demo-data/server/packs/core-operations/constants";
import type { InstructorDependency } from "@/features/demo-data/server/packs/core-operations/types";
import {
  demoMetadata,
  deterministicDemoId,
  money,
  monthPeriod,
  rateMinor,
} from "@/features/demo-data/server/packs/core-operations/utils";

export type PayrollFixturePlan = {
  payrollRuns: Array<typeof payrollRun.$inferInsert>;
  payrollDetails: Array<typeof payrollRunInstructor.$inferInsert>;
  instructorPayments: Array<typeof instructorPayment.$inferInsert>;
};

export function buildPayrollFixtures(
  context: DemoSeedContext,
  instructors: InstructorDependency[],
): PayrollFixturePlan {
  const runCount = PROFILE_COUNTS[context.profile].payrollRunCount;
  const payrollRuns: Array<typeof payrollRun.$inferInsert> = [];
  const payrollDetails: Array<typeof payrollRunInstructor.$inferInsert> = [];
  const instructorPayments: Array<typeof instructorPayment.$inferInsert> = [];
  for (let runIndex = 0; runIndex < runCount; runIndex += 1) {
    const monthOffset = runIndex - runCount + 1;
    const period = monthPeriod(context.referenceDate, monthOffset);
    const status =
      runIndex < runCount - PAYROLL_STATUSES.length
        ? "COMPLETED"
        : PAYROLL_STATUSES[
            runIndex - Math.max(0, runCount - PAYROLL_STATUSES.length)
          ]!;
    const runId = deterministicDemoId(context.runId, "payroll-run", runIndex);
    const totals = { gross: 0, deductions: 0, net: 0 };
    instructors.forEach((item, instructorIndex) => {
      const calculation = calculatePayrollAmounts(runIndex, instructorIndex);
      totals.gross += calculation.gross;
      totals.deductions += calculation.deductions;
      totals.net += calculation.net;
      payrollDetails.push({
        id: deterministicDemoId(
          context.runId,
          "payroll-detail",
          `${runIndex}-${instructorIndex}`,
        ),
        payrollRunId: runId,
        instructorId: item.id,
        regularHours: `${calculation.regularHours}.00`,
        overtimeHours: `${calculation.overtimeHours}.00`,
        regularPay: money(calculation.regularPay),
        overtimePay: money(calculation.overtimePay),
        bonuses: money(calculation.bonus),
        deductions: money(calculation.deductions),
        grossPay: money(calculation.gross),
        netPay: money(calculation.net),
        incomeTax: money(calculation.tax),
        nationalInsurance: money(calculation.nationalInsurance),
        pensionContribution: money(calculation.pension),
        notes: "Synthetic payroll calculation.",
        createdAt: period.end,
        updatedAt: context.referenceDate,
      });
      if (status !== "DRAFT") {
        instructorPayments.push(
          buildInstructorPayment({
            context,
            runId,
            runIndex,
            instructorIndex,
            instructorId: item.id,
            status,
            period,
            calculation,
          }),
        );
      }
    });
    payrollRuns.push({
      id: runId,
      organizationId: context.organizationId,
      locationId: context.locationId,
      periodStart: period.start,
      periodEnd: period.end,
      paymentDate: period.paymentDate,
      status,
      totalGrossPay: money(totals.gross),
      totalDeductions: money(totals.deductions),
      totalNetPay: money(totals.net),
      currency: context.currency,
      notes: "Synthetic payroll run; no external payment was sent.",
      approvedBy: isOneOf(status, ["APPROVED", "PROCESSING", "COMPLETED"])
        ? context.actorUserId
        : null,
      approvedAt: isOneOf(status, ["APPROVED", "PROCESSING", "COMPLETED"])
        ? period.end
        : null,
      processedBy: isOneOf(status, ["PROCESSING", "COMPLETED"])
        ? context.actorUserId
        : null,
      processedAt: isOneOf(status, ["PROCESSING", "COMPLETED"])
        ? period.paymentDate
        : null,
      completedAt: status === "COMPLETED" ? period.paymentDate : null,
      createdBy: context.actorUserId,
      createdAt: period.end,
      updatedAt: context.referenceDate,
    });
  }
  return { payrollRuns, payrollDetails, instructorPayments };
}

function calculatePayrollAmounts(runIndex: number, instructorIndex: number) {
  const rate = rateMinor(instructorIndex);
  const regularHours = 64 + (instructorIndex % 5) * 4;
  const overtimeHours = (runIndex + instructorIndex) % 3 === 0 ? 4 : 0;
  const regularPay = regularHours * rate;
  const overtimePay = (overtimeHours * rate * 3) / 2;
  const bonus = (runIndex + instructorIndex) % 7 === 0 ? 5_000 : 0;
  const gross = regularPay + overtimePay + bonus;
  const tax = Math.floor((gross * 18) / 100);
  const nationalInsurance = Math.floor((gross * 6) / 100);
  const pension = instructorIndex % 2 === 0 ? Math.floor((gross * 5) / 100) : 0;
  const deductions = tax + nationalInsurance + pension;
  return {
    regularHours,
    overtimeHours,
    regularPay,
    overtimePay,
    bonus,
    gross,
    tax,
    nationalInsurance,
    pension,
    deductions,
    net: gross - deductions,
  };
}

function buildInstructorPayment(input: {
  context: DemoSeedContext;
  runId: string;
  runIndex: number;
  instructorIndex: number;
  instructorId: string;
  status: (typeof PAYROLL_STATUSES)[number];
  period: ReturnType<typeof monthPeriod>;
  calculation: ReturnType<typeof calculatePayrollAmounts>;
}): typeof instructorPayment.$inferInsert {
  const defaultStatus =
    input.status === "COMPLETED"
      ? "COMPLETED"
      : input.status === "PROCESSING"
        ? "PROCESSING"
        : input.status === "FAILED"
          ? "FAILED"
          : input.status === "CANCELLED"
            ? "CANCELLED"
            : "PENDING";
  const status =
    input.runIndex === 0 && input.instructorIndex === 0
      ? "REFUNDED"
      : defaultStatus;
  const paid = status === "COMPLETED" || status === "REFUNDED";
  return {
    id: deterministicDemoId(
      input.context.runId,
      "instructor-payment",
      `${input.runIndex}-${input.instructorIndex}`,
    ),
    instructorId: input.instructorId,
    payrollRunId: input.runId,
    organizationId: input.context.organizationId,
    locationId: input.context.locationId,
    periodStart: input.period.start,
    periodEnd: input.period.end,
    paymentDate: input.period.paymentDate,
    grossAmount: money(input.calculation.gross),
    deductions: money(input.calculation.deductions),
    netAmount: money(input.calculation.net),
    currency: input.context.currency,
    paymentMethod: "BANK_TRANSFER",
    paymentStatus: status,
    paymentReference: `DEMO-PAY-${input.runIndex + 1}-${input.instructorIndex + 1}`,
    paidBy: paid ? input.context.actorUserId : null,
    paidAt: paid ? input.period.paymentDate : null,
    failureReason:
      status === "FAILED" ? "Synthetic rejected payment for QA." : null,
    notes: "Demo-only payment; no provider or bank instruction was created.",
    metadata: demoMetadata(input.context, { simulated: true }),
    createdAt: input.period.end,
    updatedAt: input.context.referenceDate,
  };
}

function isOneOf<T extends string>(value: string, options: readonly T[]): boolean {
  return options.some((option) => option === value);
}
