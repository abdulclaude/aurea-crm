import { and, asc, count, desc, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db, dbPool } from "./src/db";
import { funnelEvent, funnelSession } from "./src/db/schema";

async function testUTMData() {
  console.log("=== Testing UTM Data Storage ===\n");

  // Get a recent session with UTM data
  const sessionWithUTM = await db.query.funnelSession.findFirst({
    where: or(
      isNotNull(funnelSession.firstSource),
      isNotNull(funnelSession.firstMedium),
      isNotNull(funnelSession.firstCampaign),
    ),
    orderBy: desc(funnelSession.startedAt),
    columns: {
      sessionId: true,
      firstSource: true,
      firstMedium: true,
      firstCampaign: true,
      startedAt: true,
    },
  });

  console.log("1. FunnelSession with UTM data:");
  console.log(sessionWithUTM);
  console.log("");

  if (sessionWithUTM) {
    // Get events for this session
    const eventsWithUTM = await db.query.funnelEvent.findMany({
      where: (event) => sql`${event.sessionId} = ${sessionWithUTM.sessionId}`,
      columns: {
        eventId: true,
        eventName: true,
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        timestamp: true,
      },
      orderBy: asc(funnelEvent.timestamp),
      limit: 3,
    });

    console.log("2. FunnelEvents for this session:");
    console.log(eventsWithUTM);
    console.log("");
  }

  // Check if there are ANY sessions without UTM data that should show as "Direct"
  const [{ value: directSessions }] = await db
    .select({ value: count() })
    .from(funnelSession)
    .where(
      and(
        isNull(funnelSession.firstSource),
        isNull(funnelSession.firstMedium),
        isNull(funnelSession.firstCampaign),
      ),
    );

  console.log(`3. Sessions with NO UTM data (should show as Direct): ${directSessions}`);

  // Check sessions WITH UTM data
  const [{ value: utmSessions }] = await db
    .select({ value: count() })
    .from(funnelSession)
    .where(
      or(
        isNotNull(funnelSession.firstSource),
        isNotNull(funnelSession.firstMedium),
        isNotNull(funnelSession.firstCampaign),
      ),
    );

  console.log(`4. Sessions WITH UTM data: ${utmSessions}`);
  console.log("");

  // Get UTM breakdown
  const utmBreakdown = await db
    .select({
      firstSource: funnelSession.firstSource,
      firstMedium: funnelSession.firstMedium,
      firstCampaign: funnelSession.firstCampaign,
      count: count(funnelSession.id),
    })
    .from(funnelSession)
    .groupBy(
      funnelSession.firstSource,
      funnelSession.firstMedium,
      funnelSession.firstCampaign,
    )
    .orderBy(desc(count(funnelSession.id)))
    .limit(10);

  console.log("5. UTM Source Breakdown (Top 10):");
  utmBreakdown.forEach((item) => {
    console.log(`   - Source: ${item.firstSource || "Direct"}, Medium: ${item.firstMedium || "None"}, Campaign: ${item.firstCampaign || "None"} → ${item.count} sessions`);
  });

  await dbPool.end();
}

testUTMData().catch(console.error);
