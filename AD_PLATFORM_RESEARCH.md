# Ad Platform Integration - Comprehensive Research

## Research Completed: December 29, 2025

This document contains thorough research on integrating advertising platforms into the Aurea CRM funnel tracking system.

---

## 1. Click ID Parameters by Platform

### Meta/Facebook Ads
- **Primary Click ID**: `fbclid` (Facebook Click Identifier)
- **Format**: `fbclid=IwAR...` (Base64-like string)
- **Attribution Window**: 28 days (default), configurable 1-7 days
- **Cookie**: `_fbc` (Facebook Click Cookie) - stored in browser
- **Browser ID**: `_fbp` (Facebook Browser ID) - identifies browser
- **Additional**: `fbadid` for Facebook Audience Network

**Example URL**:
```
https://example.com?utm_source=facebook&utm_medium=cpc&utm_campaign=summer-sale&fbclid=IwAR1XyzAbc123...
```

**Privacy Notes**:
- iOS 14.5+ limited tracking requires CAPI (Conversion API)
- Must hash PII (email, phone) with SHA-256 before sending

### Google Ads
- **Primary Click ID**: `gclid` (Google Click Identifier)
- **Format**: `gclid=Cj0KCQj...` (Base64 encoded)
- **Attribution Window**: 90 days clicks, 1 day views (default)
- **iOS 14.5+ Parameters**:
  - `gbraid` - Google Ads iOS SKAdNetwork identifier
  - `wbraid` - Google Ads web-to-app conversion identifier
- **Additional**: `dclid` for Display & Video 360

**Example URL**:
```
https://example.com?utm_source=google&utm_medium=cpc&utm_term=crm+software&gclid=Cj0KCQj...
```

**Enhanced Conversions**:
- Requires first-party data (email, phone, name, address)
- Hash with SHA-256 before sending
- Improves attribution accuracy by 15-25%

### TikTok Ads
- **Primary Click ID**: `ttclid` (TikTok Click Identifier)
- **Format**: `ttclid=7abc...` (Alphanumeric)
- **Attribution Window**: 28 days clicks, 1 day views
- **Additional**: `tt_content` for content tracking

**Example URL**:
```
https://example.com?utm_source=tiktok&utm_medium=paid-social&utm_campaign=viral-video&ttclid=7abc123...
```

**Events API**:
- Required for iOS 14.5+ attribution
- Supports up to 48-hour delayed events
- Deduplication via event_id

### Microsoft/Bing Ads
- **Primary Click ID**: `msclkid` (Microsoft Click Identifier)
- **Format**: `msclkid=...` (Alphanumeric)
- **Attribution Window**: 90 days clicks
- **Additional**: UET (Universal Event Tracking) tag

**Example URL**:
```
https://example.com?utm_source=bing&utm_medium=cpc&msclkid=abc123xyz...
```

### Twitter/X Ads
- **Primary Click ID**: `twclid` (Twitter Click Identifier)
- **Format**: `twclid=...` (Alphanumeric)
- **Attribution Window**: 14-30 days configurable

### LinkedIn Ads
- **Primary Click ID**: `li_fat_id` (LinkedIn First-party Ad Tracking)
- **Format**: `li_fat_id=...` (UUID)
- **Attribution Window**: 90 days
- **Additional**: `_linkedin_data` cookie

### Snapchat Ads
- **Primary Click ID**: `ScCid` (Snapchat Click ID)
- **Format**: Case-sensitive alphanumeric
- **Attribution Window**: 28 days swipe-ups, 1 day views

### Pinterest Ads
- **Primary Click ID**: `epik` (Pinterest Tag Click ID)
- **Format**: Alphanumeric
- **Attribution Window**: 30 days

### Reddit Ads
- **Primary Click ID**: `rdt_cid` (Reddit Click ID)
- **Format**: Alphanumeric
- **Attribution Window**: 28 days

### Amazon Ads
- **Primary Click ID**: `pd_rd_i` (Amazon Attribution Tag)
- **Attribution Window**: 14 days

---

## 2. Storage Requirements & Attribution Windows

