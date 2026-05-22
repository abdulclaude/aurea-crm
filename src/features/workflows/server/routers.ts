import { PAGINATION } from "@/config/constants";
import { NodeType, ActivityAction } from "@/db/enums";
import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  type SQL,
} from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { sendWorkflowExecution } from "@/inngest/utils";
import { db } from "@/db";
import {
  connection,
  node as workflowNode,
  workflows,
} from "@/db/schema";
import type { JsonObject, JsonValue } from "@/db/json";

import {
  createTRPCRouter,
  premiumProcedure,
  protectedProcedure,
} from "@/trpc/init";
import type { Node, Edge } from "@xyflow/react";
import { generateSlug } from "random-word-slugs";
import z from "zod";
import {
  removeGoogleCalendarWorkflowSubscriptions,
  syncGoogleCalendarWorkflowSubscriptions,
} from "@/features/google-calendar/server/subscriptions";
import { syncGmailWorkflowSubscriptions } from "@/features/gmail/server/subscriptions";
import { createNotification } from "@/lib/notifications";
import { logAnalytics } from "@/lib/analytics-logger";
import { studioStarterWorkflowTemplates } from "@/features/workflows/lib/studio-starter-templates";

const nodePreviewSelect = {
  id: true,
  type: true,
  position: true,
  createdAt: true,
};

const positionSchema = z.object({ x: z.number(), y: z.number() });
const jsonObjectSchema = z.record(z.string(), z.unknown());

const workflowScopeWhere = (ctx: {
  auth: { user: { id: string } };
  locationId?: string | null;
}): SQL<unknown> =>
  and(
    eq(workflows.userId, ctx.auth.user.id),
    ctx.locationId ? eq(workflows.locationId, ctx.locationId) : isNull(workflows.locationId),
  ) ?? eq(workflows.userId, ctx.auth.user.id);

const findWorkflowForCtx = async (
  ctx: {
    auth: { user: { id: string } };
    locationId?: string | null;
  },
  workflowId: string,
  extra?: SQL<unknown>,
) => {
  const workflow = await db.query.workflows.findFirst({
    where: and(
      eq(workflows.id, workflowId),
      workflowScopeWhere(ctx),
      extra,
    ),
  });
  if (!workflow) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Workflow not found" });
  }
  return workflow;
};

const parsePosition = (value: unknown): { x: number; y: number } => {
  const parsed = positionSchema.safeParse(value);
  return parsed.success ? parsed.data : { x: 0, y: 0 };
};

