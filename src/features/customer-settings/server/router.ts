import {
  archiveCustomerFieldDefinitionSchema,
  archiveCustomerNoteTemplateSchema,
  archiveCustomerTagDefinitionSchema,
  createCustomerFieldDefinitionSchema,
  createCustomerNoteTemplateSchema,
  createCustomerTagDefinitionSchema,
  saveHouseholdSharingPolicySchema,
  updateCustomerFieldDefinitionSchema,
  updateCustomerNoteTemplateSchema,
  updateCustomerTagDefinitionSchema,
} from "@/features/customer-settings/contracts";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

import { requireCustomerSettingsAccess } from "./access";
import {
  archiveCustomerFieldDefinition,
  archiveCustomerNoteTemplate,
  archiveCustomerTagDefinition,
  createCustomerFieldDefinition,
  createCustomerNoteTemplate,
  createCustomerTagDefinition,
  listCustomerFieldDefinitions,
  listCustomerNoteTemplates,
  listCustomerTagDefinitions,
  updateCustomerFieldDefinition,
  updateCustomerNoteTemplate,
  updateCustomerTagDefinition,
} from "./definition-service";
import {
  getHouseholdSharingPolicy,
  listHouseholdSharingPolicyHistory,
  saveHouseholdSharingPolicy,
} from "./household-policy-service";

export const customerSettingsRouter = createTRPCRouter({
  listFields: protectedProcedure.query(async ({ ctx }) => {
    const scope = await requireCustomerSettingsAccess(ctx, "settings.view");
    return listCustomerFieldDefinitions(scope);
  }),
  createField: protectedProcedure
    .input(createCustomerFieldDefinitionSchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requireCustomerSettingsAccess(ctx, "settings.manage");
      return createCustomerFieldDefinition({
        scope,
        actorUserId: ctx.auth.user.id,
        values: input,
      });
    }),
  updateField: protectedProcedure
    .input(updateCustomerFieldDefinitionSchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requireCustomerSettingsAccess(ctx, "settings.manage");
      const { id, ...values } = input;
      return updateCustomerFieldDefinition({
        scope,
        actorUserId: ctx.auth.user.id,
        id,
        values,
      });
    }),
  archiveField: protectedProcedure
    .input(archiveCustomerFieldDefinitionSchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requireCustomerSettingsAccess(ctx, "settings.manage");
      return archiveCustomerFieldDefinition({
        scope,
        actorUserId: ctx.auth.user.id,
        id: input.id,
      });
    }),

  listTags: protectedProcedure.query(async ({ ctx }) => {
    const scope = await requireCustomerSettingsAccess(ctx, "settings.view");
    return listCustomerTagDefinitions(scope);
  }),
  createTag: protectedProcedure
    .input(createCustomerTagDefinitionSchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requireCustomerSettingsAccess(ctx, "settings.manage");
      return createCustomerTagDefinition({
        scope,
        actorUserId: ctx.auth.user.id,
        values: input,
      });
    }),
  updateTag: protectedProcedure
    .input(updateCustomerTagDefinitionSchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requireCustomerSettingsAccess(ctx, "settings.manage");
      const { id, ...values } = input;
      return updateCustomerTagDefinition({
        scope,
        actorUserId: ctx.auth.user.id,
        id,
        values,
      });
    }),
  archiveTag: protectedProcedure
    .input(archiveCustomerTagDefinitionSchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requireCustomerSettingsAccess(ctx, "settings.manage");
      return archiveCustomerTagDefinition({
        scope,
        actorUserId: ctx.auth.user.id,
        id: input.id,
      });
    }),

  listNoteTemplates: protectedProcedure.query(async ({ ctx }) => {
    const scope = await requireCustomerSettingsAccess(ctx, "settings.view");
    return listCustomerNoteTemplates(scope);
  }),
  createNoteTemplate: protectedProcedure
    .input(createCustomerNoteTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requireCustomerSettingsAccess(ctx, "settings.manage");
      return createCustomerNoteTemplate({
        scope,
        actorUserId: ctx.auth.user.id,
        values: input,
      });
    }),
  updateNoteTemplate: protectedProcedure
    .input(updateCustomerNoteTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requireCustomerSettingsAccess(ctx, "settings.manage");
      const { id, ...values } = input;
      return updateCustomerNoteTemplate({
        scope,
        actorUserId: ctx.auth.user.id,
        id,
        values,
      });
    }),
  archiveNoteTemplate: protectedProcedure
    .input(archiveCustomerNoteTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requireCustomerSettingsAccess(ctx, "settings.manage");
      return archiveCustomerNoteTemplate({
        scope,
        actorUserId: ctx.auth.user.id,
        id: input.id,
      });
    }),

  getHouseholdPolicy: protectedProcedure.query(async ({ ctx }) => {
    const scope = await requireCustomerSettingsAccess(ctx, "settings.view");
    return getHouseholdSharingPolicy(scope);
  }),
  listHouseholdPolicyHistory: protectedProcedure.query(async ({ ctx }) => {
    const scope = await requireCustomerSettingsAccess(ctx, "settings.view");
    return listHouseholdSharingPolicyHistory(scope);
  }),
  saveHouseholdPolicy: protectedProcedure
    .input(saveHouseholdSharingPolicySchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requireCustomerSettingsAccess(ctx, "settings.manage");
      return saveHouseholdSharingPolicy({
        scope,
        actorUserId: ctx.auth.user.id,
        ...input,
      });
    }),
});
