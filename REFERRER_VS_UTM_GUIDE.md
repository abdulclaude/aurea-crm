# Referrer vs UTM Parameters - Complete Guide

## TL;DR - You're Doing It Correctly ✅

**Your current setup is PERFECT:**
- ✅ UTMs are manually added to URLs (`?utm_source=discord&utm_medium=social`)
- ✅ Referrer is automatically captured by the browser (`document.referrer`)
- ✅ SDK captures BOTH independently and sends them to your CRM
- ✅ TTR site has SDK properly initialized in `layout.tsx`

**You should NOT add referrer to URLs** - it's handled automatically by the browser.

---

## What's the Difference?

### UTM Parameters (Manual - YOU Control)

**What they are:**
- Query parameters YOU add to URLs
- Used for **marketing campaign tracking**
- Persist across redirects (if you keep them in the URL)
- Survive browser navigation (stay in URL)

**Format:**
```
https://ttr.com/?utm_source=discord&utm_medium=social&utm_campaign=launch_day
```

**Standard UTM Parameters:**
| Parameter | Purpose | Example |
|-----------|---------|---------|
| `utm_source` | Traffic source (where they came from) | `discord`, `facebook`, `email`, `google` |
| `utm_medium` | Marketing medium | `social`, `cpc`, `email`, `organic` |
| `utm_campaign` | Specific campaign name | `launch_day`, `black_friday`, `q1_promo` |
| `utm_term` | Paid keyword (optional) | `prop+trading`, `forex+course` |
| `utm_content` | Ad variation (optional) | `banner_a`, `text_link`, `video_thumbnail` |

**When to use:**
- Social media posts (Discord, Twitter, Facebook)
- Email campaigns
- Paid ads (Google Ads, Facebook Ads)
- Affiliate links
- QR codes
- Any link YOU control

**Examples:**
```bash
# Discord announcement
https://ttr.com/?utm_source=discord&utm_medium=social&utm_campaign=launch_announcement

# Email newsletter
https://ttr.com/?utm_source=newsletter&utm_medium=email&utm_campaign=weekly_tips

# Facebook ad
https://ttr.com/?utm_source=facebook&utm_medium=cpc&utm_campaign=spring_sale&utm_content=video_ad

# YouTube description
https://ttr.com/?utm_source=youtube&utm_medium=referral&utm_campaign=tutorial_series

# Twitter bio link
https://ttr.com/?utm_source=twitter&utm_medium=social&utm_campaign=profile_link
```

---

### Referrer (Automatic - Browser Controls)

**What it is:**
- HTTP header automatically set by the browser
- Tells you **which website the user came from** (previous page URL)
- JavaScript access: `document.referrer`
- Controlled by browser, NOT by you

**How it works:**
```
User is on: https://discord.com/channels/123/456
User clicks link to: https://ttr.com
Browser sends: Referrer: https://discord.com/channels/123/456
Your site sees: document.referrer = "https://discord.com/channels/123/456"
```

**When referrer is populated:**
- ✅ User clicks a link from another website
- ✅ User is redirected from another page
- ✅ User navigates between pages on your site

**When referrer is EMPTY:**
- ❌ User types URL directly into browser
- ❌ User clicks bookmark
- ❌ User comes from HTTPS → HTTP (security restriction)
- ❌ Some browsers/privacy tools block referrer
- ❌ User opens link from email client (depends on client)
- ❌ Link clicked from mobile apps (depends on app)

