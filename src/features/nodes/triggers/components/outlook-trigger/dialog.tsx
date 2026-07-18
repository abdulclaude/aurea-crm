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
import { NodeType } from "@/db/enums";
import { resolveOutlookTriggerSender } from "@/features/outlook/lib/trigger-config";
import { WorkflowProviderAccountSelect } from "@/features/workflows/components/workflow-provider-account-select";

const formSchema = z.object({
  providerAccountId: z.string().trim().min(1, "Select an Outlook account."),
  variableName: z
    .string()
    .min(1, { message: "Variable name is required." })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores.",
    }),
  folderName: z.literal("Inbox"),
  subject: z.string().optional(),
  sender: z.string().optional(),
});

export type OutlookTriggerFormValues = z.infer<typeof formSchema>;
export type OutlookTriggerDefaultValues = Partial<OutlookTriggerFormValues> & {
  from?: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: OutlookTriggerFormValues) => void;
  defaultValues?: OutlookTriggerDefaultValues;
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
    resolver: zodResolver(formSchema),
    defaultValues: {
      providerAccountId: defaultValues?.providerAccountId || "",
      variableName: defaultValues?.variableName || "outlookTrigger",
      folderName: "Inbox",
      subject: defaultValues?.subject || "",
      sender: resolveOutlookTriggerSender(defaultValues ?? {}) || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        providerAccountId: defaultValues?.providerAccountId || "",
        variableName: defaultValues?.variableName || "outlookTrigger",
        folderName: "Inbox",
        subject: defaultValues?.subject || "",
        sender: resolveOutlookTriggerSender(defaultValues ?? {}) || "",
      });
    }
  }, [
    open,
    defaultValues?.providerAccountId,
    defaultValues?.variableName,
    defaultValues?.subject,
    defaultValues?.sender,
    defaultValues?.from,
    form,
  ]);

  const handleSubmit = (values: OutlookTriggerFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent
        side="right"
        className="overflow-y-auto border-border bg-background p-0"
      >
        <div className="sticky top-0 z-10 border-b border-border bg-background px-6 py-4">
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
                name="providerAccountId"
                render={({ field }) => (
                  <FormItem>
                    <WorkflowProviderAccountSelect
                      nodeType={NodeType.OUTLOOK_TRIGGER}
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

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

              <Separator className="bg-border" />

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
                name="sender"
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

              <SheetFooter className="sticky bottom-0 border-t border-border bg-background px-6 py-4">
                <Button type="submit">Save Configuration</Button>
              </SheetFooter>
            </form>
          </Form>
        </div>
      </ResizableSheetContent>
    </Sheet>
  );
};
