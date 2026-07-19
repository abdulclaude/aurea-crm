import { PAGINATION } from "@/config/constants";
import { NodeType, ActivityAction } from "@/db/enums";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { sendWorkflowExecution } from "@/inngest/utils";
import { db } from "@/db";
import {
  connection,
  classSeries,
  client,
  emailDomain,
  form,
  node as workflowNode,
  pricingOption,
  serviceType,
  studioClass,
  workflowFolder,
  workflows,
} from "@/db/schema";
import type { JsonObject, JsonValue } from "@/db/json";

import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import type { Node, Edge } from "@xyflow/react";
import { generateSlug } from "random-word-slugs";
import z from "zod";
import { createNotification } from "@/lib/notifications";
import { logAnalytics } from "@/lib/analytics-logger";
import { studioStarterWorkflowTemplates } from "@/features/workflows/lib/studio-starter-templates";
import { getWorkflowActivationIssues } from "@/features/workflows/lib/workflow-activation-policy";
import {
  parseWorkflowBehavior,
  workflowBehaviorConfigSchema,
} from "@/features/workflows/lib/workflow-behavior";
import {
  buildClassBookingWorkflowStarter,
  buildClassSeriesBookingWorkflowStarter,
  buildFormSubmissionWorkflowStarter,
  buildPricingPurchaseWorkflowStarter,
  buildServiceBookingWorkflowStarter,
} from "@/features/workflows/lib/studio-workflow-starter";
import { requireCapability } from "@/features/permissions/server/authorization";
import {
  requireWorkflowScope,
  workflowScopeWhere,
  type WorkflowScopeContext,
} from "./workflow-scope";
import {
  removeWorkflowCalendarSubscription,
  syncScopeProviderSubscriptions,
  syncWorkflowProviderSubscriptions,
} from "./provider-subscription-sync";
import { listWorkflowProviderAccountsProcedure } from "./workflow-provider-account-procedure";
import {
  assertWorkflowProviderBindingsCanBeSaved,
  getDraftNodeProviderAccountId,
} from "./workflow-provider-binding-persistence";
import { getScopedWorkflowReadinessIssues } from "./workflow-readiness-service";
import { getWorkflowProviderReadinessIssues } from "./workflow-provider-readiness";

const positionSchema = z.object({ x: z.number(), y: z.number() });
const jsonObjectSchema = z.record(z.string(), z.unknown());
const bundleInputsSchema = z.array(
  z.object({
    name: z.string(),
    type: z.string(),
    description: z.string().optional(),
    defaultValue: z.unknown().optional(),
  }),
);
const workflowListSortSchema = z.enum([
  "updatedAt.desc",
  "updatedAt.asc",
  "createdAt.desc",
  "createdAt.asc",
  "name.asc",
  "name.desc",
]);
const workflowStarterSchema = z.discriminatedUnion("event", [
  z.object({
    event: z.literal("CLASS_BOOKED"),
    serviceTypeId: z.string().trim().min(1),
  }),
  z.object({
    event: z.literal("CLASS_OCCURRENCE_BOOKED"),
    classId: z.string().trim().min(1),
  }),
  z.object({
    event: z.literal("CLASS_SERIES_BOOKED"),
    classSeriesId: z.string().trim().min(1),
  }),
  z.object({
    event: z.literal("PRICING_OPTION_PURCHASED"),
    pricingOptionId: z.string().trim().min(1),
  }),
  z.object({
    event: z.literal("FORM_SUBMITTED"),
    formId: z.string().trim().min(1),
  }),
]);

type WorkflowListSort = z.infer<typeof workflowListSortSchema>;

const getWorkflowListOrder = (sort: WorkflowListSort): SQL<unknown> => {
  switch (sort) {
    case "updatedAt.asc":
      return asc(workflows.updatedAt);
    case "createdAt.desc":
      return desc(workflows.createdAt);
    case "createdAt.asc":
      return asc(workflows.createdAt);
    case "name.asc":
      return asc(workflows.name);
    case "name.desc":
      return desc(workflows.name);
    case "updatedAt.desc":
    default:
      return desc(workflows.updatedAt);
  }
};