**You CANNOT control referrer:**
- You cannot add `?referrer=discord.com` to a URL (it doesn't work)
- Referrer is set by the **previous page**, not the destination
- Referrer policies can strip domain info (`Referrer-Policy` header)

---

## How Your SDK Handles Both

### SDK Captures Everything Automatically

**File:** `aurea-tracking-sdk/src/index.ts:1158-1172`

```typescript
private buildContext(): EventContext {
  const url = new URL(window.location.href);
  
  return {
    page: {
      url: window.location.href,
      path: window.location.pathname,
      title: document.title,
      referrer: document.referrer,  // ← Automatic browser value
    },
    
    utm: {
      source: url.searchParams.get("utm_source") || undefined,  // ← From URL
      medium: url.searchParams.get("utm_medium") || undefined,  // ← From URL
      campaign: url.searchParams.get("utm_campaign") || undefined,  // ← From URL
      term: url.searchParams.get("utm_term") || undefined,
      content: url.searchParams.get("utm_content") || undefined,
    },
    // ... other context
  };
}
```

**On every event, SDK sends:**
```json
{
  "eventName": "page_view",
  "context": {
    "page": {
      "url": "https://ttr.com/?utm_source=discord&utm_medium=social",
      "path": "/",
      "title": "Tom's Trading Room",
      "referrer": "https://discord.com/channels/123/456"  // ← Browser sets this
    },
    "utm": {
      "source": "discord",   // ← From URL query param
      "medium": "social",    // ← From URL query param
      "campaign": null
    }
  }
}
```

---

## Database Storage

### Individual Events (`FunnelEvent`)

**File:** `process-tracking-events.ts:141-145`

```typescript
{
  eventId: "evt_123",
  
  // UTM parameters from URL
  utmSource: evt.context.utm?.source,      // "discord"
  utmMedium: evt.context.utm?.medium,      // "social"
  utmCampaign: evt.context.utm?.campaign,  // "launch_day"
  utmTerm: evt.context.utm?.term,
  utmContent: evt.context.utm?.content,
  
  // Referrer from browser
  referrer: evt.context.page?.referrer,    // "https://discord.com/channels/123/456"
  
  // ... other fields
}
```

### Session Attribution (`FunnelSession`)

**File:** `process-tracking-events.ts:380-388`

```typescript
{
  sessionId: "sess_abc",
  
  // First-touch attribution (from first event in session)
  firstSource: firstEvent.utmSource,      // "discord"
  firstMedium: firstEvent.utmMedium,      // "social"
  firstCampaign: firstEvent.utmCampaign,  // "launch_day"
  firstReferrer: firstEvent.referrer,     // "https://discord.com/channels/123/456"
  firstPageUrl: firstEvent.pageUrl,       // "https://ttr.com/?utm_source=discord..."
  
  // Last-touch attribution (updated on each event)
  lastSource: lastEvent.utmSource,        // Updated as user browses
  lastMedium: lastEvent.utmMedium,
  lastCampaign: lastEvent.utmCampaign,
  lastPageUrl: lastEvent.pageUrl,
  
  // ... other fields
}
```

---

## Real-World Example: Discord → TTR → Checkout

### Scenario
User sees your Discord post with link: `https://ttr.com/?utm_source=discord&utm_medium=social&utm_campaign=launch_day`

### Step-by-Step Flow

**1. User clicks link in Discord**
```
Browser action: Navigate from discord.com to ttr.com
Browser sets: document.referrer = "https://discord.com/channels/123/456"
URL contains: ?utm_source=discord&utm_medium=social&utm_campaign=launch_day
```

**SDK captures:**
```json
{
  "eventName": "page_view",
  "context": {
    "page": {
      "referrer": "https://discord.com/channels/123/456"
    },
    "utm": {
      "source": "discord",
      "medium": "social",
      "campaign": "launch_day"
    }
  }
}
```

**2. User browses around TTR (no UTMs in URL now)**
```
URL: https://ttr.com/about
Referrer: https://ttr.com/ (previous page on same site)
```

**SDK captures:**
```json
{
  "eventName": "page_view",
  "context": {
    "page": {
      "referrer": "https://ttr.com/"  // ← Internal referrer
    },
    "utm": {
      "source": null,  // ← UTMs gone from URL
      "medium": null,
      "campaign": null
    }
  }
}
```

**But session still knows:**
- `firstSource = "discord"` (from first event)
- `firstReferrer = "https://discord.com/channels/123/456"`
- This is **first-touch attribution** - you know Discord brought them!

**3. User clicks "Buy Now" (Whop checkout)**
```
Browser navigates: ttr.com → whop.com
Whop sees: document.referrer = "https://ttr.com"
```

**4. User completes purchase and returns**
```
Browser navigates: whop.com → ttr.com/thank-you?from_checkout=true
Referrer: "https://whop.com/checkout/..."
```

**SDK detects return from checkout:**
```typescript
// File: aurea-tracking-sdk/src/index.ts:1216-1232
const referrer = document.referrer;
const whopReferrer = referrer.includes('whop.com');

if (whopReferrer && isThankYouPage) {
  this.track("checkout_return", {
    referrer: referrer,  // ← Uses referrer to detect Whop return
    returnUrl: window.location.href,
    fromWhop: true,
  });
}
```

**Session tracking shows:**
```typescript
{
  // Attribution - Shows Discord brought them originally
  firstSource: "discord",
  firstMedium: "social",
  firstCampaign: "launch_day",
  firstReferrer: "https://discord.com/channels/123/456",
  
  // Conversion - Knows they came back from Whop
  converted: true,
  conversionValue: 99.00,
  
  // Last action was checkout return (detected via referrer)
  lastPageUrl: "/thank-you?from_checkout=true"
}
```

---

## When to Use Each

### Use UTM Parameters When:

✅ **You control the link** (social posts, emails, ads)
- Discord announcement → Add UTMs
- Newsletter link → Add UTMs
- Facebook ad → Add UTMs
- YouTube description → Add UTMs
- Affiliate link → Add UTMs

✅ **You want campaign-level tracking**
```
Campaign A: ?utm_campaign=spring_sale
Campaign B: ?utm_campaign=summer_promo
```

✅ **You need to track performance across channels**
```
Facebook: ?utm_source=facebook&utm_medium=cpc
Instagram: ?utm_source=instagram&utm_medium=social
Google: ?utm_source=google&utm_medium=cpc
```

### Use Referrer When:

✅ **You DON'T control the link** (organic traffic, external sites)
- Someone shares your link on Reddit → Referrer shows it
- Blog mentions your site → Referrer shows which blog
- Search engines → Referrer shows Google/Bing
- Someone links from their site → Referrer shows their domain

✅ **Cross-domain tracking** (checkout flows)
- Your site → Payment processor → Your site
- SDK uses referrer to detect return from Whop/Stripe

✅ **Internal navigation**
- Track user journey: Home → About → Pricing → Checkout
- Referrer shows previous page on your site

### Use BOTH Together:

Most powerful when combined:

**Example 1: Discord → TTR → Whop → TTR**
- `firstSource = "discord"` (from UTM you added)
- `firstReferrer = "discord.com"` (from browser)
- `lastReferrer = "whop.com"` (browser shows checkout return)
- **Analysis:** Discord drove the visit, user converted via Whop

**Example 2: Email → TTR → Google search → TTR**
- `firstSource = "newsletter"` (from UTM)
- `firstReferrer = "mail.google.com"` (Gmail referrer)
- User leaves, Googles "TTR review", clicks result
- New session: `firstReferrer = "google.com"` but NO UTM
- **Analysis:** Email first touch, organic search second touch

---

## Common Pitfalls & Solutions

### ❌ WRONG: Adding referrer to URL
```
❌ https://ttr.com/?referrer=discord.com
```
**This does nothing.** Referrer is set by browser, not URL params.

### ✅ CORRECT: Let browser handle referrer, use UTMs for tracking
```
✅ https://ttr.com/?utm_source=discord&utm_medium=social
```
Browser automatically sends referrer header.

---

### ❌ WRONG: Expecting referrer from email
```javascript
// User clicks link in Gmail
document.referrer  // Often empty or "mail.google.com"
```
Email clients often strip referrer for privacy.

### ✅ CORRECT: Use UTMs for email tracking
```
✅ Newsletter link: https://ttr.com/?utm_source=newsletter&utm_medium=email&utm_campaign=week1
```
Now you know it came from email, regardless of referrer.

---

### ❌ WRONG: Expecting referrer from mobile apps
```javascript
// User clicks link in Discord mobile app
document.referrer  // Often empty
```
Mobile apps may not set referrer.

### ✅ CORRECT: Use UTMs for app links
```
✅ Discord: https://ttr.com/?utm_source=discord&utm_medium=social
```
Works even if referrer is empty.

---

### ❌ WRONG: Losing UTMs during navigation
```
User lands: https://ttr.com/?utm_source=discord
User clicks link: <a href="/about">About</a>
Now at: https://ttr.com/about  ← UTMs lost!
```

### ✅ CORRECT: Session tracking preserves first-touch
```
Even though UTMs are gone from URL, your CRM knows:
firstSource: "discord"  ← Saved from first page view
```
**You don't need to preserve UTMs in URLs** - first-touch attribution handles it.

---

## Your TTR Setup - Analysis

### ✅ What's Working Correctly

**1. SDK Initialization** (`ttr/src/app/layout.tsx`)
```tsx
<AureaTracking />
```
- Loads SDK on every page
- Captures UTMs + referrer automatically

**2. SDK Configuration** (`ttr/src/components/aurea-tracking.tsx:31-43`)
```typescript
initAurea({
  apiKey: process.env.NEXT_PUBLIC_AUREA_API_KEY,
  funnelId: process.env.NEXT_PUBLIC_AUREA_FUNNEL_ID,
  apiUrl: process.env.NEXT_PUBLIC_AUREA_API_URL,
  autoTrack: {
    pageViews: true,    // ← Tracks every page view with UTMs + referrer
    forms: true,
    scrollDepth: true,
    clicks: false,
  },
});
```

**3. Checkout Flow** (`aurea-tracking-sdk/src/index.ts:1216-1232`)
```typescript
// Detects return from Whop via referrer
const referrer = document.referrer;
const whopReferrer = referrer.includes('whop.com');

if (whopReferrer && isThankYouPage) {
  this.track("checkout_return", {
    referrer: referrer,  // ← Uses referrer, not UTM
    fromWhop: true,
  });
}
```
**Why this works:** Whop doesn't preserve your UTMs, but referrer shows they came from Whop.

**4. Event Tracking** (`ttr/src/components/buy-button.tsx`, `faq.tsx`, `cta.tsx`)
```typescript
import { trackEvent } from "aurea-tracking-sdk";

trackEvent('buy_button_clicked');  // SDK automatically includes UTMs + referrer
```

---

## Best Practices Summary

### For External Links (You Control)

**Social Media:**
```
Discord: ?utm_source=discord&utm_medium=social&utm_campaign=launch_day
Twitter: ?utm_source=twitter&utm_medium=social&utm_campaign=profile_link
Facebook: ?utm_source=facebook&utm_medium=social&utm_campaign=trading_group
```

**Email Marketing:**
```
Newsletter: ?utm_source=newsletter&utm_medium=email&utm_campaign=week1
Welcome email: ?utm_source=onboarding&utm_medium=email&utm_campaign=welcome_series
Promo email: ?utm_source=promo&utm_medium=email&utm_campaign=black_friday
```

**Paid Advertising:**
```
Google Ads: ?utm_source=google&utm_medium=cpc&utm_campaign=prop_trading_q1
Facebook Ads: ?utm_source=facebook&utm_medium=cpc&utm_campaign=retargeting&utm_content=video_ad
```

**Content Marketing:**
```
YouTube: ?utm_source=youtube&utm_medium=video&utm_campaign=tutorial_series
Blog post: ?utm_source=blog&utm_medium=content&utm_campaign=trading_tips
Podcast: ?utm_source=podcast&utm_medium=audio&utm_campaign=guest_interview
```

### For Internal Links (Your Site)

**No UTMs needed:**
```jsx
<Link href="/about">About</Link>  {/* ← No UTMs needed */}
```
- Internal referrer tracks navigation
- Session preserves first-touch UTMs

### For Third-Party Integrations

**Payment processors (Whop, Stripe):**
- Don't add UTMs to checkout URLs
- Use referrer to detect return
- SDK handles this automatically:
```typescript
// SDK detects: referrer.includes('whop.com') → tracks checkout return
```

**Webhooks:**
```typescript
// Whop webhook tells you purchase completed
// SDK links purchase to session via checkout tracking
```

---

## Testing Your UTMs

### 1. Visit with UTMs
```bash
open http://localhost:3001/?utm_source=test&utm_medium=debug&utm_campaign=verification
```

### 2. Check Browser Console
```
[Aurea SDK] Event tracked: page_view {
  context: {
    page: {
      referrer: "",  // Empty if direct visit
    },
    utm: {
      source: "test",
      medium: "debug",
      campaign: "verification"
    }
  }
}
```

### 3. Check Network Tab
```
POST /api/track/events
{
  "events": [{
    "context": {
      "utm": { "source": "test", "medium": "debug", "campaign": "verification" },
      "page": { "referrer": "" }
    }
  }]
}
```

### 4. Check CRM
```
Aurea CRM → Funnels → [Your Funnel] → Sessions
Should show: Source: "test" | Medium: "debug" | Campaign: "verification"
```

---

## UTM Builder Tool

Use this template for generating UTM links:

```
BASE_URL?utm_source={source}&utm_medium={medium}&utm_campaign={campaign}

Example:
https://ttr.com/?utm_source=discord&utm_medium=social&utm_campaign=launch_day
```

**Common combinations:**

| Channel | Source | Medium | Example Campaign |
|---------|--------|--------|-----------------|
| Discord post | `discord` | `social` | `launch_announcement` |
| Discord DM | `discord` | `dm` | `referral_program` |
| Email | `newsletter` | `email` | `weekly_tips` |
| Facebook organic | `facebook` | `social` | `community_post` |
| Facebook ads | `facebook` | `cpc` | `q1_retargeting` |
| Instagram bio | `instagram` | `social` | `profile_link` |
| YouTube video | `youtube` | `video` | `tutorial_part_3` |
| Twitter/X | `twitter` | `social` | `daily_tip` |
| Reddit | `reddit` | `social` | `r_forex_comment` |
| Blog guest post | `{blog_name}` | `content` | `guest_post` |
| Affiliate | `{affiliate_name}` | `affiliate` | `promo_code_xyz` |

---

## Conclusion

**You're doing everything correctly!**

✅ SDK captures UTMs from URL (manual tracking you control)
✅ SDK captures referrer from browser (automatic tracking)
✅ TTR has SDK properly initialized
✅ Both are stored in database for full attribution
✅ Multi-touch attribution works (first + last touch)

**What you should do:**
1. ✅ Keep adding UTMs to external links (Discord, email, ads)
2. ✅ Don't add referrer to URLs (browser handles it)
3. ✅ Don't worry about internal navigation (first-touch preserved)
4. ✅ Trust SDK to capture everything automatically

**What you should NOT do:**
1. ❌ Don't add `?referrer=...` to URLs (does nothing)
2. ❌ Don't try to preserve UTMs in internal links (not needed)
3. ❌ Don't add UTMs to checkout URLs (breaks Whop flow)

Your current setup maximizes attribution accuracy by using both UTMs (controlled) and referrer (automatic) together. This is the industry standard approach used by Google Analytics, Mixpanel, Amplitude, and all major analytics platforms.
