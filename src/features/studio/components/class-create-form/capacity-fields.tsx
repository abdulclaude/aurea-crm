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
import { Switch } from "@/components/ui/switch";
import type { ClassFormValues } from "./schema";

type CapacityFieldsProps = {
  form: UseFormReturn<ClassFormValues>;
};

export function CapacityFields({ form }: CapacityFieldsProps) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <FormField
          control={form.control}
          name="maxCapacity"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-primary/75">Total capacity</FormLabel>
              <FormControl>
                <Input inputMode="numeric" placeholder="12" {...field} />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="onlineCapacity"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-primary/75">Online capacity</FormLabel>
              <FormControl>
                <Input inputMode="numeric" placeholder="10" {...field} />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="walkInCapacity"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-primary/75">Walk-in capacity</FormLabel>
              <FormControl>
                <Input inputMode="numeric" placeholder="2" {...field} />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <FormField
          control={form.control}
          name="isVirtual"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-sm border border-black/5 p-3 dark:border-white/5">
              <FormLabel className="text-xs text-primary/75">Virtual class</FormLabel>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="spotPickingEnabled"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-sm border border-black/5 p-3 dark:border-white/5">
              <FormLabel className="text-xs text-primary/75">Spot picking</FormLabel>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

