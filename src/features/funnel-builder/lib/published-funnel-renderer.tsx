/**
 * Published Funnel Renderer
 *
 * Renders a published funnel page with:
 * - Pixel tracking scripts injected
 * - Block-level event tracking
 * - SEO metadata
 * - Custom CSS/JS
 */

import type {
  FunnelPage,
  FunnelBlock,
  FunnelBlockEvent,
  FunnelPixelIntegration,
  FunnelBreakpoint,
  DeviceType,
} from "@prisma/client";
import { generateAllTrackingScripts } from "./tracking-scripts";

export interface PublishedPageData {
  page: FunnelPage & {
    blocks: (FunnelBlock & {
      breakpoints: FunnelBreakpoint[];
      trackingEvent: FunnelBlockEvent | null;
    })[];
  };
  pixelIntegrations: FunnelPixelIntegration[];
}

/**
 * Generate the complete HTML <head> content for a published funnel page
 */
export function generatePageHead(data: PublishedPageData): string {
  const { page, pixelIntegrations } = data;

  // Generate tracking scripts
  const trackingScripts = generateAllTrackingScripts(
    pixelIntegrations.map((integration) => ({
      provider: integration.provider,
      pixelId: integration.pixelId,
      enabled: integration.enabled,
      metadata: integration.metadata as Record<string, unknown> | null,
    }))
  );

  const scriptTags = trackingScripts.map((script) => script.headScript).join("\n");

  return `
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />

    <!-- SEO Meta Tags -->
    <title>${escapeHtml(page.metaTitle || page.name)}</title>
    ${page.metaDescription ? `<meta name="description" content="${escapeHtml(page.metaDescription)}" />` : ""}
    ${page.metaImage ? `<meta property="og:image" content="${escapeHtml(page.metaImage)}" />` : ""}
    <meta property="og:title" content="${escapeHtml(page.metaTitle || page.name)}" />
    ${page.metaDescription ? `<meta property="og:description" content="${escapeHtml(page.metaDescription)}" />` : ""}

    <!-- Tracking Scripts -->
    ${scriptTags}

    <!-- Custom CSS -->
    ${page.customCss ? `<style>${page.customCss}</style>` : ""}

    <!-- Base Styles -->
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        line-height: 1.5;
      }
    </style>
  `.trim();
}

/**
 * Generate the <body> content with custom JS and tracking initialization
 */
export function generatePageBody(data: PublishedPageData): string {
  const { page } = data;

  return `
    ${page.customJs ? `<script>${page.customJs}</script>` : ""}

    <!-- Tracking Event Handler -->
    <script>
      window.trackFunnelEvent = function(eventType, eventName, parameters) {
        // Meta Pixel
        if (window.fbq) {
          window.fbq('track', eventName || eventType, parameters || {});
        }

        // Google Analytics
        if (window.gtag) {
          window.gtag('event', eventName || eventType, parameters || {});
        }

        // TikTok Pixel
        if (window.ttq) {
          window.ttq.track(eventName || eventType, parameters || {});
        }

        console.log('[Funnel Tracking]', eventType, eventName, parameters);
      };
    </script>
  `.trim();
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char] || char);
}

/**
 * Get the inline event handler for a block
 */
export function getBlockEventHandler(
  block: FunnelBlock & { trackingEvent: FunnelBlockEvent | null }
): string | null {
  if (!block.trackingEvent) return null;

  const { eventType, eventName } = block.trackingEvent;

  return `trackFunnelEvent('${eventType}', ${eventName ? `'${eventName}'` : "null"})`;
}

/**
 * Convert block styles to inline CSS string
 */
export function convertStylesToInlineCSS(
  baseStyles: Record<string, unknown>,
  deviceBreakpoint?: FunnelBreakpoint | null
): string {
  const styles = {
    ...baseStyles,
    ...(deviceBreakpoint?.styles as Record<string, unknown> || {}),
  };

  return Object.entries(styles)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => {
      // Convert camelCase to kebab-case
      const cssKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();

      // Add 'px' to numeric values for certain properties
      const numericProperties = [
        "width", "height", "margin", "padding", "font-size", "border-radius",
        "top", "bottom", "left", "right", "gap", "border-width"
      ];

      let cssValue = value;
      if (typeof value === "number" && numericProperties.some(prop => cssKey.includes(prop))) {
        cssValue = `${value}px`;
      }

      return `${cssKey}: ${cssValue}`;
    })
    .join("; ");
}

