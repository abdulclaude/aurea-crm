"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

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
import {
  StudioNodeDialogFooter,
  StudioNodeDialogLayout,
} from "@/features/nodes/studio/components/studio-node-dialog-layout";

import {
  clientCreatedTriggerConfigSchema,
  type ClientCreatedTriggerFormValues,
} from "./config";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ClientCreatedTriggerFormValues) => void;
  defaultValues?: Partial<ClientCreatedTriggerFormValues>;
  variables: VariableItem[];
};

export function ClientCreatedTriggerDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props): React.ReactElement {
  const form = useForm<ClientCreatedTriggerFormValues>({
    resolver: zodResolver(clientCreatedTriggerConfigSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "newClient",
      clientTypeFilter: defaultValues.clientTypeFilter || "ANY",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      variableName: defaultValues.variableName || "newClient",
      clientTypeFilter: defaultValues.clientTypeFilter || "ANY",
    });
  }, [
    defaultValues.clientTypeFilter,
    defaultValues.variableName,
    form,
    open,
  ]);

  return (
    <StudioNodeDialogLayout
      open={open}
      onOpenChange={onOpenChange}
      title="New member trigger"
      description="Start when the right kind of CRM member is created."
    >
      <Form {...form}>
        <form
          className="space-y-6 px-6"
          onSubmit={form.handleSubmit((values) => {
            onSubmit(values);
            onOpenChange(false);
          })}
        >
          <FormField
            control={form.control}
            name="clientTypeFilter"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Who should enroll?</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ANY">Any new CRM member</SelectItem>
                    <SelectItem value="LEAD">New leads only</SelectItem>
                    <SelectItem value="CLIENT">
                      New clients only
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Leads are kept separate so lead nurture and client onboarding
                  can run independently.
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
                  <Input placeholder="newClient" {...field} />
                </FormControl>
                <FormDescription>
                  Later steps can use the member name, email, phone, type, and
                  lifecycle details from this variable.
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

export type { ClientCreatedTriggerFormValues } from "./config";