### Industry Best Practices

#### Click ID Storage Duration
- **Minimum**: 30 days (covers most platforms)
- **Recommended**: 90 days (Google Ads standard)
- **Maximum**: 365 days (for year-over-year analysis)

**Implementation**:
```typescript
// Store click IDs with timestamp
interface StoredClickID {
  id: string;
  timestamp: number;
  platform: string;
  expiresAt: number; // timestamp + attribution window
}

// Example
const clickIDStorage = {
  fbclid: {
    id: "IwAR1XyzAbc123",
    timestamp: 1704067200000,
    platform: "facebook",
    expiresAt: 1706745600000 // +28 days
  }
};
```

#### Cookie vs localStorage
- **Cookies**: Limited to 4KB, sent with every request
- **localStorage**: 5-10MB, stays on client side
- **Recommendation**: Use localStorage for click IDs, cookies only for cross-domain tracking

#### First-Party Cookies (for CAPI)
Must capture these cookies set by ad platforms:

| Platform | Cookie Name | Purpose |
|----------|-------------|---------|
| Facebook | `_fbc` | Stores fbclid for 90 days |
| Facebook | `_fbp` | Browser identifier |
| Google | `_gcl_aw` | Stores gclid |
| Google | `_gcl_dc` | Display & Video 360 |
| TikTok | `_ttp` | Browser identifier |

---

## 3. Conversion API Requirements

### Meta Conversion API (CAPI)

**Why it's critical**:
- iOS 14.5+ blocks client-side tracking (Safari, iOS apps)
- Ad blockers block Facebook Pixel
- CAPI has **30% higher match rate** than pixel-only

**Required Fields**:
```json
{
  "event_name": "Purchase", // Required
  "event_time": 1704067200, // Unix timestamp, required
  "event_source_url": "https://example.com/thank-you",
  "action_source": "website", // Required
  "event_id": "event.123", // For deduplication with pixel
  "user_data": {
    "em": ["7d5d..."], // Hashed email (SHA-256), array of up to 5
    "ph": ["a665..."], // Hashed phone (SHA-256), array
    "fn": ["50d8..."], // Hashed first name
    "ln": ["ec53..."], // Hashed last name
    "ct": ["5f2b..."], // Hashed city
    "st": ["2063..."], // Hashed state
    "zp": ["01d3..."], // Hashed ZIP
    "country": ["us"], // 2-letter country code, NOT hashed
    "client_ip_address": "192.0.2.1",
    "client_user_agent": "Mozilla/5.0...",
    "fbc": "fb.1.1704067200000.IwAR1XyzAbc123", // _fbc cookie
    "fbp": "fb.1.1704067200000.123456789" // _fbp cookie
  },
  "custom_data": {
    "value": 99.99,
    "currency": "USD",
    "content_type": "product",
    "contents": [{"id": "SKU123", "quantity": 1}]
  }
}
```

**Deduplication**:
- Use same `event_id` for both pixel and CAPI
- Meta deduplicates automatically within 48 hours
- CAPI takes priority if both sent

**Match Rate**:
- Email: ~50-70% match rate
- Phone + Email: ~70-85% match rate
- Phone + Email + Name + Address: ~85-95% match rate

### Google Enhanced Conversions

**Why it's critical**:
- Improves conversion measurement accuracy by 15-25%
- Required for consent mode (GDPR, CCPA)
- Works with gclid for full attribution

**Implementation Methods**:
1. **Google Tag (gtag.js)** - Client-side (easiest)
2. **Google Ads API** - Server-side (most accurate)
3. **Google Tag Manager** - Hybrid

**Required User Data**:
```javascript
// SHA-256 hashed values
{
  "email": "abc123...", // Hashed email
  "phone_number": "def456...", // Hashed phone (E.164 format)
  "address": {
    "first_name": "ghi789...",
    "last_name": "jkl012...",
    "street": "mno345...",
    "city": "pqr678...",
    "region": "stu901...",
    "postal_code": "vwx234...",
    "country": "US" // 2-letter code, NOT hashed
  }
}
```

