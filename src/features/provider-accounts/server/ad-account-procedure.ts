import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { providerAccount } from "@/db/schema";
import {
  type AdConversionSecret,
  adConversionConfigSchema,
  adConversionSecretSchema,
} from "@/features/provider-accounts/contracts";
import { requireCapability } from "@/features/permissions/server/authorization";
import { encrypt } from "@/lib/encryption";
import { protectedProcedure } from "@/trpc/init";
import { toPublicProviderAccount } from "./public-account";

const baseSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  inheritToLocations: z.boolean().default(false),
});

const saveAdConversionAccountSchema = z
  .discriminatedUnion("provider", [
  baseSchema.extend({
    provider: z.literal("META_CONVERSIONS"),
    pixelId: z.string().trim().min(1).max(100),
    testEventCode: z.string().trim().max(100).nullable().default(null),
    accessToken: z.string().trim().max(4096),
  }),
  baseSchema.extend({
      provider: z.literal("GOOGLE_ADS"),
      customerId: z.string().trim().regex(/^\d{6,20}$/),
      conversionActionId: z.string().trim().regex(/^\d{1,30}$/),
      loginCustomerId: z
        .string()
        .trim()
        .regex(/^\d{6,20}$/)
        .nullable()
        .default(null),
      developerToken: z.string().trim().max(4096),
      accessToken: z.string().trim().max(8192),
    }),
  baseSchema.extend({
    provider: z.literal("TIKTOK_EVENTS"),
    pixelCode: z.string().trim().min(1).max(100),
    testEventCode: z.string().trim().max(100).nullable().default(null),
    accessToken: z.string().trim().max(4096),
  }),
  ])
  .superRefine((input, ctx) => {
    if (
      input.provider === "GOOGLE_ADS" &&
      Boolean(input.developerToken) !== Boolean(input.accessToken)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Replace the Google developer and access tokens together.",
        path: input.developerToken ? ["accessToken"] : ["developerToken"],
      });
    }
  });

type ProviderContext = {
  auth: { user: { id: string } };
  orgId: string | null;
  locationId: string | null;
};

export const saveAdConversionAccountProcedure = protectedProcedure
  .input(saveAdConversionAccountSchema)
  .mutation(async ({ ctx, input }) => {
    const organizationId = requireOrganization(ctx);
    await requireCapability({
      actor: {
        userId: ctx.auth.user.id,
        organizationId,
        locationId: ctx.locationId,
      },
      capability: "provider.manage",
    });

    const config = adConversionConfigSchema.parse({
      ...publicConfig(input),
      provider: input.provider,
    });
    const secret = encryptedSecretInput(input);
    const now = new Date();
    const saved = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: providerAccount.id })
        .from(providerAccount)
        .where(
          and(
            eq(providerAccount.organizationId, organizationId),
            exactLocationWhere(ctx.locationId),
            eq(providerAccount.provider, input.provider),
            eq(providerAccount.isDefault, true),
          ),
        )
        .limit(1)
        .for("update");

      if (!existing && !secret) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Provider credentials are required for a new account.",
        });
      }

      const values = {
        displayName: input.displayName,
        externalAccountId: externalAccountId(input),
        encryptedSecret: secret ? encrypt(JSON.stringify(secret)) : undefined,
        status: "ACTIVE",
        capabilities: ["ad.conversion.send"],
        config,
        lastErrorCode: null,
        updatedAt: now,
      };
      if (existing) {
        const [updated] = await tx
          .update(providerAccount)
          .set(values)
          .where(eq(providerAccount.id, existing.id))
          .returning();
        return updated;
      }

      const [created] = await tx
        .insert(providerAccount)
        .values({
          id: createId(),
          organizationId,
          locationId: ctx.locationId ?? null,
          provider: input.provider,
          displayName: input.displayName,
          externalAccountId: externalAccountId(input),
          encryptedSecret: encrypt(JSON.stringify(secret)),
          environment: "live",
          status: "ACTIVE",
          isDefault: true,
          capabilities: ["ad.conversion.send"],
          config,
          createdByUserId: ctx.auth.user.id,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      return created;
    });

    if (!saved) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to save the ad conversion account.",
      });
    }
    return toPublicProviderAccount(saved);
  });

function requireOrganization(ctx: ProviderContext): string {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Select an organization before managing provider accounts.",
    });
  }
  return ctx.orgId;
}

function exactLocationWhere(locationId: string | null) {
  return locationId
    ? eq(providerAccount.locationId, locationId)
    : isNull(providerAccount.locationId);
}

type SaveInput = z.infer<typeof saveAdConversionAccountSchema>;

function publicConfig(input: SaveInput): Record<string, string | boolean | null> {
  switch (input.provider) {
    case "META_CONVERSIONS":
      return {
        pixelId: input.pixelId,
        testEventCode: input.testEventCode || null,
        inheritToLocations: input.inheritToLocations,
      };
    case "GOOGLE_ADS":
      return {
        customerId: input.customerId,
        conversionActionId: input.conversionActionId,
        loginCustomerId: input.loginCustomerId || null,
        inheritToLocations: input.inheritToLocations,
      };
    case "TIKTOK_EVENTS":
      return {
        pixelCode: input.pixelCode,
        testEventCode: input.testEventCode || null,
        inheritToLocations: input.inheritToLocations,
      };
  }
}

function encryptedSecretInput(input: SaveInput): AdConversionSecret | null {
  switch (input.provider) {
    case "META_CONVERSIONS":
      return input.accessToken
        ? adConversionSecretSchema.parse({
            provider: input.provider,
            accessToken: input.accessToken,
          })
        : null;
    case "GOOGLE_ADS":
      return input.accessToken && input.developerToken
        ? adConversionSecretSchema.parse({
            provider: input.provider,
            accessToken: input.accessToken,
            developerToken: input.developerToken,
          })
        : null;
    case "TIKTOK_EVENTS":
      return input.accessToken
        ? adConversionSecretSchema.parse({
            provider: input.provider,
            accessToken: input.accessToken,
          })
        : null;
  }
}

function externalAccountId(input: SaveInput): string {
  switch (input.provider) {
    case "META_CONVERSIONS":
      return input.pixelId;
    case "GOOGLE_ADS":
      return input.customerId;
    case "TIKTOK_EVENTS":
      return input.pixelCode;
  }
}
