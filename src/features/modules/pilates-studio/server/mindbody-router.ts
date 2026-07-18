import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { AppProvider, CredentialType } from "@/db/enums";
import type { JsonObject } from "@/db/json";
import { apps, client, credential } from "@/db/schema";
import { requireCapability } from "@/features/permissions/server/authorization";
import { inngest } from "@/inngest/client";
import { encrypt } from "@/lib/encryption";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { createMindbodyAPI } from "../lib/mindbody-api";
import { createMindbodyClient } from "../lib/mindbody-client";

type MindbodyContext = {
  auth: { user: { id: string } };
  orgId: string | null;
  locationId: string | null;
};

const mindbodyMetadataSchema = z.object({
  credentialId: z.string().optional(),
  siteId: z.string().optional(),
  lastClientSync: z.string().optional(),
  lastClassSync: z.string().optional(),
});

const readMindbodyMetadata = (metadata: unknown) =>
  mindbodyMetadataSchema.catch({}).parse(metadata);

const buildMindbodyMetadata = ({
  credentialId,
  siteId,
  existing,
}: {
  credentialId: string;
  siteId: string;
  existing?: unknown;
}): JsonObject => ({
  ...readMindbodyMetadata(existing),
  credentialId,
  siteId,
});

function requireOrganization(ctx: MindbodyContext): string {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select an organization before managing Mindbody.",
    });
  }
  return ctx.orgId;
}

async function requireMindbodyManagement(
  ctx: MindbodyContext,
): Promise<string> {
  const organizationId = requireOrganization(ctx);
  await requireCapability({
    actor: {
      userId: ctx.auth.user.id,
      organizationId,
      locationId: ctx.locationId,
    },
    capability: "provider.manage",
  });
  return organizationId;
}

function appLocationCondition(locationId: string | null) {
  return locationId
    ? eq(apps.locationId, locationId)
    : isNull(apps.locationId);
}

function credentialLocationCondition(locationId: string | null) {
  return locationId
    ? eq(credential.locationId, locationId)
    : isNull(credential.locationId);
}

async function findMindbodyApp(
  organizationId: string,
  locationId: string | null,
) {
  return db.query.apps.findFirst({
    where: and(
      eq(apps.organizationId, organizationId),
      appLocationCondition(locationId),
      eq(apps.provider, AppProvider.MINDBODY),
    ),
  });
}

function mindbodyEventScope(app: {
  organizationId: string;
  locationId: string | null;
}) {
  return {
    organizationId: app.organizationId,
    locationId: app.locationId ?? undefined,
  };
}

