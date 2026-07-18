import { z } from "zod";

export const STAFF_IDENTITY_STATUSES = [
  "INVITED",
  "ACTIVE",
  "SUSPENDED",
  "ARCHIVED",
] as const;

export const STAFF_IDENTITY_SOURCE_TYPES = [
  "INVITATION",
  "ORGANIZATION_MEMBER",
  "LOCATION_MEMBER",
  "INSTRUCTOR",
  "STUDIO_STAFF",
] as const;

export const staffIdentityStatusSchema = z.enum(STAFF_IDENTITY_STATUSES);
export const staffIdentitySourceTypeSchema = z.enum(
  STAFF_IDENTITY_SOURCE_TYPES,
);

export const staffIdentitySourceSchema = z.object({
  sourceType: staffIdentitySourceTypeSchema,
  sourceId: z.string(),
  locationId: z.string().nullable(),
  label: z.string(),
  role: z.string().nullable(),
  status: z.string().nullable(),
  displayName: z.string(),
  email: z.string().nullable(),
});

export const staffIdentityRowSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  userId: z.string().nullable(),
  status: staffIdentityStatusSchema,
  sources: z.array(staffIdentitySourceSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const staffIdentityDirectorySchema = z.object({
  identities: z.array(staffIdentityRowSchema),
  unlinked: z.array(staffIdentitySourceSchema),
});

export const linkStaffIdentitySourceSchema = z.object({
  sourceType: staffIdentitySourceTypeSchema,
  sourceId: z.string().min(1).max(128),
  identityId: z.string().min(1).max(128).nullable(),
});

export type StaffIdentityDirectory = z.infer<
  typeof staffIdentityDirectorySchema
>;
export type StaffIdentityRow = z.infer<typeof staffIdentityRowSchema>;
export type StaffIdentitySource = z.infer<typeof staffIdentitySourceSchema>;
export type StaffIdentitySourceType = z.infer<
  typeof staffIdentitySourceTypeSchema
>;
export type StaffIdentityStatus = z.infer<typeof staffIdentityStatusSchema>;
