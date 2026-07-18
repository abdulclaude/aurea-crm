import { z } from "zod";

import { capabilitySchema } from "@/features/permissions/capabilities";
import {
  locationRoleSchema,
  organizationRoleSchema,
} from "@/features/permissions/role-matrix";
import { getActorCapabilitySnapshot } from "@/features/permissions/server/authorization";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

const currentCapabilitiesSchema = z.object({
  organizationId: z.string().nullable(),
  locationId: z.string().nullable(),
  organizationRole: organizationRoleSchema.nullable(),
  locationRole: locationRoleSchema.nullable(),
  capabilities: z.array(capabilitySchema),
});
export const permissionsRouter = createTRPCRouter({
  getCurrent: protectedProcedure
    .output(currentCapabilitiesSchema)
    .query(async ({ ctx }) => {
      return getActorCapabilitySnapshot({
        userId: ctx.auth.user.id,
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
      });
    }),
});
