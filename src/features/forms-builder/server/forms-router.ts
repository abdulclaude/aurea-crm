/**
 * Forms Builder tRPC Router
 *
 * Handles form creation, steps, fields, submissions, and conditional logic
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { createTRPCRouter } from "@/trpc/init";
import {
  publicationManageProcedure,
  publicationViewProcedure,
} from "@/features/permissions/server/publication-procedures";
import { db } from "@/db";
import {
  client,
  form,
  formField,
  formStep,
  formSubmission,
  publicationTarget,
} from "@/db/schema";
import { FormStatus, FormFieldType } from "@/db/enums";
import {
  formScopeWhere,
  formSubmissionScopeWhere,
  requireScopedField,
  requireScopedStep,
} from "@/features/forms-builder/server/form-access";
import {
  deleteScopedFormSubmission,
  exportScopedFormSubmissions,
  listScopedFormSubmissions,
} from "@/features/forms-builder/server/form-submission-management";
import {
  formCrmResolutionConfigSchema,
  type FormCrmResolutionConfig,
} from "@/features/forms-builder/lib/form-crm-resolution";
import { remapFormCrmResolutionConfig } from "@/features/forms-builder/lib/form-duplicate";
import {
  formAutomationConfigSchema,
  remapFormAutomationConfig,
  type FormAutomationConfig,
} from "@/features/forms-builder/lib/form-automation-config";
import { formColorSchema } from "@/features/forms-builder/lib/form-theme";
import { formProgressDisplaySchema } from "@/features/forms-builder/lib/form-progress";
import { requestFormSubmittedWorkflowDispatch } from "@/features/workflows/server/form-submitted-trigger-service";
import {
  FORM_BLUEPRINTS,
  formBlueprintIdSchema,
} from "@/features/forms-builder/lib/form-blueprints";

const jsonObjectSchema = z.record(z.string(), z.unknown());
const clientResolutionStatusSchema = z.enum([
  "NOT_CONFIGURED",
  "PENDING",
  "RESOLVING",
  "RESOLVED",
  "REVIEW",
  "FAILED",
]);
const triggerDispatchStatusSchema = z.enum([
  "PENDING",
  "DISPATCHING",
  "DISPATCHED",
  "FAILED",
]);

function requireOrganizationId(orgId: string | null): string {
  if (!orgId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Organization context required",
    });
  }
  return orgId;
}

export const formsRouter = createTRPCRouter({
  /**
   * List all forms for the current organization/location
   */
  list: publicationViewProcedure
    .input(
      z
        .object({
          status: z.nativeEnum(FormStatus).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const organizationId = requireOrganizationId(ctx.orgId);
      const forms = await db.query.form.findMany({
        where: and(
          eq(form.organizationId, organizationId),
          ctx.locationId
            ? eq(form.locationId, ctx.locationId)
            : isNull(form.locationId),
          input?.status ? eq(form.status, input.status) : undefined,
        ),
        with: {
          formSteps: {
            columns: { id: true },
          },
        },
        orderBy: [desc(form.createdAt)],
      });
      const counts = forms.length
        ? await db
            .select({ formId: formSubmission.formId, count: count() })
            .from(formSubmission)
            .where(
              and(
                inArray(
                  formSubmission.formId,
                  forms.map((item) => item.id),
                ),
                eq(formSubmission.organizationId, organizationId),
                ctx.locationId
                  ? eq(formSubmission.locationId, ctx.locationId)
                  : isNull(formSubmission.locationId),
              ),
            )
            .groupBy(formSubmission.formId)
        : [];
      const countsByFormId = new Map(
        counts.map((item) => [item.formId, item.count]),
      );

      return forms.map((item) => ({
        ...item,
        _count: {
          formStep: item.formSteps.length,
          formSubmission: countsByFormId.get(item.id) ?? 0,
        },
      }));
    }),

  /**
   * Get a specific form with all steps and fields
   */
  get: publicationViewProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const organizationId = requireOrganizationId(ctx.orgId);
      const selectedForm = await db.query.form.findFirst({
        where: formScopeWhere(input.id, {
          organizationId,
          locationId: ctx.locationId,
        }),
        with: {
          formSteps: {
            with: {
              formFields: {
                orderBy: [formField.order],
              },
            },
            orderBy: [formStep.order],
          },
        },
      });

      if (!selectedForm) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }

      const [submissionCount] = await db
        .select({ count: count() })
        .from(formSubmission)
        .where(
          and(
            eq(formSubmission.formId, selectedForm.id),
            eq(formSubmission.organizationId, organizationId),
            ctx.locationId
              ? eq(formSubmission.locationId, ctx.locationId)
              : isNull(formSubmission.locationId),
          ),
        );

      return {
        ...selectedForm,
        formStep: selectedForm.formSteps.map((step) => ({
          ...step,
          formField: step.formFields,
        })),
        _count: { formSubmission: submissionCount?.count ?? 0 },
      };
    }),

  /**
   * Create a new form
   */
  create: publicationManageProcedure
    .input(
      z.object({
        name: z.string().min(1),
        blueprint: formBlueprintIdSchema.default("BLANK"),
        description: z.string().optional(),
        isMultiStep: z.boolean().default(false),
        showProgress: z.boolean().default(true),
        progressDisplay: formProgressDisplaySchema.default("BAR"),
        successMessage: z.string().optional(),
        redirectUrl: z.string().nullable().optional(),
        stylePresetId: z.string().nullable().optional(),
        primaryColor: formColorSchema.optional(),
        buttonTextColor: formColorSchema.optional(),
        backgroundColor: formColorSchema.optional(),
        textColor: formColorSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrganizationId(ctx.orgId);
      const blueprint =
        input.blueprint === "BLANK" ? null : FORM_BLUEPRINTS[input.blueprint];
      const createdForm = await db.transaction(async (tx) => {
        const fieldIds = new Map(
          blueprint?.steps.flatMap((step) =>
            step.fields.map((field) => [field.key, crypto.randomUUID()] as const),
          ) ?? [],
        );
        const stepIds = new Map(
          blueprint?.steps.map((step) => [step.key, crypto.randomUUID()]) ?? [],
        );
        const { blueprint: _blueprint, ...requestedForm } = input;
        void _blueprint;
        const [newForm] = await tx
          .insert(form)
          .values({
            id: crypto.randomUUID(),
            ...requestedForm,
            description: input.description ?? blueprint?.description,
            isMultiStep: blueprint?.isMultiStep ?? input.isMultiStep,
            successMessage:
              input.successMessage ?? blueprint?.successMessage,
            crmResolutionConfig: blueprint?.identity
              ? {
                  enabled: true,
                  matchBy: "EMAIL_OR_PHONE",
                  createIfMissing: blueprint.identity.createIfMissing,
                  updateExisting: "FILL_EMPTY",
                  emailFieldId: blueprint.identity.emailFieldKey
                    ? (fieldIds.get(blueprint.identity.emailFieldKey) ?? null)
                    : null,
                  phoneFieldId: blueprint.identity.phoneFieldKey
                    ? (fieldIds.get(blueprint.identity.phoneFieldKey) ?? null)
                    : null,
                  fullNameFieldId: blueprint.identity.fullNameFieldKey
                    ? (fieldIds.get(blueprint.identity.fullNameFieldKey) ?? null)
                    : null,
                  firstNameFieldId: null,
                  lastNameFieldId: null,
                }
              : undefined,
            automationConfig: blueprint
              ? {
                  version: 1,
                  emailMarketingConsentFieldId:
                    blueprint.automation.emailMarketingConsentFieldKey
                      ? (fieldIds.get(
                          blueprint.automation.emailMarketingConsentFieldKey,
                        ) ?? null)
                      : null,
                  smsMarketingConsentFieldId:
                    blueprint.automation.smsMarketingConsentFieldKey
                      ? (fieldIds.get(
                          blueprint.automation.smsMarketingConsentFieldKey,
                        ) ?? null)
                      : null,
                  followUpConsentFieldId:
                    blueprint.automation.followUpConsentFieldKey
                      ? (fieldIds.get(
                          blueprint.automation.followUpConsentFieldKey,
                        ) ?? null)
                      : null,
                }
              : undefined,
            organizationId,
            locationId: ctx.locationId,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        const now = new Date();
        if (!blueprint) {
          await tx.insert(formStep).values({
            id: crypto.randomUUID(),
            formId: newForm.id,
            name: "Step 1",
            order: 0,
            createdAt: now,
            updatedAt: now,
          });
          return newForm;
        }
        await tx.insert(formStep).values(
          blueprint.steps.map((step, order) => ({
            id: stepIds.get(step.key)!,
            formId: newForm.id,
            name: step.name,
            order,
            createdAt: now,
            updatedAt: now,
          })),
        );
        await tx.insert(formField).values(
          blueprint.steps.flatMap((step) =>
            step.fields.map((field, order) => ({
              id: fieldIds.get(field.key)!,
              stepId: stepIds.get(step.key)!,
              type: field.type,
              label: field.label,
              placeholder: field.placeholder ?? null,
              helpText: field.helpText ?? null,
              required: field.required,
              validation: field.validation ?? {},
              options: field.options ?? [],
              order,
              createdAt: now,
              updatedAt: now,
            })),
          ),
        );
        return newForm;
      });

      return createdForm;
    }),

  duplicate: publicationManageProcedure
    .input(
      z.object({
        id: z.string().min(1).max(128),
        name: z.string().trim().min(1).max(200).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrganizationId(ctx.orgId);
      const selectedForm = await db.query.form.findFirst({
        where: formScopeWhere(input.id, {
          organizationId,
          locationId: ctx.locationId,
        }),
        with: {
          formSteps: {
            with: { formFields: true },
            orderBy: [formStep.order],
          },
        },
      });
      if (!selectedForm) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }

      const formId = crypto.randomUUID();
      const stepIds = new Map(
        selectedForm.formSteps.map((step) => [step.id, crypto.randomUUID()]),
      );
      const fieldIds = new Map(
        selectedForm.formSteps.flatMap((step) =>
          step.formFields.map((field) => [field.id, crypto.randomUUID()] as const),
        ),
      );
      const now = new Date();

      await db.transaction(async (tx) => {
        await tx.insert(form).values({
          id: formId,
          organizationId,
          locationId: ctx.locationId,
          name: input.name ?? `${selectedForm.name} copy`,
          description: selectedForm.description,
          status: FormStatus.DRAFT,
          isMultiStep: selectedForm.isMultiStep,
          showProgress: selectedForm.showProgress,
          progressDisplay: formProgressDisplaySchema.catch("BAR").parse(
            selectedForm.progressDisplay,
          ),
          submitUrl: selectedForm.submitUrl,
          successMessage: selectedForm.successMessage,
          redirectUrl: selectedForm.redirectUrl,
          workflowId: null,
          crmResolutionConfig: remapFormCrmResolutionConfig(
            selectedForm.crmResolutionConfig,
            fieldIds,
          ),
          automationConfig: remapFormAutomationConfig(
            selectedForm.automationConfig,
            fieldIds,
          ),
          stylePresetId: selectedForm.stylePresetId,
          primaryColor: selectedForm.primaryColor,
          buttonTextColor: selectedForm.buttonTextColor,
          backgroundColor: selectedForm.backgroundColor,
          textColor: selectedForm.textColor,
          createdAt: now,
          updatedAt: now,
          publishedAt: null,
        });
        if (selectedForm.formSteps.length > 0) {
          await tx.insert(formStep).values(
            selectedForm.formSteps.map((step) => ({
              id: stepIds.get(step.id)!,
              formId,
              name: step.name,
              order: step.order,
              showConditions: step.showConditions,
              createdAt: now,
              updatedAt: now,
            })),
          );
        }
        const fields = selectedForm.formSteps.flatMap((step) =>
          step.formFields.map((field) => ({
            id: fieldIds.get(field.id)!,
            stepId: stepIds.get(step.id)!,
            type: field.type,
            label: field.label,
            placeholder: field.placeholder,
            helpText: field.helpText,
            required: field.required,
            validation: field.validation,
            options: field.options,
            defaultValue: field.defaultValue,
            showConditions: field.showConditions,
            order: field.order,
            styles: field.styles,
            createdAt: now,
            updatedAt: now,
          })),
        );
        if (fields.length > 0) await tx.insert(formField).values(fields);
      });

      return { id: formId };
    }),

  /**
   * Update a form
   */
  update: publicationManageProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        isMultiStep: z.boolean().optional(),
        showProgress: z.boolean().optional(),
        progressDisplay: formProgressDisplaySchema.optional(),
        submitUrl: z.string().optional(),
        successMessage: z.string().optional(),
        redirectUrl: z.string().nullable().optional(),
        stylePresetId: z.string().nullable().optional(),
        primaryColor: formColorSchema.optional(),
        buttonTextColor: formColorSchema.optional(),
        backgroundColor: formColorSchema.optional(),
        textColor: formColorSchema.optional(),
        crmResolutionConfig: formCrmResolutionConfigSchema.optional(),
        automationConfig: formAutomationConfigSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const organizationId = requireOrganizationId(ctx.orgId);

      // Verify ownership
      const selectedForm = await db.query.form.findFirst({
        where: formScopeWhere(id, {
          organizationId,
          locationId: ctx.locationId,
        }),
      });

      if (!selectedForm) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }
      if (data.isMultiStep === false) {
        const [stepCountRow] = await db
          .select({ count: count() })
          .from(formStep)
          .where(eq(formStep.formId, id));
        if ((stepCountRow?.count ?? 0) > 1) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Delete extra steps before switching this form to a single page",
          });
        }
      }
      if (data.crmResolutionConfig) {
        await assertCrmResolutionFieldMappings(id, data.crmResolutionConfig);
      }
      if (data.automationConfig) {
        await assertAutomationFieldMappings(id, data.automationConfig);
      }

      const [updatedForm] = await db
        .update(form)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(form.id, id))
        .returning();
      return updatedForm;
    }),

  /**
   * Publish a form
   */
  publish: publicationManageProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrganizationId(ctx.orgId);
      // Verify ownership
      const selectedForm = await db.query.form.findFirst({
        where: formScopeWhere(input.id, {
          organizationId,
          locationId: ctx.locationId,
        }),
        columns: { id: true },
      });

      if (!selectedForm) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }

      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "Publish this form through Settings > Publication. Direct form publishing is retired.",
      });
    }),

  /**
   * Unpublish a form
   */
  unpublish: publicationManageProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrganizationId(ctx.orgId);
      const [updatedForm] = await db.transaction(async (tx) => {
        const rows = await tx
          .update(form)
          .set({
            status: FormStatus.DRAFT,
            updatedAt: new Date(),
          })
          .where(
            formScopeWhere(input.id, {
              organizationId,
              locationId: ctx.locationId,
            }),
          )
          .returning();
        if (!rows[0]) return rows;
        await tx
          .update(publicationTarget)
          .set({
            status: "PAUSED",
            updatedAt: new Date(),
            updatedById: ctx.auth.user.id,
          })
          .where(
            and(
              eq(publicationTarget.organizationId, organizationId),
              ctx.locationId
                ? eq(publicationTarget.locationId, ctx.locationId)
                : isNull(publicationTarget.locationId),
              eq(publicationTarget.kind, "FORM"),
              eq(publicationTarget.sourceId, input.id),
            ),
          );
        return rows;
      });
      if (!updatedForm) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }
      return updatedForm;
    }),

  /**
   * Archive a form
   */
  archive: publicationManageProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrganizationId(ctx.orgId);
      const [updatedForm] = await db.transaction(async (tx) => {
        const rows = await tx
          .update(form)
          .set({
            status: FormStatus.ARCHIVED,
            updatedAt: new Date(),
          })
          .where(
            formScopeWhere(input.id, {
              organizationId,
              locationId: ctx.locationId,
            }),
          )
          .returning();
        if (rows[0]) {
          await tx
            .update(publicationTarget)
            .set({
              status: "ARCHIVED",
              updatedAt: new Date(),
              updatedById: ctx.auth.user.id,
            })
            .where(
              and(
                eq(publicationTarget.organizationId, organizationId),
                ctx.locationId
                  ? eq(publicationTarget.locationId, ctx.locationId)
                  : isNull(publicationTarget.locationId),
                eq(publicationTarget.kind, "FORM"),
                eq(publicationTarget.sourceId, input.id),
              ),
            );
        }
        return rows;
      });
      if (!updatedForm) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }
      return updatedForm;
    }),

  /**
   * Delete a form
   */
  delete: publicationManageProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrganizationId(ctx.orgId);
      const [deletedForm] = await db.transaction(async (tx) => {
        const rows = await tx
          .delete(form)
          .where(
            formScopeWhere(input.id, {
              organizationId,
              locationId: ctx.locationId,
            }),
          )
          .returning();
        if (!rows[0]) return rows;
        await tx
          .update(publicationTarget)
          .set({
            status: "ARCHIVED",
            updatedAt: new Date(),
            updatedById: ctx.auth.user.id,
          })
          .where(
            and(
              eq(publicationTarget.organizationId, organizationId),
              ctx.locationId
                ? eq(publicationTarget.locationId, ctx.locationId)
                : isNull(publicationTarget.locationId),
              eq(publicationTarget.kind, "FORM"),
              eq(publicationTarget.sourceId, input.id),
            ),
          );
        return rows;
      });
      if (!deletedForm) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }
      return deletedForm;
    }),

  /**
   * Add a new step to a form
   */
  addStep: publicationManageProcedure
    .input(
      z.object({
        formId: z.string(),
        name: z.string().min(1),
        showConditions: jsonObjectSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrganizationId(ctx.orgId);
      // Verify form ownership
      const selectedForm = await db.query.form.findFirst({
        where: formScopeWhere(input.formId, {
          organizationId,
          locationId: ctx.locationId,
        }),
        with: {
          formSteps: { columns: { order: true } },
        },
      });

      if (!selectedForm) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }

      const maxOrder = selectedForm.formSteps.reduce(
        (max, step) => Math.max(max, step.order),
        -1,
      );

      const [createdStep] = await db
        .insert(formStep)
        .values({
          id: crypto.randomUUID(),
          formId: input.formId,
          name: input.name,
          order: maxOrder + 1,
          showConditions: input.showConditions,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return createdStep;
    }),

  /**
   * Update a step
   */
  updateStep: publicationManageProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        showConditions: jsonObjectSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const organizationId = requireOrganizationId(ctx.orgId);
      await requireScopedStep(id, {
        organizationId,
        locationId: ctx.locationId,
      });

      const [updatedStep] = await db
        .update(formStep)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(formStep.id, id))
        .returning();
      return updatedStep;
    }),

  /**
   * Delete a step
   */
  deleteStep: publicationManageProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrganizationId(ctx.orgId);
      const scopedStep = await requireScopedStep(input.id, {
        organizationId,
        locationId: ctx.locationId,
      });
      const step = await db.query.formStep.findFirst({
        where: eq(formStep.id, input.id),
        with: { form: true },
      });

      if (!step) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Step not found" });
      }

      // Don't allow deleting the last step
      const [stepCountRow] = await db
        .select({ count: count() })
        .from(formStep)
        .where(eq(formStep.formId, scopedStep.formId));

      if ((stepCountRow?.count ?? 0) <= 1) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Cannot delete the last step",
        });
      }

      const stepFieldIds = await db
        .select({ id: formField.id })
        .from(formField)
        .where(eq(formField.stepId, input.id));
      await assertFieldsAreNotMapped(
        scopedStep.formId,
        stepFieldIds.map(({ id }) => id),
      );

      const [deletedStep] = await db
        .delete(formStep)
        .where(eq(formStep.id, input.id))
        .returning();
      return deletedStep;
    }),

  /**
   * Add a field to a step
   */
  addField: publicationManageProcedure
    .input(
      z.object({
        stepId: z.string(),
        type: z.nativeEnum(FormFieldType),
        label: z.string().min(1),
        placeholder: z.string().optional(),
        helpText: z.string().optional(),
        required: z.boolean().default(false),
        validation: jsonObjectSchema.optional(),
        options: z.array(z.string()).optional(),
        defaultValue: z.string().optional(),
        showConditions: jsonObjectSchema.optional(),
        styles: jsonObjectSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrganizationId(ctx.orgId);
      await requireScopedStep(input.stepId, {
        organizationId,
        locationId: ctx.locationId,
      });
      const step = await db.query.formStep.findFirst({
        where: eq(formStep.id, input.stepId),
        with: {
          form: true,
          formFields: { columns: { order: true } },
        },
      });

      if (!step) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Step not found" });
      }

      const maxOrder = step.formFields.reduce(
        (max, field) => Math.max(max, field.order),
        -1,
      );

      const [createdField] = await db
        .insert(formField)
        .values({
          id: crypto.randomUUID(),
          stepId: input.stepId,
          type: input.type,
          label: input.label,
          placeholder: input.placeholder,
          helpText: input.helpText,
          required: input.required,
          validation: input.validation,
          options: input.options,
          createdAt: new Date(),
          updatedAt: new Date(),
          defaultValue: input.defaultValue,
          showConditions: input.showConditions,
          styles: input.styles,
          order: maxOrder + 1,
        })
        .returning();
      return createdField;
    }),

  /**
   * Update a field
   */
  updateField: publicationManageProcedure
    .input(
      z.object({
        id: z.string(),
        type: z.nativeEnum(FormFieldType).optional(),
        label: z.string().min(1).optional(),
        placeholder: z.string().optional(),
        helpText: z.string().optional(),
        required: z.boolean().optional(),
        validation: jsonObjectSchema.optional(),
        options: z.array(z.string()).optional(),
        defaultValue: z.string().optional(),
        showConditions: jsonObjectSchema.optional(),
        styles: jsonObjectSchema.optional(),
        order: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const organizationId = requireOrganizationId(ctx.orgId);
      await requireScopedField(id, {
        organizationId,
        locationId: ctx.locationId,
      });
      if (data.type) {
        const fieldScope = await db
          .select({ formId: formStep.formId })
          .from(formField)
          .innerJoin(formStep, eq(formStep.id, formField.stepId))
          .where(eq(formField.id, id))
          .limit(1);
        const formId = fieldScope[0]?.formId;
        if (formId) await assertMappedFieldType(formId, id, data.type);
      }

      const [updatedField] = await db
        .update(formField)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(formField.id, id))
        .returning();
      return updatedField;
    }),

  reorderFields: publicationManageProcedure
    .input(
      z.object({
        stepId: z.string().min(1),
        orderedFieldIds: z
          .array(z.string().min(1))
          .max(250)
          .refine((ids) => new Set(ids).size === ids.length, {
            message: "Field order cannot contain duplicates",
          }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrganizationId(ctx.orgId);
      await requireScopedStep(input.stepId, {
        organizationId,
        locationId: ctx.locationId,
      });
      const currentFields = await db
        .select({ id: formField.id })
        .from(formField)
        .where(eq(formField.stepId, input.stepId));
      const currentIds = new Set(currentFields.map((field) => field.id));
      const exactFieldSet =
        currentIds.size === input.orderedFieldIds.length &&
        input.orderedFieldIds.every((id) => currentIds.has(id));

      if (!exactFieldSet) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Field order must include every question in this step",
        });
      }

      await db.transaction(async (tx) => {
        const updatedAt = new Date();
        for (const [order, id] of input.orderedFieldIds.entries()) {
          await tx
            .update(formField)
            .set({ order, updatedAt })
            .where(
              and(
                eq(formField.id, id),
                eq(formField.stepId, input.stepId),
              ),
            );
        }
      });

      return { success: true };
    }),

  /**
   * Delete a field
   */
  deleteField: publicationManageProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrganizationId(ctx.orgId);
      await requireScopedField(input.id, {
        organizationId,
        locationId: ctx.locationId,
      });
      const fieldScope = await db
        .select({ formId: formStep.formId })
        .from(formField)
        .innerJoin(formStep, eq(formStep.id, formField.stepId))
        .where(eq(formField.id, input.id))
        .limit(1);
      const formId = fieldScope[0]?.formId;
      if (formId) await assertFieldsAreNotMapped(formId, [input.id]);
      const [deletedField] = await db
        .delete(formField)
        .where(eq(formField.id, input.id))
        .returning();
      return deletedField;
    }),

  /**
   * Get form submissions with filtering
   */
  getSubmissions: publicationViewProcedure
    .input(
      z.object({
        formId: z.string(),
        cursor: z
          .object({ submittedAt: z.date(), id: z.string().min(1).max(128) })
          .optional(),
        limit: z.number().min(1).max(100).default(20),
        search: z.string().trim().max(200).optional(),
        clientResolutionStatuses: z
          .array(clientResolutionStatusSchema)
          .max(6)
          .optional(),
        triggerDispatchStatuses: z
          .array(triggerDispatchStatusSchema)
          .max(4)
          .optional(),
        sort: z
          .enum(["submitted.desc", "submitted.asc"])
          .default("submitted.desc"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const organizationId = requireOrganizationId(ctx.orgId);
      return listScopedFormSubmissions({
        ...input,
        scope: {
          organizationId,
          locationId: ctx.locationId,
        },
      });
    }),

  exportSubmissions: publicationViewProcedure
    .input(z.object({ formId: z.string().min(1).max(128) }))
    .query(async ({ ctx, input }) => {
      const organizationId = requireOrganizationId(ctx.orgId);
      return exportScopedFormSubmissions({
        formId: input.formId,
        scope: {
          organizationId,
          locationId: ctx.locationId,
        },
      });
    }),

  resolveSubmissionClient: publicationManageProcedure
    .input(
      z.object({
        formId: z.string().min(1).max(128),
        submissionId: z.string().min(1).max(128),
        clientId: z.string().min(1).max(128),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrganizationId(ctx.orgId);
      const scope = { organizationId, locationId: ctx.locationId };
      const resolved = await db.transaction(async (tx) => {
        const [selectedClient] = await tx
          .select({ id: client.id })
          .from(client)
          .where(
            and(
              eq(client.id, input.clientId),
              eq(client.organizationId, organizationId),
              ctx.locationId
                ? eq(client.locationId, ctx.locationId)
                : isNull(client.locationId),
            ),
          )
          .limit(1);
        if (!selectedClient) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Member not found in this workspace.",
          });
        }

        const [updated] = await tx
          .update(formSubmission)
          .set({
            clientId: selectedClient.id,
            clientResolutionStatus: "RESOLVED",
            clientResolutionError: null,
            clientResolvedAt: new Date(),
            triggerDispatchStatus: "PENDING",
            triggerDispatchAttempts: 0,
            triggerDispatchError: null,
            lastTriggerDispatchAttemptAt: null,
            triggerDispatchedAt: null,
          })
          .where(
            formSubmissionScopeWhere(input.formId, scope, input.submissionId),
          )
          .returning({
            id: formSubmission.id,
            clientId: formSubmission.clientId,
          });
        if (!updated) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Form response not found.",
          });
        }
        return updated;
      });

      try {
        await requestFormSubmittedWorkflowDispatch(resolved.id);
      } catch {
        // Recovery dispatches pending responses if the immediate enqueue fails.
      }
      return resolved;
    }),

  deleteSubmission: publicationManageProcedure
    .input(
      z.object({
        formId: z.string().min(1).max(128),
        submissionId: z.string().min(1).max(128),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrganizationId(ctx.orgId);
      return deleteScopedFormSubmission({
        ...input,
        scope: {
          organizationId,
          locationId: ctx.locationId,
        },
      });
    }),
});