**Example gtag.js**:
```javascript
gtag('set', 'user_data', {
  "email": "abc123...",
  "phone_number": "def456...",
  "address": {
    "first_name": "ghi789...",
    "last_name": "jkl012...",
    "city": "pqr678...",
    "region": "CA",
    "postal_code": "vwx234...",
    "country": "US"
  }
});

gtag('event', 'conversion', {
  'send_to': 'AW-123456789/AbC-D_efG-h12_34-567',
  'value': 99.99,
  'currency': 'USD',
  'transaction_id': 'T12345'
});
```

### TikTok Events API

**Why it's critical**:
- iOS 14.5+ tracking
- Ad blocker bypass
- Better attribution accuracy

**Required Fields**:
```json
{
  "pixel_code": "ABC123XYZ",
  "event": "CompletePayment",
  "event_time": 1704067200,
  "event_id": "event.123", // For deduplication
  "context": {
    "user_agent": "Mozilla/5.0...",
    "ip": "192.0.2.1",
    "ad": {
      "callback": "ttclid_value" // TikTok click ID
    }
  },
  "properties": {
    "value": 99.99,
    "currency": "USD",
    "contents": [{"content_id": "SKU123", "quantity": 1}]
  },
  "user": {
    "email": ["abc123..."], // SHA-256 hashed, array
    "phone": ["def456..."], // SHA-256 hashed, array
    "external_id": ["customer_123"] // Your CRM ID
  }
}
```

**Deduplication**:
- Use same `event_id` for pixel and API
- TikTok deduplicates within 48 hours

---

## 4. Privacy & Compliance

### GDPR (Europe)
- **Consent Required**: Yes, before setting any cookies/tracking
- **Cookie Banner**: Must explicitly ask for marketing/analytics consent
- **Data Minimization**: Only collect necessary data
- **Right to Deletion**: Must delete user data on request

**Implementation**:
```typescript
// Only initialize tracking after consent
if (userConsent.marketing === true) {
  initializeFacebookPixel();
  initializeGoogleAds();
}

// Store consent in session
{
  consentGiven: true,
  consentTimestamp: new Date(),
  consentVersion: "1.0",
  consents: {
    necessary: true,
    analytics: true,
    marketing: true
  }
}
```

### CCPA (California)
- **Do Not Sell**: Must honor "Do Not Sell My Personal Information"
- **Opt-Out Link**: Required on homepage
- **No Consent Required**: But must allow opt-out

### iOS 14.5+ ATT (App Tracking Transparency)
- **Impact**: 70-80% of iOS users opt-out
- **Solution**: Server-side tracking (CAPI, Enhanced Conversions)
- **SKAdNetwork**: Apple's privacy-safe attribution framework

### Cookie-less Tracking
**Strategies**:
1. **Server-Side Tracking**: CAPI, Enhanced Conversions, Events API
2. **First-Party Data**: Email, phone, customer ID
3. **Fingerprinting**: Browser, device, IP (limited by GDPR)
4. **Consent Mode**: Google's approach to GDPR

---

## 5. Database Schema Design

### Recommended Structure

#### Click IDs in Events Table
```prisma
model FunnelEvent {
  // ... existing fields
  
  // Meta/Facebook
  fbclid       String?  @db.Text
  fbp          String?  @db.VarChar(255)  // Facebook Browser ID
  fbc          String?  @db.Text          // Facebook Click Cookie
  
  // Google Ads
  gclid        String?  @db.Text
  gbraid       String?  @db.Text  // iOS 14.5+ (App to Web)
  wbraid       String?  @db.Text  // iOS 14.5+ (Web to App)
  dclid        String?  @db.Text  // Display & Video 360
  
  // TikTok
  ttclid       String?  @db.Text
  ttp          String?  @db.VarChar(255)  // TikTok Browser ID
  
  // Other Platforms
  msclkid      String?  @db.Text  // Microsoft/Bing
  twclid       String?  @db.Text  // Twitter/X
  li_fat_id    String?  @db.Text  // LinkedIn
  ScCid        String?  @db.Text  // Snapchat
  epik         String?  @db.Text  // Pinterest
  rdt_cid      String?  @db.Text  // Reddit
  
  // Indices for performance
  @@index([fbclid])
  @@index([gclid])
  @@index([ttclid])
  @@index([msclkid])
}
```

