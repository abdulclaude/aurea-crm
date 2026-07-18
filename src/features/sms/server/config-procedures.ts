import { TRPCError } from "@trpc/server";

import { requireCapability } from "@/features/permissions/server/authorization";
import { saveSmsConfigSchema } from "@/features/sms/contracts";
import {
  disconnectSmsConfig,
  saveSmsConfig,
} from "@/features/sms/server/sms-config-service";
import { findScopedSmsConfig } from "@/features/sms/server/sms-config";
import { protectedProcedure } from "@/trpc/init";

type SmsProcedureContext = {
  auth: { user: { id: string } };
  orgId: string | null;
  locationId: string | null;
};

function requireOrganization(ctx: SmsProcedureContext): string {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No active organization",
    });
  }
  return ctx.orgId;
}

function actor(ctx: SmsProcedureContext) {
  return {
    userId: ctx.auth.user.id,
    organizationId: ctx.orgId,
    locationId: ctx.locationId,
  };
}

export const getSmsConfigProcedure = protectedProcedure.query(
  async ({ ctx }) => {
    const organizationId = requireOrganization(ctx);
    await requireCapability({
      actor: actor(ctx),
      capability: "messaging.view",
    });
    const config = await findScopedSmsConfig({
      organizationId,
      locationId: ctx.locationId ?? null,
      includeInactive: true,
    });
    return config ? { ...config, hasCredentials: true } : null;
  },
);

export const saveSmsConfigProcedure = protectedProcedure
  .input(saveSmsConfigSchema)
  .mutation(async ({ ctx, input }) => {
    const organizationId = requireOrganization(ctx);
    await requireCapability({
      actor: actor(ctx),
      capability: "provider.manage",
    });
    const config = await saveSmsConfig(
      {
        organizationId,
        locationId: ctx.locationId ?? null,
        userId: ctx.auth.user.id,
      },
      input,
    );
    return config ? { ...config, hasCredentials: true } : null;
  });

export const disconnectSmsConfigProcedure = protectedProcedure.mutation(
  async ({ ctx }) => {
    const organizationId = requireOrganization(ctx);
    await requireCapability({
      actor: actor(ctx),
      capability: "provider.manage",
    });
    const disconnected = await disconnectSmsConfig({
      organizationId,
      locationId: ctx.locationId ?? null,
    });
    if (!disconnected) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "SMS provider account not found in this workspace.",
      });
    }
    return { disconnected: true };
  },
);