async function assertCrmResolutionFieldMappings(
  formId: string,
  config: FormCrmResolutionConfig,
): Promise<void> {
  if (!config.enabled) return;
  const expectedTypes = new Map<string, "EMAIL" | "PHONE" | "SHORT_TEXT">();
  if (config.emailFieldId) expectedTypes.set(config.emailFieldId, "EMAIL");
  if (config.phoneFieldId) expectedTypes.set(config.phoneFieldId, "PHONE");
  for (const fieldId of [
    config.fullNameFieldId,
    config.firstNameFieldId,
    config.lastNameFieldId,
  ]) {
    if (fieldId) expectedTypes.set(fieldId, "SHORT_TEXT");
  }
  const fieldIds = [...expectedTypes.keys()];
  const mappedFields = await db
    .select({ id: formField.id, type: formField.type })
    .from(formField)
    .innerJoin(formStep, eq(formStep.id, formField.stepId))
    .where(and(eq(formStep.formId, formId), inArray(formField.id, fieldIds)));
  const mappedTypeById = new Map(
    mappedFields.map((field) => [field.id, field.type]),
  );
  if (
    fieldIds.some(
      (fieldId) => mappedTypeById.get(fieldId) !== expectedTypes.get(fieldId),
    )
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Every member mapping must reference a compatible field on this form.",
    });
  }
}

