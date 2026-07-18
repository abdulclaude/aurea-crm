import "server-only";

import { and, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/db";
import { instructor } from "@/db/schema";
import type { PublishedInstructorWidgetSource } from "@/features/publications/public/contracts";
import { toPublicInstructorProfile } from "@/features/studio/widgets/instructor-public-profile";

export async function instructorWidgetSourceIsCurrent(input: {
  organizationId: string;
  locationId: string | null;
  source: PublishedInstructorWidgetSource;
}): Promise<boolean> {
  const ids = input.source.instructors.map((profile) => profile.id);
  const rows = await db
    .select({
      id: instructor.id,
      name: instructor.name,
      profilePhoto: instructor.profilePhoto,
      bio: instructor.bio,
      specialties: instructor.instructorSpecialties,
      certifications: instructor.instructorCertifications,
    })
    .from(instructor)
    .where(
      and(
        inArray(instructor.id, ids),
        eq(instructor.organizationId, input.organizationId),
        input.locationId
          ? eq(instructor.locationId, input.locationId)
          : isNull(instructor.locationId),
        eq(instructor.isActive, true),
        eq(instructor.isSystem, false),
      ),
    );
  if (rows.length !== input.source.instructors.length) return false;
  const liveById = new Map(
    rows.map((row) => [
      row.id,
      toPublicInstructorProfile(row, input.source.widget.config),
    ]),
  );
  return input.source.instructors.every((profile) =>
    profilesEqual(liveById.get(profile.id), profile),
  );
}

function profilesEqual(
  live: PublishedInstructorWidgetSource["instructors"][number] | undefined,
  published: PublishedInstructorWidgetSource["instructors"][number],
): boolean {
  return Boolean(live && JSON.stringify(live) === JSON.stringify(published));
}
