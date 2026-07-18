import { storedPublicationSnapshotSchema } from "@/features/publications/public/contracts";

export const PUBLICATION_TARGET_HEADER = "x-aurea-publication-target";
export const PUBLICATION_VERSION_HEADER = "x-aurea-publication-version";

export function getPublicationFrameOrigins(input: {
  kind: string;
  snapshot: unknown;
}): string[] {
  if (input.kind !== "WIDGET" && input.kind !== "FORM") return [];
  const parsed = storedPublicationSnapshotSchema.safeParse(input.snapshot);
  if (!parsed.success) return [];
  const channel = parsed.data.channelConfig;
  return channel.kind === "WIDGET" || channel.kind === "FORM"
    ? channel.allowedFrameOrigins
    : [];
}

export function buildFrameAncestorsPolicy(origins: readonly string[]): string {
  const valid = origins.every((origin) => {
    try {
      const url = new URL(origin);
      const localHttp =
        url.protocol === "http:" &&
        (url.hostname === "localhost" || url.hostname === "127.0.0.1");
      return (
        origin === url.origin &&
        (url.protocol === "https:" || localHttp) &&
        !decodeURIComponent(url.hostname).includes("*") &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  });
  if (!valid) return "frame-ancestors 'none';";
  return origins.length > 0
    ? `frame-ancestors ${origins.join(" ")};`
    : "frame-ancestors 'none';";
}

export function applyPublicationSecurityHeaders(
  headers: Headers,
  frameOrigins: readonly string[],
): void {
  headers.set("Content-Security-Policy", buildFrameAncestorsPolicy(frameOrigins));
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  headers.set("Cache-Control", "private, no-store, max-age=0");
}
