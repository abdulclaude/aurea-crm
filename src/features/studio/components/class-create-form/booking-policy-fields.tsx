"use client";

import type { UseFormReturn } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type {
  BookingWindowPolicyView,
  BookingWindowValues,
  WaitlistPolicyView,
  WaitlistValues,
} from "@/features/studio/scheduling/contracts";
import { supportsWaitlistRuntime } from "@/features/studio/scheduling/contracts";
import type { ResolvedSchedulingPolicy } from "@/features/studio/scheduling/resolution";

import type { CancellationPolicyOption, ClassFormValues } from "./schema";

type BookingPolicyFieldsProps = {
  form: UseFormReturn<ClassFormValues>;
  cancellationPolicies: CancellationPolicyOption[];
  bookingPolicies: BookingWindowPolicyView[];
  waitlistPolicies: WaitlistPolicyView[];
  bookingPreview?: ResolvedSchedulingPolicy<BookingWindowValues>;
  waitlistPreview?: ResolvedSchedulingPolicy<WaitlistValues>;
  policiesLoading: boolean;
  policiesError?: string;
  previewLoading: boolean;
  previewError?: string;
};

const NONE_VALUE = "__none__";

export function BookingPolicyFields(props: BookingPolicyFieldsProps) {
  const bookingPolicies = props.bookingPolicies.filter(
    (policy) => policy.isActive && policy.currentVersion,
  );
  const waitlistPolicies = props.waitlistPolicies.filter(
    (policy) => policy.isActive && policy.currentVersion,
  );

  return (
    <div className="space-y-5">
      {props.policiesLoading ? (
        <p
          role="status"
          aria-live="polite"
          className="text-xs text-muted-foreground"
        >
          Loading scheduling policies...
        </p>
      ) : props.policiesError ? (
        <p role="alert" className="text-xs text-destructive">
          {props.policiesError}
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        <PolicySelect
          form={props.form}
          name="bookingWindowPolicyOverrideId"
          label="Booking window"
          policies={bookingPolicies.map((policy) => ({
            id: policy.id,
            name: policy.name,
            disabled: false,
          }))}
          disabled={props.policiesLoading || Boolean(props.policiesError)}
          description="Overrides the assigned service and workspace defaults."
        />
        <PolicySelect
          form={props.form}
          name="waitlistPolicyOverrideId"
          label="Waitlist"
          policies={waitlistPolicies.map((policy) => ({
            id: policy.id,
            name: policy.name,
            disabled: !policySupportsWaitlistRuntime(policy),
          }))}
          disabled={props.policiesLoading || Boolean(props.policiesError)}
          description="Auto-book and credit-hold policies remain unavailable until their runtime is configured."
        />
        <FormField
          control={props.form.control}
          name="cancellationPolicyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fees and no-shows</FormLabel>
              <Select
                value={field.value || NONE_VALUE}
                onValueChange={(value) =>
                  field.onChange(value === NONE_VALUE ? "" : value)
                }
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Use default" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>Use default policy</SelectItem>
                  {props.cancellationPolicies.map((policy) => (
                    <SelectItem key={policy.id} value={policy.id}>
                      {policy.name}
                      {policy.isDefault ? " (default)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </div>

      <div
        aria-live="polite"
        aria-busy={props.previewLoading || undefined}
        className="grid divide-y rounded-md border md:grid-cols-2 md:divide-x md:divide-y-0"
      >
        <ResolvedBookingPolicy
          policy={props.bookingPreview}
          error={props.previewError}
        />
        <ResolvedWaitlistPolicy
          policy={props.waitlistPreview}
          error={props.previewError}
        />
      </div>

      <FormField
        control={props.form.control}
        name="onlineBookingEnabled"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between rounded-md border p-3">
            <div>
              <FormLabel className="text-sm font-medium">
                Online booking
              </FormLabel>
              <FormDescription>
                Members and API clients can book within the resolved window.
              </FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
}

function PolicySelect(props: {
  form: UseFormReturn<ClassFormValues>;
  name: "bookingWindowPolicyOverrideId" | "waitlistPolicyOverrideId";
  label: string;
  policies: Array<{ id: string; name: string; disabled: boolean }>;
  disabled: boolean;
  description: string;
}) {
  return (
    <FormField
      control={props.form.control}
      name={props.name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{props.label}</FormLabel>
          <Select
            value={field.value || NONE_VALUE}
            onValueChange={(value) =>
              field.onChange(value === NONE_VALUE ? "" : value)
            }
            disabled={props.disabled}
          >
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Inherit service or default" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>
                Inherit service or default
              </SelectItem>
              {props.policies.map((policy) => (
                <SelectItem
                  key={policy.id}
                  value={policy.id}
                  disabled={policy.disabled}
                >
                  {policy.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormDescription>{props.description}</FormDescription>
          <FormMessage className="text-xs" />
        </FormItem>
      )}
    />
  );
}

function ResolvedBookingPolicy(props: {
  policy?: ResolvedSchedulingPolicy<BookingWindowValues>;
  error?: string;
}) {
  return (
    <div className="space-y-1 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Resolved booking window</p>
        <Badge variant="outline">{sourceLabel(props.policy?.source)}</Badge>
      </div>
      {props.error ? (
        <p role="alert" className="text-xs text-destructive">
          {props.error}
        </p>
      ) : props.policy ? (
        <p className="text-xs text-muted-foreground">
          Opens{" "}
          {formatRelativeMinutes(props.policy.values.opensMinutesBeforeStart)}
          {" / "}closes{" "}
          {formatRelativeMinutes(props.policy.values.closesMinutesBeforeStart)}
          {" / "}version {props.policy.version ?? "legacy"}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Resolving...</p>
      )}
    </div>
  );
}

function ResolvedWaitlistPolicy(props: {
  policy?: ResolvedSchedulingPolicy<WaitlistValues>;
  error?: string;
}) {
  return (
    <div className="space-y-1 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Resolved waitlist</p>
        <Badge variant="outline">{sourceLabel(props.policy?.source)}</Badge>
      </div>
      {props.error ? (
        <p role="alert" className="text-xs text-destructive">
          {props.error}
        </p>
      ) : props.policy ? (
        <p className="text-xs text-muted-foreground">
          {modeLabel(props.policy.values.mode)} /{" "}
          {props.policy.values.maxEntries ?? "unlimited"} entries / version{" "}
          {props.policy.version ?? "legacy"}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Resolving...</p>
      )}
    </div>
  );
}

function policySupportsWaitlistRuntime(policy: WaitlistPolicyView): boolean {
  return Boolean(
    policy.currentVersion &&
    supportsWaitlistRuntime(policy.currentVersion.values),
  );
}

function sourceLabel(source?: string): string {
  return source ? source.toLocaleLowerCase().replaceAll("_", " ") : "pending";
}

function modeLabel(mode: WaitlistValues["mode"]): string {
  return mode.toLocaleLowerCase().replaceAll("_", " ");
}

function formatRelativeMinutes(minutes: number): string {
  const absolute = Math.abs(minutes);
  const direction = minutes < 0 ? "after start" : "before start";
  return `${absolute} ${absolute === 1 ? "minute" : "minutes"} ${direction}`;
}
