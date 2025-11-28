"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Sheet,
  ResizableSheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
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
import { VariableInput } from "@/components/tiptap/variable-input";
import type { VariableItem } from "@/components/tiptap/variable-suggestion";

const emailListSchema = z
  .string()
  .transform((value) => value?.trim() || "")
  .refine(
    (value) =>
      !value ||
      value
        .split(",")
        .map((item) => item.trim())
        .every((item) => item.length > 0),
    "Enter comma-separated email addresses."
  );

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, "Variable name is required.")
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter/underscore and contain only letters, numbers, and underscores.",
    }),
  to: z
    .string()
    .min(1, "At least one recipient is required.")
    .transform((value) => value.trim()),
  cc: emailListSchema.default(""),
  bcc: emailListSchema.default(""),
  subject: z.string().min(1, "Subject is required."),
  body: z.string().min(1, "Body content is required."),
  bodyFormat: z.enum(["text", "html"]).default("text"),
});

export type OutlookExecutionFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: OutlookExecutionFormValues) => void;
  defaultValues?: Partial<OutlookExecutionFormValues>;
  variables: VariableItem[];
}

export const OutlookExecutionDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  variables,
}) => {
  const form = useForm<OutlookExecutionFormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      variableName: defaultValues?.variableName || "outlookMessage",
      to: defaultValues?.to || "",
      cc: defaultValues?.cc || "",
      bcc: defaultValues?.bcc || "",
      subject: defaultValues?.subject || "",
      body: defaultValues?.body || "",
      bodyFormat: defaultValues?.bodyFormat || "text",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues?.variableName || "outlookMessage",
        to: defaultValues?.to || "",
        cc: defaultValues?.cc || "",
        bcc: defaultValues?.bcc || "",
        subject: defaultValues?.subject || "",
        body: defaultValues?.body || "",
        bodyFormat: defaultValues?.bodyFormat || "text",
      });
    }
  }, [open, defaultValues?.variableName, defaultValues?.to, defaultValues?.cc, defaultValues?.bcc, defaultValues?.subject, defaultValues?.body, defaultValues?.bodyFormat, form]);

  const handleSubmit = (values: OutlookExecutionFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent side="right" className="overflow-y-auto p-0">
        <div className="sticky top-0 z-10 border-b border-white/5 bg-[#202e32] px-6 py-4">
          <SheetHeader>
            <SheetTitle>Send Outlook Email</SheetTitle>
            <SheetDescription>
              Send an email via Microsoft Outlook
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="px-6 py-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              <FormField
                control={form.control}
                name="variableName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Variable Name</FormLabel>
                    <FormControl>
                      <Input placeholder="outlookMessage" {...field} />
                    </FormControl>
                    <FormDescription>
                      Name to store response in workflow context
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator className="bg-white/5" />

              <FormField
                control={form.control}
                name="to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>To</FormLabel>
                    <FormControl>
                      <VariableInput
                        placeholder="recipient@example.com"
                        variables={variables}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Comma-separated email addresses
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CC (Optional)</FormLabel>
                    <FormControl>
                      <VariableInput
                        placeholder="cc@example.com"
                        variables={variables}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Carbon copy recipients
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bcc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>BCC (Optional)</FormLabel>
                    <FormControl>
                      <VariableInput
                        placeholder="bcc@example.com"
                        variables={variables}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Blind carbon copy recipients
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <VariableInput
                        placeholder="Email subject"
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
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Body</FormLabel>
                    <FormControl>
                      <VariableInput
                        placeholder="Email content..."
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
                name="bodyFormat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Body Format</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="text">Plain Text</SelectItem>
                        <SelectItem value="html">HTML</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <SheetFooter className="sticky bottom-0 border-t border-white/5 bg-[#202e32] px-6 py-4">
                <Button type="submit">Save Configuration</Button>
              </SheetFooter>
            </form>
          </Form>
        </div>
      </ResizableSheetContent>
    </Sheet>
  );
};
