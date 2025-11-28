import { PAGINATION } from "@/config/constants";
import { NodeType } from "@prisma/client";
import { sendWorkflowExecution } from "@/inngest/utils";
import prisma from "@/lib/db";

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
import { Prisma } from "@prisma/client";

const nodePreviewSelect = {
  id: true,
  type: true,
  position: true,
  createdAt: true,
};

const workflowScopeWhere = (ctx: {
  auth: { user: { id: string } };
  subaccountId?: string | null;
}) => ({
  userId: ctx.auth.user.id,
  subaccountId: ctx.subaccountId ?? null,
});

const findWorkflowForCtx = (
  ctx: {
    auth: { user: { id: string } };
    subaccountId?: string | null;
  },
  workflowId: string,
  extra?: Prisma.WorkflowsWhereInput
) =>
  prisma.workflows.findFirstOrThrow({
    where: {
      id: workflowId,
      ...workflowScopeWhere(ctx),
      ...(extra ?? {}),
    },
  });

export const workflowsRouter = createTRPCRouter({
  execute: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const workflow = await findWorkflowForCtx(ctx, input.id);

      if (workflow.isTemplate) {
        throw new Error("Templates cannot be executed.");
      }
      if (workflow.archived) {
        throw new Error("Archived workflows cannot be executed.");
      }

      await sendWorkflowExecution({
        workflowId: input.id,
      });

      return workflow;
    }),
  create: premiumProcedure.mutation(async ({ ctx }) => {
    const workflow = await prisma.workflows.create({
      data: {
        name: generateSlug(3),
        userId: ctx.auth.user.id,
        subaccountId: ctx.subaccountId ?? null,
        nodes: {
          create: {
            type: NodeType.INITIAL,
            position: { x: 0, y: 0 },
            name: NodeType.INITIAL,
          },
        },
      },
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
      subaccountId: ctx.subaccountId ?? undefined,
    });

    return workflow;
  }),
  createBundle: premiumProcedure.mutation(({ ctx }) => {
    return prisma.workflows.create({
      data: {
        name: `${generateSlug(3)}-bundle`,
        userId: ctx.auth.user.id,
        subaccountId: ctx.subaccountId ?? null,
        isBundle: true,
        nodes: {
          create: {
            type: NodeType.INITIAL,
            position: { x: 0, y: 0 },
            name: NodeType.INITIAL,
          },
        },
      },
    });
  }),
  updateArchived: protectedProcedure
    .input(z.object({ id: z.string(), archived: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const scoped = await findWorkflowForCtx(ctx, input.id);
      const workflow = await prisma.workflows.update({
        where: {
          id: scoped.id,
        },
        data: {
          archived: input.archived,
        },
      });

      if (workflow.archived) {
        await removeGoogleCalendarWorkflowSubscriptions(workflow.id);
      } else {
        await syncGoogleCalendarWorkflowSubscriptions({
          workflowId: workflow.id,
          userId: ctx.auth.user.id,
        });
      }

      await syncGmailWorkflowSubscriptions({ userId: ctx.auth.user.id });

      return workflow;
    }),
  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const scoped = await findWorkflowForCtx(ctx, input.id);
      await removeGoogleCalendarWorkflowSubscriptions(input.id);
      const workflow = await prisma.workflows.delete({
        where: {
          id: scoped.id,
        },
      });

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
        subaccountId: ctx.subaccountId ?? undefined,
      });

      return workflow;
    }),
  updateName: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await findWorkflowForCtx(ctx, input.id);
      const workflow = await prisma.workflows.update({
        where: {
          id: input.id,
        },
        data: {
          name: input.name,
        },
      });

      // Send notification
      await createNotification({
        type: "WORKFLOW_UPDATED",
        title: "Workflow updated",
        message: `${ctx.auth.user.name} renamed workflow to: ${workflow.name}`,
        actorId: ctx.auth.user.id,
        entityType: "workflow",
        entityId: workflow.id,
        organizationId: ctx.orgId ?? undefined,
        subaccountId: ctx.subaccountId ?? undefined,
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
            data: z.record(z.string(), z.any()).optional(),
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

      const result = await prisma.$transaction(async (tx) => {
        // delete all existing nodes and connections (cascade deletes connections when node is deleted)

        await tx.node.deleteMany({
          where: {
            workflowId: id,
          },
        });

        // create the new nodes

        await tx.node.createMany({
          data: nodes.map((node) => ({
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
          })),
        });

        // create connections

        await tx.connection.createMany({
          data: edges.map((edge) => ({
            workflowId: id,
            fromNodeId: edge.source,
            toNodeId: edge.target,
            fromOutput: edge.sourceHandle || "main",
            toInput: edge.targetHandle || "main",
          })),
        });

        // update workflows 'updatedAt' time stamp

        await tx.workflows.update({
          where: {
            id,
          },
          data: {
            updatedAt: new Date(),
          },
        });

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

      return result;
    }),

  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const workflow = await prisma.workflows.findFirstOrThrow({
        where: {
          id: input.id,
          ...workflowScopeWhere(ctx),
        },
        include: { nodes: true, connections: true },
      });

      // transform server nodes to react-flow compatible nodes

      const nodes: Node[] = workflow.nodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position as { x: number; y: number },
        data: (node.data as Record<string, unknown>) || {},
      }));

      // transform server connections to react-flow compatible edges
      // Map default "main" handles to actual node handle IDs
      const edges: Edge[] = workflow.connections.map((connection) => ({
        id: connection.id,
        source: connection.fromNodeId,
        target: connection.toNodeId,
        sourceHandle:
          connection.fromOutput === "main" ? "source-1" : connection.fromOutput,
        targetHandle:
          connection.toInput === "main" ? "target-1" : connection.toInput,
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

      const ownerWhere = workflowScopeWhere(ctx);
      const where: Prisma.WorkflowsWhereInput = {
        ...ownerWhere,
        name: {
          contains: search,
          mode: "insensitive",
        },
        ...(isBundle !== undefined ? { isBundle } : {}),
      };

      const [items, totalCount] = await Promise.all([
        prisma.workflows.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where,
          include: {
            nodes: {
              select: nodePreviewSelect,
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
        }),
        prisma.workflows.count({ where }),
      ]);

      const totalPages = Math.ceil(totalCount / pageSize);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        items,
        page,
        pageSize,
        totalCount,
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

      const ownerWhere = workflowScopeWhere(ctx);

      const [items, totalCount] = await Promise.all([
        prisma.workflows.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where: {
            ...ownerWhere,
            isTemplate: false,
            archived: true,
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
          include: {
            nodes: {
              select: nodePreviewSelect,
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
        }),
        prisma.workflows.count({
          where: {
            ...ownerWhere,
            isTemplate: false,
            archived: true,
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        }),
      ]);

      const totalPages = Math.ceil(totalCount / pageSize);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        items,
        page,
        pageSize,
        totalCount,
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
      const ownerWhere = workflowScopeWhere(ctx);

      const items = await prisma.workflows.findMany({
        where: {
          ...ownerWhere,
          isTemplate: true,
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
        include: {
          nodes: {
            select: nodePreviewSelect,
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
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
      const template = await prisma.workflows.findFirstOrThrow({
        where: {
          id: input.id,
          ...workflowScopeWhere(ctx),
          isTemplate: true,
        },
      });
      const data: Record<string, unknown> = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.description !== undefined) data.description = input.description;
      return prisma.workflows.update({
        where: { id: template.id },
        data,
      });
    }),
  createTemplateFromWorkflow: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const base = await prisma.workflows.findFirstOrThrow({
        where: {
          id: input.id,
          ...workflowScopeWhere(ctx),
        },
        include: { nodes: true, connections: true },
      });

      return await prisma.$transaction(async (tx) => {
        const template = await tx.workflows.create({
          data: {
            name: input.name ?? `${base.name} Template`,
            userId: ctx.auth.user.id,
            isTemplate: true,
            subaccountId: ctx.subaccountId ?? null,
          },
        });

        const oldToNewNodeId = new Map<string, string>();

        // clone nodes
        for (const node of base.nodes) {
          const created = await tx.node.create({
            data: {
              workflowId: template.id,
              name: node.name,
              type: node.type,
              position: node.position as any,
              data: node.data as any,
            },
          });
          oldToNewNodeId.set(node.id, created.id);
        }

        // clone connections
        for (const connection of base.connections) {
          const fromNodeId = oldToNewNodeId.get(connection.fromNodeId);
          const toNodeId = oldToNewNodeId.get(connection.toNodeId);
          if (!fromNodeId || !toNodeId) {
            continue;
          }
          await tx.connection.create({
            data: {
              workflowId: template.id,
              fromNodeId,
              toNodeId,
              fromOutput: connection.fromOutput,
              toInput: connection.toInput,
            },
          });
        }

        return template;
      });
    }),
  createWorkflowFromTemplate: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const base = await prisma.workflows.findFirstOrThrow({
        where: {
          id: input.id,
          ...workflowScopeWhere(ctx),
        },
        include: { nodes: true, connections: true },
      });

      if (!base.isTemplate) {
        throw new Error("Selected item is not a template.");
      }

      const workflow = await prisma.$transaction(async (tx) => {
        const workflow = await tx.workflows.create({
          data: {
            name: input.name ?? generateSlug(3),
            userId: ctx.auth.user.id,
            isTemplate: false,
            archived: false,
            subaccountId: ctx.subaccountId ?? null,
          },
        });

        const oldToNewNodeId = new Map<string, string>();

        // clone nodes
        for (const node of base.nodes) {
          const created = await tx.node.create({
            data: {
              workflowId: workflow.id,
              name: node.name,
              type: node.type,
              position: node.position as any,
              data: node.data as any,
            },
          });
          oldToNewNodeId.set(node.id, created.id);
        }

        // clone connections
        for (const connection of base.connections) {
          const fromNodeId = oldToNewNodeId.get(connection.fromNodeId);
          const toNodeId = oldToNewNodeId.get(connection.toNodeId);
          if (!fromNodeId || !toNodeId) {
            continue;
          }
          await tx.connection.create({
            data: {
              workflowId: workflow.id,
              fromNodeId,
              toNodeId,
              fromOutput: connection.fromOutput,
              toInput: connection.toInput,
            },
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
    return prisma.workflows.findMany({
      where: {
        ...workflowScopeWhere(ctx),
        isBundle: true,
        archived: false,
      },
      select: {
        id: true,
        name: true,
        description: true,
        bundleInputs: true,
        bundleOutputs: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  }),

  getBundleById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const bundle = await prisma.workflows.findFirst({
        where: {
          id: input.id,
          ...workflowScopeWhere(ctx),
          isBundle: true,
        },
        select: {
          id: true,
          name: true,
          description: true,
          bundleInputs: true,
          bundleOutputs: true,
        },
      });

      if (!bundle) {
        throw new Error("Bundle workflow not found");
      }

      return bundle;
    }),

  getParentWorkflows: protectedProcedure
    .input(z.object({ bundleId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Find all workflows that contain a BUNDLE_WORKFLOW node pointing to this bundleId
      const workflows = await prisma.workflows.findMany({
        where: {
          ...workflowScopeWhere(ctx),
          isBundle: false,
          archived: false,
        },
        include: {
          nodes: {
            orderBy: { position: "asc" },
          },
          connections: true,
        },
      });

      // Filter workflows that have BUNDLE_WORKFLOW nodes referencing this bundle
      const parentWorkflows = workflows.filter((wf) =>
        wf.nodes.some((node) => {
          if (node.type !== NodeType.BUNDLE_WORKFLOW) return false;
          const data = node.data as Record<string, any>;
          return data?.bundleWorkflowId === input.bundleId;
        })
      );

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
      const scoped = await findWorkflowForCtx(ctx, input.id, {
        isBundle: true,
      });

      return prisma.workflows.update({
        where: { id: scoped.id },
        data: {
          bundleInputs: input.bundleInputs as any,
          bundleOutputs: input.bundleOutputs as any,
        },
      });
    }),

  toggleBundle: protectedProcedure
    .input(z.object({ id: z.string(), isBundle: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const scoped = await findWorkflowForCtx(ctx, input.id);

      return prisma.workflows.update({
        where: { id: scoped.id },
        data: {
          isBundle: input.isBundle,
        },
      });
    }),
});
