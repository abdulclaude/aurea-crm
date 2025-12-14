/**
 * Forms Builder tRPC Router
 *
 * Handles form creation, steps, fields, submissions, and conditional logic
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import db from "@/lib/db";
import { FormStatus, FormFieldType } from "@prisma/client";

export const formsRouter = createTRPCRouter({
  /**
   * List all forms for the current organization/subaccount
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
      return await db.form.findMany({
        where: {
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
          ...(input?.status && { status: input.status }),
        },
        include: {
          _count: {
            select: { formStep: true, formSubmission: true },
          },
          Workflows: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  /**
   * Get a specific form with all steps and fields
   */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const form = await db.form.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId!,
        },
        include: {
          formStep: {
            include: {
              formField: {
                orderBy: { order: "asc" },
              },
            },
            orderBy: { order: "asc" },
          },
          Workflows: {
            select: { id: true, name: true },
          },
          _count: {
            select: { formSubmission: true },
          },
        },
      });

      if (!form) {
        throw new Error("Form not found");
      }

      return form;
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
      const form = await db.form.create({
        data: {
          id: crypto.randomUUID(),
          ...input,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Create initial step
      await db.formStep.create({
        data: {
          id: crypto.randomUUID(),
          formId: form.id,
          name: "Step 1",
          order: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return form;
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

      // Verify ownership
      const form = await db.form.findFirst({
        where: {
          id,
          organizationId: ctx.orgId!,
        },
      });

      if (!form) {
        throw new Error("Form not found");
      }

      return await db.form.update({
        where: { id },
        data,
      });
    }),

  /**
   * Publish a form
   */
  publish: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const form = await db.form.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId!,
        },
        include: {
          formStep: {
            include: { formField: true },
          },
        },
      });

      if (!form) {
        throw new Error("Form not found");
      }

      // Validate form has at least one field
      const totalFields = form.formStep.reduce(
        (sum, step) => sum + step.formField.length,
        0
      );
      if (totalFields === 0) {
        throw new Error("Cannot publish form with no fields");
      }

      return await db.form.update({
        where: { id: input.id },
        data: {
          status: FormStatus.PUBLISHED,
          publishedAt: new Date(),
        },
      });
    }),

  /**
   * Unpublish a form
   */
  unpublish: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await db.form.update({
        where: { id: input.id },
        data: {
          status: FormStatus.DRAFT,
        },
      });
    }),

  /**
   * Archive a form
   */
  archive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await db.form.update({
        where: { id: input.id },
        data: {
          status: FormStatus.ARCHIVED,
        },
      });
    }),

  /**
   * Delete a form
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const form = await db.form.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId!,
        },
      });

      if (!form) {
        throw new Error("Form not found");
      }

      return await db.form.delete({
        where: { id: input.id },
      });
    }),

  /**
   * Add a new step to a form
   */
  addStep: protectedProcedure
    .input(
      z.object({
        formId: z.string(),
        name: z.string().min(1),
        showConditions: z.record(z.any(), z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify form ownership
      const form = await db.form.findFirst({
        where: {
          id: input.formId,
          organizationId: ctx.orgId!,
        },
        include: {
          formStep: { select: { order: true } },
        },
      });

      if (!form) {
        throw new Error("Form not found");
      }

      const maxOrder = form.formStep.reduce(
        (max, step) => Math.max(max, step.order),
        -1
      );

      return await db.formStep.create({
        data: {
          id: crypto.randomUUID(),
          formId: input.formId,
          name: input.name,
          order: maxOrder + 1,
          showConditions: input.showConditions,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }),

  /**
   * Update a step
   */
  updateStep: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        showConditions: z.record(z.any(), z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      return await db.formStep.update({
        where: { id },
        data,
      });
    }),

  /**
   * Delete a step
   */
  deleteStep: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const step = await db.formStep.findUnique({
        where: { id: input.id },
        include: { form: true },
      });

      if (!step) {
        throw new Error("Step not found");
      }

      // Verify ownership
      if (step.form.organizationId !== ctx.orgId) {
        throw new Error("Unauthorized");
      }

      // Don't allow deleting the last step
      const stepCount = await db.formStep.count({
        where: { formId: step.formId },
      });

      if (stepCount <= 1) {
        throw new Error("Cannot delete the last step");
      }

      return await db.formStep.delete({
        where: { id: input.id },
      });
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
        validation: z.record(z.any(), z.any()).optional(),
        options: z.array(z.string()).optional(),
        defaultValue: z.string().optional(),
        showConditions: z.record(z.any(), z.any()).optional(),
        styles: z.record(z.any(), z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const step = await db.formStep.findUnique({
        where: { id: input.stepId },
        include: {
          form: true,
          formField: { select: { order: true } },
        },
      });

      if (!step) {
        throw new Error("Step not found");
      }

      // Verify ownership
      if (step.form.organizationId !== ctx.orgId) {
        throw new Error("Unauthorized");
      }

      const maxOrder = step.formField.reduce(
        (max, field) => Math.max(max, field.order),
        -1
      );

      return await db.formField.create({
        data: {
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
        },
      });
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
        validation: z.record(z.any(), z.any()).optional(),
        options: z.array(z.string()).optional(),
        defaultValue: z.string().optional(),
        showConditions: z.record(z.any(), z.any()).optional(),
        styles: z.record(z.any(), z.any()).optional(),
        order: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      return await db.formField.update({
        where: { id },
        data,
      });
    }),

  /**
   * Delete a field
   */
  deleteField: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await db.formField.delete({
        where: { id: input.id },
      });
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
      const form = await db.form.findFirst({
        where: {
          id: input.formId,
          organizationId: ctx.orgId!,
        },
      });

      if (!form) {
        throw new Error("Form not found");
      }

      const submissions = await db.formSubmission.findMany({
        where: { formId: input.formId },
        include: {
          contact: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { submittedAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor && {
          cursor: { id: input.cursor },
          skip: 1,
        }),
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
