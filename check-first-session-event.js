import db from "./src/lib/db.js";

async function main() {
  const sessionId = '1767029292239_ayi80f4rb';
  
  console.log(`Checking FIRST event for session: ${sessionId}\n`);
  
  const firstEvent = await db.funnelEvent.findFirst({
    where: { sessionId },
    orderBy: { timestamp: 'asc' },
    select: {
      eventId: true,
      eventName: true,
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
      pageUrl: true,
      timestamp: true,
    }
  });
  
  console.log('FIRST EVENT:', {
    eventName: firstEvent?.eventName,
    timestamp: firstEvent?.timestamp,
    utmSource: firstEvent?.utmSource || 'NULL',
    utmMedium: firstEvent?.utmMedium || 'NULL',
    utmCampaign: firstEvent?.utmCampaign || 'NULL',
    url: firstEvent?.pageUrl,
  });
  
  const session = await db.funnelSession.findUnique({
    where: { sessionId },
    select: {
      firstSource: true,
      firstMedium: true,
      firstCampaign: true,
      startedAt: true,
    }
  });
  
  console.log('\nSESSION DATA:', {
    startedAt: session?.startedAt,
    firstSource: session?.firstSource || 'NULL',
    firstMedium: session?.firstMedium || 'NULL',
    firstCampaign: session?.firstCampaign || 'NULL',
  });
  
  await db.$disconnect();
}

main().catch(console.error);
