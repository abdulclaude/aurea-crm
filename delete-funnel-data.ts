import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteFunnelData() {
  console.log('🗑️  Starting deletion of funnel tracking data...\n');

  try {
    // Delete in order to respect foreign key constraints
    
    console.log('1️⃣  Deleting FunnelWebVital records...');
    const webVitalsDeleted = await prisma.funnelWebVital.deleteMany({});
    console.log(`   ✅ Deleted ${webVitalsDeleted.count} FunnelWebVital records\n`);

    console.log('2️⃣  Deleting FunnelEvent records...');
    const eventsDeleted = await prisma.funnelEvent.deleteMany({});
    console.log(`   ✅ Deleted ${eventsDeleted.count} FunnelEvent records\n`);

    console.log('3️⃣  Deleting FunnelSession records...');
    const sessionsDeleted = await prisma.funnelSession.deleteMany({});
    console.log(`   ✅ Deleted ${sessionsDeleted.count} FunnelSession records\n`);

    console.log('4️⃣  Deleting AnonymousUserProfile records...');
    const profilesDeleted = await prisma.anonymousUserProfile.deleteMany({});
    console.log(`   ✅ Deleted ${profilesDeleted.count} AnonymousUserProfile records\n`);

    console.log('✨ All funnel tracking data has been deleted successfully!');
    console.log('\nSummary:');
    console.log(`  - FunnelWebVital: ${webVitalsDeleted.count}`);
    console.log(`  - FunnelEvent: ${eventsDeleted.count}`);
    console.log(`  - FunnelSession: ${sessionsDeleted.count}`);
    console.log(`  - AnonymousUserProfile: ${profilesDeleted.count}`);
    console.log(`  - Total: ${webVitalsDeleted.count + eventsDeleted.count + sessionsDeleted.count + profilesDeleted.count} records deleted`);
    
  } catch (error) {
    console.error('❌ Error deleting funnel data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

deleteFunnelData();
