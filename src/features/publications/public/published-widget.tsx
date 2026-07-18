import { notFound } from "next/navigation";

import {
  publishedBookingWidgetSourceSchema,
  publishedEventWidgetSourceSchema,
  publishedInstructorWidgetSourceSchema,
  publishedIntroOfferWidgetSourceSchema,
  publishedMembershipWidgetSourceSchema,
  publishedOnDemandWidgetSourceSchema,
  publishedReferralWidgetSourceSchema,
  publishedScheduleWidgetSourceSchema,
  storedPublicationSnapshotSchema,
} from "@/features/publications/public/contracts";
import { bookingWidgetSourceIsCurrent } from "@/features/publications/public/booking-widget-drift";
import { eventWidgetSourceIsCurrent } from "@/features/publications/public/event-widget-drift";
import { PublishedBookingWidget } from "@/features/publications/public/published-booking-widget";
import { PublishedEventWidget } from "@/features/publications/public/published-event-widget";
import { PublishedInstructorWidget } from "@/features/publications/public/published-instructor-widget";
import { instructorWidgetSourceIsCurrent } from "@/features/publications/public/instructor-widget-drift";
import { introOfferWidgetSourceIsCurrent } from "@/features/publications/public/intro-offer-widget-drift";
import { PublishedIntroOfferWidget } from "@/features/publications/public/published-intro-offer-widget";
import { membershipWidgetSourceIsCurrent } from "@/features/publications/public/membership-widget-drift";
import { PublishedMembershipWidget } from "@/features/publications/public/published-membership-widget";
import { onDemandWidgetSourceIsCurrent } from "@/features/publications/public/on-demand-widget-drift";
import { PublishedOnDemandWidget } from "@/features/publications/public/published-on-demand-widget";
import { PublishedReferralWidget } from "@/features/publications/public/published-referral-widget";
import { referralWidgetSourceIsCurrent } from "@/features/publications/public/referral-widget-drift";
import { PublishedScheduleWidget } from "@/features/publications/public/published-schedule-widget";
import { getPublicScheduleInventory } from "@/features/studio/server/public-schedule-inventory";

