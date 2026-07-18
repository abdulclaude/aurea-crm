import {
  escapeHtml,
  sanitizeCssValue,
  serializeForInlineScript,
  toSafeDomId,
} from "./published-funnel-sanitization";
import type { PublishedFunnelBlock } from "./published-funnel-types";

type ConversionBlockInput = {
  block: PublishedFunnelBlock;
  childrenHtml: string;
  className: string;
  props: Record<string, unknown>;
};

export function renderConversionBlock(
  input: ConversionBlockInput,
): string | null {
  switch (input.block.type) {
    case "POPUP":
      return renderPopup(input);
    case "COUNTDOWN_TIMER":
      return renderCountdown(input);
    case "STICKY_BAR":
      return renderStickyBar(input);
    default:
      return null;
  }
}

function renderPopup({
  block,
  childrenHtml,
  className,
  props,
}: ConversionBlockInput): string {
  const popupId = toSafeDomId(block.id, "popup");
  const overlayId = toSafeDomId(block.id, "popup-overlay");
  const overlayEnabled = props.overlay !== false;
  const overlayColor =
    sanitizeCssValue(props.overlayColor) ?? "rgba(0, 0, 0, 0.7)";
  const closeButton = props.closeButton !== false;
  const trigger = normalizeEnum(
    props.trigger,
    ["exitIntent", "scroll", "time"],
    "exitIntent",
  );
  const triggerValue = boundedNumber(props.triggerValue, 50, 0, 86_400);
  const position = normalizeEnum(
    props.position,
    ["center", "top", "bottom", "right"],
    "center",
  );
  const positionStyles = getPopupPositionStyles(position);

  return `
    ${overlayEnabled ? `<div id="${overlayId}" data-aurea-popup-dismiss="${popupId}" style="display:none;position:fixed;inset:0;background:${overlayColor};z-index:9998;"></div>` : ""}
    <section id="${popupId}" class="${className}" role="dialog" aria-modal="true" aria-hidden="true" style="display:none;position:fixed;${positionStyles};z-index:9999;">
      ${closeButton ? `<button type="button" data-aurea-popup-dismiss="${popupId}" aria-label="Close" style="position:absolute;top:10px;right:10px;background:transparent;border:0;font-size:24px;cursor:pointer;">&times;</button>` : ""}
      ${childrenHtml}
    </section>
    <script>${popupRuntime({ overlayId, popupId, trigger, triggerValue })}</script>
  `;
}

function popupRuntime(config: {
  overlayId: string;
  popupId: string;
  trigger: string;
  triggerValue: number;
}): string {
  return `
    (() => {
      const config = ${serializeForInlineScript(config)};
      const popup = document.getElementById(config.popupId);
      const overlay = document.getElementById(config.overlayId);
      if (!popup) return;
      let shown = false;
      let previouslyFocused = null;
      const hide = () => {
        popup.style.display = "none";
        popup.setAttribute("aria-hidden", "true");
        if (overlay) overlay.style.display = "none";
        if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
      };
      const show = () => {
        if (shown) return;
        shown = true;
        previouslyFocused = document.activeElement;
        if (overlay) overlay.style.display = "block";
        popup.style.display = "block";
        popup.setAttribute("aria-hidden", "false");
        popup.querySelector("button, a, input, select, textarea, [tabindex]")?.focus();
      };
      document.querySelectorAll('[data-aurea-popup-dismiss="' + config.popupId + '"]').forEach((element) => element.addEventListener("click", hide));
      document.addEventListener("keydown", (event) => { if (event.key === "Escape" && popup.getAttribute("aria-hidden") === "false") hide(); });
      if (config.trigger === "exitIntent") document.addEventListener("mouseout", (event) => { if (event.clientY < 10) show(); });
      if (config.trigger === "scroll") window.addEventListener("scroll", () => {
        const available = document.body.scrollHeight - window.innerHeight;
        const percent = available > 0 ? (window.scrollY / available) * 100 : 100;
        if (percent >= config.triggerValue) show();
      }, { passive: true });
      if (config.trigger === "time") window.setTimeout(show, config.triggerValue * 1000);
    })();
  `;
}

