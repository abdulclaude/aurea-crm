import { z } from "zod";

import {
  assignStaffCompensationTemplateSchema,
  assignableInstructorSchema,
  createStaffCompensationTemplateSchema,
  saveStaffOperationsPolicySchema,
  staffCompensationAssignmentSchema,
  staffCompensationTemplateSchema,
  staffOperationsPolicyVersionSchema,
  staffOperationsPolicyViewSchema,
  versionStaffCompensationTemplateSchema,
} from "@/features/staff-settings/contracts";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

import { requireStaffSettingsAccess } from "./access";
import {
  assignStaffCompensationTemplate,
  createStaffCompensationTemplate,
  listStaffCompensationAssignments,
  listStaffCompensationTemplates,
  listAssignableInstructors,
  versionStaffCompensationTemplate,
} from "./compensation-service";
import {
  getStaffOperationsPolicy,
  listStaffOperationsPolicyHistory,
  saveStaffOperationsPolicy,
} from "./policy-service";

export const staffSettingsRouter = createTRPCRouter({
  getOperationsPolicy: protectedProcedure
    .output(staffOperationsPolicyViewSchema)
    .query(async ({ ctx }) => {
      const scope = await requireStaffSettingsAccess(ctx, "team.view");
      return {
        scope,
        currentVersion: await getStaffOperationsPolicy({ scope }),
      };
    }),

  listOperationsPolicyHistory: protectedProcedure
    .output(z.array(staffOperationsPolicyVersionSchema))
    .query(async ({ ctx }) => {
      const scope = await requireStaffSettingsAccess(ctx, "team.view");
      return listStaffOperationsPolicyHistory({ scope });
    }),

  saveOperationsPolicy: protectedProcedure
    .input(saveStaffOperationsPolicySchema)
    .output(staffOperationsPolicyVersionSchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requireStaffSettingsAccess(ctx, "team.manage");
      return saveStaffOperationsPolicy({
        scope,
        actorUserId: ctx.auth.user.id,
        ...input,
      });
    }),

  listCompensationTemplates: protectedProcedure
    .output(z.array(staffCompensationTemplateSchema))
    .query(async ({ ctx }) => {
      const scope = await requireStaffSettingsAccess(ctx, "compensation.view");
      return listStaffCompensationTemplates({ scope });
    }),

  createCompensationTemplate: protectedProcedure
    .input(createStaffCompensationTemplateSchema)
    .output(staffCompensationTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requireStaffSettingsAccess(
        ctx,
        "compensation.manage",
      );
      return createStaffCompensationTemplate({
        scope,
        actorUserId: ctx.auth.user.id,
        ...input,
      });
    }),

  versionCompensationTemplate: protectedProcedure
    .input(versionStaffCompensationTemplateSchema)
    .output(staffCompensationTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requireStaffSettingsAccess(
        ctx,
        "compensation.manage",
      );
      return versionStaffCompensationTemplate({
        scope,
        actorUserId: ctx.auth.user.id,
        ...input,
      });
    }),

  listCompensationAssignments: protectedProcedure
    .output(z.array(staffCompensationAssignmentSchema))
    .query(async ({ ctx }) => {
      const scope = await requireStaffSettingsAccess(ctx, "compensation.view");
      return listStaffCompensationAssignments({ scope });
    }),

  listAssignableInstructors: protectedProcedure
    .output(z.array(assignableInstructorSchema))
    .query(async ({ ctx }) => {
      const scope = await requireStaffSettingsAccess(ctx, "compensation.view");
      return listAssignableInstructors({ scope });
    }),

  assignCompensationTemplate: protectedProcedure
    .input(assignStaffCompensationTemplateSchema)
    .output(staffCompensationAssignmentSchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requireStaffSettingsAccess(
        ctx,
        "compensation.manage",
      );
      return assignStaffCompensationTemplate({
        scope,
        actorUserId: ctx.auth.user.id,
        ...input,
      });
    }),
});
