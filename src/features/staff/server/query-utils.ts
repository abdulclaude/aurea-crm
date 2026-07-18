import {
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  type SQL,
} from "drizzle-orm";
import { z } from "zod";

import { studioStaffMember } from "@/db/schema";
import type { StaffRoleValue } from "@/features/staff/constants";
import type { StaffEmploymentType } from "@/features/staff/constants";
import { staffSortSchema } from "@/features/staff/server/schemas";

const staffMetadataSchema = z
  .object({
    profilePhoto: z.string().nullable().optional(),
    employmentType: z.enum(["EMPLOYEE", "CONTRACTOR"]).optional(),
    Employee: z.union([z.boolean(), z.string()]).optional(),
    IndependentContractor: z.union([z.boolean(), z.string()]).optional(),
  })
  .passthrough();

function isTruthyFlag(value: boolean | string | undefined): boolean {
  if (typeof value === "boolean") return value;
  if (!value) return false;
  return ["1", "true", "yes", "y"].includes(value.trim().toLowerCase());
}

export function buildStaffWhereConditions(input: {
  organizationId: string;
  locationId: string | null | undefined;
  includeAllLocations?: boolean;
  search?: string;
  roles?: readonly StaffRoleValue[];
  staffTypes?: readonly string[];
  isActive?: boolean;
}): SQL[] {
  const conditions: SQL[] = [
    eq(studioStaffMember.organizationId, input.organizationId),
    isNull(studioStaffMember.deletedAt),
  ];
  if (!input.includeAllLocations) {
    conditions.push(
      input.locationId
        ? eq(studioStaffMember.locationId, input.locationId)
        : isNull(studioStaffMember.locationId),
    );
  }
  if (input.search?.trim()) {
    const term = `%${input.search.trim()}%`;
    const searchCondition = or(
      ilike(studioStaffMember.name, term),
      ilike(studioStaffMember.email, term),
      ilike(studioStaffMember.phone, term),
      ilike(studioStaffMember.employeeId, term),
      ilike(studioStaffMember.role, term),
      ilike(studioStaffMember.staffType, term),
    );
    if (searchCondition) conditions.push(searchCondition);
  }
  if (input.roles?.length) {
    conditions.push(inArray(studioStaffMember.role, [...input.roles]));
  }
  if (input.staffTypes?.length) {
    conditions.push(
      inArray(studioStaffMember.staffType, [...input.staffTypes]),
    );
  }
  if (input.isActive !== undefined) {
    conditions.push(eq(studioStaffMember.isActive, input.isActive));
  }
  return conditions;
}

export function getStaffOrderBy(sort?: z.infer<typeof staffSortSchema>) {
  switch (sort) {
    case "createdAt.asc":
      return asc(studioStaffMember.createdAt);
    case "name.asc":
      return asc(studioStaffMember.name);
    case "name.desc":
      return desc(studioStaffMember.name);
    case "role.asc":
      return asc(studioStaffMember.role);
    case "role.desc":
      return desc(studioStaffMember.role);
    case "staffType.asc":
      return asc(studioStaffMember.staffType);
    case "staffType.desc":
      return desc(studioStaffMember.staffType);
    default:
      return desc(studioStaffMember.createdAt);
  }
}

export function readStaffProfilePhoto(metadata: unknown): string | null {
  const parsed = staffMetadataSchema.safeParse(metadata);
  return parsed.success ? (parsed.data.profilePhoto ?? null) : null;
}

export function readStaffEmploymentType(
  metadata: unknown,
  employeeId?: string | null,
): StaffEmploymentType | null {
  const parsed = staffMetadataSchema.safeParse(metadata);
  if (!parsed.success) return employeeId?.trim() ? "EMPLOYEE" : null;
  if (parsed.data.employmentType) return parsed.data.employmentType;
  if (isTruthyFlag(parsed.data.IndependentContractor)) return "CONTRACTOR";
  if (isTruthyFlag(parsed.data.Employee)) return "EMPLOYEE";
  if (employeeId?.trim()) return "EMPLOYEE";
  return null;
}

export function buildStaffMetadata(
  metadata: unknown,
  profilePhoto: string | null | undefined,
): Record<string, unknown> | null {
  const parsed = staffMetadataSchema.safeParse(metadata);
  const next: Record<string, unknown> = {
    ...(parsed.success ? parsed.data : {}),
  };
  if (profilePhoto === null || profilePhoto === "") {
    delete next.profilePhoto;
  } else if (profilePhoto !== undefined) {
    next.profilePhoto = profilePhoto;
  }
  return Object.keys(next).length > 0 ? next : null;
}
