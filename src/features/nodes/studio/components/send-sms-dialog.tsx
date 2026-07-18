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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  sendSmsConfigSchema,
  type SendSmsConfig,
} from "@/features/nodes/studio/lib/studio-node-config";
import {
  StudioNodeDialogFooter,
  StudioNodeDialogLayout,
} from "./studio-node-dialog-layout";

type SendSmsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: SendSmsConfig) => void;
  defaultValues?: Partial<SendSmsConfig>;
  variables: VariableItem[];
};

const sendSmsDialogSchema = sendSmsConfigSchema.safeExtend({
  purpose: z.enum(["MARKETING", "ONE_TO_ONE"]),
});

export function SendSmsDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  variables,
}: SendSmsDialogProps): React.ReactElement {
  const form = useForm<SendSmsConfig>({
    resolver: zodResolver(sendSmsDialogSchema),
    defaultValues: {
      clientId: defaultValues.clientId || "",
      to: defaultValues.to || "",
      message: defaultValues.message || "",
      purpose: defaultValues.purpose ?? "ONE_TO_ONE",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      clientId: defaultValues.clientId || "",
      to: defaultValues.to || "",
      message: defaultValues.message || "",
      purpose: defaultValues.purpose ?? "ONE_TO_ONE",
    });
  }, [
    defaultValues.clientId,
    defaultValues.message,
    defaultValues.purpose,
    defaultValues.to,
    form,
    open,
  ]);

  const handleSubmit = (values: SendSmsConfig): void => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <StudioNodeDialogLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Send SMS"
      description="Send a one-to-one message to a workflow member or phone number."
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-6 px-6"
        >
          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client</FormLabel>
                <FormControl>
                  <VariableInput
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="@member.clientId"
                    className="min-h-13"
                    variables={variables}
                    ariaLabel="Client"
                  />
                </FormControl>
                <FormDescription>
                  Resolves the phone number from a client in this workspace.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="to"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone number</FormLabel>
                <FormControl>
                  <VariableInput
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="+44... or @member.client.phone"
                    className="min-h-13"
                    variables={variables}
                    ariaLabel="Phone number"
                  />
                </FormControl>
                <FormDescription>
                  Optional direct recipient. This takes priority over the
                  client.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="purpose"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Delivery purpose</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ONE_TO_ONE">
                      Service or one-to-one message
                    </SelectItem>
                    <SelectItem value="MARKETING">
                      Marketing message
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Marketing messages require recorded SMS permission and honor
                  marketing opt-outs.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Message</FormLabel>
                <FormControl>
                  <VariableInput
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Write the SMS message"
                    className="min-h-28"
                    variables={variables}
                    ariaLabel="Message"
                  />
                </FormControl>
                <FormDescription>
                  Personalize the message with values from earlier nodes.
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
