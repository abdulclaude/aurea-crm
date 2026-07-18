import type {
  PublishedPageData,
  FunnelRenderPolicy,
} from "./published-funnel-types";
import {
  containInlineScript,
  escapeHtml,
  serializeForInlineScript,
} from "./published-funnel-sanitization";

export function generateTrackingMarkup(
  data: PublishedPageData,
  policy: FunnelRenderPolicy,
): string {
  if (!policy.enableTracking || policy.mode === "preview") return "";

  const integrations = data.pixelIntegrations
    .filter((integration) => integration.enabled)
    .map((integration) => {
      switch (integration.provider) {
        case "META_PIXEL":
          return policy.trackingCategories.includes("MARKETING")
            ? generateMetaPixel(integration.pixelId)
            : "";
        case "GOOGLE_ANALYTICS":
          return policy.trackingCategories.includes("ANALYTICS")
            ? generateGoogleAnalytics(integration.pixelId)
            : "";
        case "TIKTOK_PIXEL":
          return policy.trackingCategories.includes("MARKETING")
            ? generateTikTokPixel(integration.pixelId)
            : "";
        case "CUSTOM":
          return policy.allowCustomScripts &&
            policy.trackingCategories.includes("MARKETING")
            ? generateCustomIntegration(integration.metadata)
            : "";
      }
    });

  const enabledIntegrations = integrations.filter(Boolean);
  if (enabledIntegrations.length === 0) return "";
  return [...enabledIntegrations, generateDelegatedEventTracking()].join("\n");
}

function generateMetaPixel(pixelId: string): string {
  const id = serializeForInlineScript(pixelId);
  const noScriptUrl = `https://www.facebook.com/tr?id=${encodeURIComponent(pixelId)}&ev=PageView&noscript=1`;
  return `
    <script>
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=true;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=true;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");
      fbq("init", ${id}); fbq("track", "PageView");
    </script>
    <noscript><img height="1" width="1" alt="" style="display:none" src="${escapeHtml(noScriptUrl)}" /></noscript>
  `;
}

function generateGoogleAnalytics(measurementId: string): string {
  const id = serializeForInlineScript(measurementId);
  return `
    <script async src="https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag("js", new Date()); gtag("config", ${id});
    </script>
  `;
}

function generateTikTokPixel(pixelId: string): string {
  const id = serializeForInlineScript(pixelId);
  return `
    <script>
      !function(w,d,t){w.TiktokAnalyticsObject=t;var q=w[t]=w[t]||[];q.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];q.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<q.methods.length;i++)q.setAndDefer(q,q.methods[i]);q.load=function(e){var n=d.createElement("script");n.type="text/javascript";n.async=true;n.src="https://analytics.tiktok.com/i18n/pixel/events.js?sdkid="+encodeURIComponent(e)+"&lib="+t;var s=d.getElementsByTagName("script")[0];s.parentNode.insertBefore(n,s)};q.load(${id});q.page()}(window,document,"ttq");
    </script>
  `;
}

function generateCustomIntegration(metadata: unknown): string {
  if (!isRecord(metadata) || typeof metadata.script !== "string") return "";
  return `<script>${containInlineScript(metadata.script)}</script>`;
}

function generateDelegatedEventTracking(): string {
  return `
    <script>
      (() => {
        const send = (element) => {
          const eventType = element.dataset.aureaTrack;
          if (!eventType) return;
          let parameters = {};
          try { parameters = JSON.parse(element.dataset.aureaEventParameters || "{}"); } catch { parameters = {}; }
          const eventName = element.dataset.aureaEventName || eventType;
          if (window.fbq) window.fbq("track", eventName, parameters);
          if (window.gtag) window.gtag("event", eventName, parameters);
          if (window.ttq) window.ttq.track(eventName, parameters);
        };
        document.addEventListener("click", (event) => {
          if (!(event.target instanceof Element)) return;
          const element = event.target.closest("[data-aurea-track]");
          if (element && element.tagName !== "FORM") send(element);
        });
        document.addEventListener("submit", (event) => {
          if (event.target instanceof HTMLFormElement && event.target.matches("[data-aurea-track]")) send(event.target);
        });
      })();
    </script>
  `;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
