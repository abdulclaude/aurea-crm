"use client";

import { useForm } from "react-hook-form";
import { useEffect } from "react";

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
import type { VariableItem } from "@/components/tiptap/variable-suggestion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  StudioNodeDialogFooter,
  StudioNodeDialogLayout,
} from "@/features/nodes/studio/components/studio-node-dialog-layout";

const LIFECYCLE_STAGES = [
  { value: "SUBSCRIBER", label: "Subscriber" },
  { value: "LEAD", label: "Lead" },
  { value: "MQL", label: "Marketing Qualified Lead (MQL)" },
  { value: "SQL", label: "Sales Qualified Lead (SQL)" },
  { value: "OPPORTUNITY", label: "Opportunity" },
  { value: "CUSTOMER", label: "Customer" },
  { value: "EVANGELIST", label: "Evangelist" },
] as const;

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required." })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers and underscores.",
    }),
  fromStage: z.string().optional(),
  toStage: z.string().optional(),
});

export type ClientLifecycleStageChangedTriggerFormValues = z.infer<
  typeof formSchema
>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ClientLifecycleStageChangedTriggerFormValues) => void;
  defaultValues?: Partial<ClientLifecycleStageChangedTriggerFormValues>;
  variables: VariableItem[];
}

export const ClientLifecycleStageChangedTriggerDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "clientStageChange",
      fromStage: defaultValues.fromStage || "",
      toStage: defaultValues.toStage || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "clientStageChange",
        fromStage: defaultValues.fromStage || "",
        toStage: defaultValues.toStage || "",
      });
    }
  }, [open, defaultValues.variableName, defaultValues.fromStage, defaultValues.toStage, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <StudioNodeDialogLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Lifecycle stage trigger"
      description="Start when a client moves from or into selected lifecycle stages."
    >
      <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 px-6"
          >
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                <FormLabel>Variable name</FormLabel>
                  <FormControl>
                    <Input placeholder="clientStageChange" {...field} />
                  </FormControl>
                  <FormDescription>
                    Later steps can use the client, previous stage, and new
                    stage from this variable.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fromStage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From stage</FormLabel>
                  <Select
                    value={field.value || ""}
                    onValueChange={(val) => field.onChange(val || undefined)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Any stage" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LIFECYCLE_STAGES.map((stage) => (
                        <SelectItem key={stage.value} value={stage.value}>
                          {stage.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Leave empty to accept transitions from any stage.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="toStage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To stage</FormLabel>
                  <Select
                    value={field.value || ""}
                    onValueChange={(val) => field.onChange(val || undefined)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Any stage" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LIFECYCLE_STAGES.map((stage) => (
                        <SelectItem key={stage.value} value={stage.value}>
                          {stage.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Leave empty to accept transitions into any stage.
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
};
