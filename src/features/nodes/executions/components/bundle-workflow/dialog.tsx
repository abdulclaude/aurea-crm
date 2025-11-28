"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

import { useState } from "react";
import { IconPlusSmall } from "central-icons/IconPlusSmall";
import { IconTrashCanSimple } from "central-icons/IconTrashCanSimple";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { VariableInput } from "@/components/tiptap/variable-input";
import type { VariableItem } from "@/components/tiptap/variable-suggestion";
import { Separator } from "@/components/ui/separator";

export const bundleWorkflowFormSchema = z.object({
  variableName: z.string().min(1, "Variable name is required"),
  bundleWorkflowId: z.string().min(1, "Bundle workflow is required"),
  inputMappings: z.array(
    z.object({
      bundleInputName: z.string(),
      value: z.string(),
    })
  ),
});

export type BundleWorkflowFormValues = z.infer<typeof bundleWorkflowFormSchema>;

interface BundleWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: BundleWorkflowFormValues) => void;
  initialData?: Partial<BundleWorkflowFormValues>;
  variables: VariableItem[];
}

export function BundleWorkflowDialog({
  open,
  onOpenChange,
  onSave,
  initialData,
  variables,
}: BundleWorkflowDialogProps) {
  const [selectedBundleId, setSelectedBundleId] = useState<string | null>(
    initialData?.bundleWorkflowId || null
  );

  const trpc = useTRPC();

  const { data: bundleWorkflows } = useQuery(
    trpc.workflows.listBundles.queryOptions()
  );
  const { data: selectedBundle } = useQuery({
    ...trpc.workflows.getBundleById.queryOptions({
      id: selectedBundleId ?? "",
    }),
    enabled: !!selectedBundleId,
  });

  const form = useForm<BundleWorkflowFormValues>({
    resolver: zodResolver(bundleWorkflowFormSchema),
    defaultValues: {
      variableName: initialData?.variableName || "",
      bundleWorkflowId: initialData?.bundleWorkflowId || "",
      inputMappings: initialData?.inputMappings || [],
    },
  });

  const bundleInputs = selectedBundle?.bundleInputs as
    | Array<{ name: string; type: string; description?: string }>
    | undefined;

  // Enhance variables with parent context documentation
  const enhancedVariables: VariableItem[] = [
    ...variables,
    {
      path: "parentContext",
      label: "Parent Workflow Context (at runtime)",
      type: "object",
      children: [
        {
          path: "parentContext.WorkflowName",
          label: "WorkflowName (replaced with actual workflow name)",
          type: "object",
          children: [
            {
              path: "parentContext.WorkflowName.nodeName",
              label: "nodeName (replaced with actual node name)",
              type: "object",
              children: [
                {
                  path: "parentContext.WorkflowName.nodeName.variableName",
                  label: "variableName (node's variables)",
                  type: "primitive",
                },
              ],
            },
          ],
        },
      ],
    },
  ];

  const handleSubmit = (data: BundleWorkflowFormValues) => {
    onSave(data);
    onOpenChange(false);
  };

  const addInputMapping = () => {
    const currentMappings = form.getValues("inputMappings");
    form.setValue("inputMappings", [
      ...currentMappings,
      { bundleInputName: "", value: "" },
    ]);
  };

  const removeInputMapping = (index: number) => {
    const currentMappings = form.getValues("inputMappings");
    form.setValue(
      "inputMappings",
      currentMappings.filter((_, i) => i !== index)
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Configure Bundle Workflow</DialogTitle>
          <DialogDescription>
            Execute a reusable bundle workflow with input parameters.
          </DialogDescription>
        </DialogHeader>

        <Separator className="bg-black/5 dark:bg-white/5" />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4 p-6 pt-0"
          >
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="bundleResult"
                      className="font-mono text-sm"
                    />
                  </FormControl>
                  <FormDescription>
                    Store the bundle output in this variable
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bundleWorkflowId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bundle Workflow</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedBundleId(value);
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a bundle workflow" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {bundleWorkflows?.map((bundle) => (
                        <SelectItem key={bundle.id} value={bundle.id}>
                          {bundle.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose which bundle workflow to execute
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {bundleInputs && bundleInputs.length > 0 && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <FormLabel>Input Mappings</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addInputMapping}
                    >
                      <IconPlusSmall className="w-4 h-4 mr-2" />
                      Add Mapping
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Map parent workflow variables to bundle inputs. Use{" "}
                    <code className="bg-muted px-1 py-0.5 rounded text-xs">
                      {`{{parentContext.WorkflowName.nodeName.field}}`}
                    </code>{" "}
                    to reference parent context.
                  </p>
                </div>

                <div className="space-y-2">
                  {form.watch("inputMappings").map((_, index) => (
                    <div key={index} className="flex gap-2">
                      <FormField
                        control={form.control}
                        name={`inputMappings.${index}.bundleInputName`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select input" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {bundleInputs.map((input) => (
                                  <SelectItem
                                    key={input.name}
                                    value={input.name}
                                  >
                                    {input.name} ({input.type})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`inputMappings.${index}.value`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <VariableInput
                                value={field.value}
                                onChange={field.onChange}
                                variables={enhancedVariables}
                                placeholder="Type @ or / to insert variables, or enter static values"
                                className="min-h-[40px]"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeInputMapping(index)}
                      >
                        <IconTrashCanSimple className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="hover:bg-primary-foreground/50"
              >
                Cancel
              </Button>

              <Button type="submit" className="hover:bg-primary-foreground">
                {" "}
                Save changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