async function assertAutomationFieldMappings(
  formId: string,
  config: FormAutomationConfig,
): Promise<void> {
  const fieldIds = [
    config.emailMarketingConsentFieldId,
    config.smsMarketingConsentFieldId,
    config.followUpConsentFieldId,
  ].filter((fieldId): fieldId is string => Boolean(fieldId));
  if (fieldIds.length === 0) return;
  const mappedFields = await db
    .select({ id: formField.id, type: formField.type })
    .from(formField)
    .innerJoin(formStep, eq(formStep.id, formField.stepId))
    .where(and(eq(formStep.formId, formId), inArray(formField.id, fieldIds)));
  const typeById = new Map(mappedFields.map((field) => [field.id, field.type]));
  if (fieldIds.some((fieldId) => typeById.get(fieldId) !== "CHECKBOX")) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Consent mappings must reference checkbox fields on this form.",
    });
  }
}

async function assertFieldsAreNotMapped(
  formId: string,
  fieldIds: readonly string[],
): Promise<void> {
  if (fieldIds.length === 0) return;
  const selectedForm = await db.query.form.findFirst({
    where: eq(form.id, formId),
    columns: { crmResolutionConfig: true, automationConfig: true },
  });
  if (!selectedForm) return;
  const crm = formCrmResolutionConfigSchema.safeParse(
    selectedForm.crmResolutionConfig,
  );
  const automation = formAutomationConfigSchema.safeParse(
    selectedForm.automationConfig,
  );
  const mappedIds = new Set([
    ...(crm.success
      ? [
          crm.data.emailFieldId,
          crm.data.phoneFieldId,
          crm.data.fullNameFieldId,
          crm.data.firstNameFieldId,
          crm.data.lastNameFieldId,
        ]
      : []),
    ...(automation.success
      ? [
          automation.data.emailMarketingConsentFieldId,
          automation.data.smsMarketingConsentFieldId,
          automation.data.followUpConsentFieldId,
        ]
      : []),
  ]);
  if (fieldIds.some((fieldId) => mappedIds.has(fieldId))) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Remove this field from the form mappings before deleting it.",
    });
  }
}

