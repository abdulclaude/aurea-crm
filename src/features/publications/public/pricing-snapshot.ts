import {
  publishedPricingSourceSchema,
  storedPublicationSnapshotSchema,
} from "@/features/publications/public/contracts";

export function getPublishedPricingSnapshot(snapshot: unknown) {
  const envelope = storedPublicationSnapshotSchema.parse(snapshot);
  if (envelope.channelConfig.kind !== "PRICING") return null;
  const source = publishedPricingSourceSchema.parse(envelope.source);
  if (!source.pricingOption) return null;
  return {
    option: source.pricingOption,
    policy: envelope.channelConfig,
  };
}

export function publishedPricingSourceIsCurrent(input: {
  snapshot: ReturnType<typeof getPublishedPricingSnapshot>;
  sourceId: string;
  sourceUpdatedAt: Date;
}): boolean {
  if (!input.snapshot || input.snapshot.option.id !== input.sourceId) {
    return false;
  }
  return (
    new Date(input.snapshot.option.updatedAt).getTime() ===
    input.sourceUpdatedAt.getTime()
  );
}
