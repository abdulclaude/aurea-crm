import type { activity, deal, note, task } from "@/db/schema";
import type { DemoSeedContext } from "@/features/demo-data/server/types";
import {
  PROFILE_COUNTS,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "@/features/demo-data/server/packs/core-operations/constants";
import type { ClientDependency } from "@/features/demo-data/server/packs/core-operations/types";
import {
  demoMetadata,
  deterministicDemoId,
  utcDay,
} from "@/features/demo-data/server/packs/core-operations/utils";

export type EngagementFixturePlan = {
  tasks: Array<typeof task.$inferInsert>;
  notes: Array<typeof note.$inferInsert>;
  activities: Array<typeof activity.$inferInsert>;
};

export function buildEngagementFixtures(
  context: DemoSeedContext,
  clients: ClientDependency[],
  deals: Array<typeof deal.$inferInsert>,
): EngagementFixturePlan {
  const counts = PROFILE_COUNTS[context.profile];
  const now = context.referenceDate;
  const tasks = Array.from({ length: counts.taskCount }, (_, index) => {
    const status = TASK_STATUSES[index % TASK_STATUSES.length]!;
    const dueOffset =
      index % 7 === 0
        ? null
        : index % 3 === 0
          ? -(1 + (index % 12))
          : 1 + (index % 30);
    return {
      id: deterministicDemoId(context.runId, "task", index),
      organizationId: context.organizationId,
      locationId: context.locationId,
      title: [
        "Follow up after trial",
        "Review membership options",
        "Confirm accessibility needs",
        "Prepare renewal summary",
      ][index % 4]!,
      description: `Demo task ${index + 1} for the studio team.`,
      status,
      priority: TASK_PRIORITIES[index % TASK_PRIORITIES.length]!,
      dueDate: dueOffset === null ? null : utcDay(now, dueOffset, 16),
      completedAt:
        status === "DONE" ? utcDay(now, -(index % 10), 15) : null,
      clientId:
        index % 4 === 0 ? null : clients[index % clients.length]!.id,
      dealId: index % 3 === 0 ? deals[index % deals.length]!.id : null,
      createdById: context.actorUserId,
      assigneeId: index % 5 === 0 ? null : context.actorUserId,
      createdAt: utcDay(now, -(index % 120), 9),
      updatedAt:
        status === "DONE"
          ? utcDay(now, -(index % 10), 15)
          : utcDay(now, -(index % 20), 9),
    };
  });
  const contents = [
    "Discussed goals and recommended a starter plan.",
    "Requested a follow-up after the next trial session.",
    "Prefers morning appointments and email updates.",
    "Reviewed options; decision expected this week.",
  ];
  const notes = Array.from({ length: counts.noteCount }, (_, index) => {
    const targetClient = index % 2 === 0;
    return {
      id: deterministicDemoId(context.runId, "note", index),
      organizationId: context.organizationId,
      locationId: context.locationId,
      clientId: targetClient ? clients[index % clients.length]!.id : null,
      dealId: targetClient ? null : deals[index % deals.length]!.id,
      authorId: context.actorUserId,
      content: contents[index % contents.length]!,
      pinned: index % 8 === 0,
      createdAt: utcDay(now, -(index % 180), 11),
      updatedAt: utcDay(now, -(index % 180), 11),
    };
  });
  const activities = deals.flatMap((item, index) => {
    const rows: Array<typeof activity.$inferInsert> = [
      {
        id: deterministicDemoId(
          context.runId,
          "deal-activity-created",
          index,
        ),
        organizationId: context.organizationId,
        locationId: context.locationId,
        userId: context.actorUserId,
        type: "DEAL",
        action: "CREATED",
        entityType: "deal",
        entityId: item.id,
        entityName: item.name,
        metadata: demoMetadata(context, { pipelineId: item.pipelineId }),
        createdAt: item.createdAt,
      },
    ];
    if (index % 2 === 0) {
      rows.push({
        id: deterministicDemoId(
          context.runId,
          "deal-activity-stage",
          index,
        ),
        organizationId: context.organizationId,
        locationId: context.locationId,
        userId: context.actorUserId,
        type: "DEAL",
        action: "STAGE_CHANGED",
        entityType: "deal",
        entityId: item.id,
        entityName: item.name,
        changes: { pipelineStageId: { to: item.pipelineStageId } },
        metadata: demoMetadata(context),
        createdAt: item.updatedAt,
      });
    }
    if (index % 3 === 0) {
      rows.push({
        id: deterministicDemoId(
          context.runId,
          "deal-activity-updated",
          index,
        ),
        organizationId: context.organizationId,
        locationId: context.locationId,
        userId: context.actorUserId,
        type: "DEAL",
        action: "UPDATED",
        entityType: "deal",
        entityId: item.id,
        entityName: item.name,
        metadata: demoMetadata(context, { field: "value" }),
        createdAt: item.updatedAt,
      });
    }
    return rows;
  });
  return { tasks, notes, activities };
}
