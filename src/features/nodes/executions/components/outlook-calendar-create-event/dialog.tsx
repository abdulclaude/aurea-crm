"use client";

import { useForm } from "react-hook-form";
import { useEffect } from "react";

import {
  Sheet,
  ResizableSheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required." })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message: "Variable name must start with a letter or underscore and contain only letters, numbers and underscores.",
    }),
  subject: z.string().min(1, "Subject is required"),
  start: z.string().min(1, "Start is required"),
  end: z.string().min(1, "End is required"),
});

export type OutlookCalendarCreateEventFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: OutlookCalendarCreateEventFormValues) => void;
  defaultValues?: Partial<OutlookCalendarCreateEventFormValues>;
  variables: VariableItem[];
}

export const OutlookCalendarCreateEventDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  variables,
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "createdEvent",
      subject: defaultValues.subject || "",
      start: defaultValues.start || "",
      end: defaultValues.end || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "createdEvent",
        subject: defaultValues.subject || "",
        start: defaultValues.start || "",
        end: defaultValues.end || "",
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent className="overflow-y-auto sm:max-w-xl bg-background border-white/5">
        <SheetHeader className="px-6 pt-8 pb-1 gap-1">
          <SheetTitle>Outlook Calendar: Create Event Configuration</SheetTitle>
          <SheetDescription>
            Create a calendar event
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
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable Name</FormLabel>
                  <FormControl>
                    <Input placeholder="createdEvent" {...field} />
                  </FormControl>
                  <FormDescription>
                    Reference the result in other nodes using this variable name.
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
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="subject or @variables"
                      className="h-13"
                      variables={variables}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="start"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start</FormLabel>
                  <FormControl>
                    <VariableInput
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="start or @variables"
                      className="h-13"
                      variables={variables}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="end"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End</FormLabel>
                  <FormControl>
                    <VariableInput
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="end or @variables"
                      className="h-13"
                      variables={variables}
                    />
                  </FormControl>
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
