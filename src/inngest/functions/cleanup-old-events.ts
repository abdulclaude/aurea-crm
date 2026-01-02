import { inngest } from "../client";
import db from "@/lib/db";

/**
 * Cleanup old funnel events based on data retention policy
 * 
 * Default retention: 90 days
 * Can be configured per organization/funnel in the future
 * 
 * Runs daily at 2 AM UTC
 */
export const cleanupOldEvents = inngest.createFunction(
  {
    id: "cleanup-old-funnel-events",
    retries: 2,
  },
  { cron: "0 2 * * *" }, // Every day at 2 AM UTC
  async ({ step }) => {
    // Step 1: Get all funnels with their retention policies
    const funnels = await step.run("get-funnels", async () => {
      return db.funnel.findMany({
        select: {
          id: true,
          name: true,
          organizationId: true,
        },
      });
    });

    let totalEventsDeleted = 0;
    let totalSessionsDeleted = 0;
    let totalProfilesDeleted = 0;

    // Step 2: Process each funnel
    for (const funnel of funnels) {
      const result = await step.run(`cleanup-funnel-${funnel.id}`, async () => {
        // TODO: In the future, fetch retention policy from organization settings
        // For now, use default 90 days
        const retentionDays = 90;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        console.log(
          `[Cleanup] Processing funnel ${funnel.name} (${funnel.id}) - deleting data older than ${cutoffDate.toISOString()}`
        );

        // Delete old events
        const deletedEvents = await db.funnelEvent.deleteMany({
          where: {
            funnelId: funnel.id,
            timestamp: {
              lt: cutoffDate,
            },
          },
        });

        // Delete old sessions (that have no recent events)
        const deletedSessions = await db.funnelSession.deleteMany({
          where: {
            funnelId: funnel.id,
            startedAt: {
              lt: cutoffDate,
            },
          },
        });

        // Clean up anonymous profiles that have no sessions left
        const orphanedProfiles = await db.anonymousUserProfile.findMany({
          where: {
            lastSeen: {
              lt: cutoffDate,
            },
            // Only delete if they have no recent sessions
            sessions: {
              none: {},
            },
          },
          select: {
            id: true,
          },
        });

        const deletedProfiles = await db.anonymousUserProfile.deleteMany({
          where: {
            id: {
              in: orphanedProfiles.map((p) => p.id),
            },
          },
        });

        console.log(
          `[Cleanup] Funnel ${funnel.name}: Deleted ${deletedEvents.count} events, ${deletedSessions.count} sessions, ${deletedProfiles.count} profiles`
        );

        return {
          funnelId: funnel.id,
          funnelName: funnel.name,
          eventsDeleted: deletedEvents.count,
          sessionsDeleted: deletedSessions.count,
          profilesDeleted: deletedProfiles.count,
        };
      });

      totalEventsDeleted += result.eventsDeleted;
      totalSessionsDeleted += result.sessionsDeleted;
      totalProfilesDeleted += result.profilesDeleted;
    }

    // Step 3: Log summary
    await step.run("log-summary", async () => {
      console.log(
        `[Cleanup] Complete - Processed ${funnels.length} funnels, deleted ${totalEventsDeleted} events, ${totalSessionsDeleted} sessions, ${totalProfilesDeleted} profiles`
      );

      return {
        funnelsProcessed: funnels.length,
        totalEventsDeleted,
        totalSessionsDeleted,
        totalProfilesDeleted,
      };
    });

    return {
      success: true,
      funnelsProcessed: funnels.length,
      totalEventsDeleted,
      totalSessionsDeleted,
      totalProfilesDeleted,
    };
  }
);
