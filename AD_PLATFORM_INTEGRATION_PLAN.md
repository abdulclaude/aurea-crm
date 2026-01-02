# Ad Platform Integration Plan

## Overview
This document outlines how to integrate Meta Ads, Google Ads, TikTok Ads, and other advertising platforms into the Aurea CRM funnel tracking system.

## Current State
✅ UTM parameter tracking (source, medium, campaign, term, content)
✅ Session attribution (first-touch, last-touch)
✅ Conversion tracking with revenue
✅ Multi-touch attribution via touchpoints array

## What's Needed

### Phase 1: Click ID Tracking (Database Schema)

#### 1.1 Add Click ID Fields to FunnelEvent
```prisma
model FunnelEvent {
  // ... existing fields
  
  // Ad Platform Click IDs
  fbclid       String?  // Facebook/Meta Click ID
  gclid        String?  // Google Ads Click ID  
  ttclid       String?  // TikTok Click ID
  msclkid      String?  // Microsoft Ads Click ID
  twclid       String?  // Twitter/X Click ID
  li_fat_id    String?  // LinkedIn Ads ID
  ScCid        String?  // Snapchat Click ID
  gbraid       String?  // Google Ads iOS 14.5+ (privacy-safe)
  wbraid       String?  // Google Ads iOS 14.5+ (web-to-app)
  
  // ... rest of fields
  
  @@index([fbclid])
  @@index([gclid])
  @@index([ttclid])
}
```

#### 1.2 Add Click ID Fields to FunnelSession
```prisma
model FunnelSession {
  // ... existing fields
  
  // Ad Platform Click IDs (first touch)
  firstFbclid   String?
  firstGclid    String?
  firstTtclid   String?
  firstMsclkid  String?
  
  // Ad Platform Click IDs (last touch before conversion)
  lastFbclid    String?
  lastGclid     String?
  lastTtclid    String?
  lastMsclkid   String?
  
  // Ad platform that drove conversion
  conversionPlatform String?  // 'facebook', 'google', 'tiktok', etc.
  
  // ... rest of fields
}
```

### Phase 2: SDK Updates (Click ID Capture)

#### 2.1 Update aurea-tracking-sdk to extract click IDs
In `src/index.ts` `buildContext()` method:

```typescript
private buildContext() {
  const url = typeof window !== "undefined"
    ? new URL(window.location.href)
    : new URL("http://localhost");

  return {
    page: { ... },
    
    utm: {
      source: url.searchParams.get("utm_source") || undefined,
      medium: url.searchParams.get("utm_medium") || undefined,
      campaign: url.searchParams.get("utm_campaign") || undefined,
      term: url.searchParams.get("utm_term") || undefined,
      content: url.searchParams.get("utm_content") || undefined,
    },
    
    // NEW: Click IDs from ad platforms
    clickIds: {
      fbclid: url.searchParams.get("fbclid") || undefined,
      gclid: url.searchParams.get("gclid") || undefined,
      ttclid: url.searchParams.get("ttclid") || undefined,
      msclkid: url.searchParams.get("msclkid") || undefined,
      twclid: url.searchParams.get("twclid") || undefined,
      li_fat_id: url.searchParams.get("li_fat_id") || undefined,
      ScCid: url.searchParams.get("ScCid") || undefined,
      gbraid: url.searchParams.get("gbraid") || undefined,
      wbraid: url.searchParams.get("wbraid") || undefined,
    },
    
    user: { ... },
    session: { ... },
    device: { ... },
  };
}
```

#### 2.2 Store Click IDs in localStorage (for attribution window)
Ad platforms need to attribute conversions back to clicks for 7-30 days.

```typescript
// After extracting click IDs, store them
private storeClickIds(clickIds: any) {
  if (typeof localStorage === 'undefined') return;
  
  const stored: any = {};
  
  if (clickIds.fbclid) {
    stored.fbclid = { id: clickIds.fbclid, timestamp: Date.now() };
  }
  if (clickIds.gclid) {
    stored.gclid = { id: clickIds.gclid, timestamp: Date.now() };
  }
  if (clickIds.ttclid) {
    stored.ttclid = { id: clickIds.ttclid, timestamp: Date.now() };
  }
  
  localStorage.setItem('aurea_click_ids', JSON.stringify(stored));
}

// Retrieve stored click IDs (even if not in current URL)
private getStoredClickIds() {
  if (typeof localStorage === 'undefined') return {};
  
  const stored = localStorage.getItem('aurea_click_ids');
  if (!stored) return {};
  
  const clickIds = JSON.parse(stored);
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  
  // Filter out expired click IDs (older than 30 days)
  const active: any = {};
  for (const [platform, data] of Object.entries(clickIds)) {
    if (now - (data as any).timestamp < thirtyDays) {
      active[platform] = (data as any).id;
    }
  }
  
  return active;
}
```

### Phase 3: Backend Updates (Click ID Processing)

