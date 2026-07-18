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
import { Switch } from "@/components/ui/switch";
import {
  StudioNodeDialogFooter,
  StudioNodeDialogLayout,
} from "@/features/nodes/studio/components/studio-node-dialog-layout";

import {
  appointmentCreatedTriggerConfigSchema,
  type AppointmentCreatedTriggerFormValues,
} from "./config";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AppointmentCreatedTriggerFormValues) => void;
  defaultValues?: Partial<AppointmentCreatedTriggerFormValues>;
  variables: VariableItem[];
};

export function AppointmentCreatedTriggerDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props): React.ReactElement {
  const form = useForm<AppointmentCreatedTriggerFormValues>({
    resolver: zodResolver(appointmentCreatedTriggerConfigSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "newAppointment",
      firstAppointmentOnly: defaultValues.firstAppointmentOnly ?? false,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      variableName: defaultValues.variableName || "newAppointment",
      firstAppointmentOnly: defaultValues.firstAppointmentOnly ?? false,
    });
  }, [
    defaultValues.firstAppointmentOnly,
    defaultValues.variableName,
    form,
    open,
  ]);

  return (
    <StudioNodeDialogLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Appointment booked trigger"
      description="Start when an appointment is booked, optionally only for the client's first appointment."
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
            name="firstAppointmentOnly"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between gap-4 rounded border border-border p-4">
                <div>
                  <FormLabel>First appointment only</FormLabel>
                  <FormDescription className="mt-1">
                    Ignore later appointment bookings for the same client.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
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
                  <Input placeholder="newAppointment" {...field} />
                </FormControl>
                <FormDescription>
                  Later steps can reference the booking and client from this
                  variable.
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

export type { AppointmentCreatedTriggerFormValues } from "./config";
