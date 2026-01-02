# Aurea Custom Funnel SDK - Quick Reference

## Installation

```bash
npm install @aurea/tracking-sdk
```

## Basic Setup

```typescript
import { init } from '@aurea/tracking-sdk';

init({
  apiKey: 'aurea_sk_live_xxx',
  funnelId: 'funnel_xxx',
  autoTrack: {
    pageViews: true,
    forms: true,
  },
});
```

## Core Methods

### Track Event
```typescript
aurea.track(eventName, properties?, options?)
```

**Example:**
```typescript
aurea.track('button_clicked', {
  buttonId: 'hero-cta',
  section: 'hero',
});
```

### Identify User
```typescript
aurea.identify(userId, traits?)
```

**Example:**
```typescript
aurea.identify('user@example.com', {
  name: 'John Doe',
  plan: 'premium',
});
```

### Track Page View
```typescript
aurea.page(name?, properties?)
```

**Example:**
```typescript
aurea.page('Pricing', {
  category: 'sales',
});
```

### Track Conversion
```typescript
aurea.conversion({
  type: string,
  revenue: number,
  currency?: string,
  orderId?: string,
  products?: array,
  properties?: object,
})
```

**Example:**
```typescript
aurea.conversion({
  type: 'purchase',
  revenue: 99.00,
  currency: 'USD',
  orderId: 'order_123',
  products: [{
    id: 'prod_1',
    name: 'Premium Plan',
    price: 99.00,
  }],
});
```

## React Hooks

```typescript
import { usePageTracking, useTrackEvent } from '@aurea/tracking-sdk/react';

// Track page view
usePageTracking('Dashboard');

// Track events
const trackEvent = useTrackEvent();
trackEvent('feature_used', { feature: 'export' });
```

## React Components

```typescript
import { Track, TrackableButton, TrackableLink } from '@aurea/tracking-sdk/react';

// Track on render
<Track event="modal_opened" properties={{ modal: 'signup' }} once />

// Trackable button
<TrackableButton
  eventName="cta_clicked"
  eventProperties={{ location: 'hero' }}
  onClick={handleClick}
>
  Get Started
</TrackableButton>

// Trackable link
<TrackableLink
  href="/pricing"
  eventProperties={{ source: 'nav' }}
>
  Pricing
</TrackableLink>
```

## Standard Event Names

| Event | When to Use |
|-------|-------------|
| `page_view` | Page visit (auto-tracked) |
| `form_submit` | Form submission |
| `button_click` | Button/CTA click |
| `conversion` | Purchase or signup |
| `checkout_initiated` | User starts checkout |
| `checkout_abandoned` | User abandons checkout |
| `video_played` | Video starts playing |
| `video_completed` | Video finishes |
| `link_clicked` | External link click |
| `file_downloaded` | File download |
| `scroll_depth` | User scrolls (auto-tracked) |

## Configuration Options

```typescript
{
  // Required
  apiKey: string,
  funnelId: string,
  
  // Optional
  apiUrl?: string,              // Default: production API
  debug?: boolean,              // Log to console
  
  autoTrack?: {
    pageViews?: boolean,        // Default: true
    clicks?: boolean,           // Default: false
    forms?: boolean,            // Default: true
    scrollDepth?: boolean,      // Default: false
  },
  
  respectDoNotTrack?: boolean,  // Default: true
  anonymizeIp?: boolean,        // Default: true
  
  batchSize?: number,           // Default: 10
  batchInterval?: number,       // Default: 2000ms
}
```

## Event Properties Structure

All events automatically include:

```typescript
{
  eventId: string,              // Unique ID
  eventName: string,            // Your event name
  properties: object,           // Your custom properties
  
  context: {
    page: {
      url: string,
      path: string,
      title: string,
      referrer: string,
    },
    
    utm: {
      source?: string,
      medium?: string,
      campaign?: string,
      term?: string,
      content?: string,
    },
    
    user: {
      userId?: string,
      anonymousId: string,
    },
    
    session: {
      sessionId: string,
    },
    
    device: {
      userAgent: string,
      screenWidth: number,
      screenHeight: number,
      language: string,
      timezone: string,
    },
    
    library: {
      name: '@aurea/tracking-sdk',
      version: string,
    },
  },
  
  timestamp: number,
}
```

