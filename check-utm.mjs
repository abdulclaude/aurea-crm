import db from "./src/lib/db.js";

const sessions = await db.funnelSession.findMany({
  orderBy: { startedAt: 'desc' },
  take: 5,
  select: {
    sessionId: true,
    firstSource: true,
    firstMedium: true,
    firstCampaign: true,
    firstPageUrl: true,
    startedAt: true
  }
});

console.log('Recent sessions:');
sessions.forEach(s => {
  console.log(`Session: ${s.sessionId.substring(0, 20)}...`);
  console.log(`  Source: ${s.firstSource || 'NULL'}`);
  console.log(`  Medium: ${s.firstMedium || 'NULL'}`);
  console.log(`  Campaign: ${s.firstCampaign || 'NULL'}`);
  console.log(`  URL: ${s.firstPageUrl}`);
  console.log(`  Started: ${s.startedAt}`);
  console.log('');
});

// Also check the most recent events
const events = await db.funnelEvent.findMany({
  orderBy: { timestamp: 'desc' },
  take: 5,
  select: {
    eventId: true,
    eventName: true,
    utmSource: true,
    utmMedium: true,
    utmCampaign: true,
    pageUrl: true,
    timestamp: true
  }
});

console.log('\nRecent events:');
events.forEach(e => {
  console.log(`Event: ${e.eventName}`);
  console.log(`  Source: ${e.utmSource || 'NULL'}`);
  console.log(`  Medium: ${e.utmMedium || 'NULL'}`);
  console.log(`  Campaign: ${e.utmCampaign || 'NULL'}`);
  console.log(`  URL: ${e.pageUrl}`);
  console.log(`  Time: ${e.timestamp}`);
  console.log('');
});

await db.$disconnect();
process.exit(0);
