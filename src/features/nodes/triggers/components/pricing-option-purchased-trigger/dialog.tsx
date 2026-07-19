"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
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
import { Separator } from "@/components/ui/separator";
import {
  ResizableSheetContent,
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useTRPC } from "@/trpc/client";
import { PricingOptionPicker } from "./pricing-option-picker";

const schema = z.object({
  pricingOptionIds: z.array(z.string().trim().min(1)),
  pricingOptionNames: z.array(z.string()).optional(),
  variableName: z.string().regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/),
});
export type PricingOptionPurchasedTriggerFormValues = z.infer<typeof schema>;

export function PricingOptionPurchasedTriggerDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: PricingOptionPurchasedTriggerFormValues) => void;
  defaultValues?: Partial<PricingOptionPurchasedTriggerFormValues>;
}) {
  const trpc = useTRPC();
  const optionsQuery = useQuery({
    ...trpc.pricingOptions.list.queryOptions({ includeInactive: false }),
    enabled: props.open,
  });
  const [targetMode, setTargetMode] = useState<"ALL" | "SELECTED">("ALL");
  const form = useForm<PricingOptionPurchasedTriggerFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      pricingOptionIds: [],
      pricingOptionNames: [],
      variableName: "purchase",
    },
  });

  useEffect(() => {
    if (!props.open) return;
    form.reset({
      pricingOptionIds: props.defaultValues?.pricingOptionIds ?? [],
      pricingOptionNames: props.defaultValues?.pricingOptionNames ?? [],
      variableName: props.defaultValues?.variableName ?? "purchase",
    });
    setTargetMode(
      (props.defaultValues?.pricingOptionIds?.length ?? 0) > 0
        ? "SELECTED"
        : "ALL",
    );
  }, [form, props.defaultValues, props.open]);

  const selectedIds = form.watch("pricingOptionIds");
  const toggleOption = (optionId: string, checked: boolean) => {
    form.setValue(
      "pricingOptionIds",
      checked
        ? Array.from(new Set([...selectedIds, optionId]))
        : selectedIds.filter((id) => id !== optionId),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <ResizableSheetContent className="overflow-y-auto border-border bg-background sm:max-w-xl">
        <SheetHeader className="gap-1 px-6 pb-1 pt-8">
          <SheetTitle>Pricing option purchased trigger</SheetTitle>
          <SheetDescription>
            Start this workflow after a successful pricing option checkout.
          </SheetDescription>
        </SheetHeader>
        <Separator className="my-5" />
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
              name="pricingOptionIds"
              render={() => (
                <FormItem>
                  <FormLabel>Pricing options</FormLabel>
                  <Select
                    value={targetMode}
                    onValueChange={(value) => {
                      const nextMode = value === "SELECTED" ? "SELECTED" : "ALL";
                      setTargetMode(nextMode);
                      if (nextMode === "ALL") {
                        form.setValue("pricingOptionIds", [], {
                          shouldDirty: true,
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Any pricing option</SelectItem>
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
                      onToggle={toggleOption}
                    />
                  ) : null}
                  <FormDescription>
                    Choose the studio products that should start this workflow.
                  </FormDescription>
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
                  <Input {...field} />
                  <FormDescription>
                    Purchase details are at @{field.value}.purchase. Change this
                    only for advanced workflows.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <SheetFooter className="px-0 pb-4">
              <Button
                type="submit"
                className="ml-auto w-max"
                variant="gradient"
              >
                Save changes
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </ResizableSheetContent>
    </Sheet>
  );
}
