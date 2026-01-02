import db from "./src/lib/db.js";

async function main() {
  const sessionId = '1767029292239_ayi80f4rb';
  
  console.log(`All events for session: ${sessionId}\n`);
  
  const events = await db.funnelEvent.findMany({
    where: { sessionId },
    orderBy: { timestamp: 'asc' },
    select: {
      eventName: true,
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
      timestamp: true,
      serverTimestamp: true,
    }
  });
  
  console.log(`Total events: ${events.length}\n`);
  
  events.forEach((e, i) => {
    console.log(`${i + 1}. ${e.eventName} (${e.timestamp.toISOString()})`);
    console.log(`   Server: ${e.serverTimestamp.toISOString()}`);
    console.log(`   UTM: ${e.utmSource || 'NULL'} / ${e.utmMedium || 'NULL'} / ${e.utmCampaign || 'NULL'}`);
    console.log('');
  });
  
  await db.$disconnect();
}

main().catch(console.error);
