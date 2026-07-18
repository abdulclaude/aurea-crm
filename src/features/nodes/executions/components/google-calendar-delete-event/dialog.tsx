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

const formSchema = z.object({
  providerAccountId: requiredWorkflowProviderBindingSchema.shape.providerAccountId,
  variableName: z
    .string()
    .min(1, { message: "Variable name is required." })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message: "Variable name must start with a letter or underscore.",
    }),
  eventId: z.string().min(1, { message: "Event ID is required." }),
});

export type GoogleCalendarDeleteEventFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GoogleCalendarDeleteEventFormValues) => void;
  defaultValues?: Partial<GoogleCalendarDeleteEventFormValues>;
  variables: VariableItem[];
}

export const GoogleCalendarDeleteEventDialog: React.FC<Props> = ({
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
      variableName: defaultValues.variableName || "deletedEvent",
      eventId: defaultValues.eventId || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        providerAccountId: defaultValues.providerAccountId || "",
        variableName: defaultValues.variableName || "deletedEvent",
        eventId: defaultValues.eventId || "",
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
          <SheetTitle>Google Calendar delete event</SheetTitle>
          <SheetDescription>
            Delete an event from your Google Calendar
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
                    id="google-calendar-delete-event-account"
                    nodeType={NodeType.GOOGLE_CALENDAR_DELETE_EVENT}
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
                    <Input placeholder="deletedEvent" {...field} />
                  </FormControl>
                  <FormDescription className="text-[11px] mt-1">
                    Access the result:{" "}
                    <span className="text-primary font-medium">
                      @{field.value || "deletedEvent"}
                    </span>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="eventId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event ID</FormLabel>
                  <FormControl>
                    <VariableInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="@calendarEvent.id"
                      variables={variables}
                    />
                  </FormControl>
                  <FormDescription className="text-[11px] mt-1">
                    The ID of the event to delete
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
