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

export function buildPublishedFormEmbed(input: {
  name: string;
  slug: string;
  organizationSlug: string;
  snapshot: unknown;
}) {
  const envelope = storedPublicationSnapshotSchema.safeParse(input.snapshot);
  if (!envelope.success || envelope.data.channelConfig.kind !== "FORM") {
    return null;
  }
  const channel = envelope.data.channelConfig;
  const previewUrl = `${appBaseUrl()}/p/${encodeURIComponent(input.organizationSlug)}/${encodeURIComponent(input.slug)}`;
  return {
    previewUrl,
    iframeCode:
      channel.allowedFrameOrigins.length > 0
        ? `<iframe src="${htmlAttribute(previewUrl)}" title="${htmlAttribute(input.name)}" width="100%" height="${channel.height}" style="border:0" loading="lazy" referrerpolicy="no-referrer" sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"></iframe>`
        : null,
  };
}