## Server-Side Tracking

```typescript
// In API route or webhook
await fetch('https://app.aureacrm.com/api/track/events', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Aurea-API-Key': 'aurea_sk_live_xxx',
    'X-Aurea-Funnel-ID': 'funnel_xxx',
  },
  body: JSON.stringify({
    events: [{
      eventId: 'evt_unique',
      eventName: 'conversion',
      properties: {
        revenue: 99,
        orderId: 'order_123',
      },
      context: {
        user: {
          userId: 'user@example.com',
        },
        session: {
          sessionId: 'server_side',
        },
      },
      timestamp: Date.now(),
    }],
  }),
});
```

## Common Patterns

### Track Form Submission
```typescript
const handleSubmit = (e: FormEvent) => {
  e.preventDefault();
  
  const formData = new FormData(e.currentTarget);
  const data = Object.fromEntries(formData);
  
  aurea.formSubmit('contact-form', {
    email: data.email,
    source: 'hero',
  });
  
  // Then submit form
};
```

### Track CTA Clicks
```typescript
const handleCtaClick = () => {
  aurea.track('cta_clicked', {
    ctaText: 'Get Started',
    location: 'hero',
    destination: '/signup',
  });
  
  router.push('/signup');
};
```

### Identify After Login
```typescript
const handleLogin = async (email: string) => {
  // Perform login
  const user = await login(email);
  
  // Identify in Aurea
  aurea.identify(user.email, {
    name: user.name,
    plan: user.plan,
    loginDate: new Date().toISOString(),
  });
};
```

### Track Engagement
```typescript
// Scroll tracking
useEffect(() => {
  const handleScroll = () => {
    const scrollPercent = 
      (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
    
    if (scrollPercent > 75 && !tracked.current) {
      aurea.track('deep_scroll', { percent: 75 });
      tracked.current = true;
    }
  };
  
  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, []);

// Time on page
useEffect(() => {
  const startTime = Date.now();
  
  return () => {
    const timeOnPage = Math.floor((Date.now() - startTime) / 1000);
    
    if (timeOnPage > 30) {
      aurea.track('engaged_session', {
        duration: timeOnPage,
        page: window.location.pathname,
      });
    }
  };
}, []);
```

## Debugging

### Enable Debug Mode
```typescript
init({
  // ... other config
  debug: true,
});
```

### Check SDK Status
```javascript
// In browser console
window.aurea                     // SDK instance
window.aurea.track('test', {})   // Test event
```

### View Network Requests
1. Open DevTools → Network
2. Filter by "track"
3. Check requests to `/api/track/events`

### Common Issues

**Events not sending:**
- Check API key and Funnel ID
- Verify SDK is initialized
- Check browser console for errors

**Double events:**
- Make sure you're not calling `init()` twice
- Check React strict mode (development only)

**Missing context:**
- UTM params only captured on first page load
- User ID persists in localStorage after `identify()`

## Environment Variables

```bash
# Client-side (required)
NEXT_PUBLIC_AUREA_API_KEY=aurea_sk_live_xxx
NEXT_PUBLIC_AUREA_FUNNEL_ID=funnel_xxx

# Server-side (for webhooks, optional)
AUREA_API_KEY=aurea_sk_live_xxx
AUREA_FUNNEL_ID=funnel_xxx
AUREA_API_URL=https://app.aureacrm.com/api
```

## TypeScript Types

```typescript
import type { 
  AureaSDKConfig,
  TrackingEvent,
  EventContext,
  ConversionData,
  TrackOptions,
} from '@aurea/tracking-sdk';
```

## Rate Limits

- **Events:** 1000 events/second per funnel
- **Batch size:** Max 100 events per request
- **Request size:** Max 1MB payload

## Best Practices

✅ **DO:**
- Use semantic event names
- Include relevant properties
- Identify users when possible
- Batch similar events
- Test in development mode

❌ **DON'T:**
- Track PII without consent
- Send high-frequency events (>1/sec)
- Include sensitive data (passwords, cards)
- Block rendering on tracking
- Use generic event names

## Support

- Documentation: https://docs.aureacrm.com/sdk
- GitHub: https://github.com/aurea/tracking-sdk
- Discord: https://discord.gg/aurea
- Email: support@aureacrm.com
