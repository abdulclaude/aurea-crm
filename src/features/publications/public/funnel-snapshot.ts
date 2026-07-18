import { TRPCError } from "@trpc/server";

import type { PublishedPageData } from "@/features/funnel-builder/lib/published-funnel-renderer";
import {
  publishedFunnelSourceSchema,
  storedPublicationSnapshotSchema,
} from "@/features/publications/public/contracts";

export function getPublishedFunnelPage(input: {
  snapshot: unknown;
  pageSlug: string | null;
}): {
  data: PublishedPageData;
  allowCustomCode: boolean;
  analytics: "DISABLED" | "CONSENTED" | "ALWAYS";
} {
  const envelope = storedPublicationSnapshotSchema.parse(input.snapshot);
  if (envelope.channelConfig.kind !== "FUNNEL") {
    throw invalidSnapshot();
  }
  const source = publishedFunnelSourceSchema.parse(envelope.source);
  const page = input.pageSlug
    ? source.pages.find(
        (candidate) =>
          candidate.slug === input.pageSlug && candidate.isPublished,
      )
    : [...source.pages]
        .filter((candidate) => candidate.isPublished)
        .sort((left, right) => left.order - right.order)[0];
  if (!page || !source.funnel) throw invalidSnapshot();

  const breakpointsByBlock = new Map<string, typeof source.breakpoints>();
  for (const breakpoint of source.breakpoints) {
    const values = breakpointsByBlock.get(breakpoint.blockId) ?? [];
    values.push(breakpoint);
    breakpointsByBlock.set(breakpoint.blockId, values);
  }
  const eventsByBlock = new Map(
    source.events.map((event) => [event.blockId, event]),
  );
  const blocks = source.blocks
    .filter((block) => block.pageId === page.id)
    .map((block) => ({
      ...block,
      breakpoints: breakpointsByBlock.get(block.id) ?? [],
      trackingEvent: eventsByBlock.get(block.id) ?? null,
    }));

  return {
    allowCustomCode: envelope.channelConfig.allowCustomCode,
    analytics: envelope.channelConfig.analytics,
    data: {
      page: {
        id: page.id,
        funnelId: source.funnel.id,
        name: page.name,
        slug: page.slug,
        isPublished: page.isPublished,
        metaTitle: page.metaTitle,
        metaDescription: page.metaDescription,
        metaImage: page.metaImage,
        customCss: page.customCss,
        customJs: page.customJs,
        blocks,
      },
      pixelIntegrations: source.pixels,
    },
  };
}

function invalidSnapshot(): TRPCError {
  return new TRPCError({
    code: "NOT_FOUND",
    message: "Published page not found",
  });
}
