import { createHash } from "node:crypto";

type AnonymousProfileScope = {
  organizationId: string;
  locationId: string | null;
};

export function buildAnonymousProfileId(
  scope: AnonymousProfileScope,
  anonymousId: string,
): string {
  const normalizedId = anonymousId.trim();
  if (!normalizedId || normalizedId.length > 256) {
    throw new Error("Anonymous visitor identity is invalid.");
  }
  const digest = createHash("sha256")
    .update(
      JSON.stringify([
        scope.organizationId,
        scope.locationId ?? null,
        normalizedId,
      ]),
    )
    .digest("hex");
  return `anon_${digest}`;
}
