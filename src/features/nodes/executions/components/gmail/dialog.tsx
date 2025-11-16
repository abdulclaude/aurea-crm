"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const emailListSchema = z
  .string()
  .optional()
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
  cc: emailListSchema,
  bcc: emailListSchema,
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
}

export const GmailExecutionDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
}) => {
  const form = useForm<GmailExecutionFormValues>({
    resolver: zodResolver(formSchema),
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
  }, [open, defaultValues, form]);

  const handleSubmit = (values: GmailExecutionFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="px-0">
        <DialogHeader className="px-8">
          <DialogTitle>Send Gmail</DialogTitle>
          <DialogDescription>
            Personalize and send an email using your connected Gmail account.
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 mt-4 px-8"
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
                    <Input
                      placeholder="alice@example.com, bob@example.com"
                      {...field}
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
                      <Input placeholder="optional" {...field} />
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
                      <Input placeholder="optional" {...field} />
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
                    <Input
                      placeholder="Weekly summary for {{customer.name}}"
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
                    <Textarea
                      placeholder="Hello {{customer.firstName}}, thanks for your order..."
                      className="min-h-[120px] text-sm"
                      {...field}
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
                      <Input placeholder="Acme Automations" {...field} />
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
                      <Input placeholder="helpdesk@example.com" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Override the reply-to address if needed.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="mt-4">
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
