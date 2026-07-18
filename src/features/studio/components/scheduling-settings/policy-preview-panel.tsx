"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useTRPC } from "@/trpc/client";

import { formatMinutes, modeLabel, toLocalDateTime } from "./format";
import type {
  BookingWindowPolicy,
  SchedulingService,
  WaitlistPolicy,
} from "./types";

const INHERIT = "__inherit__";

export function PolicyPreviewPanel(props: {
  services: SchedulingService[];
  bookingPolicies: BookingWindowPolicy[];
  waitlistPolicies: WaitlistPolicy[];
}) {
  const trpc = useTRPC();
  const [serviceTypeId, setServiceTypeId] = React.useState(INHERIT);
  const [bookingOverrideId, setBookingOverrideId] = React.useState(INHERIT);
  const [waitlistOverrideId, setWaitlistOverrideId] = React.useState(INHERIT);
  const [startsAt, setStartsAt] = React.useState(toLocalDateTime());
  const preview = useQuery({
    ...trpc.schedulingPolicy.preview.queryOptions({
      serviceTypeId: serviceTypeId === INHERIT ? null : serviceTypeId,
      bookingWindowPolicyOverrideId:
        bookingOverrideId === INHERIT ? null : bookingOverrideId,
      waitlistPolicyOverrideId:
        waitlistOverrideId === INHERIT ? null : waitlistOverrideId,
      startsAt: startsAt ? new Date(startsAt) : new Date(),
    }),
    enabled: Boolean(startsAt),
  });
  const bookingPolicies = props.bookingPolicies.filter(
    (policy) => policy.isActive && policy.currentVersion,
  );
  const waitlistPolicies = props.waitlistPolicies.filter(
    (policy) => policy.isActive && policy.currentVersion,
  );

  return (
    <div>
      <div className="p-6 sm:px-8">
        <h2 className="text-sm font-semibold">Resolution preview</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Check which immutable policy version a future class occurrence would
          capture.
        </p>
      </div>
      <Separator />
      <div className="grid max-w-5xl gap-4 p-6 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
        <PreviewSelect
          id="preview-service"
          label="Service"
          value={serviceTypeId}
          onChange={setServiceTypeId}
          items={props.services.map((service) => ({
            id: service.id,
            name: service.name,
          }))}
        />
        <PreviewSelect
          id="preview-booking-override"
          label="Class booking override"
          value={bookingOverrideId}
          onChange={setBookingOverrideId}
          items={bookingPolicies.map((policy) => ({
            id: policy.id,
            name: policy.name,
          }))}
        />
        <PreviewSelect
          id="preview-waitlist-override"
          label="Class waitlist override"
          value={waitlistOverrideId}
          onChange={setWaitlistOverrideId}
          items={waitlistPolicies.map((policy) => ({
            id: policy.id,
            name: policy.name,
          }))}
        />
        <div className="space-y-2">
          <Label htmlFor="preview-starts-at">Class starts</Label>
          <DateTimePicker
            id="preview-starts-at"
            value={startsAt}
            onChange={setStartsAt}
            required
            dateAriaLabel="Preview class start date"
            timeAriaLabel="Preview class start time"
            className="sm:grid-cols-1"
          />
        </div>
      </div>
      <Separator />
      {preview.isLoading ? (
        <p
          role="status"
          aria-live="polite"
          className="p-8 text-sm text-muted-foreground"
        >
          Resolving policies...
        </p>
      ) : preview.isError ? (
        <p role="alert" className="p-8 text-sm text-destructive">
          {preview.error.message}
        </p>
      ) : preview.data ? (
        <div className="grid max-w-5xl gap-4 p-6 sm:grid-cols-2 sm:px-8">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle
                role="heading"
                aria-level={3}
                className="flex items-center justify-between gap-3 text-sm"
              >
                Booking window
                <Badge variant="secondary">
                  {sourceLabel(preview.data.bookingWindow.source)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs text-muted-foreground">
              <p>
                Opens{" "}
                {formatMinutes(
                  preview.data.bookingWindow.values.opensMinutesBeforeStart,
                )}
              </p>
              <p>
                Closes{" "}
                {formatMinutes(
                  preview.data.bookingWindow.values.closesMinutesBeforeStart,
                )}
              </p>
              <p>
                Cancellations close{" "}
                {formatMinutes(
                  preview.data.bookingWindow.values
                    .cancellationsCloseMinutesBeforeStart,
                )}
              </p>
              <p>
                {preview.data.bookingWindow.values.blockClientCancellations
                  ? "Self-service cancellation blocked"
                  : "Self-service cancellation allowed"}
              </p>
              <p>Version {preview.data.bookingWindow.version ?? "legacy"}</p>
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle
                role="heading"
                aria-level={3}
                className="flex items-center justify-between gap-3 text-sm"
              >
                Waitlist
                <Badge variant="secondary">
                  {sourceLabel(preview.data.waitlist.source)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs text-muted-foreground">
              <p>{modeLabel(preview.data.waitlist.values.mode)}</p>
              <p>
                {preview.data.waitlist.values.maxEntries ?? "No"} entry limit
              </p>
              <p>
                {preview.data.waitlist.values.allowOverlappingReservations
                  ? "Overlapping reservations allowed"
                  : "Overlapping reservations blocked"}
              </p>
              <p>
                {preview.data.waitlist.values.offerExpiryMinutes
                  ? `${preview.data.waitlist.values.offerExpiryMinutes} minute offer expiry`
                  : "No automatic offer expiry"}
              </p>
              <p>Version {preview.data.waitlist.version ?? "legacy"}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function PreviewSelect(props: {
  id: string;
  label: string;
  value: string;
  items: Array<{ id: string; name: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={props.id}>{props.label}</Label>
      <Select value={props.value} onValueChange={props.onChange}>
        <SelectTrigger id={props.id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={INHERIT}>Inherit</SelectItem>
          {props.items.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function sourceLabel(source: string): string {
  return source.toLocaleLowerCase().replaceAll("_", " ");
}
