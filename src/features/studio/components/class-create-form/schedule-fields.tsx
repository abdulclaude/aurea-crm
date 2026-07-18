"use client";

import type { UseFormReturn } from "react-hook-form";
import { DatePicker } from "@/components/ui/date-picker";
import {
  formatDateValue,
  parseDateValue,
} from "@/components/ui/date-picker-utils";
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
import type { ClassFormValues } from "./schema";
import { REPEAT_OPTIONS } from "./schema";

type ScheduleFieldsProps = {
  form: UseFormReturn<ClassFormValues>;
};

export function ScheduleFields({ form }: ScheduleFieldsProps) {
  const repeatFrequency = form.watch("repeatFrequency");

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-primary/75">Date</FormLabel>
              <FormControl>
                <DatePicker
                  date={parseDateValue(field.value)}
                  onSelect={(date) => field.onChange(formatDateValue(date))}
                  placeholder="Pick a date"
                  ariaLabel="Class date"
                  required
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="startTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-primary/75">Start</FormLabel>
              <FormControl>
                <Input type="time" {...field} />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="endTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-primary/75">End</FormLabel>
              <FormControl>
                <Input type="time" {...field} />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="repeatFrequency"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-primary/75">Repeat</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {REPEAT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        {repeatFrequency !== "NONE" && (
          <FormField
            control={form.control}
            name="repeatCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-primary/75">
                  Occurrences
                </FormLabel>
                <FormControl>
                  <Input inputMode="numeric" placeholder="8" {...field} />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        )}
      </div>
    </div>
  );
}
