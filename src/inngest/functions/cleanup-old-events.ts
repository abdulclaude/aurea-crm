import { inngest } from "../client";
import { and, eq, lt, notExists } from "drizzle-orm";
import { db } from "@/db";
import {
  anonymousUserProfiles,
  funnel,
  funnelEvent,
  funnelSession,
} from "@/db/schema";

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
      return db
        .select({
          id: funnel.id,
          name: funnel.name,
          organizationId: funnel.organizationId,
        })
        .from(funnel);
    });

    let totalEventsDeleted = 0;
    let totalSessionsDeleted = 0;
    let totalProfilesDeleted = 0;

    // Step 2: Process each funnel
    for (const funnel of funnels) {
      const result = await step.run(`cleanup-funnel-${funnel.id}`, async () => {
        const retentionDays = 90;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        console.log(
          `[Cleanup] Processing funnel ${funnel.name} (${funnel.id}) - deleting data older than ${cutoffDate.toISOString()}`
        );

        // Delete old events
        const deletedEvents = await db
          .delete(funnelEvent)
          .where(
            and(
              eq(funnelEvent.funnelId, funnel.id),
              lt(funnelEvent.timestamp, cutoffDate)
            )
          )
          .returning({ id: funnelEvent.id });

        // Delete old sessions (that have no recent events)
        const deletedSessions = await db
          .delete(funnelSession)
          .where(
            and(
              eq(funnelSession.funnelId, funnel.id),
              lt(funnelSession.startedAt, cutoffDate)
            )
          )
          .returning({ id: funnelSession.id });

        // Clean up anonymous profiles that have no sessions left
        const deletedProfiles = await db
          .delete(anonymousUserProfiles)
          .where(
            and(
              lt(anonymousUserProfiles.lastSeen, cutoffDate),
              notExists(
                db
                  .select({ id: funnelSession.id })
                  .from(funnelSession)
                  .where(eq(funnelSession.profileId, anonymousUserProfiles.id))
              )
            )
          )
          .returning({ id: anonymousUserProfiles.id });

        console.log(
          `[Cleanup] Funnel ${funnel.name}: Deleted ${deletedEvents.length} events, ${deletedSessions.length} sessions, ${deletedProfiles.length} profiles`
        );

        return {
          funnelId: funnel.id,
          funnelName: funnel.name,
          eventsDeleted: deletedEvents.length,
          sessionsDeleted: deletedSessions.length,
          profilesDeleted: deletedProfiles.length,
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