export async function PublishedWidget({
  organizationId,
  locationId,
  sourceId,
  snapshot,
  themeSnapshot,
}: {
  organizationId: string;
  locationId: string | null;
  sourceId: string | null;
  snapshot: unknown;
  themeSnapshot: unknown;
}) {
  if (!sourceId) notFound();
  const envelope = storedPublicationSnapshotSchema.safeParse(snapshot);
  if (!envelope.success || envelope.data.channelConfig.kind !== "WIDGET") {
    notFound();
  }
  const scheduleSource = publishedScheduleWidgetSourceSchema.safeParse(
    envelope.data.source,
  );
  if (scheduleSource.success) {
    if (
      scheduleSource.data.widget.id !== sourceId ||
      scheduleSource.data.widget.locationId !== locationId
    ) {
      notFound();
    }
    const inventory = await getPublicScheduleInventory({
      scope: { organizationId, locationId },
      maxDaysAhead: scheduleSource.data.widget.config.maxDaysAhead,
      classTypeIds: scheduleSource.data.widget.config.classTypeIds,
    });
    return (
      <PublishedScheduleWidget
        source={scheduleSource.data}
        inventory={inventory}
        themeSnapshot={themeSnapshot}
        transparentBackground={
          envelope.data.channelConfig.transparentBackground
        }
      />
    );
  }
  const bookingSource = publishedBookingWidgetSourceSchema.safeParse(
    envelope.data.source,
  );
  if (bookingSource.success) {
    if (
      !locationId ||
      bookingSource.data.widget.id !== sourceId ||
      bookingSource.data.widget.locationId !== locationId ||
      !(await bookingWidgetSourceIsCurrent({
        organizationId,
        locationId,
        source: bookingSource.data,
      }))
    ) {
      notFound();
    }
    return (
      <PublishedBookingWidget
        source={bookingSource.data}
        themeSnapshot={themeSnapshot}
        transparentBackground={
          envelope.data.channelConfig.transparentBackground
        }
      />
    );
  }
  const membershipSource = publishedMembershipWidgetSourceSchema.safeParse(
    envelope.data.source,
  );
  if (membershipSource.success) {
    if (
      membershipSource.data.widget.id !== sourceId ||
      membershipSource.data.widget.locationId !== locationId ||
      !(await membershipWidgetSourceIsCurrent({
        organizationId,
        locationId,
        source: membershipSource.data,
      }))
    ) {
      notFound();
    }
    return (
      <PublishedMembershipWidget
        source={membershipSource.data}
        themeSnapshot={themeSnapshot}
        transparentBackground={
          envelope.data.channelConfig.transparentBackground
        }
      />
    );
  }
  const instructorSource = publishedInstructorWidgetSourceSchema.safeParse(
    envelope.data.source,
  );
  const eventSource = publishedEventWidgetSourceSchema.safeParse(
    envelope.data.source,
  );
  if (eventSource.success) {
    if (
      eventSource.data.widget.id !== sourceId ||
      eventSource.data.widget.locationId !== locationId ||
      !(await eventWidgetSourceIsCurrent({
        organizationId,
        locationId,
        source: eventSource.data,
      }))
    ) {
      notFound();
    }
    return (
      <PublishedEventWidget
        source={eventSource.data}
        themeSnapshot={themeSnapshot}
        transparentBackground={
          envelope.data.channelConfig.transparentBackground
        }
      />
    );
  }
  const onDemandSource = publishedOnDemandWidgetSourceSchema.safeParse(
    envelope.data.source,
  );
  if (onDemandSource.success) {
    if (
      onDemandSource.data.widget.id !== sourceId ||
      onDemandSource.data.widget.locationId !== locationId ||
      !(await onDemandWidgetSourceIsCurrent({
        organizationId,
        locationId,
        source: onDemandSource.data,
      }))
    ) {
      notFound();
    }
    return (
      <PublishedOnDemandWidget
        source={onDemandSource.data}
        themeSnapshot={themeSnapshot}
        transparentBackground={
          envelope.data.channelConfig.transparentBackground
        }
      />
    );
  }
  const introOfferSource = publishedIntroOfferWidgetSourceSchema.safeParse(
    envelope.data.source,
  );
  if (introOfferSource.success) {
    if (
      introOfferSource.data.widget.id !== sourceId ||
      introOfferSource.data.widget.locationId !== locationId ||
      !(await introOfferWidgetSourceIsCurrent({
        organizationId,
        locationId,
        source: introOfferSource.data,
      }))
    ) {
      notFound();
    }
    return (
      <PublishedIntroOfferWidget
        source={introOfferSource.data}
        themeSnapshot={themeSnapshot}
        transparentBackground={
          envelope.data.channelConfig.transparentBackground
        }
      />
    );
  }
  const referralSource = publishedReferralWidgetSourceSchema.safeParse(
    envelope.data.source,
  );
  if (referralSource.success) {
    if (
      referralSource.data.widget.id !== sourceId ||
      referralSource.data.widget.locationId !== locationId ||
      !(await referralWidgetSourceIsCurrent({
        organizationId,
        locationId,
        source: referralSource.data,
      }))
    ) {
      notFound();
    }
    return (
      <PublishedReferralWidget
        source={referralSource.data}
        themeSnapshot={themeSnapshot}
        transparentBackground={
          envelope.data.channelConfig.transparentBackground
        }
      />
    );
  }
  if (
    !instructorSource.success ||
    instructorSource.data.widget.id !== sourceId ||
    instructorSource.data.widget.locationId !== locationId ||
    !(await instructorWidgetSourceIsCurrent({
      organizationId,
      locationId,
      source: instructorSource.data,
    }))
  ) {
    notFound();
  }
  return (
    <PublishedInstructorWidget
      source={instructorSource.data}
      themeSnapshot={themeSnapshot}
      transparentBackground={
        envelope.data.channelConfig.transparentBackground
      }
    />
  );
}
