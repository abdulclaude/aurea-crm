import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { apps, credential } from "@/db/schema";
import { createMindbodyClient } from "../lib/mindbody-client";
import { inngest } from "@/inngest/client";
import { encrypt } from "@/lib/encryption";
import { AppProvider, CredentialType } from "@/db/enums";
import type { JsonObject } from "@/db/json";

const mindbodyMetadataSchema = z.object({
  credentialId: z.string().optional(),
  siteId: z.string().optional(),
  organizationId: z.string().nullable().optional(),
  locationId: z.string().nullable().optional(),
  lastClientSync: z.string().optional(),
  lastClassSync: z.string().optional(),
});

const readMindbodyMetadata = (metadata: unknown) =>
  mindbodyMetadataSchema.catch({}).parse(metadata);

const buildMindbodyMetadata = ({
  credentialId,
  organizationId,
  locationId,
  existing,
}: {
  credentialId: string;
  organizationId: string | null;
  locationId: string | null;
  existing?: unknown;
}): JsonObject => {
  const parsed = readMindbodyMetadata(existing);
  return {
    ...parsed,
    credentialId,
    organizationId,
    locationId,
  };
};

const findMindbodyApp = async (userId: string) =>
  await db.query.apps.findFirst({
    where: and(
      eq(apps.userId, userId),
      eq(apps.provider, AppProvider.MINDBODY),
    ),
  });

