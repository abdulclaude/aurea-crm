import "server-only";

import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import {
  funnel,
  funnelBlock,
  funnelBlockEvent,
  funnelBreakpoint,
  funnelPage,
  funnelPixelIntegration,
} from "@/db/schema";
import {
  canonicalPublicationValue,
  type PublicationJsonValue,
} from "@/features/publications/lib/content-hash";
import type { PublicationSourceScope } from "@/features/publications/server/source-types";

export async function buildFunnelSourceSnapshot(input: {
  sourceId: string;
  scope: PublicationSourceScope;
}): Promise<{ snapshot: PublicationJsonValue; errors: string[] }> {
  const [funnelRows, pages, blocks, breakpoints, events, pixels] =
    await Promise.all([
      db
        .select({
          id: funnel.id,
          name: funnel.name,
          description: funnel.description,
          funnelType: funnel.funnelType,
          externalUrl: funnel.externalUrl,
          trackingConfig: funnel.trackingConfig,
          locationId: funnel.locationId,
          updatedAt: funnel.updatedAt,
        })
        .from(funnel)
        .where(
          and(
            eq(funnel.id, input.sourceId),
            eq(funnel.organizationId, input.scope.organizationId),
            input.scope.locationId
              ? eq(funnel.locationId, input.scope.locationId)
              : isNull(funnel.locationId),
          ),
        )
        .limit(1),
      db
        .select({
          id: funnelPage.id,
          name: funnelPage.name,
          slug: funnelPage.slug,
          order: funnelPage.order,
          isPublished: funnelPage.isPublished,
          metaTitle: funnelPage.metaTitle,
          metaDescription: funnelPage.metaDescription,
          metaImage: funnelPage.metaImage,
          customCss: funnelPage.customCss,
          customJs: funnelPage.customJs,
          updatedAt: funnelPage.updatedAt,
        })
        .from(funnelPage)
        .where(eq(funnelPage.funnelId, input.sourceId))
        .orderBy(asc(funnelPage.order), asc(funnelPage.id)),
      db
        .select({
          id: funnelBlock.id,
          pageId: funnelBlock.pageId,
          parentBlockId: funnelBlock.parentBlockId,
          type: funnelBlock.type,
          props: funnelBlock.props,
          styles: funnelBlock.styles,
          order: funnelBlock.order,
          visible: funnelBlock.visible,
          targetWorkflowId: funnelBlock.targetWorkflowId,
          smartSectionId: funnelBlock.smartSectionId,
          updatedAt: funnelBlock.updatedAt,
        })
        .from(funnelBlock)
        .innerJoin(funnelPage, eq(funnelPage.id, funnelBlock.pageId))
        .where(eq(funnelPage.funnelId, input.sourceId))
        .orderBy(
          asc(funnelBlock.pageId),
          asc(funnelBlock.order),
          asc(funnelBlock.id),
        ),
      db
        .select({
          blockId: funnelBreakpoint.blockId,
          device: funnelBreakpoint.device,
          styles: funnelBreakpoint.styles,
        })
        .from(funnelBreakpoint)
        .innerJoin(funnelBlock, eq(funnelBlock.id, funnelBreakpoint.blockId))
        .innerJoin(funnelPage, eq(funnelPage.id, funnelBlock.pageId))
        .where(eq(funnelPage.funnelId, input.sourceId))
        .orderBy(asc(funnelBreakpoint.blockId), asc(funnelBreakpoint.device)),
      db
        .select({
          blockId: funnelBlockEvent.blockId,
          eventType: funnelBlockEvent.eventType,
          eventName: funnelBlockEvent.eventName,
          parameters: funnelBlockEvent.parameters,
        })
        .from(funnelBlockEvent)
        .innerJoin(funnelBlock, eq(funnelBlock.id, funnelBlockEvent.blockId))
        .innerJoin(funnelPage, eq(funnelPage.id, funnelBlock.pageId))
        .where(eq(funnelPage.funnelId, input.sourceId))
        .orderBy(asc(funnelBlockEvent.blockId)),
      db
        .select({
          provider: funnelPixelIntegration.provider,
          pixelId: funnelPixelIntegration.pixelId,
          enabled: funnelPixelIntegration.enabled,
          metadata: funnelPixelIntegration.metadata,
        })
        .from(funnelPixelIntegration)
        .where(eq(funnelPixelIntegration.funnelId, input.sourceId))
        .orderBy(asc(funnelPixelIntegration.provider)),
    ]);

  const funnelRow = funnelRows[0] ?? null;
  const errors: string[] = [];
  if (!funnelRow) {
    errors.push("The funnel source no longer exists.");
  } else if (funnelRow.funnelType === "EXTERNAL") {
    errors.push(
      "External funnel redirects cannot be published through this channel yet.",
    );
  }
  if (!pages.some((page) => page.isPublished)) {
    errors.push(
      "Publish at least one funnel page before publishing this target.",
    );
  }
  return {
    snapshot: canonicalPublicationValue({
      type: "FUNNEL",
      funnel: funnelRow,
      pages,
      blocks,
      breakpoints,
      events,
      pixels,
    }),
    errors,
  };
}
