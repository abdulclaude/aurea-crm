"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import {
  Form,
  FormControl,
  FormDescription,
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
import { PricingOptionPicker } from "@/features/nodes/triggers/components/pricing-option-purchased-trigger/pricing-option-picker";
import {
  pricingOptionCreditTriggerConfigSchema,
  type PricingOptionCreditTriggerConfig,
} from "@/features/nodes/studio/lib/studio-node-config";
import { useTRPC } from "@/trpc/client";
import {
  StudioNodeDialogFooter,
  StudioNodeDialogLayout,
} from "./studio-node-dialog-layout";

export function PricingOptionCreditTriggerDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: PricingOptionCreditTriggerConfig) => void;
  defaultValues?: Partial<PricingOptionCreditTriggerConfig>;
}): React.ReactElement {
  const trpc = useTRPC();
  const optionsQuery = useQuery(
    trpc.pricingOptions.list.queryOptions({ includeInactive: false }),
  );
  const [targetMode, setTargetMode] = useState<"ALL" | "SELECTED">("ALL");
  const form = useForm<PricingOptionCreditTriggerConfig>({
    resolver: zodResolver(pricingOptionCreditTriggerConfigSchema),
    defaultValues: {
      variableName: "pricingCredits",
      creditThreshold: 0,
      pricingOptionIds: [],
      pricingOptionNames: [],
    },
  });

  useEffect(() => {
    if (!props.open) return;
    const pricingOptionIds = props.defaultValues?.pricingOptionIds ?? [];
    form.reset({
      variableName: props.defaultValues?.variableName ?? "pricingCredits",
      creditThreshold: props.defaultValues?.creditThreshold ?? 0,
      pricingOptionIds,
      pricingOptionNames: props.defaultValues?.pricingOptionNames ?? [],
    });
    setTargetMode(pricingOptionIds.length ? "SELECTED" : "ALL");
  }, [form, props.defaultValues, props.open]);

  const selectedIds = form.watch("pricingOptionIds");
  return (
    <StudioNodeDialogLayout
      open={props.open}
      onOpenChange={props.onOpenChange}
      title="Pricing option credits trigger"
      description="Start when a member's remaining class credits cross a chosen threshold."
    >
      <Form {...form}>
        <form
          className="space-y-6 px-6"
          onSubmit={form.handleSubmit((values) => {
            props.onSubmit({
              ...values,
              pricingOptionNames: (optionsQuery.data ?? [])
                .filter((option) => values.pricingOptionIds.includes(option.id))
                .map((option) => option.name),
            });
            props.onOpenChange(false);
          })}
        >
          <FormField
            control={form.control}
            name="creditThreshold"
            render={({ field }) => (
              <FormItem>
                <FormLabel>When credits remaining reaches</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={1000}
                    value={field.value}
                    onChange={(event) =>
                      field.onChange(event.target.valueAsNumber)
                    }
                  />
                </FormControl>
                <FormDescription>
                  Use 0 for all credits used, or a small number for an early
                  warning.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="pricingOptionIds"
            render={() => (
              <FormItem>
                <FormLabel>Pricing options</FormLabel>
                <Select
                  value={targetMode}
                  onValueChange={(value) => {
                    const next = value === "SELECTED" ? "SELECTED" : "ALL";
                    setTargetMode(next);
                    if (next === "ALL") form.setValue("pricingOptionIds", []);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Any class package</SelectItem>
                    <SelectItem value="SELECTED">
                      Selected pricing options
                    </SelectItem>
                  </SelectContent>
                </Select>
                {targetMode === "SELECTED" ? (
                  <PricingOptionPicker
                    options={optionsQuery.data ?? []}
                    selectedIds={selectedIds}
                    loading={optionsQuery.isLoading}
                    onToggle={(id, checked) =>
                      form.setValue(
                        "pricingOptionIds",
                        checked
                          ? Array.from(new Set([...selectedIds, id]))
                          : selectedIds.filter((value) => value !== id),
                        { shouldDirty: true, shouldValidate: true },
                      )
                    }
                  />
                ) : null}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="variableName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Variable name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>
                  Later steps can use the member, package, and remaining credit
                  count.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <StudioNodeDialogFooter />
        </form>
      </Form>
    </StudioNodeDialogLayout>
  );
}