/**
 * Build the complete HTML tree for blocks (recursive)
 */
export function renderBlockTree(
  blocks: (FunnelBlock & {
    breakpoints: FunnelBreakpoint[];
    trackingEvent: FunnelBlockEvent | null;
  })[],
  parentId: string | null = null,
  deviceType: DeviceType = "DESKTOP"
): string {
  const children = blocks
    .filter((block) => block.parentBlockId === parentId)
    .sort((a, b) => a.order - b.order);

  return children
    .map((block) => {
      const props = block.props as Record<string, unknown>;
      const deviceBreakpoint = block.breakpoints.find((bp) => bp.device === deviceType);
      const inlineStyles = convertStylesToInlineCSS(
        block.styles as Record<string, unknown>,
        deviceBreakpoint
      );
      const eventHandler = getBlockEventHandler(block);

      // Recursive child rendering
      const childrenHTML = renderBlockTree(blocks, block.id, deviceType);

      switch (block.type) {
        case "CONTAINER":
        case "ONE_COLUMN":
        case "TWO_COLUMN":
        case "THREE_COLUMN":
        case "SECTION":
          return `<div style="${inlineStyles}">${childrenHTML}</div>`;

        case "HEADING": {
          const tag = props.tag || "h1";
          const text = props.text || "Heading";
          return `<${tag} style="${inlineStyles}">${escapeHtml(String(text))}</${tag}>`;
        }

        case "PARAGRAPH": {
          const text = props.text || "";
          return `<p style="${inlineStyles}">${escapeHtml(String(text))}</p>`;
        }

        case "RICH_TEXT": {
          const content = props.content || "";
          return `<div style="${inlineStyles}">${content}</div>`;
        }

        case "IMAGE": {
          const src = props.src || "";
          const alt = props.alt || "";
          return `<img src="${escapeHtml(String(src))}" alt="${escapeHtml(String(alt))}" style="${inlineStyles}" />`;
        }

        case "VIDEO": {
          const src = props.src || "";
          const controls = props.controls ? "controls" : "";
          const autoplay = props.autoplay ? "autoplay" : "";
          const loop = props.loop ? "loop" : "";
          return `<video src="${escapeHtml(String(src))}" ${controls} ${autoplay} ${loop} style="${inlineStyles}"></video>`;
        }

        case "BUTTON": {
          const text = props.text || "Click me";
          const href = props.href;
          const onClick = eventHandler ? `onclick="${eventHandler}"` : "";

          if (href) {
            return `<a href="${escapeHtml(String(href))}" style="${inlineStyles}" ${onClick}>${escapeHtml(String(text))}</a>`;
          }
          return `<button style="${inlineStyles}" ${onClick}>${escapeHtml(String(text))}</button>`;
        }

        case "INPUT": {
          const type = props.type || "text";
          const placeholder = props.placeholder || "";
          const name = props.name || "";
          const required = props.required ? "required" : "";
          return `<input type="${type}" name="${name}" placeholder="${escapeHtml(String(placeholder))}" style="${inlineStyles}" ${required} />`;
        }

        case "TEXTAREA": {
          const placeholder = props.placeholder || "";
          const name = props.name || "";
          const required = props.required ? "required" : "";
          return `<textarea name="${name}" placeholder="${escapeHtml(String(placeholder))}" style="${inlineStyles}" ${required}></textarea>`;
        }

        case "SELECT": {
          const name = props.name || "";
          const options = String(props.options || "").split(",");
          const optionTags = options
            .map((opt) => `<option value="${escapeHtml(opt.trim())}">${escapeHtml(opt.trim())}</option>`)
            .join("");
          return `<select name="${name}" style="${inlineStyles}">${optionTags}</select>`;
        }

        case "FORM": {
          const onSubmit = eventHandler
            ? `onsubmit="event.preventDefault(); ${eventHandler}; this.submit();"`
            : "";
          const action = props.action || "#";
          const method = props.method || "POST";
          return `<form action="${escapeHtml(String(action))}" method="${method}" style="${inlineStyles}" ${onSubmit}>${childrenHTML}</form>`;
        }

        case "CARD":
          return `<div style="${inlineStyles}">${childrenHTML}</div>`;

        case "FAQ": {
          const question = props.question || "Question";
          const answer = props.answer || "Answer";
          return `<details style="${inlineStyles}"><summary>${escapeHtml(String(question))}</summary><p>${escapeHtml(String(answer))}</p></details>`;
        }

        case "TESTIMONIAL": {
          const quote = props.quote || "";
          const author = props.author || "";
          const role = props.role || "";
          return `<div style="${inlineStyles}"><blockquote>"${escapeHtml(String(quote))}"</blockquote><p><strong>${escapeHtml(String(author))}</strong>${role ? `, ${escapeHtml(String(role))}` : ""}</p></div>`;
        }

        case "PRICING": {
          const title = props.title || "";
          const price = props.price || "";
          const features = String(props.features || "")
            .split(",")
            .map((f) => `<li>${escapeHtml(f.trim())}</li>`)
            .join("");
          return `<div style="${inlineStyles}"><h3>${escapeHtml(String(title))}</h3><p>${escapeHtml(String(price))}</p><ul>${features}</ul></div>`;
        }

        case "IFRAME": {
          const src = props.src || "";
          const title = props.title || "";
          return `<iframe src="${escapeHtml(String(src))}" title="${escapeHtml(String(title))}" style="${inlineStyles}"></iframe>`;
        }

        case "CUSTOM_HTML": {
          const html = props.html || "";
          return `<div style="${inlineStyles}">${html}</div>`;
        }

        // CONVERSION ENHANCERS
        case "POPUP": {
          const trigger = props.trigger || "exitIntent";
          const triggerValue = props.triggerValue || "50";
          const overlay = props.overlay !== false;
          const overlayColor = props.overlayColor || "rgba(0, 0, 0, 0.7)";
          const closeButton = props.closeButton !== false;
          const position = props.position || "center";
          const animation = props.animation || "fadeIn";

          const popupId = `popup-${block.id}`;
          const overlayId = `popup-overlay-${block.id}`;

          // Position styles
          const positionStyles = position === "center"
            ? "top: 50%; left: 50%; transform: translate(-50%, -50%);"
            : position === "top"
            ? "top: 20px; left: 50%; transform: translateX(-50%);"
            : position === "bottom"
            ? "bottom: 20px; left: 50%; transform: translateX(-50%);"
            : "top: 50%; right: 20px; transform: translateY(-50%);";

          return `
            ${overlay ? `<div id="${overlayId}" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:${overlayColor};z-index:9998;" onclick="document.getElementById('${popupId}').style.display='none';this.style.display='none';"></div>` : ""}
            <div id="${popupId}" style="display:none;position:fixed;${positionStyles}${inlineStyles};z-index:9999;" class="popup-${animation}">
              ${closeButton ? `<button onclick="document.getElementById('${popupId}').style.display='none';${overlay ? `document.getElementById('${overlayId}').style.display='none';` : ""}" style="position:absolute;top:10px;right:10px;background:transparent;border:none;font-size:24px;cursor:pointer;color:#999;">&times;</button>` : ""}
              ${childrenHTML}
            </div>
            <script>
              (function() {
                const popup = document.getElementById('${popupId}');
                const overlay = document.getElementById('${overlayId}');
                const trigger = '${trigger}';
                const triggerValue = ${triggerValue};

                function showPopup() {
                  if (overlay) overlay.style.display = 'block';
                  popup.style.display = 'block';
                }

                if (trigger === 'exitIntent') {
                  document.addEventListener('mouseout', function(e) {
                    if (e.clientY < 10) showPopup();
                  });
                } else if (trigger === 'scroll') {
                  window.addEventListener('scroll', function() {
                    const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
                    if (scrollPercent >= triggerValue) showPopup();
                  });
                } else if (trigger === 'time') {
                  setTimeout(showPopup, triggerValue * 1000);
                }
              })();
            </script>
          `;
        }

        case "COUNTDOWN_TIMER": {
          const duration = Number(props.duration) || 600;
          const format = props.format || "HH:MM:SS";
          const expiredText = props.expiredText || "Offer expired!";
          const persistent = props.persistent || false;
          const textBefore = props.textBefore || "";

          const timerId = `timer-${block.id}`;

          return `
            <div style="${inlineStyles};text-align:center;">
              ${textBefore ? `<div style="margin-bottom:8px;">${escapeHtml(String(textBefore))}</div>` : ""}
              <div id="${timerId}" style="font-size:2rem;font-weight:700;font-family:monospace;">00:00:00</div>
            </div>
            <script>
              (function() {
                const timerEl = document.getElementById('${timerId}');
                const duration = ${duration};
                const format = '${format}';
                const expiredText = '${escapeHtml(String(expiredText))}';
                const persistent = ${persistent};
                const storageKey = 'countdown_${block.id}';

                let timeLeft = duration;

                if (persistent) {
                  const stored = localStorage.getItem(storageKey);
                  if (stored) {
                    const { endTime } = JSON.parse(stored);
                    timeLeft = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
                  } else {
                    localStorage.setItem(storageKey, JSON.stringify({ endTime: Date.now() + duration * 1000 }));
                  }
                }

                function formatTime(seconds) {
                  if (format === 'HH:MM:SS') {
                    const h = Math.floor(seconds / 3600);
                    const m = Math.floor((seconds % 3600) / 60);
                    const s = seconds % 60;
                    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
                  } else if (format === 'MM:SS') {
                    const m = Math.floor(seconds / 60);
                    const s = seconds % 60;
                    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
                  } else {
                    const d = Math.floor(seconds / 86400);
                    const h = Math.floor((seconds % 86400) / 3600);
                    const m = Math.floor((seconds % 3600) / 60);
                    return d + 'd ' + h + 'h ' + m + 'm';
                  }
                }

                function updateTimer() {
                  if (timeLeft <= 0) {
                    timerEl.textContent = expiredText;
                    return;
                  }
                  timerEl.textContent = formatTime(timeLeft);
                  timeLeft--;
                  setTimeout(updateTimer, 1000);
                }

                updateTimer();
              })();
            </script>
          `;
        }

        case "STICKY_BAR": {
          const position = props.position || "bottom";
          const showOn = props.showOn || "always";
          const scrollThreshold = Number(props.scrollThreshold) || 100;
          const dismissible = props.dismissible !== false;

          const barId = `sticky-bar-${block.id}`;
          const positionStyle = position === "top" ? "top:0;" : "bottom:0;";

          return `
            <div id="${barId}" style="position:fixed;${positionStyle}left:0;width:100%;${inlineStyles};z-index:9000;${showOn === 'scroll' ? 'display:none;' : ''}">
              ${dismissible ? `<button onclick="document.getElementById('${barId}').style.display='none';" style="position:absolute;top:10px;right:10px;background:transparent;border:none;font-size:20px;cursor:pointer;color:#999;">&times;</button>` : ""}
              ${childrenHTML}
            </div>
            <script>
              (function() {
                const bar = document.getElementById('${barId}');
                const showOn = '${showOn}';
                const scrollThreshold = ${scrollThreshold};

                if (showOn === 'scroll') {
                  window.addEventListener('scroll', function() {
                    if (window.scrollY > scrollThreshold) {
                      bar.style.display = 'block';
                    } else {
                      bar.style.display = 'none';
                    }
                  });
                } else if (showOn === 'mobile') {
                  if (window.innerWidth <= 768) {
                    bar.style.display = 'block';
                  } else {
                    bar.style.display = 'none';
                  }
                }
              })();
            </script>
          `;
        }

        default:
          return `<div style="${inlineStyles}">${childrenHTML}</div>`;
      }
    })
    .join("");
}

/**
 * Generate complete published page HTML
 */
export function generatePublishedPageHTML(data: PublishedPageData): string {
  const head = generatePageHead(data);
  const bodyScripts = generatePageBody(data);
  const content = renderBlockTree(data.page.blocks);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  ${head}
</head>
<body>
  ${content}
  ${bodyScripts}
</body>
</html>`;
}
