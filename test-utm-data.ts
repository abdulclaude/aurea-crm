import db from "./src/lib/db";

async function testUTMData() {
  console.log("=== Testing UTM Data Storage ===\n");

  // Get a recent session with UTM data
  const sessionWithUTM = await db.funnelSession.findFirst({
    where: {
      OR: [
        { firstSource: { not: null } },
        { firstMedium: { not: null } },
        { firstCampaign: { not: null } },
      ],
    },
    orderBy: { startedAt: "desc" },
    select: {
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
    const eventsWithUTM = await db.funnelEvent.findMany({
      where: { sessionId: sessionWithUTM.sessionId },
      select: {
        eventId: true,
        eventName: true,
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        timestamp: true,
      },
      orderBy: { timestamp: "asc" },
      take: 3,
    });

    console.log("2. FunnelEvents for this session:");
    console.log(eventsWithUTM);
    console.log("");
  }

  // Check if there are ANY sessions without UTM data that should show as "Direct"
  const directSessions = await db.funnelSession.count({
    where: {
      AND: [
        { firstSource: null },
        { firstMedium: null },
        { firstCampaign: null },
      ],
    },
  });

  console.log(`3. Sessions with NO UTM data (should show as Direct): ${directSessions}`);

  // Check sessions WITH UTM data
  const utmSessions = await db.funnelSession.count({
    where: {
      OR: [
        { firstSource: { not: null } },
        { firstMedium: { not: null } },
        { firstCampaign: { not: null } },
      ],
    },
  });

  console.log(`4. Sessions WITH UTM data: ${utmSessions}`);
  console.log("");

  // Get UTM breakdown
  const utmBreakdown = await db.funnelSession.groupBy({
    by: ["firstSource", "firstMedium", "firstCampaign"],
    _count: { id: true },
    orderBy: {
      _count: { id: "desc" },
    },
    take: 10,
  });

  console.log("5. UTM Source Breakdown (Top 10):");
  utmBreakdown.forEach((item) => {
    console.log(`   - Source: ${item.firstSource || "Direct"}, Medium: ${item.firstMedium || "None"}, Campaign: ${item.firstCampaign || "None"} → ${item._count.id} sessions`);
  });

  await db.$disconnect();
}

testUTMData().catch(console.error);
