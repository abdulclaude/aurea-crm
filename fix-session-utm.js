import db from "./src/lib/db.js";

async function main() {
  console.log("Fixing sessions with NULL UTM but events with UTM data...\n");
  
  // Find sessions with NULL firstSource
  const sessionsToFix = await db.funnelSession.findMany({
    where: {
      firstSource: null,
    },
    select: {
      sessionId: true,
    }
  });
  
  console.log(`Found ${sessionsToFix.length} sessions with NULL firstSource\n`);
  
  for (const session of sessionsToFix) {
    // Find first event for this session
    const firstEvent = await db.funnelEvent.findFirst({
      where: { sessionId: session.sessionId },
      orderBy: { timestamp: 'asc' },
      select: {
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        referrer: true,
      }
    });
    
    if (!firstEvent) continue;
    
    // Update session with UTM data from first event
    await db.funnelSession.update({
      where: { sessionId: session.sessionId },
      data: {
        firstSource: firstEvent.utmSource,
        firstMedium: firstEvent.utmMedium,
        firstCampaign: firstEvent.utmCampaign,
        firstReferrer: firstEvent.referrer,
      }
    });
    
    console.log(`✓ Fixed session ${session.sessionId.substring(0, 20)}... → ${firstEvent.utmSource || 'Direct'}`);
  }
  
  console.log(`\nDone! Fixed ${sessionsToFix.length} sessions.`);
  
  await db.$disconnect();
}

main().catch(console.error);