export const mindbodyRouter = createTRPCRouter({
  connect: protectedProcedure
    .input(
      z.object({
        apiKey: z.string().trim().min(1, "API Key is required"),
        siteId: z.string().trim().min(1, "Site ID is required"),
        username: z.string().trim().min(1, "Username is required"),
        password: z.string().min(1, "Password is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = await requireMindbodyManagement(ctx);
      const mindbodyClient = createMindbodyClient({
        apiKey: input.apiKey,
        siteId: input.siteId,
      });
      const tokenResponse = await mindbodyClient.issueStaffToken(
        input.username,
        input.password,
      );

      if (!tokenResponse.AccessToken || !(await mindbodyClient.testConnection())) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to authenticate with Mindbody. Check the supplied credentials.",
        });
      }

      const credentialValue = encrypt(
        JSON.stringify({
          apiKey: input.apiKey,
          siteId: input.siteId,
          username: input.username,
          password: input.password,
        }),
      );
      const encryptedAccessToken = encrypt(tokenResponse.AccessToken);
      const encryptedRefreshToken = tokenResponse.RefreshToken
        ? encrypt(tokenResponse.RefreshToken)
        : null;
      const expiresAt = new Date(
        Date.now() + Math.max(tokenResponse.ExpiresIn || 3600, 60) * 1000,
      );

      await db.transaction(async (tx) => {
        const [existingCredential] = await tx
          .select({ id: credential.id })
          .from(credential)
          .where(
            and(
              eq(credential.organizationId, organizationId),
              credentialLocationCondition(ctx.locationId),
              eq(credential.type, CredentialType.MINDBODY),
            ),
          )
          .limit(1);

        const credentialId = existingCredential?.id ?? crypto.randomUUID();
        if (existingCredential) {
          await tx
            .update(credential)
            .set({
              name: "Mindbody",
              value: credentialValue,
              metadata: { siteId: input.siteId },
              isActive: true,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(credential.id, credentialId),
                eq(credential.organizationId, organizationId),
                credentialLocationCondition(ctx.locationId),
                eq(credential.type, CredentialType.MINDBODY),
              ),
            );
        } else {
          await tx.insert(credential).values({
            id: credentialId,
            organizationId,
            name: "Mindbody",
            type: CredentialType.MINDBODY,
            userId: ctx.auth.user.id,
            locationId: ctx.locationId,
            value: credentialValue,
            metadata: { siteId: input.siteId },
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        const [existingApp] = await tx
          .select({ id: apps.id, metadata: apps.metadata })
          .from(apps)
          .where(
            and(
              eq(apps.organizationId, organizationId),
              appLocationCondition(ctx.locationId),
              eq(apps.provider, AppProvider.MINDBODY),
            ),
          )
          .limit(1);
        const metadata = buildMindbodyMetadata({
          credentialId,
          siteId: input.siteId,
          existing: existingApp?.metadata,
        });

        if (existingApp) {
          await tx
            .update(apps)
            .set({
              accessToken: encryptedAccessToken,
              refreshToken: encryptedRefreshToken,
              expiresAt,
              scopes: [],
              metadata,
              userId: ctx.auth.user.id,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(apps.id, existingApp.id),
                eq(apps.organizationId, organizationId),
                appLocationCondition(ctx.locationId),
                eq(apps.provider, AppProvider.MINDBODY),
              ),
            );
        } else {
          await tx.insert(apps).values({
            id: crypto.randomUUID(),
            organizationId,
            locationId: ctx.locationId,
            userId: ctx.auth.user.id,
            provider: AppProvider.MINDBODY,
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            expiresAt,
            scopes: [],
            metadata,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      });

      return { success: true };
    }),

  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    const organizationId = await requireMindbodyManagement(ctx);
    await db.transaction(async (tx) => {
      const [app] = await tx
        .select({ id: apps.id, metadata: apps.metadata })
        .from(apps)
        .where(
          and(
            eq(apps.organizationId, organizationId),
            appLocationCondition(ctx.locationId),
            eq(apps.provider, AppProvider.MINDBODY),
          ),
        )
        .limit(1);

      if (!app) return;
      const credentialId = readMindbodyMetadata(app.metadata).credentialId;
      await tx
        .delete(apps)
        .where(
          and(
            eq(apps.id, app.id),
            eq(apps.organizationId, organizationId),
            appLocationCondition(ctx.locationId),
            eq(apps.provider, AppProvider.MINDBODY),
          ),
        );
      if (credentialId) {
        await tx
          .delete(credential)
          .where(
            and(
              eq(credential.id, credentialId),
              eq(credential.organizationId, organizationId),
              credentialLocationCondition(ctx.locationId),
              eq(credential.type, CredentialType.MINDBODY),
            ),
          );
      }
    });
    return { success: true };
  }),

  getConnection: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.orgId) return null;
    const app = await findMindbodyApp(ctx.orgId, ctx.locationId);
    if (!app) return null;
    const metadata = readMindbodyMetadata(app.metadata);
    return {
      connected: true,
      siteId: metadata.siteId ?? null,
      connectedAt: app.createdAt,
      lastClientSync: metadata.lastClientSync,
      lastClassSync: metadata.lastClassSync,
      organizationId: app.organizationId,
      locationId: app.locationId,
    };
  }),

  testConnection: protectedProcedure.mutation(async ({ ctx }) => {
    const organizationId = await requireMindbodyManagement(ctx);
    const app = await findMindbodyApp(organizationId, ctx.locationId);
    if (!app) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Mindbody connection not found",
      });
    }
    const api = await createMindbodyAPI(app);
    if (!(await api.testConnection())) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Mindbody connection test failed. Reconnect the account.",
      });
    }
    return { success: true };
  }),

  triggerFullSync: protectedProcedure.mutation(async ({ ctx }) => {
    const organizationId = await requireMindbodyManagement(ctx);
    const app = await findMindbodyApp(organizationId, ctx.locationId);
    if (!app) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Mindbody connection not found" });
    }
    await inngest.send({
      name: "mindbody/sync.full",
      data: { appId: app.id, ...mindbodyEventScope(app) },
    });
    return { success: true, message: "Sync job started" };
  }),

  triggerClientsSync: protectedProcedure.mutation(async ({ ctx }) => {
    const organizationId = await requireMindbodyManagement(ctx);
    const app = await findMindbodyApp(organizationId, ctx.locationId);
    if (!app) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Mindbody connection not found" });
    }
    await inngest.send({
      name: "mindbody/sync.clients",
      data: { appId: app.id, ...mindbodyEventScope(app) },
    });
    return { success: true, message: "Client sync job started" };
  }),

  triggerClassesSync: protectedProcedure.mutation(async ({ ctx }) => {
    const organizationId = await requireMindbodyManagement(ctx);
    const app = await findMindbodyApp(organizationId, ctx.locationId);
    if (!app) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Mindbody connection not found" });
    }
    await inngest.send({
      name: "mindbody/sync.classes",
      data: { appId: app.id, ...mindbodyEventScope(app) },
    });
    return { success: true, message: "Classes sync job started" };
  }),

  syncClient: protectedProcedure
    .input(
      z.object({
        clientId: z.string().min(1),
        mindbodyClientId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = await requireMindbodyManagement(ctx);
      const [app, scopedClient] = await Promise.all([
        findMindbodyApp(organizationId, ctx.locationId),
        db.query.client.findFirst({
          where: and(
            eq(client.id, input.clientId),
            eq(client.organizationId, organizationId),
            ctx.locationId
              ? eq(client.locationId, ctx.locationId)
              : isNull(client.locationId),
          ),
          columns: { id: true },
        }),
      ]);
      if (!app) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Mindbody connection not found" });
      }
      if (!scopedClient) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }
      await inngest.send({
        name: "mindbody/sync.client",
        data: {
          appId: app.id,
          ...mindbodyEventScope(app),
          clientId: scopedClient.id,
          mindbodyClientId: input.mindbodyClientId,
        },
      });
      return { success: true, message: "Client sync job started" };
    }),
});
