# Location Still Showing "Unknown" - Fix

## 🔍 Issue

New sessions are still showing "Unknown" for location even though we fixed the API route.

## 🐛 Root Cause

The dev servers need to be **restarted** to pick up the changes to the tracking API route (`src/app/api/track/events/route.ts`).

Next.js dev server doesn't always hot-reload API route changes properly.

## ✅ Solution

### **Step 1: Restart Both Dev Servers**

```bash
# Stop both servers (press Ctrl+C in each terminal)

# Terminal 1: Restart Aurea CRM
cd ~/Desktop/aurea-crm
npm run dev:all

# Terminal 2: Restart TTR
cd ~/Desktop/ttr
npm run dev
```

### **Step 2: Clear Browser Cache (Optional but Recommended)**

Open a **new incognito/private window** to ensure fresh session:

```
Chrome: Cmd+Shift+N (Mac) or Ctrl+Shift+N (Windows)
```

### **Step 3: Test the Fix**

1. **Visit TTR:** http://localhost:3001
2. **Browse the site** (scroll, watch video, etc.)
3. **Check Aurea CRM console logs:**

**Expected logs:**
```
[Tracking API] Private IP detected: 192.168.1.100, fetching public IP...
[Tracking API] ✓ Using public IP 81.123.45.67 instead of private IP 192.168.1.100
[Device Parser] parseIPAddress called with IP: 81.123.45.67
[Device Parser] ✓ Geo lookup successful for 81.123.45.67: United Kingdom (GB) - London
```

4. **Check Sessions table:**
   - Location should show: **United Kingdom**
   - City should show: **Your actual city**
   - No more "Unknown"

---

## 🔍 Debugging

If it's still showing "Unknown" after restarting:

### **1. Check Console Logs**

Look for these logs in the Aurea CRM terminal:

```bash
# Good logs:
[Tracking API] Private IP detected: 192.168.1.100, fetching public IP...
[Tracking API] ✓ Using public IP 81.123.45.67

# Bad logs:
[Tracking API] Using detected IP: 192.168.1.100
[Device Parser] ✗ Private IP detected: 192.168.1.100 - returning Localhost
```

### **2. Check What IP Is Being Sent**

Add temporary logging:

```typescript
// In src/app/api/track/events/route.ts (line 130)
let ip = req.headers.get("x-forwarded-for")?.split(",")[0] || 
         req.headers.get("x-real-ip") || 
         "unknown";

console.log("[DEBUG] Initial IP:", ip);  // ← Add this
```

Then restart and check what IP is detected.

### **3. Test Public IP Fetch Manually**

```bash
curl https://api.ipify.org?format=json
# Should return: {"ip":"81.123.45.67"}
```

If this works, the public IP fetch should work in the app too.

### **4. Check geoip-lite Database**

```bash
cd ~/Desktop/aurea-crm
node -e "const geo = require('geoip-lite'); console.log(geo.lookup('81.123.45.67'));"
```

Expected output:
```javascript
{
  range: [ ... ],
  country: 'GB',
  region: 'ENG',
  eu: '0',
  timezone: 'Europe/London',
  city: 'London',
  ll: [51.5074, -0.1278],
  metro: 0,
  area: 100
}
```

---

## 📝 What Should Happen

### **Normal Flow (Localhost):**

1. **User visits TTR** → SDK sends event to Aurea API
2. **API detects private IP** (192.168.x.x)
3. **API fetches public IP** (81.123.45.67) from ipify.org
4. **API performs geo lookup** using geoip-lite
5. **API sends to Inngest** with public IP + geo data
6. **Inngest creates session** with correct location
7. **Sessions table shows** "United Kingdom"

### **What Was Broken:**

The API was reusing old session IPs without checking if they were private. Now it always fetches public IP when needed.

---

## 🎯 Quick Verification Checklist

- [ ] Restarted Aurea CRM dev server
- [ ] Restarted TTR dev server  
- [ ] Opened new incognito window
- [ ] Visited localhost:3001
- [ ] Checked console logs for "Using public IP"
- [ ] Checked Sessions table for "United Kingdom"
- [ ] Checked Geography tab for proper country data

---

## 💡 Still Not Working?

If location is **still** showing "Unknown" after all the above:

### **Option 1: Delete and Recreate Session**

```bash
cd ~/Desktop/aurea-crm
npx prisma studio

# Navigate to FunnelSession
# Find the session with countryCode = "Unknown"
# Delete it
# Create a new session by visiting TTR again
```

### **Option 2: Force Public IP Fetch**

Temporarily disable the optimization:

```typescript
// In src/app/api/track/events/route.ts (line 158)
// Comment out the optimization
// const shouldFetchPublicIP = ...

// Always fetch:
const shouldFetchPublicIP = isPrivateIP(ip);
```

This will fetch public IP for **every** request (slower but guaranteed to work).

---

## ✅ Expected Result

After restarting servers and testing:

**Sessions Table:**
```
┌──────────────────────────────────────────────────┐
│ Session              │ Location      │ ...       │
├──────────────────────────────────────────────────┤
│ [🎨] Visitor #177     │ 🇬🇧 London,   │ ...       │
│      session_abc...  │    UK         │           │
└──────────────────────────────────────────────────┘
```

**Geography Tab:**
```
Countries:
🇬🇧 United Kingdom - 100% (3 sessions)
```

**Console Logs:**
```
[Tracking API] Private IP detected: 192.168.1.100, fetching public IP...
[Tracking API] ✓ Using public IP 81.123.45.67 instead of private IP 192.168.1.100
[Device Parser] ✓ Geo lookup successful for 81.123.45.67: United Kingdom (GB) - London
```

---

## 🎉 Summary

**Problem:** Dev server wasn't using updated API route  
**Solution:** Restart both dev servers  
**Expected:** Location shows "United Kingdom" instead of "Unknown"

After restarting, new sessions should automatically get correct location data! 🚀