#### 3.1 Update process-tracking-events.ts
```typescript
// In enrichedEvents mapping (line ~124)
return {
  // ... existing fields
  
  // Extract click IDs from context
  fbclid: evt.context.clickIds?.fbclid,
  gclid: evt.context.clickIds?.gclid,
  ttclid: evt.context.clickIds?.ttclid,
  msclkid: evt.context.clickIds?.msclkid,
  twclid: evt.context.clickIds?.twclid,
  li_fat_id: evt.context.clickIds?.li_fat_id,
  ScCid: evt.context.clickIds?.ScCid,
  gbraid: evt.context.clickIds?.gbraid,
  wbraid: evt.context.clickIds?.wbraid,
  
  // ... rest of fields
};

// In session creation (line ~380)
create: {
  // ... existing fields
  
  firstFbclid: firstEvent.fbclid,
  firstGclid: firstEvent.gclid,
  firstTtclid: firstEvent.ttclid,
  firstMsclkid: firstEvent.msclkid,
  
  // Determine conversion platform from click IDs
  conversionPlatform: firstEvent.fbclid ? 'facebook' 
    : firstEvent.gclid ? 'google'
    : firstEvent.ttclid ? 'tiktok'
    : firstEvent.msclkid ? 'microsoft'
    : null,
  
  // ... rest of fields
},
```

### Phase 4: Conversion API Integration (Server-Side Events)

This is critical for iOS 14.5+ and privacy-focused browsers where client-side tracking is blocked.

#### 4.1 Meta Conversion API (CAPI)
When a conversion happens, send it directly to Meta:

```typescript
// src/lib/ads/meta-capi.ts
import crypto from 'crypto';

export async function sendMetaConversion({
  fbclid,
  eventName,  // 'Purchase', 'Lead', 'AddToCart'
  eventTime,
  userEmail,
  userPhone,
  value,
  currency,
  fbp,  // Facebook browser ID from cookie
  fbc,  // Facebook click ID from cookie
  userAgent,
  ipAddress,
  eventSourceUrl,
}) {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  
  // Hash user data (PII)
  const hashedEmail = userEmail ? crypto.createHash('sha256').update(userEmail.toLowerCase()).digest('hex') : undefined;
  const hashedPhone = userPhone ? crypto.createHash('sha256').update(userPhone).digest('hex') : undefined;
  
  const payload = {
    data: [{
      event_name: eventName,
      event_time: Math.floor(eventTime / 1000),
      event_source_url: eventSourceUrl,
      action_source: 'website',
      user_data: {
        em: [hashedEmail],
        ph: [hashedPhone],
        client_ip_address: ipAddress,
        client_user_agent: userAgent,
        fbp,
        fbc: fbclid ? `fb.1.${Date.now()}.${fbclid}` : fbc,
      },
      custom_data: {
        value,
        currency,
      },
    }],
  };
  
  const response = await fetch(
    \`https://graph.facebook.com/v18.0/\${pixelId}/events?access_token=\${accessToken}\`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );
  
  return response.json();
}
```

#### 4.2 Google Ads Enhanced Conversions
```typescript
// src/lib/ads/google-enhanced-conversions.ts
export async function sendGoogleConversion({
  gclid,
  conversionLabel,
  conversionValue,
  currency,
  userEmail,
  userPhone,
  userAddress,
}) {
  const conversionId = process.env.GOOGLE_ADS_CONVERSION_ID;
  
  // Google requires hashed user data
  const hashedEmail = userEmail ? crypto.createHash('sha256').update(userEmail.toLowerCase()).digest('hex') : undefined;
  
  const payload = {
    conversions: [{
      gclid,
      conversion_action: \`customers/\${conversionId}/conversionActions/\${conversionLabel}\`,
      conversion_date_time: new Date().toISOString(),
      conversion_value: conversionValue,
      currency_code: currency,
      user_identifiers: [{
        hashed_email: hashedEmail,
      }],
    }],
  };
  
  // Use Google Ads API to upload conversion
  // This requires OAuth2 authentication with Google Ads account
}
```

#### 4.3 TikTok Events API
```typescript
// src/lib/ads/tiktok-events-api.ts
export async function sendTikTokEvent({
  ttclid,
  eventName,  // 'CompletePayment', 'AddToCart'
  eventTime,
  userEmail,
  userPhone,
  value,
  currency,
  ipAddress,
  userAgent,
}) {
  const pixelId = process.env.TIKTOK_PIXEL_ID;
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN;
  
  const hashedEmail = userEmail ? crypto.createHash('sha256').update(userEmail.toLowerCase()).digest('hex') : undefined;
  const hashedPhone = userPhone ? crypto.createHash('sha256').update(userPhone).digest('hex') : undefined;
  
  const payload = {
    pixel_code: pixelId,
    event: eventName,
    event_time: Math.floor(eventTime / 1000),
    context: {
      user_agent: userAgent,
      ip: ipAddress,
      ad: {
        callback: ttclid,
      },
    },
    properties: {
      value,
      currency,
    },
    user: {
      email: [hashedEmail],
      phone: [hashedPhone],
    },
  };
  
  const response = await fetch(
    \`https://business-api.tiktok.com/open_api/v1.3/event/track/\`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': accessToken,
      },
      body: JSON.stringify(payload),
    }
  );
  
  return response.json();
}
```

