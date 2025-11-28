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
import type { VariableItem } from "@/components/tiptap/variable-suggestion";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required." })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores.",
    }),
  folderName: z
    .string()
    .min(1, { message: "Folder name is required (try Inbox)." }),
  subject: z.string().optional(),
  from: z.string().optional(),
  maxResults: z.coerce
    .number()
    .min(1, "Must be at least 1.")
    .max(50, "Must be at most 50.")
    .default(5),
  pollIntervalMinutes: z.coerce
    .number()
    .min(1, "Must be at least 1.")
    .max(60, "Must be at most 60 minutes.")
    .default(5),
});

export type OutlookTriggerFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: OutlookTriggerFormValues) => void;
  defaultValues?: Partial<OutlookTriggerFormValues>;
  variables: VariableItem[];
}

export const OutlookTriggerDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  variables,
}) => {
  const form = useForm<OutlookTriggerFormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      variableName: defaultValues?.variableName || "outlookTrigger",
      folderName: defaultValues?.folderName || "Inbox",
      subject: defaultValues?.subject || "",
      from: defaultValues?.from || "",
      maxResults: defaultValues?.maxResults ?? 5,
      pollIntervalMinutes: defaultValues?.pollIntervalMinutes ?? 5,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues?.variableName || "outlookTrigger",
        folderName: defaultValues?.folderName || "Inbox",
        subject: defaultValues?.subject || "",
        from: defaultValues?.from || "",
        maxResults: defaultValues?.maxResults ?? 5,
        pollIntervalMinutes: defaultValues?.pollIntervalMinutes ?? 5,
      });
    }
  }, [open, defaultValues?.variableName, defaultValues?.folderName, defaultValues?.subject, defaultValues?.from, defaultValues?.maxResults, defaultValues?.pollIntervalMinutes, form]);

  const handleSubmit = (values: OutlookTriggerFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent side="right" className="overflow-y-auto p-0">
        <div className="sticky top-0 z-10 border-b border-white/5 bg-[#202e32] px-6 py-4">
          <SheetHeader>
            <SheetTitle>Outlook Trigger</SheetTitle>
            <SheetDescription>
              Trigger workflow when new emails arrive in Outlook
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
                      <Input placeholder="outlookTrigger" {...field} />
                    </FormControl>
                    <FormDescription>
                      Name to store email data in workflow context
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator className="bg-white/5" />

              <FormField
                control={form.control}
                name="folderName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Folder Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Inbox" {...field} />
                    </FormControl>
                    <FormDescription>
                      Mail folder to monitor (e.g., Inbox, Sent Items)
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
                    <FormLabel>Subject Filter (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Filter by subject..." {...field} />
                    </FormControl>
                    <FormDescription>
                      Only trigger for emails with matching subject
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="from"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From Filter (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Filter by sender..." {...field} />
                    </FormControl>
                    <FormDescription>
                      Only trigger for emails from specific sender
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxResults"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Results</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={50} {...field} />
                    </FormControl>
                    <FormDescription>
                      Maximum number of emails to retrieve per check
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pollIntervalMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Poll Interval (Minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={60} {...field} />
                    </FormControl>
                    <FormDescription>
                      How often to check for new emails
                    </FormDescription>
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
