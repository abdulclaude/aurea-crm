import { TRPCError } from "@trpc/server";

import {
  requestRefundInputSchema,
  requestRefundOutputSchema,
} from "@/features/commerce/refund-contracts";
import { requestStripeRefund } from "@/features/commerce/server/refund-service";
import { requireCapability } from "@/features/permissions/server/authorization";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const commerceRefundRouter = createTRPCRouter({
  create: protectedProcedure
    .input(requestRefundInputSchema)
    .output(requestRefundOutputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Select an organization before refunding a payment.",
        });
      }
      await requireCapability({
        actor: {
          userId: ctx.auth.user.id,
          organizationId: ctx.orgId,
          locationId: ctx.locationId,
        },
        capability: "commerce.refund",
        resource: {
          organizationId: ctx.orgId,
          locationId: ctx.locationId,
        },
      });
      return requestStripeRefund({
        scope: {
          organizationId: ctx.orgId,
          locationId: ctx.locationId,
          requestedBy: ctx.auth.user.id,
        },
        refund: input,
      });
    }),
});
