/**
 * Script to fix sessions with "Unknown" or "LOCAL" location data
 * 
 * This script:
 * 1. Finds all sessions with Unknown/LOCAL country codes
 * 2. Fetches the public IP for each unique session
 * 3. Performs geo lookup using geoip-lite
 * 4. Updates the sessions with correct location data
 * 
 * Usage:
 *   npx tsx fix-unknown-locations.ts
 */

// Load environment variables
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import db from "./src/lib/db";

// Helper to check if IP is private/localhost
function isPrivateIP(ip: string): boolean {
  if (!ip || ip === "unknown") return true;
  if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") return true;
  if (ip.startsWith("192.168.")) return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("172.")) {
    const second = Number.parseInt(ip.split(".")[1] || "0", 10);
    if (second >= 16 && second <= 31) return true;
  }
  if (ip.startsWith("fc00:") || ip.startsWith("fd00:")) return true;
  return false;
}

// Fetch public IP
async function fetchPublicIP(): Promise<string | null> {
  try {
    const response = await fetch("https://api.ipify.org?format=json", {
      signal: AbortSignal.timeout(3000),
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.ip || null;
  } catch (error) {
    console.error("Error fetching public IP:", error);
    return null;
  }
}

// Perform geo lookup using geoip-lite
function performGeoLookup(ip: string) {
  try {
    const geoipLite = require("geoip-lite");
    const geo = geoipLite.lookup(ip);
    
    if (!geo) {
      return {
        countryCode: "Unknown",
        countryName: "Unknown",
        region: "Unknown",
        city: "Unknown",
      };
    }
    
    return {
      countryCode: geo.country || "Unknown",
      countryName: getCountryName(geo.country) || "Unknown",
      region: geo.region || "Unknown",
      city: geo.city || "Unknown",
    };
  } catch (error) {
    console.error("Error performing geo lookup:", error);
    return {
      countryCode: "Unknown",
      countryName: "Unknown",
      region: "Unknown",
      city: "Unknown",
    };
  }
}

// Get country name from code
function getCountryName(code: string): string {
  const countryNames: Record<string, string> = {
    US: "United States",
    GB: "United Kingdom",
    CA: "Canada",
    AU: "Australia",
    DE: "Germany",
    FR: "France",
    IT: "Italy",
    ES: "Spain",
    NL: "Netherlands",
    // Add more as needed
  };
  return countryNames[code] || code;
}

async function main() {
  console.log("🔍 Finding sessions with Unknown or LOCAL location data...\n");
  
  // Find all sessions with Unknown or LOCAL country codes
  const sessionsToFix = await db.funnelSession.findMany({
    where: {
      OR: [
        { countryCode: "Unknown" },
        { countryCode: "LOCAL" },
        { countryCode: null },
      ],
    },
    select: {
      id: true,
      sessionId: true,
      ipAddress: true,
      countryCode: true,
    },
    orderBy: {
      startedAt: "desc",
    },
  });
  
  console.log(`📊 Found ${sessionsToFix.length} sessions to fix\n`);
  
  if (sessionsToFix.length === 0) {
    console.log("✅ All sessions have valid location data!");
    return;
  }
  
  let publicIP: string | null = null;
  let fixed = 0;
  let skipped = 0;
  
  for (const session of sessionsToFix) {
    const ip = session.ipAddress;
    
    // If IP is private or missing, fetch public IP (once)
    if (!ip || isPrivateIP(ip)) {
      if (!publicIP) {
        console.log("🌐 Fetching your public IP...");
        publicIP = await fetchPublicIP();
        
        if (!publicIP || isPrivateIP(publicIP)) {
          console.log("❌ Could not fetch valid public IP. Skipping all sessions.");
          break;
        }
        
        console.log(`✅ Using public IP: ${publicIP}\n`);
      }
      
      // Perform geo lookup with public IP
      const geoData = performGeoLookup(publicIP);
      
      console.log(`📍 ${session.sessionId.substring(0, 12)}... → ${geoData.countryName} (${geoData.countryCode})`);
      
      // Update session
      await db.funnelSession.update({
        where: { id: session.id },
        data: {
          ipAddress: publicIP,
          countryCode: geoData.countryCode,
          countryName: geoData.countryName,
          region: geoData.region,
          city: geoData.city,
        },
      });
      
      fixed++;
    } else {
      // Has valid IP but Unknown country - try geo lookup again
      const geoData = performGeoLookup(ip);
      
      if (geoData.countryCode !== "Unknown") {
        console.log(`🔄 ${session.sessionId.substring(0, 12)}... → ${geoData.countryName} (${geoData.countryCode})`);
        
        await db.funnelSession.update({
          where: { id: session.id },
          data: {
            countryCode: geoData.countryCode,
            countryName: geoData.countryName,
            region: geoData.region,
            city: geoData.city,
          },
        });
        
        fixed++;
      } else {
        console.log(`⏭️  ${session.sessionId.substring(0, 12)}... → Still Unknown (IP: ${ip})`);
        skipped++;
      }
    }
    
    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n✅ Fixed ${fixed} sessions`);
  if (skipped > 0) {
    console.log(`⏭️  Skipped ${skipped} sessions (no valid geo data available)`);
  }
  console.log("\n🎉 Done! Check the Geography tab in Aurea CRM.");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
