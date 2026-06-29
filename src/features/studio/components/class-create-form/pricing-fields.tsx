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
import type { ClassFormValues } from "./schema";
import { PRICING_MODEL_OPTIONS } from "./schema";

type PricingFieldsProps = {
  form: UseFormReturn<ClassFormValues>;
};

export function PricingFields({ form }: PricingFieldsProps) {
  const pricingModel = form.watch("pricingModel");

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="pricingModel"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-primary/75">Pricing model</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PRICING_MODEL_OPTIONS.map((option) => (
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

        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-primary/75">Currency</FormLabel>
              <FormControl>
                <Input placeholder="GBP" maxLength={3} {...field} />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </div>

      {pricingModel === "DROP_IN" && (
        <FormField
          control={form.control}
          name="dropInPrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-primary/75">Drop-in price</FormLabel>
              <FormControl>
                <Input inputMode="decimal" placeholder="18.00" {...field} />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      )}

      {pricingModel === "SLIDING_SCALE" && (
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="slidingScaleMinPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-primary/75">Minimum price</FormLabel>
                <FormControl>
                  <Input inputMode="decimal" placeholder="10.00" {...field} />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="slidingScaleMaxPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-primary/75">Maximum price</FormLabel>
                <FormControl>
                  <Input inputMode="decimal" placeholder="25.00" {...field} />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </div>
      )}
    </div>
  );
}

