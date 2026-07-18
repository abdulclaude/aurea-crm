"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Search } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { supportsWaitlistRuntime } from "@/features/studio/scheduling/contracts";
import { useTRPC } from "@/trpc/client";

import type {
  BookingWindowPolicy,
  SchedulingService,
  WaitlistPolicy,
} from "./types";

const INHERIT = "__inherit__";

export function ServicePolicyAssignments(props: {
  services: SchedulingService[];
  bookingPolicies: BookingWindowPolicy[];
  waitlistPolicies: WaitlistPolicy[];
  canManage: boolean;
}) {
  const [query, setQuery] = React.useState("");
  const normalized = query.trim().toLocaleLowerCase();
  const services = props.services.filter((service) =>
    service.name.toLocaleLowerCase().includes(normalized),
  );
  const bookingPolicies = props.bookingPolicies.filter(
    (policy) => policy.isActive && policy.currentVersion,
  );
  const waitlistPolicies = props.waitlistPolicies.filter(
    (policy) =>
      policy.isActive &&
      policy.currentVersion &&
      supportsWaitlistRuntime(policy.currentVersion.values),
  );

  return (
    <div>
      <div className="p-6 sm:px-8">
        <h2 className="text-sm font-semibold">Service assignments</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Assign a policy or inherit the location and organization defaults.
        </p>
      </div>
      <Separator />
      <div className="p-4 sm:px-8">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search service assignments"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search services"
            className="pl-9"
          />
        </div>
      </div>
      <Separator />
      {services.length ? (
        <div className="divide-y">
          {services.map((service) => (
            <ServiceAssignmentRow
              key={service.id}
              service={service}
              bookingPolicies={bookingPolicies}
              waitlistPolicies={waitlistPolicies}
              canManage={props.canManage}
            />
          ))}
        </div>
      ) : (
        <p className="p-12 text-center text-sm text-muted-foreground">
          {normalized
            ? "No services match this search."
            : "No services configured in this scope."}
        </p>
      )}
    </div>
  );
}

function ServiceAssignmentRow(props: {
  service: SchedulingService;
  bookingPolicies: BookingWindowPolicy[];
  waitlistPolicies: WaitlistPolicy[];
  canManage: boolean;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [bookingPolicyId, setBookingPolicyId] = React.useState(
    props.service.bookingWindowPolicyId ?? INHERIT,
  );
  const [waitlistPolicyId, setWaitlistPolicyId] = React.useState(
    props.service.waitlistPolicyId ?? INHERIT,
  );
  React.useEffect(() => {
    setBookingPolicyId(props.service.bookingWindowPolicyId ?? INHERIT);
    setWaitlistPolicyId(props.service.waitlistPolicyId ?? INHERIT);
  }, [props.service.bookingWindowPolicyId, props.service.waitlistPolicyId]);
  const save = useMutation(
    trpc.schedulingPolicy.assignToService.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.schedulingPolicy.list.queryKey(),
        });
        toast.success(`${props.service.name} policies updated`);
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const dirty =
    bookingPolicyId !== (props.service.bookingWindowPolicyId ?? INHERIT) ||
    waitlistPolicyId !== (props.service.waitlistPolicyId ?? INHERIT);

  return (
    <div className="grid gap-4 p-5 sm:px-8 lg:grid-cols-[minmax(10rem,1fr)_minmax(12rem,1fr)_minmax(12rem,1fr)_auto] lg:items-end">
      <div className="min-w-0 self-center">
        <p className="truncate text-sm font-medium">{props.service.name}</p>
        {!props.service.isActive ? (
          <Badge variant="outline">Inactive</Badge>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`booking-policy-${props.service.id}`}>
          Booking window
        </Label>
        <Select
          value={bookingPolicyId}
          onValueChange={setBookingPolicyId}
          disabled={!props.canManage || save.isPending}
        >
          <SelectTrigger
            id={`booking-policy-${props.service.id}`}
            className="w-full"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={INHERIT}>Inherit default</SelectItem>
            {props.bookingPolicies.map((policy) => (
              <SelectItem key={policy.id} value={policy.id}>
                {policy.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`waitlist-policy-${props.service.id}`}>Waitlist</Label>
        <Select
          value={waitlistPolicyId}
          onValueChange={setWaitlistPolicyId}
          disabled={!props.canManage || save.isPending}
        >
          <SelectTrigger
            id={`waitlist-policy-${props.service.id}`}
            className="w-full"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={INHERIT}>Inherit default</SelectItem>
            {props.waitlistPolicies.map((policy) => (
              <SelectItem key={policy.id} value={policy.id}>
                {policy.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        variant="outline"
        size="icon"
        title="Save assignments"
        aria-label={`Save policy assignments for ${props.service.name}`}
        disabled={!props.canManage || !dirty || save.isPending}
        onClick={() =>
          save.mutate({
            serviceTypeId: props.service.id,
            bookingWindowPolicyId:
              bookingPolicyId === INHERIT ? null : bookingPolicyId,
            waitlistPolicyId:
              waitlistPolicyId === INHERIT ? null : waitlistPolicyId,
          })
        }
      >
        <Save />
      </Button>
    </div>
  );
}