#### Click IDs in Sessions Table
```prisma
model FunnelSession {
  // ... existing fields
  
  // First Touch (from first page visit)
  firstFbclid   String?  @db.Text
  firstGclid    String?  @db.Text
  firstTtclid   String?  @db.Text
  firstMsclkid  String?  @db.Text
  
  // Last Touch (most recent before conversion)
  lastFbclid    String?  @db.Text
  lastGclid     String?  @db.Text
  lastTtclid    String?  @db.Text
  lastMsclkid   String?  @db.Text
  
  // Platform that drove conversion
  conversionPlatform String?  // 'facebook', 'google', 'tiktok', etc.
  
  // First-party cookies (for CAPI)
  fbp           String?  @db.VarChar(255)
  fbc           String?  @db.Text
  
  @@index([conversionPlatform])
}
```

#### Ad Spend Table (Optional - for ROAS calculation)
```prisma
model AdSpend {
  id            String   @id @default(cuid())
  funnelId      String
  platform      String   // 'facebook', 'google', 'tiktok'
  campaignId    String?  // Platform's campaign ID
  campaignName  String?
  date          DateTime @db.Date
  spend         Decimal  @db.Decimal(10, 2)
  currency      String   @default("USD")
  impressions   Int?
  clicks        Int?
  conversions   Int?
  revenue       Decimal? @db.Decimal(10, 2)
  
  createdAt     DateTime @default(now())
  
  funnel        Funnel   @relation(fields: [funnelId], references: [id], onDelete: Cascade)
  
  @@unique([funnelId, platform, date])
  @@index([funnelId, date])
}
```

---

## 6. SDK Implementation Details

### URL Parameter Extraction
```typescript
private buildContext() {
  const url = typeof window !== "undefined"
    ? new URL(window.location.href)
    : new URL("http://localhost");

  return {
    // ... existing context
    
    clickIds: {
      // Meta/Facebook
      fbclid: url.searchParams.get("fbclid") || undefined,
      fbadid: url.searchParams.get("fbadid") || undefined,
      
      // Google Ads
      gclid: url.searchParams.get("gclid") || undefined,
      gbraid: url.searchParams.get("gbraid") || undefined,
      wbraid: url.searchParams.get("wbraid") || undefined,
      dclid: url.searchParams.get("dclid") || undefined,
      
      // TikTok
      ttclid: url.searchParams.get("ttclid") || undefined,
      tt_content: url.searchParams.get("tt_content") || undefined,
      
      // Other platforms
      msclkid: url.searchParams.get("msclkid") || undefined,
      twclid: url.searchParams.get("twclid") || undefined,
      li_fat_id: url.searchParams.get("li_fat_id") || undefined,
      ScCid: url.searchParams.get("ScCid") || undefined,
      epik: url.searchParams.get("epik") || undefined,
      rdt_cid: url.searchParams.get("rdt_cid") || undefined,
    },
    
    // First-party cookies
    cookies: {
      fbp: this.getCookie("_fbp"),
      fbc: this.getCookie("_fbc"),
      ttp: this.getCookie("_ttp"),
    }
  };
}
```

### Cookie Reading
```typescript
private getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift();
  }
  return undefined;
}
```