const getWorkflowListItems = async ({
  where,
  page,
  pageSize,
  sort,
}: {
  where: SQL<unknown>;
  page: number;
  pageSize: number;
  sort: WorkflowListSort;
}) => {
  const workflowRows = await db
    .select({
      id: workflows.id,
      name: workflows.name,
      createdAt: workflows.createdAt,
      updatedAt: workflows.updatedAt,
      userId: workflows.userId,
      archived: workflows.archived,
      isTemplate: workflows.isTemplate,
      description: workflows.description,
      locationId: workflows.locationId,
      bundleInputs: workflows.bundleInputs,
      bundleOutputs: workflows.bundleOutputs,
      isBundle: workflows.isBundle,
      organizationId: workflows.organizationId,
      folderId: workflows.folderId,
      folderName: workflowFolder.name,
      folderColor: workflowFolder.color,
    })
    .from(workflows)
    .leftJoin(workflowFolder, eq(workflows.folderId, workflowFolder.id))
    .where(where)
    .orderBy(getWorkflowListOrder(sort))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const nodeRows = workflowRows.length
    ? await db
        .select({
          id: workflowNode.id,
          workflowId: workflowNode.workflowId,
          type: workflowNode.type,
          position: workflowNode.position,
          createdAt: workflowNode.createdAt,
        })
        .from(workflowNode)
        .where(
          inArray(
            workflowNode.workflowId,
            workflowRows.map((workflow) => workflow.id),
          ),
        )
    : [];
  const nodesByWorkflow = new Map<string, typeof nodeRows>();
  for (const preview of nodeRows) {
    const previews = nodesByWorkflow.get(preview.workflowId) ?? [];
    previews.push(preview);
    nodesByWorkflow.set(preview.workflowId, previews);
  }

  return workflowRows.map((workflow) => ({
    ...workflow,
    behaviorConfig: { enrollment: "EVERY_EVENT" as const },
    nodes: nodesByWorkflow.get(workflow.id) ?? [],
  }));
};

const findWorkflowForCtx = async (
  ctx: WorkflowScopeContext,
  workflowId: string,
  extra?: SQL<unknown>,
) => {
  const workflow = await db.query.workflows.findFirst({
    where: and(eq(workflows.id, workflowId), workflowScopeWhere(ctx), extra),
  });
  if (!workflow) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Workflow not found" });
  }
  return workflow;
};

const requireWorkflowManagement = async (ctx: WorkflowScopeContext) => {
  const scope = requireWorkflowScope(ctx);
  await requireCapability({
    actor: {
      userId: scope.userId,
      organizationId: scope.organizationId,
      locationId: scope.locationId,
    },
    capability: "workflow.manage",
    resource: {
      organizationId: scope.organizationId,
      locationId: scope.locationId,
    },
  });
  return scope;
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
  folderId,
  initialNode,
}: {
  name: string;
  userId: string;
  organizationId: string;
  locationId: string | null;
  isBundle?: boolean;
  isTemplate?: boolean;
  description?: string | null;
  folderId?: string | null;
  initialNode?: {
    type: NodeType;
    name: string;
    data: JsonObject;
  };
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
        folderId,
        archived: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    await tx.insert(workflowNode).values({
      id: crypto.randomUUID(),
      workflowId: createdWorkflow.id,
      type: initialNode?.type ?? NodeType.INITIAL,
      position: { x: 0, y: 0 },
      name: initialNode?.name ?? NodeType.INITIAL,
      data: initialNode?.data ?? {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return createdWorkflow;
  });
}

const workflowFolderScopeWhere = (ctx: WorkflowScopeContext) => {
  const scope = requireWorkflowScope(ctx);
  return and(
    eq(workflowFolder.userId, scope.userId),
    eq(workflowFolder.organizationId, scope.organizationId),
    scope.locationId
      ? eq(workflowFolder.locationId, scope.locationId)
      : isNull(workflowFolder.locationId),
  );
};

const findWorkflowFolderForCtx = async (
  ctx: WorkflowScopeContext,
  folderId: string,
) => {
  const [folder] = await db
    .select()
    .from(workflowFolder)
    .where(and(eq(workflowFolder.id, folderId), workflowFolderScopeWhere(ctx)))
    .limit(1);
  if (!folder) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Workflow folder not found",
    });
  }
  return folder;
};

async function syncActiveWorkflowOrDeactivate(input: {
  ctx: WorkflowScopeContext;
  workflowId: string;
  actorUserId: string;
  organizationId: string;
  locationId: string | null;
}): Promise<void> {
  const providerScope = {
    actorUserId: input.actorUserId,
    organizationId: input.organizationId,
    locationId: input.locationId,
  };
  try {
    await syncWorkflowProviderSubscriptions({
      ...providerScope,
      workflowId: input.workflowId,
    });
  } catch {
    await db
      .update(workflows)
      .set({ archived: true, updatedAt: new Date() })
      .where(
        and(eq(workflows.id, input.workflowId), workflowScopeWhere(input.ctx)),
      );
    await removeWorkflowCalendarSubscription({
      ...providerScope,
      workflowId: input.workflowId,
    });
    await syncScopeProviderSubscriptions(providerScope);
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Provider subscriptions could not be created. The workflow was kept inactive.",
    });
  }
}

