import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, ilike, inArray, lt, or, sql, type SQL } from "drizzle-orm";
import z from "zod";

import { db } from "@/db";
import {
  client,
  deal,
  locationMember,
  member,
  notification,
  task as taskTable,
  user,
} from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

const TASKS_PAGE_SIZE = 50;
const TASK_STATUS_VALUES = ["TODO", "IN_PROGRESS", "DONE", "CANCELLED"] as const;
const TASK_PRIORITY_VALUES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const taskStatusSchema = z.enum(TASK_STATUS_VALUES);
const taskPrioritySchema = z.enum(TASK_PRIORITY_VALUES);

type TaskWithRelations = NonNullable<
  Awaited<ReturnType<typeof getTaskById>>
>;

const taskWithRelations = {
  client: {
    columns: {
      id: true,
      name: true,
      email: true,
      logo: true,
    },
  },
  deal: {
    columns: {
      id: true,
      name: true,
      value: true,
      currency: true,
    },
  },
  user_createdById: {
    columns: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  },
  user_assigneeId: {
    columns: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  },
} as const;

function requireOrganization(orgId: string | null): string {
  if (!orgId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Organization context required.",
    });
  }
  return orgId;
}

function taskScope(orgId: string, locationId: string | null): SQL[] {
  return [
    eq(taskTable.organizationId, orgId),
    ...(locationId ? [eq(taskTable.locationId, locationId)] : []),
  ];
}

async function getTaskById(id: string, orgId: string, locationId: string | null) {
  return db.query.task.findFirst({
    where: and(eq(taskTable.id, id), ...taskScope(orgId, locationId)),
    with: taskWithRelations,
  });
}

const mapTask = (task: TaskWithRelations) => ({
  id: task.id,
  title: task.title,
  description: task.description,
  status: task.status,
  priority: task.priority,
  dueDate: task.dueDate,
  completedAt: task.completedAt,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
  client: task.client,
  deal: task.deal,
  createdBy: task.user_createdById,
  assignee: task.user_assigneeId,
});

async function assertClientExists(clientId: string, orgId: string, locationId: string | null): Promise<void> {
  const existing = await db.query.client.findFirst({
    where: and(
      eq(client.id, clientId),
      eq(client.organizationId, orgId),
      locationId ? eq(client.locationId, locationId) : undefined
    ),
    columns: { id: true },
  });
  if (!existing) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Client not found." });
  }
}

async function assertDealExists(dealId: string, orgId: string, locationId: string | null): Promise<void> {
  const existing = await db.query.deal.findFirst({
    where: and(
      eq(deal.id, dealId),
      eq(deal.organizationId, orgId),
      locationId ? eq(deal.locationId, locationId) : undefined
    ),
    columns: { id: true },
  });
  if (!existing) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found." });
  }
}

async function assertUserExists(userId: string): Promise<void> {
  const existing = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { id: true },
  });
  if (!existing) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Assignee not found." });
  }
}

async function notifyAssignee(params: {
  assigneeId: string;
  actorId: string;
  actorName: string;
  organizationId: string;
  locationId: string | null;
  taskId: string;
  title: string;
}): Promise<void> {
  await db.insert(notification).values({
    id: randomUUID(),
    userId: params.assigneeId,
    organizationId: params.organizationId,
    locationId: params.locationId,
    type: "TASK_ASSIGNED",
    title: "Task assigned to you",
    message: `${params.actorName} assigned you a task: "${params.title}"`,
    data: { taskId: params.taskId },
    entityType: "task",
    entityId: params.taskId,
    actorId: params.actorId,
  });
}

