import {
  archiveContentLibraryItemSchema,
  createContentLibraryItemSchema,
  getContentLibraryItemSchema,
  listContentLibraryItemsSchema,
  publishContentLibraryItemSchema,
  rollbackContentLibraryItemSchema,
  versionContentLibraryItemSchema,
} from "@/features/content-settings/contracts";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

import { requireContentSettingsAccess } from "./access";
import {
  archiveContentLibraryItem,
  createContentLibraryItem,
  publishContentLibraryItem,
  rollbackContentLibraryItem,
  versionContentLibraryItem,
} from "./content-service";
import {
  getContentLibraryItem,
  listContentLibraryItems,
} from "./query-service";

export const contentSettingsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(listContentLibraryItemsSchema)
    .query(async ({ ctx, input }) => {
      const scope = await requireContentSettingsAccess(ctx, "settings.view");
      return listContentLibraryItems({ scope, ...input });
    }),
  get: protectedProcedure
    .input(getContentLibraryItemSchema)
    .query(async ({ ctx, input }) => {
      const scope = await requireContentSettingsAccess(ctx, "settings.view");
      return getContentLibraryItem({ scope, itemId: input.itemId });
    }),
  create: protectedProcedure
    .input(createContentLibraryItemSchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requireContentSettingsAccess(ctx, "settings.manage");
      return createContentLibraryItem({
        scope,
        actorUserId: ctx.auth.user.id,
        ...input,
      });
    }),
  createVersion: protectedProcedure
    .input(versionContentLibraryItemSchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requireContentSettingsAccess(ctx, "settings.manage");
      return versionContentLibraryItem({
        scope,
        actorUserId: ctx.auth.user.id,
        ...input,
      });
    }),
  publish: protectedProcedure
    .input(publishContentLibraryItemSchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requireContentSettingsAccess(ctx, "settings.manage");
      return publishContentLibraryItem({
        scope,
        actorUserId: ctx.auth.user.id,
        ...input,
      });
    }),
  rollback: protectedProcedure
    .input(rollbackContentLibraryItemSchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requireContentSettingsAccess(ctx, "settings.manage");
      return rollbackContentLibraryItem({
        scope,
        actorUserId: ctx.auth.user.id,
        ...input,
      });
    }),
  archive: protectedProcedure
    .input(archiveContentLibraryItemSchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requireContentSettingsAccess(ctx, "settings.manage");
      return archiveContentLibraryItem({
        scope,
        actorUserId: ctx.auth.user.id,
        ...input,
      });
    }),
});