### localStorage Persistence
```typescript
private storeClickIds(clickIds: any) {
  if (typeof localStorage === 'undefined') return;
  
  const stored = this.getStoredClickIds();
  const now = Date.now();
  
  // Update with new click IDs
  Object.entries(clickIds).forEach(([platform, id]) => {
    if (id) {
      stored[platform] = {
        id,
        timestamp: now,
        expiresAt: now + this.getAttributionWindow(platform)
      };
    }
  });
  
  localStorage.setItem('aurea_click_ids', JSON.stringify(stored));
}

private getAttributionWindow(platform: string): number {
  const windows: Record<string, number> = {
    fbclid: 28 * 24 * 60 * 60 * 1000,  // 28 days
    gclid: 90 * 24 * 60 * 60 * 1000,   // 90 days
    ttclid: 28 * 24 * 60 * 60 * 1000,  // 28 days
    msclkid: 90 * 24 * 60 * 60 * 1000, // 90 days
    twclid: 30 * 24 * 60 * 60 * 1000,  // 30 days
    li_fat_id: 90 * 24 * 60 * 60 * 1000, // 90 days
    ScCid: 28 * 24 * 60 * 60 * 1000,   // 28 days
  };
  return windows[platform] || 30 * 24 * 60 * 60 * 1000; // Default 30 days
}
```

---

## 7. Testing Strategy

### Test URLs for Each Platform

```bash
# Facebook Ads
http://localhost:3001/?utm_source=facebook&utm_medium=cpc&utm_campaign=test&fbclid=IwAR1test123

# Google Ads
http://localhost:3001/?utm_source=google&utm_medium=cpc&utm_campaign=test&gclid=Cj0KCtest123

# TikTok Ads
http://localhost:3001/?utm_source=tiktok&utm_medium=paid-social&utm_campaign=test&ttclid=7test123

# Microsoft Ads
http://localhost:3001/?utm_source=bing&utm_medium=cpc&utm_campaign=test&msclkid=test123
```

### Validation Checklist
- [ ] Click ID extracted from URL
- [ ] Click ID stored in localStorage
- [ ] Click ID sent with page_view event
- [ ] Click ID persists across page navigations
- [ ] Click ID expires after attribution window
- [ ] First-party cookies captured (_fbp, _fbc, _ttp)
- [ ] Multiple click IDs don't overwrite each other
- [ ] Conversion attributed to correct platform

---

## 8. Implementation Priority

### Phase 1: Foundation (Week 1) ✅ READY TO START
1. Database migration - Add click ID fields
2. SDK update - Capture click IDs from URL
3. SDK storage - localStorage with attribution windows
4. Backend processing - Store click IDs in database
5. Basic reporting - Show click IDs in analytics

### Phase 2: Server-Side Tracking (Week 2)
1. Meta Conversion API - Send purchases to Facebook
2. Google Enhanced Conversions - Send to Google Ads
3. TikTok Events API - Send to TikTok
4. Deduplication logic - Prevent double-counting

### Phase 3: Advanced Attribution (Week 3)
1. Multi-touch attribution models
2. Ad spend import (Meta, Google, TikTok APIs)
3. ROAS calculation dashboard
4. Platform comparison reporting

### Phase 4: Optimization (Week 4+)
1. Automated budget recommendations
2. Creative performance analysis
3. A/B testing integration
4. Predictive analytics

---

## 9. Key Takeaways

### Must-Have Features
✅ **Click ID Tracking** - Foundation for everything  
✅ **Server-Side Conversion APIs** - iOS 14.5+ requirement  
✅ **First-Party Data Collection** - Email, phone for enhanced matching  
✅ **Attribution Windows** - Expire old click IDs properly  
✅ **GDPR Compliance** - Consent management  

### Nice-to-Have Features
⭐ **Multi-Touch Attribution** - Advanced analytics  
⭐ **Ad Spend Import** - ROAS calculation  
⭐ **Creative Analytics** - Which ads perform best  
⭐ **Automated Bidding** - ML-based optimization  

### Common Pitfalls to Avoid
❌ **Not storing click IDs long enough** - Use 90 days minimum  
❌ **Forgetting first-party cookies** - Critical for CAPI  
❌ **Not hashing PII** - Security and compliance issue  
❌ **Client-side only tracking** - Misses 70%+ of iOS users  
❌ **No deduplication** - Double-counts conversions  

---

## 10. Next Steps

Ready to implement! Start with:
1. **Database migration** - Add click ID fields to schema
2. **SDK update** - Capture click IDs from URL + localStorage
3. **Backend processing** - Store and attribute conversions
4. **Testing** - Validate with test URLs

Let's build this! 🚀
