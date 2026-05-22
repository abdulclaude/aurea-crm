"use client";

import { BookingCalendar } from "@/features/bookings/components/booking-calendar";

export default function BookingCalendarSettingsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold text-primary">Booking calendar</h1>
        <p className="text-xs text-primary/70">
          Review booked slots, availability rules, and approved holidays for the current location.
        </p>
      </div>

      <div className="rounded-xl border border-black/5 p-4 dark:border-white/10">
        <BookingCalendar initialView="month" />
      </div>
    </div>
  );
}
