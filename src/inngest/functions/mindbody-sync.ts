import { inngest } from "../client";
import prisma from "@/lib/db";
import {
  fullMindbodySync,
  syncMindbodyClients,
  syncMindbodyClasses,
  syncClientBookingsAndMemberships,
} from "@/features/modules/pilates-studio/server/sync";

/**
 * Full Mindbody sync - syncs all data from Mindbody
 */
export const mindbodyFullSync = inngest.createFunction(
  {
    id: "mindbody-full-sync",
    name: "Mindbody Full Sync",
    retries: 3,
  },
  { event: "mindbody/sync.full" },
  async ({ event, step }) => {
    const { appId, organizationId, subaccountId } = event.data;

    const syncResult = await step.run("full-sync", async () => {
      const app = await prisma.apps.findUnique({
        where: { id: appId },
      });

      if (!app) {
        throw new Error(`App ${appId} not found`);
      }

      if (!app.accessToken) {
        throw new Error("Mindbody not connected - missing access token");
      }

      return fullMindbodySync(app, {
        organizationId,
        subaccountId,
      });
    });

    await step.run("log-results", async () => {
      console.log("Mindbody Full Sync Results:", {
        clients: {
          synced: syncResult.clients.synced,
          created: syncResult.clients.created,
          updated: syncResult.clients.updated,
          errors: syncResult.clients.errors.length,
        },
        classes: {
          synced: syncResult.classes.synced,
          created: syncResult.classes.created,
          updated: syncResult.classes.updated,
          errors: syncResult.classes.errors.length,
        },
        bookingsAndMemberships: {
          synced: syncResult.bookingsAndMemberships.synced,
          errors: syncResult.bookingsAndMemberships.errors.length,
        },
      });
    });

    return syncResult;
  },
);

/**
 * Sync only Mindbody clients
 */
export const mindbodyClientsSync = inngest.createFunction(
  {
    id: "mindbody-clients-sync",
    name: "Mindbody Clients Sync",
    retries: 3,
  },
  { event: "mindbody/sync.clients" },
  async ({ event, step }) => {
    const { appId, organizationId, subaccountId, updatedAfter } = event.data;

    const syncResult = await step.run("sync-clients", async () => {
      const app = await prisma.apps.findUnique({
        where: { id: appId },
      });

      if (!app) {
        throw new Error(`App ${appId} not found`);
      }

      return syncMindbodyClients(app, {
        organizationId,
        subaccountId,
        updatedAfter: updatedAfter ? new Date(updatedAfter) : undefined,
      });
    });

    return syncResult;
  },
);

/**
 * Sync only Mindbody classes
 */
export const mindbodyClassesSync = inngest.createFunction(
  {
    id: "mindbody-classes-sync",
    name: "Mindbody Classes Sync",
    retries: 3,
  },
  { event: "mindbody/sync.classes" },
  async ({ event, step }) => {
    const { appId, organizationId, subaccountId, startDate, endDate } = event.data;

    const app = await step.run("fetch-app", async () => {
      const foundApp = await prisma.apps.findUnique({
        where: { id: appId },
      });

      if (!foundApp) {
        throw new Error(`App ${appId} not found`);
      }

      return foundApp;
    });

    const syncResult = await step.run("sync-classes", async () => {
      const app = await prisma.apps.findUnique({
        where: { id: appId },
      });

      if (!app) {
        throw new Error(`App ${appId} not found`);
      }

      return syncMindbodyClasses(app, {
        organizationId,
        subaccountId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });
    });

    return syncResult;
  },
);

/**
 * Sync bookings and memberships for a specific contact
 */
export const mindbodyContactSync = inngest.createFunction(
  {
    id: "mindbody-contact-sync",
    name: "Mindbody Contact Sync",
    retries: 3,
  },
  { event: "mindbody/sync.contact" },
  async ({ event, step }) => {
    const { appId, subaccountId, contactId, mindbodyClientId } =
      event.data;

    const app = await step.run("fetch-app", async () => {
      const foundApp = await prisma.apps.findUnique({
        where: { id: appId },
      });

      if (!foundApp) {
        throw new Error(`App ${appId} not found`);
      }

      return foundApp;
    });

    const syncResult = await step.run("sync-contact-data", async () => {
      const app = await prisma.apps.findUnique({
        where: { id: appId },
      });

      if (!app) {
        throw new Error(`App ${appId} not found`);
      }

      return syncClientBookingsAndMemberships(
        app,
        contactId,
        mindbodyClientId,
        { subaccountId },
      );
    });

    return syncResult;
  },
);

/**
 * Scheduled job to sync Mindbody data periodically
 */
export const mindbodyScheduledSync = inngest.createFunction(
  {
    id: "mindbody-scheduled-sync",
    name: "Mindbody Scheduled Sync",
  },
  { cron: "0 3 * * *" }, // Run daily at 3 AM instead of every 4 hours (83% reduction)
  async ({ step }) => {
    const appIds = await step.run("fetch-mindbody-apps", async () => {
      const apps = await prisma.apps.findMany({
        where: {
          provider: "MINDBODY",
          accessToken: { not: null },
        },
        select: {
          id: true,
          metadata: true,
        },
      });
      return apps.map((app) => ({
        id: app.id,
        organizationId: (app.metadata as any)?.organizationId as string | undefined,
        subaccountId: (app.metadata as any)?.subaccountId as string | undefined,
        lastClientSync: (app.metadata as any)?.lastClientSync as
          | string
          | undefined,
      }));
    });

    const results = [];

    for (const appInfo of appIds) {
      // Skip if we don't have either organizationId or subaccountId
      if (!appInfo.organizationId && !appInfo.subaccountId) continue;

      try {
        await step.run(`sync-${appInfo.id}`, async () => {
          // Fetch fresh app data
          const app = await prisma.apps.findUnique({
            where: { id: appInfo.id },
          });

          if (!app) {
            throw new Error(`App ${appInfo.id} not found`);
          }

          // Get last sync time from metadata
          const lastSync = appInfo.lastClientSync
            ? new Date(appInfo.lastClientSync)
            : undefined;

          // Incremental sync for clients (only updated since last sync)
          await syncMindbodyClients(app, {
            organizationId: appInfo.organizationId,
            subaccountId: appInfo.subaccountId,
            updatedAfter: lastSync,
          });

          // Always sync upcoming classes (next 7 days)
          await syncMindbodyClasses(app, {
            organizationId: appInfo.organizationId,
            subaccountId: appInfo.subaccountId,
            startDate: new Date(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          });

          return { success: true, appId: app.id };
        });

        results.push({ appId: appInfo.id, success: true });
      } catch (error) {
        results.push({
          appId: appInfo.id,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { totalSynced: results.length, results };
  },
);
