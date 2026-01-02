# Ad Platform Integration - Quick Start Guide

**Last Updated**: December 29, 2024

---

## 🚀 Setup (5 Minutes)

### 1. Add Environment Variables

Add to your `.env` file:

```bash
# Meta/Facebook Ads
META_PIXEL_ID=your_pixel_id
META_CAPI_ACCESS_TOKEN=your_access_token
META_AD_ACCOUNT_ID=act_123456789

# Google Ads
GOOGLE_ADS_CUSTOMER_ID=1234567890
GOOGLE_ADS_CONVERSION_ACTION_ID=1234567890
GOOGLE_ADS_DEVELOPER_TOKEN=your_dev_token
GOOGLE_ADS_ACCESS_TOKEN=your_access_token

# TikTok Ads
TIKTOK_PIXEL_ID=your_pixel_code
TIKTOK_ACCESS_TOKEN=your_access_token
TIKTOK_ADVERTISER_ID=your_advertiser_id
```

### 2. Restart Dev Server

```bash
# Kill existing processes, then:
npm dev:all
```

This clears TypeScript cache and loads new environment variables.

---

## ✅ What's Working

### Click ID Tracking (Phase 1) ✅
- Facebook (`fbclid`), Google (`gclid`), TikTok (`ttclid`) automatically captured
- Stored in `FunnelSession` table with first-touch and last-touch attribution
- 28-90 day attribution windows per platform
- First-party cookies (`_fbp`, `_fbc`, `_ttp`) captured

### Server-Side Conversions (Phase 2) ✅
- Conversions automatically sent to Meta, Google, TikTok on:
  - `checkout_completed` events
  - `form_submitted` events
- PII hashed with SHA-256 for privacy
- Event deduplication with unique IDs
- Multi-platform support (sends to all platforms visitor interacted with)

### Ad Spend Import (Phase 2) ✅
- Runs daily at 2 AM UTC
- Fetches previous day's spend from all platforms
- Stores: spend, impressions, clicks, conversions, revenue
- Calculates: ROAS, CPA, CPC, CPM, CTR, conversion rate

---

## 📊 How to Use

### Send Test Conversion

1. Visit your funnel with a click ID:
```
http://localhost:3001/?fbclid=IwAR1test123
```

2. Complete a checkout or submit a form

3. Check Inngest logs:
```
[Ad Conversions] Sent Meta purchase for event abc-123
```

4. Verify in Meta Events Manager (if using real credentials)

### View Ad Spend Data

```bash
# Open Prisma Studio
npx prisma studio

# Navigate to AdSpend table
# Should see daily spend per campaign after 2 AM runs
```

### Calculate ROAS

```typescript
import { calculateROAS } from '@/lib/ads/calculate-roas';

const roas = calculateROAS(3500, 1000); // revenue, spend
// Returns: 350 (350% ROAS = $3.50 return per $1 spent)
```

---

## 🗂️ File Structure

```
src/
├── lib/ads/
│   ├── meta/conversion-api.ts          # Meta CAPI
│   ├── google/enhanced-conversions.ts  # Google Ads API
│   ├── tiktok/events-api.ts            # TikTok Events API
│   └── calculate-roas.ts               # ROAS utilities
│
└── inngest/functions/
    ├── process-tracking-events.ts      # Handles conversions (Step 4.6)
    └── sync-ad-spend.ts                # Daily ad spend import (2 AM)
```

---

## 🔍 Debugging

### Check if Click IDs are Being Captured

```sql
-- In Prisma Studio or psql:
SELECT 
  id, 
  sessionId, 
  firstFbclid, 
  lastGclid, 
  lastTtclid,
  conversionPlatform,
  converted
FROM "FunnelSession"
WHERE firstFbclid IS NOT NULL
   OR lastGclid IS NOT NULL
   OR lastTtclid IS NOT NULL
ORDER BY "createdAt" DESC
LIMIT 10;
```

### Check if Conversions are Sent

Look for these logs in Inngest:
```
[Ad Conversions] Sent Meta purchase for event {eventId}
[Ad Conversions] Sent Google purchase for event {eventId}
[Ad Conversions] Sent TikTok purchase for event {eventId}
```

### Check if Ad Spend is Syncing

```sql
SELECT 
  platform,
  campaignId,
  date,
  spend,
  revenue,
  roas
FROM "AdSpend"
ORDER BY date DESC
LIMIT 20;
```

---

## 🐛 Known Issues

### TypeScript Errors in `process-tracking-events.ts`
**Error**: `Property 'lastFbclid' does not exist...`

**Cause**: IDE TypeScript cache not updated after Prisma generation

