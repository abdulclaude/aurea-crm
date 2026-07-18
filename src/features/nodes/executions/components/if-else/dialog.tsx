"use client";

import { useEffect, useMemo } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import type { VariableItem } from "@/components/tiptap/variable-suggestion";
import { VariableInput } from "@/components/tiptap/variable-input";
import { Button } from "@/components/ui/button";
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
import {
  ResizableSheetContent,
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ACQUISITION_STAGE_VALUES,
  CLIENT_TYPE_VALUES,
  LIFECYCLE_STAGE_VALUES,
} from "@/features/crm/constants";
import { useTRPC } from "@/trpc/client";

import { ConditionRow } from "./condition-row";
import {
  createIfElseCondition,
  ifElseFormSchema,
  normalizeIfElseConfig,
  type IfElseFormValues,
} from "./schema";
import { buildConditionVariableOptions } from "./variable-options";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: IfElseFormValues) => void;
  defaultValues?: unknown;
  variables: VariableItem[];
};

export function IfElseDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  variables,
}: Props): React.ReactNode {
  const trpc = useTRPC();
  const conditionOptionsQuery = useQuery({
    ...trpc.workflows.conditionOptions.queryOptions(),
    enabled: open,
  });
  const normalizedDefaults = useMemo(
    () => safeNormalize(defaultValues),
    [defaultValues],
  );
  const form = useForm<IfElseFormValues>({
    resolver: zodResolver(ifElseFormSchema),
    defaultValues: normalizedDefaults,
  });
  const conditions = useWatch({ control: form.control, name: "conditions" });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "conditions",
  });
  const options = useMemo(
    () =>
      buildConditionVariableOptions(
        variables,
        conditionOptionsQuery.data?.customFields ?? [],
        conditionOptionsQuery.data?.pricingOptions ?? [],
      ),
    [
      conditionOptionsQuery.data?.customFields,
      conditionOptionsQuery.data?.pricingOptions,
      variables,
    ],
  );
  const clientOptions = useMemo(
    () =>
      options.filter(
        (option) =>
          option.path !== "system.client.id" &&
          (option.path.endsWith(".clientId") ||
            option.path.endsWith(".client.id") ||
            option.path === "triggerData.clientId"),
      ),
    [options],
  );

  useEffect(() => {
    if (open) form.reset(normalizedDefaults);
  }, [form, normalizedDefaults, open]);

  const handleSubmit = (values: IfElseFormValues): void => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent
        defaultSize={680}
        minSize={360}
        maxSize={820}
        className="overflow-y-auto border-border bg-background"
      >
        <SheetHeader className="gap-1 border-b border-border px-6 pb-5 pt-8">
          <SheetTitle>Condition</SheetTitle>
          <SheetDescription>
            Send people down the True or False path based on studio data.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex min-h-[calc(100dvh-116px)] flex-col"
          >
            <div className="flex-1 space-y-6 px-6 py-6">
              <FormField
                control={form.control}
                name="actionName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Step name</FormLabel>
                    <FormControl>
                      <Input placeholder="Has attended three classes" {...field} />
                    </FormControl>
                    <FormDescription>
                      This name appears on the workflow canvas.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Member to check</FormLabel>
                    {clientOptions.length > 0 ? (
                      <Select
                        value={field.value || ""}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose the member from the trigger or a previous step" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clientOptions.map((option) => (
                            <SelectItem
                              key={option.path}
                              value={option.operand}
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <FormControl>
                        <VariableInput
                          value={field.value || ""}
                          onChange={field.onChange}
                          variables={variables}
                          placeholder="Choose a client ID from the trigger"
                          ariaLabel="Member to check"
                          className="min-h-11"
                        />
                      </FormControl>
                    )}
                    <FormDescription>
                      Aurea reloads this member's current studio data when the
                      condition runs, so delayed checks do not use stale values.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="matchMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>When should the True path run?</FormLabel>
                    <Tabs value={field.value} onValueChange={field.onChange}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="all">All conditions match</TabsTrigger>
                        <TabsTrigger value="any">Any condition matches</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </FormItem>
                )}
              />

              <Tabs defaultValue="guided" className="space-y-5">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="guided">Simple builder</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced variables</TabsTrigger>
                </TabsList>

                {(["guided", "advanced"] as const).map((mode) => (
                  <TabsContent key={mode} value={mode} className="space-y-4">
                    {mode === "advanced" ? (
                      <p className="text-xs leading-5 text-muted-foreground">
                        Variables are limited to the trigger and previous connected
                        steps. Use this mode for custom expressions or field-to-field
                        comparisons.
                      </p>
                    ) : null}

                    {fields.map((field, index) => {
                      const condition = conditions[index];
                      return (
                        <ConditionRow
                          key={`${mode}-${field.id}`}
                          control={form.control}
                          index={index}
                          mode={mode}
                          canRemove={fields.length > 1}
                          onRemove={() => remove(index)}
                          options={options}
                          setValue={form.setValue}
                          variables={variables}
                          valueType={condition?.valueType || "text"}
                          operator={condition?.operator || "equals"}
                          rightOperandSource={
                            condition?.rightOperandSource || "value"
                          }
                          literalOptions={literalOptionsFor(
                            condition?.leftOperand,
                            conditionOptionsQuery.data?.tags ?? [],
                          )}
                        />
                      );
                    })}

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled={fields.length >= 10}
                      onClick={() => append(createIfElseCondition())}
                    >
                      <PlusIcon className="size-4" />
                      Add condition
                    </Button>
                  </TabsContent>
                ))}
              </Tabs>

              <FormField
                control={form.control}
                name="variableName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Result variable</FormLabel>
                    <FormControl>
                      <Input placeholder="condition" {...field} />
                    </FormControl>
                    <FormDescription>
                      Advanced steps can reference the True/False result using
                      this name.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <SheetFooter className="sticky bottom-0 border-t border-border bg-background px-6 py-4">
              <Button type="submit" className="w-full">
                Save condition
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </ResizableSheetContent>
    </Sheet>
  );
}

function literalOptionsFor(
  operand: string | undefined,
  tags: string[],
): Array<{ value: string; label: string }> {
  if (operand === "{{system.client.tags}}") {
    return tags.map((tag) => ({ value: tag, label: tag }));
  }
  if (operand === "{{system.client.lifecycleStage}}") {
    return enumOptions(LIFECYCLE_STAGE_VALUES);
  }
  if (operand === "{{system.client.acquisitionStage}}") {
    return enumOptions(ACQUISITION_STAGE_VALUES);
  }
  if (operand === "{{system.client.type}}") {
    return enumOptions(CLIENT_TYPE_VALUES);
  }
  return [];
}

function enumOptions(
  values: readonly string[],
): Array<{ value: string; label: string }> {
  return values.map((value) => ({
    value,
    label: value.charAt(0) + value.slice(1).toLowerCase(),
  }));
}

function safeNormalize(input: unknown): IfElseFormValues {
  try {
    return normalizeIfElseConfig(input);
  } catch {
    return {
      version: 2,
      actionName: "Check a condition",
      variableName: "condition",
      clientId: "",
      matchMode: "all",
      conditions: [createIfElseCondition()],
    };
  }
}

export type { IfElseFormValues } from "./schema";