async function createWorkflowWithInitialNode({
  name,
  userId,
  organizationId,
  locationId,
  isBundle = false,
  isTemplate = false,
  description,
}: {
  name: string;
  userId: string;
  organizationId: string | null;
  locationId: string | null;
  isBundle?: boolean;
  isTemplate?: boolean;
  description?: string | null;
}) {
  return await db.transaction(async (tx) => {
    const [createdWorkflow] = await tx
      .insert(workflows)
      .values({
        id: crypto.randomUUID(),
        name,
        userId,
        organizationId,
        locationId,
        isBundle,
        isTemplate,
        description,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    await tx.insert(workflowNode).values({
      id: crypto.randomUUID(),
      workflowId: createdWorkflow.id,
      type: NodeType.INITIAL,
      position: { x: 0, y: 0 },
      name: NodeType.INITIAL,
      data: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return createdWorkflow;
  });
}

export const workflowsRouter = createTRPCRouter({
  execute: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const workflow = await findWorkflowForCtx(ctx, input.id);

      if (workflow.isTemplate) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Templates cannot be executed.",
        });
      }
      if (workflow.archived) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Archived workflows cannot be executed.",
        });
      }

      await sendWorkflowExecution({
        workflowId: input.id,
      });

      return workflow;
    }),
  create: premiumProcedure.mutation(async ({ ctx }) => {
    const workflow = await createWorkflowWithInitialNode({
      name: generateSlug(3),
      userId: ctx.auth.user.id,
      organizationId: ctx.orgId ?? null,
      locationId: ctx.locationId ?? null,
    });

    // Send notification
    await createNotification({
      type: "WORKFLOW_CREATED",
      title: "Workflow created",
      message: `${ctx.auth.user.name} created a new workflow: ${workflow.name}`,
      actorId: ctx.auth.user.id,
      entityType: "workflow",
      entityId: workflow.id,
      organizationId: ctx.orgId ?? undefined,
      locationId: ctx.locationId ?? undefined,
    });

    // Log analytics
    await logAnalytics({
      organizationId: ctx.orgId ?? "",
      locationId: ctx.locationId ?? null,
      userId: ctx.auth.user.id,
      action: ActivityAction.CREATED,
      entityType: "workflow",
      entityId: workflow.id,
      entityName: workflow.name,
      metadata: {
        isBundle: workflow.isBundle,
        isTemplate: workflow.isTemplate,
      },
      posthogProperties: {
        is_bundle: workflow.isBundle,
        is_template: workflow.isTemplate,
        has_initial_node: true,
      },
    });

    return workflow;
  }),
  createBundle: premiumProcedure.mutation(({ ctx }) => {
    return createWorkflowWithInitialNode({
      name: `${generateSlug(3)}-bundle`,
      userId: ctx.auth.user.id,
      organizationId: ctx.orgId ?? null,
      locationId: ctx.locationId ?? null,
      isBundle: true,
    });
  }),
  updateArchived: protectedProcedure
    .input(z.object({ id: z.string(), archived: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const scoped = await findWorkflowForCtx(ctx, input.id);
      const oldArchived = scoped.archived;
      const [workflow] = await db
        .update(workflows)
        .set({
          archived: input.archived,
          updatedAt: new Date(),
        })
        .where(eq(workflows.id, scoped.id))
        .returning();

      if (workflow.archived) {
        await removeGoogleCalendarWorkflowSubscriptions(workflow.id);
      } else {
        await syncGoogleCalendarWorkflowSubscriptions({
          workflowId: workflow.id,
          userId: ctx.auth.user.id,
        });
      }

      await syncGmailWorkflowSubscriptions({ userId: ctx.auth.user.id });

      await createNotification({
        type: input.archived ? "WORKFLOW_ARCHIVED" : "WORKFLOW_RESTORED",
        title: input.archived ? "Workflow archived" : "Workflow restored",
        message: `${ctx.auth.user.name} ${input.archived ? "archived" : "restored"} workflow ${workflow.name}`,
        actorId: ctx.auth.user.id,
        entityType: "workflow",
        entityId: workflow.id,
        organizationId: ctx.orgId ?? undefined,
        locationId: ctx.locationId ?? undefined,
      });

      // Log analytics
      await logAnalytics({
        organizationId: ctx.orgId ?? "",
        locationId: ctx.locationId ?? null,
        userId: ctx.auth.user.id,
        action: ActivityAction.UPDATED,
        entityType: "workflow",
        entityId: workflow.id,
        entityName: workflow.name,
        changes: { archived: { old: oldArchived, new: input.archived } },
        metadata: {
          archived: input.archived,
          fieldsChanged: ["archived"],
        },
        posthogProperties: {
          archived: input.archived,
          was_archived: oldArchived,
          fields_changed: ["archived"],
        },
      });

      return workflow;
    }),
  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const scoped = await findWorkflowForCtx(ctx, input.id);
      await removeGoogleCalendarWorkflowSubscriptions(input.id);
      const [workflow] = await db
        .delete(workflows)
        .where(eq(workflows.id, scoped.id))
        .returning();

      await syncGmailWorkflowSubscriptions({ userId: ctx.auth.user.id });

      // Send notification
      await createNotification({
        type: "WORKFLOW_DELETED",
        title: "Workflow deleted",
        message: `${ctx.auth.user.name} deleted workflow: ${workflow.name}`,
        actorId: ctx.auth.user.id,
        entityType: "workflow",
        entityId: workflow.id,
        organizationId: ctx.orgId ?? undefined,
        locationId: ctx.locationId ?? undefined,
      });

      // Log analytics
      await logAnalytics({
        organizationId: ctx.orgId ?? "",
        locationId: ctx.locationId ?? null,
        userId: ctx.auth.user.id,
        action: ActivityAction.DELETED,
        entityType: "workflow",
        entityId: workflow.id,
        entityName: workflow.name,
        metadata: {
          isBundle: workflow.isBundle,
          isTemplate: workflow.isTemplate,
        },
        posthogProperties: {
          is_bundle: workflow.isBundle,
          is_template: workflow.isTemplate,
        },
      });

      return workflow;
    }),
  updateName: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const oldWorkflow = await findWorkflowForCtx(ctx, input.id);
      const [workflow] = await db
        .update(workflows)
        .set({
          name: input.name,
          updatedAt: new Date(),
        })
        .where(eq(workflows.id, input.id))
        .returning();

      // Send notification
      await createNotification({
        type: "WORKFLOW_UPDATED",
        title: "Workflow updated",
        message: `${ctx.auth.user.name} renamed workflow to: ${workflow.name}`,
        actorId: ctx.auth.user.id,
        entityType: "workflow",
        entityId: workflow.id,
        organizationId: ctx.orgId ?? undefined,
        locationId: ctx.locationId ?? undefined,
      });

      // Log analytics
      await logAnalytics({
        organizationId: ctx.orgId ?? "",
        locationId: ctx.locationId ?? null,
        userId: ctx.auth.user.id,
        action: ActivityAction.UPDATED,
        entityType: "workflow",
        entityId: workflow.id,
        entityName: workflow.name,
        changes: { name: { old: oldWorkflow.name, new: input.name } },
        metadata: {
          fieldsChanged: ["name"],
          oldName: oldWorkflow.name,
        },
        posthogProperties: {
          fields_changed: ["name"],
          old_name: oldWorkflow.name,
          new_name: input.name,
        },
      });

      return workflow;
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        nodes: z.array(
          z.object({
            id: z.string(),
            type: z.string().nullish(),
            position: z.object({ x: z.number(), y: z.number() }),
            data: jsonObjectSchema.optional(),
          })
        ),
        edges: z.array(
          z.object({
            source: z.string(),
            target: z.string(),
            sourceHandle: z.string().nullish(),
            targetHandle: z.string().nullish(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, nodes, edges } = input;

      const workflow = await findWorkflowForCtx(ctx, id);

      // transaction to ensure consistency

      const result = await db.transaction(async (tx) => {
        // delete all existing nodes and connections (cascade deletes connections when node is deleted)

        await tx.delete(workflowNode).where(eq(workflowNode.workflowId, id));

        // create the new nodes

        if (nodes.length > 0) {
          await tx.insert(workflowNode).values(nodes.map((node) => ({
            id: node.id,
            workflowId: id,
            name: node.type || "unknown",
            type: node.type as NodeType,
            position: node.position,
            data: node.data || {},
            credentialId:
              typeof node.data?.credentialId === "string"
                ? (node.data.credentialId as string)
                : null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })));
        }

        // create connections

        if (edges.length > 0) {
          await tx.insert(connection).values(edges.map((edge) => ({
            id: crypto.randomUUID(),
            workflowId: id,
            fromNodeId: edge.source,
            toNodeId: edge.target,
            fromOutput: edge.sourceHandle || "main",
            toInput: edge.targetHandle || "main",
            createdAt: new Date(),
            updatedAt: new Date(),
          })));
        }

        // update workflows 'updatedAt' time stamp

        await tx
          .update(workflows)
          .set({
            updatedAt: new Date(),
          })
          .where(eq(workflows.id, id));

        return workflow;
      });

      if (workflow.isTemplate || workflow.archived) {
        await removeGoogleCalendarWorkflowSubscriptions(id);
      } else {
        await syncGoogleCalendarWorkflowSubscriptions({
          workflowId: id,
          userId: ctx.auth.user.id,
        });
      }

      await syncGmailWorkflowSubscriptions({ userId: ctx.auth.user.id });

      await createNotification({
        type: "WORKFLOW_UPDATED",
        title: "Workflow updated",
        message: `${ctx.auth.user.name} updated workflow ${workflow.name}`,
        actorId: ctx.auth.user.id,
        entityType: "workflow",
        entityId: workflow.id,
        organizationId: ctx.orgId ?? undefined,
        locationId: ctx.locationId ?? undefined,
      });

      return result;
    }),

  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const workflow = await db.query.workflows.findFirst({
        where: and(eq(workflows.id, input.id), workflowScopeWhere(ctx)),
        with: { nodes: true, connections: true },
      });

      if (!workflow) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workflow not found" });
      }

      // transform server nodes to react-flow compatible nodes

      const nodes: Node[] = workflow.nodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: parsePosition(node.position),
        data: jsonObjectSchema.catch({}).parse(node.data),
      }));

      // transform server connections to react-flow compatible edges
      // Map default "main" handles to actual node handle IDs
      const edges: Edge[] = workflow.connections.map((item) => ({
        id: item.id,
        source: item.fromNodeId,
        target: item.toNodeId,
        sourceHandle:
          item.fromOutput === "main" ? "source-1" : item.fromOutput,
        targetHandle:
          item.toInput === "main" ? "target-1" : item.toInput,
      }));

      return {
        id: workflow.id,
        name: workflow.name,
        archived: workflow.archived,
        isTemplate: workflow.isTemplate,
        isBundle: workflow.isBundle,
        nodes,
        edges,
      };
    }),
  getMany: protectedProcedure
    .input(
      z.object({
        page: z.number().default(PAGINATION.DEFAULT_PAGE),
        pageSize: z
          .number()
          .min(PAGINATION.MIN_PAGE_SIZE)
          .max(PAGINATION.MAX_PAGE_SIZE)
          .default(PAGINATION.DEFAULT_PAGE_SIZE),
        search: z.string().default(""),
        isBundle: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search, isBundle } = input;

      const where = and(
        workflowScopeWhere(ctx),
        ilike(workflows.name, `%${search}%`),
        isBundle !== undefined ? eq(workflows.isBundle, isBundle) : undefined,
      );

      const [items, totalCount] = await Promise.all([
        db.query.workflows.findMany({
          offset: (page - 1) * pageSize,
          limit: pageSize,
          where,
          with: {
            nodes: {
              columns: nodePreviewSelect,
            },
          },
          orderBy: [desc(workflows.updatedAt)],
        }),
        db.select({ count: count() }).from(workflows).where(where),
      ]);

      const total = totalCount[0]?.count ?? 0;
      const totalPages = Math.ceil(total / pageSize);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        items,
        page,
        pageSize,
        totalCount: total,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      };
    }),
  getArchived: protectedProcedure
    .input(
      z.object({
        page: z.number().default(PAGINATION.DEFAULT_PAGE),
        pageSize: z
          .number()
          .min(PAGINATION.MIN_PAGE_SIZE)
          .max(PAGINATION.MAX_PAGE_SIZE)
          .default(PAGINATION.DEFAULT_PAGE_SIZE),
        search: z.string().default(""),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search } = input;

      const where = and(
        workflowScopeWhere(ctx),
        eq(workflows.isTemplate, false),
        eq(workflows.archived, true),
        ilike(workflows.name, `%${search}%`),
      );

      const [items, totalCount] = await Promise.all([
        db.query.workflows.findMany({
          offset: (page - 1) * pageSize,
          limit: pageSize,
          where,
          with: {
            nodes: {
              columns: nodePreviewSelect,
            },
          },
          orderBy: [desc(workflows.updatedAt)],
        }),
        db.select({ count: count() }).from(workflows).where(where),
      ]);

      const total = totalCount[0]?.count ?? 0;
      const totalPages = Math.ceil(total / pageSize);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        items,
        page,
        pageSize,
        totalCount: total,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      };
    }),
  getTemplates: protectedProcedure
    .input(
      z.object({
        page: z.number().default(PAGINATION.DEFAULT_PAGE),
        pageSize: z
          .number()
          .min(PAGINATION.MIN_PAGE_SIZE)
          .max(PAGINATION.MAX_PAGE_SIZE)
          .default(PAGINATION.DEFAULT_PAGE_SIZE),
        search: z.string().default(""),
      })
    )
    .query(async ({ ctx, input }) => {
      const { search } = input;

      const items = await db.query.workflows.findMany({
        where: and(
          workflowScopeWhere(ctx),
          eq(workflows.isTemplate, true),
          ilike(workflows.name, `%${search}%`),
        ),
        with: {
          nodes: {
            columns: nodePreviewSelect,
          },
        },
        orderBy: [desc(workflows.updatedAt)],
      });

      const totalCount = items.length;

      return {
        items,
        page: 1,
        pageSize: totalCount || 1,
        totalCount,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      };
    }),
  updateTemplateMeta: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().max(2000).optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const template = await findWorkflowForCtx(
        ctx,
        input.id,
        eq(workflows.isTemplate, true),
      );
      const data: Partial<typeof workflows.$inferInsert> = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.description !== undefined) data.description = input.description;
      const [updatedTemplate] = await db
        .update(workflows)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(workflows.id, template.id))
        .returning();
      return updatedTemplate;
    }),
  createTemplateFromWorkflow: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const base = await db.query.workflows.findFirst({
        where: and(eq(workflows.id, input.id), workflowScopeWhere(ctx)),
        with: { nodes: true, connections: true },
      });

      if (!base) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workflow not found" });
      }

      return await db.transaction(async (tx) => {
        const [template] = await tx
          .insert(workflows)
          .values({
            id: crypto.randomUUID(),
            name: input.name ?? `${base.name} Template`,
            userId: ctx.auth.user.id,
            organizationId: ctx.orgId ?? null,
            isTemplate: true,
            locationId: ctx.locationId ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        const oldToNewNodeId = new Map<string, string>();

        // clone nodes
        for (const nodeItem of base.nodes) {
          const [created] = await tx
            .insert(workflowNode)
            .values({
              id: crypto.randomUUID(),
              workflowId: template.id,
              name: nodeItem.name,
              type: nodeItem.type,
              position: nodeItem.position,
              data: nodeItem.data,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning();
          oldToNewNodeId.set(nodeItem.id, created.id);
        }

        // clone connections
        for (const connectionItem of base.connections) {
          const fromNodeId = oldToNewNodeId.get(connectionItem.fromNodeId);
          const toNodeId = oldToNewNodeId.get(connectionItem.toNodeId);
          if (!fromNodeId || !toNodeId) {
            continue;
          }
          await tx.insert(connection).values({
              id: crypto.randomUUID(),
              workflowId: template.id,
              fromNodeId,
              toNodeId,
              fromOutput: connectionItem.fromOutput,
              toInput: connectionItem.toInput,
              createdAt: new Date(),
              updatedAt: new Date(),
          });
        }

        return template;
      });
    }),
  installStudioStarterTemplates: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.orgId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Organization context required to install workflow templates",
      });
    }

    const existingTemplates = await db.query.workflows.findMany({
      where: and(
        workflowScopeWhere(ctx),
        eq(workflows.isTemplate, true),
        inArray(
          workflows.name,
          studioStarterWorkflowTemplates.map((template) => template.name),
        ),
      ),
      columns: { name: true },
    });
    const existingNames = new Set(
      existingTemplates.map((template) => template.name),
    );
    const templatesToCreate = studioStarterWorkflowTemplates.filter(
      (template) => !existingNames.has(template.name),
    );

    const createdTemplates = await db.transaction(async (tx) => {
      const created: Array<{ id: string; name: string }> = [];

      for (const templateDefinition of templatesToCreate) {
        const [workflow] = await tx
          .insert(workflows)
          .values({
            id: crypto.randomUUID(),
            name: templateDefinition.name,
            description: templateDefinition.description,
            userId: ctx.auth.user.id,
            organizationId: ctx.orgId,
            locationId: ctx.locationId ?? null,
            isTemplate: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        const nodeIds = new Map<string, string>();

        for (const templateNode of templateDefinition.nodes) {
          const nodeId = crypto.randomUUID();
          nodeIds.set(templateNode.key, nodeId);

          await tx.insert(workflowNode).values({
              id: nodeId,
              workflowId: workflow.id,
              name: templateNode.type,
              type: templateNode.type,
              position: templateNode.position,
              data: templateNode.data,
              createdAt: new Date(),
              updatedAt: new Date(),
          });
        }

        for (const templateConnection of templateDefinition.connections) {
          const fromNodeId = nodeIds.get(templateConnection.from);
          const toNodeId = nodeIds.get(templateConnection.to);

          if (!fromNodeId || !toNodeId) {
            continue;
          }

          await tx.insert(connection).values({
              id: crypto.randomUUID(),
              workflowId: workflow.id,
              fromNodeId,
              toNodeId,
              fromOutput: templateConnection.fromOutput ?? "main",
              toInput: templateConnection.toInput ?? "main",
              createdAt: new Date(),
              updatedAt: new Date(),
          });
        }

        created.push({ id: workflow.id, name: workflow.name });
      }

      return created;
    });

    return {
      createdCount: createdTemplates.length,
      skippedCount: existingNames.size,
      templates: createdTemplates,
    };
  }),
  createWorkflowFromTemplate: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const base = await db.query.workflows.findFirst({
        where: and(eq(workflows.id, input.id), workflowScopeWhere(ctx)),
        with: { nodes: true, connections: true },
      });

      if (!base) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workflow not found" });
      }

      if (!base.isTemplate) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Selected item is not a template.",
        });
      }

      const workflow = await db.transaction(async (tx) => {
        const [workflow] = await tx
          .insert(workflows)
          .values({
            id: crypto.randomUUID(),
            name: input.name ?? generateSlug(3),
            userId: ctx.auth.user.id,
            organizationId: ctx.orgId ?? null,
            isTemplate: false,
            archived: false,
            locationId: ctx.locationId ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        const oldToNewNodeId = new Map<string, string>();

        // clone nodes
        for (const nodeItem of base.nodes) {
          const [created] = await tx
            .insert(workflowNode)
            .values({
              id: crypto.randomUUID(),
              workflowId: workflow.id,
              name: nodeItem.name,
              type: nodeItem.type,
              position: nodeItem.position,
              data: nodeItem.data,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning();
          oldToNewNodeId.set(nodeItem.id, created.id);
        }

        // clone connections
        for (const connectionItem of base.connections) {
          const fromNodeId = oldToNewNodeId.get(connectionItem.fromNodeId);
          const toNodeId = oldToNewNodeId.get(connectionItem.toNodeId);
          if (!fromNodeId || !toNodeId) {
            continue;
          }
          await tx.insert(connection).values({
              id: crypto.randomUUID(),
              workflowId: workflow.id,
              fromNodeId,
              toNodeId,
              fromOutput: connectionItem.fromOutput,
              toInput: connectionItem.toInput,
              createdAt: new Date(),
              updatedAt: new Date(),
          });
        }

        return workflow;
      });

      await syncGoogleCalendarWorkflowSubscriptions({
        workflowId: workflow.id,
        userId: ctx.auth.user.id,
      });

      return workflow;
    }),

  // Bundle Workflow Management
  listBundles: protectedProcedure.query(async ({ ctx }) => {
    return db.query.workflows.findMany({
      where: and(
        workflowScopeWhere(ctx),
        eq(workflows.isBundle, true),
        eq(workflows.archived, false),
      ),
      columns: {
        id: true,
        name: true,
        description: true,
        bundleInputs: true,
        bundleOutputs: true,
      },
      orderBy: [desc(workflows.updatedAt)],
    });
  }),

  getBundleById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const bundle = await db.query.workflows.findFirst({
        where: and(
          eq(workflows.id, input.id),
          workflowScopeWhere(ctx),
          eq(workflows.isBundle, true),
        ),
        columns: {
          id: true,
          name: true,
          description: true,
          bundleInputs: true,
          bundleOutputs: true,
        },
      });

      if (!bundle) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Bundle workflow not found" });
      }

      return bundle;
    }),

  getParentWorkflows: protectedProcedure
    .input(z.object({ bundleId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Find all workflows that contain a BUNDLE_WORKFLOW node pointing to this bundleId
      const parentCandidates = await db.query.workflows.findMany({
        where: and(
          workflowScopeWhere(ctx),
          eq(workflows.isBundle, false),
          eq(workflows.archived, false),
        ),
        with: {
          nodes: true,
          connections: true,
        },
      });

      // Filter workflows that have BUNDLE_WORKFLOW nodes referencing this bundle
      const parentWorkflows = parentCandidates
        .filter((wf) =>
          wf.nodes.some((nodeItem) => {
          if (nodeItem.type !== NodeType.BUNDLE_WORKFLOW) return false;
          const data = jsonObjectSchema.catch({}).parse(nodeItem.data);
          return data?.bundleWorkflowId === input.bundleId;
          }),
        )
        .map((wf) => ({
          ...wf,
          Node: wf.nodes,
          Connection: wf.connections,
        }));

      return parentWorkflows;
    }),

  updateBundleConfig: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        bundleInputs: z.array(
          z.object({
            name: z.string(),
            type: z.string(),
            description: z.string().optional(),
            defaultValue: z.unknown().optional(),
          })
        ),
        bundleOutputs: z.array(
          z.object({
            name: z.string(),
            variablePath: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const scoped = await findWorkflowForCtx(
        ctx,
        input.id,
        eq(workflows.isBundle, true),
      );

      const [updatedWorkflow] = await db
        .update(workflows)
        .set({
          bundleInputs: input.bundleInputs as JsonValue,
          bundleOutputs: input.bundleOutputs as JsonValue,
          updatedAt: new Date(),
        })
        .where(eq(workflows.id, scoped.id))
        .returning();
      return updatedWorkflow;
    }),

  toggleBundle: protectedProcedure
    .input(z.object({ id: z.string(), isBundle: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const scoped = await findWorkflowForCtx(ctx, input.id);

      const [updatedWorkflow] = await db
        .update(workflows)
        .set({
          isBundle: input.isBundle,
          updatedAt: new Date(),
        })
        .where(eq(workflows.id, scoped.id))
        .returning();
      return updatedWorkflow;
    }),
});
