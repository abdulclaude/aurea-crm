import { db, dbPool } from "./src/db";
import {
  anonymousUserProfiles,
  funnelEvent,
  funnelSession,
  funnelWebVital,
} from "./src/db/schema";

async function deleteFunnelData() {
  console.log('🗑️  Starting deletion of funnel tracking data...\n');

  try {
    // Delete in order to respect foreign key constraints
    
    console.log('1️⃣  Deleting FunnelWebVital records...');
    const webVitalsDeleted = await db.delete(funnelWebVital).returning({ id: funnelWebVital.id });
    console.log(`   ✅ Deleted ${webVitalsDeleted.length} FunnelWebVital records\n`);

    console.log('2️⃣  Deleting FunnelEvent records...');
    const eventsDeleted = await db.delete(funnelEvent).returning({ id: funnelEvent.id });
    console.log(`   ✅ Deleted ${eventsDeleted.length} FunnelEvent records\n`);

    console.log('3️⃣  Deleting FunnelSession records...');
    const sessionsDeleted = await db.delete(funnelSession).returning({ id: funnelSession.id });
    console.log(`   ✅ Deleted ${sessionsDeleted.length} FunnelSession records\n`);

    console.log('4️⃣  Deleting AnonymousUserProfile records...');
    const profilesDeleted = await db.delete(anonymousUserProfiles).returning({ id: anonymousUserProfiles.id });
    console.log(`   ✅ Deleted ${profilesDeleted.length} AnonymousUserProfile records\n`);

    console.log('✨ All funnel tracking data has been deleted successfully!');
    console.log('\nSummary:');
    console.log(`  - FunnelWebVital: ${webVitalsDeleted.length}`);
    console.log(`  - FunnelEvent: ${eventsDeleted.length}`);
    console.log(`  - FunnelSession: ${sessionsDeleted.length}`);
    console.log(`  - AnonymousUserProfile: ${profilesDeleted.length}`);
    console.log(`  - Total: ${webVitalsDeleted.length + eventsDeleted.length + sessionsDeleted.length + profilesDeleted.length} records deleted`);
    
  } catch (error) {
    console.error('❌ Error deleting funnel data:', error);
    process.exit(1);
  } finally {
    await dbPool.end();
  }
}

deleteFunnelData();