### Phase 5: Analytics & Reporting

#### 5.1 Ad Platform Performance Dashboard
Create `/funnels/[funnelId]/analytics/ads` page showing:
- Cost per platform (requires importing ad spend data)
- ROAS (Return on Ad Spend) by platform
- Conversion rate by platform
- Customer acquisition cost (CAC)
- Attribution comparison (first-touch vs last-touch)

#### 5.2 Multi-Touch Attribution Model
Implement attribution models:
- **First-Touch**: Credit to first ad click
- **Last-Touch**: Credit to last ad click before conversion
- **Linear**: Equal credit to all touchpoints
- **Time Decay**: More credit to recent touchpoints
- **Position-Based**: 40% first, 40% last, 20% middle

```typescript
// src/features/external-funnels/lib/attribution.ts
export function calculateAttribution(
  session: FunnelSession,
  model: 'first' | 'last' | 'linear' | 'time-decay' | 'position'
) {
  const touchpoints = session.touchpoints; // ['facebook', 'google', 'email', 'google']
  
  if (model === 'first') {
    return { [touchpoints[0]]: 100 };
  }
  
  if (model === 'last') {
    return { [touchpoints[touchpoints.length - 1]]: 100 };
  }
  
  if (model === 'linear') {
    const credit = 100 / touchpoints.length;
    return touchpoints.reduce((acc, tp) => {
      acc[tp] = (acc[tp] || 0) + credit;
      return acc;
    }, {} as Record<string, number>);
  }
  
  // Implement time-decay and position-based models...
}
```

### Phase 6: Integration with Ad Platforms (Read Ad Spend)

To calculate ROAS, you need to import ad spend data from each platform:

#### 6.1 Meta Marketing API
```typescript
// Fetch ad spend from Meta
const response = await fetch(
  \`https://graph.facebook.com/v18.0/act_\${adAccountId}/insights?fields=spend,impressions,clicks,actions&access_token=\${accessToken}\`
);
```

#### 6.2 Google Ads API
```typescript
// Query Google Ads for spend data
// Requires Google Ads API client library
```

#### 6.3 TikTok Ads API
```typescript
// Fetch TikTok ad performance
const response = await fetch(
  \`https://business-api.tiktok.com/open_api/v1.3/reports/integrated/get/\`,
  {
    headers: { 'Access-Token': accessToken },
    // ... query params
  }
);
```

## Implementation Priority

### Phase 1: Must Have (Week 1)
1. ✅ Database migration to add click ID fields
2. ✅ SDK update to capture click IDs
3. ✅ Backend processing of click IDs
4. ✅ Basic ad attribution in analytics

### Phase 2: Important (Week 2)
1. Meta Conversion API integration
2. Google Enhanced Conversions
3. TikTok Events API
4. Ad platform dashboard

### Phase 3: Nice to Have (Week 3+)
1. Multi-touch attribution models
2. Ad spend import automation
3. ROAS calculation and reporting
4. Automated bidding recommendations

## Example URL Structures

### Facebook/Meta Ad
\`\`\`
https://yourdomain.com/?utm_source=facebook&utm_medium=cpc&utm_campaign=holiday-sale&utm_content=ad-123&fbclid=IwAR1...
\`\`\`

### Google Ads
\`\`\`
https://yourdomain.com/?utm_source=google&utm_medium=cpc&utm_campaign=brand-search&utm_term=best+crm&gclid=Cj0KC...
\`\`\`

### TikTok Ads
\`\`\`
https://yourdomain.com/?utm_source=tiktok&utm_medium=paid-social&utm_campaign=viral-video&ttclid=7abc...
\`\`\`

## Environment Variables Needed

\`\`\`bash
# Meta/Facebook
META_PIXEL_ID=123456789
META_CAPI_ACCESS_TOKEN=EAAabc...
META_AD_ACCOUNT_ID=act_123456

# Google Ads
GOOGLE_ADS_CONVERSION_ID=987654321
GOOGLE_ADS_CONVERSION_LABEL=abc123
GOOGLE_ADS_CUSTOMER_ID=123-456-7890
GOOGLE_ADS_DEVELOPER_TOKEN=your-dev-token
GOOGLE_ADS_CLIENT_ID=your-oauth-client-id
GOOGLE_ADS_CLIENT_SECRET=your-oauth-secret
GOOGLE_ADS_REFRESH_TOKEN=your-refresh-token

# TikTok
TIKTOK_PIXEL_ID=ABC123
TIKTOK_ACCESS_TOKEN=your-access-token
TIKTOK_ADVERTISER_ID=123456789

# Microsoft Ads
MICROSOFT_UET_TAG_ID=12345
MICROSOFT_CONVERSION_GOAL_ID=67890
\`\`\`

## Next Steps

Would you like me to:
1. **Start with Phase 1** (database migration + SDK updates)?
2. **Set up Meta CAPI** for server-side conversion tracking?
3. **Create the Ads dashboard** page with mock data first?
4. **Build the multi-touch attribution** engine?

Let me know which direction you'd like to go!
