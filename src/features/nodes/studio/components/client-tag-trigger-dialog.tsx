"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
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
  clientTagTriggerConfigSchema,
  type ClientTagTriggerConfig,
} from "@/features/nodes/studio/lib/studio-node-config";
import {
  StudioNodeDialogFooter,
  StudioNodeDialogLayout,
} from "./studio-node-dialog-layout";

type ClientTagTriggerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ClientTagTriggerConfig) => void;
  defaultValues?: Partial<ClientTagTriggerConfig>;
  change: "added" | "removed";
};

export function ClientTagTriggerDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  change,
}: ClientTagTriggerDialogProps): React.ReactElement {
  const form = useForm<ClientTagTriggerConfig>({
    resolver: zodResolver(clientTagTriggerConfigSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "tagChange",
      tag: defaultValues.tag || "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      variableName: defaultValues.variableName || "tagChange",
      tag: defaultValues.tag || "",
    });
  }, [defaultValues.tag, defaultValues.variableName, form, open]);

  const handleSubmit = (values: ClientTagTriggerConfig): void => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <StudioNodeDialogLayout
      open={open}
      onOpenChange={onOpenChange}
      title={`Member tag ${change} trigger`}
      description={`Run when a matching tag is ${change} on a member profile.`}
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-6 px-6"
        >
          <FormField
            control={form.control}
            name="tag"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tag</FormLabel>
                <FormControl>
                  <Input placeholder="Any tag" {...field} />
                </FormControl>
                <FormDescription>
                  Leave empty to run for every tag {change} event.
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
                <FormControl>
                  <Input placeholder="tagChange" {...field} />
                </FormControl>
                <FormDescription>
                  Reference the member, tag, and previous tags later in the
                  workflow.
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
