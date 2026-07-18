import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { requireCapability } from "@/features/permissions/server/authorization";
import { createClassBookingCheckout } from "@/features/studio/server/class-booking-checkout";
import { dispatchClassBookingWorkflow } from "@/features/studio/server/paid-class-booking-workflow-dispatch";
import {
  assertClassWaitlistScope,
  confirmClassWaitlistEntry,
  declineClassWaitlistEntry,
  joinClassWaitlist,
  leaveClassWaitlist,
  listClassWaitlist,
  notifyNextClassWaitlistEntry,
} from "@/features/studio/server/waitlist-service";
import { dispatchWaitlistSpotOpened } from "@/features/studio/server/waitlist-workflow-dispatch";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

type WaitlistContext = {
  auth: { user: { id: string } };
  orgId: string | null;
  locationId: string | null;
};

function requireWaitlistScope(ctx: WaitlistContext): {
  organizationId: string;
  locationId: string;
} {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select an organization before managing waitlists",
    });
  }
  if (!ctx.locationId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select a location before managing waitlists",
    });
  }
  return { organizationId: ctx.orgId, locationId: ctx.locationId };
}

async function requireWaitlistCapability(
  ctx: WaitlistContext,
  capability: "schedule.view" | "schedule.manage" | "commerce.checkout.create",
): Promise<{ organizationId: string; locationId: string }> {
  const scope = requireWaitlistScope(ctx);
  await requireCapability({
    actor: {
      userId: ctx.auth.user.id,
      organizationId: scope.organizationId,
      locationId: scope.locationId,
    },
    capability,
    resource: scope,
  });
  return scope;
}

export const waitlistRouter = createTRPCRouter({
  join: protectedProcedure
    .input(z.object({ classId: z.string(), clientId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const scope = await requireWaitlistCapability(ctx, "schedule.manage");
      return joinClassWaitlist({ ...scope, ...input });
    }),

  leave: protectedProcedure
    .input(z.object({ waitlistId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const scope = await requireWaitlistCapability(ctx, "schedule.manage");
      return leaveClassWaitlist({ ...scope, ...input });
    }),

  notifyNext: protectedProcedure
    .input(z.object({ classId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const scope = await requireWaitlistCapability(ctx, "schedule.manage");
      const next = await notifyNextClassWaitlistEntry({ ...scope, ...input });
      if (!next) {
        return { notified: false as const, message: "No one on the waitlist" };
      }
      await dispatchWaitlistSpotOpened({
        ...scope,
        waitlistId: next.id,
        clientId: next.clientId,
        classId: next.classId,
        notifiedAt: next.notifiedAt,
      });
      return { notified: true as const, client: next.client };
    }),

  confirm: protectedProcedure
    .input(
      z.object({
        waitlistId: z.string(),
        slidingScaleAmount: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const scope = await requireWaitlistCapability(ctx, "schedule.manage");
      await requireWaitlistCapability(ctx, "commerce.checkout.create");
      const booking = await confirmClassWaitlistEntry({
        ...scope,
        ...input,
        createdBy: ctx.auth.user.id,
      });
      if (!booking.requiresPayment) {
        await dispatchClassBookingWorkflow(booking.bookingId).catch(
          (error: unknown) => {
            console.error("Failed to trigger class-booked workflows", error);
          },
        );
        return { ...booking, checkout: null };
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const checkout = await createClassBookingCheckout({
        ...scope,
        bookingId: booking.bookingId,
        requestedBy: ctx.auth.user.id,
        successUrl: `${appUrl}/studio/classes/${booking.classId}?payment=success`,
        cancelUrl: `${appUrl}/studio/classes/${booking.classId}?payment=cancelled`,
      });
      return { ...booking, checkout };
    }),

  triggerAutoPromote: protectedProcedure
    .input(z.object({ classId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const scope = await requireWaitlistCapability(ctx, "schedule.manage");
      await assertClassWaitlistScope({ ...scope, ...input });
      const next = await notifyNextClassWaitlistEntry({ ...scope, ...input });
      if (next) {
        await dispatchWaitlistSpotOpened({
          ...scope,
          waitlistId: next.id,
          clientId: next.clientId,
          classId: next.classId,
          notifiedAt: next.notifiedAt,
        });
      }
      return { triggered: Boolean(next) };
    }),

  decline: protectedProcedure
    .input(z.object({ waitlistId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const scope = await requireWaitlistCapability(ctx, "schedule.manage");
      const declined = await declineClassWaitlistEntry({ ...scope, ...input });
      const next = declined.waitlistOffer;
      if (next) {
        await dispatchWaitlistSpotOpened({
          ...scope,
          waitlistId: next.id,
          clientId: next.clientId,
          classId: next.classId,
          notifiedAt: next.notifiedAt,
        });
      }
      return { declined: true, nextNotified: Boolean(next) };
    }),

  listForClass: protectedProcedure
    .input(z.object({ classId: z.string() }))
    .query(async ({ ctx, input }) => {
      const scope = await requireWaitlistCapability(ctx, "schedule.view");
      await assertClassWaitlistScope({ ...scope, ...input });
      return listClassWaitlist({ ...scope, ...input });
    }),
});
