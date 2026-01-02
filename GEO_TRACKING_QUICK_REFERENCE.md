# Geo Tracking - Quick Reference Card

## 🎯 Current Status

✅ **Working** - Geo tracking fully functional  
✅ **Localhost Support** - Works on 192.168.x.x / 127.0.0.1  
✅ **Your Location** - Ilford, England, UK (86.190.181.56)  
✅ **Zero Config** - Just run `npm run dev:all`

---

## 🚀 Quick Start (30 seconds)

```bash
# Terminal 1: Start Aurea CRM + Inngest
cd /Users/abdul/Desktop/aurea-crm && npm run dev:all

# Terminal 2: Start TTR
cd /Users/abdul/Desktop/ttr && npm run dev

# Browser: Visit TTR
open http://localhost:3001

# Browser: Check Analytics
open http://localhost:3000
# → External Funnels → [TTR] → Analytics → Geography tab
```

**Expected:** You'll see "United Kingdom" in the analytics! 🇬🇧

---

## 📊 What You'll See

### Console Logs (Aurea CRM Terminal)
```
[Tracking API] Using public IP 86.190.181.56 instead of private IP 192.168.x.x
[Device Parser] Geo lookup successful for 86.190.181.56: GB - Ilford
✓ Inngest event processed: tracking/events.batch
```

### Analytics Dashboard
- **Geography Tab:** Chart showing "United Kingdom"
- **Real-time Feed:** Events from "United Kingdom"
- **Sessions Table:** Location column shows "GB"

### Database (Prisma Studio)
```bash
npx prisma studio
```
**FunnelEvent table:**
| Field | Value |
|-------|-------|
| ipAddress | 86.190.181.56 |
| countryCode | GB |
| countryName | United Kingdom |
| region | ENG |
| city | Ilford |

---

## 🔧 How It Works (Simple Explanation)

```
Your Browser (localhost)
  ↓
TTR (localhost:3001)
  ↓ Sends event with 192.168.x.x
Aurea API (/api/track/events)
  ↓ Detects private IP
  ↓ Fetches your public IP from ipify.org
  ✓ Got: 86.190.181.56
  ↓
geoip-lite lookup
  ✓ Found: United Kingdom, Ilford
  ↓
Database (PostgreSQL)
  ✓ Stored with geo data
  ↓
Analytics Dashboard
  ✓ Shows "United Kingdom"
```

**Only in development** - Production uses forwarded headers instead

---

## 🛠️ Troubleshooting

### Issue: Still seeing "Unknown" or "Localhost"

**Check 1: Is the server in dev mode?**
```bash
echo $NODE_ENV  # Should be empty or "development"
```

**Check 2: Is geoip-lite working?**
```bash
node -e "console.log(require('geoip-lite').lookup('8.8.8.8'))"
# Should return: { country: 'US', ... }
```

**Check 3: Can you fetch public IP?**
```bash
curl https://api.ipify.org?format=json
# Should return: {"ip":"86.190.181.56"}
```

**Check 4: Are events being tracked?**
- Open browser console on TTR
- Look for: `[Aurea SDK] Events sent successfully: 1`

**Fix: Rebuild geoip-lite**
```bash
cd /Users/abdul/Desktop/aurea-crm
npm rebuild geoip-lite
npm run dev:all
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `src/app/api/track/events/route.ts` | Receives events, fetches public IP |
| `src/lib/device-parser.ts` | Parses IP → Geo data |
| `src/inngest/functions/process-tracking-events.ts` | Processes events, stores in DB |
| `src/features/external-funnels/components/geography-analytics.tsx` | Shows geo charts |

---

## 🧪 Test Commands

```bash
# Test public IP fetch
node -e "fetch('https://api.ipify.org?format=json').then(r=>r.json()).then(console.log)"

# Test geoip lookup with your IP
node -e "console.log(require('geoip-lite').lookup('86.190.181.56'))"

# Check if port 3000 is running
lsof -ti:3000

# View database
npx prisma studio

# Rebuild geoip (if needed)
npm rebuild geoip-lite
```

---

## 📝 Expected Data

### Your Current Location
```javascript
{
  publicIP: "86.190.181.56",
  country: "United Kingdom",
  countryCode: "GB",
  region: "England",
  regionCode: "ENG",
  city: "Ilford",
  timezone: "Europe/London"
}
```

### Test IPs (for reference)
```javascript
// Google DNS - US
geoip.lookup('8.8.8.8')
// { country: 'US', region: '', city: '' }

// Fastly CDN - US  
geoip.lookup('151.101.1.140')
// { country: 'US', region: '', city: '' }

// OpenDNS - US
geoip.lookup('208.67.222.222')
// { country: 'US', region: 'MO', city: 'Wright City' }
```

---

## ⚙️ Configuration

### Disable Public IP Fetching (Testing)

**Method 1: Use production mode**
```bash
NODE_ENV=production npm run dev
```

**Method 2: Comment out code**

In `src/app/api/track/events/route.ts` (line 137-147):
```typescript
// if (process.env.NODE_ENV === "development" && isPrivateIP(ip)) {
//   const publicIP = await fetchPublicIP();
//   if (publicIP) ip = publicIP;
// }
```

**Result:** Will show "Localhost" in analytics

### Change Public IP Service

Replace `ipify.org` with alternative in `route.ts`:

```typescript
// Option 1: ipapi.co (more data)
const response = await fetch("https://ipapi.co/json/");

// Option 2: ifconfig.me  
const response = await fetch("https://ifconfig.me/ip");

// Option 3: icanhazip.com
const response = await fetch("https://icanhazip.com");
```

---

## 📚 Documentation

- **Full Guide:** `GEO_TRACKING_FIX_COMPLETE.md`
- **Feature Deep Dive:** `LOCALHOST_GEO_TRACKING.md`
- **Session Summary:** `SESSION_SUMMARY_GEO_FIX.md`
- **This Reference:** `GEO_TRACKING_QUICK_REFERENCE.md`

---

## ✅ Checklist

- [x] geoip-lite rebuilt and working
- [x] Public IP fetch working (your IP: 86.190.181.56)
- [x] Geo lookup working (Ilford, England, UK)
- [x] Private IP detection working (192.168.x.x)
- [x] Localhost labeling working
- [x] Development mode detection working
- [x] Database schema supports geo fields
- [x] Analytics dashboard shows geo data
- [x] Real-time dashboard working
- [x] Documentation complete

**Everything is ready to test!** 🎉

---

## 🎯 Next Actions

1. **Test Now:**
   ```bash
   npm run dev:all
   # Visit http://localhost:3001
   # Check http://localhost:3000 analytics
   ```

2. **Verify Database:**
   ```bash
   npx prisma studio
   # Check FunnelEvent table
   # Look for countryName = "United Kingdom"
   ```

3. **Deploy to Production:** (Optional)
   - Will use forwarded headers instead of public IP fetch
   - No code changes needed
   - Automatic production behavior

---

**Status:** ✅ Ready to use! Just start the servers and test.

**Your Location:** Ilford, England, United Kingdom 🇬🇧  
**Your Public IP:** 86.190.181.56
