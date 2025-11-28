"use client";

import { useForm } from "react-hook-form";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  Sheet,
  ResizableSheetContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTRPC } from "@/trpc/client";
import { VariableInput } from "@/components/tiptap/variable-input";
import type { VariableItem } from "@/components/tiptap/variable-suggestion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required. " })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers and underscores.",
    }),
  name: z.string().min(1, "Name is required"),
  value: z.string().optional(),
  currency: z.string().optional(),
  deadline: z.string().optional(),
  source: z.string().optional(),
  description: z.string().optional(),
  pipelineId: z.string().optional(),
  pipelineStageId: z.string().optional(),
  contactIds: z.string().optional(),
});

export type CreateDealFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  defaultValues?: Partial<CreateDealFormValues>;
  variables: VariableItem[];
}

export const CreateDealDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  variables,
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "",
      name: defaultValues.name || "",
      value: defaultValues.value || "",
      currency: defaultValues.currency || "USD",
      deadline: defaultValues.deadline || "",
      source: defaultValues.source || "",
      description: defaultValues.description || "",
      pipelineId: defaultValues.pipelineId || "",
      pipelineStageId: defaultValues.pipelineStageId || "",
      contactIds: defaultValues.contactIds || "",
    },
  });

  const [useVariableInputForContact, setUseVariableInputForContact] =
    useState(false);

  const trpc = useTRPC();
  const pipelinesQuery = useQuery({
    ...trpc.pipelines.list.queryOptions(),
    enabled: open,
  });

  const contactsQuery = useQuery(
    trpc.contacts.list.queryOptions({
      cursor: undefined,
      limit: 100,
    })
  );

  const pipelines = pipelinesQuery.data?.items || [];
  const selectedPipelineId = form.watch("pipelineId");

  const pipelineStages = useMemo(() => {
    if (!selectedPipelineId) return [];
    const pipeline = pipelines.find((p: any) => p.id === selectedPipelineId);
    return pipeline?.stages || [];
  }, [selectedPipelineId, pipelines]);

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        name: defaultValues.name || "",
        value: defaultValues.value || "",
        currency: defaultValues.currency || "USD",
        deadline: defaultValues.deadline || "",
        source: defaultValues.source || "",
        description: defaultValues.description || "",
        pipelineId: defaultValues.pipelineId || "",
        pipelineStageId: defaultValues.pipelineStageId || "",
        contactIds: defaultValues.contactIds || "",
      });
    }
  }, [open, defaultValues.variableName, defaultValues.name, defaultValues.value, defaultValues.currency, defaultValues.deadline, defaultValues.source, defaultValues.description, defaultValues.pipelineId, defaultValues.pipelineStageId, defaultValues.contactIds, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent className="overflow-y-auto sm:max-w-xl bg-background border-black/10">
        <SheetHeader className="px-6 p-6 pb-2 gap-1">
          <SheetTitle>Create Deal Configuration</SheetTitle>
          <SheetDescription>
            Configure the deal details to create in your CRM pipeline.
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
                    <Input placeholder="myDeal" {...field} />
                  </FormControl>

                  <FormDescription>
                    You can reference this deal in other nodes using the
                    variable name.
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
                  <FormLabel>Deal Name</FormLabel>
                  <FormControl>
                    <VariableInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Q4 Enterprise Deal or type @ to insert variables"
                      className="h-13"
                      variables={variables}
                    />
                  </FormControl>

                  <FormDescription>
                    Type <span className="text-primary font-medium">@</span> or{" "}
                    <span className="text-primary font-medium">/</span> to
                    insert context variables
                  </FormDescription>
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
                    <FormLabel>Deal Value</FormLabel>
                    <FormControl>
                      <VariableInput
                        className="h-13"
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="50000 or @"
                        variables={variables}
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
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <VariableInput
                        className="h-13"
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="USD or @variables"
                        variables={variables}
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
                  <FormLabel>Deadline</FormLabel>
                  <FormControl>
                    <VariableInput
                      className="h-13"
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="2025-12-31 or @variables"
                      variables={variables}
                    />
                  </FormControl>
                  <FormDescription>
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
                      className="h-13"
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="Inbound Lead or @variables"
                      variables={variables}
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
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="Deal details and notes or @variables"
                      variables={variables}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="pipelineId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pipeline (optional)</FormLabel>
                    <Select
                      value={field.value || ""}
                      onValueChange={(val) => {
                        field.onChange(val || undefined);
                        // Reset stage when pipeline changes
                        form.setValue("pipelineStageId", "");
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full text-xs">
                          <SelectValue placeholder="Use default pipeline" />
                        </SelectTrigger>
                      </FormControl>

                      <SelectContent>
                        {pipelines.map((pipeline) => (
                          <SelectItem key={pipeline.id} value={pipeline.id}>
                            {pipeline.name}
                            {pipeline.isDefault && " (Default)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Leave empty for default pipeline
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pipelineStageId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pipeline Stage (optional)</FormLabel>
                    <Select
                      value={field.value || ""}
                      onValueChange={(val) => field.onChange(val || undefined)}
                      disabled={!selectedPipelineId}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full text-xs">
                          <SelectValue placeholder="Use first stage" />
                        </SelectTrigger>
                      </FormControl>

                      <SelectContent>
                        {pipelineStages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {stage.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <FormDescription>
                      {!selectedPipelineId
                        ? "Select a pipeline first"
                        : "Leave empty for first stage"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="contactIds"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between mb-2">
                    <FormLabel>Contact ID (optional)</FormLabel>
                    <div className="flex items-center space-x-2">
                      <Label
                        htmlFor="use-variable-contact-create"
                        className="text-xs text-primary/75 cursor-pointer"
                      >
                        Use variables
                      </Label>
                      <Switch
                        id="use-variable-contact-create"
                        checked={useVariableInputForContact}
                        onCheckedChange={setUseVariableInputForContact}
                      />
                    </div>
                  </div>
                  <FormControl>
                    {useVariableInputForContact ? (
                      <VariableInput
                        value={field.value || ""}
                        onChange={field.onChange}
                        className="h-13"
                        placeholder="Type @variables to insert variables"
                        variables={variables}
                      />
                    ) : (
                      <Select
                        value={field.value || ""}
                        onValueChange={field.onChange}
                        disabled={contactsQuery.isLoading}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              contactsQuery.isLoading
                                ? "Loading contacts..."
                                : "Select a contact"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {contactsQuery.data?.items?.map((contact) => (
                            <SelectItem key={contact.id} value={contact.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {contact.name}
                                </span>
                                {contact.email && (
                                  <span className="text-xs text-primary/75">
                                    {contact.email}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          )) ?? (
                            <div className="px-2 py-4 text-sm text-primary/75">
                              No contacts found
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </FormControl>
                  <FormDescription>
                    {useVariableInputForContact ? (
                      <>
                        Type{" "}
                        <span className="text-primary font-medium">
                          @variables
                        </span>{" "}
                        or <span className="text-primary font-medium">/</span>{" "}
                        to insert context variables
                      </>
                    ) : (
                      "Link this deal to an existing contact"
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SheetFooter className="mt-6 px-0 pb-4">
              <Button
                type="submit"
                className="bg-primary-foreground hover:bg-primary/10 hover:text-black text-primary w-full"
              >
                {" "}
                Save changes{" "}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </ResizableSheetContent>
    </Sheet>
  );
};