export const workflowsRouter = createTRPCRouter({
  conditionOptions: protectedProcedure.query(async ({ ctx }) => {
    const scope = await requireWorkflowManagement(ctx);
    const locationCondition = scope.locationId
      ? eq(client.locationId, scope.locationId)
      : isNull(client.locationId);
    const tagValue = sql<string>`unnest(coalesce(${client.tags}, ARRAY[]::text[]))`;
    const customFieldValue = sql<string>`jsonb_object_keys(coalesce(${client.metadata}, '{}'::jsonb))`;

    const [
      tagRows,
      customFieldRows,
      pricingRows,
      formRows,
      emailSenderRows,
    ] = await Promise.all([
      db
        .selectDistinct({ value: tagValue })
        .from(client)
        .where(
          and(
            eq(client.organizationId, scope.organizationId),
            locationCondition,
          ),
        )
        .orderBy(tagValue),
      db
        .selectDistinct({ value: customFieldValue })
        .from(client)
        .where(
          and(
            eq(client.organizationId, scope.organizationId),
            locationCondition,
          ),
        )
        .orderBy(customFieldValue),
      db
        .select({ id: pricingOption.id, name: pricingOption.name })
        .from(pricingOption)
        .where(
          and(
            eq(pricingOption.organizationId, scope.organizationId),
            scope.locationId
              ? eq(pricingOption.locationId, scope.locationId)
              : isNull(pricingOption.locationId),
          ),
        )
        .orderBy(asc(pricingOption.name)),
      db
        .select({ id: form.id, name: form.name })
        .from(form)
        .where(
          and(
            eq(form.organizationId, scope.organizationId),
            scope.locationId
              ? eq(form.locationId, scope.locationId)
              : isNull(form.locationId),
          ),
        )
        .orderBy(asc(form.name)),
      db
        .select({
          id: emailDomain.id,
          domain: emailDomain.domain,
          defaultFromEmail: emailDomain.defaultFromEmail,
          defaultFromName: emailDomain.defaultFromName,
        })
        .from(emailDomain)
        .where(
          and(
            eq(emailDomain.organizationId, scope.organizationId),
            eq(emailDomain.status, "VERIFIED"),
            isNotNull(emailDomain.providerAccountId),
            scope.locationId
              ? or(
                  eq(emailDomain.locationId, scope.locationId),
                  isNull(emailDomain.locationId),
                )
              : isNull(emailDomain.locationId),
          ),
        )
        .orderBy(asc(emailDomain.domain)),
    ]);

    return {
      tags: tagRows.map(({ value }) => value).filter(Boolean),
      customFields: customFieldRows
        .map(({ value }) => value)
        .filter((value) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value)),
      pricingOptions: pricingRows,
      forms: formRows,
      emailSenders: emailSenderRows.map((sender) => ({
        id: sender.id,
        label:
          sender.defaultFromEmail ??
          `${sender.defaultFromName ? `${sender.defaultFromName} - ` : ""}noreply@${sender.domain}`,
      })),
    };
  }),

  listProviderAccounts: listWorkflowProviderAccountsProcedure,
  getFolders: protectedProcedure.query(async ({ ctx }) => {
    const [folders, workflowCounts] = await Promise.all([
      db
        .select({
          id: workflowFolder.id,
          name: workflowFolder.name,
          description: workflowFolder.description,
          color: workflowFolder.color,
          icon: workflowFolder.icon,
          position: workflowFolder.position,
          createdAt: workflowFolder.createdAt,
          updatedAt: workflowFolder.updatedAt,
        })
        .from(workflowFolder)
        .where(workflowFolderScopeWhere(ctx))
        .orderBy(asc(workflowFolder.position), asc(workflowFolder.name)),
      db
        .select({
          folderId: workflows.folderId,
          workflowCount: count(),
          activeWorkflowCount:
            sql<number>`count(*) filter (where ${workflows.archived} = false and ${workflows.isTemplate} = false)`.mapWith(
              Number,
            ),
          archivedWorkflowCount:
            sql<number>`count(*) filter (where ${workflows.archived} = true and ${workflows.isTemplate} = false)`.mapWith(
              Number,
            ),
          templateWorkflowCount:
            sql<number>`count(*) filter (where ${workflows.isTemplate} = true)`.mapWith(
              Number,
            ),
        })
        .from(workflows)
        .where(workflowScopeWhere(ctx))
        .groupBy(workflows.folderId),
    ]);
    const countsByFolder = new Map(
      workflowCounts
        .filter((row) => row.folderId !== null)
        .map((row) => [row.folderId, row]),
    );
    const unfiledCount =
      workflowCounts.find((row) => row.folderId === null)
        ?.activeWorkflowCount ?? 0;

    return {
      folders: folders.map((folder) => ({
        ...folder,
        workflowCount: countsByFolder.get(folder.id)?.workflowCount ?? 0,
        activeWorkflowCount:
          countsByFolder.get(folder.id)?.activeWorkflowCount ?? 0,
        archivedWorkflowCount:
          countsByFolder.get(folder.id)?.archivedWorkflowCount ?? 0,
        templateWorkflowCount:
          countsByFolder.get(folder.id)?.templateWorkflowCount ?? 0,
      })),
      unfiledCount,
    };
  }),
  createFolder: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(80),
        description: z.string().trim().max(500).optional().nullable(),
        color: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .optional()
          .nullable(),
        icon: z.string().trim().max(64).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const scope = await requireWorkflowManagement(ctx);
      const [existing] = await db
        .select({ value: count() })
        .from(workflowFolder)
        .where(workflowFolderScopeWhere(ctx));
      const now = new Date();
      const [folder] = await db
        .insert(workflowFolder)
        .values({
          id: crypto.randomUUID(),
          name: input.name,
          description: input.description || null,
          color: input.color || null,
          icon: input.icon || null,
          position: existing?.value ?? 0,
          userId: scope.userId,
          organizationId: scope.organizationId,
          locationId: scope.locationId,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      return folder;
    }),
  updateFolder: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().trim().min(1).max(80).optional(),
        description: z.string().trim().max(500).optional().nullable(),
        color: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .optional()
          .nullable(),
        icon: z.string().trim().max(64).optional().nullable(),
        position: z.number().int().min(0).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireWorkflowManagement(ctx);
      const folder = await findWorkflowFolderForCtx(ctx, input.id);
      const [updated] = await db
        .update(workflowFolder)
        .set({
          name: input.name,
          description: input.description,
          color: input.color,
          icon: input.icon,
          position: input.position,
          updatedAt: new Date(),
        })
        .where(
          and(eq(workflowFolder.id, folder.id), workflowFolderScopeWhere(ctx)),
        )
        .returning();
      return updated;
    }),
  deleteFolder: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireWorkflowManagement(ctx);
      const folder = await findWorkflowFolderForCtx(ctx, input.id);
      const [deleted] = await db
        .delete(workflowFolder)
        .where(
          and(eq(workflowFolder.id, folder.id), workflowFolderScopeWhere(ctx)),
        )
        .returning();
      return deleted;
    }),
  moveToFolder: protectedProcedure
    .input(
      z.object({ workflowId: z.string(), folderId: z.string().nullable() }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireWorkflowManagement(ctx);
      const workflow = await findWorkflowForCtx(ctx, input.workflowId);
      if (input.folderId) await findWorkflowFolderForCtx(ctx, input.folderId);
      const [updated] = await db
        .update(workflows)
        .set({ folderId: input.folderId, updatedAt: new Date() })
        .where(and(eq(workflows.id, workflow.id), workflowScopeWhere(ctx)))
        .returning();
      return updated;
    }),
  execute: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const scope = await requireWorkflowManagement(ctx);
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

      const issues = await getScopedWorkflowReadinessIssues(ctx, input.id);
      if (issues.length > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: issues.join(" "),
        });
      }

      await sendWorkflowExecution({
        workflowId: input.id,
        expectedOrganizationId: scope.organizationId,
        expectedLocationId: scope.locationId,
      });

      return workflow;
    }),
  create: protectedProcedure
    .input(
      z
        .object({
          folderId: z.string().nullable().optional(),
          starter: workflowStarterSchema.optional(),
        })
        .optional(),
    )
    .mutation(async ({ ctx, input }) => {
      const scope = await requireWorkflowManagement(ctx);
      if (input?.folderId) {
        await findWorkflowFolderForCtx(ctx, input.folderId);
      }
      const starterService =
        input?.starter?.event === "CLASS_BOOKED"
          ? await db.query.serviceType.findFirst({
              where: and(
                eq(serviceType.id, input.starter.serviceTypeId),
                eq(serviceType.organizationId, scope.organizationId),
                scope.locationId
                  ? eq(serviceType.locationId, scope.locationId)
                  : isNull(serviceType.locationId),
              ),
              columns: { id: true, name: true },
            })
          : null;
      if (input?.starter?.event === "CLASS_BOOKED" && !starterService) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Service type not found",
        });
      }

      const starterClass =
        input?.starter?.event === "CLASS_OCCURRENCE_BOOKED"
          ? await db.query.studioClass.findFirst({
              where: and(
                eq(studioClass.id, input.starter.classId),
                eq(studioClass.organizationId, scope.organizationId),
                scope.locationId
                  ? eq(studioClass.locationId, scope.locationId)
                  : isNull(studioClass.locationId),
              ),
              columns: { id: true, name: true },
            })
          : null;
      if (
        input?.starter?.event === "CLASS_OCCURRENCE_BOOKED" &&
        !starterClass
      ) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Class not found",
        });
      }

      const starterClassSeries =
        input?.starter?.event === "CLASS_SERIES_BOOKED"
          ? await db.query.classSeries.findFirst({
              where: and(
                eq(classSeries.id, input.starter.classSeriesId),
                eq(classSeries.organizationId, scope.organizationId),
                scope.locationId
                  ? eq(classSeries.locationId, scope.locationId)
                  : isNull(classSeries.locationId),
              ),
              columns: { id: true, name: true },
            })
          : null;
      if (
        input?.starter?.event === "CLASS_SERIES_BOOKED" &&
        !starterClassSeries
      ) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Class series not found",
        });
      }

      const starterPricingOption =
        input?.starter?.event === "PRICING_OPTION_PURCHASED"
          ? await db.query.pricingOption.findFirst({
              where: and(
                eq(pricingOption.id, input.starter.pricingOptionId),
                eq(pricingOption.organizationId, scope.organizationId),
                scope.locationId
                  ? eq(pricingOption.locationId, scope.locationId)
                  : isNull(pricingOption.locationId),
              ),
              columns: { id: true, name: true },
            })
          : null;
      if (
        input?.starter?.event === "PRICING_OPTION_PURCHASED" &&
        !starterPricingOption
      ) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pricing option not found",
        });
      }

      const starterForm =
        input?.starter?.event === "FORM_SUBMITTED"
          ? await db.query.form.findFirst({
              where: and(
                eq(form.id, input.starter.formId),
                eq(form.organizationId, scope.organizationId),
                scope.locationId
                  ? eq(form.locationId, scope.locationId)
                  : isNull(form.locationId),
              ),
              columns: { id: true, name: true },
            })
          : null;
      if (input?.starter?.event === "FORM_SUBMITTED" && !starterForm) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Form not found",
        });
      }

      const starter = starterService
        ? buildServiceBookingWorkflowStarter(starterService)
        : starterClass
          ? buildClassBookingWorkflowStarter(starterClass)
          : starterClassSeries
            ? buildClassSeriesBookingWorkflowStarter(starterClassSeries)
            : starterPricingOption
              ? buildPricingPurchaseWorkflowStarter(starterPricingOption)
              : starterForm
                ? buildFormSubmissionWorkflowStarter(starterForm)
                : null;
      const workflow = await createWorkflowWithInitialNode({
        name: starter?.name ?? generateSlug(3),
        userId: scope.userId,
        organizationId: scope.organizationId,
        locationId: scope.locationId,
        folderId: input?.folderId ?? null,
        initialNode: starter?.initialNode,
      });

      // Send notification
      await createNotification({
        type: "WORKFLOW_CREATED",
        title: "Workflow created",
        message: `${ctx.auth.user.name} created a new workflow: ${workflow.name}`,
        actorId: ctx.auth.user.id,
        entityType: "workflow",
        entityId: workflow.id,
        organizationId: scope.organizationId,
        locationId: scope.locationId ?? undefined,
      });

      // Log analytics
      await logAnalytics({
        organizationId: scope.organizationId,
        locationId: scope.locationId,
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
          starter_event: input?.starter?.event ?? null,
        },
      });

      return workflow;
    }),
  createBundle: protectedProcedure.mutation(async ({ ctx }) => {
    const scope = await requireWorkflowManagement(ctx);
    return createWorkflowWithInitialNode({
      name: `${generateSlug(3)}-bundle`,
      userId: scope.userId,
      organizationId: scope.organizationId,
      locationId: scope.locationId,
      isBundle: true,
    });
  }),
  updateArchived: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        archived: z.boolean(),
        confirmedReviewed: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const scope = await requireWorkflowManagement(ctx);
      const scoped = await findWorkflowForCtx(ctx, input.id);
      if (!input.archived) {
        if (scoped.isTemplate) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Templates cannot be activated.",
          });
        }
        if (!input.confirmedReviewed) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Review and confirm this workflow before activation.",
          });
        }

        const issues = await getScopedWorkflowReadinessIssues(ctx, scoped.id);
        if (issues.length > 0) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: issues.join(" "),
          });
        }
      }
      const oldArchived = scoped.archived;
      const [workflow] = await db
        .update(workflows)
        .set({
          archived: input.archived,
          updatedAt: new Date(),
        })
        .where(and(eq(workflows.id, scoped.id), workflowScopeWhere(ctx)))
        .returning();

      const providerScope = {
        actorUserId: scope.userId,
        organizationId: scope.organizationId,
        locationId: scope.locationId,
      };
      if (workflow.archived) {
        await removeWorkflowCalendarSubscription({
          ...providerScope,
          workflowId: workflow.id,
        });
        await syncScopeProviderSubscriptions(providerScope);
      } else {
        await syncActiveWorkflowOrDeactivate({
          ctx,
          actorUserId: providerScope.actorUserId,
          organizationId: providerScope.organizationId,
          locationId: providerScope.locationId,
          workflowId: workflow.id,
        });
      }

      await createNotification({
        type: input.archived ? "WORKFLOW_ARCHIVED" : "WORKFLOW_RESTORED",
        title: input.archived ? "Workflow archived" : "Workflow restored",
        message: `${ctx.auth.user.name} ${input.archived ? "archived" : "restored"} workflow ${workflow.name}`,
        actorId: ctx.auth.user.id,
        entityType: "workflow",
        entityId: workflow.id,
        organizationId: scope.organizationId,
        locationId: scope.locationId ?? undefined,
      });

      // Log analytics
      await logAnalytics({
        organizationId: scope.organizationId,
        locationId: scope.locationId,
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
      const scope = await requireWorkflowManagement(ctx);
      const scoped = await findWorkflowForCtx(ctx, input.id);
      const providerScope = {
        actorUserId: scope.userId,
        organizationId: scope.organizationId,
        locationId: scope.locationId,
      };
      await removeWorkflowCalendarSubscription({
        ...providerScope,
        workflowId: input.id,
      });
      const [workflow] = await db
        .delete(workflows)
        .where(and(eq(workflows.id, scoped.id), workflowScopeWhere(ctx)))
        .returning();

      await syncScopeProviderSubscriptions(providerScope);

      // Send notification
      await createNotification({
        type: "WORKFLOW_DELETED",
        title: "Workflow deleted",
        message: `${ctx.auth.user.name} deleted workflow: ${workflow.name}`,
        actorId: ctx.auth.user.id,
        entityType: "workflow",
        entityId: workflow.id,
        organizationId: scope.organizationId,
        locationId: scope.locationId ?? undefined,
      });

      // Log analytics
      await logAnalytics({
        organizationId: scope.organizationId,
        locationId: scope.locationId,
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
      const scope = await requireWorkflowManagement(ctx);
      const oldWorkflow = await findWorkflowForCtx(ctx, input.id);
      const [workflow] = await db
        .update(workflows)
        .set({
          name: input.name,
          updatedAt: new Date(),
        })
        .where(and(eq(workflows.id, input.id), workflowScopeWhere(ctx)))
        .returning();

      // Send notification
      await createNotification({
        type: "WORKFLOW_UPDATED",
        title: "Workflow updated",
        message: `${ctx.auth.user.name} renamed workflow to: ${workflow.name}`,
        actorId: ctx.auth.user.id,
        entityType: "workflow",
        entityId: workflow.id,
        organizationId: scope.organizationId,
        locationId: scope.locationId ?? undefined,
      });

      // Log analytics
      await logAnalytics({
        organizationId: scope.organizationId,
        locationId: scope.locationId,
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
  updateBehavior: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        behavior: workflowBehaviorConfigSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireWorkflowManagement(ctx);
      await findWorkflowForCtx(ctx, input.id);
      const [workflow] = await db
        .update(workflows)
        .set({ behaviorConfig: input.behavior, updatedAt: new Date() })
        .where(and(eq(workflows.id, input.id), workflowScopeWhere(ctx)))
        .returning({
          id: workflows.id,
          behaviorConfig: workflows.behaviorConfig,
        });
      if (!workflow) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "The workflow changed before its behavior could be saved.",
        });
      }
      return {
        id: workflow.id,
        behavior: parseWorkflowBehavior(workflow.behaviorConfig),
      };
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
          }),
        ),
        edges: z.array(
          z.object({
            source: z.string(),
            target: z.string(),
            sourceHandle: z.string().nullish(),
            targetHandle: z.string().nullish(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, nodes, edges } = input;
      const scope = await requireWorkflowManagement(ctx);

      const workflow = await findWorkflowForCtx(ctx, id);

      await assertWorkflowProviderBindingsCanBeSaved({
        nodes,
        organizationId: scope.organizationId,
        locationId: scope.locationId,
      });

      if (!workflow.archived && !workflow.isTemplate) {
        const candidateNodes = nodes.map((node) => ({
          id: node.id,
          type: node.type as NodeType,
          data: node.data ?? {},
          credentialId:
            typeof node.data?.credentialId === "string"
              ? node.data.credentialId
              : null,
          providerAccountId: getDraftNodeProviderAccountId({
            type: node.type,
            data: node.data ?? {},
          }),
        }));
        const issues = [
          ...getWorkflowActivationIssues({
            isBundle: workflow.isBundle,
            nodes: candidateNodes,
            connections: edges.map((edge) => ({
              fromNodeId: edge.source,
              toNodeId: edge.target,
            })),
          }),
          ...(await getWorkflowProviderReadinessIssues({
            nodes: candidateNodes,
            organizationId: scope.organizationId,
            locationId: scope.locationId,
          })),
        ];
        if (issues.length > 0) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: issues.join(" "),
          });
        }
      }

      // transaction to ensure consistency

      const result = await db.transaction(async (tx) => {
        // delete all existing nodes and connections (cascade deletes connections when node is deleted)

        await tx.delete(workflowNode).where(eq(workflowNode.workflowId, id));

        // create the new nodes

        if (nodes.length > 0) {
          await tx.insert(workflowNode).values(
            nodes.map((node) => ({
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
              providerAccountId: getDraftNodeProviderAccountId({
                type: node.type,
                data: node.data ?? {},
              }),
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
          );
        }

        // create connections

        if (edges.length > 0) {
          await tx.insert(connection).values(
            edges.map((edge) => ({
              id: crypto.randomUUID(),
              workflowId: id,
              fromNodeId: edge.source,
              toNodeId: edge.target,
              fromOutput: edge.sourceHandle || "main",
              toInput: edge.targetHandle || "main",
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
          );
        }

        // update workflows 'updatedAt' time stamp

        const [updatedWorkflow] = await tx
          .update(workflows)
          .set({
            updatedAt: new Date(),
          })
          .where(and(eq(workflows.id, id), workflowScopeWhere(ctx)))
          .returning();

        if (!updatedWorkflow) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workflow not found",
          });
        }

        return updatedWorkflow;
      });

      const providerScope = {
        actorUserId: scope.userId,
        organizationId: scope.organizationId,
        locationId: scope.locationId,
      };
      if (workflow.isTemplate || workflow.archived) {
        await removeWorkflowCalendarSubscription({
          ...providerScope,
          workflowId: id,
        });
        await syncScopeProviderSubscriptions(providerScope);
      } else {
        await syncActiveWorkflowOrDeactivate({
          ctx,
          actorUserId: providerScope.actorUserId,
          organizationId: providerScope.organizationId,
          locationId: providerScope.locationId,
          workflowId: id,
        });
      }

      await createNotification({
        type: "WORKFLOW_UPDATED",
        title: "Workflow updated",
        message: `${ctx.auth.user.name} updated workflow ${workflow.name}`,
        actorId: ctx.auth.user.id,
        entityType: "workflow",
        entityId: workflow.id,
        organizationId: scope.organizationId,
        locationId: scope.locationId ?? undefined,
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workflow not found",
        });
      }

      // transform server nodes to react-flow compatible nodes

      const nodes: Node[] = workflow.nodes.map((node) => {
        const data = jsonObjectSchema.catch({}).parse(node.data);
        if (node.providerAccountId) {
          data.providerAccountId = node.providerAccountId;
        } else {
          delete data.providerAccountId;
        }
        return {
          id: node.id,
          type: node.type,
          position: parsePosition(node.position),
          data,
        };
      });

      // transform server connections to react-flow compatible edges
      // Map default "main" handles to actual node handle IDs
      const edges: Edge[] = workflow.connections.map((item) => ({
        id: item.id,
        source: item.fromNodeId,
        target: item.toNodeId,
        sourceHandle: item.fromOutput === "main" ? "source-1" : item.fromOutput,
        targetHandle: item.toInput === "main" ? "target-1" : item.toInput,
      }));
      const bundleInputs = bundleInputsSchema.safeParse(workflow.bundleInputs);

      return {
        id: workflow.id,
        name: workflow.name,
        archived: workflow.archived,
        isTemplate: workflow.isTemplate,
        isBundle: workflow.isBundle,
        bundleInputs: bundleInputs.success ? bundleInputs.data : undefined,
        behavior: parseWorkflowBehavior(workflow.behaviorConfig),
        updatedAt: workflow.updatedAt,
        nodes,
        edges,
      };
    }),
  getMany: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
        pageSize: z
          .number()
          .int()
          .min(PAGINATION.MIN_PAGE_SIZE)
          .max(PAGINATION.MAX_PAGE_SIZE)
          .default(PAGINATION.DEFAULT_PAGE_SIZE),
        search: z.string().default(""),
        isBundle: z.boolean().optional(),
        folderId: z.string().optional(),
        sort: workflowListSortSchema.default("updatedAt.desc"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search, isBundle, folderId, sort } = input;

      const where = and(
        workflowScopeWhere(ctx),
        eq(workflows.archived, false),
        eq(workflows.isTemplate, false),
        ilike(workflows.name, `%${search}%`),
        isBundle !== undefined ? eq(workflows.isBundle, isBundle) : undefined,
        folderId === "unfiled"
          ? isNull(workflows.folderId)
          : folderId && folderId !== "all"
            ? eq(workflows.folderId, folderId)
            : undefined,
      );
      if (!where) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to build workflow list filter.",
        });
      }

      const [items, totalCount] = await Promise.all([
        getWorkflowListItems({ where, page, pageSize, sort }),
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
        page: z.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
        pageSize: z
          .number()
          .int()
          .min(PAGINATION.MIN_PAGE_SIZE)
          .max(PAGINATION.MAX_PAGE_SIZE)
          .default(PAGINATION.DEFAULT_PAGE_SIZE),
        search: z.string().default(""),
        isBundle: z.boolean().optional(),
        folderId: z.string().optional(),
        sort: workflowListSortSchema.default("updatedAt.desc"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search, isBundle, folderId, sort } = input;

      const where = and(
        workflowScopeWhere(ctx),
        eq(workflows.isTemplate, false),
        eq(workflows.archived, true),
        ilike(workflows.name, `%${search}%`),
        isBundle !== undefined ? eq(workflows.isBundle, isBundle) : undefined,
        folderId === "unfiled"
          ? isNull(workflows.folderId)
          : folderId && folderId !== "all"
            ? eq(workflows.folderId, folderId)
            : undefined,
      );
      if (!where) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to build archived workflow filter.",
        });
      }

      const [items, totalCount] = await Promise.all([
        getWorkflowListItems({ where, page, pageSize, sort }),
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
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search } = input;
      const where = and(
        workflowScopeWhere(ctx),
        eq(workflows.isTemplate, true),
        ilike(workflows.name, `%${search}%`),
      );
      if (!where) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to build workflow template filter.",
        });
      }
      const [items, totalRows] = await Promise.all([
        getWorkflowListItems({
          where,
          page,
          pageSize,
          sort: "updatedAt.desc",
        }),
        db.select({ count: count() }).from(workflows).where(where),
      ]);
      const totalCount = totalRows[0]?.count ?? 0;
      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        items,
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    }),
  updateTemplateMeta: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().max(2000).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireWorkflowManagement(ctx);
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
        .where(and(eq(workflows.id, template.id), workflowScopeWhere(ctx)))
        .returning();
      return updatedTemplate;
    }),
  createTemplateFromWorkflow: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const scope = await requireWorkflowManagement(ctx);
      const base = await db.query.workflows.findFirst({
        where: and(eq(workflows.id, input.id), workflowScopeWhere(ctx)),
        with: { nodes: true, connections: true },
      });

      if (!base) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workflow not found",
        });
      }

      return await db.transaction(async (tx) => {
        const [template] = await tx
          .insert(workflows)
          .values({
            id: crypto.randomUUID(),
            name: input.name ?? `${base.name} Template`,
            userId: scope.userId,
            organizationId: scope.organizationId,
            isTemplate: true,
            archived: true,
            locationId: scope.locationId,
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
              credentialId: nodeItem.credentialId,
              providerAccountId: nodeItem.providerAccountId,
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
  installStudioStarterTemplates: protectedProcedure.mutation(
    async ({ ctx }) => {
      const scope = await requireWorkflowManagement(ctx);
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
              userId: scope.userId,
              organizationId: scope.organizationId,
              locationId: scope.locationId,
              isTemplate: true,
              archived: true,
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
    },
  ),
  createWorkflowFromTemplate: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const scope = await requireWorkflowManagement(ctx);
      const base = await db.query.workflows.findFirst({
        where: and(eq(workflows.id, input.id), workflowScopeWhere(ctx)),
        with: { nodes: true, connections: true },
      });

      if (!base) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workflow not found",
        });
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
            userId: scope.userId,
            organizationId: scope.organizationId,
            isTemplate: false,
            archived: true,
            locationId: scope.locationId,
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
              credentialId: nodeItem.credentialId,
              providerAccountId: nodeItem.providerAccountId,
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bundle workflow not found",
        });
      }

      return bundle;
    }),

  getParentWorkflows: protectedProcedure
    .input(z.object({ bundleId: z.string() }))
    .query(async ({ ctx, input }) => {
      await findWorkflowForCtx(
        ctx,
        input.bundleId,
        eq(workflows.isBundle, true),
      );

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
        bundleInputs: bundleInputsSchema,
        bundleOutputs: z.array(
          z.object({
            name: z.string(),
            variablePath: z.string(),
          }),
        ),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await requireWorkflowManagement(ctx);
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
        .where(and(eq(workflows.id, scoped.id), workflowScopeWhere(ctx)))
        .returning();
      return updatedWorkflow;
    }),

  toggleBundle: protectedProcedure
    .input(z.object({ id: z.string(), isBundle: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      await requireWorkflowManagement(ctx);
      const scoped = await findWorkflowForCtx(ctx, input.id);

      const [updatedWorkflow] = await db
        .update(workflows)
        .set({
          isBundle: input.isBundle,
          updatedAt: new Date(),
        })
        .where(and(eq(workflows.id, scoped.id), workflowScopeWhere(ctx)))
        .returning();
      return updatedWorkflow;
    }),
});
