import "server-only";

import { TRPCError } from "@trpc/server";
import { and, eq, ne } from "drizzle-orm";

import { db } from "@/db";
import { publicationTarget } from "@/db/schema";
import { publicationChannelConfigSchema } from "@/features/publications/contracts";
import {
  publishedWidgetSourceSchema,
  storedPublicationSnapshotSchema,
} from "@/features/publications/public/contracts";
import { buildChannelSourceSnapshot } from "@/features/publications/server/channel-snapshots";
import { buildThemeSnapshot } from "@/features/publications/server/theme-snapshot";
import {
  getWidgetOrThrow,
  targetScopeWhere,
  type WidgetScope,
} from "@/features/studio/server/widget-router-support";

const defaultWidgetChannelConfig = publicationChannelConfigSchema.parse({
  kind: "WIDGET",
});

type WidgetDraftPreview = {
  widgetName: string;
  organizationId: string;
  locationId: string | null;
  sourceId: string;
  snapshot: ReturnType<typeof storedPublicationSnapshotSchema.parse>;
  themeSnapshot: Awaited<ReturnType<typeof buildThemeSnapshot>>;
};

export async function getWidgetDraftPreview(input: {
  id: string;
  scope: WidgetScope;
}): Promise<WidgetDraftPreview> {
  const widget = await getWidgetOrThrow(input.id, input.scope);
  if (!widget.isActive) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Enable this widget before previewing it.",
    });
  }

  const [sourceSnapshot, target] = await Promise.all([
    buildChannelSourceSnapshot({
      kind: "WIDGET",
      sourceId: widget.id,
      scope: input.scope,
    }),
    db
      .select({
        channelConfig: publicationTarget.channelConfig,
        themePresetId: publicationTarget.themePresetId,
      })
      .from(publicationTarget)
      .where(
        and(
          targetScopeWhere(input.scope),
          eq(publicationTarget.kind, "WIDGET"),
          eq(publicationTarget.sourceId, widget.id),
          ne(publicationTarget.status, "ARCHIVED"),
        ),
      )
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);
  const source = publishedWidgetSourceSchema.safeParse(sourceSnapshot);
  if (!source.success) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "This widget cannot be previewed until its selected content is available.",
    });
  }

  const parsedChannel = publicationChannelConfigSchema.safeParse(
    target?.channelConfig,
  );
  const channelConfig =
    parsedChannel.success && parsedChannel.data.kind === "WIDGET"
      ? parsedChannel.data
      : defaultWidgetChannelConfig;
  const themeSnapshot = await buildThemeSnapshot({
    themePresetId: target?.themePresetId ?? null,
    scope: input.scope,
  });

  return {
    widgetName: widget.name,
    organizationId: input.scope.organizationId,
    locationId: input.scope.locationId,
    sourceId: widget.id,
    snapshot: storedPublicationSnapshotSchema.parse({
      schemaVersion: 1,
      source: source.data,
      channelConfig,
    }),
    themeSnapshot,
  };
}
