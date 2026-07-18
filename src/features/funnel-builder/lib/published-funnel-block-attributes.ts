import type { PublishedFunnelBlock } from "./published-funnel-types";
import { escapeHtml } from "./published-funnel-sanitization";

export function getBlockTrackingAttributes(
  block: PublishedFunnelBlock,
  trackingEnabled: boolean,
): string {
  if (!trackingEnabled || !block.trackingEvent) return "";

  const attributes = [
    `data-aurea-track="${escapeHtml(block.trackingEvent.eventType)}"`,
  ];
  if (block.trackingEvent.eventName) {
    attributes.push(
      `data-aurea-event-name="${escapeHtml(block.trackingEvent.eventName)}"`,
    );
  }
  if (block.trackingEvent.parameters) {
    attributes.push(
      `data-aurea-event-parameters="${escapeHtml(JSON.stringify(block.trackingEvent.parameters))}"`,
    );
  }
  return attributes.join(" ");
}

export function htmlAttributes(
  attributes: Array<string | null | undefined>,
): string {
  return attributes.filter(Boolean).join(" ");
}
