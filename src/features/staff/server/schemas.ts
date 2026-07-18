import { z } from "zod";

import {
  STAFF_ROLE_VALUES,
  STAFF_TYPE_VALUES,
} from "@/features/staff/constants";

export const staffRoleSchema = z.enum(STAFF_ROLE_VALUES);
export const staffTypeSchema = z.enum(STAFF_TYPE_VALUES);
export const staffSortSchema = z
  .enum([
    "createdAt.desc",
    "createdAt.asc",
    "name.asc",
    "name.desc",
    "role.asc",
    "role.desc",
    "staffType.asc",
    "staffType.desc",
  ])
  .optional();

export const staffListInputSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
  search: z.string().optional(),
  roles: z.array(staffRoleSchema).optional(),
  staffTypes: z.array(z.string().min(1)).optional(),
  isActive: z.boolean().optional(),
  sort: staffSortSchema,
  locationId: z.string().optional(),
  includeAllLocations: z.boolean().optional(),
});

const optionalTextSchema = z.string().trim().optional();
const optionalUrlSchema = z
  .union([z.string().url("Enter a valid image URL"), z.literal(""), z.null()])
  .optional();

export const staffMutationSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.union([z.string().email("Invalid email"), z.literal("")]).optional(),
  phone: optionalTextSchema,
  employeeId: optionalTextSchema,
  role: staffRoleSchema,
  staffType: staffTypeSchema,
  hourlyRate: z.number().min(0).optional(),
  currency: z.string().trim().min(1).default("GBP"),
  profilePhoto: optionalUrlSchema,
});
