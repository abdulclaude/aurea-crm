import { and, eq } from "drizzle-orm";

import {
  activity,
  clientAssignee,
  clientHousehold,
  clientHouseholdMember,
  deal,
  dealAssignee,
  dealClient,
  instructor,
  instructorAvailability,
  instructorPayment,
  locationMember,
  note,
  overtimeTracking,
  payrollRun,
  payrollRunInstructor,
  pipeline,
  pipelineStage,
  rota,
  shiftSwapRequest,
  staffIdentity,
  studioStaffMember,
  task,
  timeLog,
  timeOffRequest,
} from "@/db/schema";
import type {
  DemoDataTransaction,
  DemoPackResult,
  DemoSeedContext,
} from "@/features/demo-data/server/types";
import { buildCoreOperationsFixturePlan } from "@/features/demo-data/server/packs/core-operations/plan";
import type { CoreOperationsDependencies } from "@/features/demo-data/server/packs/core-operations/types";
import {
  chunk,
  deterministicDemoId,
  recordRefs,
  utcDay,
} from "@/features/demo-data/server/packs/core-operations/utils";

export async function seedCoreOperationsPack(
  tx: DemoDataTransaction,
  context: DemoSeedContext,
  dependencies: CoreOperationsDependencies,
): Promise<DemoPackResult> {
  const plan = buildCoreOperationsFixturePlan(context, dependencies);
  await tx.insert(staffIdentity).values(plan.staffIdentities);
  await tx.insert(studioStaffMember).values(plan.staffMembers);
  for (const link of plan.instructorIdentityLinks) {
    await tx
      .update(instructor)
      .set({
        staffIdentityId: link.identityId,
        updatedAt: context.referenceDate,
      })
      .where(
        and(
          eq(instructor.id, link.instructorId),
          eq(instructor.organizationId, context.organizationId),
          eq(instructor.locationId, context.locationId),
        ),
      );
  }
  await tx.insert(clientHousehold).values(plan.households);
  await tx.insert(clientHouseholdMember).values(plan.householdMembers);
  await tx.insert(pipeline).values(plan.pipelines);
  await tx.insert(pipelineStage).values(plan.pipelineStages);
  await tx.insert(deal).values(plan.deals);
  await tx.insert(dealClient).values(plan.dealClients);
  const actorMemberId = await findActorLocationMemberId(tx, context);
  const dealAssignees = actorMemberId
    ? plan.deals.map((row, index) => ({
        id: deterministicDemoId(context.runId, "deal-assignee", index),
        dealId: row.id,
        locationMemberId: actorMemberId,
        assignedAt: row.createdAt,
      }))
    : [];
  const clientAssignees = actorMemberId
    ? dependencies.clients
        .slice(0, context.profile === "SHOWCASE" ? 60 : 200)
        .map((row, index) => ({
          id: deterministicDemoId(context.runId, "client-assignee", index),
          clientId: row.id,
          locationMemberId: actorMemberId,
          assignedAt: utcDay(context.referenceDate, -(index % 90)),
        }))
    : [];
  if (dealAssignees.length > 0) {
    await tx.insert(dealAssignee).values(dealAssignees);
  }
  if (clientAssignees.length > 0) {
    await tx.insert(clientAssignee).values(clientAssignees);
  }
  await tx.insert(task).values(plan.tasks);
  await tx.insert(note).values(plan.notes);
  for (const rows of chunk(plan.activities)) {
    await tx.insert(activity).values(rows);
  }
  await tx.insert(instructorAvailability).values(plan.availability);
  await tx.insert(timeOffRequest).values(plan.timeOffRequests);
  for (const rows of chunk(plan.rotas)) await tx.insert(rota).values(rows);
  await tx.insert(shiftSwapRequest).values(plan.shiftSwaps);
  for (const rows of chunk(plan.timeLogs, 150)) {
    await tx.insert(timeLog).values(rows);
  }
  for (const rows of chunk(plan.overtime)) {
    await tx.insert(overtimeTracking).values(rows);
  }
  await tx.insert(payrollRun).values(plan.payrollRuns);
  for (const rows of chunk(plan.payrollDetails)) {
    await tx.insert(payrollRunInstructor).values(rows);
  }
  for (const rows of chunk(plan.instructorPayments)) {
    await tx.insert(instructorPayment).values(rows);
  }
  return packResult(plan, dealAssignees, clientAssignees);
}

async function findActorLocationMemberId(
  tx: DemoDataTransaction,
  context: DemoSeedContext,
): Promise<string | null> {
  const [actorMember] = await tx
    .select({ id: locationMember.id })
    .from(locationMember)
    .where(
      and(
        eq(locationMember.locationId, context.locationId),
        eq(locationMember.userId, context.actorUserId),
      ),
    )
    .limit(1);
  return actorMember?.id ?? null;
}

function packResult(
  plan: ReturnType<typeof buildCoreOperationsFixturePlan>,
  dealAssignees: Array<{ id: string }>,
  clientAssignees: Array<{ id: string }>,
): DemoPackResult {
  const groups = [
    ["StaffIdentity", plan.staffIdentities],
    ["StudioStaffMember", plan.staffMembers],
    ["ClientHousehold", plan.households],
    ["ClientHouseholdMember", plan.householdMembers],
    ["Pipeline", plan.pipelines],
    ["PipelineStage", plan.pipelineStages],
    ["Deal", plan.deals],
    ["DealClient", plan.dealClients],
    ["DealMember", dealAssignees],
    ["ClientAssignee", clientAssignees],
    ["task", plan.tasks],
    ["note", plan.notes],
    ["Activity", plan.activities],
    ["InstructorAvailability", plan.availability],
    ["TimeOffRequest", plan.timeOffRequests],
    ["Rota", plan.rotas],
    ["ShiftSwapRequest", plan.shiftSwaps],
    ["TimeLog", plan.timeLogs],
    ["OvertimeTracking", plan.overtime],
    ["PayrollRun", plan.payrollRuns],
    ["PayrollRunInstructor", plan.payrollDetails],
    ["InstructorPayment", plan.instructorPayments],
  ] as const;
  return {
    counts: Object.fromEntries(groups.map(([type, rows]) => [type, rows.length])),
    records: groups.flatMap(([type, rows]) => recordRefs(type, rows)),
  };
}
