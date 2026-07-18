import type { OnDemandWidgetConfig } from "@/features/studio/widgets/contracts";

export type PublicOnDemandAssetRow = {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  instructorName: string | null;
  classTypeName: string | null;
  updatedAt: Date;
};

export function toPublicOnDemandAsset(
  row: PublicOnDemandAssetRow,
  config: OnDemandWidgetConfig,
) {
  return {
    id: row.id,
    title: row.title.slice(0, 160),
    description: config.showDescription
      ? row.description?.slice(0, 2_000) ?? null
      : null,
    videoUrl: row.videoUrl,
    thumbnailUrl: row.thumbnailUrl,
    durationSeconds:
      config.showDuration &&
      row.durationSeconds !== null &&
      row.durationSeconds > 0 &&
      row.durationSeconds <= 86_400
        ? row.durationSeconds
        : null,
    instructorName: config.showInstructor
      ? row.instructorName?.slice(0, 160) ?? null
      : null,
    classTypeName: config.showClassType
      ? row.classTypeName?.slice(0, 160) ?? null
      : null,
    updatedAt: row.updatedAt.toISOString(),
  };
}
