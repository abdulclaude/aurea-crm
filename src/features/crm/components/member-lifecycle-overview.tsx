"use client";

import { format, formatDistanceToNow } from "date-fns";
import { CalendarCheck, Gift } from "lucide-react";
import type { LifecycleSummary } from "./member-lifecycle-types";
import { labelize } from "./member-lifecycle-types";
import {
  EmptyLine,
  LifecycleStrip,
  Metric,
  Row,
  Section,
} from "./member-lifecycle-shared";

export function OverviewView({ data }: { data: LifecycleSummary }) {
  return (
    <div className="space-y-5 py-5">
      <div className="grid gap-2 md:grid-cols-2 px-6">
        <Metric
          label="Lifecycle"
          value={labelize(data.summary.lifecycleStage ?? "Not set")}
        />
        <Metric
          label="Acquisition"
          value={labelize(data.summary.acquisitionStage)}
        />
        <Metric
          label="Membership"
          value={labelize(data.summary.membershipStatus)}
        />
        <Metric
          label="Intro offer"
          value={labelize(data.summary.introOfferStatus)}
        />
        <Metric label="Visits" value={`${data.summary.visitCount}`} />
        <Metric label="Current streak" value={`${data.summary.currentStreak}`} />
        <Metric
          label="Last visit"
          value={
            data.summary.lastVisit
              ? formatDistanceToNow(new Date(data.summary.lastVisit), {
                  addSuffix: true,
                })
              : "Never"
          }
        />
        <Metric
          label="Lead source"
          value={data.summary.source ?? "Not captured"}
        />
      </div>

      <div className="px-6">
        <LifecycleStrip data={data} />
      </div>

      <Section title="Upcoming bookings" icon={CalendarCheck}>
        {data.upcomingBookings.length > 0 ? (
          data.upcomingBookings.map((booking) => (
            <Row
              key={booking.id}
              title={booking.studioClass.name}
              meta={`${format(new Date(booking.studioClass.startTime), "EEE d MMM, HH:mm")} · ${
                booking.studioClass.instructor?.name ?? "No instructor"
              }`}
              status={booking.status}
            />
          ))
        ) : (
          <EmptyLine label="No upcoming bookings. Book their next class from the schedule." />
        )}
      </Section>

      <Section title="Intro and referrals" icon={Gift}>
        {data.introOffers.map((redemption) => (
          <Row
            key={redemption.id}
            title={redemption.offer.name}
            meta={`${redemption.classesUsed} classes used · expires ${format(new Date(redemption.expiresAt), "d MMM yyyy")}`}
            status={redemption.status}
          />
        ))}
        {data.referrals.made.map((referral) => (
          <Row
            key={referral.id}
            title={`Referral code ${referral.code}`}
            meta={referral.refereeEmail}
            status={referral.status}
          />
        ))}
        {data.introOffers.length === 0 && data.referrals.made.length === 0 ? (
          <EmptyLine label="No intro offer or referral activity yet." />
        ) : null}
      </Section>
    </div>
  );
}
