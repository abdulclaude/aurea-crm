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
  bodyFormat: z.enum(["text/plain", "text/html"]).default("text/plain"),
  fromName: z.string().optional(),
  replyTo: z.string().optional(),
});

export type GmailExecutionFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GmailExecutionFormValues) => void;
  defaultValues?: Partial<GmailExecutionFormValues>;
  variables: VariableItem[];
}

export const GmailExecutionDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  variables,
}) => {
  const form = useForm<GmailExecutionFormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      variableName: defaultValues?.variableName || "gmailMessage",
      to: defaultValues?.to || "",
      cc: defaultValues?.cc || "",
      bcc: defaultValues?.bcc || "",
      subject: defaultValues?.subject || "",
      body: defaultValues?.body || "",
      bodyFormat: defaultValues?.bodyFormat || "text/plain",
      fromName: defaultValues?.fromName || "",
      replyTo: defaultValues?.replyTo || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues?.variableName || "gmailMessage",
        to: defaultValues?.to || "",
        cc: defaultValues?.cc || "",
        bcc: defaultValues?.bcc || "",
        subject: defaultValues?.subject || "",
        body: defaultValues?.body || "",
        bodyFormat: defaultValues?.bodyFormat || "text/plain",
        fromName: defaultValues?.fromName || "",
        replyTo: defaultValues?.replyTo || "",
      });
    }
  }, [open, defaultValues?.variableName, defaultValues?.to, defaultValues?.cc, defaultValues?.bcc, defaultValues?.subject, defaultValues?.body, defaultValues?.bodyFormat, defaultValues?.fromName, defaultValues?.replyTo, form]);

  const handleSubmit = (values: GmailExecutionFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent className="overflow-y-auto sm:max-w-xl bg-[#202e32] border-white/5">
        <SheetHeader className="px-6 pt-8 pb-1 gap-1">
          <SheetTitle>Send Gmail</SheetTitle>
          <SheetDescription>
            Personalize and send an email using your connected Gmail account.
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-5 bg-white/5" />

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
                    <Input placeholder="gmailMessage" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs mt-2 leading-5">
                    Access the Gmail API response using{" "}
                    <span className="text-white font-medium tracking-wide">
                      {`{{${field.value || "gmailMessage"}.id}}`}
                    </span>
                    .
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
                  <FormLabel>To</FormLabel>
                  <FormControl>
                    <VariableInput
                      placeholder="alice@example.com, bob@example.com"
                      value={field.value || ""}
                      onChange={field.onChange}
                      variables={variables}
                      className="h-13"
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Comma-separated list of recipients. Supports templating.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cc</FormLabel>
                    <FormControl>
                      <VariableInput
                        placeholder="optional"
                        value={field.value || ""}
                        onChange={field.onChange}
                        variables={variables}
                        className="h-13"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bcc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bcc</FormLabel>
                    <FormControl>
                      <VariableInput
                        placeholder="optional"
                        value={field.value || ""}
                        onChange={field.onChange}
                        variables={variables}
                        className="h-13"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <VariableInput
                      placeholder="Weekly summary for {{customer.name}}"
                      value={field.value || ""}
                      onChange={field.onChange}
                      variables={variables}
                      className="h-13"
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
                  <FormLabel>Body format</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) =>
                      field.onChange(
                        value as GmailExecutionFormValues["bodyFormat"]
                      )
                    }
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose format" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="text/plain">Plain text</SelectItem>
                      <SelectItem value="text/html">HTML</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    Choose plain text or HTML. HTML lets you send formatted
                    layouts.
                  </FormDescription>
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
                      placeholder="Hello {{customer.firstName}}, thanks for your order..."
                      value={field.value || ""}
                      onChange={field.onChange}
                      variables={variables}
                    />
                  </FormControl>
                  <FormDescription className="text-xs mt-2 leading-5">
                    Use {"{{variables}}"} from earlier steps. For HTML emails,
                    include full markup (head + body optional).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fromName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From name</FormLabel>
                    <FormControl>
                      <VariableInput
                        placeholder="Acme Automations"
                        value={field.value || ""}
                        onChange={field.onChange}
                        variables={variables}
                        className="h-13"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Optional display name shown to recipients.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="replyTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reply-to</FormLabel>
                    <FormControl>
                      <VariableInput
                        placeholder="helpdesk@example.com"
                        value={field.value || ""}
                        onChange={field.onChange}
                        variables={variables}
                        className="h-13"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Override the reply-to address if needed.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <SheetFooter className="mt-6 px-0 pb-4">
              <Button
                type="submit"
                className="brightness-120! hover:brightness-130! w-full py-5"
              >
                Save changes
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </ResizableSheetContent>
    </Sheet>
  );
};
