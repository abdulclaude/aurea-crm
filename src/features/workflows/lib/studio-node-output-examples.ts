import { NodeType } from "@/db/enums";

const member = {
  id: "client-id",
  name: "Alex Member",
  email: "member@example.com",
  phone: "+441234567890",
};

const studioClass = {
  id: "class-id",
  name: "Reformer Pilates",
  startTime: "2026-07-20T09:00:00.000Z",
};

export function getStudioNodeOutputExample(
  nodeType: string,
): Record<string, unknown> | null {
  switch (nodeType) {
    case NodeType.BIRTHDAY_TRIGGER:
      return { client: member, birthday: "1992-07-20" };
    case NodeType.CLASS_BOOKED_TRIGGER:
    case NodeType.CLASS_CANCELLED_TRIGGER:
    case NodeType.MEMBER_NO_SHOW_TRIGGER:
      return {
        bookingId: "booking-id",
        clientId: member.id,
        classId: studioClass.id,
        client: member,
        class: studioClass,
      };
    case NodeType.MEMBER_CHECKED_IN_TRIGGER:
    case NodeType.MEMBER_CLASS_COUNT_TRIGGER:
      return {
        checkInId: "check-in-id",
        clientId: member.id,
        classId: studioClass.id,
        attendanceCount: 10,
        currentStreak: 3,
        client: member,
        class: studioClass,
        introOffer: { completed: false, completedOfferId: null },
      };
    case NodeType.MEMBERSHIP_CREATED_TRIGGER:
    case NodeType.MEMBERSHIP_EXPIRING_TRIGGER:
      return {
        membershipId: "membership-id",
        clientId: member.id,
        planId: "plan-id",
        planName: "Unlimited Monthly",
        status: "ACTIVE",
        startDate: "2026-07-01T00:00:00.000Z",
        endDate: "2026-08-01T00:00:00.000Z",
        creditsRemaining: 8,
        client: member,
      };
    case NodeType.MEMBERSHIP_CANCELLED_TRIGGER:
      return {
        membershipId: "membership-id",
        clientId: member.id,
        planId: "plan-id",
        reason: "Moved away",
        cancelledAt: "2026-07-20T09:00:00.000Z",
        status: "CANCELLED",
      };
    case NodeType.WAITLIST_SPOT_OPENED_TRIGGER:
      return {
        waitlistId: "waitlist-entry-id",
        clientId: member.id,
        classId: studioClass.id,
      };
    case NodeType.INTRO_OFFER_REDEEMED_TRIGGER:
    case NodeType.INTRO_OFFER_COMPLETED_TRIGGER:
      return {
        offerId: "intro-offer-id",
        offerName: "Three class intro pack",
        clientId: member.id,
        attendanceCount: 3,
        completed: nodeType === NodeType.INTRO_OFFER_COMPLETED_TRIGGER,
        client: member,
      };
    case NodeType.REFERRAL_CONVERTED_TRIGGER:
      return {
        referralId: "referral-id",
        referrerClientId: "referrer-client-id",
        referredClientId: member.id,
        rewardPoints: 100,
        client: member,
      };
    case NodeType.CLIENT_TAG_ADDED_TRIGGER:
    case NodeType.CLIENT_TAG_REMOVED_TRIGGER:
      return {
        clientId: member.id,
        tagId: "tag-id",
        tagName: "Intro offer",
        client: member,
      };
    case NodeType.STUDIO_PAYMENT_SUCCEEDED_TRIGGER:
    case NodeType.STUDIO_PAYMENT_FAILED_TRIGGER:
      return {
        payment: {
          id: "payment-id",
          clientId: member.id,
          membershipId: "membership-id",
          amount: "99.00",
          currency: "GBP",
          status:
            nodeType === NodeType.STUDIO_PAYMENT_SUCCEEDED_TRIGGER
              ? "SUCCEEDED"
              : "FAILED",
          type: "MEMBERSHIP",
          description: "Monthly membership",
          stripePaymentIntentId: "pi_example",
          createdAt: "2026-07-20T09:00:00.000Z",
        },
      };
    case NodeType.STUDIO_CLASS_ACTION:
      return {
        operation: "CHECK_IN",
        checkInId: "check-in-id",
        classId: studioClass.id,
        clientId: member.id,
        attendanceCount: 10,
        alreadyApplied: false,
      };
    default:
      return null;
  }
}
