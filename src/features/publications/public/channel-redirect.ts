import { notFound, redirect } from "next/navigation";

export function redirectPublishedChannel(input: {
  kind: "PRICING" | "FORM" | "GIFT_CARDS";
  organizationSlug: string;
  sourceId: string | null;
  snapshot: unknown;
  targetSlug: string;
}): never {
  if (input.kind === "PRICING") {
    const source = getRecord(getRecord(input.snapshot)?.source);
    const option = getRecord(source?.pricingOption);
    const slug = typeof option?.slug === "string" ? option.slug : null;
    if (slug) {
      redirect(
        `/pricing/${encodeURIComponent(input.organizationSlug)}/${encodeURIComponent(slug)}?publication=${encodeURIComponent(input.targetSlug)}`,
      );
    }
  }
  if (input.kind === "GIFT_CARDS") {
    redirect(
      `/gift-cards/${encodeURIComponent(input.organizationSlug)}?publication=${encodeURIComponent(input.targetSlug)}`,
    );
  }
  notFound();
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