async function assertMappedFieldType(
  formId: string,
  fieldId: string,
  nextType: FormFieldType,
): Promise<void> {
  const selectedForm = await db.query.form.findFirst({
    where: eq(form.id, formId),
    columns: { crmResolutionConfig: true, automationConfig: true },
  });
  if (!selectedForm) return;
  const crm = formCrmResolutionConfigSchema.safeParse(
    selectedForm.crmResolutionConfig,
  );
  const automation = formAutomationConfigSchema.safeParse(
    selectedForm.automationConfig,
  );
  const expected = new Map<string | null, FormFieldType>([
    [crm.success ? crm.data.emailFieldId : null, FormFieldType.EMAIL],
    [crm.success ? crm.data.phoneFieldId : null, FormFieldType.PHONE],
    [crm.success ? crm.data.fullNameFieldId : null, FormFieldType.SHORT_TEXT],
    [crm.success ? crm.data.firstNameFieldId : null, FormFieldType.SHORT_TEXT],
    [crm.success ? crm.data.lastNameFieldId : null, FormFieldType.SHORT_TEXT],
    [
      automation.success
        ? automation.data.emailMarketingConsentFieldId
        : null,
      FormFieldType.CHECKBOX,
    ],
    [
      automation.success ? automation.data.smsMarketingConsentFieldId : null,
      FormFieldType.CHECKBOX,
    ],
    [
      automation.success ? automation.data.followUpConsentFieldId : null,
      FormFieldType.CHECKBOX,
    ],
  ]);
  const expectedType = expected.get(fieldId);
  if (expectedType && expectedType !== nextType) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `This mapped field must remain ${expectedType.toLowerCase().replaceAll("_", " ")}.`,
    });
  }
}
