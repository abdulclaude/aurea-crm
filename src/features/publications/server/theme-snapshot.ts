import "server-only";

import { and, eq, isNull, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { db } from "@/db";
import { globalStylePreset } from "@/db/schema";
import { canonicalPublicationValue } from "@/features/publications/lib/content-hash";
import type { PublicationSourceScope } from "@/features/publications/server/source-types";

export async function buildThemeSnapshot(input: {
  themePresetId: string | null;
  scope: PublicationSourceScope;
}): Promise<ReturnType<typeof canonicalPublicationValue> | null> {
  if (!input.themePresetId) return null;
  const [theme] = await db
    .select({
      id: globalStylePreset.id,
      name: globalStylePreset.name,
      primaryColor: globalStylePreset.primaryColor,
      secondaryColor: globalStylePreset.secondaryColor,
      accentColor: globalStylePreset.accentColor,
      backgroundColor: globalStylePreset.backgroundColor,
      textColor: globalStylePreset.textColor,
      mutedColor: globalStylePreset.mutedColor,
      borderColor: globalStylePreset.borderColor,
      fontFamily: globalStylePreset.fontFamily,
      headingFont: globalStylePreset.headingFont,
      fontSize: globalStylePreset.fontSize,
      fontWeight: globalStylePreset.fontWeight,
      lineHeight: globalStylePreset.lineHeight,
      spacing: globalStylePreset.spacing,
      borderRadius: globalStylePreset.borderRadius,
      buttonPresets: globalStylePreset.buttonPresets,
      shadows: globalStylePreset.shadows,
      updatedAt: globalStylePreset.updatedAt,
    })
    .from(globalStylePreset)
    .where(
      and(
        eq(globalStylePreset.id, input.themePresetId),
        eq(globalStylePreset.organizationId, input.scope.organizationId),
        input.scope.locationId
          ? or(
              isNull(globalStylePreset.locationId),
              eq(globalStylePreset.locationId, input.scope.locationId),
            )
          : isNull(globalStylePreset.locationId),
      ),
    )
    .limit(1);
  if (!theme) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "The selected theme is not available in this workspace.",
    });
  }
  return canonicalPublicationValue(theme);
}