function renderCountdown({
  block,
  className,
  props,
}: ConversionBlockInput): string {
  const timerId = toSafeDomId(block.id, "timer");
  const duration = boundedNumber(props.duration, 600, 0, 31_536_000);
  const format = normalizeEnum(
    props.format,
    ["HH:MM:SS", "MM:SS", "DD:HH:MM"],
    "HH:MM:SS",
  );
  const config = {
    duration,
    expiredText: String(props.expiredText ?? "Offer expired!"),
    format,
    persistent: props.persistent === true,
    storageKey: `countdown_${block.id}`,
    timerId,
  };

  return `
    <section class="${className}" style="text-align:center;">
      ${props.textBefore ? `<div style="margin-bottom:8px;">${escapeHtml(String(props.textBefore))}</div>` : ""}
      <div id="${timerId}" role="timer" aria-live="polite">00:00:00</div>
    </section>
    <script>${countdownRuntime(config)}</script>
  `;
}

function countdownRuntime(config: Record<string, unknown>): string {
  return `
    (() => {
      const config = ${serializeForInlineScript(config)};
      const element = document.getElementById(config.timerId);
      if (!element) return;
      let timeLeft = config.duration;
      if (config.persistent) {
        try {
          const stored = localStorage.getItem(config.storageKey);
          if (stored) timeLeft = Math.max(0, Math.floor((JSON.parse(stored).endTime - Date.now()) / 1000));
          else localStorage.setItem(config.storageKey, JSON.stringify({ endTime: Date.now() + config.duration * 1000 }));
        } catch { /* Persistence is optional. */ }
      }
      const formatTime = (seconds) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remaining = seconds % 60;
        if (config.format === "MM:SS") return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(remaining).padStart(2, "0");
        if (config.format === "DD:HH:MM") return days + "d " + hours + "h " + minutes + "m";
        return String(Math.floor(seconds / 3600)).padStart(2, "0") + ":" + String(minutes).padStart(2, "0") + ":" + String(remaining).padStart(2, "0");
      };
      const update = () => {
        if (timeLeft <= 0) { element.textContent = config.expiredText; return; }
        element.textContent = formatTime(timeLeft);
        timeLeft -= 1;
        window.setTimeout(update, 1000);
      };
      update();
    })();
  `;
}

function renderStickyBar({
  block,
  childrenHtml,
  className,
  props,
}: ConversionBlockInput): string {
  const barId = toSafeDomId(block.id, "sticky-bar");
  const position = props.position === "top" ? "top" : "bottom";
  const showOn = normalizeEnum(
    props.showOn,
    ["always", "scroll", "mobile"],
    "always",
  );
  const config = {
    barId,
    scrollThreshold: boundedNumber(props.scrollThreshold, 100, 0, 100_000),
    showOn,
  };
  return `
    <aside id="${barId}" class="${className}" style="position:fixed;${position}:0;left:0;width:100%;z-index:9000;${showOn === "scroll" ? "display:none;" : ""}">
      ${props.dismissible === false ? "" : `<button type="button" data-aurea-sticky-dismiss="${barId}" aria-label="Dismiss" style="position:absolute;top:10px;right:10px;background:transparent;border:0;font-size:20px;cursor:pointer;">&times;</button>`}
      ${childrenHtml}
    </aside>
    <script>${stickyBarRuntime(config)}</script>
  `;
}

function stickyBarRuntime(config: Record<string, unknown>): string {
  return `
    (() => {
      const config = ${serializeForInlineScript(config)};
      const bar = document.getElementById(config.barId);
      if (!bar) return;
      document.querySelector('[data-aurea-sticky-dismiss="' + config.barId + '"]')?.addEventListener("click", () => { bar.style.display = "none"; });
      const update = () => {
        if (config.showOn === "scroll") bar.style.display = window.scrollY > config.scrollThreshold ? "block" : "none";
        if (config.showOn === "mobile") bar.style.display = window.matchMedia("(max-width: 767px)").matches ? "block" : "none";
      };
      if (config.showOn !== "always") { update(); window.addEventListener("scroll", update, { passive: true }); window.addEventListener("resize", update); }
    })();
  `;
}

function boundedNumber(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed)
    ? Math.min(maximum, Math.max(minimum, parsed))
    : fallback;
}

function normalizeEnum(
  value: unknown,
  allowed: readonly string[],
  fallback: string,
): string {
  return typeof value === "string" && allowed.includes(value)
    ? value
    : fallback;
}

function getPopupPositionStyles(position: string): string {
  if (position === "top") {
    return "top:20px;left:50%;transform:translateX(-50%);";
  }
  if (position === "bottom") {
    return "bottom:20px;left:50%;transform:translateX(-50%);";
  }
  if (position === "right") {
    return "top:50%;right:20px;transform:translateY(-50%);";
  }
  return "top:50%;left:50%;transform:translate(-50%,-50%);";
}
