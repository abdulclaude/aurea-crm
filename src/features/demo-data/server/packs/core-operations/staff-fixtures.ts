import type { DemoSeedContext } from "@/features/demo-data/server/types";
import { PROFILE_COUNTS } from "@/features/demo-data/server/packs/core-operations/constants";
import type {
  InstructorDependency,
  StaffFixturePlan,
} from "@/features/demo-data/server/packs/core-operations/types";
import {
  demoMetadata,
  deterministicDemoId,
  money,
  rateMinor,
  utcDay,
} from "@/features/demo-data/server/packs/core-operations/utils";

export function buildStaffFixtures(
  context: DemoSeedContext,
  instructors: InstructorDependency[],
): StaffFixturePlan {
  const now = context.referenceDate;
  const nonTeachingCount =
    PROFILE_COUNTS[context.profile].nonTeachingStaffCount;
  const instructorIdentities = instructors.map((item, index) => {
    const identityId = deterministicDemoId(
      context.runId,
      "staff-identity-instructor",
      index,
    );
    return {
      identity: {
        id: identityId,
        organizationId: context.organizationId,
        displayName: item.name,
        email: item.email,
        normalizedEmail: item.email?.trim().toLowerCase() ?? null,
        status: "ACTIVE" as const,
        createdById: context.actorUserId,
        updatedById: context.actorUserId,
        createdAt: utcDay(now, -(120 + index * 12)),
        updatedAt: now,
      },
      member: {
        id: deterministicDemoId(
          context.runId,
          "studio-staff-instructor",
          index,
        ),
        staffIdentityId: identityId,
        organizationId: context.organizationId,
        locationId: context.locationId,
        employeeId: `DEMO-I-${String(index + 1).padStart(3, "0")}`,
        name: item.name,
        email: item.email,
        role: "INSTRUCTOR",
        staffType: "INSTRUCTOR",
        isActive: true,
        canTeachClasses: true,
        canTakeAppointments: true,
        canLeadWorkshops: index % 2 === 0,
        hourlyRate: money(rateMinor(index)),
        currency: context.currency,
        employmentStart: utcDay(now, -(240 + index * 20)),
        metadata: demoMetadata(context, { team: "coaching" }),
        createdAt: utcDay(now, -(120 + index * 12)),
        updatedAt: now,
      },
      link: { instructorId: item.id, identityId },
    };
  });
  const roles = ["ADMIN", "MANAGER", "FRONT_DESK", "FRONT_DESK"] as const;
  const identityStatuses = [
    "ACTIVE",
    "INVITED",
    "SUSPENDED",
    "ARCHIVED",
  ] as const;
  const staffNames = [
    "Amelia Hart",
    "Noah Bennett",
    "Sofia Clarke",
    "Ethan Morgan",
    "Isla Turner",
    "Leo Hughes",
    "Maya Foster",
    "Oscar Reed",
  ];
  const nonTeaching = Array.from({ length: nonTeachingCount }, (_, index) => {
    const identityId = deterministicDemoId(
      context.runId,
      "staff-identity-operations",
      index,
    );
    const status = identityStatuses[index % identityStatuses.length]!;
    const role = roles[index % roles.length]!;
    const email = `demo.team.${index + 1}@example.test`;
    return {
      identity: {
        id: identityId,
        organizationId: context.organizationId,
        displayName: staffNames[index]!,
        email,
        normalizedEmail: email,
        status,
        createdById: context.actorUserId,
        updatedById: context.actorUserId,
        createdAt: utcDay(now, -(90 + index * 9)),
        updatedAt: now,
      },
      member: {
        id: deterministicDemoId(
          context.runId,
          "studio-staff-operations",
          index,
        ),
        staffIdentityId: identityId,
        organizationId: context.organizationId,
        locationId: context.locationId,
        employeeId: `DEMO-O-${String(index + 1).padStart(3, "0")}`,
        name: staffNames[index]!,
        email,
        phone: `+447700900${String(100 + index)}`,
        role,
        staffType: role,
        isActive: status === "ACTIVE",
        canTeachClasses: false,
        canTakeAppointments: role === "MANAGER" || role === "ADMIN",
        canHandleReservations:
          role === "FRONT_DESK" || role === "MANAGER" || role === "ADMIN",
        canLeadWorkshops: role === "MANAGER" || role === "ADMIN",
        hourlyRate: money(1_450 + index * 125),
        currency: context.currency,
        employmentStart: utcDay(now, -(180 + index * 15)),
        metadata: demoMetadata(context, { team: "operations" }),
        createdAt: utcDay(now, -(90 + index * 9)),
        updatedAt: now,
      },
    };
  });
  return {
    staffIdentities: [
      ...instructorIdentities.map((row) => row.identity),
      ...nonTeaching.map((row) => row.identity),
    ],
    staffMembers: [
      ...instructorIdentities.map((row) => row.member),
      ...nonTeaching.map((row) => row.member),
    ],
    instructorIdentityLinks: instructorIdentities.map((row) => row.link),
  };
}