export const mindbodyRouter = createTRPCRouter({
  /**
   * Connect Mindbody account
   * Stores API key and Site ID in AppProvider table
   */
  connect: protectedProcedure
    .input(
      z.object({
        apiKey: z.string().min(1, "API Key is required"),
        siteId: z.string().min(1, "Site ID is required"),
        username: z.string().min(1, "Username is required"),
        password: z.string().min(1, "Password is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.auth?.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to connect Mindbody",
        });
      }

      // Require either organization or location context
      if (!ctx.orgId && !ctx.locationId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You must be in an organization or location context to connect Mindbody",
        });
      }

      // Generate OAuth token from credentials
      const client = createMindbodyClient({
        apiKey: input.apiKey,
        siteId: input.siteId,
      });

      // Get staff token using username/password
      const tokenResponse = await client.issueStaffToken(input.username, input.password);

      if (!tokenResponse || !tokenResponse.AccessToken) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Failed to authenticate with Mindbody. Please check your credentials.",
        });
      }

      // Test the connection with the token
      const isValid = await client.testConnection();
      if (!isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Failed to connect to Mindbody API. Please verify your credentials.",
        });
      }

      // Store credentials in the Credential table (uses existing encryption system)
      const credentialValue = JSON.stringify({
        apiKey: input.apiKey,
        siteId: input.siteId,
        username: input.username,
        password: input.password,
      });

      // Upsert credential
      const existingCredential = await db.query.credential.findFirst({
        where: and(
          eq(credential.userId, ctx.auth.user.id),
          eq(credential.type, CredentialType.MINDBODY),
          ctx.locationId
            ? eq(credential.locationId, ctx.locationId)
            : isNull(credential.locationId),
        ),
      });

      let selectedCredential;
      if (existingCredential) {
        // Update existing credential
        const [updatedCredential] = await db
          .update(credential)
          .set({
            value: encrypt(credentialValue),
            metadata: {
              siteId: input.siteId,
            },
            updatedAt: new Date(),
          })
          .where(eq(credential.id, existingCredential.id))
          .returning();
        selectedCredential = updatedCredential;
      } else {
        // Create new credential
        const [createdCredential] = await db
          .insert(credential)
          .values({
            id: crypto.randomUUID(),
            name: "Mindbody",
            type: CredentialType.MINDBODY,
            userId: ctx.auth.user.id,
            locationId: ctx.locationId ?? null,
            value: encrypt(credentialValue),
            metadata: {
              siteId: input.siteId,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        selectedCredential = createdCredential;
      }

      // Store OAuth token in Apps table
      const [app] = await db
        .insert(apps)
        .values({
          id: crypto.randomUUID(),
          userId: ctx.auth.user.id,
          provider: AppProvider.MINDBODY,
          accessToken: tokenResponse.AccessToken,
          refreshToken: tokenResponse.RefreshToken || null,
          expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour from now
          scopes: [],
          metadata: {
            credentialId: selectedCredential.id,
            organizationId: ctx.orgId,
            locationId: ctx.locationId,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [apps.userId, apps.provider],
          set: {
          accessToken: tokenResponse.AccessToken,
          refreshToken: tokenResponse.RefreshToken || null,
          expiresAt: new Date(Date.now() + 3600 * 1000),
          metadata: buildMindbodyMetadata({
            credentialId: selectedCredential.id,
            organizationId: ctx.orgId,
            locationId: ctx.locationId,
          }),
          updatedAt: new Date(),
          },
        })
        .returning();

      return { success: true, app };
    }),

  /**
   * Disconnect Mindbody account
   */
  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.auth?.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in",
      });
    }

    // Delete both the app and credential
    const app = await findMindbodyApp(ctx.auth.user.id);

    if (app) {
      const metadata = readMindbodyMetadata(app.metadata);
      const credentialId = metadata?.credentialId;

      // Delete the app
      await db
        .delete(apps)
        .where(
          and(
            eq(apps.userId, ctx.auth.user.id),
            eq(apps.provider, AppProvider.MINDBODY),
          ),
        );

      // Delete the credential if it exists
      if (credentialId) {
        await db
          .delete(credential)
          .where(
            and(
              eq(credential.id, credentialId),
              eq(credential.userId, ctx.auth.user.id),
            ),
          );
      }
    }

    return { success: true };
  }),

  /**
   * Get current Mindbody connection status
   */
  getConnection: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.auth?.user) {
      return null;
    }

    const app = await findMindbodyApp(ctx.auth.user.id);

    if (!app) {
      return null;
    }

    const metadata = readMindbodyMetadata(app.metadata);
    return {
      connected: true,
      siteId: metadata?.siteId as string,
      connectedAt: app.createdAt,
      lastClientSync: metadata?.lastClientSync as string | undefined,
      lastClassSync: metadata?.lastClassSync as string | undefined,
      organizationId: metadata?.organizationId as string | undefined,
      locationId: metadata?.locationId as string | undefined,
    };
  }),

  /**
   * Test Mindbody connection
   */
  testConnection: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.auth?.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in",
      });
    }

    const app = await findMindbodyApp(ctx.auth.user.id);

    if (!app || !app.accessToken) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Mindbody connection not found",
      });
    }

    const metadata = readMindbodyMetadata(app.metadata);
    const client = createMindbodyClient({
      apiKey: app.accessToken,
      siteId: metadata?.siteId as string,
    });

    const isValid = await client.testConnection();

    return { success: isValid };
  }),

  /**
   * Trigger full sync from Mindbody
   */
  triggerFullSync: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.auth?.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in",
      });
    }

    const app = await findMindbodyApp(ctx.auth.user.id);

    if (!app) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Mindbody connection not found",
      });
    }

    const metadata = readMindbodyMetadata(app.metadata);
    // Trigger Inngest function
    await inngest.send({
      name: "mindbody/sync.full",
      data: {
        appId: app.id,
        organizationId: metadata?.organizationId || ctx.orgId,
        locationId: metadata?.locationId || ctx.locationId,
      },
    });

    return { success: true, message: "Sync job started" };
  }),

  /**
   * Trigger clients sync only
   */
  triggerClientsSync: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.auth?.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in",
      });
    }

    const app = await findMindbodyApp(ctx.auth.user.id);

    if (!app) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Mindbody connection not found",
      });
    }

    const metadata = readMindbodyMetadata(app.metadata);
    // Trigger Inngest function
    await inngest.send({
      name: "mindbody/sync.clients",
      data: {
        appId: app.id,
        organizationId: metadata?.organizationId || ctx.orgId,
        locationId: metadata?.locationId || ctx.locationId,
      },
    });

    return { success: true, message: "Client sync job started" };
  }),

  /**
   * Trigger classes sync only
   */
  triggerClassesSync: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.auth?.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in",
      });
    }

    // Require organization context for class syncing
    if (!ctx.orgId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You must be in an organization context to sync classes.",
      });
    }

    const app = await findMindbodyApp(ctx.auth.user.id);

    if (!app) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Mindbody connection not found",
      });
    }

    const metadata = readMindbodyMetadata(app.metadata);
    const organizationId = ctx.orgId;
    const locationId = ctx.locationId; // Optional - can sync at org or location level

    console.log('[Mindbody Router] Triggering class sync with:', {
      appId: app.id,
      organizationId,
      locationId,
      metadataOrgId: metadata?.organizationId,
      metadataLocationId: metadata?.locationId,
    });

    // Trigger Inngest function
    await inngest.send({
      name: "mindbody/sync.classes",
      data: {
        appId: app.id,
        organizationId,
        locationId: locationId || undefined, // Pass undefined instead of null
      },
    });

    return { success: true, message: "Classes sync job started" };
  }),

  /**
   * Sync a specific client's bookings and memberships
   */
  syncClient: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        mindbodyClientId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.auth?.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in",
        });
      }

      const app = await findMindbodyApp(ctx.auth.user.id);

      if (!app) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Mindbody connection not found",
        });
      }

      const metadata = readMindbodyMetadata(app.metadata);
      // Trigger Inngest function
      await inngest.send({
        name: "mindbody/sync.client",
        data: {
          appId: app.id,
          organizationId: metadata?.organizationId || ctx.orgId,
          locationId: metadata?.locationId || ctx.locationId,
          clientId: input.clientId,
          mindbodyClientId: input.mindbodyClientId,
        },
      });

      return { success: true, message: "Client sync job started" };
    }),
});
