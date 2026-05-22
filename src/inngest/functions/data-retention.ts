/**
 * Data Retention Cleanup - GDPR Compliance
 * Automatically deletes old analytics data and processes deletion requests
 */

import { inngest } from "../client";
import { and, eq, isNotNull, lt, notExists } from "drizzle-orm";
import { db } from "@/db";
import {
  anonymousUserProfiles,
  funnelEvent,
  funnelSession,
  funnelWebVital,
} from "@/db/schema";

export const dataRetentionCleanup = inngest.createFunction(
  {
    id: "data-retention-cleanup",
    name: "Data Retention Cleanup",
  },
  { cron: "0 2 * * *" }, // Run daily at 2 AM UTC
  async ({ step }) => {
    console.log("[Data Retention] Starting cleanup job...");

    // Step 1: Delete old funnel sessions
    const deletedSessions = await step.run("delete-old-sessions", async () => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days default retention

      const result = await db
        .delete(funnelSession)
        .where(lt(funnelSession.createdAt, cutoffDate))
        .returning({ id: funnelSession.id });

      console.log(`[Data Retention] Deleted ${result.length} old sessions`);
      return result.length;
    });

    // Step 2: Delete old funnel events (orphaned or expired)
    const deletedEvents = await step.run("delete-old-events", async () => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days default retention

      const result = await db
        .delete(funnelEvent)
        .where(lt(funnelEvent.createdAt, cutoffDate))
        .returning({ id: funnelEvent.id });

      console.log(`[Data Retention] Deleted ${result.length} old events`);
      return result.length;
    });

    // Step 3: Delete old web vitals data
    const deletedWebVitals = await step.run("delete-old-web-vitals", async () => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days default retention

      const result = await db
        .delete(funnelWebVital)
        .where(lt(funnelWebVital.timestamp, cutoffDate))
        .returning({ id: funnelWebVital.id });

      console.log(`[Data Retention] Deleted ${result.length} old web vitals`);
      return result.length;
    });

    // Step 4: Process user deletion requests
    const processedDeletions = await step.run("process-deletion-requests", async () => {
      // Find all anonymous user profiles with pending deletion requests
      const profiles = await db.query.anonymousUserProfiles.findMany({
        where: isNotNull(anonymousUserProfiles.deletionRequestedAt),
      });

      console.log(`[Data Retention] Found ${profiles.length} deletion requests to process`);

      let deletedCount = 0;

      for (const profile of profiles) {
        try {
          // Delete all associated data in a transaction
          await db.transaction(async (tx) => {
            await tx.delete(funnelEvent).where(eq(funnelEvent.anonymousId, profile.id));
            await tx.delete(funnelWebVital).where(eq(funnelWebVital.anonymousId, profile.id));
            await tx.delete(funnelSession).where(eq(funnelSession.anonymousId, profile.id));
            await tx.delete(anonymousUserProfiles).where(eq(anonymousUserProfiles.id, profile.id));
          });

          deletedCount++;
          console.log(`[Data Retention] Processed deletion for profile ${profile.id}`);
        } catch (error) {
          console.error(`[Data Retention] Error deleting profile ${profile.id}:`, error);
        }
      }

      console.log(`[Data Retention] Processed ${deletedCount} deletion requests`);
      return deletedCount;
    });

    // Step 5: Clean up orphaned anonymous profiles (no recent activity)
    const cleanedProfiles = await step.run("cleanup-orphaned-profiles", async () => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 180); // 180 days for profiles without activity

      // Find profiles with no recent events or sessions
      const orphanedProfiles = await db.query.anonymousUserProfiles.findMany({
        where: and(
          lt(anonymousUserProfiles.lastSeen, cutoffDate),
          notExists(
            db
              .select({ id: funnelEvent.id })
              .from(funnelEvent)
              .where(eq(funnelEvent.anonymousId, anonymousUserProfiles.id))
          ),
          notExists(
            db
              .select({ id: funnelSession.id })
              .from(funnelSession)
              .where(eq(funnelSession.anonymousId, anonymousUserProfiles.id))
          )
        ),
        columns: { id: true },
      });

      console.log(`[Data Retention] Found ${orphanedProfiles.length} orphaned profiles`);

      let deletedCount = 0;

      for (const profile of orphanedProfiles) {
        try {
          await db
            .delete(anonymousUserProfiles)
            .where(eq(anonymousUserProfiles.id, profile.id));
          deletedCount++;
        } catch (error) {
          console.error(`[Data Retention] Error deleting orphaned profile ${profile.id}:`, error);
        }
      }

      console.log(`[Data Retention] Cleaned up ${deletedCount} orphaned profiles`);
      return deletedCount;
    });

    // Return summary
    return {
      success: true,
      summary: {
        deletedSessions,
        deletedEvents,
        deletedWebVitals,
        processedDeletions,
        cleanedProfiles,
      },
      timestamp: new Date().toISOString(),
    };
  }
);
