"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { VariableInput } from "@/components/tiptap/variable-input";
import type { VariableItem } from "@/components/tiptap/variable-suggestion";
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
import { LIFECYCLE_STAGE_VALUES } from "@/features/crm/constants";
import {
  StudioNodeDialogFooter,
  StudioNodeDialogLayout,
} from "@/features/nodes/studio/components/studio-node-dialog-layout";

const lifecycleStageActionSchema = z.object({
  workflowAction: z.literal("LIFECYCLE_STAGE"),
  variableName: z
    .string()
    .min(1)
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/),
  clientId: z.string().min(1, "Choose a workflow member"),
  lifecycleStage: z.enum(LIFECYCLE_STAGE_VALUES),
});

export type LifecycleStageActionValues = z.infer<
  typeof lifecycleStageActionSchema
>;

export function LifecycleStageDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: LifecycleStageActionValues) => void;
  defaultValues: Partial<LifecycleStageActionValues>;
  variables: VariableItem[];
}): React.ReactElement {
  const form = useForm<LifecycleStageActionValues>({
    resolver: zodResolver(lifecycleStageActionSchema),
    defaultValues: defaults(props.defaultValues),
  });

  useEffect(() => {
    if (props.open) form.reset(defaults(props.defaultValues));
  }, [form, props.defaultValues, props.open]);

  return (
    <StudioNodeDialogLayout
      open={props.open}
      onOpenChange={props.onOpenChange}
      title="Lifecycle stage"
      description="Move the workflow member to a selected CRM lifecycle stage."
    >
      <Form {...form}>
        <form
          className="space-y-6 px-6"
          onSubmit={form.handleSubmit((values) => {
            props.onSubmit(values);
            props.onOpenChange(false);
          })}
        >
          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Member</FormLabel>
                <FormControl>
                  <VariableInput
                    value={field.value}
                    onChange={field.onChange}
                    variables={props.variables}
                    placeholder="Choose the member from the trigger"
                    ariaLabel="Member"
                    className="min-h-11"
                  />
                </FormControl>
                <FormDescription>
                  Variables only include the trigger and connected previous
                  steps, so this action cannot reference future data.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lifecycleStage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New lifecycle stage</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a lifecycle stage" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {LIFECYCLE_STAGE_VALUES.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {humanize(stage)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="variableName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Result variable</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>
                  Advanced steps can reference the updated member with this
                  name.
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

function defaults(
  values: Partial<LifecycleStageActionValues>,
): LifecycleStageActionValues {
  return {
    workflowAction: "LIFECYCLE_STAGE",
    variableName: values.variableName || "updatedClient",
    clientId: values.clientId || "",
    lifecycleStage: values.lifecycleStage || "LEAD",
  };
}

function humanize(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}
