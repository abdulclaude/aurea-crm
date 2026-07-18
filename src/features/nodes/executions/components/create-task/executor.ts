import { and, eq, inArray, isNull } from "drizzle-orm";
import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";

import { db } from "@/db";
import {
  client,
  locationMember,
  member,
  staffIdentity,
  task,
} from "@/db/schema";
import type { NodeExecutor } from "@/features/executions/types";
import { resolveRoleCapabilities } from "@/features/permissions/role-matrix";
import { isStaffIdentityAccessBlocked } from "@/features/staff-identities/lib/identity-policy";
import { createTaskChannel } from "@/inngest/channels/create-task";

import { createTaskFormSchema, type CreateTaskFormValues } from "./config";

const UNIT_MILLISECONDS = {
  MINUTES: 60_000,
  HOURS: 3_600_000,
  DAYS: 86_400_000,
} as const;

export const createTaskExecutor: NodeExecutor<CreateTaskFormValues> = async ({
  data,
  nodeId,
  userId,
  scope,
  context,
  step,
  publish,
}) => {
  await publish(createTaskChannel().status({ nodeId, status: "loading" }));

  try {
    const parsed = createTaskFormSchema.safeParse(data);
    if (!parsed.success) {
      throw new NonRetriableError(
        `Create task error: ${parsed.error.issues[0]?.message ?? "Invalid configuration."}`,
      );
    }

    const compile = (value: string) =>
      Handlebars.compile(value)(context).trim();
    const title = compile(parsed.data.title);
    if (!title) {
      throw new NonRetriableError(
        "Create task error: The compiled task title is empty.",
      );
    }

    const clientId = parsed.data.clientId?.trim()
      ? compile(parsed.data.clientId)
      : null;
    const assigneeId = parsed.data.assigneeId?.trim()
      ? compile(parsed.data.assigneeId)
      : null;

    const created = await step.run("create-workflow-task", async () => {
      return db.transaction(async (tx) => {
        const [actorOrganizationMembership] = await tx
          .select({
            role: member.role,
            staffIdentityId: member.staffIdentityId,
          })
          .from(member)
          .where(
            and(
              eq(member.userId, userId),
              eq(member.organizationId, scope.organizationId),
            ),
          )
          .limit(1)
          .for("update");
        const [actorLocationMembership] = scope.locationId
          ? await tx
              .select({
                role: locationMember.role,
                staffIdentityId: locationMember.staffIdentityId,
              })
              .from(locationMember)
              .where(
                and(
                  eq(locationMember.userId, userId),
                  eq(locationMember.locationId, scope.locationId),
                ),
              )
              .limit(1)
              .for("update")
          : [{ role: null, staffIdentityId: null }];
        const actorIdentityIds = [
          actorOrganizationMembership?.staffIdentityId,
          actorLocationMembership?.staffIdentityId,
        ].filter((id): id is string => Boolean(id));
        const actorIdentities = actorIdentityIds.length
          ? await tx
              .select({ status: staffIdentity.status })
              .from(staffIdentity)
              .where(inArray(staffIdentity.id, actorIdentityIds))
              .for("update")
          : [];
        const actorCapabilities = resolveRoleCapabilities({
          organizationRole: actorOrganizationMembership?.role ?? null,
          locationRole: actorLocationMembership?.role ?? null,
        });
        if (
          !actorOrganizationMembership ||
          (scope.locationId && !actorLocationMembership) ||
          isStaffIdentityAccessBlocked(
            actorIdentities.map(({ status }) => status),
          ) ||
          !actorCapabilities.includes("workflow.manage")
        ) {
          throw new NonRetriableError(
            "Create task error: The workflow owner is no longer authorised in this scope.",
          );
        }

        if (clientId) {
          const [scopedClient] = await tx
            .select({ id: client.id })
            .from(client)
            .where(
              and(
                eq(client.id, clientId),
                eq(client.organizationId, scope.organizationId),
                scope.locationId
                  ? eq(client.locationId, scope.locationId)
                  : isNull(client.locationId),
              ),
            )
            .limit(1)
            .for("update");
          if (!scopedClient) {
            throw new NonRetriableError(
              "Create task error: The selected client is outside this workflow scope.",
            );
          }
        }

        if (assigneeId) {
          const [organizationMembership] = await tx
            .select({ userId: member.userId })
            .from(member)
            .where(
              and(
                eq(member.userId, assigneeId),
                eq(member.organizationId, scope.organizationId),
              ),
            )
            .limit(1)
            .for("update");
          const [locationMembership] = scope.locationId
            ? await tx
                .select({ userId: locationMember.userId })
                .from(locationMember)
                .where(
                  and(
                    eq(locationMember.userId, assigneeId),
                    eq(locationMember.locationId, scope.locationId),
                  ),
                )
                .limit(1)
                .for("update")
            : [{ userId: assigneeId }];
          if (!organizationMembership || !locationMembership) {
            throw new NonRetriableError(
              "Create task error: The selected assignee is outside this workflow scope.",
            );
          }
        }

        const taskId = `workflow-task:${scope.executionId}:${nodeId}`;
        const now = new Date();
        const dueDate = new Date(
          now.getTime() +
            parsed.data.dueAmount * UNIT_MILLISECONDS[parsed.data.dueUnit],
        );
        const [inserted] = await tx
          .insert(task)
          .values({
            id: taskId,
            organizationId: scope.organizationId,
            locationId: scope.locationId,
            title,
            description: parsed.data.description?.trim()
              ? compile(parsed.data.description)
              : null,
            priority: parsed.data.priority,
            dueDate,
            clientId,
            createdById: userId,
            assigneeId,
            updatedAt: now,
          })
          .onConflictDoNothing({ target: task.id })
          .returning({ id: task.id, title: task.title, dueDate: task.dueDate });
        if (inserted) return inserted;

        const [existing] = await tx
          .select({ id: task.id, title: task.title, dueDate: task.dueDate })
          .from(task)
          .where(
            and(
              eq(task.id, taskId),
              eq(task.organizationId, scope.organizationId),
              scope.locationId
                ? eq(task.locationId, scope.locationId)
                : isNull(task.locationId),
            ),
          )
          .limit(1);
        if (!existing) {
          throw new NonRetriableError(
            "Create task error: The idempotent task could not be loaded.",
          );
        }
        return existing;
      });
    });

    await publish(createTaskChannel().status({ nodeId, status: "success" }));
    return {
      ...context,
      [parsed.data.variableName]: {
        id: created.id,
        title: created.title,
        dueDate: created.dueDate
          ? new Date(created.dueDate).toISOString()
          : null,
        clientId,
        assigneeId,
      },
    };
  } catch (error) {
    await publish(createTaskChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
