import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import prisma from "@/lib/db";
import { createMindbodyClient } from "../lib/mindbody-client";
import { inngest } from "@/inngest/client";
import { encrypt } from "@/lib/encryption";
import { CredentialType } from "@prisma/client";

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

      // Require either organization or subaccount context
      if (!ctx.orgId && !ctx.subaccountId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You must be in an organization or subaccount context to connect Mindbody",
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
      const existingCredential = await prisma.credential.findFirst({
        where: {
          userId: ctx.auth.user.id,
          type: CredentialType.MINDBODY,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      let credential;
      if (existingCredential) {
        // Update existing credential
        credential = await prisma.credential.update({
          where: { id: existingCredential.id },
          data: {
            value: encrypt(credentialValue),
            metadata: {
              siteId: input.siteId,
            },
          },
        });
      } else {
        // Create new credential
        credential = await prisma.credential.create({
          data: {
            id: crypto.randomUUID(),
            name: "Mindbody",
            type: "MINDBODY" as const,
            userId: ctx.auth.user.id,
            subaccountId: ctx.subaccountId ?? null,
            value: encrypt(credentialValue),
            metadata: {
              siteId: input.siteId,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }

      // Store OAuth token in Apps table
      const app = await prisma.apps.upsert({
        where: {
          userId_provider: {
            userId: ctx.auth.user.id,
            provider: "MINDBODY",
          },
        },
        create: {
          id: crypto.randomUUID(),
          userId: ctx.auth.user.id,
          provider: "MINDBODY",
          accessToken: tokenResponse.AccessToken,
          refreshToken: tokenResponse.RefreshToken || null,
          expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour from now
          scopes: [],
          metadata: {
            credentialId: credential.id, // Link to credential
            organizationId: ctx.orgId,
            subaccountId: ctx.subaccountId,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        update: {
          accessToken: tokenResponse.AccessToken,
          refreshToken: tokenResponse.RefreshToken || null,
          expiresAt: new Date(Date.now() + 3600 * 1000),
          metadata: {
            credentialId: credential.id, // Link to credential
            organizationId: ctx.orgId,
            subaccountId: ctx.subaccountId,
          },
        },
      });

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
    const app = await prisma.apps.findFirst({
      where: {
        userId: ctx.auth.user.id,
        provider: "MINDBODY",
      },
    });

    if (app) {
      const metadata = app.metadata as any;
      const credentialId = metadata?.credentialId;

      // Delete the app
      await prisma.apps.deleteMany({
        where: {
          userId: ctx.auth.user.id,
          provider: "MINDBODY",
        },
      });

      // Delete the credential if it exists
      if (credentialId) {
        await prisma.credential.deleteMany({
          where: {
            id: credentialId,
            userId: ctx.auth.user.id,
          },
        });
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

    const app = await prisma.apps.findFirst({
      where: {
        userId: ctx.auth.user.id,
        provider: "MINDBODY",
      },
    });

    if (!app) {
      return null;
    }

    const metadata = app.metadata as any;
    return {
      connected: true,
      siteId: metadata?.siteId as string,
      connectedAt: app.createdAt,
      lastClientSync: metadata?.lastClientSync as string | undefined,
      lastClassSync: metadata?.lastClassSync as string | undefined,
      organizationId: metadata?.organizationId as string | undefined,
      subaccountId: metadata?.subaccountId as string | undefined,
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

    const app = await prisma.apps.findFirst({
      where: {
        userId: ctx.auth.user.id,
        provider: "MINDBODY",
      },
    });

    if (!app || !app.accessToken) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Mindbody connection not found",
      });
    }

    const metadata = app.metadata as any;
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

    const app = await prisma.apps.findFirst({
      where: {
        userId: ctx.auth.user.id,
        provider: "MINDBODY",
      },
    });

    if (!app) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Mindbody connection not found",
      });
    }

    const metadata = app.metadata as any;
    // Trigger Inngest function
    await inngest.send({
      name: "mindbody/sync.full",
      data: {
        appId: app.id,
        organizationId: metadata?.organizationId || ctx.orgId,
        subaccountId: metadata?.subaccountId || ctx.subaccountId,
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

    const app = await prisma.apps.findFirst({
      where: {
        userId: ctx.auth.user.id,
        provider: "MINDBODY",
      },
    });

    if (!app) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Mindbody connection not found",
      });
    }

    const metadata = app.metadata as any;
    // Trigger Inngest function
    await inngest.send({
      name: "mindbody/sync.clients",
      data: {
        appId: app.id,
        organizationId: metadata?.organizationId || ctx.orgId,
        subaccountId: metadata?.subaccountId || ctx.subaccountId,
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

    const app = await prisma.apps.findFirst({
      where: {
        userId: ctx.auth.user.id,
        provider: "MINDBODY",
      },
    });

    if (!app) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Mindbody connection not found",
      });
    }

    const metadata = app.metadata as any;
    const organizationId = ctx.orgId;
    const subaccountId = ctx.subaccountId; // Optional - can sync at org or subaccount level

    console.log('[Mindbody Router] Triggering class sync with:', {
      appId: app.id,
      organizationId,
      subaccountId,
      metadataOrgId: metadata?.organizationId,
      metadataSubaccountId: metadata?.subaccountId,
    });

    // Trigger Inngest function
    await inngest.send({
      name: "mindbody/sync.classes",
      data: {
        appId: app.id,
        organizationId,
        subaccountId: subaccountId || undefined, // Pass undefined instead of null
      },
    });

    return { success: true, message: "Classes sync job started" };
  }),

  /**
   * Sync a specific contact's bookings and memberships
   */
  syncContact: protectedProcedure
    .input(
      z.object({
        contactId: z.string(),
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

      const app = await prisma.apps.findFirst({
        where: {
          userId: ctx.auth.user.id,
          provider: "MINDBODY",
        },
      });

      if (!app) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Mindbody connection not found",
        });
      }

      const metadata = app.metadata as any;
      // Trigger Inngest function
      await inngest.send({
        name: "mindbody/sync.contact",
        data: {
          appId: app.id,
          organizationId: metadata?.organizationId || ctx.orgId,
          subaccountId: metadata?.subaccountId || ctx.subaccountId,
          contactId: input.contactId,
          mindbodyClientId: input.mindbodyClientId,
        },
      });

      return { success: true, message: "Contact sync job started" };
    }),
});
