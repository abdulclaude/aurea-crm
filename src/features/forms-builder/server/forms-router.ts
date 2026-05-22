/**
 * Forms Builder tRPC Router
 *
 * Handles form creation, steps, fields, submissions, and conditional logic
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, isNull, lt } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { db } from "@/db";
import { form, formField, formStep, formSubmission } from "@/db/schema";
import { FormStatus, FormFieldType } from "@/db/enums";

const jsonObjectSchema = z.record(z.string(), z.unknown());

function requireOrganizationId(orgId: string | null): string {
  if (!orgId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Organization context required",
    });
  }
  return orgId;
}

const formScopeWhere = (formId: string, organizationId: string) =>
  and(eq(form.id, formId), eq(form.organizationId, organizationId));

export const formsRouter = createTRPCRouter({
  /**
   * List all forms for the current organization/location
   */
  list: protectedProcedure
    .input(
      z
        .object({
          status: z.nativeEnum(FormStatus).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const organizationId = requireOrganizationId(ctx.orgId);
      const forms = await db.query.form.findMany({
        where: and(
          eq(form.organizationId, organizationId),
          ctx.locationId ? eq(form.locationId, ctx.locationId) : isNull(form.locationId),
          input?.status ? eq(form.status, input.status) : undefined,
        ),
        with: {
          workflow: {
            columns: { id: true, name: true },
          },
          formSteps: {
            columns: { id: true },
          },
          formSubmissions: {
            columns: { id: true },
          },
        },
        orderBy: [desc(form.createdAt)],
      });

      return forms.map((item) => ({
        ...item,
        Workflows: item.workflow,
        _count: {
          formStep: item.formSteps.length,
          formSubmission: item.formSubmissions.length,
        },
      }));
    }),

  /**
   * Get a specific form with all steps and fields
   */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const organizationId = requireOrganizationId(ctx.orgId);
      const selectedForm = await db.query.form.findFirst({
        where: formScopeWhere(input.id, organizationId),
        with: {
          formSteps: {
            with: {
              formFields: {
                orderBy: [formField.order],
              },
            },
            orderBy: [formStep.order],
          },
          workflow: {
            columns: { id: true, name: true },
          },
          formSubmissions: {
            columns: { id: true },
          },
        },
      });

      if (!selectedForm) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }

      return {
        ...selectedForm,
        formStep: selectedForm.formSteps.map((step) => ({
          ...step,
          formField: step.formFields,
        })),
        Workflows: selectedForm.workflow,
        _count: { formSubmission: selectedForm.formSubmissions.length },
      };
    }),

  /**
   * Create a new form
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        isMultiStep: z.boolean().default(false),
        showProgress: z.boolean().default(true),
        successMessage: z.string().optional(),
        redirectUrl: z.string().optional(),
        workflowId: z.string().optional(),
        stylePresetId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrganizationId(ctx.orgId);
      const createdForm = await db.transaction(async (tx) => {
        const [newForm] = await tx
          .insert(form)
          .values({
          id: crypto.randomUUID(),
          ...input,
            organizationId,
            locationId: ctx.locationId,
          createdAt: new Date(),
          updatedAt: new Date(),
          })
          .returning();

      // Create initial step
        await tx.insert(formStep).values({
          id: crypto.randomUUID(),
          formId: newForm.id,
          name: "Step 1",
          order: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        return newForm;
      });

      return createdForm;
    }),

  /**
   * Update a form
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        isMultiStep: z.boolean().optional(),
        showProgress: z.boolean().optional(),
        submitUrl: z.string().optional(),
        successMessage: z.string().optional(),
        redirectUrl: z.string().optional(),
        workflowId: z.string().optional(),
        stylePresetId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const organizationId = requireOrganizationId(ctx.orgId);

      // Verify ownership
      const selectedForm = await db.query.form.findFirst({
        where: formScopeWhere(id, organizationId),
      });

      if (!selectedForm) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
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
  publish: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrganizationId(ctx.orgId);
      // Verify ownership
      const selectedForm = await db.query.form.findFirst({
        where: formScopeWhere(input.id, organizationId),
        with: {
          formSteps: {
            with: { formFields: true },
          },
        },
      });

      if (!selectedForm) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }

      // Validate form has at least one field
      const totalFields = selectedForm.formSteps.reduce(
        (sum, step) => sum + step.formFields.length,
        0
      );
      if (totalFields === 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Cannot publish form with no fields",
        });
      }

      const [updatedForm] = await db
        .update(form)
        .set({
          status: FormStatus.PUBLISHED,
          publishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(form.id, input.id))
        .returning();
      return updatedForm;
    }),

  /**
   * Unpublish a form
   */
  unpublish: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [updatedForm] = await db
        .update(form)
        .set({
          status: FormStatus.DRAFT,
          updatedAt: new Date(),
        })
        .where(eq(form.id, input.id))
        .returning();
      return updatedForm;
    }),

  /**
   * Archive a form
   */
  archive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [updatedForm] = await db
        .update(form)
        .set({
          status: FormStatus.ARCHIVED,
          updatedAt: new Date(),
        })
        .where(eq(form.id, input.id))
        .returning();
      return updatedForm;
    }),

  /**
   * Delete a form
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrganizationId(ctx.orgId);
      // Verify ownership
      const selectedForm = await db.query.form.findFirst({
        where: formScopeWhere(input.id, organizationId),
      });

      if (!selectedForm) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }

      const [deletedForm] = await db
        .delete(form)
        .where(eq(form.id, input.id))
        .returning();
      return deletedForm;
    }),

  /**
   * Add a new step to a form
   */
  addStep: protectedProcedure
    .input(
      z.object({
        formId: z.string(),
        name: z.string().min(1),
        showConditions: jsonObjectSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrganizationId(ctx.orgId);
      // Verify form ownership
      const selectedForm = await db.query.form.findFirst({
        where: formScopeWhere(input.formId, organizationId),
        with: {
          formSteps: { columns: { order: true } },
        },
      });

      if (!selectedForm) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }

      const maxOrder = selectedForm.formSteps.reduce(
        (max, step) => Math.max(max, step.order),
        -1
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
  updateStep: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        showConditions: jsonObjectSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

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
  deleteStep: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const step = await db.query.formStep.findFirst({
        where: eq(formStep.id, input.id),
        with: { form: true },
      });

      if (!step) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Step not found" });
      }

      // Verify ownership
      if (step.form.organizationId !== ctx.orgId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      }

      // Don't allow deleting the last step
      const [stepCountRow] = await db
        .select({ count: count() })
        .from(formStep)
        .where(eq(formStep.formId, step.formId));

      if ((stepCountRow?.count ?? 0) <= 1) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Cannot delete the last step",
        });
      }

      const [deletedStep] = await db
        .delete(formStep)
        .where(eq(formStep.id, input.id))
        .returning();
      return deletedStep;
    }),

  /**
   * Add a field to a step
   */
  addField: protectedProcedure
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
      })
    )
    .mutation(async ({ ctx, input }) => {
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

      // Verify ownership
      if (step.form.organizationId !== ctx.orgId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      }

      const maxOrder = step.formFields.reduce(
        (max, field) => Math.max(max, field.order),
        -1
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
  updateField: protectedProcedure
    .input(
      z.object({
        id: z.string(),
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const [updatedField] = await db
        .update(formField)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(formField.id, id))
        .returning();
      return updatedField;
    }),

  /**
   * Delete a field
   */
  deleteField: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [deletedField] = await db
        .delete(formField)
        .where(eq(formField.id, input.id))
        .returning();
      return deletedField;
    }),

  /**
   * Get form submissions with filtering
   */
  getSubmissions: protectedProcedure
    .input(
      z.object({
        formId: z.string(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify form ownership
      const organizationId = requireOrganizationId(ctx.orgId);
      const selectedForm = await db.query.form.findFirst({
        where: formScopeWhere(input.formId, organizationId),
      });

      if (!selectedForm) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }

      const submissions = await db.query.formSubmission.findMany({
        where: and(
          eq(formSubmission.formId, input.formId),
          input.cursor ? lt(formSubmission.id, input.cursor) : undefined,
        ),
        with: {
          client: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [desc(formSubmission.submittedAt)],
        limit: input.limit + 1,
      });

      let nextCursor: string | undefined;
      if (submissions.length > input.limit) {
        const nextItem = submissions.pop();
        nextCursor = nextItem?.id;
      }

      return {
        submissions,
        nextCursor,
      };
    }),
});
