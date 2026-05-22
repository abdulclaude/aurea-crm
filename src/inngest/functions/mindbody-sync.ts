import { inngest } from "../client";
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { apps } from "@/db/schema";
import {
  fullMindbodySync,
  syncMindbodyClients,
  syncMindbodyClasses,
  syncClientBookingsAndMemberships,
} from "@/features/modules/pilates-studio/server/sync";
import type { JsonValue } from "@/db/json";

type MindbodySyncApp = Parameters<typeof fullMindbodySync>[0];
type MindbodyAppMetadata = {
  organizationId?: string;
  locationId?: string;
  lastClientSync?: string;
};

function metadataRecord(value: JsonValue | null): MindbodyAppMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as MindbodyAppMetadata;
}

function toMindbodySyncApp(app: typeof apps.$inferSelect): MindbodySyncApp {
  return {
    ...app,
    scopes: app.scopes ?? [],
    metadata: app.metadata as MindbodySyncApp["metadata"],
  };
}

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
    const { appId, organizationId, locationId } = event.data;

    const syncResult = await step.run("full-sync", async () => {
      const app = await db.query.apps.findFirst({
        where: eq(apps.id, appId),
      });

      if (!app) {
        throw new Error(`App ${appId} not found`);
      }

      if (!app.accessToken) {
        throw new Error("Mindbody not connected - missing access token");
      }

      return fullMindbodySync(toMindbodySyncApp(app), {
        organizationId,
        locationId,
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
    const { appId, organizationId, locationId, updatedAfter } = event.data;

    const syncResult = await step.run("sync-clients", async () => {
      const app = await db.query.apps.findFirst({
        where: eq(apps.id, appId),
      });

      if (!app) {
        throw new Error(`App ${appId} not found`);
      }

      return syncMindbodyClients(toMindbodySyncApp(app), {
        organizationId,
        locationId,
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
    const { appId, organizationId, locationId, startDate, endDate } = event.data;

    const app = await step.run("fetch-app", async () => {
      const foundApp = await db.query.apps.findFirst({
        where: eq(apps.id, appId),
      });

      if (!foundApp) {
        throw new Error(`App ${appId} not found`);
      }

      return foundApp;
    });

    const syncResult = await step.run("sync-classes", async () => {
      const app = await db.query.apps.findFirst({
        where: eq(apps.id, appId),
      });

      if (!app) {
        throw new Error(`App ${appId} not found`);
      }

      return syncMindbodyClasses(toMindbodySyncApp(app), {
        organizationId,
        locationId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });
    });

    return syncResult;
  },
);

/**
 * Sync bookings and memberships for a specific client
 */
export const mindbodyClientSync = inngest.createFunction(
  {
    id: "mindbody-client-sync",
    name: "Mindbody Client Sync",
    retries: 3,
  },
  { event: "mindbody/sync.client" },
  async ({ event, step }) => {
    const { appId, locationId, clientId, mindbodyClientId } =
      event.data;

    const app = await step.run("fetch-app", async () => {
      const foundApp = await db.query.apps.findFirst({
        where: eq(apps.id, appId),
      });

      if (!foundApp) {
        throw new Error(`App ${appId} not found`);
      }

      return foundApp;
    });

    const syncResult = await step.run("sync-client-data", async () => {
      const app = await db.query.apps.findFirst({
        where: eq(apps.id, appId),
      });

      if (!app) {
        throw new Error(`App ${appId} not found`);
      }

      return syncClientBookingsAndMemberships(
        toMindbodySyncApp(app),
        clientId,
        mindbodyClientId,
        { locationId },
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
      const mindbodyApps = await db.query.apps.findMany({
        where: and(eq(apps.provider, "MINDBODY"), isNotNull(apps.accessToken)),
        columns: {
          id: true,
          metadata: true,
        },
      });
      return mindbodyApps.map((app) => {
        const metadata = metadataRecord(app.metadata as JsonValue | null);
        return {
          id: app.id,
          organizationId: metadata.organizationId,
          locationId: metadata.locationId,
          lastClientSync: metadata.lastClientSync,
        };
      });
    });

    const results = [];

    for (const appInfo of appIds) {
      // Skip if we don't have either organizationId or locationId
      if (!appInfo.organizationId && !appInfo.locationId) continue;

      try {
        await step.run(`sync-${appInfo.id}`, async () => {
          // Fetch fresh app data
          const app = await db.query.apps.findFirst({
            where: eq(apps.id, appInfo.id),
          });

          if (!app) {
            throw new Error(`App ${appInfo.id} not found`);
          }

          // Get last sync time from metadata
          const lastSync = appInfo.lastClientSync
            ? new Date(appInfo.lastClientSync)
            : undefined;

          // Incremental sync for clients (only updated since last sync)
          await syncMindbodyClients(toMindbodySyncApp(app), {
            organizationId: appInfo.organizationId,
            locationId: appInfo.locationId,
            updatedAfter: lastSync,
          });

          // Always sync upcoming classes (next 7 days)
          await syncMindbodyClasses(toMindbodySyncApp(app), {
            organizationId: appInfo.organizationId,
            locationId: appInfo.locationId,
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
