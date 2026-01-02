import db from "./src/lib/db.js";

async function main() {
console.log("Checking recent events and sessions for UTM data...\n");

// Check recent events
const recentEvents = await db.funnelEvent.findMany({
  orderBy: { timestamp: 'desc' },
  take: 3,
  select: {
    eventId: true,
    eventName: true,
    utmSource: true,
    utmMedium: true,
    utmCampaign: true,
    pageUrl: true,
    timestamp: true,
    sessionId: true,
  }
});

console.log("=== RECENT EVENTS ===");
recentEvents.forEach((e, i) => {
  console.log(`\n${i + 1}. Event: ${e.eventName} (${e.timestamp.toISOString()})`);
  console.log(`   Session: ${e.sessionId}`);
  console.log(`   UTM Source: ${e.utmSource || 'NULL'}`);
  console.log(`   UTM Medium: ${e.utmMedium || 'NULL'}`);
  console.log(`   UTM Campaign: ${e.utmCampaign || 'NULL'}`);
  console.log(`   URL: ${e.pageUrl}`);
});

// Check recent sessions
const recentSessions = await db.funnelSession.findMany({
  orderBy: { startedAt: 'desc' },
  take: 3,
  select: {
    sessionId: true,
    firstSource: true,
    firstMedium: true,
    firstCampaign: true,
    firstPageUrl: true,
    startedAt: true,
  }
});

console.log("\n\n=== RECENT SESSIONS ===");
recentSessions.forEach((s, i) => {
  console.log(`\n${i + 1}. Session: ${s.sessionId.substring(0, 30)}... (${s.startedAt.toISOString()})`);
  console.log(`   First Source: ${s.firstSource || 'NULL'}`);
  console.log(`   First Medium: ${s.firstMedium || 'NULL'}`);
  console.log(`   First Campaign: ${s.firstCampaign || 'NULL'}`);
  console.log(`   URL: ${s.firstPageUrl}`);
});

await db.$disconnect();
}

main().catch(console.error);
