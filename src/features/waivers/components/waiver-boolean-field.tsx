"use client";

import type { Control } from "react-hook-form";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import type { AddWaiverValues } from "./add-waiver-schema";

export function WaiverBooleanField({
  control,
  label,
  name,
}: {
  control: Control<AddWaiverValues>;
  label: string;
  name: "isRequired" | "requiresMinor";
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex items-center justify-between rounded-md border border-black/5 px-3 py-2.5 dark:border-white/5">
          <FormLabel className="text-xs font-normal">{label}</FormLabel>
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )}
    />
  );
}