export const tasksRouter = createTRPCRouter({
  stats: protectedProcedure.query(async ({ ctx }) => {
    const orgId = requireOrganization(ctx.orgId);
    const scope = taskScope(orgId, ctx.locationId ?? null);

    const [todo, inProgress, done, cancelled, overdue] = await Promise.all([
      db.$count(taskTable, and(...scope, eq(taskTable.status, "TODO"))),
      db.$count(taskTable, and(...scope, eq(taskTable.status, "IN_PROGRESS"))),
      db.$count(taskTable, and(...scope, eq(taskTable.status, "DONE"))),
      db.$count(taskTable, and(...scope, eq(taskTable.status, "CANCELLED"))),
      db.$count(
        taskTable,
        and(
          ...scope,
          inArray(taskTable.status, ["TODO", "IN_PROGRESS"]),
          lt(taskTable.dueDate, new Date())
        )
      ),
    ]);

    return { todo, inProgress, done, cancelled, overdue };
  }),

  list: protectedProcedure
    .input(
      z
        .object({
          status: z.array(taskStatusSchema).optional(),
          priority: z.array(taskPrioritySchema).optional(),
          assigneeId: z.string().optional(),
          clientId: z.string().optional(),
          dealId: z.string().optional(),
          overdue: z.boolean().optional(),
          search: z.string().optional(),
          cursor: z.string().optional(),
          limit: z.number().min(1).max(100).default(TASKS_PAGE_SIZE),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const orgId = requireOrganization(ctx.orgId);
      const locationId = ctx.locationId ?? null;
      const limit = input?.limit ?? TASKS_PAGE_SIZE;
      const cursorTask = input?.cursor
        ? await db.query.task.findFirst({
            where: and(eq(taskTable.id, input.cursor), ...taskScope(orgId, locationId)),
            columns: { createdAt: true },
          })
        : null;

      const conditions: SQL[] = taskScope(orgId, locationId);
      if (input?.status?.length) conditions.push(inArray(taskTable.status, input.status));
      if (input?.priority?.length) conditions.push(inArray(taskTable.priority, input.priority));
      if (input?.assigneeId) conditions.push(eq(taskTable.assigneeId, input.assigneeId));
      if (input?.clientId) conditions.push(eq(taskTable.clientId, input.clientId));
      if (input?.dealId) conditions.push(eq(taskTable.dealId, input.dealId));
      if (input?.overdue) {
        conditions.push(inArray(taskTable.status, ["TODO", "IN_PROGRESS"]));
        conditions.push(lt(taskTable.dueDate, new Date()));
      }
      if (input?.search) {
        const term = `%${input.search}%`;
        const searchCondition = or(ilike(taskTable.title, term), ilike(taskTable.description, term));
        if (searchCondition) conditions.push(searchCondition);
      }
      if (cursorTask) conditions.push(lt(taskTable.createdAt, cursorTask.createdAt));

      const tasks = await db.query.task.findMany({
        where: and(...conditions),
        with: taskWithRelations,
        orderBy: [
          asc(taskTable.status),
          sql`CASE ${taskTable.priority} WHEN 'URGENT' THEN 4 WHEN 'HIGH' THEN 3 WHEN 'MEDIUM' THEN 2 ELSE 1 END DESC`,
          asc(taskTable.dueDate),
          desc(taskTable.createdAt),
        ],
        limit: limit + 1,
      });

      let nextCursor: string | undefined;
      if (tasks.length > limit) {
        const nextItem = tasks.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: tasks.map(mapTask),
        nextCursor,
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const orgId = requireOrganization(ctx.orgId);
      const task = await getTaskById(input.id, orgId, ctx.locationId ?? null);

      if (!task) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Task not found." });
      }

      return mapTask(task);
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, "Title is required"),
        description: z.string().optional(),
        status: taskStatusSchema.default("TODO"),
        priority: taskPrioritySchema.default("MEDIUM"),
        dueDate: z.date().optional().nullable(),
        clientId: z.string().optional().nullable(),
        dealId: z.string().optional().nullable(),
        assigneeId: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrganization(ctx.orgId);
      const locationId = ctx.locationId ?? null;

      if (input.clientId) await assertClientExists(input.clientId, orgId, locationId);
      if (input.dealId) await assertDealExists(input.dealId, orgId, locationId);
      if (input.assigneeId) await assertUserExists(input.assigneeId);

      const [created] = await db
        .insert(taskTable)
        .values({
          id: randomUUID(),
          title: input.title,
          description: input.description ?? null,
          status: input.status,
          priority: input.priority,
          dueDate: input.dueDate ?? null,
          clientId: input.clientId ?? null,
          dealId: input.dealId ?? null,
          assigneeId: input.assigneeId ?? null,
          createdById: ctx.auth.user.id,
          organizationId: orgId,
          locationId,
          updatedAt: new Date(),
        })
        .returning({ id: taskTable.id });

      const task = await getTaskById(created.id, orgId, locationId);
      if (!task) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to load created task." });
      }

      if (input.assigneeId && input.assigneeId !== ctx.auth.user.id) {
        await notifyAssignee({
          assigneeId: input.assigneeId,
          actorId: ctx.auth.user.id,
          actorName: ctx.auth.user.name,
          organizationId: orgId,
          locationId,
          taskId: task.id,
          title: input.title,
        });
      }

      return mapTask(task);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional().nullable(),
        status: taskStatusSchema.optional(),
        priority: taskPrioritySchema.optional(),
        dueDate: z.date().optional().nullable(),
        clientId: z.string().optional().nullable(),
        dealId: z.string().optional().nullable(),
        assigneeId: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrganization(ctx.orgId);
      const locationId = ctx.locationId ?? null;
      const existingTask = await db.query.task.findFirst({
        where: and(eq(taskTable.id, input.id), ...taskScope(orgId, locationId)),
      });

      if (!existingTask) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Task not found." });
      }

      if (input.clientId) await assertClientExists(input.clientId, orgId, locationId);
      if (input.dealId) await assertDealExists(input.dealId, orgId, locationId);
      if (input.assigneeId) await assertUserExists(input.assigneeId);

      const updateData: Partial<typeof taskTable.$inferInsert> = { updatedAt: new Date() };
      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.priority !== undefined) updateData.priority = input.priority;
      if (input.dueDate !== undefined) updateData.dueDate = input.dueDate;
      if (input.clientId !== undefined) updateData.clientId = input.clientId;
      if (input.dealId !== undefined) updateData.dealId = input.dealId;
      if (input.assigneeId !== undefined) updateData.assigneeId = input.assigneeId;

      if (input.status === "DONE" && existingTask.status !== "DONE") {
        updateData.completedAt = new Date();
      } else if (input.status && input.status !== "DONE") {
        updateData.completedAt = null;
      }

      await db.update(taskTable).set(updateData).where(eq(taskTable.id, input.id));

      const updatedTask = await getTaskById(input.id, orgId, locationId);
      if (!updatedTask) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to load updated task." });
      }

      if (
        input.assigneeId &&
        input.assigneeId !== existingTask.assigneeId &&
        input.assigneeId !== ctx.auth.user.id
      ) {
        await notifyAssignee({
          assigneeId: input.assigneeId,
          actorId: ctx.auth.user.id,
          actorName: ctx.auth.user.name,
          organizationId: orgId,
          locationId,
          taskId: updatedTask.id,
          title: updatedTask.title,
        });
      }

      return mapTask(updatedTask);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrganization(ctx.orgId);
      const task = await db.query.task.findFirst({
        where: and(eq(taskTable.id, input.id), ...taskScope(orgId, ctx.locationId ?? null)),
        columns: { id: true },
      });

      if (!task) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Task not found." });
      }

      await db.delete(taskTable).where(eq(taskTable.id, input.id));

      return { success: true };
    }),

  getAssignees: protectedProcedure.query(async ({ ctx }) => {
    const locationId = ctx.locationId;

    if (!locationId) {
      const orgId = ctx.orgId;
      if (!orgId) return [];

      const members = await db.query.member.findMany({
        where: eq(member.organizationId, orgId),
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });

      return members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        image: m.user.image,
      }));
    }

    const members = await db.query.locationMember.findMany({
      where: eq(locationMember.locationId, locationId),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      image: m.user.image,
    }));
  }),
});
