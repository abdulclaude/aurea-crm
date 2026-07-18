import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { location, organization } from "@/db/schema";
import { getEffectiveWorkspaceOperationsValues } from "@/features/workspace-settings/server/operations-query-service";

export async function organizationBranding(
  organizationId: string,
): Promise<unknown> {
  const [[row], settings] = await Promise.all([
    db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
        brandColor: organization.brandColor,
        accentColor: organization.accentColor,
        businessEmail: organization.businessEmail,
        businessPhone: organization.businessPhone,
        website: organization.website,
        businessAddress: organization.businessAddress,
        currency: organization.currency,
      })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1),
    getEffectiveWorkspaceOperationsValues({
      organizationId,
      locationId: null,
    }),
  ]);
  if (!row) return null;
  return {
    ...row,
    businessEmail: settings.showPublicEmail ? row.businessEmail : null,
    businessPhone: settings.showPublicPhone ? row.businessPhone : null,
    website: settings.showPublicWebsite ? row.website : null,
    businessAddress: settings.showPublicAddress ? row.businessAddress : null,
  };
}

export async function locationBranding(
  organizationId: string,
  locationId: string,
): Promise<unknown> {
  const [[row], settings] = await Promise.all([
    db
      .select({
        id: location.id,
        companyName: location.companyName,
        slug: location.slug,
        logo: location.logo,
        brandColor: location.brandColor,
        accentColor: location.accentColor,
        timezone: location.timezone,
        businessEmail: location.businessEmail,
        businessPhone: location.businessPhone,
        website: location.website,
        addressLine1: location.addressLine1,
        addressLine2: location.addressLine2,
        city: location.city,
        state: location.state,
        postalCode: location.postalCode,
        country: location.country,
      })
      .from(location)
      .where(
        and(
          eq(location.id, locationId),
          eq(location.organizationId, organizationId),
          eq(location.isActive, true),
        ),
      )
      .limit(1),
    getEffectiveWorkspaceOperationsValues({ organizationId, locationId }),
  ]);
  if (!row) return null;
  return {
    ...row,
    businessEmail: settings.showPublicEmail ? row.businessEmail : null,
    businessPhone: settings.showPublicPhone ? row.businessPhone : null,
    website: settings.showPublicWebsite ? row.website : null,
    addressLine1: settings.showPublicAddress ? row.addressLine1 : null,
    addressLine2: settings.showPublicAddress ? row.addressLine2 : null,
    city: settings.showPublicAddress ? row.city : null,
    state: settings.showPublicAddress ? row.state : null,
    postalCode: settings.showPublicAddress ? row.postalCode : null,
    country: settings.showPublicAddress ? row.country : null,
  };
}
