"use client";

import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Button } from "@/components/ui/button";
import { VariableInput } from "@/components/tiptap/variable-input";
import type { VariableItem } from "@/components/tiptap/variable-suggestion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required. " })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers and underscores.",
    }),
  dealId: z.string().min(1, "Deal ID is required"),
  name: z.string().optional(),
  value: z.string().optional(),
  currency: z.string().optional(),
  deadline: z.string().optional(),
  source: z.string().optional(),
  description: z.string().optional(),
});

export type UpdateDealFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  defaultValues?: Partial<UpdateDealFormValues>;
  variables: VariableItem[];
}

export const UpdateDealDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  variables,
}) => {
  const [useVariableInput, setUseVariableInput] = useState(false);
  const trpc = useTRPC();

  // Fetch deals list for Select mode
  const dealsQuery = useQuery(
    trpc.deals.list.queryOptions({
      cursor: undefined,
      limit: 100,
    })
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "",
      dealId: defaultValues.dealId || "",
      name: defaultValues.name || "",
      value: defaultValues.value || "",
      currency: defaultValues.currency || "",
      deadline: defaultValues.deadline || "",
      source: defaultValues.source || "",
      description: defaultValues.description || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        dealId: defaultValues.dealId || "",
        name: defaultValues.name || "",
        value: defaultValues.value || "",
        currency: defaultValues.currency || "",
        deadline: defaultValues.deadline || "",
        source: defaultValues.source || "",
        description: defaultValues.description || "",
      });
    }
  }, [open, defaultValues.variableName, defaultValues.dealId, defaultValues.name, defaultValues.value, defaultValues.currency, defaultValues.deadline, defaultValues.source, defaultValues.description, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-xl bg-background border-black/10">
        <SheetHeader className="px-6 p-6 pb-2 gap-1">
          <SheetTitle>Update Deal Configuration</SheetTitle>
          <SheetDescription>
            Configure the deal fields to update. Only provided fields will be
            updated.
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-4 bg-black/10" />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 px-6 pb-6"
          >
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable Name</FormLabel>
                  <FormControl>
                    <Input placeholder="updatedDeal" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs mt-2 leading-5">
                    Reference the updated deal in other nodes: <br />
                    <span className="text-primary font-medium tracking-wide">
                      {`{{${field.value || "updatedDeal"}.id}}`}
                    </span>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dealId"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between mb-2">
                    <FormLabel>Deal ID</FormLabel>
                    <div className="flex items-center space-x-2">
                      <Label
                        htmlFor="use-variable-deal"
                        className="text-xs text-primary/75 cursor-pointer"
                      >
                        Use variables
                      </Label>
                      <Switch
                        id="use-variable-deal"
                        checked={useVariableInput}
                        onCheckedChange={setUseVariableInput}
                      />
                    </div>
                  </div>
                  <FormControl>
                    {useVariableInput ? (
                      <VariableInput
                        placeholder="@myDeal.id"
                        className="h-13"
                        variables={variables}
                        {...field}
                      />
                    ) : (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={dealsQuery.isLoading}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              dealsQuery.isLoading
                                ? "Loading deals..."
                                : "Select a deal"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {dealsQuery.data?.items?.map((deal) => (
                            <SelectItem key={deal.id} value={deal.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{deal.name}</span>
                                {deal.value && (
                                  <span className="text-xs text-primary/75">
                                    {deal.currency} {deal.value.toString()}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          )) ?? (
                            <div className="px-2 py-4 text-sm text-primary/75">
                              No deals found
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </FormControl>
                  <FormDescription className="text-xs">
                    {useVariableInput
                      ? "ID of the deal to update"
                      : "Select an existing deal from your CRM"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deal Name (optional)</FormLabel>
                  <FormControl>
                    <VariableInput
                      placeholder="Updated Deal Name or @trigger.name"
                      className="h-13"
                      variables={variables}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Updated deal value</FormLabel>
                    <FormControl>
                      <VariableInput
                        placeholder="75000 or @trigger.amount"
                        className="h-13"
                        variables={variables}
                        {...field}
                      />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency (optional)</FormLabel>
                    <FormControl>
                      <VariableInput
                        placeholder="EUR or @trigger.currency"
                        className="h-13"
                        variables={variables}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="deadline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deadline (optional)</FormLabel>
                  <FormControl>
                    <VariableInput
                      placeholder="2025-12-31 or @trigger.deadline"
                      className="h-13"
                      variables={variables}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    ISO date string (YYYY-MM-DD)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source (optional)</FormLabel>
                  <FormControl>
                    <VariableInput
                      placeholder="Updated Source or @trigger.source"
                      className="h-13"
                      variables={variables}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <VariableInput
                      placeholder="Updated deal description"
                      variables={variables}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormDescription className="text-xs leading-5">
              Use{" "}
              <span className="text-primary font-medium tracking-wide">
                {"@variables"}
              </span>{" "}
              to reference data from previous nodes. Leave fields empty to keep
              current values.
            </FormDescription>

            <SheetFooter className="mt-6 px-0 pb-4">
              <Button
                type="submit"
                className="bg-primary-foreground hover:bg-primary/10 hover:text-black text-primary w-full"
              >
                Save changes
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
};
