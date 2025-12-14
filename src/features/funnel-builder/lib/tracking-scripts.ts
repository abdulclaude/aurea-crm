/**
 * Tracking Scripts Generator
 *
 * Generates pixel tracking scripts for Meta, Google Analytics, TikTok, and custom scripts.
 * These scripts are injected into the <head> of published funnel pages.
 */

import type { PixelProvider } from "@prisma/client";

export interface TrackingScript {
  provider: PixelProvider;
  pixelId: string;
  headScript: string;
  bodyScript?: string;
}

/**
 * Generate Meta Pixel (Facebook) tracking script
 */
export function generateMetaPixelScript(pixelId: string): TrackingScript {
  return {
    provider: "META_PIXEL",
    pixelId,
    headScript: `
<!-- Meta Pixel Code -->
<script>
  !function(f,b,e,v,n,t,s) {
    if(f.fbq) return;
    n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq) f._fbq=n;
    n.push=n; n.loaded=!0; n.version='2.0';
    n.queue=[];
    t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)
  }(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '${pixelId}');
  fbq('track', 'PageView');
</script>
<noscript>
  <img height="1" width="1" style="display:none"
       src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/>
</noscript>
<!-- End Meta Pixel Code -->
    `.trim(),
  };
}

/**
 * Generate Google Analytics 4 tracking script
 */
export function generateGA4Script(measurementId: string): TrackingScript {
  return {
    provider: "GOOGLE_ANALYTICS",
    pixelId: measurementId,
    headScript: `
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${measurementId}');
</script>
<!-- End Google Analytics -->
    `.trim(),
  };
}

/**
 * Generate TikTok Pixel tracking script
 */
export function generateTikTokPixelScript(pixelId: string): TrackingScript {
  return {
    provider: "TIKTOK_PIXEL",
    pixelId,
    headScript: `
<!-- TikTok Pixel Code -->
<script>
  !function (w, d, t) {
    w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
    ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],
    ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
    for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
    ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},
    ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";
    ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};
    n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=i+"?sdkid="+e+"&lib="+t;
    e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
    ttq.load('${pixelId}');
    ttq.page();
  }(window, document, 'ttq');
</script>
<!-- End TikTok Pixel Code -->
    `.trim(),
  };
}

/**
 * Generate custom tracking script
 */
export function generateCustomScript(script: string): TrackingScript {
  return {
    provider: "CUSTOM",
    pixelId: "custom",
    headScript: script,
  };
}

/**
 * Generate all tracking scripts for a funnel
 */
export function generateAllTrackingScripts(
  integrations: Array<{
    provider: PixelProvider;
    pixelId: string;
    enabled: boolean;
    metadata?: Record<string, unknown> | null;
  }>
): TrackingScript[] {
  return integrations
    .filter((integration) => integration.enabled)
    .map((integration) => {
      switch (integration.provider) {
        case "META_PIXEL":
          return generateMetaPixelScript(integration.pixelId);
        case "GOOGLE_ANALYTICS":
          return generateGA4Script(integration.pixelId);
        case "TIKTOK_PIXEL":
          return generateTikTokPixelScript(integration.pixelId);
        case "CUSTOM":
          return generateCustomScript(
            (integration.metadata as { script?: string })?.script || ""
          );
        default:
          throw new Error(
            `Unknown pixel provider: ${integration.provider as string}`
          );
      }
    });
}

/**
 * Track a conversion event across all enabled pixels
 * This function is called from the client-side (browser)
 */
export function trackEvent(
  eventType: string,
  eventName?: string,
  parameters?: Record<string, unknown>
): void {
  // Meta Pixel
  if (typeof window !== "undefined" && (window as any).fbq) {
    (window as any).fbq("track", eventName || eventType, parameters);
  }

  // Google Analytics
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", eventName || eventType, parameters);
  }

  // TikTok Pixel
  if (typeof window !== "undefined" && (window as any).ttq) {
    (window as any).ttq.track(eventName || eventType, parameters);
  }
}

/**
 * Standard event types for funnel tracking
 */
export const STANDARD_EVENTS = {
  // Page events
  PAGE_VIEW: "PageView",
  VIEW_CONTENT: "ViewContent",

  // Engagement events
  LEAD: "Lead",
  SUBMIT_FORM: "SubmitForm",
  COMPLETE_REGISTRATION: "CompleteRegistration",

  // E-commerce events
  ADD_TO_CART: "AddToCart",
  INITIATE_CHECKOUT: "InitiateCheckout",
  PURCHASE: "Purchase",

  // Booking events
  SCHEDULE: "Schedule",
  BOOK_CALL: "BookCall",

  // Custom events
  CUSTOM: "CustomEvent",
} as const;

export type StandardEventType =
  (typeof STANDARD_EVENTS)[keyof typeof STANDARD_EVENTS];
