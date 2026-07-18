import type { DemoSeedContext } from "@/features/demo-data/server/types";
import type {
  CoreOperationsDependencies,
  CoreOperationsFixturePlan,
} from "@/features/demo-data/server/packs/core-operations/types";
import { minorUnits } from "@/features/demo-data/server/packs/core-operations/utils";

export function assertCoreOperationsFixtureInvariants(
  plan: CoreOperationsFixturePlan,
  context: DemoSeedContext,
  dependencies: CoreOperationsDependencies,
): void {
  const clientIds = new Set(dependencies.clients.map((row) => row.id));
  const instructorIds = new Set(
    dependencies.instructors.map((row) => row.id),
  );
  const pipelineIds = new Set(plan.pipelines.map((row) => row.id));
  const stageIds = new Set(plan.pipelineStages.map((row) => row.id));
  const dealIds = new Set(plan.deals.map((row) => row.id));

  for (const row of plan.pipelineStages) {
    if (!pipelineIds.has(row.pipelineId)) {
      throw new Error("Pipeline stage references an unknown pipeline.");
    }
  }
  for (const currentPipeline of plan.pipelines) {
    const stages = plan.pipelineStages
      .filter((row) => row.pipelineId === currentPipeline.id)
      .sort((left, right) => left.position - right.position);
    if (
      stages.at(-1)?.probability !== 100 ||
      !stages.some((row) => row.probability === 0)
    ) {
      throw new Error(
        "Every pipeline must end in a won stage and contain a lost stage.",
      );
    }
  }
  for (const row of plan.deals) {
    if (
      row.organizationId !== context.organizationId ||
      row.locationId !== context.locationId ||
      row.currency !== context.currency
    ) {
      throw new Error("Deal scope or currency does not match the demo context.");
    }
    if (
      !pipelineIds.has(row.pipelineId ?? "") ||
      !stageIds.has(row.pipelineStageId ?? "")
    ) {
      throw new Error("Deal references an unknown pipeline or stage.");
    }
  }
  for (const row of plan.dealClients) {
    if (!dealIds.has(row.dealId) || !clientIds.has(row.clientId)) {
      throw new Error("Deal client link is invalid.");
    }
  }
  for (const row of plan.tasks) {
    if ((row.status === "DONE") !== Boolean(row.completedAt)) {
      throw new Error("Task completion timestamps must match DONE status.");
    }
    if (row.createdById !== context.actorUserId) {
      throw new Error("Tasks must use the real demo actor.");
    }
  }
  assertRotasDoNotOverlap(plan, instructorIds);
  assertPayrollTotals(plan);
  if (
    !plan.timeLogs.some(
      (row) =>
        row.status === "APPROVED" &&
        row.startTime.getUTCMonth() === context.referenceDate.getUTCMonth(),
    )
  ) {
    throw new Error(
      "Payroll preview requires approved current-month time logs.",
    );
  }
  if (
    !plan.timeLogs.some(
      (row) => row.endTime === null && row.status === "DRAFT",
    )
  ) {
    throw new Error("Instructor demo requires one open time log.");
  }
}

function assertRotasDoNotOverlap(
  plan: CoreOperationsFixturePlan,
  instructorIds: ReadonlySet<string>,
): void {
  const activeRotas = plan.rotas
    .filter((row) => row.status !== "CANCELLED")
    .sort((left, right) => left.startTime.getTime() - right.startTime.getTime());
  const lastEndByInstructor = new Map<string, Date>();
  for (const row of activeRotas) {
    if (!instructorIds.has(row.instructorId)) {
      throw new Error("Rota references an unknown instructor.");
    }
    const previousEnd = lastEndByInstructor.get(row.instructorId);
    if (previousEnd && previousEnd > row.startTime) {
      throw new Error("Active demo rotas may not overlap.");
    }
    lastEndByInstructor.set(row.instructorId, row.endTime);
  }
}

function assertPayrollTotals(plan: CoreOperationsFixturePlan): void {
  for (const run of plan.payrollRuns) {
    const details = plan.payrollDetails.filter(
      (row) => row.payrollRunId === run.id,
    );
    const gross = details.reduce(
      (total, row) => total + minorUnits(row.grossPay),
      0,
    );
    const deductions = details.reduce(
      (total, row) => total + minorUnits(row.deductions ?? "0"),
      0,
    );
    const net = details.reduce(
      (total, row) => total + minorUnits(row.netPay),
      0,
    );
    if (
      gross !== minorUnits(run.totalGrossPay) ||
      deductions !== minorUnits(run.totalDeductions ?? "0") ||
      net !== minorUnits(run.totalNetPay)
    ) {
      throw new Error(
        "Payroll run totals must equal their instructor details.",
      );
    }
  }
}