**Fix**: Restart dev server (`npm dev:all`)

**Verification**: Fields exist in database and Prisma client - code will run fine despite IDE errors

---

## 📖 API Documentation

### Meta Conversion API
```typescript
import { sendMetaPurchase } from '@/lib/ads/meta/conversion-api';

await sendMetaPurchase(
  { pixelId: '...', accessToken: '...' },
  {
    eventId: 'unique-id',
    email: 'user@example.com',
    value: 99.99,
    currency: 'USD',
    fbclid: 'IwAR1...',
  }
);
```

### Google Enhanced Conversions
```typescript
import { sendGooglePurchase } from '@/lib/ads/google/enhanced-conversions';

await sendGooglePurchase(
  { customerId: '...', conversionActionId: '...', developerToken: '...', accessToken: '...' },
  {
    gclid: 'Cj0KC...',
    email: 'user@example.com',
    value: 99.99,
    currency: 'USD',
  }
);
```

### TikTok Events API
```typescript
import { sendTikTokPurchase } from '@/lib/ads/tiktok/events-api';

await sendTikTokPurchase(
  { pixelCode: '...', accessToken: '...' },
  {
    ttclid: '7...',
    email: 'user@example.com',
    value: 99.99,
    currency: 'USD',
  }
);
```

---

## 🎯 ROAS Benchmarks

| ROAS | Status | Meaning |
|------|--------|---------|
| ≥400% | Excellent 🟢 | $4+ return per $1 spent |
| ≥200% | Good 🔵 | $2+ return per $1 spent |
| ≥100% | Fair 🟡 | Break-even or slightly profitable |
| <100% | Poor 🔴 | Losing money |

---

## 🔐 Getting Ad Platform Credentials

### Meta (Facebook)

1. Go to [Meta Events Manager](https://business.facebook.com/events_manager2)
2. Select your pixel
3. Settings → Conversions API → Generate Access Token
4. Copy: Pixel ID, Access Token
5. For ad spend: Get Ad Account ID from [Ads Manager](https://business.facebook.com/adsmanager)

### Google Ads

1. Go to [Google Ads API Center](https://ads.google.com/aw/apicenter)
2. Apply for developer token
3. Create OAuth2 credentials in [Google Cloud Console](https://console.cloud.google.com/)
4. Copy: Customer ID (without hyphens), Conversion Action ID, Developer Token
5. Use OAuth flow to get access/refresh tokens

### TikTok

1. Go to [TikTok Ads Manager](https://ads.tiktok.com/)
2. Create a Marketing API app
3. Generate long-term access token
4. Copy: Pixel Code, Access Token, Advertiser ID

---

## ❓ FAQ

**Q: Will this work without ad platform credentials?**  
A: Click ID tracking works without credentials. Conversion sending and ad spend import require valid credentials.

**Q: How often does ad spend sync?**  
A: Daily at 2 AM UTC. Can be manually triggered via Inngest Dev Server.

**Q: What if a visitor came from multiple platforms?**  
A: Conversions are sent to ALL platforms the visitor interacted with. Each platform only counts conversions with their click ID.

**Q: How long are click IDs stored?**  
A: In localStorage with platform-specific expiration (FB: 28d, Google: 90d, TikTok: 28d).

**Q: Is PII data safe?**  
A: Yes. All PII (email, phone, name, address) is SHA-256 hashed before sending to ad platforms.

**Q: Can I test without affecting live data?**  
A: Yes. Use `testEventCode` parameter for Meta. Google/TikTok have test environments in their UI.

---

## 📚 Related Documentation

- [AD_PLATFORM_RESEARCH.md](./AD_PLATFORM_RESEARCH.md) - Full research on all platforms
- [AD_PLATFORM_INTEGRATION_PLAN.md](./AD_PLATFORM_INTEGRATION_PLAN.md) - Implementation plan
- [AD_PLATFORM_IMPLEMENTATION_COMPLETE.md](./AD_PLATFORM_IMPLEMENTATION_COMPLETE.md) - Phase 1 summary
- [AD_PLATFORM_PHASE2_COMPLETE.md](./AD_PLATFORM_PHASE2_COMPLETE.md) - Phase 2 summary

---

## 🚦 Next Steps

### Phase 3: Analytics Dashboard
- Build UI to visualize ROAS, spend, revenue
- Platform comparison charts
- Campaign performance tables
- Attribution breakdown

### Phase 4: Credentials Management
- Per-subaccount credentials
- OAuth flows in UI
- Credential testing/validation
- Enable/disable per platform

---

**Need Help?** Check the full documentation in `AD_PLATFORM_PHASE2_COMPLETE.md`
