import "server-only";

import { and, eq, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { emailDesignProfile, location, organization } from "@/db/schema";
import {
  emailDesignSettingsSchema,
  emailSocialLinksSchema,
  type EmailDesignSettings,
  type ResolvedEmailDesign,
} from "@/features/communications/email-settings-contracts";

const organizationAddressSchema = z
  .object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
  })
  .partial();

const DEFAULT_SETTINGS: EmailDesignSettings = {
  logoMode: "WORKSPACE",
  customLogoUrl: null,
  colorMode: "WORKSPACE",
  headerTextColor: "#111827",
  bodyTextColor: "#374151",
  buttonColor: "#111827",
  backgroundColor: "#f8f8ef",
  primaryFont: "Helvetica Neue",
  secondaryFont: "Arial",
  socialLinks: emailSocialLinksSchema.parse({}),
};

export async function getEmailDesignState(input: {
  organizationId: string;
  locationId: string | null;
}) {
  const [profile, organizationRow, locationRow] = await Promise.all([
    db
      .select()
      .from(emailDesignProfile)
      .where(
        and(
          eq(emailDesignProfile.organizationId, input.organizationId),
          input.locationId
            ? or(
                eq(emailDesignProfile.locationId, input.locationId),
                isNull(emailDesignProfile.locationId),
              )
            : isNull(emailDesignProfile.locationId),
        ),
      )
      .orderBy(
        input.locationId
          ? sql`CASE WHEN ${emailDesignProfile.locationId} = ${input.locationId} THEN 0 ELSE 1 END`
          : emailDesignProfile.createdAt,
      )
      .limit(1)
      .then(([row]) => row),
    db.query.organization.findFirst({
      where: eq(organization.id, input.organizationId),
      columns: {
        name: true,
        logo: true,
        brandColor: true,
        accentColor: true,
        businessAddress: true,
        website: true,
      },
    }),
    input.locationId
      ? db.query.location.findFirst({
          where: and(
            eq(location.id, input.locationId),
            eq(location.organizationId, input.organizationId),
          ),
          columns: {
            companyName: true,
            logo: true,
            brandColor: true,
            accentColor: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            state: true,
            postalCode: true,
            country: true,
            website: true,
          },
        })
      : Promise.resolve(undefined),
  ]);

  if (!organizationRow) {
    throw new Error("Email design workspace could not be loaded.");
  }

  const settings = profile
    ? emailDesignSettingsSchema.parse({
        logoMode: profile.logoMode,
        customLogoUrl: profile.customLogoUrl,
        colorMode: profile.colorMode,
        headerTextColor: profile.headerTextColor,
        bodyTextColor: profile.bodyTextColor,
        buttonColor: profile.buttonColor,
        backgroundColor: profile.backgroundColor,
        primaryFont: profile.primaryFont,
        secondaryFont: profile.secondaryFont,
        socialLinks: emailSocialLinksSchema.parse(profile.socialLinks),
      })
    : DEFAULT_SETTINGS;
  const workspaceLogo = locationRow?.logo ?? organizationRow.logo ?? null;
  const workspaceBrandColor =
    locationRow?.brandColor ?? organizationRow.brandColor ?? "#111827";
  const workspaceAccentColor =
    locationRow?.accentColor ?? organizationRow.accentColor ?? "#f8f8ef";
  const companyName = locationRow?.companyName ?? organizationRow.name;
  const companyAddress = locationRow
    ? formatAddress([
        locationRow.addressLine1,
        locationRow.addressLine2,
        locationRow.city,
        locationRow.state,
        locationRow.postalCode,
        locationRow.country,
      ])
    : formatOrganizationAddress(organizationRow.businessAddress);
  const website = locationRow?.website ?? organizationRow.website ?? null;

  return {
    settings,
    workspace: {
      companyName,
      logoUrl: workspaceLogo,
      brandColor: workspaceBrandColor,
      accentColor: workspaceAccentColor,
      companyAddress,
      website,
    },
    effective: resolveSettings({
      settings,
      companyName,
      companyAddress,
      website,
      workspaceLogo,
      workspaceBrandColor,
      workspaceAccentColor,
    }),
  };
}

export async function resolveEmailDesign(input: {
  organizationId: string;
  locationId: string | null;
}): Promise<ResolvedEmailDesign> {
  return (await getEmailDesignState(input)).effective;
}

function resolveSettings(input: {
  settings: EmailDesignSettings;
  companyName: string;
  companyAddress: string | null;
  website: string | null;
  workspaceLogo: string | null;
  workspaceBrandColor: string;
  workspaceAccentColor: string;
}): ResolvedEmailDesign {
  const logoUrl =
    input.settings.logoMode === "CUSTOM"
      ? input.settings.customLogoUrl
      : input.settings.logoMode === "WORKSPACE"
        ? input.workspaceLogo
        : null;
  const useWorkspaceColors = input.settings.colorMode === "WORKSPACE";
  const links = input.settings.socialLinks;

  return {
    logoUrl: logoUrl ?? undefined,
    headerTextColor: input.settings.headerTextColor,
    bodyTextColor: input.settings.bodyTextColor,
    buttonColor: useWorkspaceColors
      ? input.workspaceBrandColor
      : input.settings.buttonColor,
    backgroundColor: useWorkspaceColors
      ? input.workspaceAccentColor
      : input.settings.backgroundColor,
    headingFontFamily: input.settings.primaryFont,
    bodyFontFamily: input.settings.secondaryFont,
    companyName: input.companyName,
    companyAddress: input.companyAddress ?? undefined,
    website: input.website ?? undefined,
    socialLinks: {
      ...(links.instagram ? { instagram: links.instagram } : {}),
      ...(links.facebook ? { facebook: links.facebook } : {}),
      ...(links.x ? { twitter: links.x } : {}),
      ...(links.pinterest ? { pinterest: links.pinterest } : {}),
      ...(links.youtube ? { youtube: links.youtube } : {}),
      ...(links.linkedin ? { linkedin: links.linkedin } : {}),
    },
  };
}

function formatOrganizationAddress(value: unknown): string | null {
  const parsed = organizationAddressSchema.safeParse(value);
  if (!parsed.success) return null;
  return formatAddress([
    parsed.data.street,
    parsed.data.city,
    parsed.data.state,
    parsed.data.zip,
    parsed.data.country,
  ]);
}

function formatAddress(parts: Array<string | null | undefined>): string | null {
  const value = parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(", ");
  return value || null;
}
