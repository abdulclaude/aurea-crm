import { type NextRequest } from "next/server";
import { db } from "@/db";
import { instructor } from "@/db/schema";
import {
  apiError,
  requireApiKeyLocation,
  requireScope,
  validateApiKey,
} from "@/lib/api-auth";
import { asc, and, eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth.valid) return apiError(auth.error, 401);

  const scope = requireScope(auth.apiKey.scopes, "instructors:read");
  if (!scope.ok) return apiError(scope.error, 403);
  const keyLocation = requireApiKeyLocation(auth.apiKey);
  if (!keyLocation.ok) return apiError(keyLocation.error, 403);

  const instructors = await db
    .select({
      id: instructor.id,
      name: instructor.name,
      email: instructor.email,
      phone: instructor.phone,
      role: instructor.role,
      bio: instructor.bio,
      profilePhoto: instructor.profilePhoto,
      instructorSpecialties: instructor.instructorSpecialties,
      instructorCertifications: instructor.instructorCertifications,
      publicProfileSlug: instructor.publicProfileSlug,
    })
    .from(instructor)
    .where(
      and(
        eq(instructor.organizationId, auth.apiKey.organizationId),
        eq(instructor.locationId, keyLocation.locationId),
        eq(instructor.isActive, true),
      ),
    )
    .orderBy(asc(instructor.name));

  return Response.json({ data: instructors, count: instructors.length });
}
