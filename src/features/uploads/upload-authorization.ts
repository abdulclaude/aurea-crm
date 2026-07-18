import "server-only";

import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { UploadThingError } from "uploadthing/server";

import { db } from "@/db";
import { session as sessionTable } from "@/db/schema";
import { requireCapability } from "@/features/permissions/server/authorization";
import {
  authorizeUploadScope,
  UploadAuthorizationError,
  type UploadRouteKey,
} from "@/features/uploads/upload-policy";
import { auth } from "@/lib/auth";

export async function authorizeUploadRequest(
  request: NextRequest,
  route: UploadRouteKey,
) {
  const session = await auth.api.getSession({ headers: request.headers });
  const [storedSession] = session
    ? await db
        .select({
          organizationId: sessionTable.activeOrganizationId,
          locationId: sessionTable.activeLocationId,
        })
        .from(sessionTable)
        .where(
          and(
            eq(sessionTable.token, session.session.token),
            eq(sessionTable.userId, session.user.id),
          ),
        )
        .limit(1)
    : [];

  try {
    return await authorizeUploadScope({
      route,
      session: {
        userId: session?.user.id ?? null,
        organizationId:
          storedSession?.organizationId ??
          session?.session.activeOrganizationId ??
          null,
        locationId: storedSession?.locationId ?? null,
      },
      checkCapability: async ({
        capability,
        organizationId,
        locationId,
      }) => {
        try {
          await requireCapability({
            actor: {
              userId: session?.user.id ?? "",
              organizationId,
              locationId,
            },
            capability,
            resource: { organizationId, locationId },
          });
          return true;
        } catch {
          return false;
        }
      },
    });
  } catch (error) {
    if (!(error instanceof UploadAuthorizationError)) throw error;
    if (error.reason === "UNAUTHENTICATED") {
      throw new UploadThingError({
        code: "FORBIDDEN",
        message: "Sign in before uploading files.",
      });
    }
    throw new UploadThingError({
      code: "FORBIDDEN",
      message:
        error.reason === "LOCATION_REQUIRED"
          ? "Select a location before uploading this file."
          : error.reason === "ORGANIZATION_REQUIRED"
            ? "Select an organization before uploading this file."
            : "You do not have permission to upload this file.",
    });
  }
}
