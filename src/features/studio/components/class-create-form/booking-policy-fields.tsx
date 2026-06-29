"use client";

import type { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { CancellationPolicyOption, ClassFormValues } from "./schema";

type BookingPolicyFieldsProps = {
  form: UseFormReturn<ClassFormValues>;
  cancellationPolicies: CancellationPolicyOption[];
};

const NONE_VALUE = "__none__";

export function BookingPolicyFields({
  form,
  cancellationPolicies,
}: BookingPolicyFieldsProps) {
  const waitlistEnabled = form.watch("waitlistEnabled");

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <FormField
          control={form.control}
          name="bookingWindowHours"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-primary/75">Booking window</FormLabel>
              <FormControl>
                <Input inputMode="numeric" placeholder="168" {...field} />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cancellationWindowHours"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-primary/75">Cancel window</FormLabel>
              <FormControl>
                <Input inputMode="numeric" placeholder="12" {...field} />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cancellationPolicyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-primary/75">Cancellation policy</FormLabel>
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
                  {cancellationPolicies.map((policy) => (
                    <SelectItem key={policy.id} value={policy.id}>
                      {policy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <FormField
          control={form.control}
          name="onlineBookingEnabled"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-sm border border-black/5 p-3 dark:border-white/5">
              <FormLabel className="text-xs text-primary/75">Online booking</FormLabel>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="waitlistEnabled"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-sm border border-black/5 p-3 dark:border-white/5">
              <FormLabel className="text-xs text-primary/75">Waitlist</FormLabel>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                    if (!checked) {
                      form.setValue("autoPromoteWaitlist", false);
                    }
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="autoPromoteWaitlist"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-sm border border-black/5 p-3 dark:border-white/5">
              <FormLabel className="text-xs text-primary/75">Auto-promote</FormLabel>
              <FormControl>
                <Switch
                  checked={field.value}
                  disabled={!waitlistEnabled}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
