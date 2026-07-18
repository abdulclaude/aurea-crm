"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { VariableInput } from "@/components/tiptap/variable-input";
import type { VariableItem } from "@/components/tiptap/variable-suggestion";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
import { Textarea } from "@/components/ui/textarea";
import { useTRPC } from "@/trpc/client";

import { sendEmailFormSchema, type SendEmailFormValues } from "./config";

type SendEmailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: SendEmailFormValues) => void;
  defaultValues?: Partial<SendEmailFormValues>;
  variables: VariableItem[];
};

const defaults = (
  values: Partial<SendEmailFormValues> = {},
): SendEmailFormValues => ({
  clientId: values.clientId ?? "",
  to: values.to ?? "",
  subject: values.subject ?? "",
  html: values.html ?? "",
  text: values.text ?? "",
  emailDomainId: values.emailDomainId ?? "",
  fromName: values.fromName ?? "",
  replyTo: values.replyTo ?? "",
  purpose: values.purpose ?? "MARKETING",
  variableName: values.variableName ?? "sentEmail",
});

export function SendEmailDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  variables,
}: SendEmailDialogProps) {
  const trpc = useTRPC();
  const optionsQuery = useQuery({
    ...trpc.workflows.conditionOptions.queryOptions(),
    enabled: open,
  });
  const form = useForm<SendEmailFormValues>({
    resolver: zodResolver(sendEmailFormSchema),
    defaultValues: defaults(defaultValues),
  });

  useEffect(() => {
    if (open) form.reset(defaults(defaultValues));
  }, [defaultValues, form, open]);

  const submit = (values: SendEmailFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent className="overflow-y-auto border-border bg-background sm:max-w-xl">
        <SheetHeader className="gap-1 px-6 pb-1 pt-8">
          <SheetTitle>Send email</SheetTitle>
          <SheetDescription>
            Queue a client email through the workspace delivery provider.
          </SheetDescription>
        </SheetHeader>
        <Separator className="my-5" />
        <Form {...form}>
          <form className="space-y-5 px-6" onSubmit={form.handleSubmit(submit)}>
            {[
              {
                name: "clientId" as const,
                label: "Client ID",
                placeholder: "{{triggerData.clientId}}",
              },
              {
                name: "to" as const,
                label: "Recipient email",
                placeholder: "{{triggerData.client.email}}",
              },
              {
                name: "subject" as const,
                label: "Subject",
                placeholder: "Your class journey",
              },
            ].map((item) => (
              <FormField
                key={item.name}
                control={form.control}
                name={item.name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{item.label}</FormLabel>
                    <FormControl>
                      <VariableInput
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        variables={variables}
                        placeholder={item.placeholder}
                        ariaLabel={item.label}
                        className="min-h-9"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}

            <FormField
              control={form.control}
              name="emailDomainId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sender email</FormLabel>
                  <Select
                    value={field.value || "automatic"}
                    onValueChange={(value) =>
                      field.onChange(value === "automatic" ? "" : value)
                    }
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={
                            optionsQuery.isLoading
                              ? "Loading verified senders..."
                              : "Select sender"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="automatic">
                        Workspace default sender
                      </SelectItem>
                      {(optionsQuery.data?.emailSenders ?? []).map((sender) => (
                        <SelectItem key={sender.id} value={sender.id}>
                          {sender.label}
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
                      <SelectItem value="MARKETING">Marketing</SelectItem>
                      <SelectItem value="TRANSACTIONAL">
                        Transactional
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="html"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email body</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-36" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plain text fallback</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-24" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {[
              { name: "fromName" as const, label: "Sender name" },
              { name: "replyTo" as const, label: "Reply-to email" },
              { name: "variableName" as const, label: "Result variable" },
            ].map((item) => (
              <FormField
                key={item.name}
                control={form.control}
                name={item.name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{item.label}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}

            <SheetFooter className="px-0 pb-6">
              <Button type="submit">Save</Button>
            </SheetFooter>
          </form>
        </Form>
      </ResizableSheetContent>
    </Sheet>
  );
}
