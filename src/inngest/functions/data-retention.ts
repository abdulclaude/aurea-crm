/**
 * Data Retention Cleanup - GDPR Compliance
 * Automatically deletes old analytics data and processes deletion requests
 */

import { inngest } from "../client";
import db from "@/lib/db";

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

      const result = await db.funnelSession.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      console.log(`[Data Retention] Deleted ${result.count} old sessions`);
      return result.count;
    });

    // Step 2: Delete old funnel events (orphaned or expired)
    const deletedEvents = await step.run("delete-old-events", async () => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days default retention

      const result = await db.funnelEvent.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      console.log(`[Data Retention] Deleted ${result.count} old events`);
      return result.count;
    });

    // Step 3: Delete old web vitals data
    const deletedWebVitals = await step.run("delete-old-web-vitals", async () => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days default retention

      const result = await db.funnelWebVital.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
        },
      });

      console.log(`[Data Retention] Deleted ${result.count} old web vitals`);
      return result.count;
    });

    // Step 4: Process user deletion requests
    const processedDeletions = await step.run("process-deletion-requests", async () => {
      // Find all anonymous user profiles with pending deletion requests
      const profiles = await db.anonymousUserProfile.findMany({
        where: {
          deletionRequestedAt: {
            not: null,
          },
        },
      });

      console.log(`[Data Retention] Found ${profiles.length} deletion requests to process`);

      let deletedCount = 0;

      for (const profile of profiles) {
        try {
          // Delete all associated data in a transaction
          await db.$transaction(async (tx) => {
            // Delete funnel events
            await tx.funnelEvent.deleteMany({
              where: { anonymousId: profile.id },
            });

            // Delete web vitals
            await tx.funnelWebVital.deleteMany({
              where: { anonymousId: profile.id },
            });

            // Delete sessions
            await tx.funnelSession.deleteMany({
              where: { anonymousId: profile.id },
            });

            // Delete the profile
            await tx.anonymousUserProfile.delete({
              where: { id: profile.id },
            });
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
      const orphanedProfiles = await db.anonymousUserProfile.findMany({
        where: {
          lastSeen: {
            lt: cutoffDate,
          },
          deletionRequestedAt: null, // Don't double-process deletion requests
        },
        select: {
          id: true,
        },
      });

      console.log(`[Data Retention] Found ${orphanedProfiles.length} orphaned profiles`);

      let deletedCount = 0;

      for (const profile of orphanedProfiles) {
        try {
          // Check if profile has any events or sessions
          const eventCount = await db.funnelEvent.count({
            where: { anonymousId: profile.id },
          });

          const sessionCount = await db.funnelSession.count({
            where: { anonymousId: profile.id },
          });

          // Only delete if truly orphaned
          if (eventCount === 0 && sessionCount === 0) {
            await db.anonymousUserProfile.delete({
              where: { id: profile.id },
            });
            deletedCount++;
          }
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
