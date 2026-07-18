import {
  rollbackWorkspaceRegionalSettingsSchema,
  saveWorkspaceRegionalSettingsSchema,
} from "@/features/workspace-settings/contracts";
import {
  rollbackWorkspaceOperationsSettingsSchema,
  saveWorkspaceOperationsSettingsSchema,
} from "@/features/workspace-settings/operations-contracts";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

import {
  requireWorkspaceOperationsRuntimeAccess,
  requireWorkspaceSettingsAccess,
} from "./access";
import {
  rollbackWorkspaceRegionalSettings,
  saveWorkspaceRegionalSettings,
} from "./mutation-service";
import {
  getWorkspaceRegionalSettings,
  listWorkspaceRegionalSettingsHistory,
} from "./query-service";
import { resolvedRegionalValues } from "../lib/regional-settings";
import {
  rollbackWorkspaceOperationsSettings,
  saveWorkspaceOperationsSettings,
} from "./operations-mutation-service";
import {
  getWorkspaceOperationsSettings,
  listWorkspaceOperationsSettingsHistory,
} from "./operations-query-service";

export const workspaceSettingsRouter = createTRPCRouter({
  getRegionalSettings: protectedProcedure.query(async ({ ctx }) => {
    const scope = await requireWorkspaceSettingsAccess(ctx, "settings.view");
    return getWorkspaceRegionalSettings(scope);
  }),

  listRegionalSettingsHistory: protectedProcedure.query(async ({ ctx }) => {
    const scope = await requireWorkspaceSettingsAccess(ctx, "settings.view");
    return listWorkspaceRegionalSettingsHistory(scope);
  }),

  saveRegionalSettings: protectedProcedure
    .input(saveWorkspaceRegionalSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requireWorkspaceSettingsAccess(
        ctx,
        "settings.manage",
      );
      return saveWorkspaceRegionalSettings({
        scope,
        actorUserId: ctx.auth.user.id,
        ...input,
      });
    }),

  rollbackRegionalSettings: protectedProcedure
    .input(rollbackWorkspaceRegionalSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requireWorkspaceSettingsAccess(
        ctx,
        "settings.manage",
      );
      return rollbackWorkspaceRegionalSettings({
        scope,
        actorUserId: ctx.auth.user.id,
        ...input,
      });
    }),

  getOperationsSettings: protectedProcedure.query(async ({ ctx }) => {
    const scope = await requireWorkspaceSettingsAccess(ctx, "settings.view");
    return getWorkspaceOperationsSettings(scope);
  }),

  listOperationsSettingsHistory: protectedProcedure.query(async ({ ctx }) => {
    const scope = await requireWorkspaceSettingsAccess(ctx, "settings.view");
    return listWorkspaceOperationsSettingsHistory(scope);
  }),

  saveOperationsSettings: protectedProcedure
    .input(saveWorkspaceOperationsSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requireWorkspaceSettingsAccess(
        ctx,
        "settings.manage",
      );
      return saveWorkspaceOperationsSettings({
        scope,
        actorUserId: ctx.auth.user.id,
        ...input,
      });
    }),

  rollbackOperationsSettings: protectedProcedure
    .input(rollbackWorkspaceOperationsSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requireWorkspaceSettingsAccess(
        ctx,
        "settings.manage",
      );
      return rollbackWorkspaceOperationsSettings({
        scope,
        actorUserId: ctx.auth.user.id,
        ...input,
      });
    }),

  getScheduleDisplaySettings: protectedProcedure.query(async ({ ctx }) => {
    const scope = await requireWorkspaceOperationsRuntimeAccess(
      ctx,
      "schedule.view",
    );
    const [operations, regional] = await Promise.all([
      getWorkspaceOperationsSettings(scope),
      getWorkspaceRegionalSettings(scope),
    ]);
    const regionalValues = resolvedRegionalValues(regional.effective);
    return {
      startMinutes: operations.effective.scheduleStartMinutes.value,
      endMinutes: operations.effective.scheduleEndMinutes.value,
      slotMinutes: operations.effective.scheduleSlotMinutes.value,
      weekStart: regionalValues.weekStart,
    };
  }),
});
