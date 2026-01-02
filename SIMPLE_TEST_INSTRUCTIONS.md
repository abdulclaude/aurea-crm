# Simple Test - See If Geo Tracking Works

## Quick Test (Do this now!)

1. **Start Aurea CRM server:**
   ```bash
   cd /Users/abdul/Desktop/aurea-crm
   npm run dev
   ```
   
   Wait for: `✓ Ready in...`

2. **Start TTR server (new terminal):**
   ```bash
   cd /Users/abdul/Desktop/ttr
   npm run dev
   ```
   
   Wait for: `✓ Ready in...`

3. **Visit TTR in browser:**
   ```
   http://localhost:3001
   ```
   
   Watch the Aurea CRM terminal (from step 1)
   
4. **Look for these logs in Aurea CRM terminal:**
   
   ✅ **SUCCESS - You should see:**
   ```
   [Tracking API] Private IP detected: unknown, fetching public IP...
   [Tracking API] ✓ Using public IP 86.190.181.56 instead of private IP unknown
   ```
   
   Then later:
   ```
   [Device Parser] parseIPAddress called with IP: 86.190.181.56
   [Device Parser] ✓ Geo lookup successful for 86.190.181.56: United Kingdom (GB) - Ilford
   ```
   
   ❌ **PROBLEM - If you see:**
   ```
   [Device Parser] ✗ Private IP detected: 192.168.x.x - returning Localhost
   ```
   
   This means the API route didn't fetch the public IP.

5. **Check the database:**
   ```bash
   npx prisma studio
   ```
   
   - Open `FunnelEvent` table
   - Sort by `createdAt` DESC
   - Check the `countryName` column
   
   **Should see:** "United Kingdom"  
   **If you see:** "Localhost" - there's an issue

6. **Check analytics:**
   ```
   http://localhost:3000
   → External Funnels
   → [TTR Funnel]
   → Analytics
   → Geography tab
   ```
   
   **Should see:** Chart with "United Kingdom"  
   **If you see:** "Localhost" - the public IP fetch didn't work

---

## If You See "Localhost" Instead

The IP fetch might not be working. Check:

1. **Is internet working?**
   ```bash
   curl https://api.ipify.org?format=json
   ```
   Should return: `{"ip":"86.190.181.56"}`

2. **Is the code actually running?**
   In the Aurea CRM terminal, you should see:
   ```
   [Tracking API] Private IP detected: ...
   ```
   
   If you DON'T see this log, the code changes haven't been picked up.
   
   **Fix:** Restart the server:
   ```bash
   # Kill the server (Ctrl+C in terminal)
   # Then start again:
   npm run dev
   ```

3. **Check what IP the API is receiving:**
   Add this temporarily to `src/app/api/track/events/route.ts` after line 133:
   ```typescript
   console.log("DEBUGGING - IP received:", ip);
   console.log("DEBUGGING - All headers:", Object.fromEntries(req.headers.entries()));
   ```
   
   Then restart and check the terminal.

---

## My Prediction

You're probably seeing `[Device Parser] ✗ Private IP detected` which means the IP that reaches the device parser is still private.

This could happen if:
1. The server hasn't restarted with new code
2. There's an error in fetchPublicIP() that's being silently caught
3. The IP is coming through as "unknown" and our check isn't catching it

**Next step:** Run the test above and tell me EXACTLY what logs you see in the Aurea CRM terminal!
