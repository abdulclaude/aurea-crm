import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkEvents() {
  try {
    const funnelId = '27c30cbc-661f-450a-a227-9cdcc662c366';
    
    console.log('Checking events for TTR funnel...\n');
    
    // Count total events
    const totalEvents = await prisma.funnelEvent.count({
      where: { funnelId }
    });
    
    console.log(`Total events: ${totalEvents}`);
    
    // Get recent events
    const recentEvents = await prisma.funnelEvent.findMany({
      where: { funnelId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        eventName: true,
        createdAt: true,
        anonymousId: true,
        pageUrl: true,
      }
    });
    
    console.log('\nRecent events:');
    recentEvents.forEach((event, i) => {
      console.log(`  ${i + 1}. ${event.eventName} - ${event.createdAt.toISOString()}`);
      console.log(`     URL: ${event.pageUrl || 'N/A'}`);
      console.log(`     Anonymous ID: ${event.anonymousId}`);
    });
    
    // Check sessions
    const totalSessions = await prisma.funnelSession.count({
      where: { funnelId }
    });
    
    console.log(`\nTotal sessions: ${totalSessions}`);
    
    // Get recent sessions
    const recentSessions = await prisma.funnelSession.findMany({
      where: { funnelId },
      orderBy: { startedAt: 'desc' },
      take: 5,
      select: {
        sessionId: true,
        startedAt: true,
        pageViews: true,
        eventsCount: true,
        deviceType: true,
        browserName: true,
      }
    });
    
    console.log('\nRecent sessions:');
    recentSessions.forEach((session, i) => {
      console.log(`  ${i + 1}. Session ${session.sessionId.substring(0, 20)}...`);
      console.log(`     Started: ${session.startedAt.toISOString()}`);
      console.log(`     Events: ${session.eventsCount}, Page Views: ${session.pageViews}`);
      console.log(`     Device: ${session.deviceType || 'Unknown'}, Browser: ${session.browserName || 'Unknown'}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEvents();
