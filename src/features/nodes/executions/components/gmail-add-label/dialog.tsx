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
import { VariableInput } from "@/components/tiptap/variable-input";
import type { VariableItem } from "@/components/tiptap/variable-suggestion";
import { NodeType } from "@/db/enums";
import { WorkflowProviderAccountSelect } from "@/features/workflows/components/workflow-provider-account-select";
import { requiredWorkflowProviderBindingSchema } from "@/features/workflows/lib/workflow-provider-binding";

const formSchema = requiredWorkflowProviderBindingSchema.extend({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required." })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message: "Variable name must start with a letter or underscore.",
    }),
  messageId: z.string().min(1, { message: "Message ID is required." }),
  labelName: z.string().min(1, { message: "Label name is required." }),
});

export type GmailAddLabelFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GmailAddLabelFormValues) => void;
  defaultValues?: Partial<GmailAddLabelFormValues>;
  variables: VariableItem[];
}

export const GmailAddLabelDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  variables,
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      providerAccountId: defaultValues.providerAccountId || "",
      variableName: defaultValues.variableName || "labeledEmail",
      messageId: defaultValues.messageId || "",
      labelName: defaultValues.labelName || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        providerAccountId: defaultValues.providerAccountId || "",
        variableName: defaultValues.variableName || "labeledEmail",
        messageId: defaultValues.messageId || "",
        labelName: defaultValues.labelName || "",
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent className="overflow-y-auto sm:max-w-xl bg-background border-border">
        <SheetHeader className="px-6 pt-8 pb-1 gap-1">
          <SheetTitle>Gmail add label</SheetTitle>
          <SheetDescription>
            Add a label to an email message in Gmail
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-5" />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 px-6"
          >
            <FormField
              control={form.control}
              name="providerAccountId"
              render={({ field }) => (
                <FormItem>
                  <WorkflowProviderAccountSelect
                    nodeType={NodeType.GMAIL_ADD_LABEL}
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
                  <FormLabel>Variable name</FormLabel>
                  <FormControl>
                    <Input placeholder="labeledEmail" {...field} />
                  </FormControl>
                  <FormDescription className="text-[11px] mt-1">
                    Access the result:{" "}
                    <span className="text-primary font-medium">
                      @{field.value || "labeledEmail"}
                    </span>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="messageId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message ID</FormLabel>
                  <FormControl>
                    <VariableInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="@searchResults.messages[0].id"
                      variables={variables}
                    />
                  </FormControl>
                  <FormDescription className="text-[11px] mt-1">
                    The ID of the email message to label
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="labelName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label name</FormLabel>
                  <FormControl>
                    <VariableInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Important"
                      variables={variables}
                    />
                  </FormControl>
                  <FormDescription className="text-[11px] mt-1">
                    The name of the label to add (e.g., "Important", "Work",
                    "Follow-up")
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SheetFooter className="px-0 pb-4">
              <Button
                type="submit"
                className="w-max ml-auto"
                variant="gradient"
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
