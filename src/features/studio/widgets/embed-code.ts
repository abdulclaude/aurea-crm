import { WidgetType } from "@/db/enums";
import { storedPublicationSnapshotSchema } from "@/features/publications/public/contracts";

function htmlAttribute(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character] ?? character;
  });
}

function appBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (!configured) return "https://app.aurea.studio";
  try {
    return new URL(configured).origin;
  } catch {
    return "https://app.aurea.studio";
  }
}

export function buildPublishedWidgetEmbed(input: {
  widget: { name: string; type: WidgetType };
  target: { slug: string; snapshot: unknown } | null;
  organizationSlug: string;
}) {
  if (
    (input.widget.type !== WidgetType.SCHEDULE &&
      input.widget.type !== WidgetType.BOOKING &&
      input.widget.type !== WidgetType.INSTRUCTORS &&
      input.widget.type !== WidgetType.MEMBERSHIP &&
      input.widget.type !== WidgetType.INTRO_OFFER &&
      input.widget.type !== WidgetType.EVENT &&
      input.widget.type !== WidgetType.ON_DEMAND &&
      input.widget.type !== WidgetType.REFERRAL) ||
    !input.target
  ) {
    return null;
  }
  const snapshot = storedPublicationSnapshotSchema.safeParse(
    input.target.snapshot,
  );
  if (!snapshot.success || snapshot.data.channelConfig.kind !== "WIDGET") {
    return null;
  }
  if (snapshot.data.channelConfig.allowedFrameOrigins.length === 0) return null;
  const previewUrl = `${appBaseUrl()}/p/${encodeURIComponent(input.organizationSlug)}/${encodeURIComponent(input.target.slug)}`;
  const title = input.widget.type === WidgetType.SCHEDULE
    ? `${input.widget.name} schedule`
    : input.widget.type === WidgetType.BOOKING
      ? `${input.widget.name} appointments`
    : input.widget.type === WidgetType.INSTRUCTORS
      ? `${input.widget.name} instructors`
      : input.widget.type === WidgetType.INTRO_OFFER
        ? `${input.widget.name} intro offers`
        : input.widget.type === WidgetType.EVENT
          ? `${input.widget.name} events`
          : input.widget.type === WidgetType.ON_DEMAND
            ? `${input.widget.name} on-demand videos`
            : input.widget.type === WidgetType.REFERRAL
              ? `${input.widget.name} referral program`
              : `${input.widget.name} memberships`;
  const sandbox =
    input.widget.type === WidgetType.BOOKING ||
    input.widget.type === WidgetType.INTRO_OFFER
    ? ' sandbox="allow-popups allow-popups-to-escape-sandbox"'
    : " sandbox";
  return {
    previewUrl,
    iframeCode: `<iframe src="${htmlAttribute(previewUrl)}" title="${htmlAttribute(title)}" width="100%" height="${snapshot.data.channelConfig.height}" style="border:0" loading="lazy" referrerpolicy="no-referrer"${sandbox}></iframe>`,
  };
}
