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

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required." })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers and underscores.",
    }),
  calendarId: z.string().min(1, { message: "Calendar ID is required." }),
  summary: z.string().min(1, { message: "Event summary is required." }),
  description: z.string().optional(),
  startDateTime: z
    .string()
    .min(1, { message: "Start date/time is required." })
    .describe("ISO string or {{variables}}"),
  endDateTime: z
    .string()
    .min(1, { message: "End date/time is required." })
    .describe("ISO string or {{variables}}"),
  timezone: z.string().min(1, { message: "Timezone is required." }),
});

export type GoogleCalendarActionFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GoogleCalendarActionFormValues) => void;
  defaultValues?: Partial<GoogleCalendarActionFormValues>;
  variables: VariableItem[];
}

export const GoogleCalendarActionDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  variables,
}) => {
  const form = useForm<GoogleCalendarActionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "calendarEvent",
      calendarId: defaultValues.calendarId || "primary",
      summary: defaultValues.summary || "New event",
      description: defaultValues.description || "",
      startDateTime: defaultValues.startDateTime || "{{context.start}}",
      endDateTime: defaultValues.endDateTime || "{{context.end}}",
      timezone: defaultValues.timezone || "UTC",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "calendarEvent",
        calendarId: defaultValues.calendarId || "primary",
        summary: defaultValues.summary || "New event",
        description: defaultValues.description || "",
        startDateTime: defaultValues.startDateTime || "{{context.start}}",
        endDateTime: defaultValues.endDateTime || "{{context.end}}",
        timezone: defaultValues.timezone || "UTC",
      });
    }
  }, [open, defaultValues.variableName, defaultValues.calendarId, defaultValues.summary, defaultValues.description, defaultValues.startDateTime, defaultValues.endDateTime, defaultValues.timezone, form]);

  const handleSubmit = (values: GoogleCalendarActionFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent className="overflow-y-auto sm:max-w-xl bg-[#202e32] border-white/5">
        <SheetHeader className="px-6 pt-8 pb-1 gap-1">
          <SheetTitle>Google Calendar Event</SheetTitle>
          <SheetDescription>
            Create or update an event on your connected Google Calendar. Use{" "}
            {"{{variables}}"} to reference previous nodes.
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
                    <Input placeholder="calendarEvent" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Reference the created event later using
                    {` {{${field.value || "calendarEvent"}.id}}`}.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="calendarId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Calendar ID</FormLabel>
                  <FormControl>
                    <VariableInput
                      placeholder="primary"
                      value={field.value || ""}
                      onChange={field.onChange}
                      variables={variables}
                      className="h-13"
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Use <span className="font-semibold">primary</span> or any
                    shared calendar ID/email.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event summary</FormLabel>
                  <FormControl>
                    <VariableInput
                      placeholder="Demo with {{lead.name}}"
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <VariableInput
                      placeholder="Notes, zoom link, {{deal.context}}"
                      value={field.value || ""}
                      onChange={field.onChange}
                      variables={variables}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDateTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start date/time</FormLabel>
                    <FormControl>
                      <VariableInput
                        placeholder="2025-01-01T15:00:00Z"
                        value={field.value || ""}
                        onChange={field.onChange}
                        variables={variables}
                        className="h-13"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      ISO string or a variable (e.g.
                      {" {{context.meetingStart}}"}).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDateTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End date/time</FormLabel>
                    <FormControl>
                      <VariableInput
                        placeholder="2025-01-01T16:00:00Z"
                        value={field.value || ""}
                        onChange={field.onChange}
                        variables={variables}
                        className="h-13"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Should be later than the start time.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <FormControl>
                    <VariableInput
                      placeholder="UTC"
                      value={field.value || ""}
                      onChange={field.onChange}
                      variables={variables}
                      className="h-13"
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Used when parsing the start and end time inputs.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
