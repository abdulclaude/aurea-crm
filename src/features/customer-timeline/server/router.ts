import "server-only";

import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { client } from "@/db/schema";
import {
  customerTimelineInputSchema,
  customerTimelinePageSchema,
} from "@/features/customer-timeline/contracts";
import { mergeTimelineEvents } from "@/features/customer-timeline/lib/merge-timeline-events";
import {
  listAttendanceTimelineEvents,
  listBookingTimelineEvents,
} from "@/features/customer-timeline/server/sources/bookings";
import { listCommerceTimelineEvents } from "@/features/customer-timeline/server/sources/commerce";
import { listCommunicationTimelineEvents } from "@/features/customer-timeline/server/sources/communications";
import { listWorkflowTimelineEvents } from "@/features/customer-timeline/server/sources/workflows";
import { requireCapability } from "@/features/permissions/server/authorization";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const customerTimelineRouter = createTRPCRouter({
  list: protectedProcedure
    .input(customerTimelineInputSchema)
    .output(customerTimelinePageSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Select an organization before viewing customer activity.",
        });
      }
      await requireCapability({
        actor: {
          userId: ctx.auth.user.id,
          organizationId: ctx.orgId,
          locationId: ctx.locationId,
        },
        capability: "customer.view",
        resource: {
          organizationId: ctx.orgId,
          locationId: ctx.locationId,
        },
      });
      const [selectedClient] = await db
        .select({ id: client.id, locationId: client.locationId })
        .from(client)
        .where(
          and(
            eq(client.id, input.clientId),
            eq(client.organizationId, ctx.orgId),
            ctx.locationId ? eq(client.locationId, ctx.locationId) : undefined,
          ),
        )
        .limit(1);
      if (!selectedClient) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Customer not found.",
        });
      }
      await requireCapability({
        actor: {
          userId: ctx.auth.user.id,
          organizationId: ctx.orgId,
          locationId: ctx.locationId,
        },
        capability: "customer.view",
        resource: {
          organizationId: ctx.orgId,
          locationId: selectedClient.locationId,
        },
      });

      const sourceInput = {
        scope: {
          organizationId: ctx.orgId,
          locationId: selectedClient.locationId,
          clientId: selectedClient.id,
        },
        cursor: input.cursor,
        limit: input.limit,
      };
      const sources = await Promise.all([
        listBookingTimelineEvents(sourceInput),
        listAttendanceTimelineEvents(sourceInput),
        listCommerceTimelineEvents(sourceInput),
        listCommunicationTimelineEvents(sourceInput),
        listWorkflowTimelineEvents(sourceInput),
      ]);
      return mergeTimelineEvents({
        sources,
        limit: input.limit,
        cursor: input.cursor,
      });
    }),
});
